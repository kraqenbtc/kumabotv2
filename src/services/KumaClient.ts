import * as kuma from '@kumabid/kuma-sdk';
import { v1 as uuid } from 'uuid';
import { OrderResponse } from '../types';

export class KumaClient {
  private publicClient: kuma.RestPublicClient;
  private authenticatedClient: kuma.RestAuthenticatedClient;
  private wsUrl: string;
  private walletAddress: string;

  constructor(config: {
    sandbox: boolean;
    walletPrivateKey?: string; // Make optional - only needed for wallet signature auth
    apiKey: string;
    apiSecret: string;
    wsUrl: string;
    walletAddress: string;
  }) {
    this.publicClient = new kuma.RestPublicClient({
      sandbox: config.sandbox
    });

    // If walletPrivateKey is provided, use it (for backward compatibility)
    // Otherwise, rely on API key/secret authentication only
    const authConfig: any = {
      sandbox: config.sandbox,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret
    };

    // Only add walletPrivateKey if provided
    if (config.walletPrivateKey) {
      authConfig.walletPrivateKey = config.walletPrivateKey;
    }

    this.authenticatedClient = new kuma.RestAuthenticatedClient(authConfig);

    this.wsUrl = config.wsUrl;
    this.walletAddress = config.walletAddress;
  }

  // Public Methods
  async getMarkets() {
    return await this.publicClient.getMarkets();
  }

  async getOrderbook(market: string) {
    return await this.publicClient.getOrderBookLevel2({ market });
  }

  // Authenticated Methods
  async getWallets() {
    return await this.authenticatedClient.getWallets({
      nonce: uuid()
    });
  }

  async createOrder(params: {
    market: string;
    type: 'limit' | 'market';
    side: 'buy' | 'sell';
    quantity: string;
    price?: string;
  }): Promise<OrderResponse> {
    try {
      const orderType = params.type === 'limit' ? kuma.OrderType.limit : kuma.OrderType.market;
      const orderSide = params.side === 'buy' ? kuma.OrderSide.buy : kuma.OrderSide.sell;
      
      const orderParams: any = {
        type: orderType,
        side: orderSide,
        market: params.market,
        quantity: params.quantity,
        nonce: uuid(),
        wallet: this.walletAddress,
        ...(params.price && orderType === kuma.OrderType.limit && { price: params.price })
      };

      const response = await this.authenticatedClient.createOrder(orderParams);
      
      return {
        orderId: response.orderId,
        status: 'success'
      };
    } catch (error: any) {
      throw {
        code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
        message: error.response?.data?.message || error.message || 'Order creation failed'
      };
    }
  }

  async cancelOrders(params: {
    orderIds: string[];
  }) {
    await this.authenticatedClient.cancelOrders({
      orderIds: params.orderIds,
      nonce: uuid(),
      wallet: this.walletAddress
    });
  }

  async getOrders(params?: { market?: string; wallet?: string }) {
    return await this.authenticatedClient.getOrders({
      wallet: params?.wallet || this.walletAddress,
      ...(params?.market && { market: params.market }),
      nonce: uuid()
    });
  }

  async getHistoricalPnL(wallet: string, start: number, end: number, limit: number = 50) {
    try {
      return await this.authenticatedClient.getHistoricalPnL({
        wallet,
        start,
        end,
        limit,
        nonce: uuid()
      });
    } catch (error) {
      console.error('Error fetching historical PnL:', error);
      return [];
    }
  }

  async getWsToken(): Promise<string> {
    // Kuma SDK doesn't expose WebSocket token directly
    // We'll need to handle authentication differently
    // For now, return empty string and handle auth in WebSocket connection
    return '';
  }

  // Helper Methods
  getWebSocketUrl(): string {
    return this.wsUrl;
  }

  getWalletAddress(): string {
    return this.walletAddress;
  }
} 