# Web Event Ledger — Vite build lalu disajikan nginx, sekaligus proxy /api.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite menanamkan VITE_* saat build — nilainya jadi bagian bundel, bukan runtime.
ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
