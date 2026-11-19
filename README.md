# TheOnePlanner

Aplikasi pencatat keuangan acara — PWA mobile-first berbahasa Indonesia.

Logo: [`docs/brand/logo-source.jpeg`](docs/brand/logo-source.jpeg). Warna merek (plum `#4E154A`,
magenta `#EA1CD9`, koral `#FD674E`) hidup di `web/src/styles/tokens.css`.

Monorepo sederhana dengan dua bagian:

| Bagian | Teknologi | Lokasi |
|---|---|---|
| API | NestJS 11 + Prisma 6 | `api/` |
| Web | Vite 6 + React 18 (PWA) | `web/` |

Supabase dipakai sebagai Postgres, Auth, dan Storage
(lihat [`docs/adr/0001`](docs/adr/0001-nestjs-dengan-supabase-postgres-auth.md)).
Aplikasi bisa dipakai offline lewat cache baca + antrean tulis di perangkat
(lihat [`docs/adr/0002`](docs/adr/0002-offline-antrean-tulis-bukan-powersync.md)).

## Menjalankan

### 1. API

```bash
cd api
npm install
cp .env.example .env          # lalu isi DATABASE_URL dan kunci Supabase
npm run prisma:generate
npm run prisma:migrate        # buat tabel di database
npm run db:seed               # isi Kategori bawaan
npm run start:dev
```

- API: http://localhost:3000/api
- Dokumentasi Swagger: http://localhost:3000/api/docs
- Health check: http://localhost:3000/api/health

> **Storage struk** — di dashboard Supabase, buat bucket bernama `receipts`
> (private, bukan public). Nama bucket bisa diubah lewat
> `SUPABASE_RECEIPTS_BUCKET`. Tanpa bucket ini, unggah foto struk akan gagal;
> fitur lain tetap berjalan.

### 2. Web

```bash
cd web
npm install
cp .env.example .env          # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev
```

- Web: http://localhost:5173
- Permintaan `/api` diteruskan ke API di port 3000 oleh proxy Vite.

> **Jangan pernah** menaruh Supabase **service role key** di `web/.env`.
> Hanya **anon key** yang boleh masuk ke bundel frontend.

## Autentikasi

Backend **tidak menerbitkan token sendiri**. Klien masuk lewat Supabase Auth
(Google atau email/password), lalu mengirim access token-nya:

```
Authorization: Bearer <access_token>
```

`AuthGuard` memverifikasi token ke Supabase dan mencatat Pengguna ke tabel `users`
saat pertama kali terlihat. Semua route kecuali `/api/health` butuh header ini.

## Struktur

```
api/                           API NestJS (paket npm sendiri)
web/                           Web PWA (paket npm sendiri)
docs/                          ADR + catatan desain
CONTEXT.md                     glosarium istilah domain (acuan penamaan)
```

```
api/src/                       API NestJS
├── main.ts                    bootstrap, CORS, Swagger, filter galat
├── app.module.ts
├── config/                    validasi variabel lingkungan
├── prisma/                    PrismaService (global)
├── supabase/                  verifikasi token + Storage struk (global)
├── common/
│   ├── guards/                AuthGuard
│   ├── decorators/            @Authenticated, @CurrentUser, @Public
│   └── filters/               bentuk galat seragam
├── events/                    Acara          (modul acuan — tiru polanya)
├── activities/                Kegiatan
├── budget-items/              Item Anggaran
├── expenses/                  Pengeluaran (+ bagi rata otomatis)
├── participants/              Peserta
├── shares/                    Bagian         (editor pembagian)
├── categories/                Kategori
├── reports/                   Laporan + rekap Talangan
├── receipts/                  unggah & lihat foto struk (Supabase Storage)
├── account/                   hapus akun sendiri
└── health/                    health check

web/src/                       Web PWA
├── main.tsx                   akar React + QueryClient + Auth + Router
├── App.tsx                    tabel rute + gerbang login
├── auth/                      AuthProvider (Supabase)
├── styles/                    token desain Stitch + CSS komponen
├── lib/
│   ├── api.ts                 fetch + Bearer token Supabase
│   ├── format.ts              format Rp / tanggal (wajib persis)
│   ├── db.ts                  Dexie: cache baca + antrean tulis
│   ├── outbox.ts              pengirim antrean (FIFO, berhenti di gagal pertama)
│   └── types.ts               tipe respons API
├── hooks/                     useApi, useOnline, useSync, useTheme
├── components/                AppBar, BottomNav, ProgressBar, dst.
└── pages/                     satu berkas per layar
```

## Aturan domain

Istilah mengikuti [`CONTEXT.md`](CONTEXT.md) persis — jangan pakai sinonim:

| Kode | Istilah |
|---|---|
| `Event` | Acara |
| `Activity` | Kegiatan |
| `BudgetItem` | Item Anggaran |
| `Expense` | Pengeluaran |
| `Participant` | Peserta |
| `ExpenseShare` | Bagian |
| `payerId` | Pembayar |
| `fundsRaised` | Uang Terkumpul |
| `Category` | Kategori |

Hal yang **sengaja tidak ada**:

- perhitungan utang bersih antar orang — `reports/talangan` hanya menampilkan sisi menalangi
- pelacakan iuran per Peserta — Uang Terkumpul selalu satu angka per Acara
- multi mata uang — hanya Rupiah
- kolaborasi antar Pengguna pada satu Acara

Anggaran dan realisasi **selalu dihitung** dari Item Anggaran dan Pengeluaran di
bawahnya, tidak pernah disimpan sebagai angka terpisah.

## Offline

Di lokasi acara sinyal sering buruk, jadi aplikasi tetap bisa dipakai:

1. **Cache baca** — daftar Acara, Kegiatan, Pengeluaran, dan Kategori disimpan
   di IndexedDB (Dexie) dan dipakai saat offline.
2. **Antrean tulis** — Pengeluaran yang dicatat saat offline masuk antrean dan
   dikirim **berurutan** begitu koneksi kembali. Antrean berhenti pada kegagalan
   pertama supaya urutan perubahan di server sama dengan urutan pencatatan.
3. **Antrean sinkron** bisa dilihat di Pengaturan, lengkap dengan tombol
   "Sinkron sekarang".

Yang **tidak** bisa dilakukan saat offline: membuat Acara baru (butuh id dari
server) dan mengunggah foto struk (berkas tidak disimpan di perangkat).

## Perintah

Dari akar repo ada pintasan yang meneruskan ke sub-proyek:

```bash
npm run install:all     # npm install di api/ dan web/
npm run dev:api         # = cd api && npm run start:dev
npm run dev:web         # = cd web && npm run dev
```

| Perintah | Kegunaan |
|---|---|
| `cd api && npm run start:dev` | Jalankan API dengan watch |
| `cd api && npm run build` | Kompilasi API ke `api/dist/` |
| `cd api && npm test` | Unit test API |
| `cd api && npm run prisma:migrate` | Migrasi baru saat mengubah skema |
| `cd api && npm run prisma:studio` | Telusuri data |
| `cd api && npm run db:seed` | Isi ulang Kategori bawaan |
| `cd web && npm run dev` | Jalankan web |
| `cd web && npm run build` | Build web (typecheck + bundle) |
| `cd web && npm run typecheck` | Typecheck web saja |
