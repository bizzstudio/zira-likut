/**
 * מיזוג לבקאנד (פורט 3028)
 *
 * לפני שימוש:
 * 1) העתק את כל תיקיית `mnm-likut/shared/` לשורש הבקאנד כ־`shared/` (ליד `src/` או ליד `package.json`).
 * 2) העתק את `FormSubmission.model.js` לתיקיית המודלים שלך והוסף ל־mongoose.
 * 3) שמור קובץ זה כ־`src/routes/formSubmissions.routes.mjs` (או התאם נתיבי import למטה).
 * 4) בקובץ הראשי של השרת:
 *    import { registerLikutFormRoutes } from "./routes/formSubmissions.routes.mjs";
 *    registerLikutFormRoutes(app, { appAuth, adminAuth, FormSubmission });
 *
 * נתיבים:
 * - POST /app/forms/submissions  (אותו מסלול כמו בליקוט)
 * - GET  /api/form-schemas
 * - GET  /api/form-schemas/:code
 * - GET  /admin/form-submissions
 * - GET  /admin/form-submissions/:id/print
 */
import { isKnownFormCode, getFormSchema, listFormCodes } from "../../shared/forms/registry.js";
import { buildPrintHtml } from "../../shared/pdf/htmlReport.js";

/**
 * @param {import("express").Express} app
 * @param {{ appAuth: Function, adminAuth: Function, FormSubmission: import("mongoose").Model }} opts
 */
export function registerLikutFormRoutes(app, opts) {
  const { appAuth, adminAuth, FormSubmission } = opts;
  if (!FormSubmission) {
    throw new Error("registerLikutFormRoutes: FormSubmission model required");
  }

  app.post("/app/forms/submissions", appAuth, async (req, res) => {
    try {
      const { formCode, submittedAt, melaketId, data } = req.body || {};
      if (!formCode || data === undefined) {
        return res.status(400).json({ error: "formCode and data required" });
      }
      const code = String(formCode).toUpperCase();
      if (!isKnownFormCode(code)) {
        return res
          .status(400)
          .json({ error: "unknown formCode", allowed: listFormCodes() });
      }
      const doc = await FormSubmission.create({
        formCode: code,
        submittedAt: submittedAt || new Date().toISOString(),
        melaketId: melaketId ?? null,
        data,
      });
      return res.status(201).json({ id: String(doc._id), ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "save_failed" });
    }
  });

  app.get("/api/form-schemas", adminAuth, (_req, res) => {
    res.json({ codes: listFormCodes() });
  });

  app.get("/api/form-schemas/:code", adminAuth, (req, res) => {
    const s = getFormSchema(req.params.code);
    if (!s) return res.status(404).json({ error: "unknown" });
    res.json(s);
  });

  app.get("/admin/form-submissions", adminAuth, async (_req, res) => {
    try {
      const rows = await FormSubmission.find()
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
      const items = rows.map((r) => ({
        id: String(r._id),
        formCode: r.formCode,
        submittedAt: r.submittedAt,
        melaketId: r.melaketId,
      }));
      return res.json({ items });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "list_failed" });
    }
  });

  app.get("/admin/form-submissions/:id/print", adminAuth, async (req, res) => {
    try {
      const doc = await FormSubmission.findById(req.params.id).lean();
      if (!doc) return res.status(404).send("not found");
      const schema = getFormSchema(doc.formCode);
      if (!schema) return res.status(404).send("unknown form");
      const html = buildPrintHtml(schema, doc.data);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (e) {
      console.error(e);
      return res.status(500).send("error");
    }
  });
}
