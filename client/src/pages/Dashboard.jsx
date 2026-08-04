import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { formatCurrency, todayInputValue } from '../utils.jsx';

const PERIODS = [
  { label: '3 tháng', value: '3m' },
  { label: '6 tháng', value: '6m' },
  { label: '1 năm', value: '1y' },
  { label: 'Tùy chỉnh', value: 'custom' },
];

const BAR_HEIGHTS_MOCK = [22, 38, 30, 56, 44, 72, 100];

function BarChart({ bars }) {
  const items = bars && bars.length > 0
    ? bars
    : BAR_HEIGHTS_MOCK.map(h => ({ value: h }));
  const max = Math.max(...items.map(b => b.value), 1);
  const heights = items.map(b => Math.max(5, Math.round((Math.max(0, b.value) / max) * 100)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 74, marginTop: 24 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: '5px 5px 2px 2px',
            background: i === heights.length - 1
              ? 'linear-gradient(180deg,#8FDCF0,#3AAFD3)'
              : `rgba(143,220,240,${0.15 + (h / 100) * 0.4})`,
            boxShadow: i === heights.length - 1 ? '0 0 22px -4px rgba(143,220,240,.8)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(todayInputValue);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const monthInputRef = useRef(null);
  const location = useLocation();

  useEffect(() => { fetchStats(); }, [period, selectedMonth, startDate, endDate, location.key]);

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
        params = {
          start_date: dayjs(selectedMonth).startOf('month').format('YYYY-MM-DD'),
          end_date:   dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD'),
        };
      } else {
        params = { period };
      }
      const res = await axios.get('/api/dashboard', { params, signal });
      setData(res.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(val) {
    setPeriod(val);
    if (val === '3m') {
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

  function handleMonthChange(val) {
    setSelectedMonth(val);
    setPeriod('month');
  }

  function handleMonthPillClick() {
    setPeriod('month');
    try { monthInputRef.current?.showPicker(); } catch { /* unsupported browser */ }
  }

  const s = data?.summary || {};
  const displayStart = data?.period?.start_date || startDate;
  const displayEnd = data?.period?.end_date || endDate;

  const periodLabel = period === 'month'
    ? dayjs(selectedMonth).format('MM/YYYY')
    : PERIODS.find(p => p.value === period)?.label || '';

  const chartBars = useMemo(() => {
    if (!data) return null;
    const monthly = data.monthly_breakdown || [];
    const daily   = data.daily_breakdown || [];
    if (monthly.length <= 1 && daily.length > 0) {
      return daily.map(d => ({ value: d.gross_margin }));
    }
    return monthly.map(m => ({ value: m.gross_margin }));
  }, [data]);

  const smallTiles = [
    {
      label: 'Còn phải thu',
      value: s.total_receivable,
      unit: 'đ',
      note: s.total_receivable > 0 ? `${(s.total_receivable / 1000).toFixed(0)}k chưa thu` : 'Đã thu đủ',
      noteColor: s.total_receivable > 0 ? 'var(--warnTx)' : 'var(--okTx)',
      format: 'currency',
    },
    {
      label: 'Tổng cân nặng',
      value: s.total_weight,
      unit: 'kg',
      note: `${s.total_shipments || 0} kiện trong kỳ`,
      noteColor: 'var(--mu)',
      format: 'weight',
    },
    {
      label: 'Khách hàng',
      value: s.total_customers,
      unit: '',
      note: s.new_customers ? `+${s.new_customers} khách mới` : 'Không có mới',
      noteColor: s.new_customers > 0 ? 'var(--ac)' : 'var(--mu)',
      format: 'number',
    },
    {
      label: 'Trả đối tác',
      value: s.total_vc_fee_partner,
      unit: 'đ',
      note: 'Phí chuyển đối tác',
      noteColor: 'var(--mu)',
      format: 'currency',
    },
  ];

  function fmtTile(tile) {
    if (tile.value == null || !data) return '–';
    if (tile.format === 'currency') return (tile.value / 1000000).toFixed(2).replace('.', ',') + ' tr';
    if (tile.format === 'weight') return Number(tile.value).toFixed(2) + ' kg';
    return Number(tile.value).toLocaleString('vi-VN');
  }

  const maxFee = Math.max(...(data?.top_customers || []).map(c => c.total_vc_fee || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 4px 0' }}>

      {/* Page header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>
            Tổng quan
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>
            Hoạt động kinh doanh · {dayjs(displayStart).format('DD/MM')} – {dayjs(displayEnd).format('DD/MM/YYYY')}
          </p>
        </div>

        {/* Period segmented pills */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: 5,
          borderRadius: 15,
          background: 'var(--sf)',
          border: '1px solid var(--ln)',
          backdropFilter: 'blur(14px)',
          flexWrap: 'wrap',
        }}>
          {/* Month picker pill */}
          <div style={{ position: 'relative' }}>
            <button
              className="tab-btn"
              onClick={handleMonthPillClick}
              style={{
                background: period === 'month' ? 'var(--tx)' : 'transparent',
                color: period === 'month' ? 'var(--page-bg)' : 'var(--mu)',
              }}
            >
              {period === 'month' ? dayjs(selectedMonth).format('MM/YYYY') : 'Tháng'}
            </button>
            <input
              ref={monthInputRef}
              type="month"
              value={selectedMonth}
              onChange={e => handleMonthChange(e.target.value)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, top: '100%', left: 0 }}
            />
          </div>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className="tab-btn"
              style={{
                background: period === p.value ? 'var(--tx)' : 'transparent',
                color: period === p.value ? 'var(--page-bg)' : 'var(--mu)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* Custom date range */}
      {period === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="label" style={{ marginBottom: 0 }}>Từ:</label>
            <input type="date" value={startDate} max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="input-field" style={{ width: 'auto', padding: '7px 12px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="label" style={{ marginBottom: 0 }}>Đến:</label>
            <input type="date" value={endDate} min={startDate} max={todayInputValue()}
              onChange={e => setEndDate(e.target.value)}
              className="input-field" style={{ width: 'auto', padding: '7px 12px' }} />
          </div>
        </div>
      )}

      {/* Hero KPI */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 18 }}>
          {[0, 1].map(i => (
            <div key={i} className="glass-card" style={{ padding: '26px 28px', minHeight: 180 }}>
              <div style={{ height: 10, background: 'var(--sf2)', borderRadius: 6, width: '35%', marginBottom: 20, animation: 'dcFade 1s infinite alternate' }} />
              <div style={{ height: 46, background: 'var(--sf2)', borderRadius: 8, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 18 }}>
          {/* Gross margin card */}
          <div style={{
            padding: '26px 28px',
            borderRadius: 24,
            background: 'linear-gradient(140deg,rgba(58,175,211,.34),rgba(58,175,211,.06) 55%,var(--sfGrad))',
            border: '1px solid var(--acLn)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: '0 28px 60px -28px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ac)' }}>
                  Lợi nhuận gộp
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 46, lineHeight: 1.05, color: 'var(--tx)', marginTop: 14, letterSpacing: '-.03em' }}>
                  {(s.gross_margin || 0).toLocaleString('vi-VN')}
                  <span style={{ fontSize: 22, fontWeight: 400, color: 'var(--mu)', marginLeft: 8 }}>đ</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 10 }}>Phí khách trả − phí trả đối tác</div>
              </div>
              <span style={{
                flexShrink: 0,
                padding: '6px 11px',
                borderRadius: 20,
                font: '600 11.5px "JetBrains Mono", monospace',
                color: 'var(--onbtn)',
                background: 'var(--ac)',
              }}>
                {periodLabel}
              </span>
            </div>
            <BarChart bars={chartBars} />
          </div>

          {/* 2x2 small tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {smallTiles.map(tile => (
              <div key={tile.label} className="glass-tile" style={{ padding: 18 }}>
                <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mu)' }}>
                  {tile.label}
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 24, color: 'var(--tx)', marginTop: 12 }}>
                  {fmtTile(tile)}{' '}
                  {tile.unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--mu)' }}>{tile.unit}</span>}
                </div>
                <div style={{ fontSize: 11, color: tile.noteColor, marginTop: 6 }}>{tile.note}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Top customers */}
      {!loading && data?.top_customers?.length > 0 && (
        <div className="glass-card" style={{ padding: '24px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>
              Top khách hàng theo phí vận chuyển
            </h2>
            <Link to="/customers" style={{ fontSize: 12, color: 'var(--ac)', textDecoration: 'none' }}>
              Xem tất cả →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {data.top_customers.slice(0, 5).map((c, idx) => (
              <Link
                key={c.customer_id}
                to={`/customers/${c.customer_id}`}
                style={{
                  textDecoration: 'none',
                  display: 'grid',
                  gridTemplateColumns: '34px minmax(0,1fr) 190px 130px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '13px 14px',
                  borderRadius: 16,
                  background: 'var(--sf)',
                  border: '1px solid rgba(255,255,255,.07)',
                  transition: 'background 160ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(58,175,211,.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--sf)'}
              >
                <span style={{
                  width: 30, height: 30,
                  borderRadius: 10,
                  display: 'grid', placeItems: 'center',
                  font: '700 12px "JetBrains Mono", monospace',
                  color: idx === 0 ? 'var(--onbtn)' : 'var(--tx2)',
                  background: idx === 0 ? 'var(--ac)' : 'var(--sf2)',
                }}>
                  {idx + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.customer_name}
                  </div>
                  <div style={{ font: '400 11px "JetBrains Mono", monospace', color: 'var(--mu)', marginTop: 4 }}>
                    {c.customer_code} · {c.total_weight} kg · {c.shipment_count} kiện
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: 'var(--sf2)' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 6,
                    background: 'linear-gradient(90deg,#3AAFD3,#8FDCF0)',
                    width: `${Math.round((c.total_vc_fee / maxFee) * 100)}%`,
                  }} />
                </div>
                <div style={{ textAlign: 'right', font: '700 15px "JetBrains Mono", monospace', color: 'var(--tx)' }}>
                  {formatCurrency(c.total_vc_fee)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
