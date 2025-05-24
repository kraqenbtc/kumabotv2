module.exports = {
  apps: [
    {
      name: 'kumabot-btc',
      script: './node_modules/.bin/ts-node',
      args: 'src/index.ts BTC-USD',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'kumabot-eth',
      script: './node_modules/.bin/ts-node',
      args: 'src/index.ts ETH-USD',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'kumabot-sol',
      script: './node_modules/.bin/ts-node',
      args: 'src/index.ts SOL-USD',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}; 