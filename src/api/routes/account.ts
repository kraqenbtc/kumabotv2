import { Router, Request, Response, NextFunction } from 'express';
import { KumaClient } from '../../services/KumaClient';
import { getConfigBySymbol, validateConfig } from '../../config';
import { createApiError } from '../middleware/errorHandler';

export default function accountRoutes(): Router {
  const router = Router();

  // Get account information for a specific symbol
  router.get('/:symbol', async (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    
    try {
      // Get config for the symbol
      const config = getConfigBySymbol(symbol as any);
      validateConfig(config);
      
      // Create KumaClient instance
      const kumaClient = new KumaClient({
        sandbox: config.sandbox,
        walletPrivateKey: config.walletPrivateKey,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        wsUrl: config.wsUrl,
        walletAddress: config.walletAddress
      });
      
      // Get wallet information
      const wallets = await kumaClient.getWallets();
      
      if (!wallets || wallets.length === 0) {
        return next(createApiError('No wallet information found', 404));
      }
      
      const wallet = wallets[0];
      
      // Get positions for this symbol
      const positions = wallet.positions?.filter(p => p.market === symbol) || [];
      
      res.json({
        symbol,
        account: {
          address: wallet.wallet,
          equity: parseFloat(wallet.equity),
          freeCollateral: parseFloat(wallet.freeCollateral),
          availableCollateral: parseFloat(wallet.availableCollateral),
          buyingPower: parseFloat(wallet.buyingPower),
          leverage: parseFloat(wallet.leverage),
          marginRatio: parseFloat(wallet.marginRatio),
          quoteBalance: parseFloat(wallet.quoteBalance),
          unrealizedPnL: parseFloat(wallet.unrealizedPnL),
          makerFeeRate: parseFloat(wallet.makerFeeRate),
          takerFeeRate: parseFloat(wallet.takerFeeRate),
          positions: positions.map(p => ({
            market: p.market,
            quantity: parseFloat(p.quantity),
            entryPrice: parseFloat(p.entryPrice),
            markPrice: parseFloat(p.markPrice),
            unrealizedPnL: parseFloat(p.unrealizedPnL),
            marginRequirement: parseFloat(p.marginRequirement),
            leverage: parseFloat(p.leverage)
          }))
        }
      });
    } catch (error: any) {
      next(createApiError(`Failed to get account info: ${error.message}`, 500));
    }
  });

  // Get aggregated account information
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BERA-USD', 'XRP-USD'];
      const accounts: Array<{
        symbol: string;
        equity: number;
        unrealizedPnL: number;
        positions: number;
      }> = [];
      let totalEquity = 0;
      let totalUnrealizedPnL = 0;
      let totalPositions = 0;
      
      // Get wallet info once (since all symbols use the same wallet)
      let walletInfo: any = null;
      
      for (const symbol of symbols) {
        try {
          const config = getConfigBySymbol(symbol as any);
          validateConfig(config);
          
          // Only fetch wallet info once since all symbols use the same credentials
          if (!walletInfo) {
            const kumaClient = new KumaClient({
              sandbox: config.sandbox,
              walletPrivateKey: config.walletPrivateKey,
              apiKey: config.apiKey,
              apiSecret: config.apiSecret,
              wsUrl: config.wsUrl,
              walletAddress: config.walletAddress
            });
            
            const wallets = await kumaClient.getWallets();
            if (wallets && wallets.length > 0) {
              walletInfo = wallets[0];
            }
          }
          
          if (walletInfo) {
            // Filter positions for this specific symbol
            const symbolPositions = walletInfo.positions?.filter((p: any) => p.market === symbol) || [];
            const symbolUnrealizedPnL = symbolPositions.reduce((sum: number, p: any) => sum + parseFloat(p.unrealizedPnL), 0);
            
            accounts.push({
              symbol,
              equity: parseFloat(walletInfo.equity), // This is total equity, not per-symbol
              unrealizedPnL: symbolUnrealizedPnL,
              positions: symbolPositions.length
            });
            
            // Only add to totals once (for the first symbol)
            if (symbol === symbols[0]) {
              totalEquity = parseFloat(walletInfo.equity);
              totalUnrealizedPnL = parseFloat(walletInfo.unrealizedPnL);
            }
            totalPositions += symbolPositions.length;
          }
        } catch (err) {
          // Skip if account not configured
          console.log(`Skipping ${symbol}: not configured`);
        }
      }
      
      res.json({
        total: {
          equity: totalEquity,
          unrealizedPnL: totalUnrealizedPnL,
          positions: totalPositions
        },
        accounts
      });
    } catch (error: any) {
      next(createApiError(`Failed to get aggregated account info: ${error.message}`, 500));
    }
  });

  return router;
} 