import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, X, FileSpreadsheet } from 'lucide-react';
import { formatDate, calcCustomerStatus } from '../utils.jsx';
import { toast } from '../components/Toast.jsx';
import CustomerModal from '../components/CustomerModal.jsx';
import ImportCustomersModal from '../components/ImportCustomersModal.jsx';

function StatusChip({ status }) {
  const isActive = status === 'active';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      color: isActive ? 'var(--okTx)' : 'var(--mu)',
      background: isActive ? 'var(--okBg)' : 'var(--sf2)',
      border: `1px solid ${isActive ? 'var(--okLn)' : 'var(--ln)'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? 'var(--okTx)' : 'var(--mu)' }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function RateChip({ name }) {
  if (!name) return <span style={{ color: 'var(--mu)' }}>–</span>;
  const isBuon = name.toLowerCase().includes('buôn') || name.toLowerCase().includes('buon');
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px', borderRadius: 8,
      fontSize: 11, fontWeight: 700,
      color: isBuon ? 'var(--warnTx)' : 'var(--ac)',
      background: isBuon ? 'var(--warnBg)' : 'var(--acBg)',
      border: `1px solid ${isBuon ? 'var(--warnLn)' : 'var(--acLn)'}`,
      maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }} title={name}>
      {name}
    </span>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchCustomers(); }, []);

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
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast('Đã xóa khách hàng', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể xóa khách hàng', 'error');
    } finally {
      setDeleting(null);
    }
  }

  function openCreate() { setEditCustomer(null); setModalOpen(true); }
  function openEdit(c) { setEditCustomer(c); setModalOpen(true); }

  function handleSaved(saved) {
    if (editCustomer) {
      setCustomers(prev => prev.map(c => (c.id === saved.id ? saved : c)));
    } else {
      setCustomers(prev => [saved, ...prev]);
    }
    setModalOpen(false);
    toast(editCustomer ? 'Đã cập nhật khách hàng' : 'Đã tạo khách hàng mới', 'success');
  }

  const filtered = (Array.isArray(customers) ? customers : []).filter(c => {
    const q = search.toLowerCase();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  const saleOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(customers) ? customers : []).forEach(c => {
      if (c.sale_username && !map.has(c.sale_username)) {
        map.set(c.sale_username, { sale_username: c.sale_username, sale_name: c.sale_name || c.sale_username });
      }
    });
    return [...map.values()].sort((a, b) => a.sale_name.localeCompare(b.sale_name, 'vi'));
  }, [customers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 4px 0' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--tx)' }}>
            Khách hàng
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--mu)' }}>
            {customers.length} khách hàng
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '0 15px', height: 42,
            borderRadius: 999,
            background: 'var(--sf)',
            border: '1px solid var(--ln)',
            backdropFilter: 'blur(14px)',
          }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--mu)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, SĐT…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none', outline: 'none',
                background: 'transparent',
                fontSize: 13, color: 'var(--tx)',
                width: 180, fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', display: 'flex', padding: 0 }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={() => setImportOpen(true)} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tạo Mã KH
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table table-fixed w-full" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ width: 150 }}>Tên khách</th>
              <th style={{ width: 90 }}>Tình trạng</th>
              <th style={{ width: 100 }}>SĐT</th>
              <th style={{ width: 110 }}>Địa chỉ</th>
              <th style={{ width: 85 }}>Cước VC</th>
              <th style={{ width: 85 }}>NV Sale</th>
              <th style={{ width: 95 }}>Ghi chú</th>
              <th style={{ width: 88 }}>Ngày tạo</th>
              <th style={{ width: 72, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--ac)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--mu)' }}>
                  {search ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
                </td>
              </tr>
            ) : filtered.map(c => {
              const status = calcCustomerStatus(c.latest_shipment_date);
              return (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <div style={{ font: '400 10.5px "JetBrains Mono", monospace', color: 'var(--ac)', marginTop: 3 }}>
                        {c.code}
                      </div>
                    </Link>
                  </td>
                  <td><StatusChip status={status} /></td>
                  <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{c.phone || '–'}</td>
                  <td><div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tx2)' }} title={c.address}>{c.address || '–'}</div></td>
                  <td><RateChip name={c.rate_name} /></td>
                  <td style={{ color: 'var(--tx2)' }}>{c.sale_name || c.sale_username || '–'}</td>
                  <td><div style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--mu)' }} title={c.notes}>{c.notes || '–'}</div></td>
                  <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--mu)' }}>{formatDate(c.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <button onClick={() => openEdit(c)} className="btn-icon" title="Chỉnh sửa">
                        <Edit2 className="w-[14px] h-[14px]" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="btn-icon"
                        title="Xóa"
                        style={{ color: 'var(--badTx)' }}
                      >
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CustomerModal
          customer={editCustomer}
          saleOptions={saleOptions}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {importOpen && (
        <ImportCustomersModal
          onClose={() => setImportOpen(false)}
          onImported={fetchCustomers}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
