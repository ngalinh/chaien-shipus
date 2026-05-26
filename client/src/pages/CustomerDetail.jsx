import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  ArrowLeft, Phone, MapPin, MessageCircle, Package, Weight,
  Banknote, CheckCircle, Clock, ZoomIn, Bell, CreditCard,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate, StatusBadge, calcCustomerStatus } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import NotificationTemplate from '../components/NotificationTemplate.jsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('batches');

  // Hàng về tab state
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});

  // Giao dịch tab state
  const [txData, setTxData] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  // Modals & overlays
  const [paymentModal, setPaymentModal] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [notifData, setNotifData] = useState(null);
  const [settings, setSettings] = useState({ company: {} });

  useEffect(() => {
    fetchCustomer();
    fetchSettings();
  }, [id]);

  useEffect(() => {
    if (tab === 'batches') fetchBatches();
    else fetchTransactions();
  }, [tab, id]);

  async function fetchCustomer() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/customers/${id}`);
      setCustomer(res.data);
    } catch (err) {
      console.error('fetchCustomer:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch { /* ignore */ }
  }

  async function fetchBatches() {
    setBatchesLoading(true);
    try {
      // Use /api/shipments/bao-khach with customer_id filter
      const res = await axios.get('/api/shipments/bao-khach', {
        params: { customer_id: id },
      });
      setBatches(res.data);
    } catch (err) {
      console.error('fetchBatches:', err);
    } finally {
      setBatchesLoading(false);
    }
  }

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const res = await axios.get(`/api/transactions/${id}`);
      setTxData(res.data);
    } catch (err) {
      console.error('fetchTransactions:', err);
    } finally {
      setTxLoading(false);
    }
  }

  function toggleBatch(batchKey) {
    setExpandedBatch((prev) => (prev === batchKey ? null : batchKey));
  }

  function toggleItem(batchKey, shipId) {
    setSelectedItems((prev) => {
      const batchSel = new Set(prev[batchKey] || []);
      if (batchSel.has(shipId)) batchSel.delete(shipId);
      else batchSel.add(shipId);
      return { ...prev, [batchKey]: batchSel };
    });
  }

  function toggleAllItems(batchKey, details) {
    setSelectedItems((prev) => {
      const batchSel = prev[batchKey] || new Set();
      const allSelected = details.every((s) => batchSel.has(s.id));
      return {
        ...prev,
        [batchKey]: allSelected ? new Set() : new Set(details.map((s) => s.id)),
      };
    });
  }

  function generateNotification(batch) {
    const batchKey = `${batch.customer_id}-${batch.batch_date}`;
    const sel = selectedItems[batchKey] || new Set();
    let details = batch.details || [];
    if (sel.size > 0) {
      details = details.filter((s) => sel.has(s.id));
    }
    if (details.length === 0) {
      toast('Chọn ít nhất một kiện hàng hoặc không có kiện trong lô này', 'warning');
      return;
    }
    setNotifData({
      batchKey,
      customerName: customer.name,
      date: batch.batch_date,
      items: details.map((s) => ({
        tracking_no: s.tracking_no,
        product: s.product,
        weight: s.weight,
        customer_fee: s.phi_vc || (s.weight * s.customer_rate + s.surcharge),
      })),
      fileName: `phieu-bao-hang-ve-${customer.code}-${batch.batch_date}.png`,
    });
  }

  async function updateBatchVanDon(batch, value) {
    try {
      await axios.put('/api/shipments/batch', {
        batch_date: batch.batch_date,
        customer_id: batch.customer_id,
        van_don_code: value,
      });
      setBatches((prev) =>
        prev.map((b) =>
          b.batch_date === batch.batch_date && b.customer_id === batch.customer_id
            ? { ...b, van_don_code: value }
            : b
        )
      );
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi cập nhật mã vận đơn', 'error');
    }
  }

  function handlePaymentSaved() {
    setPaymentModal(null);
    fetchCustomer();
    if (tab === 'transactions') fetchTransactions();
  }

  const channelLabel = (ch) => {
    if (ch === 'fb') return 'Facebook';
    if (ch === 'zalo') return 'Zalo';
    return ch || '–';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center text-gray-400">
        Không tìm thấy khách hàng
      </div>
    );
  }

  const status = calcCustomerStatus(customer.latest_shipment_date);
  const stats = customer.stats || {};
  const txList = txData?.transactions || [];

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Danh sách khách hàng
      </Link>

      {/* Customer header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <span className="text-sm font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {customer.code}
              </span>
              <StatusBadge status={status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {customer.phone}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {customer.address}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                {channelLabel(customer.channel)}
              </span>
              {customer.rate_name && (
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                  {customer.rate_name} ({Number(customer.rate_per_kg || 0).toLocaleString('vi-VN')} đ/kg)
                </span>
              )}
            </div>
          </div>

          {/* CCCD images */}
          {customer.cccd_images && customer.cccd_images.length > 0 && (
            <div className="flex gap-2">
              {customer.cccd_images.map((img) => (
                <button key={img.id} onClick={() => setLightbox(img.url)} className="relative group">
                  <img
                    src={img.url}
                    alt="CCCD"
                    className="w-20 h-14 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-gray-100">
          {[
            { label: 'Tổng kg', value: `${Number(stats.total_kg || 0).toFixed(2)} kg`, icon: Weight, color: 'text-purple-600' },
            { label: 'Tổng cước VC', value: formatCurrency(stats.total_vc_fee || 0), icon: Banknote, color: 'text-primary-600' },
            { label: 'Đã thanh toán', value: formatCurrency(stats.paid || 0), icon: CheckCircle, color: 'text-blue-600' },
            { label: 'Còn lại', value: formatCurrency(stats.remaining || 0), icon: CreditCard, color: 'text-red-600' },
            { label: 'SL đã giao', value: stats.shipped_count || 0, icon: Package, color: 'text-gray-600' },
            { label: 'SL chưa giao', value: stats.pending_count || 0, icon: Clock, color: 'text-orange-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-0.5">
                  <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  {stat.label}
                </div>
                <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        <button
          onClick={() => setTab('batches')}
          className={`tab-btn ${tab === 'batches' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Hàng về
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={`tab-btn ${tab === 'transactions' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Giao dịch
        </button>
      </div>

      {/* Tab: Hàng về */}
      {tab === 'batches' && (
        <div>
          {batchesLoading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Đang tải...
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Chưa có hàng về</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Ngày tháng</th>
                    <th>SL tracking</th>
                    <th>Tổng cân nặng</th>
                    <th>Tổng phí ship</th>
                    <th>Tổng phụ thu</th>
                    <th>Tổng phí VC</th>
                    <th>Mã vận đơn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batches.map((batch) => {
                    const bKey = `${batch.customer_id}-${batch.batch_date}`;
                    const isOpen = expandedBatch === bKey;
                    const sel = selectedItems[bKey] || new Set();
                    const details = batch.details || [];
                    const allSel = details.length > 0 && details.every((s) => sel.has(s.id));

                    return [
                      <tr
                        key={bKey}
                        className="cursor-pointer hover:bg-primary-50"
                        onClick={() => toggleBatch(bKey)}
                      >
                        <td className="text-center text-gray-400">
                          {isOpen ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronRight className="w-4 h-4 inline" />}
                        </td>
                        <td className="font-medium">{formatDate(batch.batch_date)}</td>
                        <td>{batch.tracking_count}</td>
                        <td>{Number(batch.total_weight || 0).toFixed(2)} kg</td>
                        <td>{formatCurrency(batch.total_partner_fee)}</td>
                        <td>{formatCurrency(batch.total_surcharge)}</td>
                        <td className="font-semibold text-primary-700">{formatCurrency(batch.total_vc_fee)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <VanDonInlineEdit
                            value={batch.van_don_code || ''}
                            onSave={(v) => updateBatchVanDon(batch, v)}
                          />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => generateNotification(batch)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded hover:bg-primary-100"
                              title="Phiếu báo hàng về"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              Phiếu báo
                            </button>
                            <button
                              onClick={() => setPaymentModal({
                                batchDate: batch.batch_date,
                                amount: batch.total_vc_fee,
                              })}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Thanh toán
                            </button>
                          </div>
                        </td>
                      </tr>,
                      isOpen && (
                        <tr key={`${bKey}-expand`} className="expand-row">
                          <td colSpan={9} className="bg-primary-50/50 p-0">
                            <div className="px-6 py-3">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-white">
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold w-8">
                                      <input
                                        type="checkbox"
                                        checked={allSel}
                                        onChange={() => toggleAllItems(bKey, details)}
                                        className="rounded"
                                      />
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold w-8">STT</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Tracking #</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Sản phẩm</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Cân nặng</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Phí ship</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Phụ thu</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Phí VC</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Ghi chú</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.map((s, idx) => {
                                    const vcFee = s.phi_vc || (s.weight * s.customer_rate + s.surcharge);
                                    return (
                                      <tr key={s.id} className="border-t border-gray-100 hover:bg-white">
                                        <td className="px-3 py-2">
                                          <input
                                            type="checkbox"
                                            checked={sel.has(s.id)}
                                            onChange={() => toggleItem(bKey, s.id)}
                                            className="rounded"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{s.tracking_no || '–'}</td>
                                        <td className="px-3 py-2 max-w-[160px] truncate" title={s.product}>{s.product || '–'}</td>
                                        <td className="px-3 py-2">{s.weight} kg</td>
                                        <td className="px-3 py-2">{formatCurrency(s.weight * s.partner_rate)}</td>
                                        <td className="px-3 py-2">{formatCurrency(s.surcharge)}</td>
                                        <td className="px-3 py-2 font-semibold text-primary-700">{formatCurrency(vcFee)}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{s.notes || '–'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Giao dịch */}
      {tab === 'transactions' && (
        <div>
          {txLoading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Đang tải...
            </div>
          ) : txList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Chưa có giao dịch nào</div>
          ) : (
            <>
              {/* Summary */}
              {txData && (
                <div className="flex gap-4 mb-4 flex-wrap">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
                    <span className="text-gray-500">Tổng chi phí: </span>
                    <span className="font-semibold text-red-700">{formatCurrency(txData.total_debit)}</span>
                  </div>
                  <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 text-sm">
                    <span className="text-gray-500">Đã thanh toán: </span>
                    <span className="font-semibold text-primary-700">{formatCurrency(txData.total_credit)}</span>
                  </div>
                  <div className={`border rounded-lg px-4 py-2 text-sm ${txData.net_balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <span className="text-gray-500">Số dư: </span>
                    <span className={`font-semibold ${txData.net_balance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>{formatCurrency(txData.net_balance)}</span>
                  </div>
                </div>
              )}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ngày tháng</th>
                      <th>Nội dung</th>
                      <th className="text-right">Thu (đ)</th>
                      <th className="text-right">Chi (đ)</th>
                      <th className="text-right">Số dư</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {txList.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.trans_date)}</td>
                        <td>{tx.description || '–'}</td>
                        <td className="text-right text-green-700 font-medium">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '–'}
                        </td>
                        <td className="text-right text-red-600 font-medium">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '–'}
                        </td>
                        <td className={`text-right font-semibold ${(tx.running_balance || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrency(tx.running_balance || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment modal */}
      {paymentModal && (
        <PaymentModal
          customerId={parseInt(id)}
          batchDate={paymentModal.batchDate}
          amount={paymentModal.amount}
          onClose={() => setPaymentModal(null)}
          onSaved={handlePaymentSaved}
        />
      )}

      {/* Notification image generator */}
      {notifData && (
        <div className="fixed -left-[9999px] top-0 z-[-1]">
          <NotificationTemplate
            customerName={notifData.customerName}
            date={notifData.date}
            items={notifData.items}
            companyName={settings.company?.company_name || 'Chaien Shipus'}
            companyLogo={settings.company?.logo_path || undefined}
            hotline={settings.company?.hotline}
            autoDownload={true}
            fileName={notifData.fileName}
            onRendered={() => {
              toast('Đã tải xuống phiếu báo hàng về', 'success');
              setNotifData(null);
            }}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt="CCCD"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// Inline editable van_don component
function VanDonInlineEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  function handleSave() {
    onSave(val);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="input-field py-1 text-xs w-28"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <button
          onClick={handleSave}
          className="text-xs px-1.5 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          ✓
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-1.5 py-1 bg-gray-200 text-gray-600 rounded"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-xs text-gray-600 hover:text-primary-700 hover:underline min-w-[60px]"
    >
      {value || <span className="text-gray-300 italic">+ Thêm</span>}
    </button>
  );
}

