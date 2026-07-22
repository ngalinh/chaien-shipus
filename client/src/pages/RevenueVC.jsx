import { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { formatCurrency } from '../utils.jsx';

const fmtKg = (v) => `${Number(v || 0).toLocaleString('en-US')} kg`;

export default function RevenueVC() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [sale, setSale] = useState('');
  const [tab, setTab] = useState('customer'); // 'customer' | 'sale'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get('/api/dashboard/vc-revenue', { params: { month, sale } });
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error('vc-revenue:', err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [month, sale]);

  const byCustomer = data?.by_customer || [];
  const bySale = data?.by_sale || [];
  const cskhRow = data?.cskh_row || null;
  const saleOptions = data?.sale_options || [];

  // Tổng cho tab Khách hàng (để tiện chi hoa hồng)
  const custTotals = byCustomer.reduce(
    (acc, r) => ({
      weight: acc.weight + (r.total_weight || 0),
      fee: acc.fee + (r.total_vc_fee || 0),
      sale: acc.sale + (r.profit_sale || 0),
      cskh: acc.cskh + (r.profit_cskh || 0),
    }),
    { weight: 0, fee: 0, sale: 0, cskh: 0 }
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-page font-bold text-ink-900 leading-tight">Doanh thu VC</h1>
          <p className="text-body-md text-ink-500 mt-1.5">
            Profit SALE = 1% phí VC · Profit CSKH = 0.5% phí VC
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-2xs font-semibold text-ink-400 mb-1">Tháng</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-field !py-2"
            />
          </div>
          <div>
            <label className="block text-2xs font-semibold text-ink-400 mb-1">NV SALE</label>
            <select
              value={sale}
              onChange={(e) => setSale(e.target.value)}
              className="input-field !py-2 min-w-[160px]"
            >
              <option value="">Tất cả NV</option>
              {saleOptions.map((o) => (
                <option key={o.sale_username} value={o.sale_username}>
                  {o.sale_name || o.sale_username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'customer', label: 'Khách hàng' },
          { key: 'sale', label: 'Nhân viên' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              tab === t.key
                ? 'bg-primary-500 text-white shadow-pill'
                : 'bg-white text-ink-500 hover:bg-greige-50'
            }`}
            style={{ transition: 'background-color 150ms ease-out, color 150ms ease-out' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="text-center py-12 text-ink-400">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              Đang tải...
            </div>
          </div>
        ) : tab === 'customer' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th className="text-right">Tổng cân nặng</th>
                <th className="text-right">Tổng phí VC</th>
                <th>NV SALE</th>
                <th className="text-right">Profit SALE</th>
                <th className="text-right">Profit CSKH</th>
              </tr>
            </thead>
            <tbody>
              {byCustomer.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-ink-400">
                    Không có dữ liệu trong tháng này
                  </td>
                </tr>
              ) : (
                <>
                  {byCustomer.map((r) => (
                    <tr key={r.id}>
                      <td className="font-semibold text-primary-700">{r.customer_code}</td>
                      <td className="text-right">{fmtKg(r.total_weight)}</td>
                      <td className="text-right">{formatCurrency(r.total_vc_fee)}</td>
                      <td>{r.sale_name || <span className="text-ink-400">Chưa gán</span>}</td>
                      <td className="text-right font-medium">{formatCurrency(r.profit_sale)}</td>
                      <td className="text-right font-medium">{formatCurrency(r.profit_cskh)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-greige-50">
                    <td>Tổng cộng</td>
                    <td className="text-right">{fmtKg(Math.round(custTotals.weight * 100) / 100)}</td>
                    <td className="text-right">{formatCurrency(custTotals.fee)}</td>
                    <td />
                    <td className="text-right">{formatCurrency(Math.round(custTotals.sale * 100) / 100)}</td>
                    <td className="text-right">{formatCurrency(Math.round(custTotals.cskh * 100) / 100)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th className="text-right">Số KH</th>
                <th className="text-right">Tổng cân nặng</th>
                <th className="text-right">Tổng phí VC</th>
                <th className="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {bySale.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-ink-400">
                    Không có dữ liệu trong tháng này
                  </td>
                </tr>
              ) : (
                <>
                  {bySale.map((r) => (
                    <tr key={r.sale_username || '__none__'}>
                      <td className="font-medium">{r.sale_name}</td>
                      <td className="text-right">{r.customer_count}</td>
                      <td className="text-right">{fmtKg(r.total_weight)}</td>
                      <td className="text-right">{formatCurrency(r.total_vc_fee)}</td>
                      <td className="text-right font-medium">{formatCurrency(r.profit)}</td>
                    </tr>
                  ))}
                  {cskhRow && (
                    <tr className="bg-primary-50">
                      <td className="font-semibold text-primary-800">{cskhRow.sale_name}</td>
                      <td className="text-right">{cskhRow.customer_count}</td>
                      <td className="text-right">{fmtKg(cskhRow.total_weight)}</td>
                      <td className="text-right">{formatCurrency(cskhRow.total_vc_fee)}</td>
                      <td className="text-right font-semibold text-primary-800">{formatCurrency(cskhRow.profit)}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
