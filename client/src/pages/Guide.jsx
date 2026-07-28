import { Link } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, Receipt, TrendingUp, Settings } from 'lucide-react';

import imgDashboard from '../assets/guide/01-dashboard.jpg';
import imgShipping from '../assets/guide/02-shipping.jpg';
import imgCustomers from '../assets/guide/03-customers.jpg';
import imgTransactions from '../assets/guide/04-transactions.jpg';
import imgRevenue from '../assets/guide/05-revenue.jpg';
import imgSettings from '../assets/guide/06-settings.jpg';

const SECTIONS = [
  {
    num: '01', title: 'Tổng quan', icon: LayoutDashboard, route: '/', img: imgDashboard,
    features: [
      'Lợi nhuận gộp = phí khách trả − phí trả đối tác',
      'Bộ lọc kỳ: Tháng này · 3 tháng · 6 tháng · Năm nay · Tuỳ chỉnh',
      'Các tile: Còn phải thu · Tổng cân nặng · Số khách · Trả đối tác',
      'Bảng xếp hạng Top khách theo phí VC trong kỳ',
    ],
  },
  {
    num: '02', title: 'Hàng về', icon: Truck, route: '/shipping', img: imgShipping,
    features: [
      'Nhập kho: dán dữ liệu Excel từ đối tác (Tab-separated, 5 cột)',
      'Trạng thái lô: Chưa báo → Đã báo hàng → Đã báo ship',
      'Tình trạng TT: Chưa TT · TT 1 phần · Đã TT',
      '3 icon thao tác: Báo hàng về · Báo ship · Mã vận đơn',
      'Click phí VC/kg để sửa cước riêng từng lô',
    ],
  },
  {
    num: '03', title: 'Khách hàng', icon: Users, route: '/customers', img: imgCustomers,
    features: [
      'Badge trạng thái: Active 1m / 2m / 3m / Inactive',
      'Click tên khách → xem tài khoản: lịch sử hàng + sổ giao dịch',
      'Tạo / sửa / xóa khách, gán nhóm cước',
      'Upload ảnh CCCD mặt trước & sau',
    ],
  },
  {
    num: '04', title: 'Giao dịch', icon: Receipt, route: '/transactions', img: imgTransactions,
    features: [
      'Tổng Thu · Chi · Chênh lệch trong kỳ hiển thị đầu trang',
      'Lọc theo danh mục Thu / Chi, mã KH, từ khóa nội dung',
      'Giao dịch tự tạo khi import lô hoặc ghi nhận thanh toán',
      'Tạo thanh toán thủ công bằng "+ Tạo thanh toán"',
    ],
  },
  {
    num: '05', title: 'Doanh thu VC', icon: TrendingUp, route: '/revenue', img: imgRevenue,
    features: [
      'Bảng doanh thu từng tháng: tổng phí · đã thu · còn phải thu',
      'Gán NV SALE phụ trách cho từng mã khách',
      'Lọc theo tháng, xem chi tiết từng khách trong kỳ',
    ],
  },
  {
    num: '06', title: 'Cài đặt', icon: Settings, route: '/settings', img: imgSettings,
    features: [
      'Cước VC khách hàng: thêm / sửa nhóm (Khách buôn · Khách lẻ…)',
      'Cước VC đối tác kho: thêm / sửa kho và đơn giá',
      'Tài khoản ngân hàng nhận tiền mặc định',
      'Thông tin công ty: tên · hotline · địa chỉ',
    ],
  },
];

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

              {/* Screenshot */}
              <div style={{ padding: '18px 22px 0' }}>
                <img
                  src={s.img}
                  alt={s.title}
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid var(--ln)',
                    display: 'block',
                    boxShadow: '0 6px 28px -10px rgba(0,0,0,0.55)',
                  }}
                />
              </div>

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
