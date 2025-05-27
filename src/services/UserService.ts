import Database from 'better-sqlite3';
import CryptoJS from 'crypto-js';
import path from 'path';
import fs from 'fs';

interface UserData {
  walletAddress: string;
  apiKey: string;
  apiSecret: string;
  sandbox: boolean;
  createdAt: number;
  updatedAt: number;
}

export class UserService {
  private db: Database.Database;
  private encryptionKey: string;

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(path.join(dataDir, 'users.db'));
    
    // Use environment variable for encryption key or generate one
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    
    // Create users table if it doesn't exist
    this.initDatabase();
  }

  private generateEncryptionKey(): string {
    // In production, this should be stored securely and not regenerated
    const keyFile = path.join(process.cwd(), 'data', '.encryption.key');
    
    if (fs.existsSync(keyFile)) {
      return fs.readFileSync(keyFile, 'utf8');
    }
    
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    fs.writeFileSync(keyFile, key);
    return key;
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address TEXT PRIMARY KEY,
        encrypted_api_key TEXT NOT NULL,
        encrypted_api_secret TEXT NOT NULL,
        sandbox INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async saveUser(walletAddress: string, apiKey: string, apiSecret: string, sandbox: boolean = true): Promise<void> {
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO users (
        wallet_address, 
        encrypted_api_key, 
        encrypted_api_secret, 
        sandbox,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 
        COALESCE((SELECT created_at FROM users WHERE wallet_address = ?), ?),
        ?
      )
    `);

    stmt.run(
      walletAddress.toLowerCase(),
      this.encrypt(apiKey),
      this.encrypt(apiSecret),
      sandbox ? 1 : 0,
      walletAddress.toLowerCase(),
      now,
      now
    );
  }

  async getUser(walletAddress: string): Promise<UserData | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE wallet_address = ?
    `);

    const row = stmt.get(walletAddress.toLowerCase()) as any;
    
    if (!row) {
      return null;
    }

    return {
      walletAddress: row.wallet_address,
      apiKey: this.decrypt(row.encrypted_api_key),
      apiSecret: this.decrypt(row.encrypted_api_secret),
      sandbox: row.sandbox === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async updateUserMode(walletAddress: string, sandbox: boolean): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET sandbox = ?, updated_at = ? 
      WHERE wallet_address = ?
    `);

    stmt.run(
      sandbox ? 1 : 0,
      Date.now(),
      walletAddress.toLowerCase()
    );
  }

  async deleteUser(walletAddress: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM users WHERE wallet_address = ?
    `);

    stmt.run(walletAddress.toLowerCase());
  }

  async userExists(walletAddress: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM users WHERE wallet_address = ? LIMIT 1
    `);

    const result = stmt.get(walletAddress.toLowerCase());
    return !!result;
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
export const userService = new UserService(); 