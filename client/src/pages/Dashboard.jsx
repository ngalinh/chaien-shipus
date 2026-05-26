import { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Users, UserPlus, Weight, Banknote, ArrowUpDown, TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '../utils.jsx';

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
  const [endDate, setEndDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [period, startDate, endDate]);

  async function fetchStats() {
    setLoading(true);
    try {
      let params = {};
      if (period === 'custom') {
        params = { start_date: startDate, end_date: endDate };
      } else if (period === 'month') {
        params = { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD') };
      } else {
        params = { period };
      }
      const res = await axios.get('/api/dashboard', { params });
      setData(res.data);
    } catch (err) {
      console.error('fetchStats:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(val) {
    setPeriod(val);
    if (val === 'month') {
      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
    } else if (val === '3m') {
      setStartDate(dayjs().subtract(3, 'month').format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
    } else if (val === '6m') {
      setStartDate(dayjs().subtract(6, 'month').format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
    } else if (val === '1y') {
      setStartDate(dayjs().subtract(1, 'year').format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
    }
  }

  const s = data?.summary || {};

  const cards = [
    {
      label: 'SL khách hàng',
      value: s.total_customers,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-200',
      format: 'number',
    },
    {
      label: 'SL khách mới',
      value: s.new_customers,
      icon: UserPlus,
      color: 'bg-primary-50 text-primary-600',
      border: 'border-primary-200',
      format: 'number',
    },
    {
      label: 'Tổng cân nặng (kg)',
      value: s.total_weight,
      icon: Weight,
      color: 'bg-purple-50 text-purple-600',
      border: 'border-purple-200',
      format: 'kg',
    },
    {
      label: 'Tổng phí VC (khách trả)',
      value: s.total_vc_fee_customer,
      icon: Banknote,
      color: 'bg-yellow-50 text-yellow-600',
      border: 'border-yellow-200',
      format: 'currency',
    },
    {
      label: 'Tổng phí VC (trả đối tác)',
      value: s.total_vc_fee_partner,
      icon: ArrowUpDown,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-200',
      format: 'currency',
    },
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
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Tổng quan hoạt động kinh doanh</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Khoảng thời gian:</span>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  period === p.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Từ:</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field w-auto py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Đến:</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field w-auto py-1.5 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Date range display */}
        <div className="mt-2 text-xs text-gray-400">
          {dayjs(displayStart).format('DD/MM/YYYY')} – {dayjs(displayEnd).format('DD/MM/YYYY')}
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`stat-card border ${card.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {renderValue(card)}
                </div>
                <div className="text-xs text-gray-500 font-medium">{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary note */}
      {!loading && data && (
        <div className="card p-4 bg-primary-50 border-primary-200">
          <p className="text-sm text-primary-700">
            <span className="font-semibold">Lợi nhuận gộp:</span>{' '}
            {formatCurrency(s.gross_margin || 0)}
            {' '} (Phí khách trả – Phí đối tác)
          </p>
          {s.total_receivable > 0 && (
            <p className="text-sm text-orange-700 mt-1">
              <span className="font-semibold">Tổng còn phải thu:</span>{' '}
              {formatCurrency(s.total_receivable)}
            </p>
          )}
        </div>
      )}

      {/* Top customers */}
      {!loading && data?.top_customers?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top khách hàng (theo phí VC)</h3>
          <div className="space-y-2">
            {data.top_customers.slice(0, 5).map((c, idx) => (
              <div key={c.customer_id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.customer_name}</div>
                  <div className="text-xs text-gray-500">{c.customer_code} · {c.total_weight} kg · {c.shipment_count} kiện</div>
                </div>
                <div className="text-sm font-semibold text-primary-700 flex-shrink-0">
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
