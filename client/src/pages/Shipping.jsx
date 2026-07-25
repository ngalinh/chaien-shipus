import { Fragment, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Plus, Edit2, Trash2, Bell, ChevronDown, ChevronRight, Calendar, PackageOpen, CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate, todayInputValue, PaidBadge, PAID_FILTERS, getUserRole } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import ImportModal from '../components/ImportModal.jsx';
import NotificationModal from '../components/NotificationModal.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import PaymentModal from '../components/PaymentModal.jsx';

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

  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(todayInputValue);

  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  const [ttFilter, setTtFilter] = useState('all');

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
        if (ttFilter !== 'all' && paidStatus !== ttFilter) continue;
        customers.push({
          custId,
          customerCode: cleanCode(rows[0].customer_code),
          customerName: rows[0].customer_name || '',
          rows,
          count: rows.length,
          totalWeight: rows.reduce((a, s) => a + (s.weight || 0), 0),
          totalFee: rows.reduce((a, s) => a + (s.weight || 0) * (s.customer_rate || 0) + (s.surcharge || 0), 0),
          paidStatus,
        });
      }
      if (customers.length > 0) dateGroups.push({ dateKey, customers });
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-page font-bold text-ink-900 leading-tight">Hàng về</h1>
          <p className="text-body-md text-ink-500 mt-1.5">Quản lý kiện hàng về</p>
        </div>
        <button onClick={() => setImportModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nhập kho
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-ink-500">Tình trạng TT:</span>
          <select
            value={ttFilter}
            onChange={(e) => setTtFilter(e.target.value)}
            className="input-field w-auto py-1.5 text-sm"
          >
            {PAID_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
          <span className="text-sm font-semibold text-ink-500 inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Khoảng thời gian:
          </span>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={`px-4 py-2 text-sm font-semibold rounded-full ${
                  period === p.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-ink-500 shadow-pill hover:bg-greige-50'
                }`}
                style={{ transition: 'background-color 150ms ease-out, color 150ms ease-out' }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-500 font-semibold">Từ:</label>
                <input type="date" value={startDate} max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field w-auto py-1.5 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-500 font-semibold">Đến:</label>
                <input type="date" value={endDate} min={startDate} max={todayInputValue()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field w-auto py-1.5 text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="table-container p-12 text-center text-ink-400">
          <div className="inline-flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        </div>
      ) : dateGroups.length === 0 ? (
        <div className="table-container p-14 text-center">
          <PackageOpen className="w-10 h-10 text-ink-300 mx-auto mb-3" strokeWidth={1.6} />
          <p className="text-ink-500 font-medium">{(q || ttFilter !== 'all') ? 'Không tìm thấy kiện hàng khớp' : 'Chưa có hàng về trong khoảng này'}</p>
          <p className="text-ink-400 text-sm mt-1">{(q || ttFilter !== 'all') ? 'Thử đổi bộ lọc hoặc xóa ô tìm kiếm.' : 'Nhấn "Nhập kho" để thêm đợt hàng mới.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map(({ dateKey, customers }) => {
            const isDateCollapsed = collapsedDates[dateKey];
            return (
              <div key={dateKey} className="card overflow-hidden">
                {/* Date group header */}
                <button
                  onClick={() => setCollapsedDates((p) => ({ ...p, [dateKey]: !p[dateKey] }))}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-greige-50 transition-colors text-left"
                >
                  {isDateCollapsed ? <ChevronRight className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                  <span className="text-body-md font-bold text-ink-900">Đợt {formatDate(dateKey)}</span>
                  <span className="text-sm text-ink-400">
                    {customers.length} khách · {customers.reduce((a, c) => a + c.count, 0)} kiện
                  </span>
                </button>

                {!isDateCollapsed && (
                  <div className="table-container rounded-none shadow-none border-t border-greige-100">
                    <table className="data-table w-full min-w-[1100px]">
                      <thead>
                        <tr>
                          <th className="w-8"></th>
                          <th className="w-36">Mã KH</th>
                          <th className="w-40">Tên KH</th>
                          <th className="w-24 text-right">SL Tracking</th>
                          <th className="w-36 text-right">Tổng cân nặng</th>
                          <th className="w-36 text-right">Tổng Phí VC</th>
                          <th className="w-32">Tình trạng TT</th>
                          <th className="w-28 text-center">Thông báo</th>
                          <th className="w-32 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((cust) => {
                          const custKey = `${dateKey}_${cust.custId}`;
                          const isExpanded = expandedCustomers[custKey];
                          return (
                            <Fragment key={custKey}>
                              <tr
                                className="cursor-pointer hover:bg-greige-50/60 transition-colors"
                                onClick={() => toggleCustomer(custKey)}
                              >
                                <td className="text-center">
                                  {isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-ink-400 mx-auto" />
                                    : <ChevronRight className="w-4 h-4 text-ink-400 mx-auto" />}
                                </td>
                                <td className="w-36 max-w-0">
                                  <Link
                                    to={`/customers/${cust.custId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-mono text-sm text-primary-700 hover:underline block truncate"
                                    title={cust.customerCode}
                                  >
                                    {cust.customerCode}
                                  </Link>
                                </td>
                                <td className="w-40 max-w-0">
                                  <div className="truncate text-ink-600" title={cust.customerName}>{cust.customerName || '–'}</div>
                                </td>
                                <td className="text-right tabular-nums">{cust.count}</td>
                                <td className="text-right tabular-nums">{cust.totalWeight.toFixed(2)} kg</td>
                                <td className="text-right tabular-nums font-semibold text-primary-700">
                                  {formatCurrency(cust.totalFee)}
                                </td>
                                <td><PaidBadge status={cust.paidStatus} /></td>
                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => triggerNotification(cust.rows, cust.customerCode, cust.customerName, cust.custId, dateKey)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full bg-primary-500 text-white hover:bg-primary-600"
                                  >
                                    <Bell className="w-3.5 h-3.5" />
                                    Thông báo
                                  </button>
                                </td>
                                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                  {getUserRole() !== 'staff' && (
                                    <button
                                      onClick={() => setPaymentModal({ customerId: cust.custId, batchDate: dateKey, amount: cust.totalFee })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full bg-greige-100 text-ink-700 hover:bg-greige-200"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      Thanh toán
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={9} className="p-0">
                                    <div className="border-t border-greige-100 bg-greige-50/40">
                                      <table className="data-table w-full min-w-[860px]">
                                        <thead>
                                          <tr className="bg-greige-50">
                                            <th className="w-16">Kho</th>
                                            <th>Tracking #</th>
                                            <th className="w-28">Sản phẩm</th>
                                            <th className="w-24 text-right">Cân nặng</th>
                                            <th className="w-24 text-right">Phụ thu</th>
                                            <th className="w-32 text-right">Tổng phí VC</th>
                                            <th className="w-28">Ghi chú</th>
                                            <th className="w-24 text-right">Thao tác</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cust.rows.map((s) => {
                                            const isEditing = editingId === s.id;
                                            return (
                                              <tr key={s.id} className={isEditing ? 'bg-primary-50/40' : ''}>
                                                <td>{s.warehouse_code || '–'}</td>
                                                <td>
                                                  {isEditing ? (
                                                    <input value={editValues.tracking_no}
                                                      onChange={(e) => setEditValues((p) => ({ ...p, tracking_no: e.target.value }))}
                                                      className="input-field py-1 text-xs w-28" />
                                                  ) : (
                                                    <span className="font-mono text-xs truncate block" title={s.tracking_no}>{s.tracking_no || '–'}</span>
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
                                                <td className="text-right tabular-nums">
                                                  {isEditing ? (
                                                    <input type="number" value={editValues.weight}
                                                      onChange={(e) => setEditValues((p) => ({ ...p, weight: e.target.value }))}
                                                      className="input-field py-1 text-xs w-full text-right" step={0.01} min={0} />
                                                  ) : (
                                                    `${s.weight} kg`
                                                  )}
                                                </td>
                                                <td className="text-right tabular-nums">
                                                  {isEditing ? (
                                                    <MoneyInput value={editValues.surcharge}
                                                      onChange={(v) => setEditValues((p) => ({ ...p, surcharge: v }))}
                                                      className="input-field py-1 text-xs w-full text-right" />
                                                  ) : (
                                                    formatCurrency(s.surcharge)
                                                  )}
                                                </td>
                                                <td className="text-right tabular-nums font-semibold text-primary-700">
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
                                                          className="text-xs px-2.5 py-1 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600">
                                                          Lưu
                                                        </button>
                                                        <button onClick={cancelEdit}
                                                          className="text-xs px-2.5 py-1 bg-greige-100 text-ink-500 rounded-full font-semibold hover:bg-greige-200">
                                                          Hủy
                                                        </button>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <button onClick={() => startEdit(s)} aria-label="Chỉnh sửa"
                                                          className="btn-icon text-primary-600 hover:bg-primary-50" title="Chỉnh sửa">
                                                          <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} aria-label="Xóa"
                                                          className="btn-icon text-danger-600 hover:bg-danger-100 disabled:opacity-50" title="Xóa">
                                                          <Trash2 className="w-4 h-4" />
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
          onClose={() => setPaymentModal(null)}
          onSaved={() => setPaymentModal(null)}
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
    </div>
  );
}
