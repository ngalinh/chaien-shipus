import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { toast } from '../components/Toast.jsx';

// ─── Generic modal wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tx)' }}>{title}</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Danh bạ Zalo: SĐT -> tên hội thoại Zalo (nhóm/tài khoản) hiển thị đúng trên Zalo + cách
// gửi ưu tiên riêng cho khách này. Dùng làm fallback khi hệ thống tìm hội thoại theo SĐT
// không ra (lỗi KHONG_THAY_HOI_THOAI trong Lịch sử gửi tin) — xem lib/zaloNotify.js.
const EMPTY_ZALO_CONTACT = { phone: '', customer_name: '', zalo_name: '', report_target: '', note: '' };
const REPORT_TARGET_LABEL = {
  '': 'Mặc định (Nhóm trước, Cá nhân sau)',
  group: 'Chỉ báo Nhóm',
  personal: 'Chỉ báo Cá nhân',
};

export default function ZaloContacts() {
  const [zaloContacts, setZaloContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data?: row }
  const [form, setForm] = useState(EMPTY_ZALO_CONTACT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings/zalo-contacts');
      setZaloContacts(res.data || []);
    } catch (err) {
      console.error('fetchAll:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() { setForm(EMPTY_ZALO_CONTACT); setModal({ mode: 'add' }); }
  function openEdit(c) {
    setForm({
      phone: c.raw_phone || c.phone,
      customer_name: c.customer_name || '',
      zalo_name: c.zalo_name || '',
      report_target: c.report_target || '',
      note: c.note || '',
    });
    setModal({ mode: 'edit', data: c });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.phone.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const res = await axios.post('/api/settings/zalo-contacts', form);
        setZaloContacts((p) => [res.data, ...p]);
        toast('Đã thêm liên hệ', 'success');
      } else {
        const res = await axios.put(`/api/settings/zalo-contacts/${modal.data.id}`, form);
        setZaloContacts((p) => p.map((c) => (c.id === modal.data.id ? res.data : c)));
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
    if (!window.confirm('Xóa liên hệ này khỏi danh bạ Zalo?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/settings/zalo-contacts/${id}`);
      setZaloContacts((p) => p.filter((c) => c.id !== id));
      toast('Đã xóa', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>
            Danh bạ Zalo
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>
            Gắn SĐT khách với đúng tên nhóm/tài khoản Zalo và cách gửi ưu tiên — dùng khi hệ
            thống báo "không tìm thấy hội thoại" cho khách đó.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm py-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Thêm liên hệ
        </button>
      </header>

      {loading ? (
        <div className="p-6 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--ac)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {zaloContacts.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--mu)' }}>Chưa có liên hệ nào</p>
          ) : zaloContacts.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-4 p-3 rounded-xl"
              style={{ background: 'var(--sf2)', border: '1px solid var(--ln)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium" style={{ color: 'var(--tx)' }}>{c.raw_phone || c.phone}</span>
                  {c.customer_name && (
                    <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{c.customer_name}</span>
                  )}
                  {c.zalo_name && (
                    <span className="text-sm" style={{ color: 'var(--tx2)' }}>{c.zalo_name}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs">
                  <span style={{ color: 'var(--mu)' }}>{REPORT_TARGET_LABEL[c.report_target || '']}</span>
                  {c.note && <span style={{ color: 'var(--mu)' }}>{c.note}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(c)} className="btn-icon" title="Sửa">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                  className="btn-icon btn-icon-danger disabled:opacity-50" title="Xóa">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Thêm liên hệ Zalo' : 'Sửa liên hệ Zalo'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div>
                <label className="label">Số điện thoại *</label>
                <input value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="input-field" placeholder="0917134252" required
                  autoFocus={modal.mode === 'add'} />
              </div>
              <div>
                <label className="label">Tên khách</label>
                <input value={form.customer_name}
                  onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                  className="input-field" placeholder="Để phân biệt các liên hệ" />
              </div>
              <div>
                <label className="label">Tên nhóm/tài khoản Zalo</label>
                <input value={form.zalo_name}
                  onChange={(e) => setForm((p) => ({ ...p, zalo_name: e.target.value }))}
                  className="input-field" placeholder="Tên hiển thị đúng như trên Zalo" />
                <p className="text-xs mt-1" style={{ color: 'var(--mu)' }}>
                  Dùng để tìm hội thoại khi tên/SĐT khách không khớp tên hiển thị trên Zalo.
                </p>
              </div>
              <div>
                <label className="label">Cách gửi</label>
                <select value={form.report_target}
                  onChange={(e) => setForm((p) => ({ ...p, report_target: e.target.value }))}
                  className="input-field">
                  {Object.entries(REPORT_TARGET_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ghi chú</label>
                <input value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  className="input-field" placeholder="Tùy chọn" />
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
    </div>
  );
}
