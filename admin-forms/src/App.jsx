import { useEffect, useState } from "react";
import { getFormSchema } from "@shared/forms/registry.js";

const apiHeaders = () => {
  const h = { Accept: "application/json" };
  const t =
    typeof localStorage !== "undefined" &&
    localStorage.getItem("adminToken");
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

export default function App() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    fetch("/api/admin/forms/submissions", { headers: apiHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) =>
        setItems(d.items || d.submissions || [])
      )
      .catch((e) => setErr(e.message || "שגיאה"));
  };

  const openPrint = (id) => {
    const t =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("adminToken");
    fetch(`/api/admin/forms/submissions/${id}/print`, {
      headers: {
        Accept: "text/html",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((html) => {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
        }
      })
      .catch(() => setErr("פתיחת הדפסה נכשלה (בדוק התחברות אדמין)"));
  };

  /** PDF נוצר רק בשרת — אין יצירת PDF בצד לקוח */
  const downloadPdf = (id) => {
    const t =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("adminToken");
    fetch(`/api/admin/forms/submissions/${id}/pdf`, {
      headers: {
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `form-submission-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setErr("הורדת PDF נכשלה (בדוק התחברות אדמין)"));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 900 }} dir="rtl">
      <h1>הגשות טפסים</h1>
      <p style={{ color: "#555" }}>
        מחובר לבקאנד דרך Vite proxy (ברירת מחדל{" "}
        <code>http://localhost:3028</code>). נדרש טוקן אדמין ב־
        <code>localStorage.adminToken</code>.
      </p>
      <button type="button" onClick={load}>
        רענן
      </button>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <table
        cellPadding={8}
        style={{ marginTop: 16, borderCollapse: "collapse", width: "100%" }}
      >
        <thead>
          <tr style={{ background: "#eee" }}>
            <th style={{ border: "1px solid #ccc" }}>שם טופס</th>
            <th style={{ border: "1px solid #ccc" }}>קוד</th>
            <th style={{ border: "1px solid #ccc" }}>תאריך</th>
            <th style={{ border: "1px solid #ccc" }}>הדפסה</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const sch = getFormSchema(row.formCode);
            const title = sch?.title || row.formCode;
            return (
              <tr key={row.id}>
                <td style={{ border: "1px solid #ccc" }}>{title}</td>
                <td style={{ border: "1px solid #ccc" }}>{row.formCode}</td>
                <td style={{ border: "1px solid #ccc" }}>
                  {row.submittedAt != null ? String(row.submittedAt) : ""}
                </td>
                <td style={{ border: "1px solid #ccc" }}>
                  <button type="button" onClick={() => openPrint(row.id)}>
                    פתח HTML להדפסה
                  </button>{" "}
                  <button type="button" onClick={() => downloadPdf(row.id)}>
                    הורד PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
