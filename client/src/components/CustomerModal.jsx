import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Upload, Trash2, ZoomIn } from 'lucide-react';
import { toast } from './Toast.jsx';
import { getBassoUser, getUserRole } from '../utils.jsx';

export default function CustomerModal({ customer, onClose, onSaved, saleOptions = [] }) {
  const isEdit = !!customer;
  const bassoUser = useMemo(() => getBassoUser(), []);
  const isAdmin = getUserRole() !== 'staff';
  const [form, setForm] = useState({
    code_us: '',
    code_uk: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    channel: '',
    rate_id: '',
    notes: '',
    warehouse: '',
    sale_username: '',
    sale_name: '',
  });
  const [rates, setRates] = useState([]);
  const [newImages, setNewImages] = useState([]);  // File objects to upload
  const [existingImages, setExistingImages] = useState([]);  // Already saved
  const [deletingImg, setDeletingImg] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ratePopup, setRatePopup] = useState(false);
  const [applyThisMonth, setApplyThisMonth] = useState(null); // null | true | false
  const originalRateRef = useRef('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRates();
    if (isEdit) {
      const rateIdStr = String(customer.rate_id || '');
      originalRateRef.current = rateIdStr;
      const wh = customer.warehouse || '';
      setForm({
        code_us: customer.code_us || (wh.includes('US') ? customer.code || '' : ''),
        code_uk: customer.code_uk || (wh.includes('UK') ? customer.code || '' : ''),
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        rate_id: rateIdStr,
        notes: customer.notes || '',
        warehouse: wh,
        sale_username: customer.sale_username || '',
        sale_name: customer.sale_name || '',
      });
      fetchExistingImages(customer.id);
    }
  }, []);

  async function fetchRates() {
    try {
      const res = await axios.get('/api/settings/rates');
      setRates(res.data);
      if (!isEdit) {
        const le = res.data.find((r) => r.name === 'Khách lẻ');
        if (le) setForm((prev) => ({ ...prev, rate_id: String(le.id) }));
      }
    } catch {
      // ignore
    }
  }

  async function fetchExistingImages(customerId) {
    try {
      const res = await axios.get(`/api/customers/${customerId}`);
      setExistingImages(res.data.cccd_images || []);
    } catch {
      // ignore
    }
  }

  function handleField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addFiles(files) {
    const maxNew = 2 - existingImages.length - newImages.length;
    if (maxNew <= 0) {
      toast('Chỉ được tải tối đa 2 ảnh CCCD', 'warning');
      return;
    }
    const imgs = Array.from(files).slice(0, maxNew).filter((f) => f.type.startsWith('image/'));
    setNewImages((prev) => [...prev, ...imgs].slice(0, 2));
  }

  function handleFileChange(e) {
    addFiles(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }

  function removeNewImage(idx) {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function deleteExistingImage(img) {
    setDeletingImg(img.id);
    try {
      await axios.delete(`/api/customers/${customer.id}/cccd/${img.id}`);
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
      toast('Đã xóa ảnh', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể xóa ảnh', 'error');
    } finally {
      setDeletingImg(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const hasUS = form.warehouse.includes('US');
    const hasUK = form.warehouse.includes('UK');
    if (!form.name.trim()) {
      toast('Vui lòng điền Họ tên', 'warning');
      return;
    }
    if (hasUS && !form.code_us.trim()) {
      toast('Vui lòng điền Mã KH kho US', 'warning');
      return;
    }
    if (hasUK && !form.code_uk.trim()) {
      toast('Vui lòng điền Mã KH kho UK', 'warning');
      return;
    }
    if (!hasUS && !hasUK) {
      toast('Vui lòng chọn ít nhất 1 kho', 'warning');
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const rateChanged = String(form.rate_id || '') !== originalRateRef.current;
        const res = await axios.put(`/api/customers/${customer.id}`, {
          ...form,
          rate_id: form.rate_id || null,
          apply_rate_this_month: rateChanged && applyThisMonth === true,
        });
        saved = res.data;
      } else {
        const res = await axios.post('/api/customers', {
          ...form,
          rate_id: form.rate_id || null,
          sale_username: bassoUser?.username || null,
          sale_name: bassoUser?.name || null,
        });
        saved = res.data;
      }

      // Upload new CCCD images if any
      if (newImages.length > 0) {
        const fd = new FormData();
        newImages.forEach((f) => fd.append('images', f));
        await axios.post(`/api/customers/${saved.id}/cccd`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSaved(saved);
    } catch (err) {
      toast(err.response?.data?.error || 'Lưu không thành công', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Create stable object URLs and revoke them on change to avoid memory leaks
  const newImageUrls = useMemo(() => {
    const urls = newImages.map((f) => URL.createObjectURL(f));
    return urls;
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImageUrls]);

  const totalImages = existingImages.length + newImages.length;

  const hasUS = form.warehouse.includes('US');
  const hasUK = form.warehouse.includes('UK');
  const leRate = rates.find((r) => r.name === 'Khách lẻ');
  const buonRate = rates.find((r) => r.name === 'Khách buôn');
  const groupRates = [leRate, buonRate].filter(Boolean);

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>
            {isEdit ? 'Chỉnh sửa khách hàng' : 'Tạo mã khách hàng mới'}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} onPaste={handlePaste}>
          <div className="modal-body">
            {/* Họ tên */}
            <div>
              <label className="label">Họ tên <span className="text-red-500">*</span></label>
              <input
                name="name"
                value={form.name}
                onChange={handleField}
                className="input-field"
                placeholder="Nguyễn Văn A"
              />
            </div>

            {/* SĐT */}
            <div>
              <label className="label">Số điện thoại</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleField}
                className="input-field"
                placeholder="0912 345 678"
              />
            </div>

            {/* Địa chỉ */}
            <div>
              <label className="label">Địa chỉ</label>
              <input
                name="address"
                value={form.address}
                onChange={handleField}
                className="input-field"
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
              />
            </div>

            {/* Kho + Mã KH per kho */}
            <div>
              <label className="label">Kho <span className="text-red-500">*</span></label>
              <div className="flex gap-4 mt-1">
                {['US', 'UK'].map((wh) => {
                  const checked = wh === 'US' ? hasUS : hasUK;
                  return (
                    <label key={wh} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const curUS = form.warehouse.includes('US');
                          const curUK = form.warehouse.includes('UK');
                          let next;
                          if (wh === 'US') {
                            const newUS = !curUS;
                            if (newUS && curUK) next = 'US UK';
                            else if (newUS) next = 'US';
                            else if (curUK) next = 'UK';
                            else next = '';
                          } else {
                            const newUK = !curUK;
                            if (newUK && curUS) next = 'US UK';
                            else if (newUK) next = 'UK';
                            else if (curUS) next = 'US';
                            else next = '';
                          }
                          setForm((prev) => ({ ...prev, warehouse: next }));
                        }}
                        className="w-4 h-4 accent-primary-600"
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{wh}</span>
                    </label>
                  );
                })}
              </div>

              {/* Mã KH per kho — sổ ra khi tick */}
              {(hasUS || hasUK) && (
                <div className="mt-3 flex flex-col gap-2">
                  {hasUS && (
                    <div>
                      <label className="label text-xs">Mã KH kho US <span className="text-red-500">*</span></label>
                      <input
                        name="code_us"
                        value={form.code_us}
                        onChange={handleField}
                        className="input-field"
                        placeholder="VD: KH001"
                      />
                    </div>
                  )}
                  {hasUK && (
                    <div>
                      <label className="label text-xs">Mã KH kho UK <span className="text-red-500">*</span></label>
                      <input
                        name="code_uk"
                        value={form.code_uk}
                        onChange={handleField}
                        className="input-field"
                        placeholder="VD: KH001"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CCCD Images */}
            <div>
              <label className="label">
                Ảnh CCCD ({totalImages}/2)
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => totalImages < 2 && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors duration-150 ${totalImages >= 2 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  borderColor: dragOver ? 'var(--brand)' : 'var(--ln)',
                  background: dragOver ? 'rgba(58,175,211,.08)' : 'var(--sf2)',
                }}
              >
                <Upload className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--mu)' }} />
                {totalImages >= 2 ? (
                  <p className="text-sm" style={{ color: 'var(--mu)' }}>Đã đủ 2 ảnh</p>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: 'var(--tx2)' }}>Kéo thả hoặc click để chọn ảnh</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--ac)' }}>hoặc nhấn Ctrl+V / ⌘V để dán ảnh từ clipboard</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Image thumbnails */}
              {(existingImages.length > 0 || newImages.length > 0) && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.url}
                        alt="CCCD"
                        className="w-24 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
                        onClick={() => setLightbox(img.url)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLightbox(img.url); }}
                          className="w-7 h-7 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteExistingImage(img); }}
                          disabled={deletingImg === img.id}
                          className="w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">S</span>
                    </div>
                  ))}
                  {newImages.map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={newImageUrls[i]}
                        alt="CCCD mới"
                        className="w-24 h-16 object-cover rounded-lg border-2 border-blue-300 cursor-pointer"
                        onClick={() => setLightbox(newImageUrls[i])}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLightbox(newImageUrls[i]); }}
                          className="w-7 h-7 bg-white/80 rounded-full flex items-center justify-center text-gray-700"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeNewImage(i); }}
                          className="w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">M</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nhóm KH */}
            <div>
              <label className="label">Nhóm KH</label>
              {isAdmin ? (
                <div className="flex gap-2 mt-1">
                  {groupRates.map((r) => {
                    const active = String(form.rate_id) === String(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, rate_id: String(r.id) }));
                          if (isEdit) { setApplyThisMonth(null); setRatePopup(true); }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 10,
                          border: `1.5px solid ${active ? 'var(--ac)' : 'var(--ln)'}`,
                          background: active ? 'var(--acBg)' : 'var(--sf2)',
                          color: active ? 'var(--ac)' : 'var(--tx2)',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm py-2" style={{ color: 'var(--tx2)' }}>
                  {rates.find((r) => String(r.id) === String(form.rate_id))?.name || 'Khách lẻ'}
                  <span className="ml-2 text-xs" style={{ color: 'var(--mu)' }}>(chỉ admin mới đổi được)</span>
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--mu)' }}>
                Cước tính tự động theo kho khi nhập hàng
              </p>
            </div>

            {/* NV SALE phụ trách */}
            <div>
              <label className="label">NV SALE phụ trách</label>
              {isEdit ? (
                <select
                  name="sale_username"
                  value={form.sale_username}
                  onChange={(e) => {
                    const uname = e.target.value;
                    const opt = saleOptions.find((o) => o.sale_username === uname);
                    setForm((prev) => ({
                      ...prev,
                      sale_username: uname,
                      sale_name: uname ? (opt?.sale_name || uname) : '',
                    }));
                  }}
                  className="input-field"
                >
                  <option value="">— Chưa gán —</option>
                  {saleOptions.map((o) => (
                    <option key={o.sale_username} value={o.sale_username}>
                      {o.sale_name || o.sale_username}
                    </option>
                  ))}
                  {form.sale_username && !saleOptions.some((o) => o.sale_username === form.sale_username) && (
                    <option value={form.sale_username}>{form.sale_name || form.sale_username}</option>
                  )}
                </select>
              ) : (
                <p className="text-sm py-2" style={{ color: 'var(--tx2)' }}>
                  {bassoUser?.name
                    ? <>Sẽ gán cho <span className="font-semibold" style={{ color: 'var(--tx)' }}>{bassoUser.name}</span> (bạn)</>
                    : <span className="text-amber-600">Chưa đăng nhập BASSO — mã KH sẽ không có NV phụ trách</span>}
                </p>
              )}
            </div>

            {/* Ghi chú */}
            <div>
              <label className="label">Ghi chú</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleField}
                rows={3}
                className="input-field resize-none"
                placeholder="Ghi chú về khách hàng..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo khách hàng'}
            </button>
          </div>
        </form>
      </div>

      {/* Rate change timing popup */}
      {ratePopup && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4">
          <div className="rounded-xl shadow-xl p-6 max-w-xs w-full relative" style={{ background: 'var(--sf)', border: '1px solid var(--ln)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>
            <button
              type="button"
              onClick={() => { setRatePopup(false); }}
              className="btn-icon absolute top-3 right-3"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-semibold mb-1" style={{ color: 'var(--tx)' }}>Thay đổi cước vận chuyển</p>
            <p className="text-sm mb-5" style={{ color: 'var(--tx2)' }}>Bạn muốn thay đổi cước vận chuyển từ tháng này hay tháng sau?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setApplyThisMonth(true); setRatePopup(false); }}
                className="flex-1 btn-primary justify-center"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => { setApplyThisMonth(false); setRatePopup(false); }}
                className="flex-1 btn-secondary justify-center"
              >
                Tháng sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt="CCCD"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
