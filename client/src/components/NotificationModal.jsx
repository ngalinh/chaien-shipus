import { useState } from 'react';
import axios from 'axios';
import { X, Copy, Download, Check, Send } from 'lucide-react';
import NotificationTemplate from './NotificationTemplate.jsx';
import { toast } from './Toast.jsx';
import { getBassoUser } from '../utils.jsx';

/**
 * Popup xem trước phiếu báo hàng về + nút Copy ảnh (dán thẳng gửi khách), Tải về và
 * Gửi qua Zalo (tự động, qua local-runner). Ảnh PNG được tạo bằng NotificationTemplate
 * render ẩn ngoài màn hình.
 *
 * Props:
 *   - notifData: { batch: { batch_date, customer_id }, customerName, date, items, fileName }
 *   - company:   { company_name, logo_path, hotline }
 *   - bank:      { bank_name, account_number, account_holder } | null
 *   - onClose:   () => void
 */
export default function NotificationModal({ notifData, company = {}, bank = null, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [logged, setLogged] = useState(false);

  // Ghi nhận "đã báo" khi NV thực sự lấy ảnh đi gửi khách (Copy/Tải về) — không ghi ngay
  // lúc mở popup xem trước, vì lúc đó NV có thể chỉ xem rồi đóng lại chứ chưa gửi gì.
  function logManualNotify() {
    if (logged) return;
    setLogged(true);
    const { batch_date, customer_id } = notifData.batch || {};
    if (!batch_date || !customer_id) return;
    const bassoUser = getBassoUser();
    axios.post('/api/shipments/batch/notify', {
      batch_date,
      customer_id,
      sent_by: bassoUser?.name || bassoUser?.username || null,
    }).catch(() => { /* non-critical */ });
  }

  function handleRendered(url) {
    if (url) setDataUrl(url);
    else setFailed(true);
  }

  function handleRetry() {
    setFailed(false);
    setDataUrl(null);
    setRenderKey((k) => k + 1);
  }

  async function handleCopy() {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      // ClipboardItem chỉ chạy trong secure context (HTTPS) + Chrome/Edge; Safari/FF hạn chế.
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      logManualNotify();
      toast('Đã copy ảnh — dán (Ctrl/⌘ + V) để gửi khách', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Trình duyệt không hỗ trợ copy ảnh — hãy dùng nút "Tải về"', 'error');
    }
  }

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = notifData.fileName || 'phieu-bao-hang-ve.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    logManualNotify();
  }

  function handleSendZalo() {
    if (!dataUrl) return;
    const { batch_date, customer_id } = notifData.batch || {};
    if (!batch_date || !customer_id) {
      toast('Thiếu thông tin lô hàng để gửi', 'error');
      return;
    }
    toast(`Đang gửi Zalo cho ${notifData.customerName}…`, 'info');
    const bassoUser = getBassoUser();
    axios.post('/api/shipments/batch/send-zalo', {
      batch_date,
      customer_id,
      type: 'arrival',
      image: { name: notifData.fileName || 'phieu-bao-hang-ve.png', dataBase64: dataUrl },
      sent_by: bassoUser?.name || bassoUser?.username || null,
    }).then(() => {
      toast(`Đã gửi Zalo cho ${notifData.customerName}!`, 'success');
    }).catch((err) => {
      toast(err.response?.data?.error || 'Không gửi được qua Zalo', 'error');
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-[var(--tx)]">Phiếu báo hàng về</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-greige-50 p-3 flex justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="Phiếu báo" className="w-full max-w-[600px] self-start rounded-lg shadow-card" />
            ) : failed ? (
              <div className="py-16 text-center text-ink-400">
                <p className="mb-3">Không tạo được ảnh phiếu báo. Vui lòng thử lại.</p>
                <button onClick={handleRetry} className="btn-secondary">Thử lại</button>
              </div>
            ) : (
              <div className="py-16 text-center text-ink-400">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Đang tạo ảnh phiếu báo…
              </div>
            )}
          </div>
          <p className="text-xs text-ink-400 mt-2 text-center">
            Nhấn <strong>Copy ảnh</strong> rồi dán thẳng vào Zalo/Messenger gửi khách — không cần tải về.
          </p>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Đóng</button>
          <button onClick={handleDownload} disabled={!dataUrl} className="btn-secondary disabled:opacity-50">
            <Download className="w-4 h-4" />
            Tải về
          </button>
          <button onClick={handleCopy} disabled={!dataUrl} className="btn-secondary disabled:opacity-50">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Đã copy' : 'Copy ảnh'}
          </button>
          <button onClick={handleSendZalo} disabled={!dataUrl} className="btn-primary disabled:opacity-50">
            <Send className="w-4 h-4" />
            Gửi qua Zalo
          </button>
        </div>
      </div>

      {/* Bộ tạo ảnh ẩn ngoài màn hình */}
      <div className="fixed -left-[9999px] top-0 z-[-1]">
        <NotificationTemplate
          key={renderKey}
          customerName={notifData.customerName}
          date={notifData.date}
          items={notifData.items}
          companyName={company.company_name || 'ShipUS'}
          bank={bank}
          autoDownload={false}
          onRendered={handleRendered}
        />
      </div>
    </div>
  );
}
