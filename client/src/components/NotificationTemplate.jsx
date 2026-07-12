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

  const totalWeight = items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0);
  const totalFee    = items.reduce((s, i) => s + (parseFloat(i.customer_fee) || 0), 0);
  const displayDate = date ? dayjs(date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');

  // Brand palette — exact values from tailwind.config.js
  const B = {
    950:  '#0E3547',
    900:  '#16506A',
    800:  '#1A6580',
    700:  '#21809E',
    600:  '#2A9ABE',
    500:  '#3AAFD3',
    50:   '#ECF7FB',
    100:  '#D6EEF5',
    ink:  '#16242C',
    ink5: '#586A74',
    ink4: '#93A0A8',
  };

  const cell = (extra = {}) => ({
    padding: '9px 12px',
    borderBottom: `1px solid ${B[100]}`,
    ...extra,
  });

  return (
    <div
      ref={ref}
      style={{
        width: 660,
        background: '#F7FAFB',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(14,53,71,0.18)',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${B[950]} 0%, ${B[800]} 100%)`,
          padding: '22px 28px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="logo"
                crossOrigin="anonymous"
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  objectFit: 'contain', background: '#fff', padding: 5,
                }}
              />
            ) : (
              <div
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: B[600], display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: '-1px' }}>S</span>
              </div>
            )}
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {companyName}
              </div>
              <div style={{ color: B[100], fontSize: 11, marginTop: 4, opacity: 0.85 }}>
                Dich vu van chuyen hang hoa quoc te
              </div>
            </div>
          </div>
          {/* Right: date chip */}
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '8px 14px',
              textAlign: 'right',
            }}
          >
            <div style={{ color: B[100], fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Ngay thong bao
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginTop: 2 }}>{displayDate}</div>
          </div>
        </div>
      </div>

      {/* ── Title stripe ─────────────────────────────────────────────── */}
      <div
        style={{
          background: B[600],
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase' }}>
            Thong Bao Hang Ve
          </div>
          <div style={{ color: B[50], fontSize: 13, marginTop: 3 }}>
            Kinh gui: <strong style={{ color: '#fff' }}>{customerName}</strong>
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 20,
            padding: '4px 12px',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {items.length} kien
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '20px 28px 4px' }}>
        <p style={{ fontSize: 13, color: B.ink5, margin: '0 0 18px', lineHeight: 1.65 }}>
          {companyName} xin thong bao lo hang cua quy khach da ve kho va san sang giao nhan.
          Vui long kiem tra thong tin chi tiet ben duoi:
        </p>

        {/* ── Table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: B[700] }}>
              <th style={{ ...cell({ color: '#fff', fontWeight: 600, textAlign: 'center', width: 36, borderBottom: 'none', borderRadius: '8px 0 0 0' }) }}>
                STT
              </th>
              <th style={{ ...cell({ color: '#fff', fontWeight: 600, textAlign: 'left', borderBottom: 'none' }) }}>
                Tracking #
              </th>
              <th style={{ ...cell({ color: '#fff', fontWeight: 600, textAlign: 'left', borderBottom: 'none' }) }}>
                San pham
              </th>
              <th style={{ ...cell({ color: '#fff', fontWeight: 600, textAlign: 'center', width: 60, borderBottom: 'none' }) }}>
                KG
              </th>
              <th style={{ ...cell({ color: '#fff', fontWeight: 600, textAlign: 'right', width: 120, borderBottom: 'none', borderRadius: '0 8px 0 0' }) }}>
                Phi VC
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={idx}
                style={{ background: idx % 2 === 1 ? B[50] : '#fff' }}
              >
                <td style={{ ...cell({ textAlign: 'center', color: B.ink4, fontSize: 12 }) }}>{idx + 1}</td>
                <td style={{ ...cell({ fontFamily: 'monospace', fontSize: 11, color: B.ink, letterSpacing: '-0.3px' }) }}>
                  {item.tracking_no || '–'}
                </td>
                <td style={{ ...cell({ color: B.ink5, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                  {item.product || '–'}
                </td>
                <td style={{ ...cell({ textAlign: 'center', color: B.ink, fontWeight: 600 }) }}>
                  {item.weight ? Number(item.weight).toFixed(2) : '–'}
                </td>
                <td style={{ ...cell({ textAlign: 'right', color: B[700], fontWeight: 700 }) }}>
                  {item.customer_fee ? formatCurrency(item.customer_fee) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: B[900] }}>
              <td
                colSpan={3}
                style={{ padding: '11px 12px', textAlign: 'right', color: B[100], fontSize: 12, fontWeight: 600, borderTop: `2px solid ${B[800]}` }}
              >
                Tong cong ({items.length} kien hang)
              </td>
              <td style={{ padding: '11px 12px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 14, borderTop: `2px solid ${B[800]}` }}>
                {totalWeight.toFixed(2)}
              </td>
              <td style={{ padding: '11px 12px', textAlign: 'right', color: '#fff', fontWeight: 800, fontSize: 15, borderTop: `2px solid ${B[800]}` }}>
                {formatCurrency(totalFee)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Payment notice ────────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '16px 28px 20px' }}>
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderLeft: '4px solid #F59E0B',
            borderRadius: 8,
            padding: '12px 16px',
          }}
        >
          <p style={{ fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.7 }}>
            <strong>Luu y:</strong> Vui long thanh toan phi van chuyen truoc khi nhan hang.{' '}
            Tong phi can thanh toan:{' '}
            <strong style={{ color: '#DC2626', fontSize: 14 }}>{formatCurrency(totalFee)}</strong>
          </p>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: B[50],
          borderTop: `2px solid ${B[100]}`,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: B[900] }}>{companyName}</div>
          {hotline && (
            <div style={{ fontSize: 12, color: B.ink5, marginTop: 3 }}>
              Hotline: <strong style={{ color: B[700] }}>{hotline}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: B[600] }}>Cam on quy khach!</div>
          <div style={{ fontSize: 11, color: B.ink4, marginTop: 2 }}>Thank you for your trust.</div>
        </div>
      </div>
    </div>
  );
}
