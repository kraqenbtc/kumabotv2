import { ethers } from 'ethers';
import Database from 'better-sqlite3';
import CryptoJS from 'crypto-js';
import path from 'path';
import fs from 'fs';

interface DelegatedWallet {
  userWalletAddress: string;
  delegatedAddress: string;
  encryptedPrivateKey: string;
  createdAt: number;
}

export class DelegatedWalletService {
  private db: Database.Database;
  private encryptionKey: string;

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(path.join(dataDir, 'delegated_wallets.db'));
    
    // Use same encryption key as UserService
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.getEncryptionKey();
    
    // Create table
    this.initDatabase();
  }

  private getEncryptionKey(): string {
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
      CREATE TABLE IF NOT EXISTS delegated_wallets (
        user_wallet_address TEXT PRIMARY KEY,
        delegated_address TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        created_at INTEGER NOT NULL
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

  async createOrGetDelegatedWallet(userWalletAddress: string): Promise<{
    address: string;
    privateKey: string;
  }> {
    // Check if delegated wallet already exists
    const existing = await this.getDelegatedWallet(userWalletAddress);
    if (existing) {
      return {
        address: existing.delegatedAddress,
        privateKey: this.decrypt(existing.encryptedPrivateKey)
      };
    }

    // Create new delegated wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Save to database
    const stmt = this.db.prepare(`
      INSERT INTO delegated_wallets (
        user_wallet_address,
        delegated_address,
        encrypted_private_key,
        created_at
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      userWalletAddress.toLowerCase(),
      wallet.address,
      this.encrypt(wallet.privateKey),
      Date.now()
    );

    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  async getDelegatedWallet(userWalletAddress: string): Promise<DelegatedWallet | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM delegated_wallets WHERE user_wallet_address = ?
    `);

    const row = stmt.get(userWalletAddress.toLowerCase()) as any;
    
    if (!row) {
      return null;
    }

    return {
      userWalletAddress: row.user_wallet_address,
      delegatedAddress: row.delegated_address,
      encryptedPrivateKey: row.encrypted_private_key,
      createdAt: row.created_at
    };
  }

  async deleteDelegatedWallet(userWalletAddress: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM delegated_wallets WHERE user_wallet_address = ?
    `);

    stmt.run(userWalletAddress.toLowerCase());
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
export const delegatedWalletService = new DelegatedWalletService(); 