module.exports = {
  apps: [{
    name: 'kumbo-api',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      CORS_ORIGIN: 'https://your-domain.com',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}; 