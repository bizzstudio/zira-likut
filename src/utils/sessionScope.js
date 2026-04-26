/**
 * מזהה מלקט/ספק לאחר login.
 * מלקט: melaketId = מזהה Status (מלקט). ספק: supplierId = מזהה מסמך Supplier — לא לאחד עם melaketId.
 */

/** מאחד תגובות שרת מקוננות (אדמין / בקאנד לעיתים עוטף ב־data או user) */
export function unwrapLoginPayload(data) {
  if (!data || typeof data !== "object") return data;
  const u = data.user && typeof data.user === "object" ? data.user : {};
  const inner = data.data && typeof data.data === "object" ? data.data : {};
  const r = data.result && typeof data.result === "object" ? data.result : {};
  return { ...u, ...inner, ...r, ...data };
}

export function getAppScopeId() {
  const m = localStorage.getItem("melaketId");
  if (m) return m;
  const s = localStorage.getItem("supplierId");
  return s || "";
}

/** כל מזהי ה-scope הייחודיים (מלקט + ספק) לסינון לקוח */
export function getAppScopeIds() {
  const m = localStorage.getItem("melaketId");
  const s = localStorage.getItem("supplierId");
  return [
    ...new Set(
      [m, s]
        .filter((x) => x != null && String(x).trim() !== "")
        .map((x) => String(x).trim())
    ),
  ];
}

/** true אם נכנסו כספק — לזיהוי סוג משתמש (תפריטים, הודעות); סינון הזמנות/עגלה נעשה לפי getAppScopeId */
export function isSupplierSession() {
  return localStorage.getItem("likutAppRole") === "supplier";
}

/** שומר מזהה מ־POST /app/login (תומך במספר צורות תגובה מהשרת) */
export function persistLoginScope(data) {
  if (!data || typeof data !== "object") return;
  const user = data.user || data.profile || {};
  const merged = { ...user, ...data };

  const inferredSupplier =
    merged.isSupplier === true ||
    user.isSupplier === true ||
    (merged.supplierId != null &&
      merged.melaketId != null &&
      String(merged.supplierId) === String(merged.melaketId));

  let role = String(merged.role || user.role || "").toLowerCase();
  if (!role && inferredSupplier) role = "supplier";

  if (role === "supplier") {
    localStorage.removeItem("melaketId");
    const supDocId =
      merged.supplierProfileId ??
      merged.supplierDocumentId ??
      merged.supplierId ??
      merged.supplier?._id ??
      user.supplierId ??
      user.supplier?._id;
    const legacyAdminAsId =
      supDocId == null || String(supDocId) === ""
        ? merged.melaketId ?? merged.adminId ?? user.melaketId
        : null;
    const sid = supDocId != null && String(supDocId) !== "" ? String(supDocId) : legacyAdminAsId != null ? String(legacyAdminAsId) : "";
    if (sid) localStorage.setItem("supplierId", sid);
    else localStorage.removeItem("supplierId");
    localStorage.setItem("likutAppRole", "supplier");
    return;
  }

  localStorage.removeItem("supplierId");
  localStorage.removeItem("likutAppRole");

  const pickerId =
    merged.pickerStatusId ??
    merged.melaketId ??
    merged._id ??
    user.melaketId;
  if (pickerId != null && String(pickerId) !== "") {
    localStorage.setItem("melaketId", String(pickerId));
  } else {
    localStorage.removeItem("melaketId");
  }
}

export function clearLoginScope() {
  localStorage.removeItem("melaketId");
  localStorage.removeItem("supplierId");
  localStorage.removeItem("likutAppRole");
}
