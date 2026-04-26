// meshek_Likut_system/src/App.jsx
import { createContext, useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import PrivateRoute from "./components/PrivateRoute";
import Items from "./components/Items";
import Item from "./components/Item";
import Header from "./components/Header";
import FormT01 from "./components/forms/FormT01";
import FormT03 from "./components/forms/FormT03";
import FormT02 from "./components/forms/FormT02";
import { clearLoginScope, isSupplierSession } from "./utils/sessionScope";

export const languageContext = createContext()
function App() {
  const [orders, setOrders] = useState();
  const [updateOrders, setUpdateOrders] = useState(false);
  const [language, setLanguage] = useState('hebrew');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  const nav = useNavigate();

  const go = async () => {
    try {
      let token = localStorage.getItem("token");
      if (!token) return nav('/login');

      // בדיקה אם יש query parameter של getAll=true ב-URL
      const urlParams = new URLSearchParams(window.location.search);
      const getAll = urlParams.get('getAll') === 'true';
      
      // בניית URL: הספק מקבל רק supplierId; המלקט רק melaketId — לא לאחד (השרת מסנן לפי JWT; הפרמטרים אופציונליים)
      const base = import.meta.env.VITE_MAIN_SERVER_URL;
      const params = new URLSearchParams();
      if (getAll) params.set("getAll", "true");
      else if (isSupplierSession()) {
        const sid = localStorage.getItem("supplierId");
        if (sid) params.set("supplierId", sid);
      } else {
        const mid = localStorage.getItem("melaketId");
        if (mid) params.set("melaketId", mid);
      }
      const qs = params.toString();
      const apiUrl = `${base}/app/orders${qs ? `?${qs}` : ""}`;

      const res = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const allOrders = res?.data?.orders ?? [];
      const first = allOrders[0];
      console.log("[Likut] raw /app/orders (לפני כל סינון בפרונט)", {
        count: allOrders.length,
        responseKeys: res?.data != null ? Object.keys(res.data) : [],
        sample: first
          ? {
              invoice: first.invoice,
              statusName: first.status?.name,
              cartLines: Array.isArray(first.cart) ? first.cart.length : 0,
            }
          : null,
      });

      const bypassClientFilters =
        import.meta.env.VITE_APP_ORDERS_RAW === "1" ||
        urlParams.get("rawOrders") === "1";
      if (bypassClientFilters) {
        console.warn(
          "[Likut] מצב אבחון: מציגים את מערך ההזמנות מהשרת כמו שהוא (ללא סינון סטטוס/ספק בפרונט). הסירי ?rawOrders=1 או VITE_APP_ORDERS_RAW כשמסיימים."
        );
        setOrders(allOrders);
        return;
      }

      // הבקאנד מחזיר Processing + Likut. מלקט חייב לראות גם Processing (בריכה לפני ליקוט) — לא רק Likut.
      const forLikut = allOrders.filter((o) => {
        const name = o?.status?.name;
        if (!name) return false;
        const lower = String(name).toLowerCase();
        if (lower === "likut" || /^transfertolikut$/i.test(String(name))) return true;
        if (lower === "processing" || lower === "pending") return true;
        return false;
      });
      // ספק: cart כבר מסונן ב־backend — לא scopeOrderForMelaket בפרונט. מלקט: forLikut כמו שהשרת החזיר (עם scopeOrderForMelaket ב־Item אם נדרש).
      setOrders(forLikut);
    } catch (error) {
      // if error is 401 navigate to login
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        clearLoginScope();
        nav('/login');
      }
      console.error("Failed to fetch orders", error);
    }
  };

  useEffect(() => {
    go();
  }, [updateOrders]);

  useEffect(() => {
    const lang = localStorage.getItem("language") || 'hebrew';
    setLanguage(lang);
    document.documentElement.dir = lang === "hebrew" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    if (location.pathname == '/') {
      nav('/items');
    }
  }, [location.pathname]);

  return (
    <languageContext.Provider value={{ language, setLanguage }}>
      {(location.pathname.includes("items") ||
        location.pathname.startsWith("/forms")) && (
        <Header id={id} go={go} loading={loading} setLoading={setLoading} orders={orders} />
      )}
      <main className="main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/items"
            element={
              <PrivateRoute>
                <Items orders={orders} loading={loading} setLoading={setLoading} go={go} />
              </PrivateRoute>
            }
          />
          <Route
            path="/items/:id"
            element={
              <PrivateRoute>
                <Item
                  orders={orders}
                  setOrders={setOrders}
                  setUpdateOrders={setUpdateOrders}
                  setId={setId}
                  loading={loading}
                  setLoading={setLoading}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/forms/t01"
            element={
              <PrivateRoute>
                <FormT01 />
              </PrivateRoute>
            }
          />
          <Route
            path="/forms/t03"
            element={
              <PrivateRoute>
                <FormT03 />
              </PrivateRoute>
            }
          />
          <Route
            path="/forms/t02"
            element={
              <PrivateRoute>
                <FormT02 />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
    </languageContext.Provider>
  );
}

export default App;
