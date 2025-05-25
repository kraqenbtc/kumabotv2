import { Trade } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TradeHistory {
  private trades: Trade[] = [];
  private symbol: string;
  private dataDir: string;
  private filePath: string;

  constructor(symbol: string) {
    this.symbol = symbol;
    this.dataDir = path.join(process.cwd(), 'data', 'trades');
    this.filePath = path.join(this.dataDir, `${symbol}_trades.json`);
  }

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.trades = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or invalid, start fresh
      this.trades = [];
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.trades, null, 2));
  }

  async addTrade(trade: Trade): Promise<void> {
    this.trades.push(trade);
    await this.save();
  }

  async getTotalPnL(): Promise<number> {
    if (this.trades.length === 0) return 0;
    
    // Get the most recent trade's totalPnL if available
    const lastTrade = this.trades[this.trades.length - 1];
    if (lastTrade.totalPnL !== undefined) {
      return lastTrade.totalPnL;
    }
    
    // Otherwise calculate from individual trade P&Ls
    return this.trades.reduce((sum, trade) => {
      return sum + (trade.pnl || 0);
    }, 0);
  }

  async getTotalVolume(): Promise<number> {
    return this.trades.reduce((sum, trade) => sum + trade.cost, 0);
  }

  async getRecentTrades(limit: number = 10): Promise<Trade[]> {
    return this.trades.slice(-limit);
  }

  async getTradesByDate(date: Date): Promise<Trade[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.trades.filter(trade => {
      const tradeDate = new Date(trade.timestamp);
      return tradeDate >= startOfDay && tradeDate <= endOfDay;
    });
  }

  async getStats(): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    avgPnL: number;
    lastTotalPnL: number;
  }> {
    const stats = {
      totalTrades: this.trades.length,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgPnL: 0,
      lastTotalPnL: 0
    };

    const tradesWithPnL = this.trades.filter(t => t.pnl !== null);
    
    for (const trade of tradesWithPnL) {
      if (trade.pnl! > 0) {
        stats.winningTrades++;
      } else if (trade.pnl! < 0) {
        stats.losingTrades++;
      }
      stats.totalPnL += trade.pnl!;
    }

    if (tradesWithPnL.length > 0) {
      stats.winRate = (stats.winningTrades / tradesWithPnL.length) * 100;
      stats.avgPnL = stats.totalPnL / tradesWithPnL.length;
    }

    // Get the last total P&L from the most recent trade
    if (this.trades.length > 0) {
      const lastTrade = this.trades[this.trades.length - 1];
      stats.lastTotalPnL = lastTrade.totalPnL || stats.totalPnL;
    }

    return stats;
  }

  async getDailyStats(): Promise<Map<string, {
    trades: number;
    volume: number;
    pnl: number;
  }>> {
    const dailyStats = new Map<string, any>();

    for (const trade of this.trades) {
      const date = new Date(trade.timestamp).toISOString().split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { trades: 0, volume: 0, pnl: 0 });
      }

      const stats = dailyStats.get(date);
      stats.trades++;
      stats.volume += trade.cost;
      stats.pnl += trade.pnl || 0;
    }

    return dailyStats;
  }
} 