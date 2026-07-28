'use strict';
const util = require('util');

/**
 * Bộ đệm VÒNG (ring buffer) bắt log hệ thống ngay trong RAM, để xem qua /api/system-logs
 * mà không cần SSH đọc file PM2. Giữ tối đa MAX bản ghi gần nhất.
 */

const MAX = Math.max(parseInt(process.env.SYSTEM_LOG_BUFFER || '1000', 10) || 1000, 100);

const buf = []; // [{ seq, t, level, msg }]
let seq = 0;
let installed = false;

function formatArgs(args) {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || `${a.name}: ${a.message}`;
      if (typeof a === 'string') return a;
      return util.inspect(a, { depth: 4, breakLength: 120, colors: false });
    })
    .join(' ');
}

function record(level, msg) {
  buf.push({ seq: ++seq, t: Date.now(), level, msg });
  if (buf.length > MAX) buf.splice(0, buf.length - MAX);
}

function install() {
  if (installed) return;
  installed = true;

  const levels = { log: 'info', info: 'info', warn: 'warn', error: 'error', debug: 'debug' };
  for (const [method, level] of Object.entries(levels)) {
    const orig = console[method] ? console[method].bind(console) : null;
    console[method] = (...args) => {
      try { record(level, formatArgs(args)); } catch (_) { /* không để lỗi log làm sập app */ }
      if (orig) orig(...args);
    };
  }

  process.on('uncaughtExceptionMonitor', (err) => {
    try { record('error', `[uncaughtException] ${err && (err.stack || err.message) || err}`); } catch (_) { /* noop */ }
  });
  process.on('unhandledRejection', (reason) => {
    try {
      const msg = reason instanceof Error ? (reason.stack || reason.message) : util.inspect(reason, { depth: 4 });
      record('error', `[unhandledRejection] ${msg}`);
    } catch (_) { /* noop */ }
  });
}

function getEntries({ level, q, limit } = {}) {
  const cap = Math.min(Math.max(parseInt(limit, 10) || 300, 1), MAX);
  const needle = (q || '').trim().toLowerCase();
  const minRank = level === 'error' ? 3 : level === 'warn' ? 2 : 0;
  const rank = (lv) => (lv === 'error' ? 3 : lv === 'warn' ? 2 : lv === 'info' ? 1 : 0);

  const out = [];
  for (let i = buf.length - 1; i >= 0 && out.length < cap; i--) {
    const e = buf[i];
    if (minRank && rank(e.level) < minRank) continue;
    if (needle && !e.msg.toLowerCase().includes(needle)) continue;
    out.push(e);
  }
  return out;
}

module.exports = { install, getEntries, record, MAX };
