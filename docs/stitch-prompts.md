# Paket Prompt Google Stitch — Event Ledger

## Cara pakai

1. Buka `stitch.withgoogle.com`, buat proyek baru.
2. Tempel **Prompt 0 (Design System)** lebih dulu, lalu **kunci tema**-nya. Ini yang menjaga semua layar berikutnya seragam.
3. Tempel **Prompt 1–15** satu per satu. Setiap prompt menghasilkan satu layar.
4. Pilih **Mobile** sebagai target utama (aplikasi ini PWA yang dipakai di lokasi acara lewat HP). Desktop menyusul sebagai varian responsif.

**Catatan bahasa prompt**: badan prompt sengaja ditulis dalam **bahasa Inggris** karena Stitch memberi hasil terbaik dengan itu. Seluruh **teks antarmuka tetap Bahasa Indonesia** dan sudah dituliskan persis di dalam prompt, jadi Anda tidak perlu menerjemahkan apa pun.

Semua prompt diturunkan dari `CONTEXT.md` (glosarium) dan `docs/adr/`. Istilah yang dipakai konsisten: **Acara**, **Kegiatan**, **Item Anggaran**, **Pengeluaran**, **Pembayar**, **Peserta**, **Bagian**, **Talangan**, **Uang Terkumpul**, **Kategori**, **Metode Pembayaran**.

---

## Prompt 0 — Design System

```
Design a mobile-first PWA design system for a personal event expense tracker app called "Event Ledger". The interface language is Bahasa Indonesia.

Mood: clean, calm, trustworthy personal-finance app. Generous white space, 16px side padding, 16px rounded cards, very soft shadows, no heavy borders.

Colors (light theme):
- Primary: deep teal #0F766E, with #14B8A6 as hover/pressed
- Surface: #FFFFFF, page background #F8FAFC
- Text: #0F172A primary, #64748B secondary, #94A3B8 muted
- Border: #E2E8F0
- Semantic — success (under budget) #16A34A, warning (near limit) #F59E0B, danger (over budget) #DC2626, info (in progress) #2563EB
Dark theme: page #0F172A, surface #1E293B, text #F1F5F9, same primary/semantic hues.

Typography: Inter. Screen title 22px semibold, section header 16px semibold, body 15px regular, caption 13px. All currency and numbers use tabular numerals.

Number and date formats — use exactly these:
- Currency: "Rp 24.500.000" (dot as thousands separator, no decimals)
- Compact currency in list rows: "Rp 18,2 jt"
- Date: "12 Okt 2026"
- Date range: "12–14 Okt 2026"
- Time: "08:00"

Core components to define:
- Top app bar: back chevron left, title center-left, one overflow or text action right
- Bottom navigation, 3 items: Beranda, Laporan, Pengaturan
- Floating action button, teal, plus icon
- Filled primary button (full width, 48px tall, 12px radius) and outlined secondary button
- Text field with label above, 48px tall, 12px radius; amount field with "Rp" prefix and tabular numerals
- Status chip: Draft = gray, Berjalan = blue, Selesai = green; pill shape, 12px
- Budget progress bar: 8px tall, rounded, track #E2E8F0, fill turns green under 80%, amber 80–100%, red over 100%
- List row: leading icon or avatar, title 15px, subtitle 13px muted, trailing amount tabular right-aligned
- Empty state: simple line illustration, one-line title, one-line hint, one button
- Offline banner: full-width amber strip with cloud-off icon
- Sync indicator: small pill, green "Tersinkron" or amber "3 menunggu"

Accessibility: 44px minimum touch targets, AA contrast, never rely on color alone — always pair semantic color with an icon or label.
```

---

## Prompt 1 — Masuk (Login)

```
Mobile screen "Masuk" for Event Ledger, Bahasa Indonesia. Auth is via Google first, email/password as fallback.

Layout, centered column with generous top spacing:
- Logo mark: rounded square, teal, simple ledger or receipt glyph
- App name "Event Ledger", 24px semibold
- Tagline "Catat keuangan acaramu, rapi dan jelas", 15px muted
- Primary button with Google logo: "Masuk dengan Google"
- Divider with centered label "atau"
- Field "Email", field "Kata sandi" with an eye show/hide icon
- Text link right-aligned "Lupa kata sandi?"
- Filled primary button "Masuk"
- Below: "Belum punya akun? " muted + "Daftar" teal link
- Footer caption centered: "Data kamu privat dan tidak dibagikan ke siapa pun."

Show keyboard-safe spacing and a loading state variant where the primary button shows a spinner.
```

## Prompt 2 — Daftar (Register)

```
Mobile screen "Daftar" for Event Ledger, Bahasa Indonesia. Same visual language as the Login screen.

Layout:
- Back chevron top-left
- Title "Buat akun", subtitle "Satu akun untuk semua acaramu"
- Field "Nama", field "Email", field "Kata sandi" with helper text "Minimal 8 karakter", field "Ulangi kata sandi"
- Checkbox row: "Saya setuju data saya disimpan untuk menjalankan aplikasi ini."
- Filled primary button "Buat akun"
- Below: "Sudah punya akun? " muted + "Masuk" teal link
- Show an inline error variant: field "Email" outlined red with message "Email sudah terdaftar"
```

## Prompt 3 — Beranda

```
Mobile screen "Beranda" for Event Ledger, Bahasa Indonesia. This is the home screen: a list of the user's events with a cross-event summary on top.

Structure top to bottom:
- Top app bar: title "Beranda" left, circular avatar button right
- Summary card (teal tinted, full width): caption "Semua acara", then two stacked values — "Anggaran" with "Rp 24.500.000" and "Realisasi" with "Rp 18.200.000" — a horizontal progress bar at 74%, and caption "Sisa Rp 6.300.000"
- Section header "Acara kamu" with a search icon on the right
- List of event cards. Each card: event name 16px semibold, status chip on the same row, subtitle "12–14 Okt 2026 · 18 peserta" muted, then a thin progress bar and trailing compact amount "Rp 18,2 jt / Rp 24,5 jt"
  - Card 1: "Outing Bali 2026", chip "Berjalan"
  - Card 2: "City Tour Bandung", chip "Draft"
  - Card 3: "Rapat Divisi Q3", chip "Selesai"
- Floating action button bottom right, teal, plus icon
- Bottom navigation: Beranda (active teal), Laporan, Pengaturan

Also show a second frame of the same screen as an empty state: line illustration, title "Belum ada acara", hint "Buat acara pertamamu untuk mulai mencatat", button "Buat acara".
```

## Prompt 4 — Buat / Edit Acara

```
Mobile form screen "Buat Acara" for Event Ledger, Bahasa Indonesia.

Layout:
- Top app bar: back chevron left, title "Buat Acara", text button "Simpan" right in teal
- Field "Nama acara", placeholder "Contoh: Outing Bali 2026"
- Two fields side by side: "Tanggal mulai" and "Tanggal selesai", both date pickers
- Amount field "Uang terkumpul (opsional)" with "Rp" prefix, helper text "Total iuran yang sudah masuk dari peserta. Boleh dikosongkan."
- Section "Status" with a segmented control: "Draft", "Berjalan", "Selesai" — "Draft" selected
- Sticky bottom filled primary button "Simpan acara"

Show a validation variant: "Nama acara" outlined red with message "Nama acara wajib diisi".
```

## Prompt 5 — Detail Acara

```
Mobile screen "Detail Acara" for Event Ledger, Bahasa Indonesia. This is the most important screen; make it rich but calm.

- Top app bar: back chevron, title "Outing Bali 2026", overflow menu (three dots)
- Tab bar directly under the app bar: "Ringkasan", "Kegiatan", "Peserta", "Laporan" — "Ringkasan" active

Ringkasan tab content:
- Hero card: status chip "Berjalan", "12–14 Okt 2026" with calendar icon, "18 peserta" with people icon
- Three stat tiles in a row: "Anggaran" Rp 24.500.000, "Realisasi" Rp 18.200.000, "Sisa" Rp 6.300.000 shown in green
- Budget progress bar at 74% with caption "74% terpakai"
- Row: label "Uang terkumpul", trailing "Rp 20.000.000" with a small edit pencil
- Section header "Kegiatan" with a "Lihat semua" link. Show three list rows, each with a circular order badge "1"/"2"/"3", title "Hari 1: Kedatangan", subtitle "12 Okt, 08:00 · Bandara Ngurah Rai", trailing "Rp 6,2 jt / Rp 8 jt" and a thin progress bar underneath
- Section header "Peserta" with "Kelola" link. Horizontal row of 6 circular avatar chips with names below, then a dashed "+ Tambah" chip
- Section header "Rekap talangan". Two list rows: "Andi" subtitle "Menalangi" trailing "Rp 2.100.000"; "Budi" subtitle "Menalangi" trailing "Rp 1.450.000". Caption below: "Aplikasi tidak menghitung utang bersih antar orang."

- Floating action button plus, expanded to show three actions: "Tambah Kegiatan", "Catat Pengeluaran", "Tambah Peserta"
- Bottom navigation with Beranda active
```

## Prompt 6 — Kelola Peserta

```
Mobile screen "Peserta" for Event Ledger, Bahasa Indonesia. Peserta are just names, they do not need accounts.

Layout:
- Top app bar: back chevron, title "Peserta", text button "Simpan"
- Description muted: "Tambahkan nama orang yang ikut acara. Mereka tidak perlu punya akun."
- Add row: text field "Nama peserta" + filled teal button "Tambah"
- List of peserta, each row: circular avatar with initial, name, drag handle on left, trash icon on right
  - "Andi", "Budi", "Citra", "Dewi", "Eko", "Fajar"
- Caption under list: "6 peserta"
- Sticky bottom filled button "Simpan peserta"

Show a variant where one row is being edited inline with a text cursor.
```

## Prompt 7 — Detail Kegiatan

```
Mobile screen "Detail Kegiatan" for Event Ledger, Bahasa Indonesia. A Kegiatan is both one itinerary line and one budget basket.

- Top app bar: back chevron, title "Hari 1: Kedatangan", overflow menu
- Info card: row with clock icon "12 Okt 2026, 08:00"; row with pin icon "Bandara Ngurah Rai"; note text "Jemput peserta, check-in hotel." Edit pencil in the card corner
- Two stat tiles: "Anggaran" Rp 8.000.000 and "Realisasi" Rp 6.200.000, with a green delta chip "Sisa Rp 1.800.000"
- Section header "Item Anggaran" with a small "+" action. Two rows:
  - "Sewa bus", subtitle "2 pengeluaran · Rp 4.500.000", trailing "Rp 5.000.000", thin progress bar at 90% in amber, chevron
  - "Makan malam", subtitle "1 pengeluaran · Rp 1.700.000", trailing "Rp 3.000.000", thin progress bar at 57% in green, chevron
- Section header "Pengeluaran" with a "+" action. Two rows:
  - "DP Sewa bus", subtitle "1 Okt · Transfer bank · Andi", trailing "Rp 3.000.000"
  - "Pelunasan sewa bus", subtitle "12 Okt · Tunai · Budi", trailing "Rp 1.500.000"
- Floating action button plus
```

## Prompt 8 — Buat / Edit Kegiatan

```
Mobile form screen "Buat Kegiatan" for Event Ledger, Bahasa Indonesia.

Layout:
- Top app bar: back chevron, title "Buat Kegiatan", text button "Simpan"
- Field "Nama kegiatan", placeholder "Contoh: Hari 1: Kedatangan"
- Two fields side by side: "Tanggal" date picker and "Jam" time picker
- Field "Lokasi" with a pin icon, placeholder "Contoh: Bandara Ngurah Rai"
- Field "Catatan" multiline, placeholder "Opsional"
- Hint row with a drag-handle icon: "Urutan kegiatan bisa diatur dari daftar kegiatan."
- Sticky bottom filled button "Simpan kegiatan"
```

## Prompt 9 — Item Anggaran

```
Mobile form screen "Item Anggaran" for Event Ledger, Bahasa Indonesia. An Item Anggaran is one planned cost line inside a Kegiatan.

Layout:
- Top app bar: back chevron, title "Item Anggaran", destructive text button "Hapus" right in red
- Field "Nama item", placeholder "Contoh: Sewa bus"
- Amount field "Jumlah anggaran" with "Rp" prefix, large tabular numerals
- Field "Kategori" as a dropdown, value "Transport"
- Helper card (soft gray): "Kamu bisa mencatat beberapa pengeluaran untuk item ini — misalnya DP dulu, lalu pelunasan."
- Sticky bottom filled button "Simpan item"
```

## Prompt 10 — Catat Pengeluaran

```
Mobile form screen "Catat Pengeluaran" for Event Ledger, Bahasa Indonesia. This screen is used at the venue, possibly offline, so it must be fast to fill.

- Top app bar: back chevron, title "Catat Pengeluaran". Directly under it, an amber offline strip: cloud-off icon + "Offline — pengeluaran akan dikirim saat online"
- Large amount input at the very top, no label, "Rp" prefix, 32px tabular numerals, value "Rp 1.500.000", with a thin teal underline
- Field "Keterangan", placeholder "Contoh: Pelunasan sewa bus"
- Field "Tanggal" date picker, value "12 Okt 2026"
- Field "Kategori" shown as selectable chips: Transport (selected), Konsumsi, Akomodasi, Tiket, Lain-lain, then a "+ Baru" chip
- Field "Item anggaran" dropdown, value "Sewa bus", helper "Menghubungkan pengeluaran ini ke rencana biayanya."
- Field "Metode pembayaran" as a segmented control: Tunai, Transfer bank, QRIS/E-wallet, Kartu — "Transfer bank" selected
- Field "Pembayar" dropdown, value "Andi", with "Saya" as the first option
- Section "Lampiran": dashed rounded box with camera icon, "Tambah foto struk", caption "Opsional"
- Section "Bagi biaya": row showing "Dibagi rata ke 18 peserta", trailing "Rp 83.333 / orang", and a teal text button "Ubah"
- Sticky bottom filled primary button "Simpan pengeluaran"
```

## Prompt 11 — Bagi Biaya (editor pembagian)

```
Mobile screen "Bagi Biaya" for Event Ledger, Bahasa Indonesia. The user adjusts each Peserta's share of one Pengeluaran.

- Top app bar: back chevron, title "Bagi Biaya", text button "Simpan"
- Header card: caption "Total pengeluaran", big value "Rp 1.500.000", and a toggle switch "Bagi rata" currently ON
- List of peserta rows, each: checkbox on the left, avatar initial + name, and a right-aligned amount field showing "Rp 83.333"
  - "Andi" checked Rp 83.333
  - "Budi" checked Rp 83.333
  - "Citra" checked Rp 150.000 with a small amber tag "Disesuaikan"
  - "Dewi" checked Rp 83.333
  - "Eko" unchecked, row dimmed, amount shown as "—"
  - "Fajar" checked Rp 83.333
- Sticky footer bar: left label "Sisa belum terbagi" and right value "Rp 0" with a small green check icon. Show a second variant where it reads "Rp 50.000" in red with a warning icon and the primary button disabled
- Filled primary button "Simpan pembagian"
```

## Prompt 12 — Laporan

```
Mobile screen "Laporan" for Event Ledger, Bahasa Indonesia. Reports for one event.

- Top app bar: back chevron, title "Laporan", share icon on the right shown disabled with a small tooltip "Segera hadir"
- Segmented control: "Ringkasan", "Per Kategori", "Talangan" — "Ringkasan" active

Ringkasan tab:
- Big card: "Anggaran" Rp 24.500.000 above "Realisasi" Rp 18.200.000, with a progress bar at 74% and caption "Sisa Rp 6.300.000"
- Surplus card, green tinted: label "Uang terkumpul Rp 20.000.000", then big "Surplus Rp 1.800.000" with an up-arrow icon
- Section header "Anggaran vs Realisasi per Kegiatan". Rows, each: kegiatan name, a thin dual bar (gray track = anggaran, teal fill = realisasi), trailing "Rp 6,2 jt / Rp 8 jt", and a delta chip
  - "Hari 1: Kedatangan" chip green "+Rp 1,8 jt"
  - "Hari 2: Snorkeling" chip green "+Rp 700 rb"
  - "Hari 3: Oleh-oleh" chip red "-Rp 500 rb"

Per Kategori tab:
- Horizontal bar chart of spending by Kategori: Transport Rp 4.500.000, Konsumsi Rp 3.200.000, Akomodasi Rp 6.000.000, Tiket Rp 2.500.000, Lain-lain Rp 2.000.000

Talangan tab:
- Caption "Berapa tiap orang menalangi lebih dulu."
- List rows: "Andi — Rp 2.100.000", "Budi — Rp 1.450.000", "Citra — Rp 900.000"
- Footer note muted: "Aplikasi tidak menghitung utang bersih antar orang. Penggantian dilakukan manual."
```

## Prompt 13 — Kelola Kategori

```
Mobile screen "Kategori" for Event Ledger, Bahasa Indonesia.

Layout:
- Top app bar: back chevron, title "Kategori", text button "Simpan"
- Description muted: "Kategori bawaan bisa langsung dipakai, atau tambah sendiri."
- Section "Bawaan": chips Transport, Konsumsi, Akomodasi, Tiket, Lain-lain, shown as read-only with a small lock hint
- Section "Kategori kamu": list rows "Souvenir" and "Dokumentasi", each with a trash icon
- Add row: text field "Tambah kategori" + filled teal button "Tambah"
- Sticky bottom filled button "Simpan"
```

## Prompt 14 — Pengaturan

```
Mobile screen "Pengaturan" for Event Ledger, Bahasa Indonesia.

- Top app bar: title "Pengaturan"
- Profile card: circular avatar, name "Asraf", email, and a small badge "Masuk dengan Google"
- Section "Umum": rows "Mata uang" → "Rupiah (Rp)" with a lock icon; "Bahasa" → "Bahasa Indonesia"; "Mode gelap" with a toggle
- Section "Sinkronisasi": row "Status sinkron" → green pill "Tersinkron". Show a second variant where it reads amber "3 menunggu" and the row is tappable
- Section "Akun": row "Keluar" with a logout icon; then a destructive row "Hapus akun" in red with a warning icon
- Bottom navigation with Pengaturan active

Also show a confirmation dialog frame: title "Hapus akun?", body "Semua acara, kegiatan, pengeluaran, dan foto akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.", buttons "Batal" outlined and "Hapus permanen" filled red.
```

## Prompt 15 — Offline & Sinkronisasi

```
Two mobile states for Event Ledger, Bahasa Indonesia.

State A — offline banner: a full-width amber strip pinned under the top app bar, cloud-off icon, text "Kamu sedang offline. Pengeluaran baru akan disimpan dan dikirim saat online." Show it applied on top of the "Catat Pengeluaran" screen.

State B — antrean sinkron: a bottom sheet titled "Antrean sinkron" with caption "3 pengeluaran menunggu dikirim", list rows each with the amount and short description:
- "Pelunasan sewa bus" Rp 1.500.000
- "Makan malam hari 1" Rp 850.000
- "Tiket masuk" Rp 400.000
Then a filled teal button "Sinkron sekarang". Show a success variant of the same sheet where the list is replaced by a green check, "Semua tersinkron", and a muted timestamp "Terakhir sinkron 12 Okt, 19:42".
```

---

## Catatan konsistensi

Saat menilai hasil Stitch, periksa lima hal ini — kalau meleset, regenerasi layarnya:

1. **Angka rata kanan dan bertabulasi** di semua daftar. Angka yang tidak sejajar membuat aplikasi keuangan terasa murah.
2. **Istilah persis** seperti glosarium: "Kegiatan" bukan "Aktivitas", "Talangan" bukan "Utang", "Uang terkumpul" bukan "Pendapatan".
3. **Warna status tidak berdiri sendiri** — selalu ada chip atau ikon yang menyertainya.
4. **Tidak ada fitur yang belum disepakati** muncul di desain: tidak ada ekspor, tidak ada grafik utang bersih, tidak ada multi-mata-uang, tidak ada kolaborasi.
5. **Uang terkumpul itu satu angka per Acara**, bukan daftar per peserta.

Kalau Stitch menghasilkan layar yang melanggar salah satu poin di atas, prompt-nya perlu ditajamkan — bukan hasilnya diterima apa adanya.
