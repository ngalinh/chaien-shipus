// Ô nhập số tiền: tự chèn dấu phẩy ngăn cách hàng nghìn ngay khi gõ.
// value là số (hoặc ''), onChange trả về số (hoặc '' khi để trống).
export default function MoneyInput({ value, onChange, className = 'input-field', ...props }) {
  const digits = value === '' || value == null ? '' : String(value).replace(/[^\d]/g, '');
  const display = digits ? Number(digits).toLocaleString('en-US') : '';
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        onChange(raw === '' ? '' : Number(raw));
      }}
      className={className}
      {...props}
    />
  );
}
