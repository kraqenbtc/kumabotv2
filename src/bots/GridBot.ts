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
  private config: BotConfig;
  private kumaConfig: Config;
  private kumaClient: KumaClient;
  private wsClient?: WebSocket;
  private state: BotState;
  private dashboardWss?: WebSocketServer;
  private status: 'stopped' | 'running' | 'error' = 'stopped';
  private startTime?: number;
  private stopTime?: number;
  private botId: string;
  protected tradeHistory: TradeHistory;
  protected wsOrderbook: WebSocket | null = null;
  protected wsPrivate: WebSocket | null = null;
  private isStopping: boolean = false;
  private userConfig?: { apiKey: string; apiSecret: string; walletAddress: string; walletPrivateKey?: string };

  // Constants
  protected readonly MIN_ORDER_INTERVAL = 500; // ms
  protected readonly MAKER_FEE = -0.00005; // -0.005%
  protected readonly TAKER_FEE = 0.000225; // 0.0225%

  constructor(
    config: BotConfig,
    kumaConfig: Config,
    dashboardWss?: WebSocketServer,
    userConfig?: { apiKey: string; apiSecret: string; walletAddress: string; walletPrivateKey?: string }
  ) {
    this.config = config;
    this.kumaConfig = kumaConfig;
    this.dashboardWss = dashboardWss;
    this.userConfig = userConfig;
    
    // Generate bot ID if not provided
    this.botId = config.botId || `${config.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize Kuma client with user config if provided
    const clientConfig = {
      sandbox: kumaConfig.sandbox,
      walletPrivateKey: userConfig?.walletPrivateKey || kumaConfig.walletPrivateKey || undefined,
      apiKey: userConfig?.apiKey || kumaConfig.apiKey,
      apiSecret: userConfig?.apiSecret || kumaConfig.apiSecret,
      wsUrl: kumaConfig.wsUrl,
      walletAddress: userConfig?.walletAddress || kumaConfig.walletAddress
    };

    this.kumaClient = new KumaClient(clientConfig);

    this.tradeHistory = new TradeHistory(config.symbol);
    
    // Initialize state
    this.state = this.initializeState();
  }

  private initializeState(): BotState {
    return {
      botId: this.botId,
      symbol: this.config.symbol,
      walletAddress: this.userConfig?.walletAddress || this.kumaConfig.walletAddress,
      status: 'stopped',
      position: {
        quantity: 0,
        cost: 0,
        averagePrice: 0
      },
      gridLevel: 0,
      activeOrders: new Map(),
      lastPrice: 0,
      lastUpdateTime: Date.now(),
      lastOrderTime: 0,
      
      // Order tracking
      initialBuyOrderId: null,
      initialSellOrderId: null,
      closingOrderId: null,
      filledOrders: new Map(),
      
      // Control flags
      isProcessing: false,
      isLongPosition: true,
      
      // Additional tracking
      totalPnL: 0,
      totalVolume: 0,
      trades: [],
      startTime: Date.now(),
      
      stats: {
        totalTrades: 0,
        winningTrades: 0,
        totalVolume: 0,
        totalPnL: 0,
        fees: {
          maker: 0,
          taker: 0,
          total: 0
        }
      }
    };
  }

  public getBotId(): string {
    return this.botId;
  }

  public getWalletAddress(): string {
    return this.userConfig?.walletAddress || this.kumaConfig.walletAddress;
  }

  // Symbol-specific price formatting
  protected formatPrice(price: number): string {
    // Kuma API requires all prices to have exactly 8 decimal places
    const symbolConfig = SYMBOL_CONFIGS[this.config.symbol];
    
    if (!symbolConfig) {
      throw new Error(`Symbol config not found for ${this.config.symbol}`);
    }
    
    // For BTC-USD (priceDecimals: 0), round to nearest integer
    // For other symbols, round to their decimal precision
    const roundedPrice = Math.round(price * Math.pow(10, symbolConfig.priceDecimals)) / Math.pow(10, symbolConfig.priceDecimals);
    
    // Always format with 8 decimal places for Kuma API
    return roundedPrice.toFixed(8);
  }

  // Calculate spread based on grid level
  protected calculateSpread(level: number): number {
    return this.config.initialSpread + (level * this.config.spreadIncrement);
  }

  // Format quantity based on symbol
  protected formatQuantity(quantity: number): string {
    // Kuma API requires all quantities to have exactly 8 decimal places
    // First round to the symbol's decimal precision
    const symbolConfig = SYMBOL_CONFIGS[this.config.symbol];
    const decimals = symbolConfig?.quantityDecimals || 8;
    const roundedQuantity = Math.round(quantity * Math.pow(10, decimals)) / Math.pow(10, decimals);
    
    // Then format with 8 decimal places
    return roundedQuantity.toFixed(8);
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
  private updatePosition(side: 'buy' | 'sell', quantity: number, price: number): void {
    if (side === 'buy') {
      this.state.position.cost += quantity * price;
      this.state.position.quantity += quantity;
    } else {
      this.state.position.cost -= quantity * price;
      this.state.position.quantity -= quantity;
    }

    // Update average price
    if (this.state.position.quantity !== 0) {
      this.state.position.averagePrice = this.state.position.cost / this.state.position.quantity;
    } else {
      this.state.position.averagePrice = 0;
      this.state.position.cost = 0;
    }
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
      buyPrice: buyPrice.toFixed(2),
      sellPrice: sellPrice.toFixed(2),
      formattedBuyPrice: this.formatPrice(buyPrice),
      formattedSellPrice: this.formatPrice(sellPrice),
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

    if (Math.abs(this.state.position.quantity) + quantity > this.config.maxPosition) {
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
    if (this.state.position.quantity === 0) return;

    const avgPrice = this.state.position.cost / Math.abs(this.state.position.quantity);
    const side = this.state.position.quantity > 0 ? 'sell' : 'buy';
    const price = avgPrice + (side === 'sell' ? 
      this.config.closingSpread : -this.config.closingSpread);

    if (this.state.closingOrderId) {
      await this.cancelOrder(this.state.closingOrderId);
    }

    this.state.closingOrderId = await this.placeOrder(
      side,
      Math.abs(this.state.position.quantity),
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
        const isClosing = (side === 'sell' && this.state.position.quantity > 0) || 
                         (side === 'buy' && this.state.position.quantity < 0);
        
        if (isClosing) {
          const avgEntryPrice = this.state.position.cost / Math.abs(this.state.position.quantity);
          tradePnL = side === 'sell' ? 
            (price - avgEntryPrice) * quantity :
            (avgEntryPrice - price) * quantity;
          this.state.totalPnL += tradePnL;
        }

        // Update position first to get accurate before/after values
        const positionBefore = this.state.position.quantity;
        this.updatePosition(side, quantity, price);
        const positionAfter = this.state.position.quantity;
        
        this.state.lastPrice = price;
        this.state.totalVolume += quantity * price;
        
        // Create trade record
        const trade: Trade = {
          id: `${this.botId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          botId: this.botId,
          symbol: this.config.symbol,
          walletAddress: this.getWalletAddress(),
          side,
          price,
          quantity,
          cost: price * quantity,
          fee: isTaker ? -Math.abs(fee) : Math.abs(fee),
          feeRate: isTaker ? this.TAKER_FEE : this.MAKER_FEE,
          pnl: isClosing ? tradePnL : null,
          timestamp: Date.now(),
          orderId,
          gridLevel: this.state.gridLevel,
          isTaker,
          position: {
            before: positionBefore,
            after: positionAfter
          },
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
      position: {
        quantity: 0,
        cost: 0,
        averagePrice: 0
      },
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
      if (!this.isStopping) {
        this.log('WS', 'Orderbook connection closed, reconnecting...');
        setTimeout(() => this.setupWebSockets(), 1000);
      }
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
        if (!this.isStopping) {
          this.log('WS', 'Private connection closed, reconnecting...');
          setTimeout(() => this.setupWebSockets(), 1000);
        }
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
      positionQty: this.state.position.quantity,
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
    
    this.isStopping = false;
    this.status = 'running';
    
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
    
    this.isStopping = true;
    this.status = 'stopped';
    
    // Close all positions
    if (this.state.position.quantity !== 0) {
      await this.placeClosingOrder();
    }
    
    // Cancel all orders
    for (const [orderId] of this.state.activeOrders) {
      await this.cancelOrder(orderId);
    }
    
    // Close WebSocket connections
    if (this.wsOrderbook) {
      this.wsOrderbook.close();
      this.wsOrderbook = null;
    }
    if (this.wsPrivate) {
      this.wsPrivate.close();
      this.wsPrivate = null;
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
        quantity: this.state.position.quantity,
        cost: this.state.position.cost,
        averagePrice: this.state.position.quantity !== 0 ? 
          this.state.position.cost / Math.abs(this.state.position.quantity) : 0
      },
      stats: {
        totalTrades: this.state.trades.length,
        winningTrades: this.state.trades.filter(t => t.pnl !== null && t.pnl > 0).length,
        totalVolume: this.state.totalVolume,
        totalPnL: this.state.totalPnL,
        fees: {
          total: this.state.trades.reduce((sum, t) => sum + Math.abs(t.fee), 0),
          maker: this.state.trades.filter(t => !t.isTaker).reduce((sum, t) => sum + Math.abs(t.fee), 0),
          taker: this.state.trades.filter(t => t.isTaker).reduce((sum, t) => sum + Math.abs(t.fee), 0)
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
    const botId = this.state.botId;
    const symbol = this.state.symbol;
    const walletAddress = this.state.walletAddress;
    
    this.state = {
      ...this.initializeState(),
      startTime,
      botId,
      symbol,
      walletAddress
    };
    
    // Clear trade history
    this.tradeHistory = new TradeHistory(this.config.symbol);
    
    this.log('RESET', 'Bot state and history reset');
  }
} 