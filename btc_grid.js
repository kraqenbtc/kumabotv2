const api = require('./api');
const WebSocket = require('ws');
const config = require('./config');
const uuid = require('uuid');
const express = require('express');
const path = require('path');
const TradeHistory = require('./trade_history');
const app = express();

// WebSocket sunucusu için host ve port ayarları
const WS_PORT = 8081;
const WS_HOST = '0.0.0.0';
const dashboardWss = new WebSocket.Server({ 
  host: WS_HOST,
  port: WS_PORT 
});

// Express sunucusu için port ayarı
const HTTP_PORT = 3001;
const HTTP_HOST = '0.0.0.0';

// Global State
let state = {
  // Position tracking
  positionQty: 0,
  positionCost: 0,
  gridLevel: 0,
  isLongPosition: true,

  // Order tracking
  activeOrders: new Map(),
  filledOrders: new Map(),
  initialBuyOrderId: null,
  initialSellOrderId: null,
  closingOrderId: null,

  // Connection state
  wsOrderbook: null,
  wsTicker: null,
  wsPrivate: null,
  lastOrderbookData: null,

  // Control flags
  isProcessing: false,
  isResetting: false,
  lastOrderTime: 0,

  // Statistics
  startTime: Date.now(),
  totalPnL: 0,
  totalVolume: 0,
  lastPrice: 0,
  trades: [],
  lastTradePrice: 0
};

// Constants
const INITIAL_QUANTITY = 0.03;
const BASE_INCREMENT = 0.01;
const INCREMENT_STEP = 0.002;
const INITIAL_SPREAD = 80;
const CLOSING_SPREAD = 80;
const MIN_ORDER_INTERVAL = 500; // ms
const MAX_POSITION = 0.5; // BTC

// Fee constants
const MAKER_FEE = -0.00005; // -0.005%
const TAKER_FEE = 0.000225; // 0.0225%

// Trade history instance
const tradeHistory = new TradeHistory('BTC-USD');

function calculateFee(price, quantity, isTaker) {
  return price * quantity * (isTaker ? TAKER_FEE : MAKER_FEE);
}

// Logging
function log(type, message, data = null) {
  const time = new Date().toISOString();
  if (data) {
    console.log(`[${time}][BTC][${type}] ${message}`, data);
  } else {
    console.log(`[${time}][BTC][${type}] ${message}`);
  }
}

// Order Management
async function placeOrder(side, quantity, price, type = 'grid') {
  try {
    // Rate limit kontrolü
    const now = Date.now();
    if (now - state.lastOrderTime < MIN_ORDER_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_ORDER_INTERVAL));
    }

    const orderParams = {
      market: 'BTC-USD',
      type: 'limit',
      side,
      quantity: quantity.toFixed(8),
      price: price.toFixed(8)
    };

    const res = await api.createOrder(orderParams);
    
    state.activeOrders.set(res.orderId, {
      side,
      quantity,
      price,
      type,
      time: Date.now()
    });

    log('ORDER', `${type.toUpperCase()} ${side} order placed`, {
      quantity: quantity.toFixed(8),
      price: price.toFixed(8),
      orderId: res.orderId
    });

    state.lastOrderTime = Date.now();
    return res.orderId;
  } catch (err) {
    if (err.code === 'EXCEEDED_RATE_LIMIT') {
      // Rate limit aşıldıysa bekle ve tekrar dene
      await new Promise(resolve => setTimeout(resolve, MIN_ORDER_INTERVAL * 2));
      return placeOrder(side, quantity, price, type);
    } else if (err.code === 'INSUFFICIENT_FUNDS') {
      log('ERROR', 'Insufficient funds for order', {
        side,
        quantity,
        price
      });
      return null;
    }
    log('ERROR', 'Order placement failed', err.message);
    return null;
  }
}

async function cancelOrder(orderId) {
  try {
    const cancelParams = {
      nonce: uuid.v1(),
      wallet: config.walletAddress,
      orderIds: [orderId]
    };
    await api.cancelOrders(cancelParams);
    state.activeOrders.delete(orderId);
    log('ORDER', 'Order canceled', { orderId });
  } catch (err) {
    log('ERROR', 'Order cancellation failed', err.message);
  }
}

// Position Management
function updatePosition(side, quantity, price) {
  if (side === 'buy') {
    state.positionQty += quantity;
    state.positionCost += quantity * price;
  } else {
    state.positionQty -= quantity;
    state.positionCost += quantity * price;
  }

  log('POSITION', 'Updated', {
    quantity: state.positionQty,
    avgPrice: state.positionQty !== 0 ? state.positionCost / Math.abs(state.positionQty) : 0
  });
}

// Grid Logic
async function placeInitialOrders(basePrice) {
  // Önce mevcut emirleri iptal et
  for (const [orderId] of state.activeOrders) {
    await cancelOrder(orderId);
  }

  const buyPrice = Math.round(basePrice - INITIAL_SPREAD);
  const sellPrice = Math.round(basePrice + INITIAL_SPREAD);

  log('GRID', 'Placing initial orders', {
    buyPrice,
    sellPrice,
    quantity: INITIAL_QUANTITY
  });

  state.initialBuyOrderId = await placeOrder('buy', INITIAL_QUANTITY, buyPrice, 'initial');
  if (!state.initialBuyOrderId) {
    return; // Eğer alış emri açılamazsa satış emri açma
  }

  await new Promise(resolve => setTimeout(resolve, MIN_ORDER_INTERVAL));
  state.initialSellOrderId = await placeOrder('sell', INITIAL_QUANTITY, sellPrice, 'initial');
}

async function placeGridOrder(side, basePrice) {
  // Önceki emrin miktarını hesapla
  const prevQuantity = state.gridLevel === 1 ? 
    INITIAL_QUANTITY : // İlk grid için başlangıç miktarı
    INITIAL_QUANTITY + calculateTotalIncrement(state.gridLevel - 1); // Önceki grid için toplam artış
  
  // Bu seviye için artış miktarını hesapla
  const currentIncrement = BASE_INCREMENT + ((state.gridLevel - 1) * INCREMENT_STEP);
  
  // Yeni emir miktarı = önceki miktar + bu seviyenin artışı
  const quantity = prevQuantity + currentIncrement;
  
  const priceDiff = INITIAL_SPREAD + (state.gridLevel * 2);
  const price = side === 'buy' ? 
    Math.round(basePrice - priceDiff) : 
    Math.round(basePrice + priceDiff);

  if (Math.abs(state.positionQty) + quantity > MAX_POSITION) {
    log('GRID', 'Max position size reached, skipping grid order');
    return;
  }

  log('GRID', 'Placing grid order', {
    gridLevel: state.gridLevel,
    prevQuantity,
    increment: currentIncrement,
    newQuantity: quantity
  });

  await placeOrder(side, quantity, price, 'grid');
}

// Belirli bir seviyeye kadar olan toplam artışı hesapla
function calculateTotalIncrement(level) {
  let total = 0;
  for (let i = 0; i < level; i++) {
    total += BASE_INCREMENT + (i * INCREMENT_STEP);
  }
  return total;
}

async function placeClosingOrder() {
  if (state.positionQty === 0) return;

  const avgPrice = state.positionCost / Math.abs(state.positionQty);
  const side = state.positionQty > 0 ? 'sell' : 'buy';
  const price = Math.round(avgPrice + (side === 'sell' ? CLOSING_SPREAD : -CLOSING_SPREAD));

  if (state.closingOrderId) {
    await cancelOrder(state.closingOrderId);
  }

  state.closingOrderId = await placeOrder(
    side,
    Math.abs(state.positionQty),
    price,
    'closing'
  );
}

// WebSocket Handlers
function handleOrderbookMessage(data) {
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'l1orderbook') {
      state.lastOrderbookData = msg.data;
      
      // Eğer işlem yapılıyorsa veya herhangi bir emir varsa, yeni initial emirler açma
      if (state.isProcessing || state.activeOrders.size > 0 || state.gridLevel > 0) {
        return;
      }

      state.isProcessing = true;
      
      const basePrice = (
        parseFloat(msg.data.lp) * 0.4 +
        parseFloat(msg.data.mp) * 0.4 +
        parseFloat(msg.data.ip) * 0.2
      );
      
      placeInitialOrders(basePrice)
        .finally(() => {
          state.isProcessing = false;
        });
    }
  } catch (err) {
    log('ERROR', 'Orderbook message processing failed', err.message);
    state.isProcessing = false;
  }
}

// Dashboard WebSocket handling
function broadcastStats() {
  const stats = {
    uptime: Math.floor((Date.now() - state.startTime) / 1000), // saniye cinsinden
    totalPnL: state.totalPnL.toFixed(2),
    totalVolume: state.totalVolume.toFixed(2),
    lastPrice: state.lastPrice,
    positionQty: state.positionQty,
    gridLevel: state.gridLevel,
    activeOrders: Array.from(state.activeOrders.entries()).map(([id, order]) => ({
      id,
      side: order.side,
      price: order.price,
      quantity: order.quantity
    })),
    recentTrades: state.trades.slice(-10) // son 10 trade
  };

  dashboardWss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(stats));
    }
  });
}

// Her 1 saniyede bir istatistikleri gönder
setInterval(broadcastStats, 1000);

function handlePrivateMessage(data) {
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'orders' && msg.data && msg.data.x === 'fill' && msg.data.X === 'filled') {
      const orderId = msg.data.i;
      const side = msg.data.s;
      const price = parseFloat(msg.data.p);
      const quantity = parseFloat(msg.data.q);
      const isTaker = msg.data.lq === "0"; // liquidity flag, 0 means taker

      const orderInfo = state.activeOrders.get(orderId);
      if (!orderInfo) return;

      // Calculate fee and add to PnL immediately
      const fee = calculateFee(price, quantity, isTaker);
      // Maker fee is positive (rebate), Taker fee is negative
      state.totalPnL += isTaker ? -Math.abs(fee) : Math.abs(fee);
      
      // Calculate trade PnL only when closing a position
      let tradePnL = 0;
      const isClosing = (side === 'sell' && state.positionQty > 0) || (side === 'buy' && state.positionQty < 0);
      
      if (isClosing) {
        const avgEntryPrice = state.positionCost / Math.abs(state.positionQty);
        if (side === 'sell') { // Long position closing
          tradePnL = (price - avgEntryPrice) * quantity;
        } else { // Short position closing
          tradePnL = (avgEntryPrice - price) * quantity;
        }
        state.totalPnL += tradePnL;

        log('TRADE', 'Position closed', {
          side,
          entryPrice: avgEntryPrice,
          exitPrice: price,
          quantity,
          tradePnL,
          fee: isTaker ? -Math.abs(fee) : Math.abs(fee),
          totalPnL: state.totalPnL
        });
      } else {
        log('TRADE', 'Position opened/increased', {
          side,
          price,
          quantity,
          fee: isTaker ? -Math.abs(fee) : Math.abs(fee),
          totalPnL: state.totalPnL
        });
      }

      // Update position and stats
      updatePosition(side, quantity, price);
      state.lastPrice = price;
      state.totalVolume += quantity * price;
      
      // Trade record
      const trade = {
        time: new Date().toISOString(),
        side,
        price,
        quantity,
        type: orderInfo.type,
        fee: isTaker ? -Math.abs(fee) : Math.abs(fee),
        isTaker,
        pnl: isClosing ? tradePnL : null,
        totalPnL: state.totalPnL
      };
      
      // Add to state and history
      state.trades.push(trade);
      tradeHistory.addTrade(trade);

      // Keep only last 100 trades in memory
      if (state.trades.length > 100) {
        state.trades = state.trades.slice(-100);
      }

      state.filledOrders.set(orderId, { ...orderInfo, fillPrice: price });
      state.activeOrders.delete(orderId);

      // Handle order types
      if (orderInfo.type === 'closing') {
        handleClosingOrderFill(orderId, side, price, quantity);
      } else if (orderInfo.type === 'initial' || orderInfo.type === 'grid') {
        if (state.positionQty === quantity || state.positionQty === -quantity) {
          state.isLongPosition = side === 'buy';
        }
        handleGridOrderFill(orderId, side, price, quantity);
      }
    }
  } catch (err) {
    log('ERROR', 'Private message processing failed', err.message);
  }
}

async function handleGridOrderFill(orderId, side, price, quantity) {
  // İlk emirlerden biri dolduysa, diğerini iptal et
  if (orderId === state.initialBuyOrderId && state.initialSellOrderId) {
    await cancelOrder(state.initialSellOrderId);
    state.initialSellOrderId = null;
  } else if (orderId === state.initialSellOrderId && state.initialBuyOrderId) {
    await cancelOrder(state.initialBuyOrderId);
    state.initialBuyOrderId = null;
  }

  // Grid seviyesini artır ve yeni grid emri aç
  state.gridLevel++;
  
  // Önce closing order'ı aç
  await placeClosingOrder();
  
  // Sonra bir sonraki grid emrini aç
  await placeGridOrder(side, price);
}

async function handleClosingOrderFill(orderId, side, price, quantity) {
  log('GRID', 'Position closed', {
    side,
    price,
    quantity,
    pnl: state.totalPnL
  });

  // Reset state
  state = {
    ...state,
    positionQty: 0,
    positionCost: 0,
    gridLevel: 0,
    isLongPosition: true,
    isProcessing: false,
    closingOrderId: null
  };

  // Cancel all open orders
  for (const [orderId] of state.activeOrders) {
    await cancelOrder(orderId);
  }
}

// WebSocket Setup
function setupWebSockets() {
  // Orderbook
  state.wsOrderbook = new WebSocket(`${config.wsUrl}/BTC-USD@l1orderbook`);
  state.wsOrderbook.on('message', handleOrderbookMessage);
  state.wsOrderbook.on('error', err => log('ERROR', 'Orderbook websocket error', err.message));
  state.wsOrderbook.on('close', () => {
    log('WS', 'Orderbook connection closed, reconnecting...');
    setTimeout(setupWebSockets, 1000);
  });

  // Private
  api.getWsToken().then(token => {
    state.wsPrivate = new WebSocket(config.wsUrl);
    state.wsPrivate.on('open', () => {
      state.wsPrivate.send(JSON.stringify({
        method: 'subscribe',
        token,
        subscriptions: ['orders']
      }));
    });
    state.wsPrivate.on('message', handlePrivateMessage);
    state.wsPrivate.on('error', err => log('ERROR', 'Private websocket error', err.message));
    state.wsPrivate.on('close', () => {
      log('WS', 'Private connection closed, reconnecting...');
      setTimeout(setupWebSockets, 1000);
    });
  });
}

// Start Bot
async function startBot() {
  log('BOT', 'Starting BTC Grid Bot...');
  await tradeHistory.load();
  
  // Load previous stats
  state.totalPnL = await tradeHistory.getTotalPnL();
  state.totalVolume = await tradeHistory.getTotalVolume();
  state.trades = await tradeHistory.getRecentTrades();
  
  setupWebSockets();
}

// Express static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(HTTP_PORT, HTTP_HOST, () => {
  log('SERVER', `Dashboard server running on http://${HTTP_HOST}:${HTTP_PORT}`);
  log('SERVER', `WebSocket server running on ws://${WS_HOST}:${WS_PORT}`);
});

startBot(); 