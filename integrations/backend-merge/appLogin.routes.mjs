/**
 * התחברות אפליקציית ליקוט — מלקטים (סטטוסים) + ספקים (עמוד ספקים באדמין)
 *
 * הרשמה בשרת (אחרי import express ו־mongoose):
 *   import { registerUnifiedAppLogin } from "./routes/appLogin.routes.mjs";
 *   registerUnifiedAppLogin(app, { signAppToken, MelaketModel, SupplierModel });
 *
 * נתיב: POST /api/app/login  (כמו VITE_MAIN_SERVER_URL=http://localhost:3028/api + fetch("/app/login"))
 *
 * @param {import("express").Express} app
 * @param {{
 *   signAppToken: (doc: object, role: "melaket"|"supplier") => string,
 *   MelaketModel?: import("mongoose").Model,
 *   SupplierModel?: import("mongoose").Model,
 *   melaketPhoneField?: string,
 *   supplierPhoneField?: string,
 *   melaketPhoneFields?: string[],
 *   supplierPhoneFields?: string[],
 *   passwordField?: string,
 *   supplierPasswordField?: string,
 *   comparePassword?: (plain: string, stored: string | undefined) => Promise<boolean>,
 * }} opts
 *
 * דוגמה ל־signAppToken (התאם לשדות ה־JWT הקיימים אצלך):
 *   (doc, role) => jwt.sign(
 *     { melaketId: String(doc._id), supplierId: role === "supplier" ? String(doc._id) : undefined, role },
 *     process.env.JWT_SECRET,
 *     { expiresIn: "7d" }
 *   )
 */

/** אחידות טלפון ישראלי לחיפוש */
export function normalizePhoneIL(raw) {
  if (raw == null) return "";
  let s = String(raw).trim().replace(/[\s\-]/g, "");
  if (s.startsWith("+972")) s = "0" + s.slice(4);
  else if (s.startsWith("972") && s.length >= 11) s = "0" + s.slice(3);
  if (/^[1-9]\d{8}$/.test(s)) s = "0" + s;
  return s;
}

function phoneSearchVariants(norm) {
  const v = new Set([norm]);
  if (norm.startsWith("0") && norm.length >= 9) {
    v.add(norm.slice(1));
    v.add(`972${norm.slice(1)}`);
    v.add(`+972${norm.slice(1)}`);
  }
  return [...v];
}

async function defaultComparePassword(plain, stored) {
  if (stored == null || stored === "") return false;
  if (plain === stored) return true;
  if (typeof stored === "string" && stored.startsWith("$2")) {
    try {
      const mod = await import("bcryptjs");
      const bcrypt = mod.default || mod;
      return bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * @param {string} selectPwd — למשל "+password" או "+passwordHash +password"
 */
async function findWithPhoneFields(Model, phoneFields, selectPwd, variants) {
  if (!Model || !phoneFields?.length) return null;
  const fields = [...new Set(phoneFields.filter(Boolean))];
  const or = fields.map((field) => ({ [field]: { $in: variants } }));
  return Model.findOne({ $or: or }).select(selectPwd).lean();
}

/**
 * @param {import("express").Express} app
 */
export function registerUnifiedAppLogin(app, opts) {
  const {
    signAppToken,
    MelaketModel,
    SupplierModel,
    melaketPhoneField = "phone",
    supplierPhoneField = "phone",
    melaketPhoneFields,
    supplierPhoneFields,
    passwordField = "password",
    supplierPasswordField = passwordField,
    comparePassword = defaultComparePassword,
  } = opts;

  const melaketFields =
    melaketPhoneFields ||
    [...new Set([melaketPhoneField, "mobile", "phoneNumber"].filter(Boolean))];
  const supplierFields =
    supplierPhoneFields ||
    [
      ...new Set(
        [supplierPhoneField, "contactPhone", "mobile", "phoneNumber", "tel"].filter(
          Boolean
        )
      ),
    ];

  const melaketPwdSelect = `+${passwordField}`;
  const supplierPwdSelect =
    supplierPasswordField !== passwordField
      ? `+${supplierPasswordField} +${passwordField}`
      : `+${passwordField}`;

  if (typeof signAppToken !== "function") {
    throw new Error("registerUnifiedAppLogin: signAppToken is required");
  }

  const handler = async (req, res) => {
    try {
      const rawPhone =
        req.body?.phone ??
        req.body?.username ??
        req.body?.phoneNumber ??
        req.body?.mobile ??
        "";
      const phoneNorm = normalizePhoneIL(rawPhone);
      const password = String(req.body?.password ?? "").trim();
      if (!phoneNorm || !password) {
        return res.status(400).json({ message: "טלפון או סיסמה חסרים" });
      }
      const variants = phoneSearchVariants(phoneNorm);

      let doc = await findWithPhoneFields(
        MelaketModel,
        melaketFields,
        melaketPwdSelect,
        variants
      );
      let role = "melaket";
      let ok =
        doc &&
        (await comparePassword(
          password,
          doc[passwordField] ?? doc.passwordHash
        ));

      if (!ok && SupplierModel) {
        doc = await findWithPhoneFields(
          SupplierModel,
          supplierFields,
          supplierPwdSelect,
          variants
        );
        role = "supplier";
        const stored =
          doc?.[supplierPasswordField] ?? doc?.[passwordField] ?? doc?.passwordHash;
        ok = doc && (await comparePassword(password, stored));
      }

      if (!ok || !doc) {
        return res.status(401).json("טלפון או סיסמה שגויים");
      }

      const id = String(doc._id);
      const token = signAppToken(doc, role);

      return res.json({
        token,
        melaketId: id,
        supplierId: role === "supplier" ? id : undefined,
        role,
      });
    } catch (e) {
      console.error("app/login", e);
      return res.status(500).json({ message: "שגיאת שרת" });
    }
  };

  app.post("/api/app/login", handler);
}
