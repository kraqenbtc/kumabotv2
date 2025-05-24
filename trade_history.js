const fs = require('fs').promises;
const path = require('path');

class TradeHistory {
  constructor(market) {
    this.market = market;
    this.filePath = path.join(__dirname, 'data', `${market.toLowerCase()}_trades.json`);
    this.trades = [];
    this.loaded = false;
  }

  async load() {
    try {
      // data klasörünü oluştur
      await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
      
      // Dosya varsa oku
      const data = await fs.readFile(this.filePath, 'utf8');
      this.trades = JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Dosya yoksa boş array ile başla
        this.trades = [];
      } else {
        console.error(`[${this.market}] Error loading trade history:`, err);
        throw err;
      }
    }
    this.loaded = true;
  }

  async save() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.trades, null, 2));
    } catch (err) {
      console.error(`[${this.market}] Error saving trade history:`, err);
      throw err;
    }
  }

  async addTrade(trade) {
    if (!this.loaded) await this.load();
    
    this.trades.push(trade);
    // Son 1000 trade'i tut
    if (this.trades.length > 1000) {
      this.trades = this.trades.slice(-1000);
    }
    await this.save();
  }

  async getRecentTrades(limit = 100) {
    if (!this.loaded) await this.load();
    return this.trades.slice(-limit).reverse();
  }

  async getTotalPnL() {
    if (!this.loaded) await this.load();
    return this.trades.reduce((total, trade) => total + (trade.pnl || 0), 0);
  }

  async getTotalVolume() {
    if (!this.loaded) await this.load();
    return this.trades.reduce((total, trade) => total + (trade.price * trade.quantity), 0);
  }
}

module.exports = TradeHistory; 