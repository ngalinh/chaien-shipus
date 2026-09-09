import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatCurrency, getBassoUser } from '../utils.jsx';

export function FeeEditLink({ onClick }) {
  return <button type="button" onClick={e => { e.stopPropagation(); onClick(); }}
    style={{ display: 'block', marginLeft: 'auto', padding: 0, marginTop: 4, border: 0, borderRadius: 0,
      background: 'none', boxShadow: 'none', color: 'var(--ac)', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Edit</button>;
}

export default function FeeAdjustmentModal({ group, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [waive, setWaive] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const params = { batch_date: group.import_date, customer_id: group.customer_id, warehouse_id: group.warehouse_id ?? null };
  useEffect(() => {
    let active = true;
    axios.get('/api/shipments/batch-fee', { params }).then(({ data }) => {
      if (!active) return;
      setData(data); setWaive(!!data.waive_minimum); setDiscount(String(data.discount)); setReason(data.adjustment_reason || '');
    }).catch(err => { if (active) setError(err.response?.data?.error || 'Không tải được phí vận chuyển'); });
    return () => { active = false; };
  }, [group]);
  const base = data ? Math.round(Math.max(waive ? 0 : 0.5, data.total_weight) * data.customer_rate + data.total_surcharge) : 0;
  const amount = Number(discount);
  const valid = discount !== '' && Number.isSafeInteger(amount) && amount >= 0 && amount <= base && reason.trim();
  async function save(e) {
    e.preventDefault(); if (!valid || saving) return;
    setSaving(true); setError('');
    try {
      await axios.patch('/api/shipments/batch-fee', { ...params, waive_minimum: waive, discount: amount, reason,
        updated_by: getBassoUser()?.username || getBassoUser()?.name || null });
      await onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Không lưu được điều chỉnh'); }
    finally { setSaving(false); }
  }
  return <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <form role="dialog" aria-modal="true" aria-label="Điều chỉnh phí vận chuyển" onSubmit={save}
      style={{ width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--page-bg)', color: 'var(--tx)', border: '1px solid var(--ln)', borderRadius: 16, padding: 24 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.5 }}>Điều chỉnh phí vận chuyển</h2>
      <p style={{ color: 'var(--mu)', margin: '8px 0 20px' }}>{group.customer_name} · {group.import_date} · {group.warehouse_code || 'Không có kho'}</p>
      {error && <p role="alert" style={{ color: 'var(--badTx)', marginBottom: 12 }}>{error}</p>}
      {!data && !error && <p>Đang tải…</p>}
      {data && <>
        <p>Khối lượng thực: <strong>{data.total_weight.toFixed(2)} kg</strong> · {formatCurrency(data.customer_rate)}/kg</p>
        <label style={{ display: 'flex', gap: 10, margin: '18px 0', alignItems: 'center' }}><input type="checkbox" checked={waive} onChange={e => setWaive(e.target.checked)} disabled={saving} />Bỏ min 0.5 kg — tính cân nặng thực</label>
        <label style={{ display: 'block', marginBottom: 14 }}>Giảm giá thêm (đ)<input className="input-field" style={{ display: 'block', width: '100%', marginTop: 6 }} type="number" min="0" max={Math.max(0, base)} step="1" value={discount} onChange={e => setDiscount(e.target.value)} disabled={saving} required /></label>
        <label style={{ display: 'block' }}>Lý do điều chỉnh<textarea className="input-field" style={{ display: 'block', width: '100%', marginTop: 6 }} rows={2} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={saving} required /></label>
        <div style={{ margin: '18px 0', padding: 14, background: 'var(--sf2)', borderRadius: 10, lineHeight: 1.8 }}>
          <div>Phí trước giảm: {formatCurrency(base)}</div>
          <div>Giảm giá: −{formatCurrency(Number.isFinite(amount) ? amount : 0)}</div>
          <strong>Phí cuối: {formatCurrency(Math.max(0, base - (Number.isFinite(amount) ? amount : 0)))}</strong>
        </div>
        <p style={{ fontSize: 12, color: 'var(--mu)' }}>Chỉ áp dụng cho khách, ngày và kho này. Để bỏ điều chỉnh, bật lại min và nhập giảm giá 0. Tiền đã thanh toán được giữ nguyên.</p>
        {!!data.history.length && <details style={{ marginTop: 14, fontSize: 12 }}><summary>Lịch sử điều chỉnh ({data.history.length})</summary>{data.history.map(h => <p key={h.id} style={{ marginTop: 8 }}>{h.created_at} UTC · {h.updated_by || 'Không ghi tên'} · {h.waive_minimum ? 'Bỏ min' : 'Min 0.5 kg'} · Giảm {formatCurrency(h.discount)} · {h.reason}</p>)}</details>}
      </>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}><button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" className="btn-primary" disabled={!data || !valid || saving}>{saving ? 'Đang lưu…' : 'Lưu điều chỉnh'}</button></div>
    </form>
  </div>;
}
