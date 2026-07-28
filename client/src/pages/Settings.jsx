import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Edit2, Trash2, X,
  Star, Upload, Building2, Warehouse, CreditCard,
} from 'lucide-react';
import { formatCurrency } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import MoneyInput from '../components/MoneyInput.jsx';

// ─── Generic modal wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tx)' }}>{title}</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Settings() {
  const [warehouses, setWarehouses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings');
      setWarehouses(res.data.warehouses || []);
      setBankAccounts(res.data.bank_accounts || []);
      setCompany(res.data.company || {});
    } catch (err) {
      console.error('fetchAll:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--ac)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-page font-bold leading-tight" style={{ color: 'var(--tx)' }}>Cài đặt</h1>
        <p className="text-body-md mt-1.5" style={{ color: 'var(--mu)' }}>Quản lý cấu hình hệ thống</p>
      </div>

      <CompanySection company={company} setCompany={setCompany} />
      <WarehousesSection warehouses={warehouses} setWarehouses={setWarehouses} />
      <BankAccountsSection bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} />
    </div>
  );
}

// ── Company ───────────────────────────────────────────────────────────────────
function CompanySection({ company, setCompany }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ company_name: '', hotline: '', logo_path: '', delivery_carrier: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm({
      company_name: company.company_name || '',
      hotline: company.hotline || '',
      logo_path: company.logo_path || '',
      delivery_carrier: company.delivery_carrier || '',
    });
  }, [company]);

  function openModal() {
    setForm({
      company_name: company.company_name || '',
      hotline: company.hotline || '',
      logo_path: company.logo_path || '',
      delivery_carrier: company.delivery_carrier || '',
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post('/api/settings/company', form);
      setCompany(res.data);
      setModalOpen(false);
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

  const rows = [
    ['Tên', company.company_name],
    ['Hotline', company.hotline],
    ['Đơn vị giao hàng', company.delivery_carrier],
  ];

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary-600" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--tx)' }}>Công ty</h2>
      </div>

      <div className="space-y-2 mb-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-sm" style={{ color: 'var(--mu)' }}>{label}</span>
            <span className="text-sm font-medium" style={{ color: value ? 'var(--tx)' : 'var(--mu)' }}>
              {value || '–'}
            </span>
          </div>
        ))}
      </div>

      <button onClick={openModal} className="btn-secondary w-full">
        <Edit2 className="w-4 h-4" />
        Sửa thông tin
      </button>

      {modalOpen && (
        <Modal title="Sửa thông tin công ty" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {/* Logo */}
              <div>
                <label className="label">Logo công ty</label>
                <div className="flex items-center gap-4">
                  {form.logo_path ? (
                    <img src={form.logo_path} alt="Logo"
                      className="w-16 h-16 object-contain rounded-xl p-1"
                      style={{ border: '1px solid var(--ln)' }} />
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed rounded-xl flex items-center justify-center"
                      style={{ borderColor: 'var(--ln)', color: 'var(--mu)' }}>
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      disabled={uploadingLogo} className="btn-secondary text-sm">
                      {uploadingLogo
                        ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: 'var(--mu)', borderTopColor: 'transparent' }} />
                        : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? 'Đang tải...' : 'Chọn ảnh'}
                    </button>
                    <p className="text-xs mt-1" style={{ color: 'var(--mu)' }}>PNG, JPG tối đa 5MB</p>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>

              <div>
                <label className="label">Tên công ty</label>
                <input value={form.company_name}
                  onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  className="input-field" placeholder="Chaien Shipus" />
              </div>
              <div>
                <label className="label">Hotline</label>
                <input value={form.hotline}
                  onChange={(e) => setForm((p) => ({ ...p, hotline: e.target.value }))}
                  className="input-field" placeholder="0912 345 678" />
              </div>
              <div>
                <label className="label">Đơn vị vận chuyển</label>
                <input value={form.delivery_carrier}
                  onChange={(e) => setForm((p) => ({ ...p, delivery_carrier: e.target.value }))}
                  className="input-field" placeholder="GHTK, GHN..." />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Hủy</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '...' : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Warehouses (KHO + cước KH lẻ/buôn) ───────────────────────────────────────
const EMPTY_WH = { code: '', name: '', aliases: '', rate_le: '', rate_buon: '', rate_per_kg: '' };

function WarehousesSection({ warehouses, setWarehouses }) {
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data?: row }
  const [form, setForm] = useState(EMPTY_WH);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  function openAdd() { setForm(EMPTY_WH); setModal({ mode: 'add' }); }
  function openEdit(w) {
    setForm({
      code: w.code, name: w.name, aliases: w.aliases || '',
      rate_le: w.rate_le || '', rate_buon: w.rate_buon || '', rate_per_kg: w.rate_per_kg || '',
    });
    setModal({ mode: 'edit', data: w });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.code || !form.name) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        rate_le: parseFloat(form.rate_le) || 0,
        rate_buon: parseFloat(form.rate_buon) || 0,
        rate_per_kg: parseFloat(form.rate_per_kg) || 0,
        aliases: (form.aliases || '').trim().toUpperCase(),
      };
      if (modal.mode === 'add') {
        const res = await axios.post('/api/settings/warehouses', payload);
        setWarehouses((p) => [...p, res.data].sort((a, b) => a.code.localeCompare(b.code)));
        toast('Đã thêm kho', 'success');
      } else {
        const res = await axios.put(`/api/settings/warehouses/${modal.data.id}`, payload);
        setWarehouses((p) => p.map((w) => (w.id === modal.data.id ? res.data : w)));
        toast('Đã cập nhật', 'success');
      }
      setModal(null);
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
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-semibold" style={{ color: 'var(--tx)' }}>Kho</h2>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm py-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Thêm kho
        </button>
      </div>

      <div className="space-y-3">
        {warehouses.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--mu)' }}>Chưa có kho nào</p>
        ) : warehouses.map((w) => (
          <div key={w.id} className="flex items-start justify-between gap-4 p-3 rounded-xl"
            style={{ background: 'var(--sf2)', border: '1px solid var(--ln)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold" style={{ color: 'var(--ac)' }}>{w.code}</span>
                <span className="font-medium" style={{ color: 'var(--tx)' }}>{w.name}</span>
                {w.aliases && (
                  <span className="text-xs font-mono" style={{ color: 'var(--mu)' }}>({w.aliases})</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs">
                <span style={{ color: 'var(--mu)' }}>
                  KH lẻ: <span style={{ color: 'var(--tx2)' }}>
                    {w.rate_le ? formatCurrency(w.rate_le) + '/kg' : '–'}
                  </span>
                </span>
                <span style={{ color: 'var(--mu)' }}>
                  KH buôn: <span style={{ color: 'var(--tx2)' }}>
                    {w.rate_buon ? formatCurrency(w.rate_buon) + '/kg' : '–'}
                  </span>
                </span>
                {w.rate_per_kg > 0 && (
                  <span style={{ color: 'var(--mu)' }}>
                    Đối tác: <span style={{ color: 'var(--mu)' }}>{formatCurrency(w.rate_per_kg)}/kg</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(w)} className="btn-icon" title="Sửa">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(w.id)} disabled={deleting === w.id}
                className="btn-icon btn-icon-danger disabled:opacity-50" title="Xóa">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Thêm kho' : 'Sửa kho'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mã kho *</label>
                  <input value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="input-field uppercase" placeholder="HA" required
                    autoFocus={modal.mode === 'add'} />
                </div>
                <div>
                  <label className="label">Tên kho *</label>
                  <input value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="input-field" placeholder="Hải An" required />
                </div>
              </div>

              <div>
                <label className="label">Aliases (phân cách bằng dấu phẩy)</label>
                <input value={form.aliases}
                  onChange={(e) => setForm((p) => ({ ...p, aliases: e.target.value.toUpperCase() }))}
                  className="input-field uppercase" placeholder="OR,NH" />
              </div>

              <div>
                <label className="label">Cước vận chuyển – Khách hàng</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--mu)' }}>Khách lẻ (đ/kg)</p>
                    <MoneyInput value={form.rate_le}
                      onChange={(v) => setForm((p) => ({ ...p, rate_le: v }))}
                      className="input-field" placeholder="240000" />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--mu)' }}>Khách buôn (đ/kg)</p>
                    <MoneyInput value={form.rate_buon}
                      onChange={(v) => setForm((p) => ({ ...p, rate_buon: v }))}
                      className="input-field" placeholder="230000" />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Cước đối tác (đ/kg)</label>
                <MoneyInput value={form.rate_per_kg}
                  onChange={(v) => setForm((p) => ({ ...p, rate_per_kg: v }))}
                  className="input-field" placeholder="0" />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Hủy</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '...' : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────
const EMPTY_BANK = { bank_name: '', account_number: '', account_holder: '', is_default: false };

function BankAccountsSection({ bankAccounts, setBankAccounts }) {
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data?: row }
  const [form, setForm] = useState(EMPTY_BANK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  function openAdd() { setForm(EMPTY_BANK); setModal({ mode: 'add' }); }
  function openEdit(b) {
    setForm({
      bank_name: b.bank_name, account_number: b.account_number,
      account_holder: b.account_holder, is_default: !!b.is_default,
    });
    setModal({ mode: 'edit', data: b });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.bank_name || !form.account_number || !form.account_holder) return;
    setSaving(true);
    try {
      const payload = { ...form, is_default: form.is_default ? 1 : 0 };
      if (modal.mode === 'add') {
        const res = await axios.post('/api/settings/bank-accounts', payload);
        if (form.is_default) {
          setBankAccounts((p) => [res.data, ...p.map((b) => ({ ...b, is_default: 0 }))]);
        } else {
          setBankAccounts((p) => [...p, res.data]);
        }
        toast('Đã thêm tài khoản', 'success');
      } else {
        const res = await axios.put(`/api/settings/bank-accounts/${modal.data.id}`, payload);
        if (form.is_default) {
          setBankAccounts((p) => p.map((b) => (b.id === modal.data.id ? res.data : { ...b, is_default: 0 })));
        } else {
          setBankAccounts((p) => p.map((b) => (b.id === modal.data.id ? res.data : b)));
        }
        toast('Đã cập nhật', 'success');
      }
      setModal(null);
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
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-semibold" style={{ color: 'var(--tx)' }}>Tài khoản ngân hàng</h2>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm py-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Thêm TK
        </button>
      </div>

      <div className="space-y-3">
        {bankAccounts.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--mu)' }}>Chưa có tài khoản nào</p>
        ) : bankAccounts.map((b) => (
          <div key={b.id} className="flex items-start justify-between gap-4 p-3 rounded-xl"
            style={{ background: 'var(--sf2)', border: '1px solid var(--ln)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium" style={{ color: 'var(--tx)' }}>{b.bank_name}</span>
                {b.is_default && (
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#f59e0b' }}>
                    <Star className="w-3 h-3 fill-current" />
                    Mặc định
                  </span>
                )}
              </div>
              <p className="font-mono text-sm mt-0.5" style={{ color: 'var(--tx2)' }}>{b.account_number}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--mu)' }}>{b.account_holder}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(b)} className="btn-icon" title="Sửa">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id}
                className="btn-icon btn-icon-danger disabled:opacity-50" title="Xóa">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Thêm tài khoản ngân hàng' : 'Sửa tài khoản ngân hàng'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div>
                <label className="label">Ngân hàng *</label>
                <input value={form.bank_name}
                  onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                  className="input-field" placeholder="Vietcombank" required
                  autoFocus={modal.mode === 'add'} />
              </div>
              <div>
                <label className="label">Số tài khoản *</label>
                <input value={form.account_number}
                  onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
                  className="input-field" placeholder="0123456789" required />
              </div>
              <div>
                <label className="label">Chủ tài khoản *</label>
                <input value={form.account_holder}
                  onChange={(e) => setForm((p) => ({ ...p, account_holder: e.target.value }))}
                  className="input-field" placeholder="NGUYEN VAN A" required />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_default}
                  onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                  className="w-4 h-4" />
                <span className="text-sm" style={{ color: 'var(--tx2)' }}>Đặt làm tài khoản mặc định</span>
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Hủy</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '...' : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
