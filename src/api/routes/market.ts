import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getConfigBySymbol } from '../../config';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 5000; // 5 seconds

export default function marketRoutes(): Router {
  const router = Router();

  // Get market tickers for all symbols
  router.get('/tickers', async (req: Request, res: Response): Promise<void> => {
    try {
      // Check cache first
      const cacheKey = 'market-tickers';
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.json(cached.data);
        return;
      }

      // Get config to determine sandbox mode
      const config = getConfigBySymbol('BTC-USD');
      const baseUrl = config.sandbox 
        ? 'https://api.sandbox.kuma.bid'
        : 'https://api.kuma.bid';

      // First, get all markets data
      const marketsResponse = await axios.get(`${baseUrl}/v1/markets`, {
        timeout: 5000 // 5 second timeout
      });
      const markets = marketsResponse.data;

      // Filter for our symbols and format the data
      const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BERA-USD', 'XRP-USD'];
      const tickerData: Record<string, any> = {};

      for (const market of markets) {
        if (symbols.includes(market.market)) {
          // Calculate price change
          const currentPrice = parseFloat(market.indexPrice);
          const price24hAgo = parseFloat(market.indexPrice24h);
          const priceChange = currentPrice - price24hAgo;
          const priceChangePercent = price24hAgo > 0 ? ((priceChange / price24hAgo) * 100).toFixed(2) : '0.00';

          tickerData[market.market] = {
            symbol: market.market,
            lastPrice: market.indexPrice,
            priceChange24h: priceChange.toFixed(8),
            priceChangePercent24h: priceChangePercent,
            volume24h: market.volume24h,
            high24h: '0', // Not provided by API
            low24h: '0', // Not provided by API
            indexPrice: market.indexPrice,
            openInterest: market.openInterest,
            fundingRate: market.currentFundingRate,
            nextFundingTime: market.nextFundingTime,
            trades24h: market.trades24h
          };
        }
      }

      // If any symbols are missing, add default values
      for (const symbol of symbols) {
        if (!tickerData[symbol]) {
          tickerData[symbol] = {
            symbol,
            lastPrice: '0',
            priceChange24h: '0',
            priceChangePercent24h: '0',
            volume24h: '0',
            high24h: '0',
            low24h: '0'
          };
        }
      }

      // Cache the result
      cache.set(cacheKey, {
        data: tickerData,
        timestamp: Date.now()
      });

      res.json(tickerData);
    } catch (error: any) {
      console.error('Error fetching market tickers:', error.response?.data || error.message);
      
      // Return cached data if available, even if expired
      const cached = cache.get('market-tickers');
      if (cached) {
        res.json(cached.data);
        return;
      }
      
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });

  // Get ticker for specific symbol
  router.get('/ticker/:symbol', async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.params;
      
      // Get config to determine sandbox mode
      const config = getConfigBySymbol(symbol as any);
      const baseUrl = config.sandbox 
        ? 'https://api.sandbox.kuma.bid'
        : 'https://api.kuma.bid';

      // Get market data
      const response = await axios.get(`${baseUrl}/v1/markets`, {
        params: { market: symbol }
      });

      const marketData = response.data.find((m: any) => m.market === symbol);
      
      if (!marketData) {
        res.status(404).json({ error: 'Market not found' });
        return;
      }

      // Calculate price change
      const currentPrice = parseFloat(marketData.indexPrice);
      const price24hAgo = parseFloat(marketData.indexPrice24h);
      const priceChange = currentPrice - price24hAgo;
      const priceChangePercent = ((priceChange / price24hAgo) * 100).toFixed(2);

      res.json({
        symbol: marketData.market,
        lastPrice: marketData.indexPrice,
        priceChange24h: priceChange.toFixed(8),
        priceChangePercent24h: priceChangePercent,
        volume24h: marketData.volume24h,
        high24h: '0', // Not provided by API
        low24h: '0', // Not provided by API
        indexPrice: marketData.indexPrice,
        openInterest: marketData.openInterest,
        fundingRate: marketData.currentFundingRate,
        nextFundingTime: marketData.nextFundingTime,
        trades24h: marketData.trades24h
      });
    } catch (error: any) {
      console.error(`Error fetching ticker for ${req.params.symbol}:`, error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch ticker data' });
    }
  });

  // Get exchange info
  router.get('/exchange', async (req: Request, res: Response) => {
    try {
      // Get config to determine sandbox mode
      const config = getConfigBySymbol('BTC-USD');
      const baseUrl = config.sandbox 
        ? 'https://api.sandbox.kuma.bid'
        : 'https://api.kuma.bid';

      const response = await axios.get(`${baseUrl}/v1/exchange`);
      res.json(response.data);
    } catch (error: any) {
      console.error('Error fetching exchange info:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch exchange info' });
    }
  });

  return router;
} 