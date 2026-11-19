# Event Ledger

Aplikasi untuk merencanakan dan mencatat keuangan sebuah acara: berapa yang dianggarkan, dan berapa yang benar-benar keluar, dipecah per bagian acara.

## Language

**Pengguna**:
Orang yang mendaftar ke aplikasi. Setiap Pengguna memiliki data sendiri yang tidak dibagikan ke Pengguna lain.

**Event**:
Sebuah acara utuh yang direncanakan lalu dijalankan sekali, misalnya "Outing Bali 2026" atau "City Tour Bandung". Dimiliki oleh tepat satu Pengguna.
_Avoid_: Proyek, Trip, Acara (sendirian tanpa pembeda)

**Status Event**:
Posisi sebuah Event dalam siklus hidupnya: `Draft` (masih direncanakan) → `Berjalan` (sedang berlangsung, realisasi dicatat) → `Selesai` (sudah berakhir).

**Kegiatan**:
Satu bagian di dalam sebuah Event yang berperan ganda: satu baris urutan acara (itinerary) sekaligus satu keranjang tempat Pengeluaran dikelompokkan dan dibandingkan dengan anggarannya. Mencatat nama, urutan, tanggal/jam, lokasi, dan catatan.
_Avoid_: Aktivitas, Sesi, Agenda, Sub-event

**Item Anggaran**:
Satu baris rencana biaya di dalam sebuah Kegiatan, misalnya "Sewa bus: 5.000.000". Satu Item Anggaran dapat memiliki beberapa Pengeluaran (misalnya DP lalu pelunasan) yang dijumlahkan menjadi realisasinya.
_Avoid_: Budget line, Rencana Biaya, Pagu

**Pengeluaran**:
Satu arus uang keluar yang nyata dan sudah terjadi, milik tepat satu Kegiatan. Mencatat jumlah, keterangan, tanggal, Kategori, metode pembayaran, dan Pembayar.
_Avoid_: Biaya, Transaksi, Expense, Nota

**Pembayar**:
Peserta yang menalangi sebuah Pengeluaran terlebih dahulu. Dipakai untuk mengetahui siapa yang perlu diganti.
_Avoid_: Payer, Penanggung biaya, Sumber dana

**Peserta**:
Orang yang ikut serta dalam sebuah Event, dicatat sebagai nama saja tanpa akun aplikasi.
_Avoid_: Anggota, Member, Tamu

**Bagian**:
Porsi sebuah Pengeluaran yang ditanggung oleh seorang Peserta. Secara bawaan dibagi rata antar Peserta yang ikut, dan dapat diubah bila tidak rata.

**Talangan**:
Uang yang dikeluarkan lebih dulu oleh seorang Pembayar untuk Pengeluaran yang sebagian menjadi Bagian Peserta lain. Aplikasi menampilkan rekap Talangan (berapa tiap orang menalangi), tanpa menghitung utang bersih antar orang.

**Uang Terkumpul**:
Satu angka uang yang masuk untuk sebuah Event (misalnya iuran peserta), dibandingkan dengan total Pengeluaran untuk melihat surplus atau defisit. Tidak dilacak per Peserta.
_Avoid_: Pendapatan, Pemasukan, Revenue

**Metode Pembayaran**:
Cara sebuah Pengeluaran dibayar, dipilih dari daftar tetap: Tunai, Transfer bank, QRIS/E-wallet, Kartu.
_Avoid_: Cara bayar, Jenis pembayaran

**Kategori**:
Pengelompokan sebuah Pengeluaran (misalnya Transport, Konsumsi, Akomodasi, Tiket). Daftar Kategori disediakan aplikasi dan dapat ditambah sendiri oleh Pengguna.

**Anggaran**:
Jumlah uang yang direncanakan. Anggaran disusun sebagai Item Anggaran di dalam Kegiatan; anggaran sebuah Kegiatan dan anggaran sebuah Event adalah jumlah dari Item Anggaran di bawahnya, bukan angka yang diisi terpisah.
_Avoid_: Budget, Rencana Biaya, Pagu
