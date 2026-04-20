/**
 * דף אדמין להדבקה באפליקציית האדמין הקיימת (פורט 4105)
 *
 * הגדר:
 *   VITE_API_URL=http://localhost:3028
 * או התאם את BASE למסלול ה-API שלך.
 *
 * הוסף route (למשל /forms/submissions) שמציג את הקומפוננטה.
 */
import { useEffect, useState } from "react";

/** כתובת שרת ללא /api בסוף — הנתיבים המלאים כוללים /api/admin/forms/... */
const BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3028";

const listUrl = () => `${BASE}/api/admin/forms/submissions`;
const printUrl = (id) => `${BASE}/api/admin/forms/submissions/${id}/print`;

export default function FormSubmissionsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const headers = () => {
    const h = { Accept: "application/json" };
    const t =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("adminToken");
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  };

  const load = () => {
    setErr("");
    fetch(listUrl(), { headers: headers() })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => setItems(d.items || d.submissions || []))
      .catch((e) => setErr(e.message || "שגיאה"));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }} dir="rtl">
      <h1>הגשות טפסים</h1>
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
            <th style={{ border: "1px solid #ccc" }}>קוד</th>
            <th style={{ border: "1px solid #ccc" }}>תאריך</th>
            <th style={{ border: "1px solid #ccc" }}>הדפסה</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td style={{ border: "1px solid #ccc" }}>{row.formCode}</td>
              <td style={{ border: "1px solid #ccc" }}>{row.submittedAt}</td>
              <td style={{ border: "1px solid #ccc" }}>
                <a href={printUrl(row.id)} target="_blank" rel="noreferrer">
                  HTML (דורש אותו דומיין / קוקי; מומלץ fetch כמו ב-admin-forms)
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
