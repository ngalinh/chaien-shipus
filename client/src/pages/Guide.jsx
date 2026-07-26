/* Hallmark · redesign · macrostructure: accordion-content · tone: utilitarian · anchor hue: teal */
import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Truck,
  Users,
  Receipt,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    content: [
      {
        heading: 'Tổng quan',
        body: 'Dashboard hiển thị các số liệu tổng hợp: Tổng doanh thu VC, Tổng phải thu, Tổng đã thu, và số lô hàng trong kỳ.',
      },
      {
        heading: 'Bộ lọc thời gian',
        body: 'Chọn kỳ: Tháng này, 3 tháng, 6 tháng, Năm nay, Tùy chỉnh. Dashboard tự động refresh mỗi khi chuyển trang về để đảm bảo dữ liệu mới nhất.',
      },
    ],
  },
  {
    title: 'Hàng về',
    icon: Truck,
    content: [
      {
        heading: 'Import lô hàng',
        body: 'Nhấn "Nhập kho" → dán dữ liệu từ file Excel đối tác (5 cột, phân cách Tab): Tên khách → Kho → Tracking # → Sản phẩm → Kg. Hệ thống tự dò khách theo tên/mã (bỏ dấu). Dòng chưa chắc sẽ hiện gợi ý để chọn.',
      },
      {
        heading: 'Cột Trạng thái',
        body: 'Mỗi lô có 3 trạng thái: Chưa báo (mặc định), Đã báo hàng, Đã báo ship. Chuyển trạng thái bằng dropdown ngay trong bảng. Lọc theo trạng thái bằng bộ lọc trên toolbar.',
      },
      {
        heading: 'Cột Tình trạng TT (Thanh toán)',
        body: 'Hiển thị Đã TT / TT 1 phần / Chưa TT. Nhấn nút "Thanh toán" trong cột này để ghi nhận thanh toán cho khách. Nút chỉ hiện với admin khi chưa TT hoặc TT 1 phần.',
      },
      {
        heading: 'Cột Thao tác (3 icon)',
        body: 'Bell: Mở phiếu Báo hàng về — copy nội dung để gửi khách. Send: Mở phiếu Báo ship hàng — copy nội dung để gửi khách. Truck: Nhập/sửa mã vận đơn (tracking code) của lô.',
      },
      {
        heading: 'Phiếu báo hàng / báo ship',
        body: 'Popup hiển thị nội dung tin nhắn mẫu kèm thông tin lô hàng. Nhấn "Copy nội dung" để copy toàn bộ text, sau đó dán vào Zalo/Messenger gửi khách.',
      },
      {
        heading: 'Sửa cước vận chuyển của lô',
        body: 'Click vào số cước trong cột "Phí VC/kg" của lô muốn sửa → nhập cước mới → hệ thống tính lại phí VC và tạo transaction tương ứng. Chỉ áp dụng cho lô đó, không ảnh hưởng lô khác.',
      },
    ],
  },
  {
    title: 'Khách hàng',
    icon: Users,
    content: [
      {
        heading: 'Danh sách khách',
        body: 'Hiển thị toàn bộ khách với badge trạng thái: Active 1m (có hàng trong 30 ngày qua), Active 2m (31–60 ngày), Active 3m (61–90 ngày), Inactive (>90 ngày hoặc chưa có hàng).',
      },
      {
        heading: 'Tạo khách mới',
        body: 'Nhấn "Thêm khách" → điền Mã KH, Tên, SĐT, Nhóm cước. Mã KH phải duy nhất. Nhóm cước quyết định phí VC/kg áp cho khách này.',
      },
      {
        heading: 'Tài khoản khách — tab Hàng về',
        body: 'Xem toàn bộ lịch sử lô hàng của khách: ngày nhập, số kiện, tổng kg, phụ thu, phí VC, trạng thái giao. Nhấn ">" để xem chi tiết từng kiện trong lô.',
      },
      {
        heading: 'Tài khoản khách — tab Giao dịch',
        body: 'Xem sổ thu chi: mỗi dòng là một giao dịch Thu (khách trả tiền) hoặc Chi (phí VC phát sinh). Cột Số dư chạy theo từng giao dịch. Số dư âm = khách còn nợ.',
      },
      {
        heading: 'Ghi nhận thanh toán',
        body: 'Từ tab Hàng về của khách, click nút "Phiếu báo" → xem thông tin → hoặc vào Hàng về main bấm nút Thanh toán. Nhập số tiền khách đã trả, hệ thống tự ghi transaction.',
      },
    ],
  },
  {
    title: 'Giao dịch',
    icon: Receipt,
    content: [
      {
        heading: 'Tổng quan',
        body: 'Xem toàn bộ giao dịch Thu/Chi của tất cả khách hàng, có thể lọc theo kỳ thời gian.',
      },
      {
        heading: 'Giao dịch tự động',
        body: 'Khi import lô → tự tạo transaction Chi (phí VC). Khi ghi nhận thanh toán → tự tạo transaction Thu. Không cần nhập thủ công.',
      },
    ],
  },
  {
    title: 'Doanh thu VC',
    icon: TrendingUp,
    content: [
      {
        heading: 'Thống kê theo tháng',
        body: 'Bảng doanh thu VC theo từng tháng: tổng phí VC, tổng đã thu, còn phải thu. Có thể gán NV SALE phụ trách từng mã khách hàng.',
      },
      {
        heading: 'Gán NV SALE',
        body: 'Click vào cột NV của dòng khách hàng → chọn nhân viên. Dùng để tính hoa hồng hoặc phân công quản lý khách.',
      },
    ],
  },
  {
    title: 'Câu hỏi thường gặp',
    icon: HelpCircle,
    content: [
      {
        heading: 'Đổi cước vận chuyển — lô nào bị ảnh hưởng?',
        body: 'Đổi trong Cài đặt → chỉ áp lô MỚI import từ đó về sau. Lô đã nhập kho giữ nguyên cước cũ. Để áp cước mới cho lô cũ, vào Hàng về → click số cước của lô đó → sửa thủ công.',
      },
      {
        heading: 'Badge "Inactive" trong tài khoản khách dù vừa có hàng?',
        body: 'Badge tính từ lô hàng gần nhất trong DB. Nếu vừa import nhưng badge vẫn Inactive, thử reload trang.',
      },
      {
        heading: 'Giao dịch Thu/Chi lệch với thực tế?',
        body: 'Kiểm tra tab Giao dịch của từng khách. Số dư âm = khách còn nợ. Mỗi lô hàng tạo 1 dòng Chi, mỗi lần thanh toán tạo 1 dòng Thu.',
      },
      {
        heading: 'Dashboard hiện số liệu cũ sau khi sửa?',
        body: 'Dashboard tự refresh khi navigate vào. Nếu vẫn thấy số cũ, thử click sang trang khác rồi quay lại Dashboard.',
      },
    ],
  },
];

function Section({ section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;
  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-greige-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary-500" strokeWidth={1.9} />
          </span>
          <span className="text-base font-bold text-ink-900 truncate">{section.title}</span>
        </div>
        {open
          ? <ChevronDown className="w-5 h-5 text-ink-400 flex-shrink-0" />
          : <ChevronRight className="w-5 h-5 text-ink-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-greige-100 divide-y divide-greige-50">
          {section.content.map((item, i) => (
            <div key={i} className="px-5 py-4">
              <div className="text-sm font-semibold text-primary-600 mb-1">{item.heading}</div>
              <div className="text-sm text-ink-700 leading-relaxed">{item.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Guide() {
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-3">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Hướng dẫn sử dụng</h1>
        <p className="text-sm text-ink-500 mt-1">Click vào từng mục để xem chi tiết hướng dẫn.</p>
      </div>
      {SECTIONS.map((s, i) => (
        <Section key={i} section={s} />
      ))}
    </div>
  );
}
