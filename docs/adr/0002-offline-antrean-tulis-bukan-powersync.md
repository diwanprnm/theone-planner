# Offline memakai antrean tulis sederhana, bukan PowerSync

Pengeluaran sering dicatat di lokasi acara yang sinyalnya buruk, sehingga aplikasi harus tetap bisa mencatat saat offline. Pilihan yang dipertimbangkan adalah PowerSync (sinkronisasi sungguhan dengan penanganan konflik), antrean tulis buatan sendiri, atau offline untuk baca saja.

Keputusan: **offline ditangani dengan cache baca di IndexedDB dan antrean tulis (outbox) yang dikirim berurutan ke NestJS saat koneksi kembali.** PowerSync tidak dipakai.

Alasan: data setiap Pengguna bersifat privat dan tidak dibagikan, sehingga tidak ada konflik antar-orang yang perlu diselesaikan otomatis. Yang tersisa hanyalah kasus jarang "Pengguna yang sama di dua perangkat", dan itu tidak sepadan dengan biaya merawat satu sistem sinkronisasi penuh beserta hostingnya.

Konsekuensi yang diterima: penanganan konflik dan penggabungan perubahan tidak otomatis. Bila kelak muncul kebutuhan kolaborasi antar-Pengguna pada satu Event, keputusan ini harus ditinjau ulang — PowerSync dapat ditambahkan tanpa mengubah model data.
