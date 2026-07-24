import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, ClipboardPaste, AlertCircle, Check, HelpCircle, AlertTriangle } from 'lucide-react';
import { toast } from './Toast.jsx';
import { buildCustomerIndex, matchCustomer, matchWarehouse, normKey } from '../utils.jsx';

/**
 * ImportModal: paste tab-separated Excel data from the shipping partner to create
 * shipments. Columns: Tên khách / Kho / Tracking # / Sản phẩm / Kg
 *
 * The partner writes names without diacritics and sometimes a code fragment, and
 * uses its own warehouse codes (OR/NH/LHC…). We resolve each row to a real customer
 * (auto-match, or a ranked suggestion the user confirms) and warehouse (code/alias)
 * before importing.
 */
export default function ImportModal({ onClose, onImported }) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [overrides, setOverrides] = useState({}); // rowIndex -> customerId chosen by user
  const [parseError, setParseError] = useState('');
  const [importDate, setImportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [importing, setImporting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [aliasMap, setAliasMap] = useState({});

  useEffect(() => {
    axios.get('/api/customers').then((r) => setCustomers(r.data)).catch(() => {});
    axios.get('/api/settings').then((r) => setWarehouses(r.data.warehouses || [])).catch(() => {});
    axios.get('/api/customers/aliases').then((r) => {
      const map = {};
      r.data.forEach((a) => { map[a.raw_key] = a.customer_id; });
      setAliasMap(map);
    }).catch(() => {});
  }, []);

  const customerIndex = useMemo(() => buildCustomerIndex(customers), [customers]);
  const customerById = useMemo(() => {
    const m = new Map();
    customers.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);
  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => (a.code || '').localeCompare(b.code || '')),
    [customers]
  );

  // Resolve each parsed row to a customer + warehouse (recomputed when data loads).
  const resolved = useMemo(
    () =>
      parsed.map((r) => ({
        ...matchCustomer(r.customer_raw, customerIndex, aliasMap),
        wh: matchWarehouse(r.warehouse_code, warehouses),
      })),
    [parsed, customerIndex, warehouses, aliasMap]
  );

  const effectiveCustomerId = (i) =>
    overrides[i] !== undefined ? overrides[i] : resolved[i]?.customerId ?? null;

  function parseRows(text) {
    setParseError('');
    setOverrides({});
    const lines = text.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      setParsed([]);
      return;
    }

    const rows = [];
    lines.forEach((line, idx) => {
      const cols = line.split('\t').map((c) => c.trim());
      // Skip a pasted header row
      if ((cols[0] || '').toLowerCase().replace(/\s/g, '') === 'tenkhach') return;
      if (cols.length < 5) {
        rows.push({ _row: rows.length + 1, _error: `Thiếu cột (cần 5, có ${cols.length})`, customer_raw: cols[0] || '', warehouse_code: cols[1] || '', tracking_no: cols[2] || '', product: cols[3] || '', weight: '' });
        return;
      }
      const weight = parseFloat((cols[4] || '').replace(',', '.'));
      rows.push({
        _row: rows.length + 1,
        _error: isNaN(weight) ? `Cân nặng không hợp lệ "${cols[4]}"` : null,
        customer_raw: cols[0],
        warehouse_code: cols[1],
        tracking_no: cols[2],
        product: cols[3],
        weight: isNaN(weight) ? cols[4] : weight,
      });
    });

    const errors = rows.filter((r) => r._error).map((r) => `Hàng ${r._row}: ${r._error}`);
    if (errors.length > 0) {
      setParseError(errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n... và ${errors.length - 3} lỗi khác` : ''));
    }
    setParsed(rows);
  }

  function handleTextChange(e) {
    setRawText(e.target.value);
    parseRows(e.target.value);
  }

  const validRows = parsed.filter((r) => !r._error);
  const errorRows = parsed.filter((r) => r._error);
  const unresolved = parsed.filter((r, i) => !r._error && !effectiveCustomerId(i)).length;
  const canImport = validRows.length > 0 && errorRows.length === 0 && unresolved === 0;

  async function handleImport() {
    if (parseError) { toast('Vui lòng sửa lỗi dữ liệu trước khi nhập', 'warning'); return; }
    if (!importDate) { toast('Vui lòng chọn ngày nhập kho', 'warning'); return; }
    if (unresolved > 0) { toast(`Còn ${unresolved} kiện chưa chọn khách hàng`, 'warning'); return; }

    setImporting(true);
    try {
      const rows = parsed
        .map((r, i) => (r._error ? null : {
          customer_id: effectiveCustomerId(i),
          warehouse_id: resolved[i]?.wh?.id || null,
          tracking_no: r.tracking_no,
          product: r.product,
          weight: parseFloat(r.weight) || 0,
        }))
        .filter(Boolean);
      const res = await axios.post('/api/shipments/import', { import_date: importDate, rows });
      toast(`Đã nhập ${res.data.imported || rows.length} kiện hàng`, 'success');
      onImported(res.data);
    } catch (err) {
      toast(err.response?.data?.error || 'Không thể nhập dữ liệu', 'error');
    } finally {
      setImporting(false);
    }
  }

  const autoCount = parsed.filter((r, i) => !r._error && overrides[i] === undefined && resolved[i]?.status === 'auto').length;
  const pickedCount = parsed.filter((r, i) => !r._error && overrides[i] !== undefined && overrides[i]).length;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-5xl">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Nhập kho hàng về</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <div className="modal-body">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">Hướng dẫn:</p>
            <p>Paste dữ liệu từ file Excel đối tác (5 cột, phân cách Tab):</p>
            <code className="block mt-1 text-xs bg-blue-100 px-2 py-1 rounded">Tên khách → Kho → Tracking # → Sản phẩm → Kg</code>
            <p className="mt-1 text-xs">Hệ thống tự dò khách theo tên/mã (bỏ dấu). Dòng chưa chắc sẽ hiện <b>gợi ý</b> để chọn.</p>
          </div>

          <div>
            <label className="label">Ngày nhập kho</label>
            <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} className="input-field w-auto" required />
          </div>

          <div>
            <label className="label">
              Dán dữ liệu vào đây
              {parsed.length > 0 && <span className="ml-2 font-normal text-gray-500">({parsed.length} hàng)</span>}
            </label>
            <textarea
              value={rawText}
              onChange={handleTextChange}
              rows={6}
              className="input-field font-mono text-xs resize-y"
              placeholder={`NGUYEN VAN A\tOR\tTK123456\tMon\t1.5\nTRAN THI B\tLHC\tTK789012\tMon\t2.0`}
              spellCheck={false}
            />
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <pre className="text-xs text-red-700 whitespace-pre-wrap">{parseError}</pre>
              </div>
            </div>
          )}

          {parsed.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-2 text-sm flex-wrap">
                <span className="inline-flex items-center gap-1 text-green-700"><Check className="w-4 h-4" /> Tự khớp: <b>{autoCount}</b></span>
                {pickedCount > 0 && <span className="inline-flex items-center gap-1 text-blue-600"><Check className="w-4 h-4" /> Đã chọn tay: <b>{pickedCount}</b></span>}
                {unresolved > 0 && <span className="inline-flex items-center gap-1 text-amber-600"><HelpCircle className="w-4 h-4" /> Cần chọn khách: <b>{unresolved}</b></span>}
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[22rem] overflow-y-auto">
                <table className="data-table text-xs">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                      <th className="w-8">#</th>
                      <th>Tên trong file</th>
                      <th className="min-w-[220px]">Khách hàng (hệ thống)</th>
                      <th>Kho</th>
                      <th>Tracking #</th>
                      <th>Kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsed.map((row, i) => {
                      if (row._error) {
                        return (
                          <tr key={i} className="bg-red-50">
                            <td className="text-gray-400">{row._row}</td>
                            <td>{row.customer_raw}</td>
                            <td colSpan={4} className="text-red-600">{row._error}</td>
                          </tr>
                        );
                      }
                      const r = resolved[i] || {};
                      const eid = effectiveCustomerId(i);
                      const isManual = overrides[i] !== undefined;
                      const tone = eid
                        ? (isManual ? 'manual' : 'auto')
                        : (r.status === 'none' ? 'missing' : 'suggest');
                      const rowCls = { auto: 'bg-green-50/60', manual: 'bg-blue-50/60', suggest: 'bg-amber-50/60', missing: 'bg-red-50' }[tone];
                      const suggestIds = (r.suggestions || []).filter((id) => customerById.has(id));
                      const wh = r.wh;
                      return (
                        <tr key={i} className={rowCls}>
                          <td className="text-gray-400">{row._row}</td>
                          <td className="max-w-[150px] truncate" title={row.customer_raw}>{row.customer_raw}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              {tone === 'auto' && <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title="Tự khớp" />}
                              {tone === 'manual' && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" title="Đã chọn tay" />}
                              {tone === 'suggest' && <HelpCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title="Có gợi ý — hãy chọn khách đúng" />}
                              {tone === 'missing' && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" title="Không tìm thấy — chọn tay hoặc tạo khách mới" />}
                              <select
                                value={eid || ''}
                                onChange={(e) => {
                                  const newId = e.target.value ? parseInt(e.target.value) : null;
                                  setOverrides((p) => ({ ...p, [i]: newId }));
                                  if (newId) {
                                    const rk = normKey(row.customer_raw);
                                    setAliasMap((p) => ({ ...p, [rk]: newId }));
                                    axios.post('/api/customers/aliases', { raw_key: rk, customer_id: newId }).catch(() => {});
                                  }
                                }}
                                className="input-field py-1 text-xs w-full"
                              >
                                <option value="">— Chọn khách hàng —</option>
                                {suggestIds.length > 0 && (
                                  <optgroup label="Gợi ý">
                                    {suggestIds.map((id) => {
                                      const c = customerById.get(id);
                                      return <option key={`s${id}`} value={id}>{c.code} — {c.name}</option>;
                                    })}
                                  </optgroup>
                                )}
                                <optgroup label="Tất cả khách hàng">
                                  {customerOptions.map((c) => (
                                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          </td>
                          <td>
                            {wh ? (
                              <span className="text-gray-700" title={`${wh.code} (${wh.name})`}>{row.warehouse_code} → {wh.code}</span>
                            ) : (
                              <span className="text-red-500" title="Không khớp kho — phí đối tác = 0">{row.warehouse_code || '–'} ⚠</span>
                            )}
                          </td>
                          <td className="font-mono max-w-[130px] truncate" title={row.tracking_no}>{row.tracking_no}</td>
                          <td>{row.weight}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
          <button onClick={handleImport} disabled={importing || !canImport} className="btn-primary">
            {importing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {importing ? 'Đang nhập...' : `Nhập ${validRows.length} kiện hàng`}
          </button>
        </div>
      </div>
    </div>
  );
}
