import { Router } from 'express';
import { getConfigBySymbol } from '../../config';

const router = Router();

// Get delegated key status
router.get('/status', (req, res) => {
  try {
    // Get config for any symbol to check delegated key status
    const config = getConfigBySymbol('BTC-USD');
    
    res.json({
      isUsing: config.useDelegatedKey || false,
      mainWallet: config.walletAddress,
      delegatedAddress: config.delegatedAddress
    });
  } catch (error) {
    console.error('Error getting delegated key status:', error);
    res.status(500).json({ error: 'Failed to get delegated key status' });
  }
});

export default router; 