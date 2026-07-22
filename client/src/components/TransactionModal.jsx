import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from './Toast.jsx';
import { todayInputValue } from '../utils.jsx';
import MoneyInput from './MoneyInput.jsx';

const cleanCode = (code) => (code || '').replace(/\s+/g, ' ').trim();

export default function TransactionModal({ onClose, onSaved }) {
  const [category, setCategory] = useState('customer'); // 'customer' | 'partner'
  const [date, setDate] = useState(todayInputValue());
  const [amount, setAmount] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Khách trả
  const [customers, setCustomers] = useState([]);
  const [custQuery, setCustQuery] = useState('');
  const [picked, setPicked] = useState(null); // {id, code, name}
  const [showList, setShowList] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankId, setBankId] = useState('');

  // Trả đối tác
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');

  useEffect(() => {
    axios.get('/api/customers').then((r) => setCustomers(r.data || [])).catch(() => {});
    axios.get('/api/settings').then((r) => {
      setWarehouses(r.data?.warehouses || []);
    }).catch(() => {});
    axios.get('/api/settings/bank-accounts').then((r) => {
      setBankAccounts(r.data || []);
      const def = (r.data || []).find((b) => b.is_default);
      if (def) setBankId(def.id);
    }).catch(() => {});
  }, []);

  const matches = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) =>
      cleanCode(c.code).toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [custQuery, customers]);

  function pickCustomer(c) {
    setPicked(c);
    setCustQuery(cleanCode(c.code));
    setShowList(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast('Số tiền phải lớn hơn 0', 'warning'); return; }

    setSaving(true);
    try {
      if (category === 'customer') {
        if (!picked) { toast('Vui lòng chọn khách hàng', 'warning'); setSaving(false); return; }
        const res = await axios.post('/api/transactions/payment', {
          customer_id: picked.id,
          payment_date: date,
          amount: amt,
          bank_account_id: bankId || null,
          content: content || `Phí VC khách trả ngày ${date}`,
        });
        onSaved(res.data);
      } else {
        if (!warehouseId) { toast('Vui lòng chọn đối tác/kho', 'warning'); setSaving(false); return; }
        const res = await axios.post('/api/transactions/partner-payment', {
          trans_date: date,
          warehouse_id: warehouseId,
          amount: amt,
          description: content || null,
        });
        onSaved(res.data);
      }
      toast('Đã ghi nhận giao dịch', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể lưu giao dịch', 'error');
    } finally {
      setSaving(false);
    }
  }

  const isCustomer = category === 'customer';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-ink-900">Tạo giao dịch</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Danh mục thu chi */}
            <div>
              <label className="label">Danh mục thu chi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('customer')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border ${
                    isCustomer ? 'bg-success-100 text-success-700 border-success-200' : 'bg-white text-ink-500 border-greige-200 hover:bg-greige-50'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" /> Phí VC khách trả
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('partner')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border ${
                    !isCustomer ? 'bg-danger-100 text-danger-600 border-danger-200' : 'bg-white text-ink-500 border-greige-200 hover:bg-greige-50'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" /> Phí VC trả đối tác
                </button>
              </div>
            </div>

            {/* Ngày */}
            <div>
              <label className="label">Ngày tháng</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" required />
            </div>

            {/* Khách trả: tìm mã KH */}
            {isCustomer ? (
              <div className="relative">
                <label className="label">Khách hàng (gõ mã KH)</label>
                <input
                  value={custQuery}
                  onChange={(e) => { setCustQuery(e.target.value); setPicked(null); setShowList(true); }}
                  onFocus={() => setShowList(true)}
                  className="input-field"
                  placeholder="Gõ mã KH hoặc tên…"
                  autoComplete="off"
                />
                {picked && (
                  <p className="text-xs text-success-700 mt-1">
                    ✓ {cleanCode(picked.code)}{picked.name ? ` — ${picked.name}` : ''}
                  </p>
                )}
                {showList && matches.length > 0 && !picked && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-greige-200 rounded-lg shadow-card max-h-56 overflow-y-auto">
                    {matches.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-greige-50 text-sm"
                        >
                          <span className="font-mono text-primary-700">{cleanCode(c.code)}</span>
                          {c.name && <span className="text-ink-400"> — {c.name}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <label className="label">Đối tác / Kho</label>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input-field" required>
                  <option value="">-- Chọn đối tác/kho --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Số tiền */}
            <div>
              <label className="label">
                Số tiền (VND) <span className={isCustomer ? 'text-success-700' : 'text-danger-600'}>· {isCustomer ? 'Thu' : 'Chi'}</span>
              </label>
              <MoneyInput value={amount} onChange={setAmount} className="input-field" autoFocus required />
            </div>

            {/* Ngân hàng — chỉ khi khách trả */}
            {isCustomer && (
              <div>
                <label className="label">Tài khoản ngân hàng</label>
                <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="input-field">
                  <option value="">-- Chọn tài khoản --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number} ({b.account_holder}){b.is_default ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nội dung */}
            <div>
              <label className="label">Nội dung</label>
              <input value={content} onChange={(e) => setContent(e.target.value)} className="input-field" placeholder="Ghi chú giao dịch…" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
