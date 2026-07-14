import { useState } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import NotificationTemplate from './NotificationTemplate.jsx';
import { toast } from './Toast.jsx';

/**
 * Popup xem trước phiếu báo hàng về + nút Copy ảnh (dán thẳng gửi khách) và Tải về.
 * Ảnh PNG được tạo bằng NotificationTemplate render ẩn ngoài màn hình.
 *
 * Props:
 *   - notifData: { customerName, date, items, fileName }
 *   - company:   { company_name, logo_path, hotline }
 *   - onClose:   () => void
 */
export default function NotificationModal({ notifData, company = {}, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      // ClipboardItem chỉ chạy trong secure context (HTTPS) + Chrome/Edge; Safari/FF hạn chế.
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
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
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-ink-900">Phiếu báo hàng về</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-greige-50 p-3 flex justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="Phiếu báo" className="w-full max-w-[520px] rounded-lg shadow-card" />
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
          <button onClick={handleCopy} disabled={!dataUrl} className="btn-primary disabled:opacity-50">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Đã copy' : 'Copy ảnh'}
          </button>
        </div>
      </div>

      {/* Bộ tạo ảnh ẩn ngoài màn hình */}
      <div className="fixed -left-[9999px] top-0 z-[-1]">
        <NotificationTemplate
          customerName={notifData.customerName}
          date={notifData.date}
          items={notifData.items}
          companyName={company.company_name || 'ShipUS'}
          companyLogo={company.logo_path || undefined}
          hotline={company.hotline}
          autoDownload={false}
          onRendered={(url) => setDataUrl(url)}
        />
      </div>
    </div>
  );
}
