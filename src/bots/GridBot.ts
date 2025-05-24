import WebSocket, { WebSocketServer } from 'ws';
import { 
  BotConfig, 
  BotState, 
  Trade, 
  DashboardStats,
  OrderbookData,
  OrderFillData,
  WebSocketMessage,
  SYMBOL_CONFIGS,
  OrderInfo 
} from '../types';
import { KumaClient } from '../services/KumaClient';
import { TradeHistory } from '../services/TradeHistory';
import { Config } from '../config';

export class GridBot {
  protected config: BotConfig;
  protected state: BotState;
  protected kumaClient: KumaClient;
  protected tradeHistory: TradeHistory;
  protected wsOrderbook: WebSocket | null = null;
  protected wsPrivate: WebSocket | null = null;
  protected dashboardWss: WebSocketServer | null = null;

  // Constants
  protected readonly MIN_ORDER_INTERVAL = 500; // ms
  protected readonly MAKER_FEE = -0.00005; // -0.005%
  protected readonly TAKER_FEE = 0.000225; // 0.0225%

  constructor(
    config: BotConfig,
    kumaConfig: Config,
    dashboardWss?: WebSocketServer
  ) {
    this.config = config;
    this.dashboardWss = dashboardWss || null;
    
    this.kumaClient = new KumaClient({
      sandbox: kumaConfig.sandbox,
      walletPrivateKey: kumaConfig.walletPrivateKey,
      apiKey: kumaConfig.apiKey,
      apiSecret: kumaConfig.apiSecret,
      wsUrl: kumaConfig.wsUrl,
      walletAddress: kumaConfig.walletAddress
    });

    this.tradeHistory = new TradeHistory(config.symbol);
    
    // Initialize state
    this.state = {
      positionQty: 0,
      positionCost: 0,
      gridLevel: 0,
      isLongPosition: true,
      activeOrders: new Map(),
      filledOrders: new Map(),
      initialBuyOrderId: null,
      initialSellOrderId: null,
      closingOrderId: null,
      isProcessing: false,
      isResetting: false,
      lastOrderTime: 0,
      startTime: Date.now(),
      totalPnL: 0,
      totalVolume: 0,
      lastPrice: 0,
      trades: [],
      position: {
        quantity: 0,
        cost: 0,
        avgPrice: 0
      },
      stats: {
        totalTrades: 0,
        winningTrades: 0,
        totalVolume: 0,
        totalPnL: 0,
        fees: {
          total: 0,
          maker: 0,
          taker: 0
        }
      }
    };
  }

  // Symbol-specific price formatting
  protected formatPrice(price: number): string {
    const symbolConfig = SYMBOL_CONFIGS[this.config.symbol];
    return price.toFixed(symbolConfig.priceDecimals);
  }

  // Calculate spread based on grid level
  protected calculateSpread(level: number): number {
    return this.config.initialSpread + (level * this.config.spreadIncrement);
  }

  // Format quantity based on symbol
  protected formatQuantity(quantity: number): string {
    const symbolConfig = SYMBOL_CONFIGS[this.config.symbol];
    return quantity.toFixed(symbolConfig.quantityDecimals);
  }

  // Logging
  protected log(type: string, message: string, data?: any): void {
    const time = new Date().toISOString();
    const symbol = this.config.symbol.split('-')[0];
    if (data) {
      console.log(`[${time}][${symbol}][${type}] ${message}`, data);
    } else {
      console.log(`[${time}][${symbol}][${type}] ${message}`);
    }
  }

  // Fee calculation
  protected calculateFee(price: number, quantity: number, isTaker: boolean): number {
    return price * quantity * (isTaker ? this.TAKER_FEE : this.MAKER_FEE);
  }

  // Order Management
  protected async placeOrder(
    side: 'buy' | 'sell', 
    quantity: number, 
    price: number, 
    type: 'initial' | 'grid' | 'closing' = 'grid'
  ): Promise<string | null> {
    try {
      // Rate limit control
      const now = Date.now();
      if (now - this.state.lastOrderTime < this.MIN_ORDER_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_ORDER_INTERVAL));
      }

      const orderParams = {
        market: this.config.symbol,
        type: 'limit' as const,
        side,
        quantity: this.formatQuantity(quantity),
        price: this.formatPrice(price)
      };

      const res = await this.kumaClient.createOrder(orderParams);
      
      this.state.activeOrders.set(res.orderId, {
        side,
        quantity,
        price,
        type,
        time: Date.now()
      });

      this.log('ORDER', `${type.toUpperCase()} ${side} order placed`, {
        quantity: this.formatQuantity(quantity),
        price: this.formatPrice(price),
        orderId: res.orderId
      });

      this.state.lastOrderTime = Date.now();
      return res.orderId;
    } catch (err: any) {
      if (err.code === 'EXCEEDED_RATE_LIMIT') {
        await new Promise(resolve => setTimeout(resolve, this.MIN_ORDER_INTERVAL * 2));
        return this.placeOrder(side, quantity, price, type);
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        this.log('ERROR', 'Insufficient funds for order', {
          side,
          quantity,
          price
        });
        return null;
      }
      this.log('ERROR', 'Order placement failed', err.message);
      return null;
    }
  }

  protected async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.kumaClient.cancelOrders({
        orderIds: [orderId]
      });
      this.state.activeOrders.delete(orderId);
      this.log('ORDER', 'Order canceled', { orderId });
    } catch (err: any) {
      this.log('ERROR', 'Order cancellation failed', err.message);
    }
  }

  // Position Management
  protected updatePosition(side: 'buy' | 'sell', quantity: number, price: number): void {
    if (side === 'buy') {
      this.state.positionQty += quantity;
      this.state.positionCost += quantity * price;
    } else {
      this.state.positionQty -= quantity;
      this.state.positionCost -= quantity * price;
    }

    this.log('POSITION', 'Updated', {
      quantity: this.state.positionQty,
      avgPrice: this.state.positionQty !== 0 ? 
        this.state.positionCost / Math.abs(this.state.positionQty) : 0
    });
  }

  // Grid Logic
  protected async placeInitialOrders(basePrice: number): Promise<void> {
    // Cancel existing orders
    for (const [orderId] of this.state.activeOrders) {
      await this.cancelOrder(orderId);
    }

    const spread = this.config.initialSpread;
    const buyPrice = basePrice - spread;
    const sellPrice = basePrice + spread;

    this.log('GRID', 'Placing initial orders', {
      buyPrice: this.formatPrice(buyPrice),
      sellPrice: this.formatPrice(sellPrice),
      quantity: this.config.initialQuantity
    });

    this.state.initialBuyOrderId = await this.placeOrder(
      'buy', 
      this.config.initialQuantity, 
      buyPrice, 
      'initial'
    );
    
    if (!this.state.initialBuyOrderId) {
      return; // Don't place sell order if buy order fails
    }

    await new Promise(resolve => setTimeout(resolve, this.MIN_ORDER_INTERVAL));
    
    this.state.initialSellOrderId = await this.placeOrder(
      'sell', 
      this.config.initialQuantity, 
      sellPrice, 
      'initial'
    );
  }

  protected async placeGridOrder(side: 'buy' | 'sell', basePrice: number): Promise<void> {
    // Calculate quantity with increments
    const prevQuantity = this.state.gridLevel === 1 ? 
      this.config.initialQuantity :
      this.config.initialQuantity + this.calculateTotalIncrement(this.state.gridLevel - 1);
    
    const currentIncrement = this.config.baseIncrement + 
      ((this.state.gridLevel - 1) * this.config.incrementStep);
    
    const quantity = prevQuantity + currentIncrement;
    
    // Calculate price with spread
    const priceDiff = this.calculateSpread(this.state.gridLevel);
    const price = side === 'buy' ? 
      basePrice - priceDiff : 
      basePrice + priceDiff;

    if (Math.abs(this.state.positionQty) + quantity > this.config.maxPosition) {
      this.log('GRID', 'Max position size reached, skipping grid order');
      return;
    }

    // Check max grid level
    if (this.config.maxGridLevel && this.state.gridLevel >= this.config.maxGridLevel) {
      this.log('GRID', 'Max grid level reached, skipping grid order');
      return;
    }

    this.log('GRID', 'Placing grid order', {
      gridLevel: this.state.gridLevel,
      prevQuantity,
      increment: currentIncrement,
      newQuantity: quantity,
      priceDiff
    });

    await this.placeOrder(side, quantity, price, 'grid');
  }

  protected calculateTotalIncrement(level: number): number {
    let total = 0;
    for (let i = 0; i < level; i++) {
      total += this.config.baseIncrement + (i * this.config.incrementStep);
    }
    return total;
  }

  protected async placeClosingOrder(): Promise<void> {
    if (this.state.positionQty === 0) return;

    const avgPrice = this.state.positionCost / Math.abs(this.state.positionQty);
    const side = this.state.positionQty > 0 ? 'sell' : 'buy';
    const price = avgPrice + (side === 'sell' ? 
      this.config.closingSpread : -this.config.closingSpread);

    if (this.state.closingOrderId) {
      await this.cancelOrder(this.state.closingOrderId);
    }

    this.state.closingOrderId = await this.placeOrder(
      side,
      Math.abs(this.state.positionQty),
      price,
      'closing'
    );
  }

  // WebSocket Handlers
  protected handleOrderbookMessage(data: string): void {
    try {
      const msg: WebSocketMessage = JSON.parse(data);
      if (msg.type === 'l1orderbook') {
        const orderbook = msg.data as OrderbookData;
        
        if (this.state.isProcessing || this.state.activeOrders.size > 0 || this.state.gridLevel > 0) {
          return;
        }

        this.state.isProcessing = true;
        
        const basePrice = (
          parseFloat(orderbook.lp) * 0.4 +
          parseFloat(orderbook.mp) * 0.4 +
          parseFloat(orderbook.ip) * 0.2
        );
        
        this.placeInitialOrders(basePrice)
          .finally(() => {
            this.state.isProcessing = false;
          });
      }
    } catch (err: any) {
      this.log('ERROR', 'Orderbook message processing failed', err.message);
      this.state.isProcessing = false;
    }
  }

  protected async handlePrivateMessage(data: string): Promise<void> {
    try {
      const msg: WebSocketMessage = JSON.parse(data);
      if (msg.type === 'orders' && msg.data && msg.data.x === 'fill' && msg.data.X === 'filled') {
        const fillData = msg.data as OrderFillData;
        const orderId = fillData.i;
        const side = fillData.s;
        const price = parseFloat(fillData.p);
        const quantity = parseFloat(fillData.q);
        const isTaker = fillData.lq === "0";

        const orderInfo = this.state.activeOrders.get(orderId);
        if (!orderInfo) return;

        // Calculate fee
        const fee = this.calculateFee(price, quantity, isTaker);
        this.state.totalPnL += isTaker ? -Math.abs(fee) : Math.abs(fee);
        
        // Calculate trade PnL
        let tradePnL = 0;
        const isClosing = (side === 'sell' && this.state.positionQty > 0) || 
                         (side === 'buy' && this.state.positionQty < 0);
        
        if (isClosing) {
          const avgEntryPrice = this.state.positionCost / Math.abs(this.state.positionQty);
          tradePnL = side === 'sell' ? 
            (price - avgEntryPrice) * quantity :
            (avgEntryPrice - price) * quantity;
          this.state.totalPnL += tradePnL;
        }

        // Update position and stats
        this.updatePosition(side, quantity, price);
        this.state.lastPrice = price;
        this.state.totalVolume += quantity * price;
        
        // Create trade record
        const trade: Trade = {
          time: new Date().toISOString(),
          side,
          price,
          quantity,
          type: orderInfo.type,
          fee: isTaker ? -Math.abs(fee) : Math.abs(fee),
          isTaker,
          pnl: isClosing ? tradePnL : null,
          totalPnL: this.state.totalPnL
        };
        
        // Add to history
        this.state.trades.push(trade);
        await this.tradeHistory.addTrade(trade);

        // Keep only last 100 trades
        if (this.state.trades.length > 100) {
          this.state.trades = this.state.trades.slice(-100);
        }

        this.state.filledOrders.set(orderId, { ...orderInfo, fillPrice: price });
        this.state.activeOrders.delete(orderId);

        // Handle order types
        if (orderInfo.type === 'closing') {
          await this.handleClosingOrderFill(orderId, side, price, quantity);
        } else if (orderInfo.type === 'initial' || orderInfo.type === 'grid') {
          await this.handleGridOrderFill(orderId, side, price, quantity);
        }

        // Check stop loss and take profit
        if (this.config.stopLoss && this.state.totalPnL <= this.config.stopLoss) {
          this.log('RISK', 'Stop loss triggered', { totalPnL: this.state.totalPnL });
          await this.stop();
        }
        
        if (this.config.takeProfit && this.state.totalPnL >= this.config.takeProfit) {
          this.log('RISK', 'Take profit triggered', { totalPnL: this.state.totalPnL });
          await this.stop();
        }
      }
    } catch (err: any) {
      this.log('ERROR', 'Private message processing failed', err.message);
    }
  }

  protected async handleGridOrderFill(
    orderId: string, 
    side: 'buy' | 'sell', 
    price: number, 
    quantity: number
  ): Promise<void> {
    // Cancel opposite initial order
    if (orderId === this.state.initialBuyOrderId && this.state.initialSellOrderId) {
      await this.cancelOrder(this.state.initialSellOrderId);
      this.state.initialSellOrderId = null;
    } else if (orderId === this.state.initialSellOrderId && this.state.initialBuyOrderId) {
      await this.cancelOrder(this.state.initialBuyOrderId);
      this.state.initialBuyOrderId = null;
    }

    // Increase grid level
    this.state.gridLevel++;
    
    // Place closing order first
    await this.placeClosingOrder();
    
    // Then place next grid order
    await this.placeGridOrder(side, price);
  }

  protected async handleClosingOrderFill(
    orderId: string, 
    side: 'buy' | 'sell', 
    price: number, 
    quantity: number
  ): Promise<void> {
    this.log('GRID', 'Position closed', {
      side,
      price,
      quantity,
      pnl: this.state.totalPnL
    });

    // Reset state
    this.state = {
      ...this.state,
      positionQty: 0,
      positionCost: 0,
      gridLevel: 0,
      isLongPosition: true,
      isProcessing: false,
      closingOrderId: null
    };

    // Cancel all open orders
    for (const [orderId] of this.state.activeOrders) {
      await this.cancelOrder(orderId);
    }
  }

  // WebSocket Setup
  protected setupWebSockets(): void {
    // Orderbook WebSocket
    const orderbookUrl = `${this.kumaClient.getWebSocketUrl()}/${this.config.symbol}@l1orderbook`;
    this.wsOrderbook = new WebSocket(orderbookUrl);
    
    this.wsOrderbook.on('message', (data: string) => this.handleOrderbookMessage(data));
    this.wsOrderbook.on('error', (err: Error) => 
      this.log('ERROR', 'Orderbook websocket error', err.message)
    );
    this.wsOrderbook.on('close', () => {
      this.log('WS', 'Orderbook connection closed, reconnecting...');
      setTimeout(() => this.setupWebSockets(), 1000);
    });

    // Private WebSocket
    this.kumaClient.getWsToken().then(token => {
      this.wsPrivate = new WebSocket(this.kumaClient.getWebSocketUrl());
      this.wsPrivate.on('open', () => {
        this.wsPrivate!.send(JSON.stringify({
          method: 'subscribe',
          token,
          subscriptions: ['orders']
        }));
      });
      this.wsPrivate.on('message', (data: string) => this.handlePrivateMessage(data));
      this.wsPrivate.on('error', (err: Error) => 
        this.log('ERROR', 'Private websocket error', err.message)
      );
      this.wsPrivate.on('close', () => {
        this.log('WS', 'Private connection closed, reconnecting...');
        setTimeout(() => this.setupWebSockets(), 1000);
      });
    });
  }

  // Dashboard
  protected broadcastStats(): void {
    if (!this.dashboardWss) return;

    const stats: DashboardStats = {
      uptime: Math.floor((Date.now() - this.state.startTime) / 1000),
      totalPnL: this.state.totalPnL.toFixed(2),
      totalVolume: this.state.totalVolume.toFixed(2),
      lastPrice: this.state.lastPrice,
      positionQty: this.state.positionQty,
      gridLevel: this.state.gridLevel,
      activeOrders: Array.from(this.state.activeOrders.entries()).map(([id, order]) => ({
        id,
        side: order.side,
        price: order.price,
        quantity: order.quantity
      })),
      recentTrades: this.state.trades.slice(-10)
    };

    this.dashboardWss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(stats));
      }
    });
  }

  // Lifecycle methods
  public async start(): Promise<void> {
    this.log('BOT', `Starting ${this.config.symbol} Grid Bot...`);
    
    await this.tradeHistory.load();
    
    // Load previous stats
    this.state.totalPnL = await this.tradeHistory.getTotalPnL();
    this.state.totalVolume = await this.tradeHistory.getTotalVolume();
    this.state.trades = await this.tradeHistory.getRecentTrades();
    
    this.setupWebSockets();
    
    // Start broadcasting stats
    setInterval(() => this.broadcastStats(), 1000);
  }

  public async stop(): Promise<void> {
    this.log('BOT', 'Stopping bot...');
    
    // Close all positions
    if (this.state.positionQty !== 0) {
      await this.placeClosingOrder();
    }
    
    // Cancel all orders
    for (const [orderId] of this.state.activeOrders) {
      await this.cancelOrder(orderId);
    }
    
    // Close WebSocket connections
    if (this.wsOrderbook) {
      this.wsOrderbook.close();
    }
    if (this.wsPrivate) {
      this.wsPrivate.close();
    }
    
    this.log('BOT', 'Bot stopped');
  }

  // API Methods
  public getStatus(): 'running' | 'stopped' | 'error' {
    if (this.wsOrderbook && this.wsOrderbook.readyState === WebSocket.OPEN) {
      return 'running';
    }
    return 'stopped';
  }

  public getState(): BotState {
    return {
      ...this.state,
      position: {
        quantity: this.state.positionQty,
        cost: this.state.positionCost,
        avgPrice: this.state.positionQty !== 0 ? 
          this.state.positionCost / Math.abs(this.state.positionQty) : 0
      },
      stats: {
        totalTrades: this.state.trades.length,
        winningTrades: this.state.trades.filter(t => t.pnl && t.pnl > 0).length,
        totalVolume: this.state.totalVolume,
        totalPnL: this.state.totalPnL,
        fees: {
          total: this.state.trades.reduce((sum, t) => sum + (t.fee || 0), 0),
          maker: this.state.trades.filter(t => !t.isTaker).reduce((sum, t) => sum + (t.fee || 0), 0),
          taker: this.state.trades.filter(t => t.isTaker).reduce((sum, t) => sum + (t.fee || 0), 0)
        }
      }
    };
  }

  public getUptime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }

  public getConfig(): BotConfig {
    return { ...this.config };
  }

  public getTrades(): Trade[] {
    return [...this.state.trades];
  }

  public updateConfig(newConfig: BotConfig): void {
    this.config = { ...newConfig };
    this.log('CONFIG', 'Bot configuration updated', this.config);
  }

  public reset(): void {
    // Reset state while preserving connection info
    const startTime = this.state.startTime;
    this.state = {
      positionQty: 0,
      positionCost: 0,
      gridLevel: 0,
      isLongPosition: true,
      activeOrders: new Map(),
      filledOrders: new Map(),
      initialBuyOrderId: null,
      initialSellOrderId: null,
      closingOrderId: null,
      isProcessing: false,
      isResetting: false,
      lastOrderTime: 0,
      startTime: startTime,
      totalPnL: 0,
      totalVolume: 0,
      lastPrice: 0,
      trades: [],
      position: {
        quantity: 0,
        cost: 0,
        avgPrice: 0
      },
      stats: {
        totalTrades: 0,
        winningTrades: 0,
        totalVolume: 0,
        totalPnL: 0,
        fees: {
          total: 0,
          maker: 0,
          taker: 0
        }
      }
    };
    
    // Clear trade history
    this.tradeHistory = new TradeHistory(this.config.symbol);
    
    this.log('RESET', 'Bot state and history reset');
  }
} 