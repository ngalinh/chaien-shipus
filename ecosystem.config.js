'use strict';
/**
 * ecosystem.config.js — Cấu hình PM2 cho local-runner Zalo của Chaien.
 *
 * Chạy CHỈ trên máy có Chrome (không phải máy BASSO deploy backend/frontend chaien-shipus).
 * Dùng:
 *   pm2 start ecosystem.config.js --only chaien-zalo-runner
 *   pm2 save
 *   pm2 logs chaien-zalo-runner  /  pm2 restart chaien-zalo-runner  /  pm2 status
 *
 * Auto-start khi reboot: trên Linux dùng `pm2 startup`. Trên WINDOWS `pm2 startup` KHÔNG
 * chạy — dùng pm2-installer (PM2 thành Windows Service) hoặc NSSM/Task Scheduler.
 */
module.exports = {
  apps: [
    {
      name: 'chaien-zalo-runner',
      script: 'start.js',
      cwd: __dirname,
      // Fork (KHÔNG cluster): runner là stateful — 1 phiên Chrome/đăng nhập Zalo duy nhất.
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      // Chrome rò rỉ RAM theo thời gian: tự restart khi vượt ngưỡng để tránh treo máy.
      max_memory_restart: '800M',
      restart_delay: 5000,
      // pm2 gửi SIGINT rồi chờ kill_timeout mới SIGKILL. 12s đủ để start.js tự SIGKILL cả
      // nhóm ở giây thứ 8 trước khi hết hạn này — tránh Chrome mồ côi giữ cổng.
      kill_timeout: 12000,
      min_uptime: 10000,
      max_restarts: 15,
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
