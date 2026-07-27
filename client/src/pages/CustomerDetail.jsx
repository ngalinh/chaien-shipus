import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  ArrowLeft, Phone, MapPin, Package, Weight,
  Banknote, CheckCircle, Clock, ZoomIn, Bell, CreditCard,
  ChevronDown, ChevronRight, Edit2,
} from 'lucide-react';
import { formatCurrency, formatDate, StatusBadge, calcCustomerStatus, getUserRole } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import NotificationModal from '../components/NotificationModal.jsx';
import CustomerModal from '../components/CustomerModal.jsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') === 'transactions' ? 'transactions' : 'batches');

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
  const [editOpen, setEditOpen] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);

  useEffect(() => {
    fetchCustomer();
    fetchSettings();
    fetchAllCustomers();
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

  async function fetchAllCustomers() {
    try {
      const res = await axios.get('/api/customers');
      setAllCustomers(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }

  // Danh sách NV SALE để chọn trong modal chỉnh sửa (giống trang Khách hàng)
  const saleOptions = useMemo(() => {
    const map = new Map();
    allCustomers.forEach((c) => {
      if (c.sale_username && !map.has(c.sale_username)) {
        map.set(c.sale_username, { sale_username: c.sale_username, sale_name: c.sale_name || c.sale_username });
      }
    });
    return [...map.values()].sort((a, b) => a.sale_name.localeCompare(b.sale_name, 'vi'));
  }, [allCustomers]);

  function handleCustomerSaved() {
    setEditOpen(false);
    fetchCustomer();
    fetchAllCustomers();
    toast('Đã cập nhật khách hàng', 'success');
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

  function handlePaymentSaved() {
    setPaymentModal(null);
    fetchCustomer();
    if (tab === 'transactions') fetchTransactions();
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 256, padding: 24 }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--mu)' }}>
        Không tìm thấy khách hàng
      </div>
    );
  }

  const status = calcCustomerStatus(customer.latest_shipment_date);
  const stats = customer.stats || {};
  const txList = txData?.transactions || [];

  const statItems = [
    { label: 'Tổng kg', value: `${Number(stats.total_kg || 0).toFixed(2)} kg`, icon: Weight, color: 'var(--ac)' },
    { label: 'Tổng cước VC', value: formatCurrency(stats.total_vc_fee || 0), icon: Banknote, color: 'var(--ac)' },
    { label: 'Đã thanh toán', value: formatCurrency(stats.paid || 0), icon: CheckCircle, color: 'var(--okTx)' },
    { label: 'Còn lại', value: formatCurrency(stats.remaining || 0), icon: CreditCard, color: 'var(--badTx)' },
    { label: 'SL đã giao', value: stats.shipped_count || 0, icon: Package, color: 'var(--tx2)' },
    { label: 'SL chưa giao', value: stats.pending_count || 0, icon: Clock, color: 'var(--warnTx)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>
      {/* Back */}
      <Link
        to="/customers"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--mu)', textDecoration: 'none' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Danh sách khách hàng
      </Link>

      {/* Customer header */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--tx)' }}>{customer.name}</h1>
              <span style={{ font: '400 11px "JetBrains Mono", monospace', color: 'var(--ac)', background: 'var(--acBg)', border: '1px solid var(--acLn)', padding: '3px 10px', borderRadius: 999 }}>
                {customer.code}
              </span>
              <StatusBadge status={status} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              {customer.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tx2)' }}>
                  <Phone className="w-4 h-4" style={{ color: 'var(--mu)' }} />
                  {customer.phone}
                </span>
              )}
              {customer.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tx2)' }}>
                  <MapPin className="w-4 h-4" style={{ color: 'var(--mu)' }} />
                  {customer.address}
                </span>
              )}
              {customer.rate_name && (
                <span style={{ fontSize: 11, color: 'var(--warnTx)', background: 'var(--warnBg)', border: '1px solid var(--warnLn)', padding: '3px 10px', borderRadius: 999 }}>
                  {customer.rate_name} ({Number(customer.rate_per_kg || 0).toLocaleString('en-US')} đ/kg)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* CCCD images */}
            {customer.cccd_images && customer.cccd_images.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {customer.cccd_images.map((img) => (
                  <button key={img.id} onClick={() => setLightbox(img.url)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <img
                      src={img.url}
                      alt="CCCD"
                      style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ln)' }}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Edit customer */}
            <button
              onClick={() => setEditOpen(true)}
              className="btn-primary"
              style={{ gap: 6, height: 36, padding: '0 14px', fontSize: 13 }}
            >
              <Edit2 className="w-4 h-4" />
              Chỉnh sửa
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--ln)' }}>
          {statItems.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--mu)', marginBottom: 4 }}>
                  <Icon style={{ width: 14, height: 14, color: stat.color }} />
                  {stat.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: stat.color, fontFamily: '"JetBrains Mono", monospace' }}>{stat.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 5, borderRadius: 15, background: 'var(--sf)', border: '1px solid var(--ln)', backdropFilter: 'blur(14px)', alignSelf: 'flex-start' }}>
        <button
          onClick={() => setTab('batches')}
          className="tab-btn"
          style={{ background: tab === 'batches' ? 'var(--tx)' : 'transparent', color: tab === 'batches' ? 'var(--page-bg)' : 'var(--mu)' }}
        >
          Hàng về
        </button>
        <button
          onClick={() => setTab('transactions')}
          className="tab-btn"
          style={{ background: tab === 'transactions' ? 'var(--tx)' : 'transparent', color: tab === 'transactions' ? 'var(--page-bg)' : 'var(--mu)' }}
        >
          Giao dịch
        </button>
      </div>

      {/* Tab: Hàng về */}
      {tab === 'batches' && (
        <div>
          {batchesLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--mu)' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
              Đang tải...
            </div>
          ) : batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--mu)' }}>Chưa có hàng về</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Ngày tháng</th>
                    <th>SL tracking</th>
                    <th>Tổng cân nặng</th>
                    <th>Tổng phụ thu</th>
                    <th>Tổng phí VC</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const bKey = `${batch.customer_id}-${batch.batch_date}`;
                    const isOpen = expandedBatch === bKey;
                    const sel = selectedItems[bKey] || new Set();
                    const details = batch.details || [];
                    const allSel = details.length > 0 && details.every((s) => sel.has(s.id));

                    return [
                      <tr
                        key={bKey}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--acBg)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                        onClick={() => toggleBatch(bKey)}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--mu)' }}>
                          {isOpen ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronRight className="w-4 h-4 inline" />}
                        </td>
                        <td style={{ fontWeight: 500 }}>{formatDate(batch.batch_date)}</td>
                        <td>{batch.tracking_count}</td>
                        <td>{Number(batch.total_weight || 0).toFixed(2)} kg</td>
                        <td>{formatCurrency(batch.total_surcharge)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--ac)' }}>{formatCurrency(batch.total_vc_fee)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => generateNotification(batch)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ac)', background: 'var(--acBg)', border: '1px solid var(--acLn)', borderRadius: 8, cursor: 'pointer' }}
                              title="Phiếu báo hàng về"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              Phiếu báo
                            </button>
                            {getUserRole() !== 'staff' && (
                              <button
                                onClick={() => setPaymentModal({
                                  batchDate: batch.batch_date,
                                  amount: batch.total_vc_fee,
                                })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--okTx)', background: 'var(--okBg)', border: '1px solid var(--okLn)', borderRadius: 8, cursor: 'pointer' }}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Thanh toán
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,
                      isOpen && (
                        <tr key={`${bKey}-expand`}>
                          <td colSpan={7} style={{ padding: 0, background: 'var(--sunk)' }}>
                            <div style={{ padding: '12px 24px', overflowX: 'auto' }}>
                              <table style={{ minWidth: 640, width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: 'var(--sf)' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600, width: 32 }}>
                                      <input
                                        type="checkbox"
                                        checked={allSel}
                                        onChange={() => toggleAllItems(bKey, details)}
                                        className="rounded"
                                      />
                                    </th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600, width: 32 }}>STT</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Tracking #</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Sản phẩm</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Cân nặng</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Phụ thu</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Phí VC</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Ghi chú</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.map((s, idx) => {
                                    const vcFee = s.phi_vc || (s.weight * s.customer_rate + s.surcharge);
                                    return (
                                      <tr key={s.id} style={{ borderTop: '1px solid var(--ln)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--sf)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={{ padding: '8px 12px' }}>
                                          <input
                                            type="checkbox"
                                            checked={sel.has(s.id)}
                                            onChange={() => toggleItem(bKey, s.id)}
                                            className="rounded"
                                          />
                                        </td>
                                        <td style={{ padding: '8px 12px', color: 'var(--mu)' }}>{idx + 1}</td>
                                        <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>{s.tracking_no || '–'}</td>
                                        <td style={{ padding: '8px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--tx)' }} title={s.product}>{s.product || '–'}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--tx2)' }}>{s.weight} kg</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--tx2)' }}>{formatCurrency(s.surcharge)}</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ac)' }}>{formatCurrency(vcFee)}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--mu)', fontSize: 11 }}>{s.notes || '–'}</td>
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
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--mu)' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
              Đang tải...
            </div>
          ) : txList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--mu)' }}>Chưa có giao dịch nào</div>
          ) : (
            <>
              {/* Summary */}
              {txData && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: 'var(--badBg)', border: '1px solid var(--badLn)', borderRadius: 12, padding: '8px 16px', fontSize: 13 }}>
                    <span style={{ color: 'var(--mu)' }}>Tổng chi phí: </span>
                    <span style={{ fontWeight: 600, color: 'var(--badTx)' }}>{formatCurrency(txData.total_debit)}</span>
                  </div>
                  <div style={{ background: 'var(--acBg)', border: '1px solid var(--acLn)', borderRadius: 12, padding: '8px 16px', fontSize: 13 }}>
                    <span style={{ color: 'var(--mu)' }}>Đã thanh toán: </span>
                    <span style={{ fontWeight: 600, color: 'var(--ac)' }}>{formatCurrency(txData.total_credit)}</span>
                  </div>
                  <div style={{ background: txData.net_balance >= 0 ? 'var(--okBg)' : 'var(--warnBg)', border: `1px solid ${txData.net_balance >= 0 ? 'var(--okLn)' : 'var(--warnLn)'}`, borderRadius: 12, padding: '8px 16px', fontSize: 13 }}>
                    <span style={{ color: 'var(--mu)' }}>Số dư: </span>
                    <span style={{ fontWeight: 600, color: txData.net_balance >= 0 ? 'var(--okTx)' : 'var(--warnTx)' }}>{formatCurrency(txData.net_balance)}</span>
                  </div>
                </div>
              )}
              <div className="table-container">
                <table className="data-table table-fixed w-full">
                  <colgroup>
                    <col style={{width:'100px'}} />
                    <col style={{width:'160px'}} />
                    <col style={{width:'110px'}} />
                    <col style={{width:'110px'}} />
                    <col style={{width:'110px'}} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Ngày tháng</th>
                      <th>Nội dung</th>
                      <th className="!text-right">Thu (đ)</th>
                      <th className="!text-right">Chi (đ)</th>
                      <th className="!text-right">Số dư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txList.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.trans_date)}</td>
                        <td className="max-w-0" title={tx.description}><span className="block truncate">{tx.description || '–'}</span></td>
                        <td style={{ textAlign: 'right', color: 'var(--okTx)', fontWeight: 500 }}>
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '–'}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--badTx)', fontWeight: 500 }}>
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '–'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: (tx.running_balance || 0) >= 0 ? 'var(--okTx)' : 'var(--badTx)' }}>
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

      {/* Edit customer modal */}
      {editOpen && (
        <CustomerModal
          customer={customer}
          saleOptions={saleOptions}
          onClose={() => setEditOpen(false)}
          onSaved={handleCustomerSaved}
        />
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

      {/* Notification popup: xem trước + Copy ảnh / Tải về */}
      {notifData && (
        <NotificationModal
          notifData={notifData}
          company={settings.company}
          onClose={() => setNotifData(null)}
        />
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


