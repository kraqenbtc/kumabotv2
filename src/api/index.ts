import { BotManager } from '../services/BotManager';
import { ApiServer } from './server';

// Create bot manager instance
const botManager = new BotManager();

// Create API server
const apiServer = new ApiServer(botManager, parseInt(process.env.API_PORT || '4000'));

// Start API server
apiServer.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  
  try {
    await botManager.shutdown();
    apiServer.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  
  try {
    await botManager.shutdown();
    apiServer.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

export { botManager, apiServer }; 