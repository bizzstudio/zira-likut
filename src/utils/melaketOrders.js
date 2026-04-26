/**
 * סינון הזמנות/שורות עגלה לפי מזהה מלקט/ספק (כמו ב-localStorage אחרי login).
 * scope יכול להיות מחרוזת אחת או מערך מזהים (למשל melaketId + supplierId כשהם שונים).
 *
 * חשוב: order.melaketId / item.melaketId הם לרוב שיוך ליקוט למלקט — לא בעלות מוצר.
 * פיצול לפי ספק נקבע רק לפי שורות בעגלה עם שדות ספק/מפיץ — לא לפי supplierId ברמת הזמנה
 * (שם לעיתים מופיע ספק־אב / שדה אחר שלא תואם למשתמש המחובר, ואז כל ההזמנה נפסלה).
 */

function strId(v) {
  if (v == null) return "";
  if (typeof v === "object" && v._id != null) return String(v._id);
  return String(v);
}

/** השוואת ObjectId ומחרוזות — ללא רגישות לאותיות */
function canonId(v) {
  const s = strId(v);
  if (!s || s === "[object Object]") return "";
  return s.trim().toLowerCase();
}

function scopeIdSet(scopeIds) {
  return new Set(scopeIds.map((x) => canonId(x)).filter(Boolean));
}

/** מחרוזת אחת או מערך — רשימת מזהים ייחודית ללא ריקים */
export function normalizeScopeIds(scope) {
  if (scope == null || scope === "") return [];
  if (Array.isArray(scope)) {
    return [...new Set(scope.map((s) => strId(s)).filter(Boolean))];
  }
  const one = strId(scope);
  return one ? [one] : [];
}

/** רק שדות שמצביעים על ספק/מפיץ מוצר — לא melaketId של שורה */
function cartItemHasSupplierMeta(item) {
  if (!item) return false;
  return (
    item.supplierId != null ||
    item.supplier_id != null ||
    item.vendorId != null ||
    item.vendor_id != null ||
    item.supplier != null ||
    item.vendor != null ||
    item.product?.supplierId != null ||
    item.product?.supplier_id != null ||
    item.product?.vendorId != null ||
    item.product?.vendor_id != null ||
    item.product?.supplier != null ||
    item.product?.vendor != null
  );
}

function lineIdsForScopeMatch(item) {
  if (!item) return [];
  return [
    strId(item.supplierId),
    strId(item.supplier_id),
    strId(item.vendorId),
    strId(item.vendor_id),
    strId(item.melaketId),
    strId(item.supplier),
    strId(item.vendor),
    strId(item.product?.supplierId),
    strId(item.product?.supplier_id),
    strId(item.product?.vendorId),
    strId(item.product?.vendor_id),
    strId(item.product?.supplier),
    strId(item.product?.vendor),
    strId(item.product?.supplier?._id),
    strId(item.product?.vendor?._id),
  ].filter(Boolean);
}

export function cartItemBelongsToMelaket(item, scopeIdOrIds) {
  const scopeIds = normalizeScopeIds(scopeIdOrIds);
  if (!scopeIds.length || !item) return true;
  const want = scopeIdSet(scopeIds);
  const lineCanon = lineIdsForScopeMatch(item).map(canonId).filter(Boolean);
  if (!lineCanon.length) return false;
  return lineCanon.some((lid) => want.has(lid));
}

export function filterCartForMelaket(cart, scopeIdOrIds) {
  const scopeIds = normalizeScopeIds(scopeIdOrIds);
  if (!scopeIds.length || !Array.isArray(cart)) return cart || [];
  const anyMeta = cart.some(cartItemHasSupplierMeta);
  if (!anyMeta) return cart;
  return cart.filter((item) => cartItemBelongsToMelaket(item, scopeIds));
}

function orderLevelMatches(order, scopeIdOrIds) {
  const scopeIds = normalizeScopeIds(scopeIdOrIds);
  if (!scopeIds.length) return true;
  const want = scopeIdSet(scopeIds);
  const oid = [
    strId(order?.supplierId),
    strId(order?.supplier_id),
    strId(order?.vendorId),
    strId(order?.vendor_id),
    strId(order?.melaketId),
    strId(order?.supplier),
    strId(order?.vendor),
  ]
    .map(canonId)
    .filter(Boolean);
  return oid.some((id) => want.has(id));
}

/**
 * האם יש בשורות העגלה אינדיקציה לפיצול לפי ספק (מספר ספקים באותה הזמנה).
 * לא משתמשים ב-supplierId ברמת ההזמנה בלבד — זה גורם לדחיית הזמנות Likut תקינות.
 */
function orderHasSupplierSplitMetadata(order) {
  if (!order) return false;
  return (order.cart || []).some(cartItemHasSupplierMeta);
}

/** רשימת הזמנות: רק הזמנות שיש בהן לפחות פריט (או רמת הזמנה) ששייכים לאחד ממזהי ה-scope */
export function filterOrdersForMelaket(orders, scopeIdOrIds) {
  const scopeIds = normalizeScopeIds(scopeIdOrIds);
  if (!scopeIds.length || !Array.isArray(orders)) return orders || [];
  return orders.filter((order) => {
    if (!orderHasSupplierSplitMetadata(order)) return true;
    if (orderLevelMatches(order, scopeIds)) return true;
    const cart = order.cart || [];
    return cart.some((item) => cartItemBelongsToMelaket(item, scopeIds));
  });
}

/** אובייקט הזמנה אחת להצגה בליקוט — עגלה מצומצמת לפריטים של הספק/מלקט */
export function scopeOrderForMelaket(order, scopeIdOrIds) {
  if (!order) return order;
  const filtered = filterCartForMelaket(order.cart, scopeIdOrIds);
  if (filtered === order.cart) return order;
  return { ...order, cart: filtered };
}
