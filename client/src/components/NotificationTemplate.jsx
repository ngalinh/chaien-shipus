import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';
import { formatCurrency } from '../utils.js';

/**
 * NotificationTemplate
 * Props:
 *   - customerName: string
 *   - date: string (YYYY-MM-DD or display)
 *   - items: [{ tracking_no, product, weight, customer_fee }]
 *   - companyName: string
 *   - companyLogo: string (URL)
 *   - hotline: string
 *   - onRendered: (dataUrl) => void  (called after html2canvas renders)
 *   - autoDownload: bool
 *   - fileName: string
 */
export default function NotificationTemplate({
  customerName,
  date,
  items = [],
  companyName = 'Chaien Shipus',
  companyLogo,
  hotline,
  onRendered,
  autoDownload = false,
  fileName = 'thong-bao-hang-ve.png',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const timer = setTimeout(async () => {
      try {
        const canvas = await html2canvas(ref.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#fff',
          logging: false,
        });
        const dataUrl = canvas.toDataURL('image/png');
        if (autoDownload) {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileName;
          link.click();
        }
        if (onRendered) onRendered(dataUrl);
      } catch (err) {
        console.error('html2canvas error', err);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const totalWeight = items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0);
  const totalFee = items.reduce((s, i) => s + (parseFloat(i.customer_fee) || 0), 0);
  const displayDate = date ? dayjs(date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');

  return (
    <div
      ref={ref}
      style={{
        width: 680,
        background: '#fff',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        padding: '0',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #166534, #16a34a)', padding: '24px 28px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {companyLogo && (
              <img
                src={companyLogo}
                alt="logo"
                style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 4 }}
                crossOrigin="anonymous"
              />
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>{companyName}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Dịch vụ vận chuyển hàng hóa</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Ngày thông báo</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{displayDate}</div>
          </div>
        </div>
      </div>

      {/* Title banner */}
      <div style={{ background: '#dcfce7', borderBottom: '3px solid #16a34a', padding: '14px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#14532d', letterSpacing: 1 }}>
          📦 THÔNG BÁO HÀNG VỀ
        </div>
        <div style={{ fontSize: 13, color: '#166534', marginTop: 4 }}>
          Kính gửi: <strong>{customerName}</strong>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px' }}>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.6 }}>
          {companyName} xin thông báo lô hàng của quý khách đã về kho và sẵn sàng giao.
          Vui lòng kiểm tra thông tin bên dưới:
        </p>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#166534', color: '#fff' }}>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: 36, fontWeight: 600, border: '1px solid #15803d' }}>STT</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #15803d' }}>Tracking #</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #15803d' }}>Sản phẩm</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, border: '1px solid #15803d' }}>KG</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, border: '1px solid #15803d' }}>Phí VC</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#f0fdf4' : '#fff' }}>
                <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>{idx + 1}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: 12, color: '#1f2937' }}>
                  {item.tracking_no || '–'}
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', color: '#374151' }}>
                  {item.product || '–'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#374151' }}>
                  {item.weight ? Number(item.weight).toFixed(2) : '–'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #e5e7eb', fontWeight: 600, color: '#15803d' }}>
                  {item.customer_fee ? formatCurrency(item.customer_fee) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#166534', color: '#fff', fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: '10px 10px', textAlign: 'right', border: '1px solid #15803d' }}>
                Tổng cộng ({items.length} kiện)
              </td>
              <td style={{ padding: '10px 10px', textAlign: 'center', border: '1px solid #15803d' }}>
                {totalWeight.toFixed(2)} kg
              </td>
              <td style={{ padding: '10px 10px', textAlign: 'right', border: '1px solid #15803d' }}>
                {formatCurrency(totalFee)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment note */}
        <div style={{ marginTop: 18, padding: '12px 16px', background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
            <strong>⚠ Lưu ý:</strong> Vui lòng thanh toán phí vận chuyển trước khi nhận hàng.
            Tổng phí cần thanh toán: <strong style={{ color: '#dc2626' }}>{formatCurrency(totalFee)}</strong>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f0fdf4', borderTop: '1px solid #bbf7d0', padding: '14px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>{companyName}</div>
            {hotline && (
              <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                📞 Hotline: <strong>{hotline}</strong>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Cảm ơn quý khách!</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Thank you for your trust.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * generateNotificationImage: utility function
 * Creates a temporary DOM node, renders the template, triggers download.
 */
export async function generateNotificationImage({ customerName, date, items, companyName, companyLogo, hotline, fileName }) {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const { createRoot } = require('react-dom/client');
    const root = createRoot(container);

    root.render(
      <NotificationTemplate
        customerName={customerName}
        date={date}
        items={items}
        companyName={companyName}
        companyLogo={companyLogo}
        hotline={hotline}
        fileName={fileName || 'thong-bao-hang-ve.png'}
        autoDownload={true}
        onRendered={(dataUrl) => {
          root.unmount();
          document.body.removeChild(container);
          resolve(dataUrl);
        }}
      />
    );
  });
}
