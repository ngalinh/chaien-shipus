import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import shipusLogo from '../assets/shipus-logo.png';
import ImportModal from '../components/ImportModal.jsx';
import NotificationModal from '../components/NotificationModal.jsx';
import NotificationTemplate from '../components/NotificationTemplate.jsx';
import { getBassoUser } from '../utils.jsx';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => (v == null || isNaN(v) ? '0' : Number(v).toLocaleString('en-US'));
const fmtKg = (v) => Number(v || 0).toFixed(2);
const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '');
const initial = (n) => (n || 'A').trim().charAt(0).toUpperCase();
const todayStr = () => dayjs().format('YYYY-MM-DD');
const monthStart = () => dayjs().startOf('month').format('YYYY-MM-DD');

function groupPaidStatus(statuses) {
  if (!statuses.length) return 'unpaid';
  if (statuses.every((s) => s === 'paid')) return 'paid';
  if (statuses.some((s) => s === 'paid' || s === 'partial')) return 'partial';
  return 'unpaid';
}

const PAID_UI = {
  paid:    { label: 'Đã TT',       color: 'var(--ac)',     bg: 'var(--acBg)',   dot: 'var(--ac)'     },
  partial: { label: 'TT một phần', color: 'var(--warnTx)', bg: 'var(--warnBg)', dot: 'var(--warnTx)' },
  unpaid:  { label: 'Chưa TT',    color: 'var(--badTx)',  bg: 'var(--badBg)',  dot: 'var(--badTx)'  },
};
const paidUI = (s) => PAID_UI[s] || PAID_UI.unpaid;

const notifyUI = (s) => {
  if (s === 'Đã báo ship') return { label: 'Đã báo ship', color: 'var(--okTx)',   bg: 'var(--okBg)',   border: 'var(--okLn)'   };
  if (s === 'Đã báo hàng') return { label: 'Đã báo hàng', color: 'var(--ac)',     bg: 'var(--acBg)',   border: 'var(--acLn)'   };
  return                           { label: 'Chưa báo',   color: 'var(--warnTx)', bg: 'var(--warnBg)', border: 'var(--warnLn)' };
};

const tierUI = (t) => {
  if (t === 'Khách buôn') return { color: 'var(--warnTx)', bg: 'var(--warnBg)', border: 'var(--warnLn)' };
  return                         { color: 'var(--ac)',     bg: 'var(--acBg)',   border: 'var(--acLn)'   };
};

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IcoMenu = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
    <path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h11"/>
  </svg>
);
const IcoHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>
  </svg>
);
const IcoBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.5-3.4 3.1-5.4 6.2-5.4S14.7 16.6 15.2 20"/>
    <path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.4"/><path d="M18.2 14.9c2 .7 3.2 2.4 3.5 5.1"/>
  </svg>
);
const IcoReceipt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="6" width="19" height="12.5" rx="3"/><circle cx="12" cy="12.2" r="2.6"/>
  </svg>
);
const IcoChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 17v-5"/><path d="M13 17V8"/><path d="M18 17v-8"/>
  </svg>
);
const IcoGear = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.2"/>
    <path d="M4.6 15.2a1.7 1.7 0 0 0-1.2-2.7l-.4-.1v-.8l.4-.1a1.7 1.7 0 0 0 1.2-2.7l-.2-.3.6-.6.3.2a1.7 1.7 0 0 0 2.7-1.2l.1-.4h.8l.1.4a1.7 1.7 0 0 0 2.7 1.2l.3-.2.6.6-.2.3a1.7 1.7 0 0 0 1.2 2.7l.4.1v.8l-.4.1a1.7 1.7 0 0 0-1.2 2.7l.2.3-.6.6-.3-.2a1.7 1.7 0 0 0-2.7 1.2l-.1.4h-.8l-.1-.4a1.7 1.7 0 0 0-2.7-1.2l-.3.2-.6-.6Z"/>
  </svg>
);
const IcoGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/>
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>
  </svg>
);
const IcoChevR = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 5 7 7-7 7"/>
  </svg>
);
const IcoBack = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 5-7 7 7 7"/>
  </svg>
);
const IcoX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="m6 6 12 12"/><path d="M18 6 6 18"/>
  </svg>
);
const IcoMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);
const IcoSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
  </svg>
);
const IcoPhone = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z"/>
  </svg>
);
const IcoZalo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5c0 4.1-4 7.4-9 7.4a10.6 10.6 0 0 1-2.8-.4L4 20.5l1.3-3.6A7 7 0 0 1 3 11.5C3 7.4 7 4.1 12 4.1s9 3.3 9 7.4Z"/>
  </svg>
);
const IcoClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M12 5v14"/><path d="M5 12h14"/>
  </svg>
);
const IcoTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
  </svg>
);
const IcoCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const IcoEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const NAV_ITEMS = [
  { key: 'dash',  label: 'Tổng quan',   Icon: IcoHome    },
  { key: 'hang',  label: 'Hàng về',     Icon: IcoBox,    badge: 'shipments' },
  { key: 'khach', label: 'Khách hàng',  Icon: IcoUsers,  badge: 'customers' },
  { key: 'tx',    label: 'Giao dịch',   Icon: IcoReceipt },
  { key: 'rev',   label: 'Doanh thu VC',Icon: IcoChart   },
  { key: 'set',   label: 'Cài đặt',     Icon: IcoGear    },
];

// ── Btn helper ────────────────────────────────────────────────────────────────
function Btn({ onClick, style, children }) {
  return (
    <button onClick={onClick} style={{ appearance: 'none', fontFamily: 'inherit', cursor: 'pointer', ...style }}>
      {children}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function MobilePWA() {
  const hangMonthRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [route, setRoute]           = useState('dash');
  const [theme, setTheme]           = useState(() => localStorage.getItem('shipus_theme') || 'dark');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [q, setQ]                   = useState('');
  const [payFilter, setPayFilter]   = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [period, setPeriod]         = useState('month');
  const [openCards, setOpenCards]   = useState({});
  const [notifyState, setNotifyState] = useState({}); // optimistic: {custId: 'Đã báo hàng'|'Đã báo ship'}
  const [payOpen, setPayOpen]       = useState(false);
  const [payTarget, setPayTarget]   = useState(null); // { custId, name, fee, batchDate }
  const [payMethod, setPayMethod]   = useState('bank');
  const [custTab, setCustTab]       = useState('tx');
  const [custId, setCustId]         = useState(null);
  const [toastMsg, setToastMsg]     = useState(null);
  const toastTimer = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [revMonth, setRevMonth]     = useState(() => dayjs().format('YYYY-MM'));
  const [revData, setRevData]       = useState(null);
  const [revTab, setRevTab]         = useState('customer');
  const [settingsData, setSettingsData] = useState(null);
  const [vanDonData, setVanDonData] = useState(null); // { cust, code }
  const [shipMsgData, setShipMsgData] = useState(null); // { customerName, text }
  const [notifModalData, setNotifModalData] = useState(null); // { notifData, company, bank }
  const [custFrom, setCustFrom]           = useState('khach');
  const [settingsModal, setSettingsModal] = useState(null); // { type, data, isNew }
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Hang view filter
  const [hangPeriod, setHangPeriod]         = useState('month');
  const [hangMonth, setHangMonth]           = useState(() => dayjs().format('YYYY-MM'));
  const [hangShips, setHangShips]           = useState([]);
  const [hangStatusFilter, setHangStatusFilter] = useState('all');
  const [hangCollapsed, setHangCollapsed]   = useState({});
  const [bulkModal, setBulkModal]           = useState(null); // { startDate, endDate, customers, loading }
  const [bulkRun, setBulkRun]               = useState(null); // { list, index, sent, failed, skippedNoPhone, alreadyReported }
  // Per-row actions (shared between hang expanded view and cust profile)
  const [rowVanDon, setRowVanDon]           = useState(null); // { id, tracking_no, code }
  const [rowEditId, setRowEditId]           = useState(null);
  const [rowEditVals, setRowEditVals]       = useState({});
  const [rowDelId, setRowDelId]             = useState(null);
  const [rowEditModal, setRowEditModal]     = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [shipments,   setShipments]   = useState([]);
  const [customers,   setCustomers]   = useState([]);
  const [transactions, setTxRows]     = useState([]);
  const [custDetail,  setCustDetail]  = useState(null);
  const [custTxRows,  setCustTxRows]  = useState([]);
  const [custParcels, setCustParcels] = useState([]);
  const [username, setUsername]       = useState('');

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // apply theme to body
    document.body.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'light' ? '#e9ecee' : '#07161d';
    // get username from BASSO session
    try {
      const raw = localStorage.getItem('ai_chat_user') || sessionStorage.getItem('ai_chat_user');
      if (raw) { const u = JSON.parse(raw); setUsername(u?.name || u?.username || ''); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchShipments();
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [period]);

  useEffect(() => {
    fetchHangShipments(hangPeriod, hangMonth);
  }, [hangPeriod, hangMonth]);

  useEffect(() => {
    if (route === 'rev') {
      axios.get('/api/dashboard/vc-revenue', { params: { month: revMonth } })
        .then((r) => setRevData(r.data)).catch(() => setRevData(null));
    }
  }, [route, revMonth]);

  useEffect(() => {
    if (route === 'set' && !settingsData) {
      axios.get('/api/settings').then((r) => setSettingsData(r.data)).catch(() => {});
    }
  }, [route]);

  async function fetchShipments() {
    try {
      const res = await axios.get('/api/shipments', { params: { start_date: monthStart() } });
      setShipments(res.data);
    } catch { /* ignore */ }
  }

  async function fetchCustomers() {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch { /* ignore */ }
  }

  async function fetchTransactions() {
    try {
      const params = period === 'month' ? { start_date: monthStart(), end_date: todayStr() } : {};
      const res = await axios.get('/api/transactions/ledger', { params });
      setTxRows(res.data);
    } catch { /* ignore */ }
  }

  async function fetchHangShipments(period, month) {
    try {
      let params = {};
      if (period === 'month') {
        params = {
          start_date: dayjs(month).startOf('month').format('YYYY-MM-DD'),
          end_date:   dayjs(month).endOf('month').format('YYYY-MM-DD'),
        };
      }
      const res = await axios.get('/api/shipments', { params });
      setHangShips(res.data);
    } catch { /* ignore */ }
  }

  async function loadCustDetail(id) {
    setCustDetail(null); setCustTxRows([]); setCustParcels([]);
    try {
      const [det, txRes, pcRes] = await Promise.all([
        axios.get(`/api/customers/${id}`),
        axios.get('/api/transactions', { params: { customer_id: id } }),
        axios.get('/api/shipments', { params: { customer_id: id } }),
      ]);
      setCustDetail(det.data);
      // transactions: filter out shipment_batch (internal) rows
      setCustTxRows(txRes.data.filter(r => r.reference_type === 'payment').reverse());
      setCustParcels(pcRes.data);
    } catch { /* ignore */ }
  }

  // ── Derived: current batch ────────────────────────────────────────────────
  const batchDate = useMemo(() => {
    if (!shipments.length) return null;
    return [...new Set(shipments.map((s) => s.import_date))].sort().at(-1);
  }, [shipments]);

  const batchRows = useMemo(
    () => shipments.filter((s) => s.import_date === batchDate),
    [shipments, batchDate]
  );

  const batchCustomers = useMemo(() => {
    const map = {};
    for (const s of batchRows) {
      const cid = s.customer_id;
      if (!map[cid]) {
        map[cid] = {
          id: cid, name: s.customer_name, code: s.customer_code,
          kg: 0, fee: 0, rate: s.customer_rate, parcels: [],
          paidStatuses: [], notifyStatus: s.batch_status || '', van_don_code: '',
        };
      }
      map[cid].kg  += s.weight;
      map[cid].fee += s.phi_vc || (s.weight * s.customer_rate + s.surcharge);
      map[cid].paidStatuses.push(s.paid_status || 'unpaid');
      if (s.batch_status) map[cid].notifyStatus = s.batch_status;
      if (s.van_don_code) map[cid].van_don_code = s.van_don_code;
      map[cid].parcels.push(s);
    }
    return Object.values(map).map((c) => ({
      ...c,
      dateKey: batchDate,
      kg: Math.round(c.kg * 100) / 100,
      fee: Math.round(c.fee),
      paidStatus: groupPaidStatus(c.paidStatuses),
    })).sort((a, b) => b.fee - a.fee);
  }, [batchRows]);

  // Dash stats
  const totalKg     = batchRows.reduce((s, r) => s + (r.weight || 0), 0);
  const totalKiels  = batchRows.length;
  const paidCount   = batchCustomers.filter((c) => c.paidStatus === 'paid').length;
  const unpaidCount = batchCustomers.filter((c) => c.paidStatus !== 'paid').length;
  const notNotified = batchCustomers.filter((c) => {
    const ns = notifyState[c.id] ?? c.notifyStatus;
    return !ns;
  }).length;
  const paidPct = batchCustomers.length ? Math.round((paidCount / batchCustomers.length) * 100) : 0;
  const totalFee = batchCustomers.reduce((s, c) => s + c.fee, 0);
  const paidFee  = batchCustomers
    .filter((c) => c.paidStatus === 'paid')
    .reduce((s, c) => s + c.fee, 0);
  const dueFee   = totalFee - paidFee;

  // Top 5 for dash
  const top5 = batchCustomers.slice(0, 5);

  // Filtered hang list
  const hangList = useMemo(() => {
    let list = batchCustomers;
    if (q.trim()) {
      const qn = q.trim().toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(qn) || (c.code || '').toLowerCase().includes(qn)
      );
    }
    if (payFilter === 'none')   list = list.filter((c) => c.paidStatus === 'unpaid');
    if (payFilter === 'part')   list = list.filter((c) => c.paidStatus === 'partial');
    if (payFilter === 'paid')   list = list.filter((c) => c.paidStatus === 'paid');
    return list;
  }, [batchCustomers, q, payFilter]);

  // Hang date groups (date-filtered view with multiple dates)
  const hangDateGroups = useMemo(() => {
    let filtered = hangShips;
    if (q.trim()) {
      const qn = q.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.customer_name || '').toLowerCase().includes(qn) ||
        (s.customer_code || '').toLowerCase().includes(qn) ||
        (s.tracking_no || '').toLowerCase().includes(qn)
      );
    }
    const dateMap = new Map();
    for (const s of filtered) {
      if (!dateMap.has(s.import_date)) dateMap.set(s.import_date, new Map());
      const custMap = dateMap.get(s.import_date);
      const cid = s.customer_id;
      if (!custMap.has(cid)) {
        custMap.set(cid, {
          id: cid, name: s.customer_name, code: s.customer_code, dateKey: s.import_date,
          kg: 0, fee: 0, rate: s.customer_rate, parcels: [],
          paidStatuses: [], notifyStatus: s.batch_status || '', van_don_code: '',
        });
      }
      const c = custMap.get(cid);
      const w = parseFloat(s.weight) > 0 ? Math.max(0.5, parseFloat(s.weight)) : 0;
      c.kg  += w;
      c.fee += parseFloat(s.phi_vc) || (w * (s.customer_rate || 0) + (s.surcharge || 0));
      c.paidStatuses.push(s.paid_status || 'unpaid');
      if (s.batch_status) c.notifyStatus = s.batch_status;
      if (s.van_don_code) c.van_don_code = s.van_don_code;
      c.parcels.push(s);
    }
    const groups = [];
    for (const [dateKey, custMap] of [...dateMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
      let customers = [...custMap.values()].map((c) => ({
        ...c,
        kg: Math.round(c.kg * 100) / 100,
        fee: Math.round(c.fee),
        paidStatus: groupPaidStatus(c.paidStatuses),
      }));
      if (payFilter === 'none') customers = customers.filter((c) => c.paidStatus === 'unpaid');
      if (payFilter === 'part') customers = customers.filter((c) => c.paidStatus === 'partial');
      if (payFilter === 'paid') customers = customers.filter((c) => c.paidStatus === 'paid');
      if (hangStatusFilter !== 'all') {
        customers = customers.filter((c) => {
          const ns = notifyState[c.id] ?? c.notifyStatus;
          return hangStatusFilter === '' ? !ns : ns === hangStatusFilter;
        });
      }
      if (customers.length > 0) groups.push({ dateKey, customers });
    }
    return groups;
  }, [hangShips, q, payFilter, hangStatusFilter, notifyState]);

  // Filtered khach list
  const khachList = useMemo(() => {
    let list = customers;
    if (q.trim()) {
      const qn = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(qn) ||
          (c.code || '').toLowerCase().includes(qn) ||
          (c.phone || '').includes(qn)
      );
    }
    if (tierFilter === 'le')   list = list.filter((c) => (c.rate_name || '') !== 'Khách buôn');
    if (tierFilter === 'buon') list = list.filter((c) => c.rate_name === 'Khách buôn');
    return list.slice(0, 50);
  }, [customers, q, tierFilter]);

  // Tx stats
  const txFiltered = useMemo(() => transactions.filter((t) => t.category !== 'partner_payment'), [transactions]);
  const txPaid = txFiltered.reduce((s, t) => s + (t.thu || 0), 0);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('shipus_theme', next);
    document.body.setAttribute('data-theme', next);
    document.body.style.backgroundColor = next === 'light' ? '#e9ecee' : '#07161d';
  }

  function showToast(msg) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }

  function nav(r) {
    setRoute(r);
    setDrawerOpen(false);
    setQ('');
  }

  function openCust(id) {
    setCustFrom(route);
    setCustId(id);
    setCustTab('tx');
    loadCustDetail(id);
    setRoute('cust');
    setDrawerOpen(false);
  }

  function buildShipText(customerName, van_don_code) {
    const code = van_don_code || '';
    return `Anh/Chị ${customerName} ơi, đơn hàng của mình đã được bàn giao cho đơn vị vận chuyển rồi ạ 🚚\n📦 Mã vận đơn: ${code}\n🔎 Theo dõi: https://i.ghtk.vn/${code}\nPhí ship anh/chị vui lòng thanh toán cho shipper khi nhận hàng.\nDự kiến 2–5 ngày mình sẽ nhận được hàng. Cần hỗ trợ cứ nhắn bên em nhé 💕`;
  }

  async function handleNotify(cust, status) {
    const dateKey = cust.dateKey ?? batchDate;
    const prev = notifyState[cust.id] ?? cust.notifyStatus;
    setNotifyState((s) => ({ ...s, [cust.id]: status }));
    showToast(`✓ ${status} · ${cust.name}`);
    try {
      await axios.patch('/api/shipments/batch-status', {
        batch_date: dateKey,
        customer_id: cust.id,
        status,
      });
      if (status === 'Đã báo hàng') {
        const bassoUser = getBassoUser();
        axios.post('/api/shipments/batch/notify', {
          batch_date: dateKey,
          customer_id: cust.id,
          sent_by: bassoUser?.name || bassoUser?.username || null,
        }).catch(() => {});
      }
    } catch {
      setNotifyState((s) => ({ ...s, [cust.id]: prev }));
    }
  }

  async function handleBaoHang(c) {
    const dateKey = c.dateKey ?? batchDate;
    handleNotify(c, 'Đã báo hàng');
    let sd = settingsData;
    if (!sd) {
      try {
        const r = await axios.get('/api/settings');
        sd = r.data;
        setSettingsData(sd);
      } catch { sd = {}; }
    }
    setNotifModalData({
      notifData: {
        customerName: c.name,
        date: dateKey,
        items: c.parcels.map((p) => ({
          tracking_no: p.tracking_no,
          product: p.product,
          weight: p.weight,
          customer_fee: p.phi_vc || (p.weight * p.customer_rate + p.surcharge),
        })),
        fileName: `thong-bao-${c.code || 'kh'}-${dateKey}.png`,
      },
      company: sd.company || {},
      bank: (sd.bank_accounts || []).find((b) => b.is_default) || (sd.bank_accounts || [])[0] || null,
    });
  }

  async function loadBulkReportRange(startDate, endDate) {
    setBulkModal({ startDate, endDate, customers: [], loading: true });
    try {
      const res = await axios.get('/api/shipments', { params: { start_date: startDate, end_date: endDate } });
      const rows = res.data || [];
      const custMap = new Map();
      for (const s of rows) {
        const key = `${s.import_date}_${s.customer_id}`;
        if (!custMap.has(key)) custMap.set(key, []);
        custMap.get(key).push(s);
      }
      const customers = [...custMap.entries()].map(([key, list]) => ({
        key,
        date: list[0].import_date,
        custId: list[0].customer_id,
        customerCode: list[0].customer_code || '',
        customerName: list[0].customer_name || '',
        phone: list[0].customer_phone || '',
        batchStatus: list[0].batch_status || '',
        items: list.map((s) => ({
          tracking_no: s.tracking_no,
          product: s.product,
          weight: s.weight,
          customer_fee: s.phi_vc,
        })),
      }));
      setBulkModal({ startDate, endDate, customers, loading: false });
    } catch {
      showToast('Lỗi tải dữ liệu lô hàng');
      setBulkModal({ startDate, endDate, customers: [], loading: false });
    }
  }

  async function openBulkReport() {
    if (!settingsData) {
      try {
        const r = await axios.get('/api/settings');
        setSettingsData(r.data);
      } catch { /* ignore, template falls back to defaults */ }
    }
    const today = todayStr();
    loadBulkReportRange(today, today);
  }

  function confirmBulkReport() {
    const { customers } = bulkModal;
    const pending = customers.filter((c) => !c.batchStatus && c.phone);
    const skippedNoPhone = customers.filter((c) => !c.batchStatus && !c.phone).length;
    const alreadyReported = customers.filter((c) => c.batchStatus).length;
    setBulkModal(null);
    if (!pending.length) {
      showToast('Không có khách nào cần báo hàng');
      return;
    }
    setBulkRun({ list: pending, index: 0, sent: 0, failed: 0, skippedNoPhone, alreadyReported });
  }

  async function handleBulkRendered(dataUrl) {
    const cust = bulkRun.list[bulkRun.index];
    let ok = false;
    if (dataUrl) {
      try {
        const bassoUser = getBassoUser();
        await axios.post('/api/shipments/batch/send-zalo', {
          batch_date: cust.date,
          customer_id: cust.custId,
          type: 'arrival',
          image: { name: `thong-bao-${cust.customerCode || 'kh'}-${cust.date}.png`, dataBase64: dataUrl },
          sent_by: bassoUser?.name || bassoUser?.username || null,
        });
        ok = true;
      } catch { /* count as failed below */ }
    }
    const nextIndex = bulkRun.index + 1;
    const sent = bulkRun.sent + (ok ? 1 : 0);
    const failed = bulkRun.failed + (ok ? 0 : 1);
    if (nextIndex >= bulkRun.list.length) {
      const parts = [`${sent} thành công`];
      if (failed) parts.push(`${failed} lỗi`);
      if (bulkRun.skippedNoPhone) parts.push(`${bulkRun.skippedNoPhone} thiếu SĐT`);
      showToast(`Báo hàng loạt: ${parts.join(', ')}`);
      setBulkRun(null);
      fetchShipments();
    } else {
      setBulkRun({ ...bulkRun, index: nextIndex, sent, failed });
    }
  }

  function openShipMsg(cust) {
    setShipMsgData({
      custId: cust.id,
      dateKey: cust.dateKey ?? batchDate,
      van_don_code: cust.van_don_code || '',
      customerName: cust.name,
      text: buildShipText(cust.name, cust.van_don_code),
    });
  }

  function sendShipMsg() {
    const { custId, dateKey, van_don_code, text, customerName } = shipMsgData;
    showToast(`Đang gửi Zalo cho ${customerName}…`);
    const bassoUser = getBassoUser();
    setShipMsgData(null);
    (async () => {
      try {
        await axios.put('/api/shipments/batch', {
          batch_date: dateKey,
          customer_id: custId,
          van_don_code,
        });
        await axios.post('/api/shipments/batch/send-zalo', {
          batch_date: dateKey,
          customer_id: custId,
          type: 'shipped',
          message: text,
          sent_by: bassoUser?.name || bassoUser?.username || null,
        });
        showToast(`✓ Đã gửi Zalo cho ${customerName}`);
        fetchShipments();
      } catch {
        showToast('Lỗi gửi Zalo');
      }
    })();
  }

  async function saveVanDon() {
    if (!vanDonData) return;
    const dateKey = vanDonData.cust.dateKey ?? batchDate;
    try {
      await axios.put('/api/shipments/batch', {
        batch_date: dateKey,
        customer_id: vanDonData.cust.id,
        van_don_code: vanDonData.code,
      });
      setVanDonData(null);
      fetchShipments();
      openShipMsg({ ...vanDonData.cust, van_don_code: vanDonData.code });
    } catch {
      showToast('Lỗi lưu mã vận đơn');
    }
  }

  function openPay(cust) {
    setPayTarget({ custId: cust.id, name: cust.name, fee: cust.fee, batchDate: cust.dateKey ?? batchDate });
    setPayMethod('bank');
    setPayOpen(true);
  }

  async function confirmPay() {
    if (!payTarget) return;
    try {
      await axios.post('/api/transactions/payment', {
        customer_id: payTarget.custId,
        payment_date: todayStr(),
        amount: payTarget.fee,
        content: `Thanh toán phí VC`,
        reference_batch_date: payTarget.batchDate,
      });
      showToast(`✓ Đã ghi nhận ${fmt(payTarget.fee)} đ`);
      setPayOpen(false);
      setPayTarget(null);
      fetchShipments();
      fetchTransactions();
    } catch {
      showToast('Lỗi ghi nhận thanh toán');
    }
  }

  async function handleCustPay() {
    if (!custDetail) return;
    const due = custDetail.stats?.remaining || 0;
    setPayTarget({ custId: custDetail.id, name: custDetail.name, fee: Math.round(due), batchDate });
    setPayMethod('bank');
    setPayOpen(true);
  }

  async function saveRowVanDon() {
    if (!rowVanDon) return;
    try {
      await axios.patch(`/api/shipments/${rowVanDon.id}/van-don`, { van_don_code: rowVanDon.code });
      const upd = (s) => s.id === rowVanDon.id ? { ...s, shipment_van_don_code: rowVanDon.code || null } : s;
      setHangShips((prev) => prev.map(upd));
      setCustParcels((prev) => prev.map(upd));
      setRowVanDon(null);
      showToast('Đã lưu mã vận đơn');
    } catch { showToast('Lỗi lưu mã vận đơn'); }
  }

  async function saveRowEdit(id) {
    try {
      const res = await axios.put(`/api/shipments/${id}`, rowEditVals);
      const upd = (s) => s.id === id ? { ...s, ...res.data } : s;
      setHangShips((prev) => prev.map(upd));
      setCustParcels((prev) => prev.map(upd));
      setRowEditId(null);
      setRowEditModal(false);
      showToast('Đã cập nhật');
    } catch { showToast('Lỗi cập nhật'); }
  }

  async function deleteRow(id) {
    if (!window.confirm('Xóa kiện hàng này?')) return;
    setRowDelId(id);
    try {
      await axios.delete(`/api/shipments/${id}`);
      setHangShips((prev) => prev.filter((s) => s.id !== id));
      setCustParcels((prev) => prev.filter((s) => s.id !== id));
      showToast('Đã xóa');
    } catch { showToast('Lỗi xóa'); }
    finally { setRowDelId(null); }
  }

  function openRowEdit(p) {
    setRowEditId(p.id);
    setRowEditVals({ tracking_no: p.tracking_no || '', product: p.product || '', weight: p.weight, surcharge: p.surcharge, notes: p.notes || '' });
    setRowEditModal(true);
  }

  // ── CSS: card surface ────────────────────────────────────────────────────
  const cardStyle = {
    background: 'var(--sf)',
    border: '1px solid var(--ln)',
    borderRadius: 20,
    backdropFilter: 'blur(18px) saturate(1.25)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.25)',
  };

  const btnPrimary = {
    appearance: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    height: 44,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--onbtn)',
    background: 'var(--btn)',
    border: 0,
  };

  const btnSecondary = {
    appearance: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    height: 44,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--tx)',
    background: 'var(--sf2)',
    border: '1px solid var(--ln)',
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderDash() {
    const paidStr = `${paidCount}/${batchCustomers.length} khách đã thanh toán`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'dcFade 240ms ease both' }}>
        {/* KPI tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <div style={{ ...cardStyle, padding: 15 }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)' }}>Chưa thu</div>
            <div style={{ font: '700 19px "JetBrains Mono",monospace', color: 'var(--warnTx)', marginTop: 8 }}>{fmt(dueFee)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 4 }}>đồng</div>
          </div>
          <div style={{ ...cardStyle, padding: 15 }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)' }}>Đã thu</div>
            <div style={{ font: '700 19px "JetBrains Mono",monospace', color: 'var(--ac)', marginTop: 8 }}>{fmt(paidFee)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 4 }}>đồng</div>
          </div>
        </div>

        {/* Action tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <Btn onClick={() => { setPayFilter('none'); nav('hang'); }} style={{
            textAlign: 'left', padding: 14, ...cardStyle,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                width: 32, height: 32, borderRadius: 11, display: 'grid', placeItems: 'center',
                background: 'var(--badBg)', color: 'var(--badTx)', fontWeight: 800, fontSize: 13,
                font: '800 13px "JetBrains Mono",monospace',
              }}>{unpaidCount}</span>
              <span style={{ color: 'var(--mu)' }}><IcoChevR /></span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', marginTop: 10 }}>Chưa thanh toán</div>
            <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 2 }}>Cần thu tiền</div>
          </Btn>
          <Btn onClick={() => nav('hang')} style={{ textAlign: 'left', padding: 14, ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                width: 32, height: 32, borderRadius: 11, display: 'grid', placeItems: 'center',
                background: 'var(--warnBg)', color: 'var(--warnTx)', fontWeight: 800,
                font: '800 13px "JetBrains Mono",monospace',
              }}>{notNotified}</span>
              <span style={{ color: 'var(--mu)' }}><IcoChevR /></span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', marginTop: 10 }}>Chưa báo hàng</div>
            <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 2 }}>Nhắn Zalo cho khách</div>
          </Btn>
        </div>

        {/* Top customers */}
        <div style={{ ...cardStyle, padding: '16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 12px' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>Top khách trong đợt</span>
            <span style={{ fontSize: 10.5, color: 'var(--mu)' }}>Theo doanh thu</span>
          </div>
          {top5.map((c, i) => {
            const isFirst = i === 0;
            return (
              <Btn key={c.id} onClick={() => openCust(c.id)} style={{
                background: 'none', border: 0, textAlign: 'left', width: '100%',
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 2px', borderTop: '1px solid var(--ln2)',
              }}>
                <span style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: 9, display: 'grid', placeItems: 'center',
                  font: '800 11px "JetBrains Mono",monospace',
                  color: isFirst ? 'var(--onbtn)' : 'var(--tx2)',
                  background: isFirst ? 'var(--ac)' : 'var(--sf2)',
                }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--mu)', marginTop: 2 }}>{c.code} · {c.parcels.length} kiện</span>
                </span>
                <span style={{ flexShrink: 0, font: '700 12.5px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{fmt(c.fee)}</span>
              </Btn>
            );
          })}
          {top5.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--mu)', textAlign: 'center', padding: '12px 0' }}>Chưa có dữ liệu</div>
          )}
        </div>
      </div>
    );
  }

  function renderHang() {
    const allCustomers = hangDateGroups.flatMap((g) => g.customers);
    const shownFee  = allCustomers.reduce((s, c) => s + c.fee, 0);
    const shownKiel = allCustomers.reduce((s, c) => s + c.parcels.length, 0);
    const shownKg   = allCustomers.reduce((s, c) => s + c.kg, 0);

    const PAY_FILTERS = [
      { key: 'all',  label: 'Tất cả'    },
      { key: 'none', label: 'Chưa TT'  },
      { key: 'part', label: 'Một phần' },
      { key: 'paid', label: 'Đã TT'    },
    ];
    const STATUS_FILTERS = [
      { key: 'all',        label: 'Tất cả trạng thái' },
      { key: '',           label: 'Chưa báo'           },
      { key: 'Đã báo hàng', label: 'Đã báo hàng'       },
      { key: 'Đã báo ship', label: 'Đã báo ship'        },
    ];

    function CustomerCard({ c }) {
      const ns  = notifyState[c.id] ?? c.notifyStatus;
      const nui = notifyUI(ns);
      const pui = paidUI(c.paidStatus);
      const cardKey = `${c.dateKey}_${c.id}`;
      const isOpen  = openCards[cardKey];
      return (
        <div style={{
          padding: 14, borderRadius: 20,
          background: isOpen ? 'rgba(58,175,211,.09)' : 'var(--sf)',
          border: '1px solid var(--ln)',
        }}>
          <div onClick={() => setOpenCards((s) => ({ ...s, [cardKey]: !s[cardKey] }))} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer' }}>
            <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, color: 'var(--onbtn)', background: 'var(--btn)' }}>
              {initial(c.name)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ display: 'block', font: '500 10px "JetBrains Mono",monospace', color: 'var(--mu)', marginTop: 3 }}>{c.code} · {c.parcels.length} kiện</span>
            </span>
            <span style={{ flexShrink: 0, textAlign: 'right' }}>
              <span style={{ display: 'block', font: '700 14px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{fmt(c.fee)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: pui.bg, color: pui.color }}>
                <span style={{ width: 5, height: 5, borderRadius: 5, background: pui.dot }} />
                {pui.label}
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
            <span style={{ padding: '5px 9px', borderRadius: 10, font: '600 10.5px "JetBrains Mono",monospace', background: 'var(--sf2)', color: 'var(--tx2)' }}>{fmtKg(c.kg)} kg</span>
            <span style={{ padding: '5px 9px', borderRadius: 10, font: '600 10.5px "JetBrains Mono",monospace', background: 'var(--sf2)', color: 'var(--tx2)' }}>{fmt(c.rate)} đ/kg</span>
            <select
              value={ns || 'Chưa báo'}
              onChange={(e) => { e.stopPropagation(); handleNotify(c, e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '5px 9px', borderRadius: 10, fontSize: 10.5, fontWeight: 700, background: nui.bg, border: `1px solid ${nui.border}`, color: nui.color, outline: 'none', cursor: 'pointer' }}
            >
              <option value="Chưa báo">Chưa báo</option>
              <option value="Đã báo hàng">Đã báo hàng</option>
              <option value="Đã báo ship">Đã báo ship</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {c.paidStatus !== 'paid' && (
              <Btn onClick={() => openPay(c)} style={{ flex: 1, height: 40, borderRadius: 13, fontSize: 12, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0 }}>Thanh toán</Btn>
            )}
            <Btn onClick={() => handleBaoHang(c)} style={{ flex: 1, height: 40, borderRadius: 13, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Báo hàng</Btn>
            <Btn onClick={() => openShipMsg(c)} style={{ flex: 1, height: 40, borderRadius: 13, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Báo ship</Btn>
            <Btn onClick={() => setVanDonData({ cust: c, code: c.van_don_code || '' })} style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center',
              color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)',
            }} title="Mã vận đơn (đợt)"><IcoTruck /></Btn>
            <Btn onClick={() => setOpenCards((s) => ({ ...s, [cardKey]: !s[cardKey] }))} style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center',
              color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)',
              transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease',
            }}><IcoChevR /></Btn>
          </div>
          {isOpen && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--ln2)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8, animation: 'dcFade 200ms ease both' }}>
              {c.parcels.map((p) => (
                <div key={p.id} style={{ padding: '9px 11px', borderRadius: 13, background: 'var(--sunk)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flexShrink: 0, padding: '3px 7px', borderRadius: 8, font: '700 9.5px "JetBrains Mono",monospace', background: 'var(--acBg)', color: 'var(--ac)' }}>{p.warehouse_code || 'WH'}</span>
                    <span style={{ flex: 1, minWidth: 0, font: '500 10.5px "JetBrains Mono",monospace', color: 'var(--tx2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.tracking_no || '—'}</span>
                    <span style={{ flexShrink: 0, font: '600 10.5px "JetBrains Mono",monospace', color: 'var(--mu)' }}>{fmtKg(Math.max(0.5, p.weight))} kg</span>
                    <span style={{ flexShrink: 0, font: '700 11px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{fmt(p.phi_vc || (Math.max(0.5, p.weight) * p.customer_rate + (p.surcharge || 0)))}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 7, justifyContent: 'flex-end' }}>
                    <Btn onClick={() => setRowVanDon({ id: p.id, tracking_no: p.tracking_no, code: p.shipment_van_don_code || '' })} style={{
                      width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', border: '1px solid var(--ln)',
                      background: p.shipment_van_don_code ? 'var(--acBg)' : 'var(--sf2)',
                      color: p.shipment_van_don_code ? 'var(--ac)' : 'var(--tx2)',
                    }} title="Mã vận đơn kiện"><IcoTruck /></Btn>
                    <Btn onClick={() => openRowEdit(p)} style={{
                      width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                      background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx2)',
                    }} title="Sửa"><IcoEdit /></Btn>
                    <Btn onClick={() => deleteRow(p.id)} disabled={rowDelId === p.id} style={{
                      width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                      background: 'var(--badBg)', border: '1px solid var(--badLn)', color: 'var(--badTx)',
                      opacity: rowDelId === p.id ? 0.5 : 1,
                    }} title="Xóa"><IcoTrash /></Btn>
                  </div>
                </div>
              ))}
              <Btn onClick={() => openCust(c.id)} style={{ height: 38, borderRadius: 12, fontSize: 12, fontWeight: 700, color: 'var(--ac)', background: 'var(--acBg)', border: '1px solid var(--acLn)' }}>
                Xem hồ sơ khách
              </Btn>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'dcFade 240ms ease both' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', height: 44, borderRadius: 15, background: 'var(--sunk)', border: '1px solid var(--ln2)', color: 'var(--mu)' }}>
            <IcoSearch />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên, mã KH, tracking…"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, color: 'var(--tx)', fontSize: 13, fontFamily: 'inherit' }}
            />
          </div>
          <Btn onClick={openBulkReport} style={{
            flexShrink: 0, height: 44, padding: '0 14px', borderRadius: 15, fontSize: 12, fontWeight: 700,
            color: 'var(--onbtn)', background: 'var(--btn)', border: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <IcoZalo />Báo loạt
          </Btn>
        </div>

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Btn onClick={() => { setHangPeriod('month'); try { hangMonthRef.current?.showPicker(); } catch {} }} style={{
              height: 34, padding: '0 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
              background: hangPeriod === 'month' ? 'var(--brand)' : 'var(--sf2)',
              color: hangPeriod === 'month' ? '#fff' : 'var(--mu)',
            }}>
              {hangPeriod === 'month' ? dayjs(hangMonth).format('MM/YYYY') : 'Tháng'}
            </Btn>
            <input
              ref={hangMonthRef}
              type="month"
              value={hangMonth}
              onChange={(e) => { setHangMonth(e.target.value); setHangPeriod('month'); }}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, top: '100%', left: 0 }}
            />
          </div>
          <Btn onClick={() => setHangPeriod('all')} style={{
            flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
            background: hangPeriod === 'all' ? 'var(--brand)' : 'var(--sf2)',
            color: hangPeriod === 'all' ? '#fff' : 'var(--mu)',
          }}>Tất cả</Btn>
          <div style={{ width: 1, height: 20, background: 'var(--ln)', flexShrink: 0 }} />
          {PAY_FILTERS.map((f) => (
            <Btn key={f.key} onClick={() => setPayFilter(f.key)} style={{
              flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
              background: payFilter === f.key ? 'var(--navOn)' : 'var(--sf2)',
              color: payFilter === f.key ? '#fff' : 'var(--mu)',
            }}>{f.label}</Btn>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--ln)', flexShrink: 0 }} />
          <select
            value={hangStatusFilter}
            onChange={(e) => setHangStatusFilter(e.target.value)}
            style={{ flexShrink: 0, height: 34, padding: '0 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, border: '1px solid var(--ln)', background: hangStatusFilter !== 'all' ? 'var(--acBg)' : 'var(--sf2)', color: hangStatusFilter !== 'all' ? 'var(--ac)' : 'var(--tx2)', outline: 'none', cursor: 'pointer' }}
          >
            {STATUS_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: 11, color: 'var(--mu)' }}>
          <span>{hangDateGroups.length} đợt · {allCustomers.length} khách · {shownKiel} kiện · {fmtKg(shownKg)} kg</span>
          <span style={{ font: '700 11.5px "JetBrains Mono",monospace', color: 'var(--tx2)' }}>{fmt(shownFee)} đ</span>
        </div>

        {/* Date groups */}
        {hangDateGroups.map(({ dateKey, customers }) => (
          <div key={dateKey}>
            {/* Date header */}
            <Btn onClick={() => setHangCollapsed((s) => ({ ...s, [dateKey]: !s[dateKey] }))} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 13,
              background: 'var(--acBg)', border: '1px solid var(--acLn)', marginBottom: 8, textAlign: 'left',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ac)' }}>Đợt {fmtDate(dateKey)}</span>
              <span style={{ fontSize: 11, color: 'var(--mu)' }}>{customers.length} khách · {customers.reduce((s, c) => s + c.parcels.length, 0)} kiện</span>
              <span style={{ marginLeft: 'auto', font: '700 11.5px "JetBrains Mono",monospace', color: 'var(--tx2)' }}>{fmt(customers.reduce((s, c) => s + c.fee, 0))} đ</span>
              <span style={{ transform: hangCollapsed[dateKey] ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 200ms', color: 'var(--ac)' }}><IcoChevR /></span>
            </Btn>
            {!hangCollapsed[dateKey] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customers.map((c) => <CustomerCard key={`${dateKey}_${c.id}`} c={c} />)}
              </div>
            )}
          </div>
        ))}
        {hangDateGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--mu)' }}>Không có kết quả</div>
        )}
        <div style={{ height: 80 }} />
      </div>
    );
  }

  function renderTx() {
    const PERIODS_LIST = [
      { key: 'month', label: 'Trong tháng' },
      { key: 'all',   label: 'Tất cả'      },
    ];
    const txDue = Math.max(0, batchCustomers.reduce((s, c) => s + c.fee, 0) - txPaid);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'dcFade 240ms ease both' }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)' }}>Tổng thu</div>
            <div style={{ font: '700 17px "JetBrains Mono",monospace', color: 'var(--ac)', marginTop: 7 }}>{fmt(txPaid)}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)' }}>Còn phải thu</div>
            <div style={{ font: '700 17px "JetBrains Mono",monospace', color: 'var(--warnTx)', marginTop: 7 }}>{fmt(dueFee)}</div>
          </div>
        </div>
        {/* Period chips */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
          {PERIODS_LIST.map((p) => (
            <Btn key={p.key} onClick={() => setPeriod(p.key)} style={{
              flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
              background: period === p.key ? 'var(--navOn)' : 'var(--sf2)',
              color: period === p.key ? '#fff' : 'var(--mu)',
            }}>{p.label}</Btn>
          ))}
        </div>
        <div style={{ padding: '0 4px', fontSize: 11, color: 'var(--mu)' }}>
          {txFiltered.length} giao dịch · {period === 'month' ? 'Trong tháng' : 'Tất cả'}
        </div>
        {/* Transaction list */}
        {txFiltered.map((t) => (
          <Btn key={t.id || t.key} onClick={() => t.customer_id && openCust(t.customer_id)} style={{
            textAlign: 'left', width: '100%', padding: '13px 14px', borderRadius: 18, ...cardStyle,
            display: 'flex', alignItems: 'flex-start', gap: 11,
          }}>
            <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--okBg)', color: 'var(--okTx)', fontWeight: 800, fontSize: 15 }}>↓</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.customer_name || '—'}</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--mu)', marginTop: 3 }}>{fmtDate(t.trans_date)} · Chuyển khoản</span>
            </span>
            <span style={{ flexShrink: 0, textAlign: 'right' }}>
              <span style={{ display: 'block', font: '700 13px "JetBrains Mono",monospace', color: 'var(--ac)' }}>+{fmt(t.thu)}</span>
              <span style={{ display: 'inline-block', marginTop: 5, padding: '3px 8px', borderRadius: 20, fontSize: 9.5, fontWeight: 700, background: 'var(--okBg)', color: 'var(--okTx)' }}>Đã thu</span>
            </span>
          </Btn>
        ))}
        {txFiltered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--mu)' }}>Không có giao dịch</div>
        )}
      </div>
    );
  }

  function renderKhach() {
    const TIER_LIST = [
      { key: 'all',  label: 'Tất cả'      },
      { key: 'le',   label: 'Khách lẻ'   },
      { key: 'buon', label: 'Khách buôn' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'dcFade 240ms ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', height: 44, borderRadius: 15, background: 'var(--sunk)', border: '1px solid var(--ln2)', color: 'var(--mu)' }}>
          <IcoSearch />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm khách, mã KH, số điện thoại…"
            style={{ flex: 1, minWidth: 0, background: 'none', border: 0, color: 'var(--tx)', fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
          {TIER_LIST.map((f) => (
            <Btn key={f.key} onClick={() => setTierFilter(f.key)} style={{
              flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
              background: tierFilter === f.key ? 'var(--navOn)' : 'var(--sf2)',
              color: tierFilter === f.key ? '#fff' : 'var(--mu)',
            }}>{f.label}</Btn>
          ))}
        </div>
        <div style={{ padding: '0 4px', fontSize: 11, color: 'var(--mu)' }}>
          Hiển thị {khachList.length} / {customers.length} khách
        </div>
        {khachList.map((c) => {
          const tui = tierUI(c.rate_name);
          return (
            <Btn key={c.id} onClick={() => openCust(c.id)} style={{
              textAlign: 'left', width: '100%', padding: '12px 13px', borderRadius: 18, ...cardStyle,
              display: 'flex', alignItems: 'center', gap: 11,
            }}>
              <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: 'var(--tx)', background: 'var(--sf2)' }}>
                {initial(c.name)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ display: 'block', font: '500 10px "JetBrains Mono",monospace', color: 'var(--mu)', marginTop: 3 }}>{c.code}</span>
              </span>
              <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 9.5, fontWeight: 700, background: tui.bg, border: `1px solid ${tui.border}`, color: tui.color }}>{c.rate_name || 'Khách lẻ'}</span>
                <span style={{ font: '500 10px "JetBrains Mono",monospace', color: 'var(--mu)' }}>{c.phone || '—'}</span>
              </span>
            </Btn>
          );
        })}
      </div>
    );
  }

  function renderCust() {
    if (!custDetail) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: 'var(--mu)', fontSize: 13 }}>
          Đang tải...
        </div>
      );
    }
    const cd = custDetail;
    const stats = cd.stats || {};
    const due   = Math.round(stats.remaining || 0);
    const paid  = Math.round(stats.paid || 0);
    const allParcels = custParcels;
    const allBatches = [...new Set(allParcels.map((p) => p.import_date))];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'dcFade 240ms ease both' }}>
        {/* Hero card */}
        <div style={{ padding: 18, borderRadius: 22, background: 'linear-gradient(150deg,rgba(58,175,211,.22),rgba(58,175,211,.04))', border: '1px solid var(--acLn)', display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 18, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, color: 'var(--onbtn)', background: 'var(--btn)' }}>{initial(cd.name)}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>{cd.name}</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--tx2)', marginTop: 4 }}>{cd.rate_name || 'Khách lẻ'} · {fmt(cd.rate_per_kg)} đ/kg</span>
            <span style={{ display: 'block', font: '500 11px "JetBrains Mono",monospace', color: 'var(--mu)', marginTop: 3 }}>{cd.phone || cd.code}</span>
          </span>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          {[
            { val: fmtKg(stats.total_kg),    label: 'kg'   },
            { val: stats.shipped_count || 0,  label: 'kiện' },
            { val: allBatches.length,          label: 'đợt'  },
          ].map((s) => (
            <div key={s.label} style={{ ...cardStyle, padding: 12, textAlign: 'center' }}>
              <div style={{ font: '700 15px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{s.val}</div>
              <div style={{ fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Debt card */}
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--mu)' }}>Còn phải thu</span>
            <span style={{ fontSize: 11, color: 'var(--mu)' }}>Đã thu</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ font: '700 20px "JetBrains Mono",monospace', color: 'var(--warnTx)' }}>{fmt(due)}</span>
            <span style={{ font: '700 14px "JetBrains Mono",monospace', color: 'var(--ac)' }}>{fmt(paid)}</span>
          </div>
          {due > 0 && (
            <Btn onClick={handleCustPay} style={{ ...btnPrimary, width: '100%', marginTop: 14 }}>Ghi nhận thanh toán</Btn>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 15, background: 'var(--sunk)' }}>
          {[{ k: 'tx', l: 'Giao dịch' }, { k: 'pc', l: 'Kiện hàng' }].map((t) => (
            <Btn key={t.k} onClick={() => setCustTab(t.k)} style={{
              flex: 1, height: 36, borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
              background: custTab === t.k ? 'var(--tx)' : 'none',
              color: custTab === t.k ? 'var(--onbtn)' : 'var(--mu)',
            }}>{t.l}</Btn>
          ))}
        </div>

        {/* Tab: Giao dịch */}
        {custTab === 'tx' && custTxRows.map((t) => (
          <div key={t.id} style={{ padding: '13px 14px', borderRadius: 18, ...cardStyle, display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>Thanh toán phí VC</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--mu)', marginTop: 3 }}>{fmtDate(t.trans_date)} · {t.description || ''}</span>
            </span>
            <span style={{ flexShrink: 0, textAlign: 'right' }}>
              <span style={{ display: 'block', font: '700 12.5px "JetBrains Mono",monospace', color: 'var(--ac)' }}>+{fmt(t.credit)}</span>
              <span style={{ display: 'inline-block', marginTop: 5, padding: '3px 8px', borderRadius: 20, fontSize: 9.5, fontWeight: 700, background: 'var(--okBg)', color: 'var(--okTx)' }}>Đã thu</span>
            </span>
          </div>
        ))}
        {custTab === 'tx' && custTxRows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--mu)' }}>Chưa có giao dịch</div>
        )}

        {/* Tab: Kiện hàng */}
        {custTab === 'pc' && allParcels.map((p) => (
          <div key={p.id} style={{ padding: '11px 13px', borderRadius: 16, ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flexShrink: 0, padding: '3px 7px', borderRadius: 8, font: '700 9.5px "JetBrains Mono",monospace', background: 'var(--acBg)', color: 'var(--ac)' }}>{p.warehouse_code || 'WH'}</span>
              <span style={{ flex: 1, minWidth: 0, font: '500 10.5px "JetBrains Mono",monospace', color: 'var(--tx2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.tracking_no || '—'}</span>
              <span style={{ flexShrink: 0, font: '600 10.5px "JetBrains Mono",monospace', color: 'var(--mu)' }}>{fmtKg(Math.max(0.5, p.weight))} kg</span>
              <span style={{ flexShrink: 0, font: '700 11px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{fmt(p.phi_vc || (Math.max(0.5, p.weight) * p.customer_rate))}</span>
            </div>
            {p.product && <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--mu)', paddingLeft: 2 }}>{p.product}</div>}
            {p.import_date && <div style={{ marginTop: 3, fontSize: 10, color: 'var(--mu)', paddingLeft: 2 }}>Nhập kho: {fmtDate(p.import_date)}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setRowVanDon({ id: p.id, tracking_no: p.tracking_no, code: p.shipment_van_don_code || '' })} style={{
                width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', border: '1px solid var(--ln)',
                background: p.shipment_van_don_code ? 'var(--acBg)' : 'var(--sf2)',
                color: p.shipment_van_don_code ? 'var(--ac)' : 'var(--tx2)',
              }} title="Mã vận đơn"><IcoTruck /></Btn>
              <Btn onClick={() => openRowEdit(p)} style={{
                width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx2)',
              }} title="Sửa"><IcoEdit /></Btn>
              <Btn onClick={() => deleteRow(p.id)} disabled={rowDelId === p.id} style={{
                width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: 'var(--badBg)', border: '1px solid var(--badLn)', color: 'var(--badTx)',
                opacity: rowDelId === p.id ? 0.5 : 1,
              }} title="Xóa"><IcoTrash /></Btn>
            </div>
          </div>
        ))}
        {custTab === 'pc' && allParcels.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--mu)' }}>Chưa có kiện hàng</div>
        )}
      </div>
    );
  }

  function renderRev() {
    const byCustomer = revData?.by_customer || [];
    const bySale = revData?.by_sale || [];
    const cskhRow = revData?.cskh_row || null;
    const loading = revData === undefined;
    const custTotals = byCustomer.reduce((a, r) => ({
      fee: a.fee + (r.total_vc_fee || 0),
      sale: a.sale + (r.profit_sale || 0),
      cskh: a.cskh + (r.profit_cskh || 0),
    }), { fee: 0, sale: 0, cskh: 0 });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'dcFade 240ms ease both' }}>
        {/* Month picker */}
        <input
          type="month"
          value={revMonth}
          onChange={(e) => { setRevMonth(e.target.value); setRevData(undefined); }}
          style={{ height: 44, borderRadius: 15, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 13, fontFamily: 'inherit', padding: '0 14px' }}
        />
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 15, background: 'var(--sunk)' }}>
          {[{ k: 'customer', l: 'Khách hàng' }, { k: 'sale', l: 'Nhân viên' }].map((t) => (
            <Btn key={t.k} onClick={() => setRevTab(t.k)} style={{
              flex: 1, height: 36, borderRadius: 12, fontSize: 12, fontWeight: 700, border: 0,
              background: revTab === t.k ? 'var(--tx)' : 'none',
              color: revTab === t.k ? 'var(--onbtn)' : 'var(--mu)',
            }}>{t.l}</Btn>
          ))}
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--mu)' }}>Đang tải...</div>}
        {/* Tab: Khách hàng */}
        {!loading && revTab === 'customer' && (
          <>
            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ ...cardStyle, padding: 13 }}>
                <div style={{ fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)' }}>Tổng phí VC</div>
                <div style={{ font: '700 15px "JetBrains Mono",monospace', color: 'var(--tx)', marginTop: 7 }}>{fmt(Math.round(custTotals.fee))}</div>
              </div>
              <div style={{ ...cardStyle, padding: 13 }}>
                <div style={{ fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)' }}>Profit SALE</div>
                <div style={{ font: '700 15px "JetBrains Mono",monospace', color: 'var(--ac)', marginTop: 7 }}>{fmt(Math.round(custTotals.sale))}</div>
              </div>
            </div>
            {byCustomer.length === 0
              ? <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--mu)' }}>Không có dữ liệu tháng này</div>
              : byCustomer.map((r) => (
                <div key={r.id} style={{ ...cardStyle, padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>{r.customer_code}</div>
                      {r.customer_name && <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 2 }}>{r.customer_name}</div>}
                      <div style={{ fontSize: 10.5, color: 'var(--tx2)', marginTop: 4 }}>NV: {r.sale_name || 'Chưa gán'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ font: '700 12.5px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{fmt(r.total_vc_fee)}</div>
                      <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 3 }}>{Number(r.total_weight || 0).toFixed(2)} kg</div>
                      <div style={{ font: '600 10.5px "JetBrains Mono",monospace', color: 'var(--ac)', marginTop: 3 }}>P.SALE: {fmt(r.profit_sale)}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </>
        )}
        {/* Tab: Nhân viên */}
        {!loading && revTab === 'sale' && (
          <>
            {bySale.length === 0 && !cskhRow
              ? <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--mu)' }}>Không có dữ liệu tháng này</div>
              : [...bySale, ...(cskhRow ? [{ ...cskhRow, _isCskh: true }] : [])].map((r) => (
                <div key={r.sale_username || '__cskh'} style={{
                  ...cardStyle, padding: '13px 14px',
                  ...(r._isCskh ? { background: 'var(--acBg)', border: '1px solid var(--acLn)' } : {}),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: r._isCskh ? 'var(--ac)' : 'var(--tx)' }}>{r.sale_name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 3 }}>{r.customer_count} KH · {Number(r.total_weight || 0).toFixed(2)} kg</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ font: '700 12.5px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{fmt(r.total_vc_fee)}</div>
                      <div style={{ font: '600 10.5px "JetBrains Mono",monospace', color: 'var(--ac)', marginTop: 3 }}>Profit: {fmt(r.profit)}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </>
        )}
      </div>
    );
  }

  async function handleSetSave() {
    if (!settingsModal || settingsSaving) return;
    setSettingsSaving(true);
    try {
      const { type, data, isNew } = settingsModal;
      if (type === 'rate') {
        if (isNew) await axios.post('/api/settings/rates', { name: data.name, rate_per_kg: Number(data.rate_per_kg) });
        else await axios.put(`/api/settings/rates/${data.id}`, { name: data.name, rate_per_kg: Number(data.rate_per_kg) });
      } else if (type === 'warehouse') {
        const wPayload = { code: data.code, name: data.name, aliases: data.aliases || '', rate_le: parseFloat(data.rate_le) || 0, rate_buon: parseFloat(data.rate_buon) || 0, rate_per_kg: parseFloat(data.rate_per_kg) || 0 };
        if (isNew) await axios.post('/api/settings/warehouses', wPayload);
        else await axios.put(`/api/settings/warehouses/${data.id}`, wPayload);
      } else if (type === 'bank') {
        if (isNew) await axios.post('/api/settings/bank-accounts', { bank_name: data.bank_name, account_number: data.account_number, account_name: data.account_name });
        else await axios.put(`/api/settings/bank-accounts/${data.id}`, { bank_name: data.bank_name, account_number: data.account_number, account_name: data.account_name });
      } else if (type === 'company') {
        await axios.post('/api/settings/company', { company_name: data.company_name, hotline: data.hotline, delivery_carrier: data.delivery_carrier });
      }
      const r = await axios.get('/api/settings');
      setSettingsData(r.data);
      setSettingsModal(null);
      showToast('Đã lưu');
    } catch { showToast('Lỗi lưu'); }
    finally { setSettingsSaving(false); }
  }

  async function handleSetDelete() {
    if (!settingsModal || settingsSaving) return;
    const { type, data } = settingsModal;
    setSettingsSaving(true);
    try {
      if (type === 'rate') await axios.delete(`/api/settings/rates/${data.id}`);
      else if (type === 'warehouse') await axios.delete(`/api/settings/warehouses/${data.id}`);
      else if (type === 'bank') await axios.delete(`/api/settings/bank-accounts/${data.id}`);
      const r = await axios.get('/api/settings');
      setSettingsData(r.data);
      setSettingsModal(null);
      showToast('Đã xóa');
    } catch { showToast('Lỗi xóa'); }
    finally { setSettingsSaving(false); }
  }

  function renderSet() {
    const sd = settingsData;
    if (!sd) return <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--mu)' }}>Đang tải...</div>;
    const rates = sd.rates || [];
    const warehouses = sd.warehouses || [];
    const bankAccounts = sd.bank_accounts || [];
    const company = sd.company || {};
    const Section = ({ title, onAdd, children }) => (
      <div style={{ ...cardStyle, padding: '14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ac)', fontWeight: 700 }}>{title}</div>
          {onAdd && <Btn onClick={onAdd} style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--acBg)', border: '1px solid var(--acLn)', color: 'var(--ac)' }}><IcoPlus /></Btn>}
        </div>
        {children}
      </div>
    );
    const editBtn = (item, type) => (
      <Btn onClick={() => setSettingsModal({ type, data: { ...item }, isNew: false })} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--mu)' }}><IcoEdit /></Btn>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'dcFade 240ms ease both' }}>
        {/* Công ty */}
        <Section title="Công ty">
          {[['Tên', company.company_name], ['Hotline', company.hotline], ['Đơn vị giao hàng', company.delivery_carrier]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid var(--ln2)' }}>
              <span style={{ fontSize: 12, color: 'var(--mu)' }}>{label}</span>
              <span style={{ font: '600 12px "JetBrains Mono",monospace', color: 'var(--tx)' }}>{val || '—'}</span>
            </div>
          ))}
          <Btn onClick={() => setSettingsModal({ type: 'company', data: { company_name: company.company_name || '', hotline: company.hotline || '', delivery_carrier: company.delivery_carrier || '' }, isNew: false })} style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 10, border: '1px solid var(--ln)', background: 'var(--sf2)', fontSize: 12, color: 'var(--tx)', fontWeight: 600, textAlign: 'center' }}>Sửa thông tin</Btn>
        </Section>
        {/* Kho (biểu phí KH lẻ/buôn nằm trong kho) */}
        <Section title="Kho" onAdd={() => setSettingsModal({ type: 'warehouse', data: { code: '', name: '', aliases: '', rate_le: '', rate_buon: '', rate_per_kg: '' }, isNew: true })}>
          {warehouses.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--mu)', paddingTop: 4 }}>Chưa có kho</div>
            : warehouses.map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--ln2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ font: '700 12px "JetBrains Mono",monospace', color: 'var(--ac)' }}>{w.code}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                    {w.rate_le > 0 && <span style={{ fontSize: 10.5, color: 'var(--mu)' }}>Lẻ: <span style={{ color: 'var(--tx2)' }}>{fmt(w.rate_le)}</span></span>}
                    {w.rate_buon > 0 && <span style={{ fontSize: 10.5, color: 'var(--mu)' }}>Buôn: <span style={{ color: 'var(--tx2)' }}>{fmt(w.rate_buon)}</span></span>}
                  </div>
                </div>
                {editBtn(w, 'warehouse')}
              </div>
            ))
          }
        </Section>
        {/* Tài khoản ngân hàng */}
        <Section title="Tài khoản ngân hàng" onAdd={() => setSettingsModal({ type: 'bank', data: { bank_name: '', account_number: '', account_name: '' }, isNew: true })}>
          {bankAccounts.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--mu)', paddingTop: 4 }}>Chưa có tài khoản</div>
            : bankAccounts.map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8, padding: '9px 0', borderTop: '1px solid var(--ln2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>{b.bank_name}</div>
                  <div style={{ font: '600 11.5px "JetBrains Mono",monospace', color: 'var(--ac)', marginTop: 3 }}>{b.account_number}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 2 }}>{b.account_name}</div>
                </div>
                {editBtn(b, 'bank')}
              </div>
            ))
          }
        </Section>
      </div>
    );
  }

  // ── App shell ──────────────────────────────────────────────────────────────
  const isCust = route === 'cust';
  const bg = theme === 'dark'
    ? 'radial-gradient(900px 560px at 6% -12%, rgba(58,175,211,.3), transparent 62%), radial-gradient(760px 520px at 96% 4%, rgba(33,128,158,.26), transparent 62%), radial-gradient(640px 620px at 58% 118%, rgba(58,175,211,.13), transparent 62%), #07161d'
    : 'radial-gradient(760px 420px at 4% -8%, rgba(58,175,211,.28), transparent 62%), radial-gradient(680px 460px at 100% 4%, rgba(33,128,158,.16), transparent 60%), linear-gradient(180deg,#f3f5f6,#e7ebee)';

  const currentNav = NAV_ITEMS.find((n) => n.key === route);
  const title = isCust && custDetail ? custDetail.name : currentNav?.label ?? 'ShipUS';

  return (
    <div style={{ minHeight: '100vh', background: bg, color: 'var(--tx)', fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Keyframe injector */}
      <style>{`
        @keyframes dcFade { from{opacity:0} to{opacity:1} }
        @keyframes dcPop { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes dcSheet { from{transform:translateY(100%)} to{transform:none} }
        @keyframes dcDrawer { from{transform:translateX(-100%)} to{transform:none} }
        input:focus { outline: none; }
        *::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'var(--sf)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--ln)',
      }}>
        <div style={{ padding: '6px 18px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {isCust ? (
            <Btn onClick={() => { setRoute(custFrom); setCustDetail(null); }} style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center',
              background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx)',
            }}><IcoBack /></Btn>
          ) : (
            <Btn onClick={() => setDrawerOpen(true)} style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center',
              background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx)',
            }}><IcoMenu /></Btn>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isCust && custDetail ? custDetail.name : title}
            </div>
            {isCust && custDetail && (
              <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {custDetail.code}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
            {isCust ? (
              <>
                <Btn style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--acBg)', border: '1px solid var(--acLn)', color: 'var(--ac)' }}>
                  <IcoPhone />
                </Btn>
                <Btn style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx2)' }}>
                  <IcoZalo />
                </Btn>
              </>
            ) : (
              <>
                <Btn onClick={toggleTheme} style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx2)' }}>
                  {theme === 'dark' ? <IcoMoon /> : <IcoSun />}
                </Btn>
                <a
                  href="https://ai.basso.vn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Basso"
                  style={{ width: 38, height: 38, borderRadius: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--acBg)', border: '1px solid var(--acLn)', color: 'var(--ac)', textDecoration: 'none' }}
                >
                  <IcoGrid />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
        {route === 'dash'  && renderDash()}
        {route === 'hang'  && renderHang()}
        {route === 'tx'    && renderTx()}
        {route === 'khach' && renderKhach()}
        {route === 'cust'  && renderCust()}
        {route === 'rev'   && renderRev()}
        {route === 'set'   && renderSet()}
      </div>

      {/* FAB for hang screen */}
      {route === 'hang' && (
        <button onClick={() => setImportOpen(true)} style={{
          position: 'fixed', zIndex: 8, right: 18, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 46px)',
          width: 56, height: 56, borderRadius: 20, appearance: 'none', border: 0, cursor: 'pointer',
          display: 'grid', placeItems: 'center', color: 'var(--onbtn)', background: 'var(--btn)',
          boxShadow: '0 22px 40px -14px rgba(58,175,211,.85)',
        }}>
          <IcoPlus />
        </button>
      )}

      {/* Home indicator */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(env(safe-area-inset-bottom, 0px) + 30px)', display: 'grid', placeItems: 'end center', paddingBottom: 6, pointerEvents: 'none', zIndex: 5 }}>
        <span style={{ width: 132, height: 5, borderRadius: 5, background: 'var(--tx)', opacity: 0.25 }} />
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', zIndex: 24, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{
            position: 'fixed', zIndex: 25, left: 0, top: 0, bottom: 0, width: 290,
            padding: '16px 14px 22px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: 16,
            background: 'var(--page-bg)', borderRight: '1px solid var(--ln)',
            boxShadow: '40px 0 70px -30px rgba(0,0,0,.75)',
            animation: 'dcDrawer 280ms cubic-bezier(.2,.9,.3,1) both',
          }}>
            {/* Logo + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)' }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'linear-gradient(150deg,rgba(58,175,211,.4),rgba(58,175,211,.08))', border: '1px solid rgba(58,175,211,.42)' }}>
                <img src={shipusLogo} alt="ShipUS" style={{ height: 28, width: 'auto', display: 'block' }} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, letterSpacing: '.06em', fontSize: 16, lineHeight: 1, color: 'var(--tx)' }}>
                  SHIP<span style={{ color: 'var(--brand)' }}>US</span>
                </div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--mu)', marginTop: 5 }}>Quản lý vận chuyển</div>
              </div>
              <Btn onClick={() => setDrawerOpen(false)} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx2)' }}>
                <IcoX />
              </Btn>
            </div>

            {/* Nav items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {NAV_ITEMS.map(({ key, label, Icon, badge }) => {
                const isActive = route === key || (key === 'khach' && route === 'cust');
                const badgeVal = badge === 'shipments' ? batchCustomers.length : badge === 'customers' ? customers.length : null;
                return (
                  <Btn key={key} onClick={() => nav(key)} style={{
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                    height: 50, padding: '0 14px', borderRadius: 15,
                    border: isActive ? '1px solid transparent' : '1px solid var(--ln)',
                    background: isActive ? 'linear-gradient(100deg,#1c7691,#2f9dbf)' : 'var(--sf2)',
                    color: isActive ? '#fff' : 'var(--tx2)',
                  }}>
                    <Icon />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{label}</span>
                    {badgeVal ? (
                      <span style={{ font: '700 10px "JetBrains Mono",monospace', padding: '3px 7px', borderRadius: 20, background: isActive ? 'rgba(255,255,255,.2)' : 'var(--sunk)', color: isActive ? '#fff' : 'var(--mu)' }}>
                        {badgeVal}
                      </span>
                    ) : null}
                  </Btn>
                );
              })}
            </div>

            {/* Bottom: user */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingTop: 12, borderTop: '1px solid var(--ln2)' }}>
                <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: 'var(--onbtn)', background: 'var(--btn)' }}>
                  {initial(username || 'A')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>{username || 'Admin'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--mu)' }}>Quản trị viên</div>
                </div>
                <Btn onClick={toggleTheme} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--tx2)' }}>
                  {theme === 'dark' ? <IcoMoon /> : <IcoSun />}
                </Btn>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Payment bottom sheet ── */}
      {payOpen && payTarget && (
        <>
          <div onClick={() => setPayOpen(false)} style={{ position: 'fixed', zIndex: 20, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{
            position: 'fixed', zIndex: 21, left: 0, right: 0, bottom: 0,
            padding: '10px 18px 30px', borderRadius: '28px 28px 0 0',
            background: 'var(--page-bg)', borderTop: '1px solid var(--ln)',
            boxShadow: '0 -30px 60px -20px rgba(0,0,0,.7)',
            animation: 'dcSheet 280ms cubic-bezier(.2,.9,.3,1) both',
          }}>
            <div style={{ display: 'grid', placeItems: 'center', paddingBottom: 14 }}>
              <span style={{ width: 42, height: 4.5, borderRadius: 5, background: 'var(--ln)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>Ghi nhận thanh toán</div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 4 }}>{payTarget.name}</div>
            <div style={{ marginTop: 14, padding: 16, borderRadius: 18, background: 'var(--acBg)', border: '1px solid var(--acLn)' }}>
              <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ac)' }}>Số tiền thu</div>
              <div style={{ font: '700 26px "JetBrains Mono",monospace', color: 'var(--tx)', marginTop: 6 }}>{fmt(payTarget.fee)} đ</div>
            </div>
            {/* Method chips */}
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              {[{ k: 'bank', l: 'Chuyển khoản' }, { k: 'cash', l: 'Tiền mặt' }].map((m) => (
                <Btn key={m.k} onClick={() => setPayMethod(m.k)} style={{
                  flex: 1, height: 44, borderRadius: 14, fontSize: 12.5, fontWeight: 700, border: 0,
                  background: payMethod === m.k ? 'var(--ac)' : 'var(--sf2)',
                  color: payMethod === m.k ? 'var(--onbtn)' : 'var(--tx2)',
                }}>{m.l}</Btn>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <Btn onClick={() => setPayOpen(false)} style={{ flexShrink: 0, padding: '0 20px', height: 48, borderRadius: 15, fontSize: 13, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Hủy</Btn>
              <Btn onClick={confirmPay} style={{ flex: 1, height: 48, borderRadius: 15, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0, boxShadow: '0 18px 34px -16px rgba(58,175,211,.9)' }}>Xác nhận đã thu</Btn>
            </div>
          </div>
        </>
      )}

      {/* ── Van Don Modal ── */}
      {vanDonData && (
        <>
          <div onClick={() => setVanDonData(null)} style={{ position: 'fixed', zIndex: 20, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{ position: 'fixed', zIndex: 21, left: 0, right: 0, bottom: 0, padding: '10px 18px 30px', borderRadius: '28px 28px 0 0', background: 'var(--page-bg)', borderTop: '1px solid var(--ln)', boxShadow: '0 -30px 60px -20px rgba(0,0,0,.7)', animation: 'dcSheet 280ms cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display: 'grid', placeItems: 'center', paddingBottom: 14 }}>
              <span style={{ width: 42, height: 4.5, borderRadius: 5, background: 'var(--ln)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>Mã vận đơn</div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 4 }}>{vanDonData.cust.name}</div>
            <input
              value={vanDonData.code}
              onChange={(e) => setVanDonData((d) => ({ ...d, code: e.target.value }))}
              placeholder="Nhập mã vận đơn..."
              style={{ width: '100%', marginTop: 14, height: 48, borderRadius: 15, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 15, fontFamily: '"JetBrains Mono", monospace', padding: '0 16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <Btn onClick={() => setVanDonData(null)} style={{ flexShrink: 0, padding: '0 20px', height: 48, borderRadius: 15, fontSize: 13, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Hủy</Btn>
              <Btn onClick={saveVanDon} style={{ flex: 1, height: 48, borderRadius: 15, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0 }}>Lưu & Báo ship</Btn>
            </div>
          </div>
        </>
      )}

      {/* ── Ship Msg Modal ── */}
      {shipMsgData && (
        <>
          <div onClick={() => setShipMsgData(null)} style={{ position: 'fixed', zIndex: 20, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{ position: 'fixed', zIndex: 21, left: 0, right: 0, bottom: 0, padding: '10px 18px 30px', borderRadius: '28px 28px 0 0', background: 'var(--page-bg)', borderTop: '1px solid var(--ln)', boxShadow: '0 -30px 60px -20px rgba(0,0,0,.7)', animation: 'dcSheet 280ms cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display: 'grid', placeItems: 'center', paddingBottom: 14 }}>
              <span style={{ width: 42, height: 4.5, borderRadius: 5, background: 'var(--ln)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>Báo ship – {shipMsgData.customerName}</div>
            <textarea
              value={shipMsgData.text}
              onChange={(e) => setShipMsgData((d) => ({ ...d, text: e.target.value }))}
              rows={8}
              style={{ width: '100%', marginTop: 14, borderRadius: 15, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 13, fontFamily: 'inherit', padding: '12px 16px', boxSizing: 'border-box', resize: 'none', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <Btn onClick={() => { navigator.clipboard.writeText(shipMsgData.text); showToast('✓ Đã copy nội dung'); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>
                <IcoCopy />Copy
              </Btn>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 10 }}>
              <Btn onClick={() => setShipMsgData(null)} style={{ flexShrink: 0, padding: '0 16px', height: 48, borderRadius: 15, fontSize: 13, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Đóng</Btn>
              <Btn onClick={sendShipMsg} style={{ flex: 1, height: 48, borderRadius: 15, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Gửi qua Zalo
              </Btn>
            </div>
          </div>
        </>
      )}

      {/* ── Bulk Report Modal ── */}
      {bulkModal && (
        <>
          <div onClick={() => setBulkModal(null)} style={{ position: 'fixed', zIndex: 20, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{ position: 'fixed', zIndex: 21, left: 0, right: 0, bottom: 0, padding: '10px 18px 30px', borderRadius: '28px 28px 0 0', background: 'var(--page-bg)', borderTop: '1px solid var(--ln)', boxShadow: '0 -30px 60px -20px rgba(0,0,0,.7)', animation: 'dcSheet 280ms cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display: 'grid', placeItems: 'center', paddingBottom: 14 }}>
              <span style={{ width: 42, height: 4.5, borderRadius: 5, background: 'var(--ln)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>Báo hàng loạt</div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>Lô nhập</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
              <Btn onClick={() => { const t = todayStr(); loadBulkReportRange(t, t); }} style={{
                height: 32, padding: '0 12px', borderRadius: 11, fontSize: 11.5, fontWeight: 700, border: 0,
                background: bulkModal.startDate === todayStr() && bulkModal.endDate === todayStr() ? 'var(--brand)' : 'var(--sf2)',
                color: bulkModal.startDate === todayStr() && bulkModal.endDate === todayStr() ? '#fff' : 'var(--mu)',
              }}>Hôm nay</Btn>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mu)' }}>Từ</span>
              <input
                type="date"
                value={bulkModal.startDate}
                max={bulkModal.endDate}
                onChange={(e) => e.target.value && loadBulkReportRange(e.target.value, bulkModal.endDate)}
                style={{ height: 32, borderRadius: 11, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 11.5, padding: '0 8px' }}
              />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mu)' }}>Đến</span>
              <input
                type="date"
                value={bulkModal.endDate}
                min={bulkModal.startDate}
                max={todayStr()}
                onChange={(e) => e.target.value && loadBulkReportRange(bulkModal.startDate, e.target.value)}
                style={{ height: 32, borderRadius: 11, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 11.5, padding: '0 8px' }}
              />
            </div>
            {bulkModal.loading ? (
              <div style={{ fontSize: 12.5, color: 'var(--mu)', marginTop: 14 }}>Đang tải dữ liệu…</div>
            ) : bulkModal.customers.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--mu)', marginTop: 14 }}>Không có hàng nhập kho trong khoảng thời gian này.</div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 14, lineHeight: 1.6 }}>
                {bulkModal.customers.filter((c) => !c.batchStatus && c.phone).length} khách sẽ được báo
                {bulkModal.customers.some((c) => c.batchStatus)
                  ? `, ${bulkModal.customers.filter((c) => c.batchStatus).length} đã báo trước đó`
                  : ''}
                {bulkModal.customers.some((c) => !c.batchStatus && !c.phone)
                  ? `, ${bulkModal.customers.filter((c) => !c.batchStatus && !c.phone).length} thiếu SĐT`
                  : ''}.
              </div>
            )}
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <Btn onClick={() => setBulkModal(null)} style={{ flexShrink: 0, padding: '0 20px', height: 48, borderRadius: 15, fontSize: 13, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Hủy</Btn>
              <Btn onClick={() => {
                if (bulkModal.loading || !bulkModal.customers.filter((c) => !c.batchStatus && c.phone).length) return;
                confirmBulkReport();
              }} style={{
                flex: 1, height: 48, borderRadius: 15, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0,
                opacity: (bulkModal.loading || !bulkModal.customers.filter((c) => !c.batchStatus && c.phone).length) ? 0.5 : 1,
              }}>
                Xác nhận báo hàng loạt
              </Btn>
            </div>
          </div>
        </>
      )}

      {/* Bulk report: hidden offscreen renderer, processes bulkRun.list one at a time */}
      {bulkRun && bulkRun.index < bulkRun.list.length && (
        <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
          <NotificationTemplate
            key={bulkRun.list[bulkRun.index].key}
            customerName={bulkRun.list[bulkRun.index].customerName}
            date={bulkRun.list[bulkRun.index].date}
            items={bulkRun.list[bulkRun.index].items}
            companyName={settingsData?.company?.company_name || 'ShipUS'}
            bank={(settingsData?.bank_accounts || []).find((b) => b.is_default) || (settingsData?.bank_accounts || [])[0] || null}
            autoDownload={false}
            onRendered={handleBulkRendered}
          />
        </div>
      )}

      {/* ── Row VanDon Modal (per-parcel van don) ── */}
      {rowVanDon && (
        <>
          <div onClick={() => setRowVanDon(null)} style={{ position: 'fixed', zIndex: 20, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{ position: 'fixed', zIndex: 21, left: 0, right: 0, bottom: 0, padding: '10px 18px 30px', borderRadius: '28px 28px 0 0', background: 'var(--page-bg)', borderTop: '1px solid var(--ln)', boxShadow: '0 -30px 60px -20px rgba(0,0,0,.7)', animation: 'dcSheet 280ms cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display: 'grid', placeItems: 'center', paddingBottom: 14 }}>
              <span style={{ width: 42, height: 4.5, borderRadius: 5, background: 'var(--ln)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>Mã vận đơn kiện hàng</div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 4, fontFamily: '"JetBrains Mono",monospace' }}>{rowVanDon.tracking_no || '—'}</div>
            <input
              value={rowVanDon.code}
              onChange={(e) => setRowVanDon((d) => ({ ...d, code: e.target.value }))}
              placeholder="Nhập mã vận đơn..."
              style={{ width: '100%', marginTop: 14, height: 48, borderRadius: 15, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 15, fontFamily: '"JetBrains Mono",monospace', padding: '0 16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <Btn onClick={() => setRowVanDon(null)} style={{ flexShrink: 0, padding: '0 20px', height: 48, borderRadius: 15, fontSize: 13, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Hủy</Btn>
              <Btn onClick={saveRowVanDon} style={{ flex: 1, height: 48, borderRadius: 15, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0 }}>Lưu mã vận đơn</Btn>
            </div>
          </div>
        </>
      )}

      {/* ── Row Edit Modal (edit parcel) ── */}
      {rowEditModal && rowEditId && (
        <>
          <div onClick={() => { setRowEditModal(false); setRowEditId(null); }} style={{ position: 'fixed', zIndex: 20, inset: 0, background: 'rgba(3,10,14,.62)', backdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
          <div style={{ position: 'fixed', zIndex: 21, left: 0, right: 0, bottom: 0, padding: '10px 18px 30px', borderRadius: '28px 28px 0 0', background: 'var(--page-bg)', borderTop: '1px solid var(--ln)', boxShadow: '0 -30px 60px -20px rgba(0,0,0,.7)', animation: 'dcSheet 280ms cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display: 'grid', placeItems: 'center', paddingBottom: 14 }}>
              <span style={{ width: 42, height: 4.5, borderRadius: 5, background: 'var(--ln)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 14 }}>Sửa kiện hàng</div>
            {[
              { key: 'tracking_no', label: 'Tracking #', type: 'text' },
              { key: 'product',     label: 'Sản phẩm',   type: 'text' },
              { key: 'weight',      label: 'Cân nặng (kg)', type: 'number' },
              { key: 'surcharge',   label: 'Phụ thu',    type: 'number' },
              { key: 'notes',       label: 'Ghi chú',    type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 4 }}>{label}</div>
                <input
                  type={type}
                  value={rowEditVals[key] ?? ''}
                  onChange={(e) => setRowEditVals((v) => ({ ...v, [key]: type === 'number' ? e.target.value : e.target.value }))}
                  step={type === 'number' ? 0.01 : undefined}
                  style={{ width: '100%', height: 44, borderRadius: 13, border: '1px solid var(--ln)', background: 'var(--sunk)', color: 'var(--tx)', fontSize: 14, fontFamily: 'inherit', padding: '0 14px', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 9, marginTop: 6 }}>
              <Btn onClick={() => { setRowEditModal(false); setRowEditId(null); }} style={{ flexShrink: 0, padding: '0 20px', height: 48, borderRadius: 15, fontSize: 13, fontWeight: 700, color: 'var(--tx2)', background: 'var(--sf2)', border: '1px solid var(--ln)' }}>Hủy</Btn>
              <Btn onClick={() => saveRowEdit(rowEditId)} style={{ flex: 1, height: 48, borderRadius: 15, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', border: 0 }}>Lưu</Btn>
            </div>
          </div>
        </>
      )}

      {/* ── Import Modal ── */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); fetchShipments(); showToast('✓ Nhập kho thành công'); }}
        />
      )}

      {notifModalData && (
        <NotificationModal
          notifData={notifModalData.notifData}
          company={notifModalData.company}
          bank={notifModalData.bank}
          onClose={() => setNotifModalData(null)}
        />
      )}

      {/* ── Settings modal ── */}
      {settingsModal && (() => {
        const { type, data, isNew } = settingsModal;
        const setData = (field, val) => setSettingsModal(m => ({ ...m, data: { ...m.data, [field]: val } }));
        const inputStyle = { width: '100%', background: 'var(--sunk)', border: '1px solid var(--ln)', borderRadius: 10, color: 'var(--tx)', fontSize: 13, fontFamily: 'inherit', padding: '10px 12px', boxSizing: 'border-box' };
        const titles = { rate: 'Biểu phí', warehouse: 'Kho', bank: 'Tài khoản ngân hàng', company: 'Thông tin công ty' };
        return (
          <>
            <div onClick={() => setSettingsModal(null)} style={{ position: 'fixed', zIndex: 30, inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', animation: 'dcFade 200ms ease both' }} />
            <div style={{ position: 'fixed', zIndex: 31, left: 0, right: 0, bottom: 0, background: 'var(--sf)', borderRadius: '20px 20px 0 0', padding: '20px 18px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)', display: 'flex', flexDirection: 'column', gap: 10, animation: 'dcSheet 240ms ease both', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>{isNew ? 'Thêm' : 'Sửa'} {titles[type]}</div>
                <Btn onClick={() => setSettingsModal(null)} style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--mu)' }}><IcoX /></Btn>
              </div>
              {type === 'rate' && (<>
                <input style={inputStyle} placeholder="Tên biểu phí" value={data.name} onChange={e => setData('name', e.target.value)} />
                <input style={inputStyle} placeholder="Cước/kg (VNĐ)" type="number" value={data.rate_per_kg} onChange={e => setData('rate_per_kg', e.target.value)} />
              </>)}
              {type === 'warehouse' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input style={inputStyle} placeholder="Mã kho (HA)" value={data.code} onChange={e => setData('code', e.target.value.toUpperCase())} />
                  <input style={inputStyle} placeholder="Tên kho" value={data.name} onChange={e => setData('name', e.target.value)} />
                </div>
                <input style={inputStyle} placeholder="Aliases (OR,NH)" value={data.aliases || ''} onChange={e => setData('aliases', e.target.value.toUpperCase())} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input style={inputStyle} placeholder="Cước lẻ (đ/kg)" type="number" value={data.rate_le || ''} onChange={e => setData('rate_le', e.target.value)} />
                  <input style={inputStyle} placeholder="Cước buôn (đ/kg)" type="number" value={data.rate_buon || ''} onChange={e => setData('rate_buon', e.target.value)} />
                </div>
                <input style={inputStyle} placeholder="Cước đối tác (đ/kg)" type="number" value={data.rate_per_kg || ''} onChange={e => setData('rate_per_kg', e.target.value)} />
              </>)}
              {type === 'bank' && (<>
                <input style={inputStyle} placeholder="Tên ngân hàng" value={data.bank_name} onChange={e => setData('bank_name', e.target.value)} />
                <input style={inputStyle} placeholder="Số tài khoản" value={data.account_number} onChange={e => setData('account_number', e.target.value)} />
                <input style={inputStyle} placeholder="Tên chủ tài khoản" value={data.account_name} onChange={e => setData('account_name', e.target.value)} />
              </>)}
              {type === 'company' && (<>
                <input style={inputStyle} placeholder="Tên công ty" value={data.company_name} onChange={e => setData('company_name', e.target.value)} />
                <input style={inputStyle} placeholder="Hotline" value={data.hotline} onChange={e => setData('hotline', e.target.value)} />
                <input style={inputStyle} placeholder="Đơn vị giao hàng" value={data.delivery_carrier} onChange={e => setData('delivery_carrier', e.target.value)} />
              </>)}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {!isNew && type !== 'company' && (
                  <Btn onClick={handleSetDelete} disabled={settingsSaving} style={{ width: 44, height: 44, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', flexShrink: 0 }}><IcoTrash /></Btn>
                )}
                <Btn onClick={handleSetSave} disabled={settingsSaving} style={{ flex: 1, height: 44, borderRadius: 13, fontSize: 13.5, fontWeight: 700, color: 'var(--onbtn)', background: settingsSaving ? 'var(--mu)' : 'var(--btn)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{settingsSaving ? 'Đang lưu...' : 'Lưu'}</Btn>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Toast ── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', zIndex: 50, left: 16, right: 16,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)',
          padding: '12px 16px', borderRadius: 16, background: 'var(--btn)', color: 'var(--onbtn)',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          animation: 'dcPop 240ms ease both',
          boxShadow: '0 12px 30px -8px rgba(0,0,0,.5)',
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
