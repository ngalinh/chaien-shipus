import dayjs from 'dayjs';

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '0 đ';
  return Number(value).toLocaleString('vi-VN') + ' đ';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('DD/MM/YYYY');
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('YYYY-MM-DD');
}

export function todayInputValue() {
  return dayjs().format('YYYY-MM-DD');
}

export function calcCustomerStatus(lastDate) {
  if (!lastDate) return 'inactive';
  const diffDays = dayjs().diff(dayjs(lastDate), 'day');
  if (diffDays <= 30) return 'active1';
  if (diffDays <= 60) return 'active2';
  if (diffDays <= 90) return 'active3';
  return 'inactive';
}

export function StatusBadge({ status }) {
  const map = {
    active1: { label: 'Active 1m', cls: 'badge-active' },
    active2: { label: 'Active 2m', cls: 'badge-warning' },
    active3: { label: 'Active 3m', cls: 'badge-orange' },
    inactive: { label: 'Inactive', cls: 'badge-inactive' },
  };
  const s = map[status] || map.inactive;
  return <span className={s.cls}>{s.label}</span>;
}
