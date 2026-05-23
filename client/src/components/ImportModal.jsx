import { useState } from 'react';
import axios from 'axios';
import { X, ClipboardPaste, AlertCircle } from 'lucide-react';
import { toast } from './Toast.jsx';

/**
 * ImportModal: paste tab-separated Excel data to create shipments
 * Expected columns: Tên khách / Kho / Tracking # / Sản phẩm / Kg
 */
export default function ImportModal({ onClose, onImported }) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importDate, setImportDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [importing, setImporting] = useState(false);

  function parseRows(text) {
    setParseError('');
    const lines = text.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      setParsed([]);
      return;
    }

    const rows = lines.map((line, idx) => {
      const cols = line.split('\t').map((c) => c.trim());
      // Format: Tên khách | Kho | Tracking | Sản phẩm | Kg
      if (cols.length < 5) {
        return { _row: idx + 1, _error: `Hàng ${idx + 1}: thiếu cột (cần 5 cột, có ${cols.length})`, customer_name: cols[0] || '', warehouse_code: cols[1] || '', tracking_no: cols[2] || '', product: cols[3] || '', weight: '' };
      }
      const weight = parseFloat(cols[4].replace(',', '.'));
      return {
        _row: idx + 1,
        _error: isNaN(weight) ? `Hàng ${idx + 1}: cân nặng không hợp lệ "${cols[4]}"` : null,
        customer_name: cols[0],
        warehouse_code: cols[1],
        tracking_no: cols[2],
        product: cols[3],
        weight: isNaN(weight) ? cols[4] : weight,
      };
    });

    const errors = rows.filter((r) => r._error).map((r) => r._error);
    if (errors.length > 0) {
      setParseError(errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n... và ${errors.length - 3} lỗi khác` : ''));
    }
    setParsed(rows);
  }

  function handleTextChange(e) {
    const v = e.target.value;
    setRawText(v);
    parseRows(v);
  }

  async function handleImport() {
    if (parsed.length === 0) {
      toast('Chưa có dữ liệu để nhập', 'warning');
      return;
    }
    if (parseError) {
      toast('Vui lòng sửa lỗi dữ liệu trước khi nhập', 'warning');
      return;
    }
    if (!importDate) {
      toast('Vui lòng chọn ngày nhập kho', 'warning');
      return;
    }

    setImporting(true);
    try {
      const payload = {
        import_date: importDate,
        rows: parsed.map((r) => ({
          customer_name: r.customer_name,
          warehouse_code: r.warehouse_code,
          tracking_no: r.tracking_no,
          product: r.product,
          weight: parseFloat(r.weight) || 0,
        })),
      };
      const res = await axios.post('/api/shipments/import', payload);
      toast(`Đã nhập ${res.data.imported || parsed.length} kiện hàng`, 'success');
      onImported(res.data);
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể nhập dữ liệu', 'error');
    } finally {
      setImporting(false);
    }
  }

  const validRows = parsed.filter((r) => !r._error);
  const errorRows = parsed.filter((r) => r._error);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-3xl">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Nhập kho hàng về</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">Hướng dẫn:</p>
            <p>Paste dữ liệu từ file Excel đối tác theo định dạng (5 cột, phân cách bằng Tab):</p>
            <code className="block mt-1 text-xs bg-blue-100 px-2 py-1 rounded">
              Tên khách → Kho → Tracking # → Sản phẩm → Kg
            </code>
          </div>

          {/* Date input */}
          <div>
            <label className="label">Ngày nhập kho</label>
            <input
              type="date"
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
              className="input-field w-auto"
              required
            />
          </div>

          {/* Paste area */}
          <div>
            <label className="label">
              Dán dữ liệu vào đây
              {parsed.length > 0 && (
                <span className="ml-2 font-normal text-gray-500">({parsed.length} hàng)</span>
              )}
            </label>
            <textarea
              value={rawText}
              onChange={handleTextChange}
              rows={8}
              className="input-field font-mono text-xs resize-y"
              placeholder={`Nguyen Van A\tKHO1\tTK123456\tAo thun\t1.5\nTran Thi B\tKHO2\tTK789012\tQuan jean\t2.0`}
              spellCheck={false}
            />
          </div>

          {/* Parse errors */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <pre className="text-xs text-red-700 whitespace-pre-wrap">{parseError}</pre>
              </div>
            </div>
          )}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  Xem trước: {validRows.length} hàng hợp lệ{errorRows.length > 0 ? `, ${errorRows.length} lỗi` : ''}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Tên khách</th>
                      <th>Kho</th>
                      <th>Tracking #</th>
                      <th>Sản phẩm</th>
                      <th>Kg</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsed.slice(0, 50).map((row) => (
                      <tr key={row._row} className={row._error ? 'bg-red-50' : ''}>
                        <td className="text-gray-400">{row._row}</td>
                        <td className="max-w-[120px] truncate" title={row.customer_name}>{row.customer_name}</td>
                        <td>{row.warehouse_code}</td>
                        <td className="font-mono">{row.tracking_no}</td>
                        <td className="max-w-[120px] truncate" title={row.product}>{row.product}</td>
                        <td>{row.weight}</td>
                        <td>
                          {row._error ? (
                            <span className="text-red-600 text-xs">Lỗi</span>
                          ) : (
                            <span className="text-green-600 text-xs">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {parsed.length > 50 && (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-400 py-2">
                          ... và {parsed.length - 50} hàng nữa
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={importing || validRows.length === 0 || errorRows.length > 0}
            className="btn-primary"
          >
            {importing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {importing
              ? 'Đang nhập...'
              : `Nhập ${validRows.length} kiện hàng`}
          </button>
        </div>
      </div>
    </div>
  );
}
