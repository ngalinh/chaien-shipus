'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Lưu/đọc danh sách tài khoản Zalo dùng để báo hàng (mỗi tài khoản 1 profile browser riêng).
 *
 * Mỗi tài khoản:
 *   - key          : định danh duy nhất + cũng là tên "profile" browser
 *   - name         : tên nhân viên / nhãn hiển thị
 *   - saleworkName : TÊN account như hiện trong dropdown zalo.basso.vn (chọn account khi gửi)
 *   - email/password: tài khoản đăng nhập Zalo Basso (tự điền form login khi session hết hạn)
 *   - phone        : (tuỳ chọn) SĐT của tài khoản — chỉ để hiển thị
 *   - staffId      : (tuỳ chọn) khớp đơn -> account theo nhân viên phụ trách
 *   - brand        : (tuỳ chọn) prefix mã đơn account này phụ trách. Trống = nhận mọi brand.
 *   - autoEnabled  : có cho luồng tự động gửi bằng account này không (mặc định true)
 *   - notifyTarget : 'group' (báo vào nhóm) | 'personal' (nhắn tin cá nhân). Mặc định 'group'.
 *   - proxy        : (tuỳ chọn) "host:port" hoặc "user:pass@host:port" áp dụng khi mở Chromium
 *
 * Lưu ở file JSON (config.zaloAccountsFile) — đơn giản, không cần DB riêng.
 */

function load() {
  try {
    if (fs.existsSync(config.zaloAccountsFile)) {
      const arr = JSON.parse(fs.readFileSync(config.zaloAccountsFile, 'utf8'));
      return Array.isArray(arr) ? arr : [];
    }
  } catch {
    /* file hỏng -> coi như rỗng, tránh crash */
  }
  return [];
}

function save(accounts) {
  const dir = path.dirname(config.zaloAccountsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(config.zaloAccountsFile, JSON.stringify(accounts, null, 2));
}

function normalize(a) {
  return {
    key: String(a.key || '').trim(),
    name: String(a.name || '').trim(),
    saleworkName: String(a.saleworkName || '').trim(),
    email: String(a.email || '').trim(),
    password: String(a.password || ''),
    phone: String(a.phone || '').trim(),
    staffId: a.staffId != null ? String(a.staffId).trim() : '',
    brand: a.brand != null ? String(a.brand).trim().toUpperCase() : '',
    autoEnabled: a.autoEnabled === undefined ? true : !!a.autoEnabled,
    autoEnabledAt: a.autoEnabledAt || undefined,
    notifyTarget: a.notifyTarget === 'personal' ? 'personal' : 'group',
    proxy: String(a.proxy || '').trim(),
    createdAt: a.createdAt || new Date().toISOString(),
    updatedAt: a.updatedAt || undefined,
  };
}

function list() {
  return load().map(normalize);
}

function get(key) {
  const a = load().find((x) => x.key === key);
  return a ? normalize(a) : null;
}

function add(input) {
  const account = normalize(input);
  if (!account.key || !account.name) throw new Error('Thiếu key hoặc tên hiển thị');
  if (!account.saleworkName) throw new Error('Thiếu saleworkName (tên account trong dropdown Zalo Basso)');
  const accounts = load();
  if (accounts.find((a) => a.key === account.key)) throw new Error(`Key "${account.key}" đã tồn tại`);
  account.createdAt = new Date().toISOString();
  if (account.autoEnabled) account.autoEnabledAt = account.createdAt;
  accounts.push(account);
  save(accounts);
  return account;
}

function update(key, patch) {
  const accounts = load();
  const idx = accounts.findIndex((a) => a.key === key);
  if (idx === -1) return null;
  const prev = normalize(accounts[idx]);
  const merged = normalize({ ...accounts[idx], ...patch, key });
  merged.createdAt = accounts[idx].createdAt || merged.createdAt;
  merged.updatedAt = new Date().toISOString();
  if (merged.autoEnabled && !prev.autoEnabled) merged.autoEnabledAt = merged.updatedAt;
  else if (!merged.autoEnabled) merged.autoEnabledAt = undefined;
  accounts[idx] = merged;
  save(accounts);
  return merged;
}

function remove(key) {
  const accounts = load();
  const next = accounts.filter((a) => a.key !== key);
  if (next.length === accounts.length) return false;
  save(next);
  return true;
}

module.exports = { list, get, add, update, remove, load, save };
