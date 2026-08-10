import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import NotificationTemplate from '../components/NotificationTemplate.jsx';

/**
 * Trang "in phiếu báo hàng về" — không có sidebar/menu, không cần đăng nhập.
 * Dùng cho local-runner (Playwright headless) tự mở trang này để chụp ảnh cho bot tự động
 * báo hàng về (không có trình duyệt NV nào đang mở để html2canvas chạy sẵn như luồng thủ
 * công). Runner truyền "key" qua query string (khớp ZALO_RUNNER_API_KEY) để lấy được dữ
 * liệu — trang này không tự lộ thông tin khách nếu thiếu/sai key.
 *
 * Sau khi NotificationTemplate render + chụp xong (html2canvas), kết quả được đẩy vào
 * window.__printResult = { done: true, dataUrl } để runner đọc qua page.evaluate() — không
 * cần Playwright tự chụp màn hình.
 */
export default function PrintArrival() {
  const { batchDate, customerId } = useParams();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key') || '';

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get('/api/shipments/print-data', { params: { batch_date: batchDate, customer_id: customerId, key } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Lỗi tải dữ liệu'));
  }, [batchDate, customerId, key]);

  function handleRendered(dataUrl) {
    window.__printResult = { done: true, dataUrl };
  }

  if (error) {
    // Ghi luôn kết quả lỗi để runner không phải đợi hết timeout mới biết là thất bại.
    window.__printResult = { done: true, dataUrl: null };
    return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  }
  if (!data) return null;

  return (
    <div style={{ padding: 24, background: '#fff' }}>
      <NotificationTemplate
        customerName={data.customerName}
        date={data.date}
        items={data.items}
        companyName={data.company?.company_name}
        bank={data.bank}
        autoDownload={false}
        onRendered={handleRendered}
      />
    </div>
  );
}
