import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { formatDate, StatusBadge, calcCustomerStatus } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import CustomerModal from '../components/CustomerModal.jsx';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('fetchCustomers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/customers/${id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast('Đã xóa khách hàng', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể xóa khách hàng', 'error');
    } finally {
      setDeleting(null);
    }
  }

  function openCreate() {
    setEditCustomer(null);
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditCustomer(c);
    setModalOpen(true);
  }

  function handleSaved(saved) {
    if (editCustomer) {
      setCustomers((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    } else {
      setCustomers((prev) => [saved, ...prev]);
    }
    setModalOpen(false);
    toast(editCustomer ? 'Đã cập nhật khách hàng' : 'Đã tạo khách hàng mới', 'success');
  }

  const filtered = (Array.isArray(customers) ? customers : []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  // Danh sách NV SALE đã có (distinct) để đổ vào dropdown gán NV khi sửa khách.
  const saleOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(customers) ? customers : []).forEach((c) => {
      if (c.sale_username && !map.has(c.sale_username)) {
        map.set(c.sale_username, { sale_username: c.sale_username, sale_name: c.sale_name || c.sale_username });
      }
    });
    return [...map.values()].sort((a, b) => a.sale_name.localeCompare(b.sale_name, 'vi'));
  }, [customers]);

  const channelLabel = (ch) => {
    if (ch === 'fb') return 'Facebook';
    if (ch === 'zalo') return 'Zalo';
    return ch || '–';
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-page font-bold text-ink-900 leading-tight">Khách hàng</h1>
          <p className="text-body-md text-ink-500 mt-1.5">{customers.length} khách hàng</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-full shadow-pill px-4 py-2.5">
            <Search className="w-4 h-4 text-ink-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none outline-none bg-transparent text-sm w-44 text-ink-900 placeholder-ink-400"
            />
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tạo Mã KH
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-36">Mã KH</th>
              <th className="w-24">Tình trạng</th>
              <th>Họ tên</th>
              <th className="w-24">SĐT</th>
              <th>Địa chỉ</th>
              <th className="w-24">Cước VC</th>
              <th>Ghi chú</th>
              <th className="w-24">Ngày tạo</th>
              <th className="w-24 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-ink-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-ink-400">
                  {search ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const status = calcCustomerStatus(c.latest_shipment_date);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        to={`/customers/${c.id}`}
                        className="font-semibold text-primary-700 hover:text-primary-900 hover:underline block max-w-[160px] truncate"
                        title={c.code}
                      >
                        {c.code}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td className="font-medium"><div className="max-w-[160px] truncate" title={c.name}>{c.name}</div></td>
                    <td><div className="max-w-[120px] truncate" title={c.phone}>{c.phone || '–'}</div></td>
                    <td><div className="max-w-[200px] truncate" title={c.address}>{c.address || '–'}</div></td>
                    <td>
                      {c.rate_name ? (
                        <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                          <span className="max-w-[100px] truncate inline-block align-bottom" title={c.rate_name}>{c.rate_name}</span>
                        </span>
                      ) : '–'}
                    </td>
                    <td><div className="max-w-[140px] truncate text-ink-400" title={c.notes}>{c.notes || '–'}</div></td>
                    <td className="text-ink-400">{formatDate(c.created_at)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="btn-icon text-primary-600 hover:bg-primary-100"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="btn-icon text-danger-600 hover:bg-danger-100 disabled:opacity-50"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <CustomerModal
          customer={editCustomer}
          saleOptions={saleOptions}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
