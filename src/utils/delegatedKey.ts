import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

export class DelegatedKeyManager {
  private static KEYS_DIR = path.join(process.cwd(), 'data', 'delegated-keys');

  static {
    // Ensure keys directory exists
    if (!fs.existsSync(this.KEYS_DIR)) {
      fs.mkdirSync(this.KEYS_DIR, { recursive: true });
    }
  }

  /**
   * Generate a new delegated key for a wallet
   */
  static generateDelegatedKey(walletAddress: string): {
    address: string;
    privateKey: string;
  } {
    // Generate a new random wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Save the key securely
    const keyData = {
      mainWallet: walletAddress,
      delegatedAddress: wallet.address,
      delegatedPrivateKey: wallet.privateKey,
      createdAt: new Date().toISOString()
    };

    const filename = `${walletAddress.toLowerCase()}.json`;
    const filepath = path.join(this.KEYS_DIR, filename);
    
    // Encrypt the file (in production, use proper encryption)
    fs.writeFileSync(filepath, JSON.stringify(keyData, null, 2), {
      mode: 0o600 // Read/write for owner only
    });

    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  /**
   * Get existing delegated key for a wallet
   */
  static getDelegatedKey(walletAddress: string): {
    address: string;
    privateKey: string;
  } | null {
    const filename = `${walletAddress.toLowerCase()}.json`;
    const filepath = path.join(this.KEYS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      return {
        address: data.delegatedAddress,
        privateKey: data.delegatedPrivateKey
      };
    } catch (error) {
      console.error('Error reading delegated key:', error);
      return null;
    }
  }

  /**
   * Get or create delegated key
   */
  static getOrCreateDelegatedKey(walletAddress: string): {
    address: string;
    privateKey: string;
    isNew: boolean;
  } {
    const existing = this.getDelegatedKey(walletAddress);
    
    if (existing) {
      return {
        ...existing,
        isNew: false
      };
    }

    const newKey = this.generateDelegatedKey(walletAddress);
    return {
      ...newKey,
      isNew: true
    };
  }

  /**
   * List all delegated keys
   */
  static listDelegatedKeys(): Array<{
    mainWallet: string;
    delegatedAddress: string;
    createdAt: string;
  }> {
    const files = fs.readdirSync(this.KEYS_DIR);
    const keys: Array<{
      mainWallet: string;
      delegatedAddress: string;
      createdAt: string;
    }> = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = JSON.parse(
            fs.readFileSync(path.join(this.KEYS_DIR, file), 'utf-8')
          );
          keys.push({
            mainWallet: data.mainWallet,
            delegatedAddress: data.delegatedAddress,
            createdAt: data.createdAt
          });
        } catch (error) {
          console.error(`Error reading ${file}:`, error);
        }
      }
    }

    return keys;
  }
} 