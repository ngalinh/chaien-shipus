import { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { X, Upload, Download, Check, FileSpreadsheet } from 'lucide-react';
import { toast } from './Toast.jsx';

const IMPORT_HEADERS = [
  'Mã khách hàng', 'Tên khách', 'Số điện thoại', 'Email',
  'Kênh LH', 'Địa chỉ', 'Kho', 'Ghi chú',
];
const FIELD_MAP = {
  'Mã khách hàng': 'code',
  'Tên khách': 'name',
  'Số điện thoại': 'phone',
  'Email': 'email',
  'Kênh LH': 'channel',
  'Địa chỉ': 'address',
  'Kho': 'warehouse',
  'Ghi chú': 'notes',
};

export default function ImportCustomersModal({ onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  function parseFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (data.length < 2) {
          setParseErrors(['File không có dữ liệu']);
          setRows([]);
          return;
        }

        const headerRow = data[0].map((h) => String(h).trim());
        const colMap = {};
        IMPORT_HEADERS.forEach((h) => {
          const idx = headerRow.findIndex((hh) => hh === h);
          if (idx >= 0) colMap[h] = idx;
        });

        if (colMap['Mã khách hàng'] === undefined || colMap['Tên khách'] === undefined) {
          setParseErrors(['File thiếu cột "Mã khách hàng" hoặc "Tên khách". Vui lòng dùng đúng mẫu file.']);
          setRows([]);
          return;
        }

        const parsed = [];
        const errs = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const obj = {};
          IMPORT_HEADERS.forEach((h) => {
            const idx = colMap[h];
            obj[FIELD_MAP[h]] = idx !== undefined ? String(row[idx] || '').trim() : '';
          });

          if (!obj.code && !obj.name) continue;

          if (!obj.code) {
            errs.push(`Dòng ${i + 1}: Thiếu mã khách hàng`);
          } else if (!obj.name) {
            errs.push(`Dòng ${i + 1}: Thiếu tên khách`);
          } else {
            const ch = obj.channel.toLowerCase();
            if (ch.includes('zalo')) obj.channel = 'zalo';
            else if (ch.includes('facebook') || ch === 'fb') obj.channel = 'fb';
            const wh = (obj.warehouse || '').trim().toUpperCase().replace(/\s+/g, ' ');
            if (wh === 'US UK' || wh === 'UK US') obj.warehouse = 'US UK';
            else if (wh === 'US') obj.warehouse = 'US';
            else if (wh === 'UK') obj.warehouse = 'UK';
            else obj.warehouse = '';
            parsed.push(obj);
          }
        }

        setRows(parsed);
        setParseErrors(errs);
        setResult(null);
      } catch (err) {
        setParseErrors([`Lỗi đọc file: ${err.message}`]);
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  function downloadTemplate() {
    const sampleRow = [
      'SUHCM_MAUKH', 'Nguyễn Văn A', '0912345678',
      'example@gmail.com', 'Zalo', '123 Đường ABC, Q.1, TP.HCM', '',
    ];
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, sampleRow]);
    ws['!cols'] = IMPORT_HEADERS.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KhachHang');
    XLSX.writeFile(wb, 'mau_import_khach_hang.xlsx');
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await axios.post('/api/customers/import', { rows });
      setResult(res.data);
      setRows([]);
      setParseErrors([]);
      toast(`Đã import ${res.data.imported} khách hàng`, 'success');
      onImported?.();
    } catch (err) {
      const msg = err.response?.data?.error
        || (err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message)
        || 'Lỗi import';
      toast(msg, 'error');
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setRows([]);
    setParseErrors([]);
    setResult(null);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--sf)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--ln)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--ln)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet style={{ width: 20, height: 20, color: 'var(--ac)' }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>Import danh sách khách hàng</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={downloadTemplate} className="btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }}>
              <Download style={{ width: 14, height: 14 }} />
              Tải mẫu file
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', display: 'flex', padding: 4 }}>
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--ac)' : 'var(--ln)'}`,
              borderRadius: 12,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--acBg)' : 'var(--sunk)',
              transition: 'all 0.15s',
            }}
          >
            <Upload style={{ width: 32, height: 32, margin: '0 auto 8px', color: 'var(--mu)', display: 'block' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--tx2)' }}>Kéo thả hoặc click để chọn file Excel</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--mu)' }}>Hỗ trợ .xlsx, .xls, .csv</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--badBg)', border: '1px solid var(--badLn)' }}>
              {parseErrors.map((e, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--badTx)' }}>{e}</p>
              ))}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--tx2)' }}>
                  Xem trước: <span style={{ color: 'var(--ac)' }}>{rows.length} dòng</span> sẵn sàng import
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleReset} className="btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }}>
                    <X style={{ width: 14, height: 14 }} />
                    Hủy
                  </button>
                  <button onClick={handleImport} disabled={importing} className="btn-primary" style={{ fontSize: 13, padding: '6px 12px' }}>
                    {importing
                      ? <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      : <Upload style={{ width: 14, height: 14 }} />}
                    {importing ? 'Đang import...' : `Import ${rows.length} khách hàng`}
                  </button>
                </div>
              </div>
              <div className="table-container" style={{ maxHeight: '16rem', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                      <th>Mã KH</th>
                      <th>Tên khách</th>
                      <th>SĐT</th>
                      <th>Email</th>
                      <th>Kênh LH</th>
                      <th>Địa chỉ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', color: 'var(--mu)' }}>{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--ac)' }}>{r.code}</td>
                        <td>{r.name}</td>
                        <td>{r.phone}</td>
                        <td>{r.email}</td>
                        <td>{r.channel === 'zalo' ? 'Zalo' : r.channel === 'fb' ? 'Facebook' : r.channel}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.address}>{r.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 100 && (
                <p style={{ margin: '4px 0 0', fontSize: 12, textAlign: 'center', color: 'var(--mu)' }}>Hiển thị 100 / {rows.length} dòng</p>
              )}
            </div>
          )}

          {/* Import result */}
          {result && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: 'var(--okBg)', border: '1px solid var(--okLn)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--okTx)' }}>Kết quả import</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--okTx)' }}>
                  <Check style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
                  Đã thêm: <strong>{result.imported}</strong>
                </span>
                <span style={{ fontSize: 13, color: 'var(--warnTx)' }}>
                  Đã tồn tại (bỏ qua): <strong>{result.skipped}</strong>
                </span>
                {result.errors?.length > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--badTx)' }}>
                    Lỗi: <strong>{result.errors.length}</strong>
                  </span>
                )}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {result.errors.map((e, i) => (
                    <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--badTx)' }}>Dòng {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Format guide */}
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'var(--acBg)', border: '1px solid var(--acLn)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 500, color: 'var(--ac)' }}>Hướng dẫn định dạng file:</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--tx2)' }}>
              Cột bắt buộc: <strong>Mã khách hàng</strong>, <strong>Tên khách</strong>.
              Cột Kênh LH nhận giá trị <strong>Zalo</strong> hoặc <strong>Facebook</strong>.
              Các mã KH đã tồn tại trong hệ thống sẽ được bỏ qua.
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
