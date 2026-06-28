import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Package, Plus, Edit2, Trash2, Bell, ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import ImportModal from '../components/ImportModal.jsx';
import NotificationTemplate from '../components/NotificationTemplate.jsx';
import VanDonInlineEdit from '../components/VanDonInlineEdit.jsx';

export default function Shipping() {
  const [tab, setTab] = useState('incoming');
  const [shipments, setShipments] = useState([]);
  const [notifyBatches, setNotifyBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [notifData, setNotifData] = useState(null);
  const [settings, setSettings] = useState({ company: {} });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (tab === 'incoming') fetchShipments();
    else fetchNotifyBatches();
  }, [tab]);

  async function fetchSettings() {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch { /* ignore */ }
  }

  async function fetchShipments() {
    setLoading(true);
    try {
      const res = await axios.get('/api/shipments');
      setShipments(res.data);
    } catch (err) {
      console.error('fetchShipments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifyBatches() {
    setLoading(true);
    try {
      // /api/shipments/bao-khach returns aggregated batches with details
      const res = await axios.get('/api/shipments/bao-khach');
      setNotifyBatches(res.data);
    } catch (err) {
      console.error('fetchNotifyBatches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa kiện hàng này?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/shipments/${id}`);
      setShipments((prev) => prev.filter((s) => s.id !== id));
      toast('Đã xóa', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể xóa', 'error');
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditValues({
      surcharge: s.surcharge,
      notes: s.notes || '',
      tracking_no: s.tracking_no || '',
      product: s.product || '',
      weight: s.weight,
    });
  }

  async function saveEdit(id) {
    try {
      const res = await axios.put(`/api/shipments/${id}`, editValues);
      setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data } : s)));
      setEditingId(null);
      toast('Đã cập nhật', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể cập nhật', 'error');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  async function updateVanDon(batch, value) {
    try {
      await axios.put('/api/shipments/batch', {
        batch_date: batch.batch_date,
        customer_id: batch.customer_id,
        van_don_code: value,
      });
      setNotifyBatches((prev) =>
        prev.map((b) =>
          b.batch_date === batch.batch_date && b.customer_id === batch.customer_id
            ? { ...b, van_don_code: value }
            : b
        )
      );
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể cập nhật mã vận đơn', 'error');
    }
  }

  async function triggerNotification(batch) {
    const details = batch.details || [];
    if (details.length === 0) {
      toast('Không có kiện hàng trong lô này', 'warning');
      return;
    }

    // Mark batch as notified
    try {
      await axios.post('/api/shipments/batch/notify', {
        batch_date: batch.batch_date,
        customer_id: batch.customer_id,
      });
    } catch { /* non-critical */ }

    setNotifData({
      batch,
      customerName: batch.customer_name,
      date: batch.batch_date,
      items: details.map((s) => ({
        tracking_no: s.tracking_no,
        product: s.product,
        weight: s.weight,
        customer_fee: s.phi_vc || (s.weight * s.customer_rate + s.surcharge),
      })),
      fileName: `thong-bao-${batch.customer_code || 'kh'}-${batch.batch_date}.png`,
    });
  }

  function handleImported() {
    setImportModal(false);
    fetchShipments();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vận chuyển</h1>
            <p className="text-sm text-gray-500">Quản lý hàng về và báo khách</p>
          </div>
        </div>
        {tab === 'incoming' && (
          <button onClick={() => setImportModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nhập kho
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        <button
          onClick={() => setTab('incoming')}
          className={`tab-btn ${tab === 'incoming' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Hàng về
        </button>
        <button
          onClick={() => setTab('notify')}
          className={`tab-btn ${tab === 'notify' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Báo khách
        </button>
      </div>

      {/* Tab: Hàng về */}
      {tab === 'incoming' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày tháng</th>
                <th>Mã KH</th>
                <th>Kho</th>
                <th>Tracking #</th>
                <th>Sản phẩm</th>
                <th>Cân nặng</th>
                <th>Phụ thu</th>
                <th>Phí trả đối tác</th>
                <th>Ghi chú</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Chưa có hàng về. Nhấn "Nhập kho" để thêm.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => {
                  const isEditing = editingId === s.id;
                  return (
                    <tr key={s.id} className={isEditing ? 'bg-yellow-50' : ''}>
                      <td>{formatDate(s.import_date)}</td>
                      <td>
                        <span className="font-mono text-sm text-primary-700">{s.customer_code}</span>
                        {s.customer_name && <span className="text-xs text-gray-500 ml-1">({s.customer_name})</span>}
                      </td>
                      <td>{s.warehouse_code || '–'}</td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editValues.tracking_no}
                            onChange={(e) => setEditValues((p) => ({ ...p, tracking_no: e.target.value }))}
                            className="input-field py-1 text-xs w-28"
                          />
                        ) : (
                          <span className="font-mono text-xs">{s.tracking_no || '–'}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editValues.product}
                            onChange={(e) => setEditValues((p) => ({ ...p, product: e.target.value }))}
                            className="input-field py-1 text-xs w-28"
                          />
                        ) : (
                          <span className="max-w-[120px] truncate block" title={s.product}>{s.product || '–'}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.weight}
                            onChange={(e) => setEditValues((p) => ({ ...p, weight: e.target.value }))}
                            className="input-field py-1 text-xs w-20"
                            step={0.01}
                            min={0}
                          />
                        ) : (
                          `${s.weight} kg`
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.surcharge}
                            onChange={(e) => setEditValues((p) => ({ ...p, surcharge: e.target.value }))}
                            className="input-field py-1 text-xs w-24"
                            step={1000}
                            min={0}
                          />
                        ) : (
                          formatCurrency(s.surcharge)
                        )}
                      </td>
                      <td>{formatCurrency(s.weight * s.partner_rate)}</td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editValues.notes}
                            onChange={(e) => setEditValues((p) => ({ ...p, notes: e.target.value }))}
                            className="input-field py-1 text-xs w-28"
                          />
                        ) : (
                          <span className="text-gray-500 text-xs">{s.notes || '–'}</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(s.id)}
                                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(s)}
                                className="btn-icon text-blue-500 hover:bg-blue-50"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={deleting === s.id}
                                className="btn-icon text-red-500 hover:bg-red-50 disabled:opacity-50"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Báo khách */}
      {tab === 'notify' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Ngày tháng</th>
                <th>Mã KH</th>
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
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : notifyBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                notifyBatches.map((batch) => {
                  const bKey = `${batch.customer_id}-${batch.batch_date}`;
                  const isOpen = expandedBatch === bKey;
                  return [
                    <tr
                      key={bKey}
                      className={`cursor-pointer hover:bg-primary-50 ${batch.notified_at ? 'opacity-75' : ''}`}
                      onClick={() => setExpandedBatch(isOpen ? null : bKey)}
                    >
                      <td className="text-center text-gray-400">
                        {isOpen ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronRight className="w-4 h-4 inline" />}
                      </td>
                      <td className="font-medium">{formatDate(batch.batch_date)}</td>
                      <td>
                        <span className="font-mono text-primary-700">{batch.customer_code}</span>
                        <span className="text-xs text-gray-500 ml-1">({batch.customer_name})</span>
                      </td>
                      <td>{batch.tracking_count}</td>
                      <td>{Number(batch.total_weight || 0).toFixed(2)} kg</td>
                      <td>{formatCurrency(batch.total_partner_fee)}</td>
                      <td>{formatCurrency(batch.total_surcharge)}</td>
                      <td className="font-semibold text-primary-700">{formatCurrency(batch.total_vc_fee)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <VanDonInlineEdit
                          value={batch.van_don_code || ''}
                          onSave={(v) => updateVanDon(batch, v)}
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => triggerNotification(batch)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg ${
                            batch.notified_at
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {batch.notified_at ? 'Gửi lại' : 'Thông báo'}
                        </button>
                      </td>
                    </tr>,
                    isOpen && (
                      <tr key={`${bKey}-detail`} className="expand-row">
                        <td colSpan={10} className="bg-primary-50/50 p-0">
                          <div className="px-8 py-3">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-white">
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">STT</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Tracking #</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Sản phẩm</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Cân nặng</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Phí ship</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Phụ thu</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Phí VC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(batch.details || []).map((s, idx) => {
                                  const vcFee = s.phi_vc || (s.weight * s.customer_rate + s.surcharge);
                                  return (
                                    <tr key={s.id} className="border-t border-gray-100 hover:bg-white">
                                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                                      <td className="px-3 py-2 font-mono">{s.tracking_no || '–'}</td>
                                      <td className="px-3 py-2 max-w-[160px] truncate">{s.product || '–'}</td>
                                      <td className="px-3 py-2">{s.weight} kg</td>
                                      <td className="px-3 py-2">{formatCurrency(s.weight * s.partner_rate)}</td>
                                      <td className="px-3 py-2">{formatCurrency(s.surcharge)}</td>
                                      <td className="px-3 py-2 font-semibold text-primary-700">{formatCurrency(vcFee)}</td>
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
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Import modal */}
      {importModal && (
        <ImportModal onClose={() => setImportModal(false)} onImported={handleImported} />
      )}

      {/* Notification generator */}
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
              toast('Đã tải xuống ảnh thông báo', 'success');
              setNotifData(null);
              // Refresh to update notified_at status
              fetchNotifyBatches();
            }}
          />
        </div>
      )}
    </div>
  );
}

