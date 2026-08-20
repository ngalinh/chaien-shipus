import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Bell, Bot, ChevronLeft, ChevronRight, Search, Terminal, X } from 'lucide-react';
import { todayInputValue } from '../utils.jsx';

dayjs.extend(utc);
dayjs.extend(timezone);

const TYPE_LABEL    = { arrival: 'Báo hàng về', shipped: 'Báo mã vận đơn' };
const CHANNEL_LABEL = { zalo: 'Zalo', manual: 'Thủ công' };
const PAGE_SIZE = 20;

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

const SENDER_FILTERS = [
  { label: 'Tất cả',       value: 'all' },
  { label: 'Bot tự động',  value: 'bot' },
  { label: 'Nhân viên',    value: 'staff' },
];

const RUNNER_LOG_LEVELS = [
  { label: 'Tất cả',  value: '' },
  { label: 'Cảnh báo', value: 'warn' },
  { label: 'Lỗi',     value: 'error' },
];

const LEVEL_COLOR = {
  error: 'var(--badTx)',
  warn:  'var(--warnTx)',
  info:  'var(--tx2)',
  debug: 'var(--mu)',
};

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
  const [senderFilter, setSenderFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null); // id của dòng đang xem full nội dung
  const [page, setPage] = useState(1);

  const [runnerLogOpen, setRunnerLogOpen] = useState(false);
  const [runnerLogs, setRunnerLogs] = useState([]);
  const [runnerLogLoading, setRunnerLogLoading] = useState(false);
  const [runnerLogError, setRunnerLogError] = useState('');
  const [runnerLogLevel, setRunnerLogLevel] = useState('');
  const [runnerLogQ, setRunnerLogQ] = useState('');

  useEffect(() => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    fetchLog();
    // Poll để dòng "Đang gửi" tự chuyển sang Thành công/Thất bại mà NV không cần bấm tải lại.
    const id = setInterval(() => fetchLog({ silent: true }), 5000);
    return () => clearInterval(id);
  }, [period, customStart, customEnd, typeFilter, statusFilter, senderFilter]);

  useEffect(() => {
    setPage(1);
  }, [period, customStart, customEnd, typeFilter, statusFilter, senderFilter, search]);

  async function fetchLog({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (period === 'custom') { params.start_date = customStart; params.end_date = customEnd; }
      if (typeFilter !== 'all')   params.type   = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (senderFilter !== 'all') params.sender = senderFilter;
      const res = await axios.get('/api/shipments/notification-log', { params });
      setRows(res.data);
    } catch (err) {
      console.error('fetchLog:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function fetchRunnerLogs() {
    setRunnerLogLoading(true);
    setRunnerLogError('');
    try {
      const params = { limit: 300 };
      if (runnerLogLevel) params.level = runnerLogLevel;
      if (runnerLogQ.trim()) params.q = runnerLogQ.trim();
      const res = await axios.get('/api/shipments/runner-logs', { params });
      setRunnerLogs(res.data.entries || []);
    } catch (err) {
      setRunnerLogError(err.response?.data?.error || 'Không tải được log runner');
    } finally {
      setRunnerLogLoading(false);
    }
  }

  useEffect(() => {
    if (!runnerLogOpen) return;
    fetchRunnerLogs();
    const id = setInterval(fetchRunnerLogs, 5000);
    return () => clearInterval(id);
  }, [runnerLogOpen, runnerLogLevel, runnerLogQ]);

  const display = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (r.customer_code || '').toLowerCase().includes(q) ||
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.customer_phone || '').toLowerCase().includes(q) ||
      (r.message || '').toLowerCase().includes(q) ||
      (r.sent_by || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(display.length / PAGE_SIZE));
  const paged = useMemo(
    () => display.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [display, page]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>
            Lịch sử gửi tin
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>
            Nhật ký gửi tin báo hàng về & báo mã vận đơn cho khách
          </p>
        </div>
        <button onClick={() => setRunnerLogOpen(true)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Terminal className="w-3.5 h-3.5" />
          Xem log runner
        </button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Người gửi:</span>
          <PillGroup options={SENDER_FILTERS} active={senderFilter} onSelect={setSenderFilter} />
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
            <col style={{ width: '12%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col />
            <col style={{ width: '11%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Khách hàng</th>
              <th>SĐT</th>
              <th>Loại tin</th>
              <th>Kênh</th>
              <th>Nhân viên</th>
              <th>Nội dung</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--mu)' }}>
                  <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sf2)', opacity: 0.5 }} strokeWidth={1.4} />
                  {search ? 'Không tìm thấy tin phù hợp' : 'Chưa có tin nào được gửi trong khoảng này'}
                </td>
              </tr>
            ) : paged.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                  {dayjs.utc(r.notified_at).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm')}
                </td>
                <td style={{ maxWidth: 0 }}>
                  <span
                    title={r.customer_name || ''}
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {r.customer_name || `#${r.customer_id}`}
                  </span>
                  {r.customer_code && (
                    <div
                      title={r.customer_code}
                      style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--mu)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {r.customer_code}
                    </div>
                  )}
                </td>
                <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--tx2)' }}>
                  {r.customer_phone || '–'}
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
                <td style={{ fontSize: 12.5 }}>
                  {r.sent_by === 'Bot tự động' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--mu)' }}>
                      <Bot className="w-3.5 h-3.5" /> Bot tự động
                    </span>
                  ) : r.sent_by ? (
                    <span style={{ color: 'var(--tx2)', fontWeight: 500 }}>{r.sent_by}</span>
                  ) : (
                    <span style={{ color: 'var(--mu)' }}>–</span>
                  )}
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
                    <div
                      title={r.error}
                      style={{
                        fontSize: 11, color: 'var(--badTx)', marginTop: 3,
                        whiteSpace: expanded === r.id ? 'pre-wrap' : 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      Lỗi: {r.error}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    color:      r.status === 'failed' ? 'var(--badTx)' : r.status === 'sending' ? 'var(--warnTx)' : 'var(--okTx)',
                    background: r.status === 'failed' ? 'var(--badBg)' : r.status === 'sending' ? 'var(--warnBg)' : 'var(--okBg)',
                    border: `1px solid ${r.status === 'failed' ? 'var(--badLn)' : r.status === 'sending' ? 'var(--warnLn)' : 'var(--okLn)'}`,
                  }}>
                    {r.status === 'failed' ? 'Thất bại' : r.status === 'sending' ? 'Đang gửi' : 'Thành công'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && display.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--mu)' }}>
            {display.length} tin · Trang {page}/{pageCount}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="period-pill"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px', opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--tx2)', minWidth: 60, textAlign: 'center' }}>
              {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="period-pill"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px', opacity: page >= pageCount ? 0.4 : 1, cursor: page >= pageCount ? 'default' : 'pointer' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Runner logs modal */}
      {runnerLogOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-pop" style={{ maxWidth: 780, width: '90vw' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>
                Log hệ thống local-runner
              </h2>
              <button onClick={() => setRunnerLogOpen(false)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--mu)' }}>
                Log kỹ thuật của máy chạy trình duyệt gửi Zalo (Playwright) — dùng để chẩn đoán khi tin bị "Thất bại". Tự làm mới mỗi 5 giây.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <PillGroup options={RUNNER_LOG_LEVELS} active={runnerLogLevel} onSelect={setRunnerLogLevel} />
                <input
                  value={runnerLogQ}
                  onChange={e => setRunnerLogQ(e.target.value)}
                  placeholder="Tìm trong log…"
                  className="input-field"
                  style={{ flex: 1, minWidth: 160 }}
                />
                <button onClick={fetchRunnerLogs} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12.5 }}>
                  Làm mới
                </button>
              </div>
              <div style={{
                maxHeight: '55vh', overflowY: 'auto', borderRadius: 12, border: '1px solid var(--ln)',
                background: 'var(--sunk)', padding: '10px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5,
              }}>
                {runnerLogError ? (
                  <div style={{ color: 'var(--badTx)' }}>{runnerLogError}</div>
                ) : runnerLogLoading && runnerLogs.length === 0 ? (
                  <div style={{ color: 'var(--mu)' }}>Đang tải...</div>
                ) : runnerLogs.length === 0 ? (
                  <div style={{ color: 'var(--mu)' }}>Chưa có log nào.</div>
                ) : runnerLogs.map(e => (
                  <div key={e.seq} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid var(--ln2)' }}>
                    <span style={{ flexShrink: 0, color: 'var(--mu)' }}>{dayjs(e.t).format('HH:mm:ss')}</span>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: LEVEL_COLOR[e.level] || 'var(--tx2)', textTransform: 'uppercase', width: 42 }}>{e.level}</span>
                    <span style={{ color: 'var(--tx2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
