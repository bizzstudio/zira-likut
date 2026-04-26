import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./style.css";
import loginImg from "/loginImg.svg"
import leaf from "/leaf.svg"
import { getWord } from "../Language";
import { persistLoginScope, unwrapLoginPayload } from "../../utils/sessionScope";
import { FaEye, FaEyeSlash } from "react-icons/fa";

/** טלפון כפי שהאדמין/המשתמש מקליד — לפורמט אחיד לשרת (למשל 972… → 05…) */
function normalizeLoginPhone(raw) {
    if (raw == null) return "";
    let s = String(raw).trim().replace(/[\s\-]/g, "");
    if (s.startsWith("+972")) s = "0" + s.slice(4);
    else if (s.startsWith("972") && s.length >= 11) s = "0" + s.slice(3);
    if (/^[1-9]\d{8}$/.test(s)) s = "0" + s;
    return s;
}

function formatLoginError(data) {
    if (data == null || data === "") return "Login failed, please try again.";
    if (typeof data === "string") return data;
    if (typeof data === "object") {
        if (typeof data.message === "string") return data.message;
        if (typeof data.error === "string") return data.error;
        if (Array.isArray(data.message)) return data.message.join(", ");
    }
    return "Login failed, please try again.";
}

function Login() {
    const [phone, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setError("");
        try {
            const phoneNorm = normalizeLoginPhone(phone);
            const pwd = password.trim();
            const base = (import.meta.env.VITE_MAIN_SERVER_URL || "").replace(/\/$/, "");
            if (!base) {
                setError("חסרה הגדרת VITE_MAIN_SERVER_URL בקובץ .env");
                return;
            }
            const body = {
                phone: phoneNorm,
                password: pwd,
                username: phoneNorm,
                phoneNumber: phoneNorm,
            };
            const primaryUrl = `${base}/app/login`;
            const axiosOpts = { timeout: 25000 };
            setSubmitting(true);
            let res;
            try {
                res = await axios.post(primaryUrl, body, axiosOpts);
            } catch (firstErr) {
                const alt = import.meta.env.VITE_APP_LOGIN_FALLBACK_URL;
                if (alt && firstErr?.response?.status === 401) {
                    const altUrl = alt.startsWith("http") ? alt : `${base}/${alt.replace(/^\//, "")}`;
                    res = await axios.post(altUrl, { phone: phoneNorm, password: pwd }, axiosOpts);
                } else {
                    throw firstErr;
                }
            }
            const raw = unwrapLoginPayload(res.data);
            const token =
                raw?.token ?? raw?.accessToken ?? raw?.jwt ?? raw?.access_token;
            if (!token) {
                setError("התקבלה תשובה מהשרת בלי טוקן — בדקו את מבנה ה־JSON או את נתיב ההתחברות.");
                return;
            }
            localStorage.setItem("token", token);
            persistLoginScope(raw);
            navigate("/items");
        } catch (err) {
            if (err?.code === "ECONNABORTED" || err?.message?.includes?.("timeout")) {
                setError("השרת לא הגיב בזמן. ודאי שהבקאנד על פורט 3028 רץ. בפיתוח מומלץ VITE_MAIN_SERVER_URL=/api (אותו מקור כמו Vite — ללא CORS).");
            } else if (!err?.response) {
                setError("לא ניתן להתחבר לשרת (רשת / CORS). בפיתוח נסי VITE_MAIN_SERVER_URL=/api בקובץ .env");
            } else {
                setError(formatLoginError(err?.response?.data));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const phoneWord = getWord('phone');
    const passwordWord = getWord('password');
    const loginWord = getWord('login');

    return (
        <div className="loginPage">
            <div className="card">
                {/* <span className="title">ברוכים הבאים למערכת הליקוט של</span> */}
                <img src={leaf} alt="leaf" className="leaf" />
                <img src={loginImg} alt="login image" className="loginImg" />
                <form className="form" onSubmit={handleLogin}>
                    <div className="group">
                        <input
                            placeholder=""
                            type="phone"
                            id="phone"
                            required
                            value={phone}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <label htmlFor="phone">{phoneWord}</label>
                    </div>
                    <div className="group group--password">
                        <div className="passwordField">
                            <input
                                placeholder=""
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="passwordToggle"
                                aria-pressed={showPassword}
                                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                                onClick={() => setShowPassword((v) => !v)}
                            >
                                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                            </button>
                        </div>
                        <label htmlFor="password">{passwordWord}</label>
                    </div>
                    <button type="submit" disabled={submitting}>
                        {submitting ? "מתחבר…" : loginWord}
                    </button>
                </form>
                {error && <p className="loginError">{error}</p>}
            </div>
        </div>
    );
}

export default Login;