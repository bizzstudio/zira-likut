טפסים — חיבור לבקאנד אמיתי (3028) ואדמין (4105)
================================================

א. העתקת schema משותף לבקאנד
----------------------------
העתק את כל התיקייה:
  zira-likut/shared/
אל שורש פרויקט הבקאנד (ליד src), כך שייווצר:
  <BACKEND>/shared/forms/...
  <BACKEND>/shared/pdf/...


ב. מיזוג בבקאנד (פורט 3028)
--------------------------
1) העתק מ־integrations/backend-merge/:
   - FormSubmission.model.js  →  למודלים (mongoose)
   - formSubmissions.routes.mjs  →  ל־src/routes/
   - appLogin.routes.mjs  →  ל־src/routes/ (התחברות אפליקציית ליקוט)

1א) התחברות POST /api/app/login — מלקטים + ספקים (עמוד ספקים באדמין)
   לפני הרשמה: הסר או עטוף את ה־handler הקיים ל־/api/app/login כדי שלא יירשמו שני route-ים.
   דוגמה (אחרי app.use(express.json())):
     import { registerUnifiedAppLogin } from "./routes/appLogin.routes.mjs";
     registerUnifiedAppLogin(app, {
       MelaketModel: Melaket,           // שם המודל שלך למלקטים
       SupplierModel: Supplier,       // שם המודל של הספקים (אותו DB כמו האדמין)
       signAppToken: (doc, role) => jwt.sign(
         { melaketId: String(doc._id), supplierId: role === "supplier" ? String(doc._id) : undefined, role },
         process.env.JWT_SECRET,
         { expiresIn: "7d" }
       ),
     });
   הסיסמה: אם ב־DB יש bcrypt ($2…) — מתבצע compare; אחרת השוואה לטקסט גולמי (כמו סיסמה באדמין).
   שדות טלפון: ברירת מחדל phone — אם אצלך שם אחר, העבר melaketPhoneField / supplierPhoneField,
   או מערכים melaketPhoneFields / supplierPhoneFields (כמה שמות שדות לחיפוש $or).
   רשימת בדיקה מול האדמין: integrations/admin-merge/SUPPLIER_LOGIN_CHECKLIST.txt

   בפרונט ליקוט (אופציונלי): VITE_APP_LOGIN_FALLBACK_URL — נתיב נוסף אם /app/login מחזיר 401 (למשל נתיב התחברות ספקים קיים).

2) בפרויקט הבקאנד של הזירה: ודא שקיימים models/FormSubmission.js, routes/appFormRoutes.js,
   routes/adminFormRoutes.js — והעתקה של shared/ לשורש הבקאנד (עם shared/package.json type:module).

3) ב־formSubmissionController נבדק formCode מול shared/forms/registry (ייבוא דינמי).

4) בפרויקט הבקאנד של הזירה הנתיבים כבר קיימים תחת /api:
   POST /api/app/forms/submissions   (אימות isApp — כמו ליקוט)
   GET  /api/admin/forms/submissions  (isAdmin)
   GET  /api/admin/forms/submissions/:id/pdf
   GET  /api/admin/forms/submissions/:id/print   (HTML לפי shared/pdf)
   GET  /api/admin/forms/schemas
   GET  /api/admin/forms/schemas/:code


ג. אדמין על פורט 4105
---------------------
אפשרות א — אפליקציית admin-forms (במאגר):
  npm run forms:admin
  נפתח http://localhost:4105/  (proxy ל־3028)

אפשרות ב — האדמין הקיים שלך כבר על 4105:
  העתק את integrations/admin-merge/FormSubmissionsPage.jsx
  והוסף route + VITE_API_URL=http://localhost:3028

חשוב: בבקאנד יש לאפשר CORS מ־http://localhost:4105 אם האדמין לא עובר דרך proxy.


ד. ליקוט (Vite)
---------------
בפיתוח (npm run dev): מומלץ לעקוף CORS ולמנוע בקשות login תלויות (pending):
  VITE_MAIN_SERVER_URL=/api
  (ב־vite.config.js יש proxy מ־/api ל־http://localhost:3028 — כמו admin-forms.)

בפרודקשן / בדיקה מול שרת מרוחק:
  VITE_MAIN_SERVER_URL=https://your-host.example/api


ה. העתקה אוטומטית לפרויקטים אחרים
-----------------------------------
  node scripts/copy-shared-forms.mjs --backend "C:\path\to\backend\shared"
