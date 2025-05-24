import fs from 'fs/promises';
import path from 'path';
import { Trade } from '../types';

export class TradeHistory {
  private filename: string;
  private trades: Trade[] = [];

  constructor(symbol: string) {
    this.filename = path.join(__dirname, '../../data', `${symbol}_trades.json`);
  }

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.filename, 'utf8');
      this.trades = JSON.parse(data);
    } catch (err) {
      // File doesn't exist, start with empty array
      this.trades = [];
      await this.ensureDataDir();
    }
  }

  async save(): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(this.filename, JSON.stringify(this.trades, null, 2));
  }

  async addTrade(trade: Trade): Promise<void> {
    this.trades.push(trade);
    await this.save();
  }

  async getTotalPnL(): Promise<number> {
    if (this.trades.length === 0) return 0;
    // Return the totalPnL from the most recent trade
    return this.trades[this.trades.length - 1].totalPnL || 0;
  }

  async getTotalVolume(): Promise<number> {
    return this.trades.reduce((sum, trade) => 
      sum + (trade.price * trade.quantity), 0
    );
  }

  async getRecentTrades(limit: number = 100): Promise<Trade[]> {
    return this.trades.slice(-limit);
  }

  async getTradesByDateRange(startDate: Date, endDate: Date): Promise<Trade[]> {
    return this.trades.filter(trade => {
      const tradeDate = new Date(trade.time);
      return tradeDate >= startDate && tradeDate <= endDate;
    });
  }

  async getDailyStats(): Promise<{
    date: string;
    trades: number;
    volume: number;
    pnl: number;
  }[]> {
    const dailyStats = new Map<string, {
      trades: number;
      volume: number;
      pnl: number;
      lastTotalPnL: number;
    }>();

    let previousDayPnL = 0;
    
    for (const trade of this.trades) {
      const date = new Date(trade.time).toISOString().split('T')[0];
      
      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          trades: 0,
          volume: 0,
          pnl: 0,
          lastTotalPnL: previousDayPnL
        });
      }
      
      const stats = dailyStats.get(date)!;
      stats.trades++;
      stats.volume += trade.price * trade.quantity;
      stats.lastTotalPnL = trade.totalPnL;
      
      // Update previous day PnL for next iteration
      const dateKeys = Array.from(dailyStats.keys()).sort();
      const currentDateIndex = dateKeys.indexOf(date);
      if (currentDateIndex > 0) {
        const previousDate = dateKeys[currentDateIndex - 1];
        const previousStats = dailyStats.get(previousDate)!;
        previousDayPnL = previousStats.lastTotalPnL;
      }
    }

    // Calculate daily PnL
    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      trades: stats.trades,
      volume: stats.volume,
      pnl: stats.lastTotalPnL - stats.lastTotalPnL // This will be fixed in the next step
    }));
  }

  private async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(this.filename);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }
} 