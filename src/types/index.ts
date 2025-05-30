// Grid Bot Types
export interface SymbolConfig {
  symbol: string;
  priceDecimals: number;
  quantityDecimals: number;
  minQuantity: number;
  minPrice: number;
}

export const SYMBOL_CONFIGS: Record<string, SymbolConfig> = {
  'BTC-USD': {
    symbol: 'BTC-USD',
    priceDecimals: 0,  // Tam sayı
    quantityDecimals: 8,
    minQuantity: 0.00001,
    minPrice: 1
  },
  'ETH-USD': {
    symbol: 'ETH-USD',
    priceDecimals: 1,  // 1 ondalık
    quantityDecimals: 8,
    minQuantity: 0.0001,
    minPrice: 0.1
  },
  'SOL-USD': {
    symbol: 'SOL-USD',
    priceDecimals: 2,  // 2 ondalık
    quantityDecimals: 8,
    minQuantity: 0.01,
    minPrice: 0.01
  },
  'BERA-USD': {
    symbol: 'BERA-USD',
    priceDecimals: 3,  // 3 ondalık
    quantityDecimals: 8,
    minQuantity: 0.1,
    minPrice: 0.001
  },
  'XRP-USD': {
    symbol: 'XRP-USD',
    priceDecimals: 4,  // 4 ondalık
    quantityDecimals: 8,
    minQuantity: 1,
    minPrice: 0.0001
  }
};

export interface BotConfig {
  botId?: string;
  userId?: string;
  symbol: keyof typeof SYMBOL_CONFIGS;
  initialQuantity: number;
  baseIncrement: number;
  incrementStep: number;
  initialSpread: number;
  spreadIncrement: number;
  closingSpread: number;
  maxPosition: number;
  stopLoss?: number;
  takeProfit?: number;
  maxGridLevel?: number;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BotState {
  botId: string;
  symbol: string;
  walletAddress: string;
  status: 'stopped' | 'running' | 'error';
  position: {
    quantity: number;
    cost: number;
    averagePrice: number;
  };
  gridLevel: number;
  activeOrders: Map<string, OrderInfo>;
  lastPrice: number;
  lastUpdateTime: number;
  lastOrderTime: number;
  
  // Order tracking
  initialBuyOrderId: string | null;
  initialSellOrderId: string | null;
  closingOrderId: string | null;
  filledOrders: Map<string, OrderInfo>;
  
  // Control flags
  isProcessing: boolean;
  isLongPosition: boolean;
  
  // Additional tracking
  totalPnL: number;
  totalVolume: number;
  trades: Trade[];
  startTime: number;
  
  stats: {
    totalTrades: number;
    winningTrades: number;
    totalVolume: number;
    totalPnL: number;
    fees: {
      maker: number;
      taker: number;
      total: number;
    };
  };
  error?: string;
}

export interface OrderInfo {
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  type: 'initial' | 'grid' | 'closing';
  time: number;
  fillPrice?: number;
}

export interface Trade {
  id: string;
  botId: string;
  symbol: string;
  walletAddress: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  cost: number;
  fee: number;
  feeRate: number;
  pnl: number | null;  // Can be null for non-closing trades
  timestamp: number;
  orderId: string;
  fillId?: string;
  gridLevel: number;
  isTaker: boolean;
  position: {
    before: number;
    after: number;
  };
  totalPnL?: number;  // Running total P&L at time of trade
}

export interface DashboardStats {
  uptime: number;
  totalPnL: string;
  totalVolume: string;
  lastPrice: number;
  positionQty: number;
  gridLevel: number;
  activeOrders: Array<{
    id: string;
    side: string;
    price: number;
    quantity: number;
  }>;
  recentTrades: Trade[];
}

// API Response Types
export interface OrderResponse {
  orderId: string;
  status: string;
  message?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface OrderbookData {
  lp: string; // last price
  mp: string; // mid price
  ip: string; // index price
}

export interface OrderFillData {
  i: string; // order id
  s: 'buy' | 'sell'; // side
  p: string; // price
  q: string; // quantity
  x: string; // execution type
  X: string; // order status
  lq: string; // liquidity flag (0 = taker, 1 = maker)
} 