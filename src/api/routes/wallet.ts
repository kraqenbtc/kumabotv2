import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Directory to store wallet configurations
const WALLET_CONFIG_DIR = path.join(process.cwd(), 'data', 'wallets');

// Ensure directory exists
if (!fs.existsSync(WALLET_CONFIG_DIR)) {
  fs.mkdirSync(WALLET_CONFIG_DIR, { recursive: true });
}

// Setup wallet with delegated key
router.post('/setup', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      walletAddress, 
      delegatedAddress, 
      delegatedPrivateKey, 
      signature, 
      apiKey, 
      apiSecret 
    } = req.body;

    // Validate inputs
    if (!walletAddress || !delegatedAddress || !delegatedPrivateKey || !signature || !apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const message = `I authorize kumbo to use delegated key ${delegatedAddress} for trading on my behalf.\n\nThis key can only trade, not withdraw funds.\n\nTimestamp: ${new Date().toISOString()}`;
    
    try {
      // Note: In production, you should verify the exact timestamp
      const messageToVerify = message.substring(0, message.lastIndexOf('\n\nTimestamp:'));
      const recoveredAddress = ethers.verifyMessage(messageToVerify, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Failed to verify signature' });
    }

    // Save configuration
    const config = {
      walletAddress,
      delegatedAddress,
      delegatedPrivateKey,
      apiKey,
      apiSecret,
      signature,
      createdAt: new Date().toISOString()
    };

    const configPath = path.join(WALLET_CONFIG_DIR, `${walletAddress.toLowerCase()}.json`);
    
    // Encrypt sensitive data (in production, use proper encryption)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
      mode: 0o600 // Read/write for owner only
    });

    // Update .env file (or use a better configuration management)
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Update or add environment variables
    const envVars = {
      'KUMA_WALLET_ADDRESS': walletAddress,
      'KUMA_PRIVATE_KEY': delegatedPrivateKey,
      'KUMA_API_KEY': apiKey,
      'KUMA_API_SECRET': apiSecret,
      'KUMA_USE_DELEGATED_KEY': 'true'
    };

    for (const [key, value] of Object.entries(envVars)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n');

    return res.json({ 
      success: true, 
      message: 'Wallet configuration saved successfully',
      walletAddress,
      delegatedAddress
    });
  } catch (error: any) {
    console.error('Error setting up wallet:', error);
    return res.status(500).json({ error: 'Failed to setup wallet' });
  }
});

// Get wallet configuration status
router.get('/status', (req: Request, res: Response): Response => {
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      return res.json({ configured: false });
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasWallet = /KUMA_WALLET_ADDRESS=/.test(envContent);
    const hasApiKey = /KUMA_API_KEY=/.test(envContent);
    const hasDelegatedKey = /KUMA_USE_DELEGATED_KEY=true/.test(envContent);

    return res.json({
      configured: hasWallet && hasApiKey,
      hasDelegatedKey,
      walletAddress: envContent.match(/KUMA_WALLET_ADDRESS=(.+)/)?.[1] || null
    });
  } catch (error) {
    console.error('Error checking wallet status:', error);
    return res.status(500).json({ error: 'Failed to check wallet status' });
  }
});

export default router; 