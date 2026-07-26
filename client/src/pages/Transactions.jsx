import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { Plus, Calendar, Receipt, Edit2, Trash2, Search, X } from 'lucide-react';
import { formatCurrency, formatDate, todayInputValue, getUserRole } from '../utils.jsx';
import TransactionModal from '../components/TransactionModal.jsx';
import { toast } from '../components/Toast.jsx';

const CATEGORY_LABEL = {
  customer_payment: 'Phí VC khách trả',
  partner_payment:  'Phí VC trả đối tác',
};

const PERIODS = [
  { label: 'Trong tháng', value: 'month' },
  { label: 'Tất cả',      value: 'all' },
  { label: 'Tuỳ chọn',   value: 'custom' },
];

const CAT_FILTERS = [
  { label: 'Tất cả',      value: 'all' },
  { label: 'Thu',         value: 'customer_payment' },
  { label: 'Chi',         value: 'partner_payment' },
];

function rangeFor(period, customStart, customEnd) {
  if (period === 'all')    return {};
  if (period === 'custom') return { start_date: customStart, end_date: customEnd };
  return { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: todayInputValue() };
}

const cleanCode = (code) => (code || '').replace(/\s+/g, ' ').trim();

export default function Transactions() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [period, setPeriod]       = useState('month');
  const [customStart, setCustomStart] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd]     = useState(todayInputValue());
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null); // null | 'create' | row-object (edit)
  const [deleting, setDeleting]   = useState(null);
  const role = getUserRole();

  useEffect(() => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    fetchTransactions();
  }, [period, customStart, customEnd]);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const res = await axios.get('/api/transactions/ledger', { params: rangeFor(period, customStart, customEnd) });
      setRows(res.data);
    } catch (err) {
      console.error('fetchTransactions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm('Xoá giao dịch này?')) return;
    setDeleting(row.key);
    try {
      if (row.category === 'customer_payment') {
        await axios.delete(`/api/transactions/pay/${row.id}`);
      } else {
        await axios.delete(`/api/transactions/partner/${row.id}`);
      }
      toast('Đã xoá giao dịch', 'success');
      fetchTransactions();
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể xoá', 'error');
    } finally {
      setDeleting(null);
    }
  }

  const display = useMemo(() => {
    let list = [...rows].reverse();
    if (catFilter !== 'all') {
      list = list.filter((r) => r.category === catFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const qNum = q.replace(/[,.\s]/g, '');
      list = list.filter((r) => {
        const code = cleanCode(r.customer_code || r.warehouse_code || '').toLowerCase();
        const name = (r.customer_name || r.warehouse_name || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const amt  = String(r.thu > 0 ? r.thu : r.chi);
        return code.includes(q) || name.includes(q) || desc.includes(q) || amt.includes(qNum);
      });
    }
    return list;
  }, [rows, catFilter, search]);

  const totalThu = display.reduce((a, r) => a + (r.thu || 0), 0);
  const totalChi = display.reduce((a, r) => a + (r.chi || 0), 0);
  const balance  = totalThu - totalChi;

  const colSpan = role !== 'staff' ? 7 : 6;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-page font-bold text-ink-900 leading-tight">Giao dịch</h1>
          <p className="text-body-md text-ink-500 mt-1.5">Tổng hợp thanh toán & công nợ của khách</p>
        </div>
        {role !== 'staff' && (
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tạo thanh toán
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-ink-500">Tổng Thu (khách trả)</div>
          <div className="text-2xl font-bold text-success-700 mt-1">{formatCurrency(totalThu)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-500">Tổng Chi (trả đối tác)</div>
          <div className="text-2xl font-bold text-danger-600 mt-1">{formatCurrency(totalChi)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-500">Chênh lệch (Thu − Chi)</div>
          <div className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-success-700' : 'text-warning-500'}`}>
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      {/* Filters + Search row */}
      <div className="flex flex-wrap gap-x-5 gap-y-3 items-center">
        {/* Khoảng thời gian */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-500 inline-flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-4 h-4" />
            Thời gian:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
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
        </div>

        {/* Danh mục */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-500 whitespace-nowrap">Danh mục:</span>
          <div className="flex flex-wrap gap-1.5">
            {CAT_FILTERS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCatFilter(c.value)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                  catFilter === c.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-ink-500 shadow-pill hover:bg-greige-50'
                }`}
                style={{ transition: 'background-color 150ms ease-out, color 150ms ease-out' }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã KH, đối tác, nội dung, số tiền…"
            className="input-field pl-9 pr-8 text-sm w-64"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-500 whitespace-nowrap">Từ:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="input-field !w-auto text-sm"
          />
          <span className="text-sm font-semibold text-ink-500">đến:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="input-field !w-auto text-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <colgroup>
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-36" />
            <col />
            <col className="w-28" />
            <col className="w-28" />
            {role !== 'staff' && <col className="w-20" />}
          </colgroup>
          <thead>
            <tr>
              <th>Ngày tháng</th>
              <th>Danh mục</th>
              <th>Mã KH / Đối tác</th>
              <th>Nội dung</th>
              <th className="!text-right">Thu (đ)</th>
              <th className="!text-right">Chi (đ)</th>
              {role !== 'staff' && <th className="text-center">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-10 text-ink-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-14 text-ink-400">
                  <Receipt className="w-10 h-10 text-ink-300 mx-auto mb-3" strokeWidth={1.6} />
                  {search ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch nào trong khoảng này'}
                </td>
              </tr>
            ) : (
              display.map((t) => (
                <tr key={t.key}>
                  <td className="whitespace-nowrap font-medium">{formatDate(t.trans_date)}</td>

                  {/* Danh mục */}
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      t.category === 'customer_payment'
                        ? 'bg-success-100 text-success-700'
                        : 'bg-danger-100 text-danger-600'
                    }`}>
                      {CATEGORY_LABEL[t.category] || '–'}
                    </span>
                  </td>

                  {/* Mã KH / Đối tác */}
                  <td>
                    {t.category === 'customer_payment' ? (
                      <Link
                        to={`/customers/${t.customer_id}?tab=transactions`}
                        className="font-mono text-sm text-primary-700 hover:underline"
                        title={`Xem giao dịch ${cleanCode(t.customer_code)}`}
                      >
                        {cleanCode(t.customer_code) || `#${t.customer_id}`}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-ink-700">
                        {t.warehouse_name || t.warehouse_code || '–'}
                      </span>
                    )}
                    {t.category === 'customer_payment' && t.customer_name && (
                      <div className="text-xs text-ink-400 truncate">{t.customer_name}</div>
                    )}
                  </td>

                  {/* Nội dung */}
                  <td className="max-w-0">
                    <span className="truncate block text-sm text-ink-700" title={t.description || ''}>
                      {t.description || '–'}
                    </span>
                  </td>

                  <td className="!text-right tabular-nums text-success-700 font-medium">
                    {t.thu > 0 ? formatCurrency(t.thu) : '–'}
                  </td>
                  <td className="!text-right tabular-nums text-danger-600 font-medium">
                    {t.chi > 0 ? formatCurrency(t.chi) : '–'}
                  </td>

                  {role !== 'staff' && (
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModal(t)}
                          className="btn-icon text-primary-600 hover:bg-primary-50"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deleting === t.key}
                          className="btn-icon text-danger-600 hover:bg-danger-100 disabled:opacity-50"
                          title="Xoá"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <TransactionModal
          initialData={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchTransactions(); }}
        />
      )}
    </div>
  );
}
