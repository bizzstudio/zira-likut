טפסים — חיבור לבקאנד אמיתי (3028) ואדמין (4105)
================================================

א. העתקת schema משותף לבקאנד
----------------------------
העתק את כל התיקייה:
  mnm-likut/shared/
אל שורש פרויקט הבקאנד (ליד src), כך שייווצר:
  <BACKEND>/shared/forms/...
  <BACKEND>/shared/pdf/...


ב. מיזוג בבקאנד (פורט 3028)
--------------------------
1) העתק מ־integrations/backend-merge/:
   - FormSubmission.model.js  →  למודלים (mongoose)
   - formSubmissions.routes.mjs  →  ל־src/routes/

2) ב־mnm-backend: ודא שקיימים models/FormSubmission.js, routes/appFormRoutes.js,
   routes/adminFormRoutes.js — והעתקה של shared/ לשורש הבקאנד (עם shared/package.json type:module).

3) ב־formSubmissionController נבדק formCode מול shared/forms/registry (ייבוא דינמי).

4) בפרויקט mnm-backend הנתיבים כבר קיימים תחת /api:
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
ב־.env ודא שהכתובת כוללת את קידומת ה־API של הבקאנד (כמו בשאר הקריאות — login, orders):
  VITE_MAIN_SERVER_URL=http://localhost:3028/api


ה. העתקה אוטומטית לפרויקטים אחרים
-----------------------------------
  node scripts/copy-shared-forms.mjs --backend "C:\path\to\backend\shared"
