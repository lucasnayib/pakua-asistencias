module.exports = {
  apps: [
    {
      name: "pakua-asistencias",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      autorestart: true,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      watch: false,
    },
  ],
};
