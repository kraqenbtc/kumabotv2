const api = require('./api');
const { generateGridOrders } = require('./grid');
const WebSocket = require('ws');
const config = require('./config');
const uuid = require('uuid');

// GLOBAL: Grid state cache
const activeGridPrices = new Set();
let gridOrdersSent = false;
const filledOrderIds = new Set();
let tickerWs = null;
let orderbookWs = null;
let isProcessingOrder = false; // Emir işleme durumunu takip etmek için
let closingOrderId = null; // Kapama emrinin ID'sini takip etmek için

// Pozisyon takibi
let positionQty = 0;
let positionCost = 0;
let gridLevel = 0; // Grid seviyesi takibi için
let isLongPosition = true; // Pozisyon yönü takibi (true: long, false: short)

/**
 * Get basic exchange information
 */
async function getExchangeInfo() {
  try {
    // Check API connectivity
    console.log('Checking API connectivity...');
    await api.ping();
    console.log('API is reachable');

    // Get server time
    const timeData = await api.getTime();
    console.log(`Server time: ${new Date(timeData.serverTime).toISOString()}`);

    // Get exchange information
    console.log('\nGetting exchange information...');
    const exchangeInfo = await api.getExchangeInfo();
    console.log('Exchange information:');
    console.log(`- Chain ID: ${exchangeInfo.chainId}`);
    console.log(`- Quote Token: ${exchangeInfo.quoteTokenAddress}`);
    console.log(`- Total Open Interest: ${exchangeInfo.totalOpenInterest} USD`);
    console.log(`- 24h Volume: ${exchangeInfo.volume24h} USD`);
    console.log(`- Total Volume: ${exchangeInfo.totalVolume} USD`);
    console.log(`- Total Trades: ${exchangeInfo.totalTrades}`);
    console.log(`- Default Maker Fee: ${exchangeInfo.defaultMakerFeeRate}`);
    console.log(`- Default Taker Fee: ${exchangeInfo.defaultTakerFeeRate}`);

    // Get markets
    console.log('\nGetting markets information...');
    const markets = await api.getMarkets();
    console.log(`Available markets: ${markets.length}`);
    markets.forEach(market => {
      console.log(`- ${market.market}: ${market.baseAsset}/${market.quoteAsset}`);
      console.log(`  Status: ${market.status}`);
      console.log(`  Index Price: ${market.indexPrice}`);
      console.log(`  24h Volume: ${market.volume24h}`);
      console.log(`  Open Interest: ${market.openInterest}`);
      console.log(`  Initial Margin Fraction: ${market.initialMarginFraction}`);
      console.log('  ---');
    });
  } catch (error) {
    console.error('Error getting exchange information:', error.message);
  }
}

/**
 * Get account information
 */
async function getAccountInfo() {
  try {
    console.log('\nAssociating wallet with API account...');
    // Associate wallet with API account
    await api.associateWallet();
    console.log('Wallet successfully associated with API account');

    // Get wallet information
    console.log('\nGetting wallet information...');
    const wallets = await api.getWallets();
    
    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      console.log('Wallet information:');
      console.log(`- Address: ${wallet.wallet}`);
      console.log(`- Equity: ${wallet.equity} USD`);
      console.log(`- Free Collateral: ${wallet.freeCollateral} USD`);
      console.log(`- Available Collateral: ${wallet.availableCollateral} USD`);
      console.log(`- Buying Power: ${wallet.buyingPower} USD`);
      console.log(`- Leverage: ${wallet.leverage}`);
      console.log(`- Margin Ratio: ${wallet.marginRatio}`);
      console.log(`- Quote Balance: ${wallet.quoteBalance} USD`);
      console.log(`- Unrealized PnL: ${wallet.unrealizedPnL} USD`);
      console.log(`- Maker Fee Rate: ${wallet.makerFeeRate}`);
      console.log(`- Taker Fee Rate: ${wallet.takerFeeRate}`);

      // Get positions
      if (wallet.positions && wallet.positions.length > 0) {
        console.log('\nActive positions:');
        wallet.positions.forEach(position => {
          console.log(`- ${position.market}: ${position.quantity} (${position.quantity > 0 ? 'Long' : 'Short'})`);
          console.log(`  Entry Price: ${position.entryPrice}`);
          console.log(`  Mark Price: ${position.markPrice}`);
          console.log(`  Unrealized PnL: ${position.unrealizedPnL} USD`);
          console.log(`  Margin Requirement: ${position.marginRequirement} USD`);
          console.log(`  Leverage: ${position.leverage}`);
          console.log('  ---');
        });
      } else {
        console.log('\nNo active positions');
      }
    } else {
      console.log('No wallet information found');
    }
  } catch (error) {
    console.error('Error getting account information:', error.message);
  }
}

function calculateBasePrice(orderbookData) {
  const lp = parseFloat(orderbookData.lp);
  const mp = parseFloat(orderbookData.mp);
  const ip = parseFloat(orderbookData.ip);
  // Index price'a %20 ağırlık ver
  return (lp * 0.4 + mp * 0.4 + ip * 0.2);
}

function startBTCWebSocket() {
  const wsUrl = config.wsUrl;
  
  // Eğer mevcut bağlantılar varsa kapat
  if (tickerWs) {
    tickerWs.close();
    tickerWs = null;
  }
  if (orderbookWs) {
    orderbookWs.close();
    orderbookWs = null;
  }

  // Önce ticker bağlantısını aç
  tickerWs = new WebSocket(`${wsUrl}/BTC-USD@tickers`);
  tickerWs.on('open', async () => {
    console.log('[WS] BTC-USD ticker bağlantısı açıldı');
    
    // Tüm açık emirleri kontrol et ve iptal et
    try {
      const openOrders = await api.getOrders({ 
        market: 'BTC-USD',
        closed: false 
      });
      
      if (openOrders.length > 0) {
        const orderIds = openOrders.map(order => order.orderId);
        const cancelParams = {
          nonce: uuid.v1(),
          wallet: config.walletAddress,
          orderIds: orderIds
        };
        const response = await api.cancelOrders(cancelParams);
        console.log('[ORDER][CANCEL] Mevcut emirler iptal edildi:', response);
        // İptal işleminin tamamlanması için bekle
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error('[ORDER][CANCEL][ERR]', err.message);
    }

    // Ticker bağlantısı açıldıktan sonra orderbook bağlantısını aç
    orderbookWs = new WebSocket(`${wsUrl}/BTC-USD@l1orderbook`);
    
    orderbookWs.on('open', () => {
      console.log('[WS] BTC-USD orderbook bağlantısı açıldı');
      // WebSocket bağlantısı açıldığında gridOrdersSent'i false yap
      gridOrdersSent = false;
      isProcessingOrder = false;
      activeGridPrices.clear();
      filledOrderIds.clear();
    });

    orderbookWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'l1orderbook') {
          const basePrice = calculateBasePrice(msg.data);
          
          // Eğer emir işleme devam ediyorsa veya grid emirleri zaten açıksa, yeni emir açma
          if (isProcessingOrder || gridOrdersSent) {
            return;
          }

          isProcessingOrder = true;
          console.log('[GRID] Yeni grid emirleri açılıyor...');
          console.log('[GRID] Base price:', basePrice);
          
          try {
            // Önce mevcut açık emirleri kontrol et ve iptal et
            const openOrders = await api.getOrders({ 
              market: 'BTC-USD',
              closed: false 
            });
            
            if (openOrders.length > 0) {
              const orderIds = openOrders.map(order => order.orderId);
              const cancelParams = {
                nonce: uuid.v1(),
                wallet: config.walletAddress,
                orderIds: orderIds
              };
              const response = await api.cancelOrders(cancelParams);
              console.log('[ORDER][CANCEL] Mevcut emirler iptal edildi:', response);
              // İptal işleminin tamamlanması için bekle
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Sadece 1 alış ve 1 satış grid aç
            const buyOrder = {
              side: 'buy',
              price: Math.round(basePrice - 25).toFixed(8), // Başlangıç aralığı 25
              quantity: '0.02000000' // Başlangıç miktarı 0.02
            };
            const sellOrder = {
              side: 'sell',
              price: Math.round(basePrice + 25).toFixed(8), // Başlangıç aralığı 25
              quantity: '0.02000000' // Başlangıç miktarı 0.02
            };
            
            console.log('[GRID] Buy order:', buyOrder);
            console.log('[GRID] Sell order:', sellOrder);
            
            // Önce alış emrini aç
            const buyParams = {
              market: 'BTC-USD',
              type: 'limit',
              side: buyOrder.side,
              quantity: buyOrder.quantity,
              price: buyOrder.price
            };
            const buyRes = await api.createOrder(buyParams);
            console.log('[ORDER][BUY][OK]', buyParams, buyRes.orderId || buyRes);
            activeGridPrices.add(`${buyOrder.side}_${buyOrder.price}_${buyOrder.quantity}`);
            
            // Sonra satış emrini aç
            const sellParams = {
              market: 'BTC-USD',
              type: 'limit',
              side: sellOrder.side,
              quantity: sellOrder.quantity,
              price: sellOrder.price
            };
            const sellRes = await api.createOrder(sellParams);
            console.log('[ORDER][SELL][OK]', sellParams, sellRes.orderId || sellRes);
            activeGridPrices.add(`${sellOrder.side}_${sellOrder.price}_${sellOrder.quantity}`);
            
            gridOrdersSent = true;
            console.log('[GRID] Grid emirleri açıldı');
          } catch (error) {
            console.error('[GRID] Emir açma hatası:', error);
          } finally {
            isProcessingOrder = false;
          }
        }
      } catch (e) {
        console.error('[WS][Orderbook] JSON parse error:', e);
        isProcessingOrder = false;
      }
    });

    orderbookWs.on('error', (err) => {
      console.error('[WS][Orderbook] Hata:', err);
    });

    orderbookWs.on('close', () => {
      console.log('[WS][Orderbook] Bağlantı kapandı');
    });
  });

  tickerWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'tickers') {
        console.log('[WS][BTC-USD][Ticker]', msg.data);
      }
    } catch (e) {
      console.error('[WS][Ticker] JSON parse error:', e);
    }
  });

  tickerWs.on('error', (err) => {
    console.error('[WS][Ticker] Hata:', err);
  });

  tickerWs.on('close', () => {
    console.log('[WS][Ticker] Bağlantı kapandı');
  });
}

async function startOrderFillsWebSocket() {
  const wsToken = await api.getWsToken();
  const ws = new WebSocket(config.wsUrl);

  ws.on('open', () => {
    console.log('[WS] BTC-USD private orders bağlantısı açıldı');
    ws.send(JSON.stringify({
      method: 'subscribe',
      token: wsToken,
      subscriptions: ['orders']
    }));
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'orders' && msg.data && msg.data.x === 'fill' && msg.data.X === 'filled') {
        const orderId = msg.data.i;
        if (filledOrderIds.has(orderId)) return;
        filledOrderIds.add(orderId);

        const fillPrice = Math.round(Number(msg.data.p)).toFixed(8);
        const fillSide = msg.data.s;
        const originalQuantity = msg.data.q;
        const fillQty = parseFloat(originalQuantity);
        const fillPriceNum = parseFloat(fillPrice);

        // Kapama emri doldu mu kontrol et
        const isClosingOrder = (isLongPosition && fillSide === 'sell') || (!isLongPosition && fillSide === 'buy');
        
        if (isClosingOrder) {
          console.log('[GRID] Kapama emri doldu, pozisyon kapanıyor...');
          // Pozisyonu sıfırla ve yeni döngüye başla
          positionQty = 0;
          positionCost = 0;
          gridLevel = 0;
          isLongPosition = true;
          gridOrdersSent = false;
          activeGridPrices.clear();
          filledOrderIds.clear();
          isProcessingOrder = false;
          closingOrderId = null;
          
          console.log('[GRID] Sistem sıfırlandı, yeni döngü başlıyor...');
          
          // Tüm açık emirleri iptal et
          try {
            const openOrders = await api.getOrders({ 
              market: 'BTC-USD',
              closed: false 
            });
            
            if (openOrders.length > 0) {
              const orderIds = openOrders.map(order => order.orderId);
              const cancelParams = {
                nonce: uuid.v1(),
                wallet: config.walletAddress,
                orderIds: orderIds
              };
              const response = await api.cancelOrders(cancelParams);
              console.log('[ORDER][CANCEL] Tüm açık emirler iptal edildi:', response);
            }
          } catch (err) {
            console.error('[ORDER][CANCEL][ERR]', err.message);
          }

          // Yeni emirler için orderbook'u dinlemeye devam et
          if (orderbookWs && orderbookWs.readyState === WebSocket.OPEN) {
            console.log('[GRID] Yeni emirler için orderbook dinleniyor...');
            // WebSocket bağlantısını yeniden başlat
            startBTCWebSocket();
          } else {
            console.log('[GRID] Orderbook bağlantısı yeniden kuruluyor...');
            startBTCWebSocket();
          }
          return;
        }

        if (fillSide === 'buy') {
          // İlk alış emri dolduğunda pozisyon yönünü belirle
          if (positionQty === 0) {
            isLongPosition = true;
          }
          
          // Pozisyonu güncelle
          positionCost += fillPriceNum * fillQty;
          positionQty += fillQty;
          gridLevel++; // Grid seviyesini artır

          if (isLongPosition) {
            // LONG pozisyon için yeni alış grid
            const priceDiff = (gridLevel + 1) * 25; // 25, 50, 75...
            const newBuyPrice = (fillPriceNum - priceDiff);
            const newBuyQty = (fillQty + 0.0025).toFixed(8); // Her seferinde 0.0025 artacak
            const newBuyKey = `buy_${Math.round(newBuyPrice).toFixed(8)}_${newBuyQty}`;
            if (!activeGridPrices.has(newBuyKey)) {
              const orderParams = {
                market: 'BTC-USD',
                type: 'limit',
                side: 'buy',
                quantity: newBuyQty,
                price: Math.round(newBuyPrice).toFixed(8)
              };
              try {
                const res = await api.createOrder(orderParams);
                console.log('[ORDER][GRID-BUY][OK]', orderParams, res.orderId || res);
                activeGridPrices.add(newBuyKey);
              } catch (err) {
                console.error('[ORDER][GRID-BUY][ERR]', orderParams, err.message);
              }
            }

            // LONG pozisyonu kapatacak satış grid
            if (positionQty > 0 && positionCost > 0) {
              const avgCost = positionCost / positionQty;
              console.log('[POSITION] Mevcut pozisyon:', {
                quantity: positionQty,
                averageCost: avgCost,
                totalCost: positionCost
              });

              // Önceki kapama emirlerini iptal et
              try {
                const openOrders = await api.getOrders({ 
                  market: 'BTC-USD',
                  closed: false 
                });
                
                // Sadece kapama emirlerini filtrele ve iptal et
                const closingOrders = openOrders.filter(order => 
                  (isLongPosition && order.side === 'sell') || 
                  (!isLongPosition && order.side === 'buy')
                );
                
                if (closingOrders.length > 0) {
                  const orderIds = closingOrders.map(order => order.orderId);
                  const cancelParams = {
                    nonce: uuid.v1(),
                    wallet: config.walletAddress,
                    orderIds: orderIds
                  };
                  const response = await api.cancelOrders(cancelParams);
                  console.log('[ORDER][CANCEL] Önceki kapama emirleri iptal edildi:', response);
                  // İptal işleminin tamamlanması için bekle
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              } catch (err) {
                console.error('[ORDER][CANCEL][ERR]', err.message);
              }

              // Yeni satış emri aç - Ortalama + 30
              const sellPrice = Math.round(avgCost + 30).toFixed(8);
              const sellQty = positionQty.toFixed(8);
              const sellKey = `sell_${sellPrice}_${sellQty}`;
              
              if (!activeGridPrices.has(sellKey)) {
                const orderParams = {
                  market: 'BTC-USD',
                  type: 'limit',
                  side: 'sell',
                  quantity: sellQty,
                  price: sellPrice
                };
                try {
                  const res = await api.createOrder(orderParams);
                  console.log('[ORDER][GRID-SELL][OK]', orderParams, res.orderId || res);
                  activeGridPrices.add(sellKey);
                  closingOrderId = res.orderId;
                } catch (err) {
                  console.error('[ORDER][GRID-SELL][ERR]', orderParams, err.message);
                }
              }
            }
          }
        } else if (fillSide === 'sell') {
          // İlk satış emri dolduğunda pozisyon yönünü belirle
          if (positionQty === 0) {
            isLongPosition = false;
          }

          // Pozisyonu güncelle
          positionCost += fillPriceNum * fillQty;
          positionQty += fillQty;
          gridLevel++; // Grid seviyesini artır

          if (!isLongPosition) {
            // SHORT pozisyon için yeni satış grid
            const priceDiff = (gridLevel + 1) * 25; // 25, 50, 75...
            const newSellPrice = (fillPriceNum + priceDiff);
            const newSellQty = (fillQty + 0.0025).toFixed(8); // Her seferinde 0.0025 artacak
            const newSellKey = `sell_${Math.round(newSellPrice).toFixed(8)}_${newSellQty}`;
            if (!activeGridPrices.has(newSellKey)) {
              const orderParams = {
                market: 'BTC-USD',
                type: 'limit',
                side: 'sell',
                quantity: newSellQty,
                price: Math.round(newSellPrice).toFixed(8)
              };
              try {
                const res = await api.createOrder(orderParams);
                console.log('[ORDER][GRID-SELL][OK]', orderParams, res.orderId || res);
                activeGridPrices.add(newSellKey);
              } catch (err) {
                console.error('[ORDER][GRID-SELL][ERR]', orderParams, err.message);
              }
            }

            // SHORT pozisyonu kapatacak alış grid
            if (positionQty < 0 && positionCost > 0) {
              const avgCost = positionCost / Math.abs(positionQty);
              console.log('[POSITION] Mevcut pozisyon:', {
                quantity: positionQty,
                averageCost: avgCost,
                totalCost: positionCost
              });

              // Önceki kapama emirlerini iptal et
              try {
                const openOrders = await api.getOrders({ 
                  market: 'BTC-USD',
                  closed: false 
                });
                
                // Sadece kapama emirlerini filtrele ve iptal et
                const closingOrders = openOrders.filter(order => 
                  (isLongPosition && order.side === 'sell') || 
                  (!isLongPosition && order.side === 'buy')
                );
                
                if (closingOrders.length > 0) {
                  const orderIds = closingOrders.map(order => order.orderId);
                  const cancelParams = {
                    nonce: uuid.v1(),
                    wallet: config.walletAddress,
                    orderIds: orderIds
                  };
                  const response = await api.cancelOrders(cancelParams);
                  console.log('[ORDER][CANCEL] Önceki kapama emirleri iptal edildi:', response);
                  // İptal işleminin tamamlanması için bekle
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              } catch (err) {
                console.error('[ORDER][CANCEL][ERR]', err.message);
              }

              // Yeni alış emri aç - Ortalama - 30
              const buyPrice = Math.round(avgCost - 30).toFixed(8);
              const buyQty = Math.abs(positionQty).toFixed(8);
              const buyKey = `buy_${buyPrice}_${buyQty}`;
              
              if (!activeGridPrices.has(buyKey)) {
                const orderParams = {
                  market: 'BTC-USD',
                  type: 'limit',
                  side: 'buy',
                  quantity: buyQty,
                  price: buyPrice
                };
                try {
                  const res = await api.createOrder(orderParams);
                  console.log('[ORDER][GRID-BUY][OK]', orderParams, res.orderId || res);
                  activeGridPrices.add(buyKey);
                  closingOrderId = res.orderId;
                } catch (err) {
                  console.error('[ORDER][GRID-BUY][ERR]', orderParams, err.message);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[WS][Fills] JSON parse error:', e);
    }
  });
  ws.on('error', (err) => {
    console.error('[WS][Fills] Hata:', err);
  });
  ws.on('close', () => {
    console.log('[WS][Fills] Bağlantı kapandı');
  });
}

async function main() {
  try {
    console.log('=== Kuma API Demo ===\n');
    await getExchangeInfo();
    await getAccountInfo();
  } catch (error) {
    console.error('Main error:', error.message);
  }
}

main(); 
startBTCWebSocket();
startOrderFillsWebSocket(); 