'use strict';
const crypto = require('crypto');

/**
 * Job queue tuần tự (1 browser, chạy lần lượt) — tránh nhiều job thao tác browser cùng lúc.
 * POST trả jobId ngay; client poll /api/job/:id để lấy kết quả.
 */

const jobs = new Map(); // id -> { id, status, result, error, createdAt, startedAt, finishedAt, payload }
const queue = [];
let running = false;

function createJob(payload, handler, timeoutMs) {
  const id = crypto.randomUUID();
  const job = {
    id,
    status: 'queued', // queued | running | done | error
    payload,
    result: null,
    error: null,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    _handler: handler,
    _timeoutMs: timeoutMs,
  };
  jobs.set(id, job);
  queue.push(id);
  pump();
  return id;
}

// Job chạy quá timeoutMs -> báo lỗi ngay để KHÔNG chặn các job xếp sau trong hàng đợi (job gốc
// vẫn chạy ngầm tới khi tự xong/lỗi, nhưng không ai còn chờ kết quả của nó nữa).
async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const id = queue.shift();
      const job = jobs.get(id);
      if (!job) continue;
      job.status = 'running';
      job.startedAt = Date.now();
      try {
        const handlerPromise = job._handler(job.payload);
        handlerPromise.catch(() => {}); // nuốt lỗi trễ nếu job bị bỏ qua do timeout, tránh unhandledRejection
        if (job._timeoutMs) {
          let timer;
          const timeout = new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`JOB_TIMEOUT: job chạy quá ${Math.round(job._timeoutMs / 1000)}s trên runner — đã huỷ để không chặn hàng đợi (máy/mạng Zalo web có thể đang chậm).`)),
              job._timeoutMs
            );
          });
          try {
            job.result = await Promise.race([handlerPromise, timeout]);
          } finally {
            clearTimeout(timer);
          }
        } else {
          job.result = await handlerPromise;
        }
        job.status = 'done';
      } catch (err) {
        job.status = 'error';
        job.error = err && err.message ? err.message : String(err);
      } finally {
        job.finishedAt = Date.now();
        delete job._handler;
        delete job._timeoutMs;
      }
    }
  } finally {
    running = false;
  }
}

function getJob(id) {
  const job = jobs.get(id);
  if (!job) return null;
  const { _handler, ...rest } = job;
  return rest;
}

// Dọn job cũ > 1 giờ định kỳ
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.finishedAt && job.finishedAt < cutoff) jobs.delete(id);
  }
}, 10 * 60 * 1000).unref();

module.exports = { createJob, getJob };
