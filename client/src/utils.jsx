import dayjs from 'dayjs';

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '0 đ';
  return Number(value).toLocaleString('en-US') + ' đ';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('DD/MM/YYYY');
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('YYYY-MM-DD');
}

export function todayInputValue() {
  return dayjs().format('YYYY-MM-DD');
}

// Danh tính nhân viên đăng nhập từ nền tảng BASSO (localStorage.ai_chat_user).
// Dùng để gán NV SALE khi tạo mã KH mới. Trả null nếu chưa đăng nhập BASSO.
export function getBassoUser() {
  try {
    const raw = localStorage.getItem('ai_chat_user') || sessionStorage.getItem('ai_chat_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    const username = u?.username || null;
    const name = u?.name || u?.username || null;
    if (!username && !name) return null;
    return { username, name };
  } catch {
    return null;
  }
}

const ADMIN_EMAILS  = ['dzuong.bol@gmail.com', 'ngalinh@gmail.com', 'thuylinhbui0209@gmail.com'];
const KETOAN_EMAILS = ['ketoan.basso@gmail.com'];

// Phân quyền frontend dựa theo email đăng nhập BASSO.
// Quét tất cả các trường string trong ai_chat_user để khớp email — fail-closed: chưa xác định → 'staff'.
// Trả về: 'admin' | 'ketoan' | 'staff'
export function getUserRole() {
  try {
    const raw = localStorage.getItem('ai_chat_user') || sessionStorage.getItem('ai_chat_user');
    if (!raw) return 'staff';
    const u = JSON.parse(raw);
    if (!u || typeof u !== 'object') return 'staff';
    const strings = Object.values(u).filter((v) => typeof v === 'string');
    for (const s of strings) {
      const lower = s.toLowerCase().trim();
      if (ADMIN_EMAILS.includes(lower))  return 'admin';
      if (KETOAN_EMAILS.includes(lower)) return 'ketoan';
    }
    return 'staff';
  } catch {
    return 'staff';
  }
}

export function calcCustomerStatus(lastDate) {
  if (!lastDate) return 'inactive';
  const diffDays = dayjs().diff(dayjs(lastDate), 'day');
  if (diffDays <= 30) return 'active1';
  if (diffDays <= 60) return 'active2';
  if (diffDays <= 90) return 'active3';
  return 'inactive';
}

// ─── Fuzzy customer / warehouse matching for shipment import ───────────────────
// The partner file writes customer names WITHOUT diacritics, in UPPERCASE, and
// often uses a code fragment instead of the display name. We normalise both sides
// (strip diacritics, uppercase, drop all non-alphanumerics) and match against the
// customer NAME and every segment of the customer CODE.

export function removeDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normKey(s) {
  return removeDiacritics(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = tmp;
    }
  }
  return prev[n];
}

// Build a lookup: each customer contributes several keys (name + code segments).
export function buildCustomerIndex(customers) {
  const list = customers.map((c) => {
    const keys = new Set();
    if (c.name) keys.add(normKey(c.name));
    // code can hold several aliases split by "/" or newline; add whole line + last token
    (c.code || '').split(/[\n/]/).forEach((seg) => {
      const trimmed = seg.trim();
      if (!trimmed) return;
      keys.add(normKey(trimmed));
      const tokens = trimmed.split(/\s+/);
      if (tokens.length > 1) keys.add(normKey(tokens[tokens.length - 1]));
    });
    keys.delete('');
    return { id: c.id, name: c.name, code: c.code, keys: [...keys] };
  });
  return list;
}

// Returns { status: 'auto'|'suggest'|'none', customerId, suggestions: [ids] }
// aliases: { [raw_key]: customer_id } — learned from previous manual matches
export function matchCustomer(raw, index, aliases = {}) {
  const R = normKey(raw);
  if (!R) return { status: 'none', customerId: null, suggestions: [] };

  if (aliases[R] !== undefined) {
    return { status: 'auto', customerId: aliases[R], suggestions: [aliases[R]] };
  }

  const exact = index.filter((c) => c.keys.includes(R));
  if (exact.length === 1) {
    return { status: 'auto', customerId: exact[0].id, suggestions: [exact[0].id] };
  }
  if (exact.length > 1) {
    // Ambiguous — several customers share this key. Force a manual pick.
    return { status: 'suggest', customerId: null, suggestions: exact.map((c) => c.id) };
  }

  // Fuzzy: best distance across keys, with a bonus when one contains the other.
  const scored = index.map((c) => {
    let best = Infinity;
    for (const k of c.keys) {
      if (!k) continue;
      let d = levenshtein(R, k);
      if (k.length >= 4 && (k.includes(R) || R.includes(k))) {
        d = Math.min(d, Math.abs(k.length - R.length) * 0.5);
      }
      if (d < best) best = d;
    }
    return { id: c.id, d: best };
  }).sort((a, b) => a.d - b.d);

  const threshold = Math.max(4, R.length * 0.5);
  const near = scored.filter((s) => s.d <= threshold).slice(0, 6);
  if (near.length) {
    // Ranked hints, but never pre-selected — the user confirms the right customer.
    return { status: 'suggest', customerId: null, suggestions: near.map((s) => s.id) };
  }
  // Nothing close — still surface the 3 nearest as weak hints, but pre-select none.
  return { status: 'none', customerId: null, suggestions: scored.slice(0, 3).map((s) => s.id) };
}

// Match a partner file "Kho" code to a warehouse by code or alias list.
export function matchWarehouse(code, warehouses) {
  const C = normKey(code);
  if (!C) return null;
  for (const w of warehouses) {
    if (normKey(w.code) === C) return w;
    const aliases = (w.aliases || '').split(',').map((a) => normKey(a)).filter(Boolean);
    if (aliases.includes(C)) return w;
  }
  return null;
}

// Nhãn trạng thái thanh toán từng lô (paid_status từ backend, FIFO theo sổ cái khách)
export const PAID_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unpaid', label: 'Chưa TT' },
  { value: 'partial', label: 'TT một phần' },
  { value: 'paid', label: 'Đã TT' },
];

export function PaidBadge({ status }) {
  const map = {
    paid:    { label: 'Đã TT',       cls: 'bg-success-100 text-success-700' },
    partial: { label: 'TT một phần', cls: 'bg-warning-100 text-warning-700' },
    unpaid:  { label: 'Chưa TT',     cls: 'bg-danger-100 text-danger-600' },
  };
  const s = map[status] || map.unpaid;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active1: { label: 'Active 1m', cls: 'badge-active' },
    active2: { label: 'Active 2m', cls: 'badge-warning' },
    active3: { label: 'Active 3m', cls: 'badge-orange' },
    inactive: { label: 'Inactive', cls: 'badge-inactive' },
  };
  const s = map[status] || map.inactive;
  return <span className={s.cls}>{s.label}</span>;
}
