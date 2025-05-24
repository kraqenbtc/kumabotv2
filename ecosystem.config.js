module.exports = {
  apps: [
    {
      name: 'grid-bots',
      script: 'start_bots.js',
      watch: ['eth_grid.js', 'btc_grid.js', 'sol_grid.js', 'api.js', 'config.js', 'trade_history.js'],
      ignore_watch: ['node_modules', 'data'],
      watch_options: {
        followSymlinks: false
      },
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