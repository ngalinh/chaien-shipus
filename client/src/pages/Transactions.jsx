import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { Plus, Calendar, Receipt } from 'lucide-react';
import { formatCurrency, formatDate, todayInputValue } from '../utils.jsx';
import TransactionModal from '../components/TransactionModal.jsx';

const CATEGORY_LABEL = {
  customer_payment: 'Phí VC khách trả',
  partner_payment:  'Phí VC trả đối tác',
};

const PERIODS = [
  { label: 'Trong tháng', value: 'month' },
  { label: '3 tháng', value: '3m' },
  { label: '6 tháng', value: '6m' },
  { label: 'Tất cả', value: 'all' },
];

function rangeFor(period) {
  if (period === 'all') return {};
  if (period === '3m') return { start_date: dayjs().subtract(3, 'month').format('YYYY-MM-DD'), end_date: todayInputValue() };
  if (period === '6m') return { start_date: dayjs().subtract(6, 'month').format('YYYY-MM-DD'), end_date: todayInputValue() };
  return { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: todayInputValue() };
}

const cleanCode = (code) => (code || '').replace(/\s+/g, ' ').trim();

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [payModal, setPayModal] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [period]);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const res = await axios.get('/api/transactions/ledger', { params: rangeFor(period) });
      setRows(res.data);
    } catch (err) {
      console.error('fetchTransactions:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalThu = rows.reduce((a, r) => a + (r.thu || 0), 0);
  const totalChi = rows.reduce((a, r) => a + (r.chi || 0), 0);
  const balance = totalThu - totalChi;

  // Mới nhất trước
  const display = [...rows].reverse();

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-page font-bold text-ink-900 leading-tight">Giao dịch</h1>
          <p className="text-body-md text-ink-500 mt-1.5">Tổng hợp thanh toán & công nợ của khách</p>
        </div>
        <button onClick={() => setPayModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Tạo thanh toán
        </button>
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

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold text-ink-500 inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          Khoảng thời gian:
        </span>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
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
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngày tháng</th>
              <th>Danh mục</th>
              <th>Mã KH / Đối tác</th>
              <th>Nội dung</th>
              <th className="text-right">Thu (đ)</th>
              <th className="text-right">Chi (đ)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-ink-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-ink-400">
                  <Receipt className="w-10 h-10 text-ink-300 mx-auto mb-3" strokeWidth={1.6} />
                  Chưa có giao dịch nào trong khoảng này
                </td>
              </tr>
            ) : (
              display.map((t) => (
                <tr key={t.key}>
                  <td className="whitespace-nowrap font-medium">{formatDate(t.trans_date)}</td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      t.category === 'customer_payment' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-600'
                    }`}>
                      {CATEGORY_LABEL[t.category] || '–'}
                    </span>
                  </td>
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
                      <span className="text-sm text-ink-700">{t.warehouse_name || t.warehouse_code || '–'}</span>
                    )}
                    {t.category === 'customer_payment' && t.customer_name && (
                      <div className="text-xs text-ink-400 truncate max-w-[160px]">{t.customer_name}</div>
                    )}
                  </td>
                  <td className="max-w-[320px]"><span className="truncate block" title={t.description}>{t.description || '–'}</span></td>
                  <td className="text-right tabular-nums text-success-700 font-medium">{t.thu > 0 ? formatCurrency(t.thu) : '–'}</td>
                  <td className="text-right tabular-nums text-danger-600 font-medium">{t.chi > 0 ? formatCurrency(t.chi) : '–'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payModal && (
        <TransactionModal
          onClose={() => setPayModal(false)}
          onSaved={() => { setPayModal(false); fetchTransactions(); }}
        />
      )}
    </div>
  );
}
