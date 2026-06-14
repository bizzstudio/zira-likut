# שלב build – בונים את אפליקציית ה-Vite לקבצים סטטיים
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# כתובת ה-API שתוטמע ב-bundle. /api => עובר דרך ה-proxy של nginx אל ה-backend
ARG VITE_MAIN_SERVER_URL=/api
ENV VITE_MAIN_SERVER_URL=$VITE_MAIN_SERVER_URL
RUN npm run build

# שלב הרצה – nginx שמגיש את הקבצים הסטטיים ומפנה /api ל-backend
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
