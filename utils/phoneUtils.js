function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+251')) {
    const number = cleaned.slice(4).replace(/\D/g, '');
    if (number.length >= 9) return '+251' + number.slice(0, 9);
    return '+251' + number;
  }
  if (cleaned.startsWith('0')) {
    const number = cleaned.slice(1).replace(/\D/g, '');
    if (number.length >= 9) return '+251' + number.slice(0, 9);
    return '+251' + number;
  }
  const number = cleaned.replace(/\D/g, '');
  if (number.length >= 9) return '+251' + number.slice(0, 9);
  return '+251' + number;
}

module.exports = { normalizePhone };
