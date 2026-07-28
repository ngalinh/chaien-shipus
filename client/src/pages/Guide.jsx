import { Link } from 'react-router-dom';
import { Truck, Users, Receipt, TrendingUp } from 'lucide-react';

import imgShipping from '../assets/guide/02-shipping.jpg';
import imgNhapKho from '../assets/guide/07-nhap-kho.jpg';
import imgBaoHangVe from '../assets/guide/08-bao-hang-ve.jpg';
import imgBaoShip from '../assets/guide/09-bao-ship.jpg';
import imgCustomers from '../assets/guide/03-customers.jpg';
import imgTaoKH from '../assets/guide/10-tao-kh.jpg';
import imgKhDetail from '../assets/guide/11-kh-detail.jpg';
import imgTransactions from '../assets/guide/04-transactions.jpg';
import imgTaoThanhToan from '../assets/guide/12-tao-thanh-toan.jpg';
import imgRevenue from '../assets/guide/05-revenue.jpg';

const SECTIONS = [
  {
    num: '01', title: 'Hàng về', icon: Truck, route: '/shipping',
    mainImg: imgShipping,
    subImgs: [
      { img: imgNhapKho, caption: 'Nhập kho — dán dữ liệu Excel từ đối tác' },
      { img: imgBaoHangVe, caption: 'Phiếu báo hàng về — xem và gửi Zalo' },
      { img: imgBaoShip, caption: 'Báo ship — copy mã vận đơn hoặc gửi Zalo' },
    ],
    features: [
      'Nhập kho: dán dữ liệu Excel từ đối tác (Tab-separated, 5 cột)',
      'Trạng thái lô: Chưa báo → Đã báo hàng → Đã báo ship',
      'Tình trạng TT: Chưa TT · TT 1 phần · Đã TT',
      '3 icon thao tác: Báo hàng về · Báo ship · Mã vận đơn',
      'Click phí VC/kg để sửa cước riêng từng lô',
    ],
  },
  {
    num: '02', title: 'Khách hàng', icon: Users, route: '/customers',
    mainImg: imgCustomers,
    subImgs: [
      { img: imgTaoKH, caption: 'Tạo mã KH mới — điền thông tin và gán nhóm cước' },
      { img: imgKhDetail, caption: 'Trang khách hàng — lịch sử hàng & sổ giao dịch' },
    ],
    features: [
      'Badge trạng thái: Active 1m / 2m / 3m / Inactive',
      'Click tên khách → xem tài khoản: lịch sử hàng + sổ giao dịch',
      'Tạo / sửa / xóa khách, gán nhóm cước',
      'Upload ảnh CCCD mặt trước & sau',
    ],
  },
  {
    num: '03', title: 'Giao dịch', icon: Receipt, route: '/transactions',
    mainImg: imgTransactions,
    subImgs: [
      { img: imgTaoThanhToan, caption: 'Tạo thanh toán — chọn loại thu/chi và khách hàng' },
    ],
    features: [
      'Tổng Thu · Chi · Chênh lệch trong kỳ hiển thị đầu trang',
      'Lọc theo danh mục Thu / Chi, mã KH, từ khóa nội dung',
      'Giao dịch tự tạo khi import lô hoặc ghi nhận thanh toán',
      'Tạo thanh toán thủ công bằng "+ Tạo thanh toán"',
    ],
  },
  {
    num: '04', title: 'Doanh thu VC', icon: TrendingUp, route: '/revenue',
    mainImg: imgRevenue,
    subImgs: [],
    features: [
      'Bảng doanh thu từng tháng: tổng phí · đã thu · còn phải thu',
      'Gán NV SALE phụ trách cho từng mã khách',
      'Lọc theo tháng, xem chi tiết từng khách trong kỳ',
    ],
  },
];

const imgStyle = {
  width: '100%',
  borderRadius: 10,
  border: '1px solid var(--ln)',
  display: 'block',
  boxShadow: '0 6px 28px -10px rgba(0,0,0,0.55)',
};

export default function Guide() {
  return (
    <div style={{ padding: '24px 28px 56px', maxWidth: 940, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, color: 'var(--tx)', margin: 0 }}>Hướng dẫn sử dụng</h1>
        <p style={{ fontSize: 13.5, color: 'var(--mu)', marginTop: 6, lineHeight: 1.5 }}>
          ShipUS — hệ thống quản lý vận chuyển nội địa. Ảnh chụp thực tế từng màn hình.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.num} className="glass-card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--ln2)' }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, fontWeight: 700, color: 'var(--ac)', opacity: 0.65, letterSpacing: '0.1em', flexShrink: 0 }}>
                  {s.num}
                </span>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--acBg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} style={{ color: 'var(--ac)' }} strokeWidth={1.9} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{s.title}</span>
                <Link
                  to={s.route}
                  style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ac)', textDecoration: 'none', fontWeight: 600, opacity: 0.8, flexShrink: 0 }}
                >
                  Mở trang →
                </Link>
              </div>

              {/* Main screenshot */}
              <div style={{ padding: '18px 22px 0' }}>
                <img src={s.mainImg} alt={s.title} style={imgStyle} />
              </div>

              {/* Sub-screenshots */}
              {s.subImgs.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(s.subImgs.length, 3)}, 1fr)`,
                  gap: 12,
                  padding: '12px 22px 0',
                }}>
                  {s.subImgs.map((sub, i) => (
                    <div key={i}>
                      <img src={sub.img} alt={sub.caption} style={imgStyle} />
                      <p style={{ fontSize: 11, color: 'var(--mu)', marginTop: 6, lineHeight: 1.4, textAlign: 'center' }}>
                        {sub.caption}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Feature list */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '7px 20px',
                padding: '14px 22px 18px',
              }}>
                {s.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>
                    <span style={{ color: 'var(--ac)', flexShrink: 0, marginTop: 3, fontSize: 9 }}>◆</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
