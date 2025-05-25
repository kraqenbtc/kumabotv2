import { Router, Request, Response, NextFunction } from 'express';
import { KumaClient } from '../../services/KumaClient';
import { getConfigBySymbol, validateConfig, Config } from '../../config';
import { createApiError } from '../middleware/errorHandler';
import { BotManager } from '../../services/BotManager';

export default function accountRoutes(botManager: BotManager): Router {
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
      // Get default config to fetch wallet info
      const config = getConfigBySymbol('BTC-USD' as any);
      validateConfig(config);
      
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
        res.json({
          balances: [],
          totalUSDValue: 0,
          activeBots: 0,
          totalTrades: 0,
          volume24h: 0,
          pnl24h: 0
        });
        return;
      }
      
      const wallet = wallets[0] as any; // Type the wallet as any since SDK doesn't export types
      
      // Extract balances
      const balances: Array<{
        asset: string;
        free: string;
        locked: string;
        total: string;
      }> = [];
      const assetTypes = ['BTC', 'ETH', 'SOL', 'BERA', 'XRP', 'USD'];
      
      for (const asset of assetTypes) {
        const freeValue = wallet[`free${asset}`] || '0';
        const lockedValue = wallet[`locked${asset}`] || '0';
        const totalValue = (parseFloat(freeValue) + parseFloat(lockedValue)).toString();
        
        if (parseFloat(totalValue) > 0) {
          balances.push({
            asset,
            free: freeValue,
            locked: lockedValue,
            total: totalValue
          });
        }
      }
      
      // Calculate stats from bots
      const allBots = botManager.getAllBots();
      let activeBots = 0;
      let totalTrades = 0;
      let volume24h = 0;
      let pnl24h = 0;
      
      for (const [botId, bot] of allBots) {
        if (bot.getStatus() === 'running') {
          activeBots++;
        }
        
        const state = bot.getState();
        totalTrades += state.stats.totalTrades;
        
        // Calculate 24h stats from recent trades
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentTrades = state.trades.filter(t => t.timestamp > oneDayAgo);
        
        for (const trade of recentTrades) {
          volume24h += trade.cost;
          if (trade.pnl !== null) {
            pnl24h += trade.pnl;
          }
        }
      }
      
      // Calculate total USD value (simplified - you might want to add price feeds)
      const totalUSDValue = parseFloat(wallet.equity || '0');
      
      res.json({
        balances,
        totalUSDValue,
        activeBots,
        totalTrades,
        volume24h,
        pnl24h,
        wallet: {
          address: wallet.wallet,
          equity: parseFloat(wallet.equity || '0'),
          freeCollateral: parseFloat(wallet.freeCollateral || '0'),
          availableCollateral: parseFloat(wallet.availableCollateral || '0'),
          buyingPower: parseFloat(wallet.buyingPower || '0'),
          leverage: parseFloat(wallet.leverage || '0'),
          marginRatio: parseFloat(wallet.marginRatio || '0'),
          unrealizedPnL: parseFloat(wallet.unrealizedPnL || '0')
        }
      });
    } catch (error: any) {
      next(createApiError(`Failed to get aggregated account info: ${error.message}`, 500));
    }
  });

  return router;
} 