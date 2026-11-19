# Backend NestJS dengan Supabase sebagai Postgres + Auth + Storage

Aplikasi ini butuh backend sendiri (NestJS) sekaligus autentikasi, penyimpanan foto struk, dan pagar privasi data per Pengguna. Supabase menyediakan ketiga hal itu sebagai layanan jadi, tetapi aplikasi tetap memilih menulis backend NestJS yang berbicara ke Supabase alih-alih memakai Supabase langsung dari klien.

Keputusan: **NestJS memegang logika dan API; Supabase dipakai sebagai Postgres, penyedia Auth (Google + email/password), dan Storage.** NestJS memverifikasi token yang diterbitkan Supabase Auth, tetapi tidak menerbitkan token sendiri.

Alasan memilih jalan ini ketimbang dua alternatif yang dipertimbangkan:

- **Supabase langsung dari klien** (tanpa NestJS) paling sedikit kerja, tetapi mengunci logika di dalam aturan RLS dan Edge Functions, dan menyulitkan penambahan operasi server-side seperti ekspor laporan di kemudian hari.
- **Supabase self-host di VPS** menghindari ketergantungan layanan, tetapi memindahkan beban merawat ~10 kontainer, backup, dan pemutakhiran versi ke pundak pengembang — pekerjaan yang tidak berhubungan dengan produk.

Konsekuensi yang diterima: backend NestJS dan database Supabase berada di dua tempat berbeda, sehingga ada latensi jaringan antara keduanya dan dua hal yang harus dijaga saat pemutakhiran.
