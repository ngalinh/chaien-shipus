import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { formatCurrency, formatDate, todayInputValue } from '../utils.jsx';

/**
 * NotificationTemplate
 * Props:
 *   - customerName: string
 *   - date: string (YYYY-MM-DD or display)
 *   - items: [{ tracking_no, product, weight, customer_fee }]
 *   - companyName: string
 *   - companyLogo: string (URL)
 *   - hotline: string
 *   - onRendered: (dataUrl) => void
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

  const { totalWeight, totalFee } = items.reduce(
    ({ totalWeight, totalFee }, i) => ({
      totalWeight: totalWeight + (parseFloat(i.weight) || 0),
      totalFee:    totalFee    + (parseFloat(i.customer_fee) || 0),
    }),
    { totalWeight: 0, totalFee: 0 }
  );
  const displayDate = formatDate(date) || formatDate(todayInputValue());

  // Brand palette — exact values from tailwind.config.js (ShipUS Verdant)
  const B = {
    950:  '#0E3547',
    900:  '#16506A',
    800:  '#1A6580',
    700:  '#21809E',
    600:  '#2A9ABE',
    500:  '#3AAFD3',
    100:  '#D6EEF5',
    50:   '#ECF7FB',
    ink:  '#16242C',
    ink5: '#586A74',
    ink4: '#93A0A8',
  };

  // Plus Jakarta Sans is loaded by the app and supports Vietnamese diacritics.
  const FONT = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";

  const cell = (extra = {}) => ({
    padding: '9px 12px',
    borderBottom: `1px solid ${B[100]}`,
    ...extra,
  });
  const headCell = (extra = {}) => ({
    padding: '10px 12px',
    color: '#fff',
    fontWeight: 600,
    borderBottom: 'none',
    ...extra,
  });

  return (
    <div
      ref={ref}
      style={{
        width: 660,
        background: '#F7FAFB',
        fontFamily: FONT,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(14,53,71,0.18)',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${B[950]} 0%, ${B[800]} 100%)`, padding: '22px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="logo"
                crossOrigin="anonymous"
                style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 5 }}
              />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 12, background: B[600], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-1px' }}>S</span>
              </div>
            )}
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {companyName}
              </div>
              <div style={{ color: B[100], fontSize: 11.5, marginTop: 4 }}>
                Dịch vụ vận chuyển hàng hóa quốc tế
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', textAlign: 'right' }}>
            <div style={{ color: B[100], fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Ngày thông báo
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginTop: 2 }}>{displayDate}</div>
          </div>
        </div>
      </div>

      {/* ── Title stripe ─────────────────────────────────────────────── */}
      <div style={{ background: B[600], padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' }}>
            Thông báo hàng về
          </div>
          <div style={{ color: B[50], fontSize: 13, marginTop: 3 }}>
            Kính gửi: <strong style={{ color: '#fff' }}>{customerName}</strong>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
          {items.length} kiện
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '20px 28px 4px' }}>
        <p style={{ fontSize: 13, color: B.ink5, margin: '0 0 18px', lineHeight: 1.65 }}>
          {companyName} xin thông báo lô hàng của quý khách đã về kho và sẵn sàng giao nhận.
          Vui lòng kiểm tra thông tin chi tiết bên dưới:
        </p>

        {/* ── Table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: B[800] }}>
              <th style={headCell({ textAlign: 'center', width: 36, borderRadius: '8px 0 0 0' })}>STT</th>
              <th style={headCell({ textAlign: 'left' })}>Tracking #</th>
              <th style={headCell({ textAlign: 'left' })}>Sản phẩm</th>
              <th style={headCell({ textAlign: 'center', width: 60 })}>KG</th>
              <th style={headCell({ textAlign: 'right', width: 120, borderRadius: '0 8px 0 0' })}>Phí VC</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 1 ? B[50] : '#fff' }}>
                <td style={cell({ textAlign: 'center', color: B.ink4, fontSize: 12 })}>{idx + 1}</td>
                <td style={cell({ fontFamily: 'monospace', fontSize: 12, color: B.ink })}>
                  {item.tracking_no || '–'}
                </td>
                <td style={cell({ color: B.ink5, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                  {item.product || '–'}
                </td>
                <td style={cell({ textAlign: 'center', color: B.ink, fontWeight: 600 })}>
                  {item.weight ? Number(item.weight).toFixed(2) : '–'}
                </td>
                <td style={cell({ textAlign: 'right', color: B[700], fontWeight: 700 })}>
                  {item.customer_fee ? formatCurrency(item.customer_fee) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: B[800] }}>
              <td colSpan={3} style={{ padding: '11px 12px', textAlign: 'right', color: B[100], fontSize: 12, fontWeight: 600 }}>
                Tổng cộng ({items.length} kiện hàng)
              </td>
              <td style={{ padding: '11px 12px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {totalWeight.toFixed(2)}
              </td>
              <td style={{ padding: '11px 12px', textAlign: 'right', color: '#fff', fontWeight: 800, fontSize: 15 }}>
                {formatCurrency(totalFee)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Amount due (the single most important number) ─────────────── */}
      <div style={{ background: '#fff', padding: '16px 28px 22px' }}>
        <div style={{ background: B[50], border: `1px solid ${B[100]}`, borderLeft: `5px solid ${B[600]}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: B[700], textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Số tiền cần thanh toán
            </div>
            <div style={{ fontSize: 11.5, color: B.ink5, marginTop: 4 }}>
              Vui lòng thanh toán phí vận chuyển trước khi nhận hàng.
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: B[900], whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
            {formatCurrency(totalFee)}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={{ background: B[50], borderTop: `2px solid ${B[100]}`, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: B[900] }}>{companyName}</div>
          {hotline && (
            <div style={{ fontSize: 12, color: B.ink5, marginTop: 3 }}>
              Hotline: <strong style={{ color: B[700] }}>{hotline}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: B[600] }}>Cảm ơn quý khách!</div>
          <div style={{ fontSize: 11, color: B.ink4, marginTop: 2 }}>Thank you for your trust.</div>
        </div>
      </div>
    </div>
  );
}
