import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CreditCard } from 'lucide-react';
import { toast } from './Toast.jsx';
import { formatCurrency, todayInputValue } from '../utils.jsx';
import MoneyInput from './MoneyInput.jsx';

export default function PaymentModal({ customerId, batchDate, amount, onClose, onSaved }) {
  const needsCustomerPick = !customerId;
  const [form, setForm] = useState({
    payment_date: todayInputValue(),
    amount: amount || '',
    bank_account_id: '',
    content: '',
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pickedCustomerId, setPickedCustomerId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
    if (needsCustomerPick) {
      axios.get('/api/customers')
        .then((res) => setCustomers(res.data || []))
        .catch(() => { /* ignore */ });
    }
  }, []);

  useEffect(() => {
    if (amount != null) {
      setForm((prev) => ({ ...prev, amount }));
    }
  }, [amount]);

  async function fetchBankAccounts() {
    try {
      const res = await axios.get('/api/settings/bank-accounts');
      setBankAccounts(res.data);
      const def = res.data.find((b) => b.is_default);
      if (def) {
        setForm((prev) => ({ ...prev, bank_account_id: def.id }));
      }
    } catch {
      // ignore
    }
  }

  function handleField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast('Số tiền phải lớn hơn 0', 'warning');
      return;
    }
    const cid = customerId || (pickedCustomerId ? parseInt(pickedCustomerId) : null);
    if (!cid) {
      toast('Vui lòng chọn khách hàng', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_id: cid,
        payment_date: form.payment_date,
        amount: amt,
        bank_account_id: form.bank_account_id ? parseInt(form.bank_account_id) : null,
        content: form.content || `Thanh toán cước vận chuyển${batchDate ? ` ngày ${batchDate}` : ''}`,
        reference_batch_date: batchDate || null,
      };

      const res = await axios.post('/api/transactions/payment', payload);
      onSaved(res.data);
      toast('Đã ghi nhận thanh toán', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể lưu thanh toán', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-ink-900">Ghi nhận thanh toán</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Customer picker — chỉ hiện khi mở từ ngữ cảnh không có khách sẵn */}
            {needsCustomerPick && (
              <div>
                <label className="label">Khách hàng</label>
                <select
                  value={pickedCustomerId}
                  onChange={(e) => setPickedCustomerId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}{c.name ? ` — ${c.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="label">Ngày tháng</label>
              <input
                type="date"
                name="payment_date"
                value={form.payment_date}
                onChange={handleField}
                className="input-field"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="label">Số tiền (VND)</label>
              <MoneyInput
                value={form.amount}
                onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
                onFocus={(e) => e.target.select()}
                className="input-field"
                autoFocus
                required
              />
              {form.amount > 0 && (
                <p className="text-xs text-green-600 mt-1">{formatCurrency(form.amount)}</p>
              )}
            </div>

            {/* Bank Account */}
            <div>
              <label className="label">Tài khoản ngân hàng</label>
              <select
                name="bank_account_id"
                value={form.bank_account_id}
                onChange={handleField}
                className="input-field"
              >
                <option value="">-- Chọn tài khoản --</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name} - {b.account_number} ({b.account_holder})
                    {b.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="label">Nội dung</label>
              <input
                type="text"
                name="content"
                value={form.content}
                onChange={handleField}
                className="input-field"
                placeholder={`Thanh toán cước vận chuyển${batchDate ? ` ngày ${batchDate}` : ''}...`}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Đang lưu...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
