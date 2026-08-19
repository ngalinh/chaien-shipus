'use strict';

// Chuẩn hoá SĐT để so khớp/khoá bản ghi: bỏ ký tự thừa + tiền tố 84/0.
// VD: "+84 917 134 252" / "0917134252" / "84917134252" -> "917134252".
function normPhone(v) {
  return String(v == null ? '' : v).replace(/\D/g, '').replace(/^84/, '').replace(/^0/, '');
}

module.exports = { normPhone };
