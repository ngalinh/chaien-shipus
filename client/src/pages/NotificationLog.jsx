import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Bell, Search, X } from 'lucide-react';
import { todayInputValue } from '../utils.jsx';

const TYPE_LABEL    = { arrival: 'Báo hàng về', shipped: 'Báo mã vận đơn' };
const CHANNEL_LABEL = { zalo: 'Zalo', manual: 'Thủ công' };

const PERIODS = [
  { label: 'Tất cả',   value: 'all' },
  { label: 'Tuỳ chọn', value: 'custom' },
];

const TYPE_FILTERS = [
  { label: 'Tất cả',        value: 'all' },
  { label: 'Báo hàng về',   value: 'arrival' },
  { label: 'Báo mã vận đơn', value: 'shipped' },
];

const STATUS_FILTERS = [
  { label: 'Tất cả',    value: 'all' },
  { label: 'Thành công', value: 'success' },
  { label: 'Thất bại',   value: 'failed' },
];

function PillGroup({ options, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className="period-pill"
          style={{
            background: active === o.value ? 'var(--brand)' : 'transparent',
            color:      active === o.value ? '#fff' : 'var(--mu)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function NotificationLog() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod]   = useState('all');
  const [customStart, setCustomStart] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd]     = useState(todayInputValue());
  const [typeFilter, setTypeFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null); // id của dòng đang xem full nội dung

  useEffect(() => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    fetchLog();
  }, [period, customStart, customEnd, typeFilter, statusFilter]);

  async function fetchLog() {
    setLoading(true);
    try {
      const params = {};
      if (period === 'custom') { params.start_date = customStart; params.end_date = customEnd; }
      if (typeFilter !== 'all')   params.type   = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await axios.get('/api/shipments/notification-log', { params });
      setRows(res.data);
    } catch (err) {
      console.error('fetchLog:', err);
    } finally {
      setLoading(false);
    }
  }

  const display = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (r.customer_code || '').toLowerCase().includes(q) ||
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.message || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>

      {/* Header */}
      <header>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>
          Lịch sử gửi tin
        </h1>
        <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>
          Nhật ký gửi tin báo hàng về & báo mã vận đơn cho khách
        </p>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Thời gian:</span>
          <PillGroup options={PERIODS} active={period} onSelect={setPeriod} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Loại tin:</span>
          <PillGroup options={TYPE_FILTERS} active={typeFilter} onSelect={setTypeFilter} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Trạng thái:</span>
          <PillGroup options={STATUS_FILTERS} active={statusFilter} onSelect={setStatusFilter} />
        </div>
        {/* Search */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '0 15px', height: 40, borderRadius: 999, background: 'var(--sf)', border: '1px solid var(--ln)', backdropFilter: 'blur(14px)' }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--mu)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã KH, tên khách, nội dung…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--tx)', width: 220, fontFamily: 'inherit' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', display: 'flex', padding: 0 }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)' }}>Từ:</span>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input-field" style={{ width: 'auto' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)' }}>đến:</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input-field" style={{ width: 'auto' }} />
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="data-table w-full">
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '9%' }} />
            <col />
            <col style={{ width: '11%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Khách hàng</th>
              <th>Loại tin</th>
              <th>Kênh</th>
              <th>Nội dung</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--mu)' }}>
                  <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sf2)', opacity: 0.5 }} strokeWidth={1.4} />
                  {search ? 'Không tìm thấy tin phù hợp' : 'Chưa có tin nào được gửi trong khoảng này'}
                </td>
              </tr>
            ) : display.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                  {dayjs(r.notified_at).format('DD/MM/YYYY HH:mm')}
                </td>
                <td>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                    {r.customer_name || `#${r.customer_id}`}
                  </span>
                  {r.customer_code && (
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>
                      {r.customer_code}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    color:      r.type === 'shipped' ? 'var(--ac)'   : 'var(--okTx)',
                    background: r.type === 'shipped' ? 'var(--acBg)' : 'var(--okBg)',
                    border: `1px solid ${r.type === 'shipped' ? 'var(--acLn)' : 'var(--okLn)'}`,
                  }}>
                    {TYPE_LABEL[r.type] || r.type}
                  </span>
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
                  {CHANNEL_LABEL[r.channel] || r.channel}
                </td>
                <td style={{ maxWidth: 0 }}>
                  {r.message ? (
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
                    >
                      <span style={{
                        display: 'block', fontSize: 13, color: 'var(--tx2)',
                        whiteSpace: expanded === r.id ? 'pre-wrap' : 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {r.message}
                      </span>
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--mu)' }}>– (ảnh phiếu báo)</span>
                  )}
                  {r.status === 'failed' && r.error && (
                    <div style={{ fontSize: 11, color: 'var(--badTx)', marginTop: 3 }}>
                      Lỗi: {r.error}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    color:      r.status === 'failed' ? 'var(--badTx)' : 'var(--okTx)',
                    background: r.status === 'failed' ? 'var(--badBg)' : 'var(--okBg)',
                    border: `1px solid ${r.status === 'failed' ? 'var(--badLn)' : 'var(--okLn)'}`,
                  }}>
                    {r.status === 'failed' ? 'Thất bại' : 'Thành công'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
