import { Router, Request, Response } from 'express';
import { BotManager } from '../../services/BotManager';
import { getConfigBySymbol } from '../../config';
import { KumaClient } from '../../services/KumaClient';

// Extend Request type to include user wallet
interface AuthRequest extends Request {
  walletAddress?: string;
}

export default function accountRoutes(botManager: BotManager): Router {
  const router = Router();

  // Middleware to extract wallet address from headers
  const extractWallet = (req: AuthRequest, res: Response, next: any) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (!walletAddress) {
      res.status(401).json({ error: 'Wallet address required' });
      return;
    }
    req.walletAddress = walletAddress;
    next();
  };

  // Apply wallet middleware to all routes
  router.use(extractWallet);

  // Get aggregated account information for the user
  router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const botsMap = botManager.getAllBots();
      
      // Filter bots by user's wallet address
      const userBots = Array.from(botsMap.entries())
        .filter(([botId, bot]) => bot.getWalletAddress() === req.walletAddress);
      
      if (userBots.length === 0) {
        // Return empty stats if user has no bots
            res.json({
              wallet: {
            address: req.walletAddress,
                equity: 0,
                freeCollateral: 0,
                buyingPower: 0,
                leverage: 0,
                unrealizedPnL: 0
              },
              totalEquity: 0,
              totalPnL: 0,
              totalVolume: 0
            });
            return;
          }
          
      // Get the first user bot to access KumaClient
      const [firstBotId, firstBot] = userBots[0];
      const kumaClient = (firstBot as any).kumaClient;
      
      // Get wallet info from Kuma API
      const walletInfo = await kumaClient.getWallets();
      
      if (!walletInfo || walletInfo.length === 0) {
        res.json({
          wallet: {
            address: req.walletAddress,
            equity: 0,
            freeCollateral: 0,
            buyingPower: 0,
            leverage: 0,
            unrealizedPnL: 0
          },
          totalEquity: 0,
          totalPnL: 0,
          totalVolume: 0
        });
        return;
      }

      // Use the first wallet (primary wallet)
      const primaryWallet = walletInfo[0];
      
      // Calculate 24h volume and PnL from user's bot trades
      const now = Date.now();
      const dayAgo = now - (24 * 60 * 60 * 1000);
      
      let totalVolume24h = 0;
      let totalPnL24h = 0;
      
      for (const [botId, bot] of userBots) {
        const state = bot.getState();
        if (state.trades) {
          for (const trade of state.trades) {
            if (trade.timestamp >= dayAgo) {
              totalVolume24h += trade.price * trade.quantity;
              if (trade.pnl) {
                totalPnL24h += trade.pnl;
              }
            }
          }
        }
      }

      // Get historical PnL for 24h comparison
      try {
        const historicalPnL = await kumaClient.getHistoricalPnL(
          primaryWallet.wallet,
          Math.floor(dayAgo / 1000), // Convert to seconds
          Math.floor(now / 1000),    // Convert to seconds
          24
        );
        
        if (historicalPnL && historicalPnL.length >= 2) {
          // Calculate 24h PnL from historical data
          const oldestPoint = historicalPnL[historicalPnL.length - 1];
          const newestPoint = historicalPnL[0];
          totalPnL24h = parseFloat(newestPoint.totalPnL) - parseFloat(oldestPoint.totalPnL);
        }
      } catch (error) {
        console.error('Error fetching historical PnL:', error);
        // Use bot-calculated PnL as fallback
      }

      res.json({
        wallet: {
          address: primaryWallet.wallet,
          equity: parseFloat(primaryWallet.equity),
          freeCollateral: parseFloat(primaryWallet.freeCollateral),
          heldCollateral: parseFloat(primaryWallet.heldCollateral || '0'),
          availableCollateral: parseFloat(primaryWallet.availableCollateral || '0'),
          buyingPower: parseFloat(primaryWallet.buyingPower),
          leverage: parseFloat(primaryWallet.leverage),
          marginRatio: parseFloat(primaryWallet.marginRatio || '0'),
          quoteBalance: parseFloat(primaryWallet.quoteBalance || '0'),
          unrealizedPnL: parseFloat(primaryWallet.unrealizedPnL),
          makerFeeRate: parseFloat(primaryWallet.makerFeeRate || '0'),
          takerFeeRate: parseFloat(primaryWallet.takerFeeRate || '0')
        },
        totalEquity: parseFloat(primaryWallet.equity),
        totalPnL: totalPnL24h,
        totalVolume: totalVolume24h,
        positions: primaryWallet.positions || []
      });
    } catch (error) {
      console.error('Error fetching account info:', error);
      res.status(500).json({ error: 'Failed to fetch account information' });
    }
  });

  // Get account info for specific symbol
  router.get('/:symbol', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { symbol } = req.params;
      const botsMap = botManager.getAllBots();
      
      // Filter bots by user's wallet address
      const userBots = Array.from(botsMap.entries())
        .filter(([botId, bot]) => bot.getWalletAddress() === req.walletAddress);
      
      if (userBots.length === 0) {
          res.json({
            symbol,
            position: null,
            balance: 0
          });
          return;
        }
        
      // Get the first user bot to access KumaClient
      const [firstBotId, firstBot] = userBots[0];
      const kumaClient = (firstBot as any).kumaClient;
      
      // Get wallet info
      const walletInfo = await kumaClient.getWallets();
      if (!walletInfo || walletInfo.length === 0) {
        res.json({
          symbol,
          position: null,
          balance: 0
        });
        return;
      }

      const primaryWallet = walletInfo[0];
      
      // Find position for the symbol
      const position = primaryWallet.positions?.find((pos: any) => pos.market === symbol) || null;
      
      res.json({
        symbol,
        position: position ? {
          quantity: parseFloat(position.quantity),
          entryPrice: parseFloat(position.entryPrice),
          markPrice: parseFloat(position.markPrice),
          unrealizedPnL: parseFloat(position.unrealizedPnL),
          realizedPnL: parseFloat(position.realizedPnL),
          value: parseFloat(position.value),
          leverage: parseFloat(position.leverage)
        } : null,
        balance: parseFloat(primaryWallet.quoteBalance || '0')
      });
    } catch (error) {
      console.error('Error fetching account info for symbol:', error);
      res.status(500).json({ error: 'Failed to fetch account information' });
    }
  });

  return router;
} 