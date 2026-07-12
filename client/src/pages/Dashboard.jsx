import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Users, UserPlus, Weight, Banknote, ArrowUpDown, TrendingUp, Calendar,
} from 'lucide-react';
import { formatCurrency, todayInputValue } from '../utils.jsx';

const PERIODS = [
  { label: 'Trong tháng', value: 'month' },
  { label: '3 tháng', value: '3m' },
  { label: '6 tháng', value: '6m' },
  { label: '1 năm', value: '1y' },
  { label: 'Tùy chỉnh', value: 'custom' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(todayInputValue);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    fetchStats();
  }, [period, startDate, endDate]);

  async function fetchStats() {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    try {
      let params = {};
      if (period === 'custom') {
        params = { start_date: startDate, end_date: endDate };
      } else if (period === 'month') {
        params = { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: todayInputValue() };
      } else {
        params = { period };
      }
      const res = await axios.get('/api/dashboard', { params, signal });
      setData(res.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('fetchStats:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(val) {
    setPeriod(val);
    if (val === 'month') {
      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
      setEndDate(todayInputValue());
    } else if (val === '3m') {
      setStartDate(dayjs().subtract(3, 'month').format('YYYY-MM-DD'));
      setEndDate(todayInputValue());
    } else if (val === '6m') {
      setStartDate(dayjs().subtract(6, 'month').format('YYYY-MM-DD'));
      setEndDate(todayInputValue());
    } else if (val === '1y') {
      setStartDate(dayjs().subtract(1, 'year').format('YYYY-MM-DD'));
      setEndDate(todayInputValue());
    }
  }

  const s = data?.summary || {};

  const CARD_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5';

  const cards = [
    { label: 'SL khách hàng',            value: s.total_customers,       icon: Users,       format: 'number' },
    { label: 'SL khách mới',             value: s.new_customers,         icon: UserPlus,    format: 'number' },
    { label: 'Tổng cân nặng (kg)',       value: s.total_weight,          icon: Weight,      format: 'kg' },
    { label: 'Tổng phí VC (khách trả)',  value: s.total_vc_fee_customer, icon: Banknote,    format: 'currency' },
    { label: 'Tổng phí VC (trả đối tác)', value: s.total_vc_fee_partner, icon: ArrowUpDown, format: 'currency' },
  ];

  function renderValue(card) {
    if (card.value == null || !data) return '–';
    if (card.format === 'currency') return formatCurrency(card.value);
    if (card.format === 'kg') return `${Number(card.value).toLocaleString('vi-VN')} kg`;
    return Number(card.value).toLocaleString('vi-VN');
  }

  const displayStart = data?.period?.start_date || startDate;
  const displayEnd = data?.period?.end_date || endDate;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-bold text-ink-900 leading-tight">Dashboard</h1>
        <p className="text-[15px] text-ink-500 mt-1.5">Tổng quan hoạt động kinh doanh</p>
      </div>

      {/* Filter bar */}
      <div>
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

          <span className="sm:ml-auto text-sm text-ink-400 font-semibold">
            {dayjs(displayStart).format('DD/MM/YYYY')} – {dayjs(displayEnd).format('DD/MM/YYYY')}
          </span>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-500 font-semibold">Từ:</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field w-auto py-1.5 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-500 font-semibold">Đến:</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayInputValue()}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field w-auto py-1.5 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className={CARD_GRID}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-11 h-11 rounded-tile bg-greige-100 mb-4" />
              <div className="h-6 bg-greige-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-greige-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className={CARD_GRID}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card flex flex-col">
                <span className="w-11 h-11 rounded-tile bg-sand-100 text-primary-700 grid place-items-center">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={1.8} />
                </span>
                <div
                  className={`${card.format === 'currency' ? 'text-[20px]' : 'text-[26px]'} font-bold text-ink-900 mt-4 leading-none tabular-nums whitespace-nowrap`}
                >
                  {renderValue(card)}
                </div>
                <div className="text-[13px] text-ink-500 mt-auto pt-2 font-medium">{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gross profit highlight */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-primary-500 text-white rounded-card p-7 flex flex-col justify-between gap-6">
            <div className="flex items-center gap-2.5 text-[15px] font-semibold opacity-95">
              <TrendingUp className="w-5 h-5" />
              Lợi nhuận gộp
            </div>
            <div>
              <div className="text-[36px] font-bold tracking-tight leading-none">
                {formatCurrency(s.gross_margin || 0)}
              </div>
              <div className="text-[13px] opacity-85 mt-2">Phí khách trả − Phí đối tác</div>
            </div>
          </div>
          <div className={`card p-7 flex flex-col ${s.total_receivable > 0 ? 'justify-between gap-6' : 'justify-center'}`}>
            <div className="flex items-center gap-2.5 text-[15px] font-semibold text-ink-500">
              <Banknote className="w-5 h-5 text-primary-700" />
              Tổng còn phải thu
            </div>
            <div>
              <div className="text-[36px] font-bold tracking-tight leading-none text-ink-900 mt-2">
                {formatCurrency(s.total_receivable || 0)}
              </div>
              {s.total_receivable > 0 && (
                <div className="text-[13px] text-ink-400 mt-2">Số tiền khách hàng chưa thanh toán</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top customers */}
      {!loading && data?.top_customers?.length > 0 && (
        <div className="card p-6">
          <h3 className="text-[17px] font-bold text-ink-900 mb-4">Top khách hàng (theo phí VC)</h3>
          <div className="space-y-1">
            {data.top_customers.slice(0, 5).map((c, idx) => (
              <div key={c.customer_id} className="flex items-center gap-3 py-2 border-t border-greige-100 first:border-t-0">
                <div className="w-7 h-7 rounded-full bg-sand-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 truncate">{c.customer_name}</div>
                  <div className="text-xs text-ink-400">{c.customer_code} · {c.total_weight} kg · {c.shipment_count} kiện</div>
                </div>
                <div className="text-sm font-bold text-primary-700 flex-shrink-0">
                  {formatCurrency(c.total_vc_fee)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
