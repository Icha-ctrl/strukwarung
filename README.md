# Cetak Struk Warung — Sprint 1

Aplikasi web (PWA) untuk membuat struk warung berisi biaya admin.
Dibuat dengan HTML + CSS + JavaScript murni. Tanpa framework, tanpa npm.

---

## Isi folder

| Berkas | Fungsinya |
| --- | --- |
| `index.html` | Rangka halaman: form dan pratinjau struk |
| `style.css` | Semua tampilan |
| `struk.js` | **Inti aplikasi.** Menyusun isi struk jadi baris 32 karakter |
| `app.js` | Menghubungkan form, pengaturan, dan tombol |
| `manifest.json` | Membuatnya bisa di-install sebagai aplikasi |
| `sw.js` | Service worker → aplikasi jalan tanpa internet |
| `icon-192.png` `icon-512.png` | Ikon di homescreen |

---

## Cara menjalankan

1. Buka **VS Code** → `File` → `Open Folder` → pilih folder `struk-warung`
2. Pasang extension **Live Server** (Ctrl+Shift+X, cari "Live Server")
3. Klik kanan `index.html` → **Open with Live Server**
4. Browser terbuka otomatis di alamat seperti `http://127.0.0.1:5500`

> Jangan buka file-nya dengan klik dua kali (`file://...`).
> Service worker hanya jalan lewat `http://`, jadi harus pakai Live Server.

---

## Cara membukanya di HP (satu jaringan WiFi)

1. Di laptop, buka Command Prompt → ketik `ipconfig` → catat **IPv4 Address**
   (contoh: `192.168.1.7`)
2. Di HP, buka Chrome → ketik `192.168.1.7:5500`
3. Pastikan HP dan laptop tersambung ke WiFi yang sama

---

## Yang sudah bisa

- Isi data transaksi, pratinjau struk berubah langsung
- Nomor struk otomatis, kembali ke `001` setiap ganti hari
- Tanggal & jam terisi otomatis, tetap bisa diedit
- Pengaturan identitas warung, tersimpan di HP
- Simpan struk sebagai PNG
- Bagikan ke WhatsApp lewat menu bagikan bawaan HP (gratis)

## Yang belum

- Cetak ke printer thermal → **Sprint 3**
- Riwayat & rekap harian → **Sprint 2**
- OCR dari foto struk bank → **Sprint 4**

---

## Kalau mau mengubah tata letak struk

Buka `struk.js`, cari fungsi `buildLines()`. Semua isi struk disusun di situ,
urut dari atas ke bawah. Menambah baris baru cukup satu baris kode, contoh:

```js
tambah(barisLabelNilai("Catatan", data.catatan));
```

Karena pratinjau layar, gambar PNG, dan nanti printer thermal semuanya membaca
fungsi yang sama, satu perubahan langsung berlaku di ketiganya.

---

## Setelah mengubah kode

Naikkan angka versi di baris paling atas `sw.js`:

```js
const VERSI = "v2";
```

Kalau lupa, HP akan tetap menampilkan versi lama yang tersimpan di cache.

## Sprint 2 — Riwayat & Rekap (baru)

File baru: `riwayat.js`

- Transaksi tercatat otomatis saat struk **dibagikan** atau **disimpan PNG**, bukan saat diketik.
- Tab **Riwayat**: rekap (jumlah transaksi, total nominal, total biaya admin), rincian per jenis, penyaring Hari ini / 7 hari / Bulan ini / Semua, dan pencarian.
- Tombol **Buka** menampilkan ulang struk lama, **Hapus** menghapus catatan (pakai konfirmasi).
- Tombol **Export CSV** mengunduh data sesuai penyaring yang aktif — file ini juga jadi bahan latihan SQL.

Data disimpan di `localStorage` dengan kunci `strukwarung.trx`.

> Setiap kali kode berubah, naikkan `VERSI` di `sw.js` (sekarang `v2`), lalu hard refresh (Ctrl+Shift+R).

## Sprint 2b — Auto-reset & Kirim WhatsApp

- Semua cara mengeluarkan struk (Kirim WhatsApp / Bagikan gambar / Simpan PNG) sekarang lewat satu fungsi `selesaikanStruk()`:
  catat ke riwayat -> bersihkan form -> nomor struk berikutnya. Tidak perlu klik "Transaksi baru" lagi.
- Cetak ulang struk lama: tab **Riwayat** -> tombol **Buka**.
- Tombol **Kirim WhatsApp** memakai tautan `wa.me` (gratis, bukan WhatsApp Business API).
  Struk dikirim sebagai teks monospace di antara tiga backtick, jadi kolomnya tetap lurus.
  Nomor 08xx otomatis diubah jadi 628xx.
- Fungsi baru `strukKeTeks()` di `struk.js` — sumber barisnya sama dengan pratinjau dan PNG.

`sw.js` sekarang `v3`.

## Sprint 2c — Rapikan tombol aksi

Masalah: lima tombol sejajar (Cetak, Kirim WA, Bagikan, Simpan PNG, Transaksi baru) semuanya
terlihat sama penting, jadi kasir harus berpikir tiap kali. Perbaikan:

- **Satu aksi utama**: "Kirim ke WhatsApp" — biru, lebar penuh (`.btn.besar`).
- **Aksi cadangan**: "Bagikan gambar" + "Simpan PNG" — dua kolom, putih, di bawahnya.
- **"Transaksi baru" → "Kosongkan"**, jadi tautan teks kecil di kanan judul kartu (`.card-head` + `.tautan`).
  Sejak auto-reset ada, tombol ini jarang dipakai, jadi tidak layak jadi tombol besar.
- **Tombol "Cetak" dihapus sementara.** Tombol yang tidak melakukan apa-apa lebih membingungkan
  daripada tidak ada tombol. Diganti keterangan kecil. Di Sprint 3 dia kembali sebagai aksi utama.

`sw.js` sekarang `v4`.

## Sprint 2d — Perataan, margin, dan kirim WA sebagai gambar

Tiga perbaikan dari hasil uji di HP:

1. **Judul warung tidak pas di tengah.**
   Penyebab: perataan tengah dilakukan dengan menambah spasi di depan teks. Cara itu hanya akurat
   kalau semua huruf sama lebar, padahal baris `big` (huruf dobel) dan pratinjau HTML tidak begitu.
   Perbaikan: baris sekarang cukup DITANDAI `center: true`, lalu tiap renderer meratakan sendiri —
   HTML pakai `text-align`, canvas pakai `measureText` (presisi piksel), printer nanti pakai `ESC a 1`.
   `bungkusTengah()` diganti `bungkusBaris()` yang mengembalikan baris polos tanpa spasi perata.

2. **Teks mepet tepi kertas.**
   Penyebab: `renderKeCanvas` menggambar mulai dari `x = 0`; `MARGIN` hanya dipakai untuk atas-bawah.
   Perbaikan: `PAD_X = 28` kiri-kanan, lebar gambar jadi `384 + 56 = 440 px`. Area teks tetap 384 px
   supaya lebar 32 karakter untuk printer thermal tidak berubah. Pratinjau HTML diberi `padding: 0 14px`.

3. **Kirim WA sekarang berupa gambar.**
   Tombol utama memakai Web Share API dengan file PNG — WhatsApp muncul di menu bagikan HP.
   Di laptop menu itu tidak ada, jadi otomatis mundur ke versi teks `wa.me`.
   Tombol "Bagikan gambar" dihapus karena fungsinya sudah jadi tombol utama; digantikan
   "Kirim versi teks" sebagai cadangan.

`sw.js` sekarang `v5`.
