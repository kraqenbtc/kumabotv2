module.exports = {
  apps: [
    {
      name: 'grid-bots',
      script: 'start_bots.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      out_file: './logs/grid-bots.log',
      error_file: './logs/grid-bots-error.log'
    }
  ]
}; 