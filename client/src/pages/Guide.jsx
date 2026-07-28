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
    features: [
      'Nhập kho: dán dữ liệu Excel từ đối tác (Tab-separated, 5 cột)',
      'Trạng thái lô: Chưa báo → Đã báo hàng → Đã báo ship',
      'Tình trạng TT: Chưa TT · TT 1 phần · Đã TT',
      '3 icon thao tác: Báo hàng về · Báo ship · Mã vận đơn',
      'Click phí VC/kg để sửa cước riêng từng lô',
    ],
    steps: [
      { img: imgShipping, label: 'Tổng quan', caption: 'Danh sách lô hàng theo ngày nhập kho, lọc theo trạng thái và khách hàng' },
      { img: imgNhapKho, label: 'Nhập kho', caption: 'Dán dữ liệu Excel từ đối tác (Tab-separated, 5 cột: mã KH, bill, kg, VC, ghi chú)' },
      { img: imgBaoHangVe, label: 'Phiếu báo hàng về', caption: 'Xem phiếu chi tiết lô hàng và gửi thông báo Zalo cho khách' },
      { img: imgBaoShip, label: 'Báo ship', caption: 'Copy mã vận đơn hoặc gửi thông báo Zalo báo hàng đã ship' },
    ],
  },
  {
    num: '02', title: 'Khách hàng', icon: Users, route: '/customers',
    features: [
      'Badge trạng thái: Active 1m / 2m / 3m / Inactive',
      'Click tên khách → xem tài khoản: lịch sử hàng + sổ giao dịch',
      'Tạo / sửa / xóa khách, gán nhóm cước',
      'Upload ảnh CCCD mặt trước & sau',
    ],
    steps: [
      { img: imgCustomers, label: 'Tổng quan', caption: 'Danh sách khách hàng với trạng thái hoạt động, nhóm cước và lịch sử' },
      { img: imgTaoKH, label: 'Tạo mã KH mới', caption: 'Điền mã KH, tên, số điện thoại, nhóm cước và upload ảnh CCCD' },
      { img: imgKhDetail, label: 'Chi tiết khách hàng', caption: 'Xem lịch sử hàng về và sổ giao dịch của từng khách' },
    ],
  },
  {
    num: '03', title: 'Giao dịch', icon: Receipt, route: '/transactions',
    features: [
      'Tổng Thu · Chi · Chênh lệch trong kỳ hiển thị đầu trang',
      'Lọc theo danh mục Thu / Chi, mã KH, từ khóa nội dung',
      'Giao dịch tự tạo khi import lô hoặc ghi nhận thanh toán',
      'Tạo thanh toán thủ công bằng "+ Tạo thanh toán"',
    ],
    steps: [
      { img: imgTransactions, label: 'Tổng quan', caption: 'Sổ giao dịch thu/chi, lọc theo kỳ và danh mục' },
      { img: imgTaoThanhToan, label: 'Tạo thanh toán', caption: 'Chọn loại Thu/Chi, nhập số tiền, gán mã khách hàng và ghi chú' },
    ],
  },
  {
    num: '04', title: 'Doanh thu VC', icon: TrendingUp, route: '/revenue',
    features: [
      'Bảng doanh thu từng tháng: tổng phí · đã thu · còn phải thu',
      'Gán NV SALE phụ trách cho từng mã khách',
      'Lọc theo tháng, xem chi tiết từng khách trong kỳ',
    ],
    steps: [
      { img: imgRevenue, label: 'Tổng quan', caption: 'Bảng doanh thu theo tháng, gán NV SALE và theo dõi công nợ' },
    ],
  },
];

const stepImgStyle = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid var(--ln)',
  display: 'block',
  boxShadow: '0 4px 20px -6px rgba(0,0,0,0.5)',
};

export default function Guide() {
  return (
    <div style={{ padding: '24px 28px 56px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', margin: 0 }}>Hướng dẫn sử dụng</h1>
        <p style={{ fontSize: 14.5, color: 'var(--mu)', marginTop: 6, lineHeight: 1.5 }}>
          ShipUS — hệ thống quản lý vận chuyển nội địa. Ảnh chụp thực tế từng màn hình.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.num} className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', minHeight: 0 }}>

                {/* LEFT — guide info */}
                <div style={{
                  padding: '22px 20px',
                  borderRight: '1px solid var(--ln2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}>
                  {/* Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, color: 'var(--ac)', opacity: 0.65, letterSpacing: '0.1em' }}>
                      {s.num}
                    </span>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--acBg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} style={{ color: 'var(--ac)' }} strokeWidth={1.9} />
                    </span>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--tx)' }}>{s.title}</span>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                    {s.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.55 }}>
                        <span style={{ color: 'var(--ac)', flexShrink: 0, marginTop: 3, fontSize: 9 }}>◆</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Link */}
                  <Link
                    to={s.route}
                    style={{ fontSize: 12.5, color: 'var(--ac)', textDecoration: 'none', fontWeight: 600, opacity: 0.85 }}
                  >
                    Mở trang →
                  </Link>
                </div>

                {/* RIGHT — screenshots */}
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {s.steps.map((step, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--ac)',
                          background: 'var(--acBg)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.04em',
                        }}>
                          {step.label}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--mu)', lineHeight: 1.4 }}>{step.caption}</span>
                      </div>
                      <img src={step.img} alt={step.label} style={stepImgStyle} />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
