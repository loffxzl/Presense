// PM2 process file. Start with:  pm2 start ecosystem.config.cjs --env production
// (.cjs because PM2 reads this file as CommonJS, even though the app uses ES modules)
module.exports = {
  apps: [
    {
      name: 'presense',
      script: 'app.js',
      instances: 1,              // one process is plenty for a small server
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M', // restart if it ever leaks past this
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
