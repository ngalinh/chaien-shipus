import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Shipping from './pages/Shipping.jsx';
import Transactions from './pages/Transactions.jsx';
import NotificationLog from './pages/NotificationLog.jsx';
import RevenueVC from './pages/RevenueVC.jsx';
import Settings from './pages/Settings.jsx';
import Guide from './pages/Guide.jsx';
import MobilePWA from './pages/MobilePWA.jsx';
import PrintArrival from './pages/PrintArrival.jsx';

export default function App() {
  return (
    <Routes>
      {/* Mobile PWA standalone — no Layout wrapper */}
      <Route path="/mobile" element={<MobilePWA />} />
      {/* Trang in phiếu cho local-runner chụp ảnh — standalone, no Layout wrapper */}
      <Route path="/print/arrival/:batchDate/:customerId" element={<PrintArrival />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/notification-log" element={<NotificationLog />} />
        <Route path="/revenue" element={<RevenueVC />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
