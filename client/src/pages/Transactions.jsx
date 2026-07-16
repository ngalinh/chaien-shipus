import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { Plus, Calendar, Receipt } from 'lucide-react';
import { formatCurrency, formatDate, todayInputValue } from '../utils.jsx';
import PaymentModal from '../components/PaymentModal.jsx';

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
      const res = await axios.get('/api/transactions', { params: rangeFor(period) });
      setRows(res.data);
    } catch (err) {
      console.error('fetchTransactions:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalCredit = rows.reduce((a, r) => a + (r.credit || 0), 0);
  const totalDebit = rows.reduce((a, r) => a + (r.debit || 0), 0);
  const balance = totalCredit - totalDebit;

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
          <div className="text-sm text-ink-500">Tổng khách đã thanh toán</div>
          <div className="text-2xl font-bold text-primary-700 mt-1">{formatCurrency(totalCredit)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-500">Tổng phí VC (chi phí)</div>
          <div className="text-2xl font-bold text-danger-600 mt-1">{formatCurrency(totalDebit)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-500">Chênh lệch (đã thu − phí)</div>
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
              <th>Mã KH</th>
              <th>Nội dung</th>
              <th className="text-right">Thu (đ)</th>
              <th className="text-right">Chi (đ)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-ink-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-14 text-ink-400">
                  <Receipt className="w-10 h-10 text-ink-300 mx-auto mb-3" strokeWidth={1.6} />
                  Chưa có giao dịch nào trong khoảng này
                </td>
              </tr>
            ) : (
              display.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap font-medium">{formatDate(t.trans_date)}</td>
                  <td>
                    <Link
                      to={`/customers/${t.customer_id}?tab=transactions`}
                      className="font-mono text-sm text-primary-700 hover:underline"
                      title={`Xem giao dịch ${cleanCode(t.customer_code)}`}
                    >
                      {cleanCode(t.customer_code) || `#${t.customer_id}`}
                    </Link>
                    {t.customer_name && <div className="text-xs text-ink-400 truncate max-w-[160px]">{t.customer_name}</div>}
                  </td>
                  <td className="max-w-[320px]"><span className="truncate block" title={t.description}>{t.description || '–'}</span></td>
                  <td className="text-right tabular-nums text-success-700 font-medium">{t.credit > 0 ? formatCurrency(t.credit) : '–'}</td>
                  <td className="text-right tabular-nums text-danger-600 font-medium">{t.debit > 0 ? formatCurrency(t.debit) : '–'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payModal && (
        <PaymentModal
          onClose={() => setPayModal(false)}
          onSaved={() => { setPayModal(false); fetchTransactions(); }}
        />
      )}
    </div>
  );
}
