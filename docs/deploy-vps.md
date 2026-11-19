# Deploy ke VPS

Topologi: nginx di host (sudah ada domain + SSL) → `127.0.0.1:3006` → container
`web` (nginx) → `/api` diteruskan ke container `api:3000`. Hanya port 443 yang
terbuka ke internet.

## 1. Prasyarat di VPS

```bash
docker --version && docker compose version   # Docker 24+ dengan plugin compose
git --version
```

## 2. Ambil kode

```bash
git clone https://github.com/diwanprnm/theone-planner.git
cd theone-planner
```

## 3. Isi kredensial

**`api/.env`** — salin dari `api/.env.example`, isi dengan nilai produksi:

```bash
cp api/.env.example api/.env
nano api/.env
```

- `DATABASE_URL` — Supabase → Settings → Database → Connection string.
  Pakai **Session pooler, port 5432**. Port 6543 membuat `prisma migrate` menggantung.
- `SUPABASE_SERVICE_ROLE_KEY` — hanya di sini, jangan pernah ke `web/`.
- `CORS_ORIGINS=https://domainmu.com`

**`.env` di root** — dipakai sebagai build arg web:

```bash
cp .env.example .env
nano .env
```

Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (anon key, bukan service role).

> Nilai `VITE_*` **dibakar ke bundel saat build**, bukan dibaca saat runtime.
> Kalau kredensial berubah, jalankan `docker compose build web` lagi.

## 4. Build dan jalankan

```bash
docker compose build
docker compose run --rm migrate     # sekali per versi: terapkan migrasi Prisma
docker compose up -d
```

Cek dari dalam VPS:

```bash
curl -s localhost:3006/api/health
# {"status":"ok","timestamp":"..."}
```

## 5. nginx di host

`/etc/nginx/sites-available/theoneplanner`:

```nginx
server {
    listen 443 ssl http2;
    server_name domainmu.com;

    ssl_certificate     /etc/letsencrypt/live/domainmu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domainmu.com/privkey.pem;

    # Foto struk maksimal 5 MB + overhead multipart.
    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    server_name domainmu.com;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/theoneplanner /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Supabase — wajib, kalau tidak Google login gagal

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://domainmu.com`
- **Redirect URLs**: tambahkan `https://domainmu.com/**`

Tanpa ini Supabase memantulkan balik ke `localhost` setelah OAuth.

## 7. Update versi berikutnya

```bash
git pull
docker compose build
docker compose run --rm migrate
docker compose up -d
```

## Perintah harian

| Kebutuhan | Perintah |
|---|---|
| Lihat log | `docker compose logs -f api` |
| Restart | `docker compose restart api` |
| Matikan | `docker compose down` |
| Migrasi manual | `docker compose run --rm migrate` |
| Masuk shell api | `docker compose exec api sh` |

## Catatan

- `migrate` pakai stage `build` karena image runtime tidak membawa CLI Prisma.
- Migrasi **tidak** jalan otomatis saat `up`. Jalankan manual tiap deploy.
- `api/.env` berisi `NODE_ENV=development`; compose menimpanya jadi `production`.
- Jangan buka port 3000 di firewall — api hanya dijangkau lewat jaringan compose.
