import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Users, Search } from 'lucide-react';
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
      toast(err.response?.data?.error || 'Không thể tải danh sách khách hàng', 'error');
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

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  const channelLabel = (ch) => {
    if (ch === 'fb') return 'Facebook';
    if (ch === 'zalo') return 'Zalo';
    return ch || '–';
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Khách hàng</h1>
            <p className="text-sm text-gray-500">{customers.length} khách hàng</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Tạo Mã KH
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo mã, tên, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã KH</th>
              <th>Tình trạng</th>
              <th>Họ tên</th>
              <th>SĐT</th>
              <th>Địa chỉ</th>
              <th>Kênh LH</th>
              <th>Cước VC</th>
              <th>Ghi chú</th>
              <th>Ngày tạo</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">
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
                        className="font-semibold text-green-700 hover:text-green-900 hover:underline"
                      >
                        {c.code}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.phone || '–'}</td>
                    <td className="max-w-xs truncate" title={c.address}>{c.address || '–'}</td>
                    <td>{channelLabel(c.channel)}</td>
                    <td>
                      {c.rate_name ? (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                          {c.rate_name}
                        </span>
                      ) : '–'}
                    </td>
                    <td className="max-w-xs truncate text-gray-500" title={c.notes}>{c.notes || '–'}</td>
                    <td className="text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="btn-icon text-blue-500 hover:bg-blue-50"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="btn-icon text-red-500 hover:bg-red-50 disabled:opacity-50"
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
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
