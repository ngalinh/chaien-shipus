import { Fragment, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Plus, Edit2, Trash2, Bell, ChevronDown, ChevronRight, Calendar, PackageOpen, CreditCard,
  Truck, Send, X, Copy, Search,
} from 'lucide-react';
import { formatCurrency, formatDate, todayInputValue, PaidBadge, PAID_FILTERS, getUserRole } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import ImportModal from '../components/ImportModal.jsx';
import NotificationModal from '../components/NotificationModal.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import PaymentModal from '../components/PaymentModal.jsx';

function getStatusStyle(v) {
  if (v === 'Đã báo hàng') return { background: 'var(--warnBg)', color: 'var(--warnTx)', borderColor: 'var(--warnLn)' };
  if (v === 'Đã báo ship') return { background: 'var(--okBg)', color: 'var(--okTx)', borderColor: 'var(--okLn)' };
  return { background: 'var(--sf2)', color: 'var(--tx2)', borderColor: 'var(--ln)' };
}
function getStatusClass() { return ''; }

const PERIODS = [
  { label: 'Trong tháng', value: 'month' },
  { label: 'Tất cả', value: 'all' },
  { label: 'Tùy chỉnh', value: 'custom' },
];

function rangeFor(period, startDate, endDate) {
  if (period === 'all') return {};
  if (period === 'custom') return { start_date: startDate, end_date: endDate };
  return { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: todayInputValue() };
}

const cleanCode = (code) => (code || '').replace(/\s+/g, ' ').trim();

function groupPaidStatus(rows) {
  const statuses = rows.map((r) => r.paid_status || 'unpaid');
  if (statuses.every((s) => s === 'paid')) return 'paid';
  if (statuses.some((s) => s === 'paid' || s === 'partial')) return 'partial';
  return 'unpaid';
}

export default function Shipping() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [notifData, setNotifData] = useState(null);
  const [settings, setSettings] = useState({ company: {} });
  const [paymentModal, setPaymentModal] = useState(null);
  const [editingRate, setEditingRate] = useState(null); // { custKey, custId, dateKey, value }
  const [vanDonModal, setVanDonModal] = useState(null); // { custId, dateKey, customerName, totalFee, van_don_code }
  const [shipNotifModal, setShipNotifModal] = useState(null); // { customerName, carrier, van_don_code, totalFee }
  const [shipNotifText, setShipNotifText] = useState('');

  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(todayInputValue);

  const [searchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState('');
  const q = (localSearch || searchParams.get('q') || '').trim().toLowerCase();

  const [ttFilter, setTtFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchSettings(); }, []);
  useEffect(() => { fetchShipments(); }, [period, startDate, endDate]);

  async function fetchSettings() {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch { /* ignore */ }
  }

  async function fetchShipments() {
    setLoading(true);
    try {
      const res = await axios.get('/api/shipments', { params: rangeFor(period, startDate, endDate) });
      setShipments(res.data);
    } catch (err) {
      console.error('fetchShipments:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(val) {
    setPeriod(val);
    if (val === 'month') setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    if (val !== 'custom') setEndDate(todayInputValue());
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa kiện hàng này?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/shipments/${id}`);
      setShipments((prev) => prev.filter((s) => s.id !== id));
      toast('Đã xóa', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể xóa', 'error');
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditValues({
      surcharge: s.surcharge,
      notes: s.notes || '',
      tracking_no: s.tracking_no || '',
      product: s.product || '',
      weight: s.weight,
    });
  }

  async function saveEdit(id) {
    try {
      const res = await axios.put(`/api/shipments/${id}`, editValues);
      setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data } : s)));
      setEditingId(null);
      toast('Đã cập nhật', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể cập nhật', 'error');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function triggerNotification(rows, customerCode, customerName, customerId, batchDate) {
    if (!rows.length) {
      toast('Không có kiện hàng trong lô này', 'warning');
      return;
    }
    try {
      await axios.post('/api/shipments/batch/notify', { batch_date: batchDate, customer_id: customerId });
    } catch { /* non-critical */ }

    setNotifData({
      batch: { details: rows, customer_name: customerName, batch_date: batchDate, customer_code: customerCode, customer_id: customerId },
      customerName,
      date: batchDate,
      items: rows.map((s) => ({
        tracking_no: s.tracking_no,
        product: s.product,
        weight: s.weight,
        customer_fee: s.phi_vc || (s.weight * s.customer_rate + s.surcharge),
      })),
      fileName: `thong-bao-${customerCode || 'kh'}-${batchDate}.png`,
    });
  }

  function handleImported() {
    setImportModal(false);
    fetchShipments();
  }

  function toggleCustomer(key) {
    setExpandedCustomers((p) => ({ ...p, [key]: !p[key] }));
  }

  function buildShipText({ customerName, carrier, van_don_code }) {
    const c = carrier || 'Giao hàng tiết kiệm';
    const code = van_don_code || '';
    return `Anh/Chị ${customerName} ơi, đơn hàng của mình đã được bàn giao cho ${c} rồi ạ 🚚\n📦 Mã vận đơn: ${code}\n🔎 Theo dõi đơn hàng: https://i.ghtk.vn/${code}\nPhí ship anh/chị vui lòng thanh toán cho shipper khi nhận hàng.\nDự kiến 2–5 ngày (tùy khu vực) mình sẽ nhận được hàng. Nếu cần hỗ trợ về đơn hàng, anh/chị cứ nhắn bên em nhé 💕`;
  }

  function openShipNotif(data) {
    setShipNotifModal(data);
    setShipNotifText(buildShipText(data));
  }

  async function updateBatchStatus(custId, dateKey, status) {
    try {
      await axios.patch('/api/shipments/batch-status', { batch_date: dateKey, customer_id: custId, status });
      setShipments((prev) =>
        prev.map((s) =>
          s.import_date === dateKey && s.customer_id === custId ? { ...s, batch_status: status } : s
        )
      );
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể cập nhật trạng thái', 'error');
    }
  }

  async function saveRate(custId, dateKey, value) {
    const rate = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    setEditingRate(null);
    if (isNaN(rate) || rate < 0) return;
    try {
      await axios.patch('/api/shipments/batch-rate', { batch_date: dateKey, customer_id: custId, customer_rate: rate });
      fetchShipments();
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể cập nhật cước', 'error');
    }
  }

  // Build date → customer groups
  const qFiltered = shipments.filter((s) =>
    !q ||
    cleanCode(s.customer_code).toLowerCase().includes(q) ||
    (s.customer_name || '').toLowerCase().includes(q) ||
    (s.tracking_no || '').toLowerCase().includes(q)
  );

  const dateGroups = [];
  {
    const dateMap = new Map();
    for (const s of qFiltered) {
      if (!dateMap.has(s.import_date)) dateMap.set(s.import_date, new Map());
      const custMap = dateMap.get(s.import_date);
      if (!custMap.has(s.customer_id)) custMap.set(s.customer_id, []);
      custMap.get(s.customer_id).push(s);
    }
    for (const [dateKey, custMap] of dateMap) {
      const customers = [];
      for (const [custId, rows] of custMap) {
        const paidStatus = groupPaidStatus(rows);
        const batchStatus = rows[0]?.batch_status || '';
        if (ttFilter !== 'all' && paidStatus !== ttFilter) continue;
        if (statusFilter !== 'all' && batchStatus !== statusFilter) continue;
        customers.push({
          custId,
          customerCode: cleanCode(rows[0].customer_code),
          customerName: rows[0].customer_name || '',
          customerRate: rows[0]?.customer_rate || 0,
          batchStatus,
          vanDonCode: rows[0]?.van_don_code || '',
          rows,
          count: rows.length,
          totalWeight: rows.reduce((a, s) => a + (s.weight || 0), 0),
          totalFee: rows.reduce((a, s) => a + (s.weight || 0) * (s.customer_rate || 0) + (s.surcharge || 0), 0),
          paidStatus,
          paidAmount: rows[0]?.paid_amount || 0,
          remainingAmount: rows[0]?.remaining_amount || 0,
        });
      }
      customers.sort((a, b) => a.customerName.localeCompare(b.customerName, 'vi'));
      if (customers.length > 0) dateGroups.push({ dateKey, customers });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>Hàng về</h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>Quản lý kiện hàng về</p>
        </div>
        <button onClick={() => setImportModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nhập kho
        </button>
      </header>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 26, rowGap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)' }}>Tình trạng TT:</span>
          <select value={ttFilter} onChange={e => setTtFilter(e.target.value)} className="select-dark">
            {PAID_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)' }}>Trạng thái:</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-dark">
            <option value="all">Tất cả</option>
            <option value="">Chưa báo</option>
            <option value="Đã báo hàng">Đã báo hàng</option>
            <option value="Đã báo ship">Đã báo ship</option>
          </select>
        </div>
        {/* Search tracking / mã KH */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 15px', height: 40, borderRadius: 999, background: 'var(--sf)', border: '1px solid var(--ln)', backdropFilter: 'blur(14px)' }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--mu)' }} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Tìm tracking, mã KH…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--tx)', width: 190, fontFamily: 'inherit' }}
          />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', display: 'flex', padding: 0 }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Khoảng thời gian:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => handlePeriodChange(p.value)} className="period-pill"
                style={{ background: period === p.value ? 'var(--brand)' : 'transparent', color: period === p.value ? '#fff' : 'var(--mu)' }}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)' }}>Từ:</span>
              <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="input-field" style={{ width: 'auto' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)' }}>Đến:</span>
              <input type="date" value={endDate} min={startDate} max={todayInputValue()} onChange={e => setEndDate(e.target.value)} className="input-field" style={{ width: 'auto' }} />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--mu)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Đang tải...
          </div>
        </div>
      ) : dateGroups.length === 0 ? (
        <div className="glass-card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <PackageOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mu)', opacity: 0.5 }} strokeWidth={1.4} />
          <p style={{ color: 'var(--tx2)', fontWeight: 500 }}>{(q || ttFilter !== 'all' || statusFilter !== 'all') ? 'Không tìm thấy kiện hàng khớp' : 'Chưa có hàng về trong khoảng này'}</p>
          <p style={{ color: 'var(--mu)', fontSize: 13, marginTop: 4 }}>{(q || ttFilter !== 'all' || statusFilter !== 'all') ? 'Thử đổi bộ lọc hoặc xóa ô tìm kiếm.' : 'Nhấn "Nhập kho" để thêm đợt hàng mới.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {dateGroups.map(({ dateKey, customers }) => {
            const isDateCollapsed = collapsedDates[dateKey];
            return (
              <div key={dateKey} className="glass-card" style={{ overflow: 'hidden' }}>
                {/* Date group header */}
                <button
                  onClick={() => setCollapsedDates(p => ({ ...p, [dateKey]: !p[dateKey] }))}
                  style={{ appearance: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 20px', textAlign: 'left', background: 'var(--acBg)', transition: 'background 160ms ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(58,175,211,.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--acBg)'}
                >
                  {isDateCollapsed
                    ? <ChevronRight className="w-4 h-4" style={{ color: 'var(--ac)', flexShrink: 0 }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: 'var(--ac)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Đợt {formatDate(dateKey)}</span>
                  <span style={{ fontSize: 12, color: 'var(--mu)' }}>
                    {customers.length} khách · {customers.reduce((a, c) => a + c.count, 0)} kiện
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 20, font: '600 12px "JetBrains Mono", monospace', color: 'var(--tx2)' }}>
                    <span>{customers.reduce((a, c) => a + c.totalWeight, 0).toFixed(2)} kg</span>
                    <span>{formatCurrency(customers.reduce((a, c) => a + c.totalFee, 0))} đ</span>
                  </span>
                </button>

                {!isDateCollapsed && (
                  <>
                  <div className="hidden sm:block" style={{ overflowX: 'auto', borderTop: '1px solid var(--ln2)' }}>
                    <table className="data-table table-fixed w-full" style={{ minWidth: 1120 }}>
                      <colgroup>
                        <col style={{width:'32px'}} />
                        <col style={{width:'200px'}} />
                        <col style={{width:'176px'}} />
                        <col style={{width:'128px'}} />
                        <col style={{width:'148px'}} />
                        <col style={{width:'148px'}} />
                        <col style={{width:'152px'}} />
                        <col style={{width:'136px'}} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="!px-0"></th>
                          <th>Tên KH</th>
                          <th className="!text-right">Tổng cân nặng</th>
                          <th className="!text-right">Phí VC/kg</th>
                          <th className="!text-right">Tổng Phí VC</th>
                          <th>Trạng thái</th>
                          <th>Tình trạng TT</th>
                          <th className="!text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((cust) => {
                          const custKey = `${dateKey}_${cust.custId}`;
                          const isExpanded = expandedCustomers[custKey];
                          return (
                            <Fragment key={custKey}>
                              <tr
                                style={{ cursor: 'pointer', transition: 'background 160ms ease' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--acBg)'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                                onClick={() => toggleCustomer(custKey)}
                              >
                                <td style={{ paddingLeft: 0, paddingRight: 0, textAlign: 'center' }}>
                                  {isExpanded
                                    ? <ChevronDown className="w-[14px] h-[14px] mx-auto" style={{ color: 'var(--ac)' }} />
                                    : <ChevronRight className="w-[14px] h-[14px] mx-auto" style={{ color: 'var(--ac)' }} />}
                                </td>
                                <td>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cust.customerName}>{cust.customerName || '–'}</div>
                                  <Link
                                    to={`/customers/${cust.custId}`}
                                    onClick={e => e.stopPropagation()}
                                    style={{ font: '400 10.5px "JetBrains Mono", monospace', color: 'var(--ac)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}
                                    title={cust.customerCode}
                                  >
                                    {cust.customerCode}
                                  </Link>
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, fontWeight: 600, color: 'var(--tx)' }}>{cust.totalWeight.toFixed(2)} kg ({cust.count} kiện)</td>
                                <td style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: 'var(--mu)' }} onClick={e => e.stopPropagation()}>
                                  {getUserRole() === 'admin' && editingRate?.custKey === custKey ? (
                                    <input
                                      type="number"
                                      className="input-field py-1 text-xs w-28 text-right"
                                      value={editingRate.value}
                                      autoFocus
                                      onChange={(e) => setEditingRate((p) => ({ ...p, value: e.target.value }))}
                                      onBlur={() => saveRate(cust.custId, dateKey, editingRate.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveRate(cust.custId, dateKey, editingRate.value);
                                        if (e.key === 'Escape') setEditingRate(null);
                                      }}
                                    />
                                  ) : (
                                    <span
                                      className={getUserRole() === 'admin' ? 'cursor-pointer hover:text-primary-600 hover:underline' : ''}
                                      onClick={() => getUserRole() === 'admin' && setEditingRate({ custKey, custId: cust.custId, dateKey, value: cust.customerRate })}
                                    >
                                      {formatCurrency(cust.customerRate)}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, fontWeight: 700, color: 'var(--tx)' }}>
                                  {formatCurrency(cust.totalFee)}
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                  <select
                                    value={cust.batchStatus}
                                    onChange={e => updateBatchStatus(cust.custId, dateKey, e.target.value)}
                                    className="select-dark"
                                    style={{ width: '100%', fontSize: 11.5, fontWeight: 600, padding: '7px 10px', borderRadius: 10, ...getStatusStyle(cust.batchStatus) }}
                                  >
                                    <option value="">Chưa báo</option>
                                    <option value="Đã báo hàng">Đã báo hàng</option>
                                    <option value="Đã báo ship">Đã báo ship</option>
                                  </select>
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                    {cust.paidStatus !== 'paid' && getUserRole() !== 'staff' ? (
                                      <button
                                        onClick={() => setPaymentModal({ customerId: cust.custId, batchDate: dateKey, amount: cust.remainingAmount || cust.totalFee, paidAmount: cust.paidAmount, totalFee: cust.totalFee })}
                                        style={{ appearance: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--onbtn)', background: 'var(--btn)', boxShadow: '0 10px 20px -10px rgba(58,175,211,.9)', whiteSpace: 'nowrap' }}
                                      >
                                        Thanh toán
                                      </button>
                                    ) : (
                                      <PaidBadge status={cust.paidStatus} />
                                    )}
                                    {cust.paidStatus !== 'paid' && (
                                      <span style={{ fontSize: 11, color: 'var(--mu)' }}>
                                        {cust.paidStatus === 'partial' ? 'TT 1 phần' : 'Chưa TT'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, flexWrap: 'nowrap' }}>
                                    <button onClick={() => triggerNotification(cust.rows, cust.customerCode, cust.customerName, cust.custId, dateKey)}
                                      className="btn-icon" title="Báo hàng về">
                                      <Bell className="w-[15px] h-[15px]" />
                                    </button>
                                    <button onClick={() => openShipNotif({ customerName: cust.customerName, carrier: settings.company?.delivery_carrier || '', van_don_code: cust.vanDonCode, totalFee: cust.totalFee })}
                                      className="btn-icon" title="Báo ship hàng">
                                      <Send className="w-[15px] h-[15px]" />
                                    </button>
                                    <button onClick={() => setVanDonModal({ custId: cust.custId, dateKey, customerName: cust.customerName, totalFee: cust.totalFee, van_don_code: cust.vanDonCode })}
                                      className="btn-icon" title="Mã vận đơn">
                                      <Truck className="w-[15px] h-[15px]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="expand-row">
                                  <td colSpan={8} style={{ padding: '14px 20px 18px 54px', background: 'var(--sunk)' }}>
                                    <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--sf)', border: '1px solid var(--ln)' }}>
                                      <table className="data-table w-full" style={{ minWidth: 760 }}>
                                        <thead>
                                          <tr>
                                            <th className="w-16">Kho</th>
                                            <th className="w-44">Tracking #</th>
                                            <th className="w-36">Sản phẩm</th>
                                            <th className="w-28">Cân nặng</th>
                                            <th className="w-28">Phụ thu</th>
                                            <th className="w-32 !text-right">Tổng phí VC</th>
                                            <th className="w-28">Ghi chú</th>
                                            <th className="w-32 !text-right">Thao tác</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cust.rows.map(s => {
                                            const isEditing = editingId === s.id;
                                            return (
                                              <tr key={s.id} style={isEditing ? { background: 'var(--acBg)' } : {}}>
                                                <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, fontWeight: 700, color: 'var(--ac)' }}>{s.warehouse_code || '–'}</td>
                                                <td>
                                                  {isEditing ? (
                                                    <input value={editValues.tracking_no}
                                                      onChange={(e) => setEditValues((p) => ({ ...p, tracking_no: e.target.value }))}
                                                      className="input-field py-1 text-xs w-28" />
                                                  ) : (
                                                    <span className="font-mono text-sm truncate block" title={s.tracking_no}>{s.tracking_no || '–'}</span>
                                                  )}
                                                </td>
                                                <td>
                                                  {isEditing ? (
                                                    <input value={editValues.product}
                                                      onChange={(e) => setEditValues((p) => ({ ...p, product: e.target.value }))}
                                                      className="input-field py-1 text-xs w-full" />
                                                  ) : (
                                                    <span className="max-w-[140px] truncate block" title={s.product}>{s.product || '–'}</span>
                                                  )}
                                                </td>
                                                <td className="tabular-nums">
                                                  {isEditing ? (
                                                    <input type="number" value={editValues.weight}
                                                      onChange={(e) => setEditValues((p) => ({ ...p, weight: e.target.value }))}
                                                      className="input-field py-1 text-xs w-full" step={0.01} min={0} />
                                                  ) : (
                                                    `${s.weight} kg`
                                                  )}
                                                </td>
                                                <td className="tabular-nums">
                                                  {isEditing ? (
                                                    <MoneyInput value={editValues.surcharge}
                                                      onChange={(v) => setEditValues((p) => ({ ...p, surcharge: v }))}
                                                      className="input-field py-1 text-xs w-full" />
                                                  ) : (
                                                    formatCurrency(s.surcharge)
                                                  )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>
                                                  {isEditing ? '–' : formatCurrency((s.weight || 0) * (s.customer_rate || 0) + (s.surcharge || 0))}
                                                </td>
                                                <td>
                                                  {isEditing ? (
                                                    <input value={editValues.notes}
                                                      onChange={(e) => setEditValues((p) => ({ ...p, notes: e.target.value }))}
                                                      className="input-field py-1 text-xs w-full" />
                                                  ) : (
                                                    <div className="max-w-[140px] truncate text-ink-400 text-xs" title={s.notes}>{s.notes || '–'}</div>
                                                  )}
                                                </td>
                                                <td className="text-right">
                                                  <div className="flex items-center justify-end gap-1">
                                                    {isEditing ? (
                                                      <>
                                                        <button onClick={() => saveEdit(s.id)}
                                                          style={{ appearance: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, color: 'var(--onbtn)', background: 'var(--btn)' }}>
                                                          Lưu
                                                        </button>
                                                        <button onClick={cancelEdit}
                                                          style={{ appearance: 'none', border: '1px solid var(--ln)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, color: 'var(--tx2)', background: 'var(--sf2)' }}>
                                                          Hủy
                                                        </button>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <button onClick={() => startEdit(s)} className="btn-icon" title="Chỉnh sửa">
                                                          <Edit2 className="w-[14px] h-[14px]" />
                                                        </button>
                                                        <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                                                          className="btn-icon" title="Xóa" style={{ color: 'var(--badTx)' }}>
                                                          <Trash2 className="w-[14px] h-[14px]" />
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: card list */}
                  <div className="sm:hidden" style={{ borderTop: '1px solid var(--ln2)' }}>
                    {customers.map((cust) => {
                      const custKey = `${dateKey}_${cust.custId}`;
                      const isExpanded = expandedCustomers[custKey];
                      return (
                        <div key={custKey}>
                          <div
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => toggleCustomer(custKey)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex-1 min-w-0">
                                <Link
                                  to={`/customers/${cust.custId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-mono text-xs text-primary-400 block truncate"
                                >
                                  {cust.customerCode}
                                </Link>
                                <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--tx)' }}>{cust.customerName || '–'}</div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                                <PaidBadge status={cust.paidStatus} />
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-ink-400" />
                                  : <ChevronRight className="w-4 h-4 text-ink-400" />}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--mu)' }}>
                              <span>{cust.totalWeight.toFixed(2)} kg ({cust.count} kiện) · {formatCurrency(cust.customerRate)}/kg</span>
                              <span className="font-semibold text-primary-400 text-sm">{formatCurrency(cust.totalFee)}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs shrink-0" style={{ color: 'var(--mu)' }}>Trạng thái:</span>
                              <select
                                value={cust.batchStatus}
                                onChange={(e) => updateBatchStatus(cust.custId, dateKey, e.target.value)}
                                className={`text-xs border rounded-lg px-2 py-1 flex-1 ${getStatusClass(cust.batchStatus) || ''}`}
                                style={!getStatusClass(cust.batchStatus) ? { borderColor: 'var(--ln)', background: 'var(--sf2)', color: 'var(--tx)' } : {}}
                              >
                                <option value="">Chưa báo</option>
                                <option value="Đã báo hàng">Đã báo hàng</option>
                                <option value="Đã báo ship">Đã báo ship</option>
                              </select>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => triggerNotification(cust.rows, cust.customerCode, cust.customerName, cust.custId, dateKey)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-full bg-primary-500 text-white"
                              >
                                <Bell className="w-3 h-3" /> Báo hàng về
                              </button>
                              <button
                                onClick={() => openShipNotif({
                                  customerName: cust.customerName,
                                  carrier: settings.company?.delivery_carrier || '',
                                  van_don_code: cust.vanDonCode,
                                  totalFee: cust.totalFee,
                                })}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-full" style={{ background: 'var(--sf2)', color: 'var(--tx2)', border: '1px solid var(--ln)' }}
                              >
                                <Send className="w-3 h-3" /> Báo ship
                              </button>
                              {getUserRole() !== 'staff' && cust.paidStatus !== 'paid' && (
                                <button
                                  onClick={() => setPaymentModal({ customerId: cust.custId, batchDate: dateKey, amount: cust.remainingAmount || cust.totalFee, paidAmount: cust.paidAmount, totalFee: cust.totalFee })}
                                  className="inline-flex items-center justify-center p-2 rounded-full" style={{ background: 'var(--sf2)', color: 'var(--tx2)', border: '1px solid var(--ln)' }}
                                  title="Thanh toán"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setVanDonModal({
                                  custId: cust.custId,
                                  dateKey,
                                  customerName: cust.customerName,
                                  totalFee: cust.totalFee,
                                  van_don_code: cust.vanDonCode,
                                })}
                                className="inline-flex items-center justify-center p-2 rounded-full bg-greige-100 text-ink-700"
                                title="Mã vận đơn"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2 mt-0" style={{ background: 'var(--sunk)', borderTop: '1px solid var(--ln2)' }}>
                              {cust.rows.map((s) => (
                                <div key={s.id} className="rounded-xl p-3 mt-2" style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <span className="font-mono text-xs block truncate" style={{ color: 'var(--tx2)' }}>{s.tracking_no || '–'}</span>
                                      <div className="text-xs mt-0.5" style={{ color: 'var(--mu)' }}>{s.warehouse_code || '–'} · {s.product || '–'}</div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="font-semibold text-primary-400 text-sm">{formatCurrency((s.weight || 0) * (s.customer_rate || 0) + (s.surcharge || 0))}</div>
                                      <div className="text-xs" style={{ color: 'var(--mu)' }}>{s.weight} kg{s.surcharge ? ` + ${formatCurrency(s.surcharge)}` : ''}</div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-1 mt-2">
                                    <button onClick={() => startEdit(s)} className="btn-icon text-primary-400 hover:bg-primary-900/30" title="Chỉnh sửa">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} className="btn-icon text-danger-600 hover:bg-danger-100 disabled:opacity-50" title="Xóa">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {importModal && (
        <ImportModal onClose={() => setImportModal(false)} onImported={handleImported} />
      )}
      {paymentModal && (
        <PaymentModal
          customerId={paymentModal.customerId}
          batchDate={paymentModal.batchDate}
          amount={paymentModal.amount}
          paidAmount={paymentModal.paidAmount}
          totalFee={paymentModal.totalFee}
          onClose={() => setPaymentModal(null)}
          onSaved={() => { setPaymentModal(null); fetchShipments(); }}
        />
      )}
      {notifData && (
        <NotificationModal
          notifData={notifData}
          company={settings.company}
          bank={(settings.bank_accounts || []).find((b) => b.is_default) || (settings.bank_accounts || [])[0] || null}
          onClose={() => setNotifData(null)}
        />
      )}

      {/* Van đơn modal */}
      {vanDonModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-pop" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>Mã vận đơn</h2>
              <button onClick={() => setVanDonModal(null)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--mu)' }}>{vanDonModal.customerName} · {formatDate(vanDonModal.dateKey)}</p>
              <input
                type="text"
                value={vanDonModal.van_don_code}
                onChange={e => setVanDonModal(p => ({ ...p, van_don_code: e.target.value }))}
                placeholder="Nhập mã vận đơn..."
                className="input-field"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setVanDonModal(null)} className="btn-secondary">Đóng</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    await axios.put('/api/shipments/batch', {
                      batch_date: vanDonModal.dateKey,
                      customer_id: vanDonModal.custId,
                      van_don_code: vanDonModal.van_don_code,
                    });
                    fetchShipments();
                    const saved = { ...vanDonModal };
                    setVanDonModal(null);
                    openShipNotif({
                      customerName: saved.customerName,
                      carrier: settings.company?.delivery_carrier || '',
                      van_don_code: saved.van_don_code,
                      totalFee: saved.totalFee,
                    });
                  } catch (err) {
                    toast(err.response?.data?.error || 'Không thể lưu mã vận đơn', 'error');
                  }
                }}
              >
                Lưu & Báo ship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship notification modal */}
      {shipNotifModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-pop" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>
                Báo ship – {shipNotifModal.customerName}
              </h2>
              <button onClick={() => setShipNotifModal(null)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea
                className="input-field"
                style={{ width: '100%', resize: 'none', lineHeight: 1.6, fontSize: 13 }}
                rows={10}
                value={shipNotifText}
                onChange={e => setShipNotifText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(shipNotifText); toast('Đã copy nội dung!', 'success'); }}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Copy className="w-4 h-4" />
                  Copy nội dung
                </button>
                <button disabled className="btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }} title="Tính năng sắp ra mắt">
                  <Send className="w-4 h-4" />
                  Gửi qua Zalo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
