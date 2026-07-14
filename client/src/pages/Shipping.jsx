import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Plus, Edit2, Trash2, Bell, ChevronDown, ChevronRight, Calendar, PackageOpen,
} from 'lucide-react';
import { formatCurrency, formatDate, todayInputValue } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import ImportModal from '../components/ImportModal.jsx';
import NotificationTemplate from '../components/NotificationTemplate.jsx';
import VanDonInlineEdit from '../components/VanDonInlineEdit.jsx';

const PERIODS = [
  { label: 'Trong tháng', value: 'month' },
  { label: '3 tháng', value: '3m' },
  { label: '6 tháng', value: '6m' },
  { label: 'Tất cả', value: 'all' },
  { label: 'Tùy chỉnh', value: 'custom' },
];

function rangeFor(period, startDate, endDate) {
  if (period === 'all') return {};
  if (period === 'custom') return { start_date: startDate, end_date: endDate };
  if (period === '3m') return { start_date: dayjs().subtract(3, 'month').format('YYYY-MM-DD'), end_date: todayInputValue() };
  if (period === '6m') return { start_date: dayjs().subtract(6, 'month').format('YYYY-MM-DD'), end_date: todayInputValue() };
  return { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: todayInputValue() };
}

// Mã KH gộp nhiều alias (có xuống dòng) → gọn 1 dòng để hiển thị
const cleanCode = (code) => (code || '').replace(/\s+/g, ' ').trim();

export default function Shipping() {
  const [tab, setTab] = useState('incoming');
  const [shipments, setShipments] = useState([]);
  const [notifyBatches, setNotifyBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [notifData, setNotifData] = useState(null);
  const [settings, setSettings] = useState({ company: {} });

  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(todayInputValue);

  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (tab === 'incoming') fetchShipments();
    else fetchNotifyBatches();
  }, [tab, period, startDate, endDate]);

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

  async function fetchNotifyBatches() {
    setLoading(true);
    try {
      const res = await axios.get('/api/shipments/bao-khach', { params: rangeFor(period, startDate, endDate) });
      setNotifyBatches(res.data);
    } catch (err) {
      console.error('fetchNotifyBatches:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(val) {
    setPeriod(val);
    if (val === '3m') setStartDate(dayjs().subtract(3, 'month').format('YYYY-MM-DD'));
    else if (val === '6m') setStartDate(dayjs().subtract(6, 'month').format('YYYY-MM-DD'));
    else if (val === 'month') setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
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

  async function updateVanDon(batch, value) {
    try {
      await axios.put('/api/shipments/batch', {
        batch_date: batch.batch_date,
        customer_id: batch.customer_id,
        van_don_code: value,
      });
      setNotifyBatches((prev) =>
        prev.map((b) =>
          b.batch_date === batch.batch_date && b.customer_id === batch.customer_id
            ? { ...b, van_don_code: value }
            : b
        )
      );
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể cập nhật mã vận đơn', 'error');
    }
  }

  async function triggerNotification(batch) {
    const details = batch.details || [];
    if (details.length === 0) {
      toast('Không có kiện hàng trong lô này', 'warning');
      return;
    }

    try {
      await axios.post('/api/shipments/batch/notify', {
        batch_date: batch.batch_date,
        customer_id: batch.customer_id,
      });
    } catch { /* non-critical */ }

    setNotifData({
      batch,
      customerName: batch.customer_name,
      date: batch.batch_date,
      items: details.map((s) => ({
        tracking_no: s.tracking_no,
        product: s.product,
        weight: s.weight,
        customer_fee: s.phi_vc || (s.weight * s.customer_rate + s.surcharge),
      })),
      fileName: `thong-bao-${batch.customer_code || 'kh'}-${batch.batch_date}.png`,
    });
  }

  function handleImported() {
    setImportModal(false);
    fetchShipments();
  }

  // Lọc theo ô tìm kiếm (mã KH / tên KH / tracking #)
  const matchShipment = (s) =>
    !q ||
    cleanCode(s.customer_code).toLowerCase().includes(q) ||
    (s.customer_name || '').toLowerCase().includes(q) ||
    (s.tracking_no || '').toLowerCase().includes(q);

  const filteredShipments = shipments.filter(matchShipment);

  const filteredBatches = notifyBatches.filter((b) =>
    !q ||
    cleanCode(b.customer_code).toLowerCase().includes(q) ||
    (b.customer_name || '').toLowerCase().includes(q) ||
    (b.van_don_code || '').toLowerCase().includes(q) ||
    (b.details || []).some((d) => (d.tracking_no || '').toLowerCase().includes(q)));

  // Gom shipments theo ngày (đợt hàng về), mới nhất trước
  const dateGroups = [];
  {
    const map = new Map();
    for (const s of filteredShipments) {
      if (!map.has(s.import_date)) map.set(s.import_date, []);
      map.get(s.import_date).push(s);
    }
    for (const [date, rows] of map) {
      dateGroups.push({
        date,
        rows,
        count: rows.length,
        weight: rows.reduce((a, s) => a + (s.weight || 0), 0),
        partnerFee: rows.reduce((a, s) => a + (s.weight || 0) * (s.partner_rate || 0), 0),
      });
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-ink-900 leading-tight">Vận chuyển</h1>
          <p className="text-[15px] text-ink-500 mt-1.5">Quản lý hàng về và báo khách</p>
        </div>
        {tab === 'incoming' && (
          <button onClick={() => setImportModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nhập kho
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1.5 bg-white rounded-full shadow-pill">
        <button
          onClick={() => setTab('incoming')}
          className={`tab-btn ${tab === 'incoming' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Hàng về
        </button>
        <button
          onClick={() => setTab('notify')}
          className={`tab-btn ${tab === 'notify' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Báo khách
        </button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold text-ink-500 inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          Khoảng thời gian:
        </span>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-150 ${
                period === p.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-ink-500 shadow-pill hover:bg-greige-50'
              }`}
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

      {/* Tab: Hàng về — gom theo đợt (ngày) */}
      {tab === 'incoming' && (
        loading ? (
          <div className="table-container p-12 text-center text-ink-400">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Đang tải...
            </div>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="table-container p-14 text-center">
            <PackageOpen className="w-10 h-10 text-ink-300 mx-auto mb-3" strokeWidth={1.6} />
            <p className="text-ink-500 font-medium">{q ? 'Không tìm thấy kiện hàng khớp' : 'Chưa có hàng về trong khoảng này'}</p>
            <p className="text-ink-400 text-sm mt-1">{q ? 'Thử từ khóa khác hoặc xóa ô tìm kiếm.' : 'Nhấn "Nhập kho" để thêm đợt hàng mới.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((g) => {
              const isCollapsed = collapsedDates[g.date];
              return (
                <div key={g.date} className="card overflow-hidden">
                  {/* Đợt header */}
                  <button
                    onClick={() => setCollapsedDates((p) => ({ ...p, [g.date]: !p[g.date] }))}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-greige-50 transition-colors text-left"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                    <span className="text-[15px] font-bold text-ink-900">Đợt {formatDate(g.date)}</span>
                    <span className="text-sm text-ink-400">
                      {g.count} kiện · {g.weight.toFixed(2)} kg · phí đối tác {formatCurrency(g.partnerFee)}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="table-container rounded-none shadow-none border-t border-greige-100">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Mã KH</th>
                            <th>Kho</th>
                            <th>Tracking #</th>
                            <th>Sản phẩm</th>
                            <th className="text-right">Cân nặng</th>
                            <th className="text-right">Phụ thu</th>
                            <th className="text-right">Phí trả đối tác</th>
                            <th>Ghi chú</th>
                            <th className="text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((s) => {
                            const isEditing = editingId === s.id;
                            return (
                              <tr key={s.id} className={isEditing ? 'bg-primary-50/40' : ''}>
                                <td>
                                  <Link
                                    to={`/customers/${s.customer_id}`}
                                    className="block max-w-[160px] group"
                                    title={`Xem hồ sơ ${cleanCode(s.customer_code)}`}
                                  >
                                    <span className="font-mono text-sm text-primary-700 group-hover:underline truncate block">
                                      {cleanCode(s.customer_code)}
                                    </span>
                                    {s.customer_name && (
                                      <span className="text-xs text-ink-400 truncate block">{s.customer_name}</span>
                                    )}
                                  </Link>
                                </td>
                                <td>{s.warehouse_code || '–'}</td>
                                <td>
                                  {isEditing ? (
                                    <input value={editValues.tracking_no}
                                      onChange={(e) => setEditValues((p) => ({ ...p, tracking_no: e.target.value }))}
                                      className="input-field py-1 text-xs w-28" />
                                  ) : (
                                    <span className="font-mono text-xs">{s.tracking_no || '–'}</span>
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input value={editValues.product}
                                      onChange={(e) => setEditValues((p) => ({ ...p, product: e.target.value }))}
                                      className="input-field py-1 text-xs w-28" />
                                  ) : (
                                    <span className="max-w-[140px] truncate block" title={s.product}>{s.product || '–'}</span>
                                  )}
                                </td>
                                <td className="text-right tabular-nums">
                                  {isEditing ? (
                                    <input type="number" value={editValues.weight}
                                      onChange={(e) => setEditValues((p) => ({ ...p, weight: e.target.value }))}
                                      className="input-field py-1 text-xs w-20 text-right" step={0.01} min={0} />
                                  ) : (
                                    `${s.weight} kg`
                                  )}
                                </td>
                                <td className="text-right tabular-nums">
                                  {isEditing ? (
                                    <input type="number" value={editValues.surcharge}
                                      onChange={(e) => setEditValues((p) => ({ ...p, surcharge: e.target.value }))}
                                      className="input-field py-1 text-xs w-24 text-right" step={1000} min={0} />
                                  ) : (
                                    formatCurrency(s.surcharge)
                                  )}
                                </td>
                                <td className="text-right tabular-nums">{formatCurrency(s.weight * s.partner_rate)}</td>
                                <td>
                                  {isEditing ? (
                                    <input value={editValues.notes}
                                      onChange={(e) => setEditValues((p) => ({ ...p, notes: e.target.value }))}
                                      className="input-field py-1 text-xs w-28" />
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
                                          className="btn-icon text-[#C2453F] hover:bg-[#F8E1E0] disabled:opacity-50" title="Xóa">
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
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Tab: Báo khách */}
      {tab === 'notify' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Ngày tháng</th>
                <th>Mã KH</th>
                <th className="text-right">SL tracking</th>
                <th className="text-right">Tổng cân nặng</th>
                <th className="text-right">Phí đối tác</th>
                <th className="text-right">Tổng phụ thu</th>
                <th className="text-right">Tổng phí VC</th>
                <th>Mã vận đơn</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-ink-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-ink-400">
                    <PackageOpen className="w-10 h-10 text-ink-300 mx-auto mb-3" strokeWidth={1.6} />
                    {q ? 'Không tìm thấy lô hàng khớp' : 'Chưa có lô hàng nào trong khoảng này'}
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const bKey = `${batch.customer_id}-${batch.batch_date}`;
                  const isOpen = expandedBatch === bKey;
                  return [
                    <tr
                      key={bKey}
                      className={`cursor-pointer hover:bg-primary-50 ${batch.notified_at ? 'opacity-75' : ''}`}
                      onClick={() => setExpandedBatch(isOpen ? null : bKey)}
                    >
                      <td className="text-center text-ink-400">
                        {isOpen ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronRight className="w-4 h-4 inline" />}
                      </td>
                      <td className="font-medium whitespace-nowrap">{formatDate(batch.batch_date)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/customers/${batch.customer_id}`}
                          className="block max-w-[160px] group"
                          title={`Xem hồ sơ ${cleanCode(batch.customer_code)}`}
                        >
                          <span className="font-mono text-primary-700 group-hover:underline truncate block">{cleanCode(batch.customer_code)}</span>
                          <span className="text-xs text-ink-400 truncate block">{batch.customer_name}</span>
                        </Link>
                      </td>
                      <td className="text-right tabular-nums">{batch.tracking_count}</td>
                      <td className="text-right tabular-nums">{Number(batch.total_weight || 0).toFixed(2)} kg</td>
                      <td className="text-right tabular-nums">{formatCurrency(batch.total_partner_fee)}</td>
                      <td className="text-right tabular-nums">{formatCurrency(batch.total_surcharge)}</td>
                      <td className="text-right font-semibold text-primary-700 tabular-nums">{formatCurrency(batch.total_vc_fee)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <VanDonInlineEdit
                          value={batch.van_don_code || ''}
                          onSave={(v) => updateVanDon(batch, v)}
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                        <button
                          onClick={() => triggerNotification(batch)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full ${
                            batch.notified_at
                              ? 'bg-greige-100 text-ink-500 hover:bg-greige-200'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {batch.notified_at ? 'Gửi lại' : 'Thông báo'}
                        </button>
                        {batch.notify_count > 0 && (
                          <span className="block text-[11px] text-ink-400 mt-1" title={`Lần cuối: ${batch.notified_at ? dayjs(batch.notified_at).format('DD/MM/YYYY HH:mm') : ''}`}>
                            Đã báo {batch.notify_count} lần
                          </span>
                        )}
                      </td>
                    </tr>,
                    isOpen && (
                      <tr key={`${bKey}-detail`} className="expand-row">
                        <td colSpan={10} className="bg-primary-50/50 p-0">
                          <div className="px-8 py-3 overflow-x-auto">
                            <table className="w-full text-xs border-collapse min-w-[560px]">
                              <thead>
                                <tr className="bg-white">
                                  <th className="px-3 py-2 text-left text-ink-400 font-semibold">STT</th>
                                  <th className="px-3 py-2 text-left text-ink-400 font-semibold">Tracking #</th>
                                  <th className="px-3 py-2 text-left text-ink-400 font-semibold">Sản phẩm</th>
                                  <th className="px-3 py-2 text-right text-ink-400 font-semibold">Cân nặng</th>
                                  <th className="px-3 py-2 text-right text-ink-400 font-semibold">Phí đối tác</th>
                                  <th className="px-3 py-2 text-right text-ink-400 font-semibold">Phụ thu</th>
                                  <th className="px-3 py-2 text-right text-ink-400 font-semibold">Phí VC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(batch.details || []).map((s, idx) => {
                                  const vcFee = s.phi_vc || (s.weight * s.customer_rate + s.surcharge);
                                  return (
                                    <tr key={s.id} className="border-t border-greige-100 hover:bg-white">
                                      <td className="px-3 py-2 text-ink-400">{idx + 1}</td>
                                      <td className="px-3 py-2 font-mono">{s.tracking_no || '–'}</td>
                                      <td className="px-3 py-2 max-w-[160px] truncate" title={s.product}>{s.product || '–'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums">{s.weight} kg</td>
                                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(s.weight * s.partner_rate)}</td>
                                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(s.surcharge)}</td>
                                      <td className="px-3 py-2 text-right font-semibold text-primary-700 tabular-nums">{formatCurrency(vcFee)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Import modal */}
      {importModal && (
        <ImportModal onClose={() => setImportModal(false)} onImported={handleImported} />
      )}

      {/* Notification generator */}
      {notifData && (
        <div className="fixed -left-[9999px] top-0 z-[-1]">
          <NotificationTemplate
            customerName={notifData.customerName}
            date={notifData.date}
            items={notifData.items}
            companyName={settings.company?.company_name || 'ShipUS'}
            companyLogo={settings.company?.logo_path || undefined}
            hotline={settings.company?.hotline}
            autoDownload={true}
            fileName={notifData.fileName}
            onRendered={() => {
              toast('Đã tải xuống ảnh thông báo', 'success');
              setNotifData(null);
              fetchNotifyBatches();
            }}
          />
        </div>
      )}
    </div>
  );
}
