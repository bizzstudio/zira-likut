/**
 * סכום שורות עגלה לפי מחיר×כמות (כמו תצוגת שורה ב־Item / OrderPreview).
 * לספק: ה־cart כבר מסונן בבקאנד — מסכמים את מה שחזר בלי סינון נוסף.
 */

function lineUnitPrice(item) {
  const raw = item?.price ?? item?.originalPrice ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function lineQuantity(item) {
  const q = Number(item?.quantity ?? 0);
  return Number.isFinite(q) && q > 0 ? q : 0;
}

/** סכום ביניים של שורות העגלה (מספר, עיגול לשתי ספרות) */
export function supplierCartSubtotal(cart) {
  if (!Array.isArray(cart)) return 0;
  let sum = 0;
  for (const line of cart) {
    sum += lineUnitPrice(line) * lineQuantity(line);
  }
  return Math.round(sum * 100) / 100;
}
