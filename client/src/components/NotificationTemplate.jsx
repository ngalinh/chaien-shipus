import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { formatDate, todayInputValue } from '../utils.jsx';

/**
 * NotificationTemplate — phiếu báo hàng về theo design handoff "Thông báo hàng về".
 * Card 820px cố định, render ẩn rồi chụp thành PNG (html2canvas) để copy/gửi khách.
 *
 * Props:
 *   - customerName: string
 *   - date: string (YYYY-MM-DD or display)
 *   - items: [{ tracking_no, product, weight, customer_fee }]
 *   - companyName: string
 *   - onRendered: (dataUrl) => void
 *   - autoDownload: bool
 *   - fileName: string
 */

// Design chỉ định dấu phẩy ngăn cách hàng nghìn: 1,080,000 đ
const fmtMoney = (v) => (v == null || isNaN(v) ? '0 đ' : Number(v).toLocaleString('en-US') + ' đ');

const GRID = {
  display: 'grid',
  gridTemplateColumns: '54px 1fr 108px 78px 128px',
  alignItems: 'center',
};

export default function NotificationTemplate({
  customerName,
  date,
  items = [],
  companyName = 'ShipUS',
  onRendered,
  autoDownload = false,
  fileName = 'thong-bao-hang-ve.png',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const timer = setTimeout(async () => {
      try {
        // Đợi Be Vietnam Pro / JetBrains Mono tải xong, tránh chụp ảnh với font fallback
        await document.fonts.ready;
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

  const FONT = "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif";
  const MONO = "'JetBrains Mono', monospace";

  return (
    <div
      ref={ref}
      style={{
        width: 820,
        fontFamily: FONT,
        background: '#ffffff',
        color: '#0f2e42',
        overflow: 'hidden',
        borderRadius: 18,
        boxShadow: '0 24px 60px -24px rgba(15,46,66,0.45)',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(120deg, #0a2030 0%, #123a52 55%, #1c5876 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '32px 44px' }}>
          <div
            style={{
              width: 66, height: 66, flex: 'none', borderRadius: 16,
              background: 'linear-gradient(150deg, #4bb4d6, #2f93b8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px -6px rgba(47,147,184,0.7)',
            }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="#fff">
              <path d="M2.5 19h19v2h-19zM22.07 9.64c-.21-.8-1.04-1.28-1.84-1.06L14.92 10 8 3.57 6.09 4.08l4.15 7.18-4.83 1.29-1.91-1.5-1.45.39 2.51 4.35 1.4-.38 15.55-4.16c.81-.23 1.28-1.05 1.06-1.85z" />
            </svg>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.14)', paddingLeft: 26 }}>
            <div style={{ fontSize: 25, fontWeight: 800, color: '#fff', lineHeight: 1 }}>THÔNG BÁO HÀNG VỀ</div>
            <div style={{ fontSize: 14, color: '#9fc4d6', marginTop: 9 }}>
              {companyName} · Kính gửi{' '}
              <span style={{ fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>{customerName}</span>
            </div>
          </div>
          <div style={{ flex: 'none', textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: '#7fabc2', fontWeight: 600, textTransform: 'uppercase' }}>
              {displayDate}
            </div>
            <div
              style={{
                display: 'inline-block', marginTop: 9,
                background: 'rgba(75,180,214,0.18)', border: '1px solid rgba(75,180,214,0.5)',
                padding: '7px 18px', borderRadius: 999, fontSize: 14, fontWeight: 700, color: '#9fe0f2',
              }}
            >
              {items.length} kiện
            </div>
          </div>
        </div>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #4bb4d6, #2f93b8)' }} />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '34px 44px 40px' }}>
        <p style={{ fontSize: 15.5, lineHeight: 1.65, color: '#3f5a6b', margin: '0 0 26px' }}>
          {companyName} xin thông báo lô hàng của quý khách đã về kho và sẵn sàng giao nhận.
          Vui lòng kiểm tra thông tin chi tiết bên dưới:
        </p>

        {/* ── Table ── */}
        <div style={{ border: '1px solid #e2edf2', borderRadius: 14, overflow: 'hidden' }}>
          <div
            style={{
              ...GRID, padding: '15px 22px', background: '#2f93b8',
              fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, color: '#ffffff',
            }}
          >
            <div>STT</div>
            <div>Tracking #</div>
            <div>Sản phẩm</div>
            <div style={{ textAlign: 'right' }}>KG</div>
            <div style={{ textAlign: 'right' }}>Phí VC</div>
          </div>

          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                ...GRID, padding: '16px 22px',
                background: idx % 2 === 0 ? '#ffffff' : '#f5fafc',
                borderTop: '1px solid #eef4f7',
              }}
            >
              <div style={{ fontSize: 15, color: '#90a6b3', fontWeight: 500 }}>{idx + 1}</div>
              <div style={{ fontFamily: MONO, fontSize: 14, color: '#1a3a4d', letterSpacing: -0.2, wordBreak: 'break-all' }}>
                {item.tracking_no || '–'}
              </div>
              <div style={{ fontSize: 15, color: '#3f5a6b' }}>{item.product || '–'}</div>
              <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#1a3a4d' }}>
                {item.weight ? Number(item.weight).toFixed(2) : '–'}
              </div>
              <div style={{ textAlign: 'right', fontSize: 15.5, fontWeight: 700, color: '#1c7ea3' }}>
                {item.customer_fee ? fmtMoney(item.customer_fee) : '–'}
              </div>
            </div>
          ))}

          <div style={{ ...GRID, padding: '18px 22px', background: '#2f93b8' }}>
            <div style={{ gridColumn: '1 / 4', textAlign: 'left', fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
              Tổng cộng ({items.length} kiện hàng)
            </div>
            <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#fff' }}>{totalWeight.toFixed(2)}</div>
            <div style={{ textAlign: 'right', fontSize: 17, fontWeight: 800, color: '#fff' }}>{fmtMoney(totalFee)}</div>
          </div>
        </div>

        {/* ── Payment callout ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
            marginTop: 26, padding: '26px 30px', background: '#eaf4f8',
            borderLeft: '5px solid #2f93b8', borderRadius: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, color: '#14556e' }}>
              Số tiền cần thanh toán
            </div>
            <div style={{ fontSize: 14.5, color: '#4a6577', marginTop: 6 }}>
              Vui lòng thanh toán phí vận chuyển trước khi nhận hàng.
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#0f2e42', whiteSpace: 'nowrap' }}>{fmtMoney(totalFee)}</div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '24px 44px', borderTop: '1px solid #edf3f6',
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 800, color: '#0f2e42' }}>{companyName}</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1c7ea3' }}>Cảm ơn quý khách!</div>
          <div style={{ fontSize: 13, color: '#90a6b3', marginTop: 3 }}>Thank you for your trust.</div>
        </div>
      </div>
    </div>
  );
}
