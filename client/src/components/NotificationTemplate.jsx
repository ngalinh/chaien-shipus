import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';
import { formatCurrency } from '../utils.jsx';

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
  companyName = 'ShipUS',
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
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        if (onRendered) onRendered(dataUrl);
      } catch (err) {
        console.error('html2canvas error', err);
        if (onRendered) onRendered(null);
      }
    }, 200);
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
      <div style={{ background: 'linear-gradient(135deg, #16506A, #2A9ABE)', padding: '24px 28px', color: '#fff' }}>
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
      <div style={{ background: '#ECF7FB', borderBottom: '3px solid #2A9ABE', padding: '14px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#16506A', letterSpacing: 1 }}>
          THONG BAO HANG VE
        </div>
        <div style={{ fontSize: 13, color: '#21809E', marginTop: 4 }}>
          Kinh gui: <strong>{customerName}</strong>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px' }}>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.6 }}>
          {companyName} xin thong bao lo hang cua quy khach da ve kho va san sang giao.
          Vui long kiem tra thong tin ben duoi:
        </p>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#21809E', color: '#fff' }}>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: 36, fontWeight: 600, border: '1px solid #2A9ABE' }}>STT</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #2A9ABE' }}>Tracking #</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #2A9ABE' }}>San pham</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, border: '1px solid #2A9ABE' }}>KG</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, border: '1px solid #2A9ABE' }}>Phi VC</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#ECF7FB' : '#fff' }}>
                <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>{idx + 1}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: 12, color: '#1f2937' }}>
                  {item.tracking_no || '-'}
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', color: '#374151' }}>
                  {item.product || '-'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#374151' }}>
                  {item.weight ? Number(item.weight).toFixed(2) : '-'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #e5e7eb', fontWeight: 600, color: '#2A9ABE' }}>
                  {item.customer_fee ? formatCurrency(item.customer_fee) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#21809E', color: '#fff', fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: '10px 10px', textAlign: 'right', border: '1px solid #2A9ABE' }}>
                Tong cong ({items.length} kien)
              </td>
              <td style={{ padding: '10px 10px', textAlign: 'center', border: '1px solid #2A9ABE' }}>
                {totalWeight.toFixed(2)} kg
              </td>
              <td style={{ padding: '10px 10px', textAlign: 'right', border: '1px solid #2A9ABE' }}>
                {formatCurrency(totalFee)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment note */}
        <div style={{ marginTop: 18, padding: '12px 16px', background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
            <strong>Luu y:</strong> Vui long thanh toan phi van chuyen truoc khi nhan hang.
            Tong phi can thanh toan: <strong style={{ color: '#dc2626' }}>{formatCurrency(totalFee)}</strong>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#ECF7FB', borderTop: '1px solid #D6EEF5', padding: '14px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: '#21809E', fontWeight: 600 }}>{companyName}</div>
            {hotline && (
              <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                Hotline: <strong>{hotline}</strong>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#2A9ABE', fontWeight: 600 }}>Cam on quy khach!</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Thank you for your trust.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
