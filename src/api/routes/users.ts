import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../../services/UserService';
import { createApiError } from '../middleware/errorHandler';

interface AuthRequest extends Request {
  walletAddress?: string;
}

export default function userRoutes(): Router {
  const router = Router();

  // Middleware to extract wallet address
  const extractWallet = (req: AuthRequest, res: Response, next: NextFunction) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (!walletAddress) {
      return next(createApiError('Wallet address required', 401));
    }
    req.walletAddress = walletAddress;
    next();
  };

  // Apply wallet middleware to all routes
  router.use(extractWallet);

  // Save or update user API keys
  router.post('/api-keys', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { apiKey, apiSecret, sandbox = true } = req.body;
      
      if (!apiKey || !apiSecret) {
        return next(createApiError('API key and secret required', 400));
      }

      await userService.saveUser(
        req.walletAddress!,
        apiKey,
        apiSecret,
        sandbox
      );

      res.json({ 
        message: 'API keys saved successfully',
        walletAddress: req.walletAddress
      });
    } catch (error: any) {
      next(createApiError(`Failed to save API keys: ${error.message}`, 500));
    }
  });

  // Get user info (without exposing keys)
  router.get('/info', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.getUser(req.walletAddress!);
      
      if (!user) {
        res.json({
          exists: false,
          walletAddress: req.walletAddress
        });
        return;
      }

      res.json({
        exists: true,
        walletAddress: user.walletAddress,
        sandbox: user.sandbox,
        hasApiKeys: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error: any) {
      next(createApiError(`Failed to get user info: ${error.message}`, 500));
    }
  });

  // Update sandbox mode
  router.put('/mode', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { sandbox } = req.body;
      
      if (typeof sandbox !== 'boolean') {
        return next(createApiError('Sandbox must be a boolean', 400));
      }

      const user = await userService.getUser(req.walletAddress!);
      if (!user) {
        return next(createApiError('User not found', 404));
      }

      await userService.updateUserMode(req.walletAddress!, sandbox);

      res.json({ 
        message: 'Mode updated successfully',
        sandbox
      });
    } catch (error: any) {
      next(createApiError(`Failed to update mode: ${error.message}`, 500));
    }
  });

  // Delete user
  router.delete('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.deleteUser(req.walletAddress!);
      
      res.json({ 
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      next(createApiError(`Failed to delete user: ${error.message}`, 500));
    }
  });

  return router;
} 