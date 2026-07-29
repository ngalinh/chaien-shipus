import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { Plus, Receipt, Edit2, Trash2, Search, X } from 'lucide-react';
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
  { label: 'Tất cả', value: 'all' },
  { label: 'Thu',    value: 'customer_payment' },
  { label: 'Chi',    value: 'partner_payment' },
];

function rangeFor(period, customStart, customEnd) {
  if (period === 'all')    return {};
  if (period === 'custom') return { start_date: customStart, end_date: customEnd };
  return { start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: todayInputValue() };
}

const cleanCode = code => (code || '').replace(/\s+/g, ' ').trim();

export default function Transactions() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [period, setPeriod]       = useState('month');
  const [customStart, setCustomStart] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd]     = useState(todayInputValue());
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);
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
    if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const qNum = q.replace(/[,.\s]/g, '');
      list = list.filter(r => {
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
  const colSpan  = role !== 'staff' ? 7 : 6;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>
            Giao dịch
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>
            Tổng hợp thanh toán & công nợ của khách
          </p>
        </div>
        {role !== 'staff' && (
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tạo thanh toán
          </button>
        )}
      </header>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="glass-tile" style={{ padding: 20 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mu)' }}>
            Tổng Thu
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 22, color: 'var(--ac)', marginTop: 10 }}>
            {formatCurrency(totalThu)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 5 }}>Khách trả</div>
        </div>
        <div className="glass-tile" style={{ padding: 20 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mu)' }}>
            Tổng Chi
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 22, color: 'var(--badTx)', marginTop: 10 }}>
            {formatCurrency(totalChi)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 5 }}>Trả đối tác</div>
        </div>
        <div style={{
          padding: 20,
          borderRadius: 20,
          background: 'linear-gradient(140deg,rgba(58,175,211,.22),rgba(58,175,211,.06))',
          border: '1px solid var(--acLn)',
          backdropFilter: 'blur(18px)',
        }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ac)' }}>
            Chênh lệch
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 22, color: 'var(--tx)', marginTop: 10 }}>
            {formatCurrency(balance)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 5 }}>Thu − Chi</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Thời gian:</span>
          <PillGroup options={PERIODS} active={period} onSelect={setPeriod} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Danh mục:</span>
          <PillGroup options={CAT_FILTERS} active={catFilter} onSelect={setCatFilter} />
        </div>
        {/* Search */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '0 15px', height: 40, borderRadius: 999, background: 'var(--sf)', border: '1px solid var(--ln)', backdropFilter: 'blur(14px)' }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--mu)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã KH, đối tác, nội dung…"
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
            <col style={{ width: '11%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '16%' }} />
            <col />
            <col style={{ width: '13%' }} />
            <col style={{ width: '12%' }} />
            {role !== 'staff' && <col style={{ width: '8%' }} />}
          </colgroup>
          <thead>
            <tr>
              <th>Ngày tháng</th>
              <th>Danh mục</th>
              <th>Mã KH / Đối tác</th>
              <th>Nội dung</th>
              <th style={{ textAlign: 'right' }}>Thu (đ)</th>
              <th style={{ textAlign: 'right' }}>Chi (đ)</th>
              {role !== 'staff' && <th style={{ textAlign: 'center' }}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--mu)' }}>
                  <Receipt className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sf2)', opacity: 0.5 }} strokeWidth={1.4} />
                  {search ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch nào trong khoảng này'}
                </td>
              </tr>
            ) : display.map(t => (
              <tr key={t.key}>
                <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                  {formatDate(t.trans_date)}
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    color:      t.category === 'customer_payment' ? 'var(--okTx)'  : 'var(--badTx)',
                    background: t.category === 'customer_payment' ? 'var(--okBg)'  : 'var(--badBg)',
                    border: `1px solid ${t.category === 'customer_payment' ? 'var(--okLn)' : 'var(--badLn)'}`,
                  }}>
                    {CATEGORY_LABEL[t.category] || '–'}
                  </span>
                </td>
                <td>
                  {t.category === 'customer_payment' ? (
                    <Link to={`/customers/${t.customer_id}?tab=transactions`}
                      style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--ac)', textDecoration: 'none', fontWeight: 600 }}>
                      {cleanCode(t.customer_code) || `#${t.customer_id}`}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                      {t.warehouse_name || t.warehouse_code || '–'}
                    </span>
                  )}
                  {t.category === 'customer_payment' && t.customer_name && (
                    <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.customer_name}
                    </div>
                  )}
                </td>
                <td style={{ maxWidth: 0 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--tx2)' }} title={t.description || ''}>
                    {t.description || '–'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: 'var(--okTx)' }}>
                  {t.thu > 0 ? formatCurrency(t.thu) : <span style={{ color: 'var(--mu)' }}>–</span>}
                </td>
                <td style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 600, color: 'var(--badTx)' }}>
                  {t.chi > 0 ? formatCurrency(t.chi) : <span style={{ color: 'var(--mu)' }}>–</span>}
                </td>
                {role !== 'staff' && (
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <button onClick={() => setModal(t)} className="btn-icon" title="Chỉnh sửa">
                        <Edit2 className="w-[14px] h-[14px]" />
                      </button>
                      <button onClick={() => handleDelete(t)} disabled={deleting === t.key}
                        className="btn-icon" title="Xoá" style={{ color: 'var(--badTx)' }}>
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
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

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
