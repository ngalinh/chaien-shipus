import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Settings as SettingsIcon, Plus, Edit2, Trash2, Save, X,
  Check, Star, Upload, Building2, Truck, Warehouse, CreditCard,
} from 'lucide-react';
import { formatCurrency } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';

export default function Settings() {
  const [rates, setRates] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [company, setCompany] = useState({ company_name: '', logo_path: '', hotline: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings');
      setRates(res.data.rates || []);
      setWarehouses(res.data.warehouses || []);
      setBankAccounts(res.data.bank_accounts || []);
      setCompany(res.data.company || {});
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể tải cài đặt', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cài đặt</h1>
          <p className="text-sm text-gray-500">Quản lý cấu hình hệ thống</p>
        </div>
      </div>

      {/* Section 1: Customer Rates */}
      <RatesSection rates={rates} setRates={setRates} />

      {/* Section 2: Partner Warehouses */}
      <WarehousesSection warehouses={warehouses} setWarehouses={setWarehouses} />

      {/* Section 3: Bank Accounts */}
      <BankAccountsSection bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} />

      {/* Section 4: Company Info */}
      <CompanySection company={company} setCompany={setCompany} />
    </div>
  );
}

// ── Customer Rates ─────────────────────────────────────────────────────────────
function RatesSection({ rates, setRates }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', rate_per_kg: '' });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.rate_per_kg) return;
    setSaving(true);
    try {
      const res = await axios.post('/api/settings/rates', {
        name: form.name,
        rate_per_kg: parseFloat(form.rate_per_kg),
      });
      setRates((p) => [...p, res.data]);
      setForm({ name: '', rate_per_kg: '' });
      setAdding(false);
      toast('Đã thêm gói cước', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id) {
    setSaving(true);
    try {
      const res = await axios.put(`/api/settings/rates/${id}`, {
        name: editForm.name,
        rate_per_kg: parseFloat(editForm.rate_per_kg),
      });
      setRates((p) => p.map((r) => (r.id === id ? res.data : r)));
      setEditId(null);
      toast('Đã cập nhật', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa gói cước này?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/settings/rates/${id}`);
      setRates((p) => p.filter((r) => r.id !== id));
      toast('Đã xóa', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-gray-900">Cước vận chuyển – Khách hàng</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm py-1.5">
          <Plus className="w-4 h-4" />
          Thêm gói
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tên gói</th>
              <th>Cước (VND/kg)</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adding && (
              <tr className="bg-green-50">
                <td>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="VD: Gói tiêu chuẩn"
                    autoFocus
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={form.rate_per_kg}
                    onChange={(e) => setForm((p) => ({ ...p, rate_per_kg: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="50000"
                    min={0}
                    step={1000}
                  />
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={handleAdd} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                      {saving ? '...' : 'Lưu'}
                    </button>
                    <button onClick={() => setAdding(false)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {rates.length === 0 && !adding ? (
              <tr>
                <td colSpan={3} className="text-center py-6 text-gray-400">Chưa có gói cước nào</td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className={editId === r.id ? 'bg-yellow-50' : ''}>
                  <td>
                    {editId === r.id ? (
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        className="input-field py-1 text-sm"
                      />
                    ) : (
                      <span className="font-medium">{r.name}</span>
                    )}
                  </td>
                  <td>
                    {editId === r.id ? (
                      <input
                        type="number"
                        value={editForm.rate_per_kg}
                        onChange={(e) => setEditForm((p) => ({ ...p, rate_per_kg: e.target.value }))}
                        className="input-field py-1 text-sm"
                        min={0}
                        step={1000}
                      />
                    ) : (
                      formatCurrency(r.rate_per_kg)
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editId === r.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(r.id)} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                            {saving ? '...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditId(r.id); setEditForm({ name: r.name, rate_per_kg: r.rate_per_kg }); }}
                            className="btn-icon text-blue-500 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="btn-icon text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Partner Warehouses ─────────────────────────────────────────────────────────
function WarehousesSection({ warehouses, setWarehouses }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', rate_per_kg: '' });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.code || !form.name || !form.rate_per_kg) return;
    setSaving(true);
    try {
      const res = await axios.post('/api/settings/warehouses', {
        code: form.code,
        name: form.name,
        rate_per_kg: parseFloat(form.rate_per_kg),
      });
      setWarehouses((p) => [...p, res.data]);
      setForm({ code: '', name: '', rate_per_kg: '' });
      setAdding(false);
      toast('Đã thêm kho', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id) {
    setSaving(true);
    try {
      const res = await axios.put(`/api/settings/warehouses/${id}`, {
        code: editForm.code,
        name: editForm.name,
        rate_per_kg: parseFloat(editForm.rate_per_kg),
      });
      setWarehouses((p) => p.map((w) => (w.id === id ? res.data : w)));
      setEditId(null);
      toast('Đã cập nhật', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa kho này?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/settings/warehouses/${id}`);
      setWarehouses((p) => p.filter((w) => w.id !== id));
      toast('Đã xóa', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-gray-900">Cước vận chuyển – Đối tác (Kho)</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm py-1.5">
          <Plus className="w-4 h-4" />
          Thêm kho
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã kho</th>
              <th>Tên kho</th>
              <th>Cước (VND/kg)</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adding && (
              <tr className="bg-green-50">
                <td>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    className="input-field py-1 text-sm uppercase"
                    placeholder="KHO1"
                    autoFocus
                  />
                </td>
                <td>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="Kho Hà Nội"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={form.rate_per_kg}
                    onChange={(e) => setForm((p) => ({ ...p, rate_per_kg: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="30000"
                    min={0}
                    step={1000}
                  />
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={handleAdd} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                      {saving ? '...' : 'Lưu'}
                    </button>
                    <button onClick={() => setAdding(false)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {warehouses.length === 0 && !adding ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-400">Chưa có kho nào</td>
              </tr>
            ) : (
              warehouses.map((w) => (
                <tr key={w.id} className={editId === w.id ? 'bg-yellow-50' : ''}>
                  <td>
                    {editId === w.id ? (
                      <input
                        value={editForm.code}
                        onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                        className="input-field py-1 text-sm uppercase"
                      />
                    ) : (
                      <span className="font-mono font-medium text-green-700">{w.code}</span>
                    )}
                  </td>
                  <td>
                    {editId === w.id ? (
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        className="input-field py-1 text-sm"
                      />
                    ) : w.name}
                  </td>
                  <td>
                    {editId === w.id ? (
                      <input
                        type="number"
                        value={editForm.rate_per_kg}
                        onChange={(e) => setEditForm((p) => ({ ...p, rate_per_kg: e.target.value }))}
                        className="input-field py-1 text-sm"
                        min={0}
                        step={1000}
                      />
                    ) : (
                      formatCurrency(w.rate_per_kg)
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editId === w.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(w.id)} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                            {saving ? '...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditId(w.id); setEditForm({ code: w.code, name: w.name, rate_per_kg: w.rate_per_kg }); }}
                            className="btn-icon text-blue-500 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(w.id)}
                            disabled={deleting === w.id}
                            className="btn-icon text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Bank Accounts ──────────────────────────────────────────────────────────────
function BankAccountsSection({ bankAccounts, setBankAccounts }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_holder: '', is_default: false });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.bank_name || !form.account_number || !form.account_holder) return;
    setSaving(true);
    try {
      const res = await axios.post('/api/settings/bank-accounts', {
        ...form,
        is_default: form.is_default ? 1 : 0,
      });
      if (form.is_default) {
        setBankAccounts((p) => [res.data, ...p.map((b) => ({ ...b, is_default: 0 }))]);
      } else {
        setBankAccounts((p) => [...p, res.data]);
      }
      setForm({ bank_name: '', account_number: '', account_holder: '', is_default: false });
      setAdding(false);
      toast('Đã thêm tài khoản', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id) {
    setSaving(true);
    try {
      const res = await axios.put(`/api/settings/bank-accounts/${id}`, {
        ...editForm,
        is_default: editForm.is_default ? 1 : 0,
      });
      if (editForm.is_default) {
        setBankAccounts((p) => p.map((b) => (b.id === id ? res.data : { ...b, is_default: 0 })));
      } else {
        setBankAccounts((p) => p.map((b) => (b.id === id ? res.data : b)));
      }
      setEditId(null);
      toast('Đã cập nhật', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa tài khoản này?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/settings/bank-accounts/${id}`);
      setBankAccounts((p) => p.filter((b) => b.id !== id));
      toast('Đã xóa', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-gray-900">Tài khoản ngân hàng</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm py-1.5">
          <Plus className="w-4 h-4" />
          Thêm TK
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngân hàng</th>
              <th>Số tài khoản</th>
              <th>Chủ tài khoản</th>
              <th className="text-center">Mặc định</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adding && (
              <tr className="bg-green-50">
                <td>
                  <input
                    value={form.bank_name}
                    onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="Vietcombank"
                    autoFocus
                  />
                </td>
                <td>
                  <input
                    value={form.account_number}
                    onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="0123456789"
                  />
                </td>
                <td>
                  <input
                    value={form.account_holder}
                    onChange={(e) => setForm((p) => ({ ...p, account_holder: e.target.value }))}
                    className="input-field py-1 text-sm"
                    placeholder="NGUYEN VAN A"
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                    className="w-4 h-4 text-green-600"
                  />
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={handleAdd} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                      {saving ? '...' : 'Lưu'}
                    </button>
                    <button onClick={() => setAdding(false)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {bankAccounts.length === 0 && !adding ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">Chưa có tài khoản nào</td>
              </tr>
            ) : (
              bankAccounts.map((b) => (
                <tr key={b.id} className={editId === b.id ? 'bg-yellow-50' : ''}>
                  <td>
                    {editId === b.id ? (
                      <input
                        value={editForm.bank_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, bank_name: e.target.value }))}
                        className="input-field py-1 text-sm"
                      />
                    ) : (
                      <span className="font-medium">{b.bank_name}</span>
                    )}
                  </td>
                  <td>
                    {editId === b.id ? (
                      <input
                        value={editForm.account_number}
                        onChange={(e) => setEditForm((p) => ({ ...p, account_number: e.target.value }))}
                        className="input-field py-1 text-sm font-mono"
                      />
                    ) : (
                      <span className="font-mono">{b.account_number}</span>
                    )}
                  </td>
                  <td>
                    {editId === b.id ? (
                      <input
                        value={editForm.account_holder}
                        onChange={(e) => setEditForm((p) => ({ ...p, account_holder: e.target.value }))}
                        className="input-field py-1 text-sm"
                      />
                    ) : b.account_holder}
                  </td>
                  <td className="text-center">
                    {editId === b.id ? (
                      <input
                        type="checkbox"
                        checked={editForm.is_default}
                        onChange={(e) => setEditForm((p) => ({ ...p, is_default: e.target.checked }))}
                        className="w-4 h-4 text-green-600"
                      />
                    ) : (
                      b.is_default ? (
                        <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          Mặc định
                        </span>
                      ) : '–'
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editId === b.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(b.id)} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                            {saving ? '...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditId(b.id); setEditForm({ bank_name: b.bank_name, account_number: b.account_number, account_holder: b.account_holder, is_default: !!b.is_default }); }}
                            className="btn-icon text-blue-500 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={deleting === b.id}
                            className="btn-icon text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Company Info ───────────────────────────────────────────────────────────────
function CompanySection({ company, setCompany }) {
  const [form, setForm] = useState({
    company_name: company.company_name || '',
    hotline: company.hotline || '',
    logo_path: company.logo_path || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm({
      company_name: company.company_name || '',
      hotline: company.hotline || '',
      logo_path: company.logo_path || '',
    });
  }, [company]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post('/api/settings/company', form);
      setCompany(res.data);
      toast('Đã lưu thông tin công ty', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi lưu thông tin', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await axios.post('/api/settings/company/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((p) => ({ ...p, logo_path: res.data.logo_path }));
      toast('Đã tải lên logo', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi tải logo', 'error');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Building2 className="w-5 h-5 text-green-600" />
        <h2 className="text-base font-semibold text-gray-900">Thông tin công ty</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        {/* Company name */}
        <div>
          <label className="label">Tên công ty</label>
          <input
            value={form.company_name}
            onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
            className="input-field"
            placeholder="Chaien Shipus"
          />
        </div>

        {/* Hotline */}
        <div>
          <label className="label">Hotline</label>
          <input
            value={form.hotline}
            onChange={(e) => setForm((p) => ({ ...p, hotline: e.target.value }))}
            className="input-field"
            placeholder="0912 345 678"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="label">Logo công ty</label>
          <div className="flex items-center gap-4">
            {form.logo_path ? (
              <img
                src={form.logo_path}
                alt="Logo"
                className="w-16 h-16 object-contain border border-gray-200 rounded-lg p-1"
              />
            ) : (
              <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
                className="btn-secondary text-sm"
              >
                {uploadingLogo ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingLogo ? 'Đang tải...' : 'Chọn ảnh'}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG tối đa 5MB</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </form>
    </section>
  );
}
