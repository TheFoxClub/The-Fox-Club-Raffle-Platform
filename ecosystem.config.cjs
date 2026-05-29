module.exports = {
  apps: [
    {
      name: "foxclub-raffle",
      script: "server/index.js",
      cwd: ".",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
