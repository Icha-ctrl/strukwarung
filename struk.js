/* =========================================================================
   struk.js — SATU SUMBER KEBENARAN untuk isi struk
   -------------------------------------------------------------------------
   Ide pentingnya: struk thermal itu sebenarnya cuma TEKS 32 karakter/baris.
   Jadi kita bikin satu fungsi (buildLines) yang menghasilkan daftar baris.
   Daftar baris itu nanti dipakai oleh 3 hal berbeda:
     1. Pratinjau di layar   (Sprint 1)
     2. Gambar PNG / share   (Sprint 1)
     3. Printer thermal      (Sprint 3)
   Kalau nanti mau ubah tata letak struk, cukup ubah DI FILE INI saja.
   ========================================================================= */

const LEBAR = 32; // jumlah karakter per baris untuk kertas 58mm

/* ---------- Alat bantu teks ---------- */

// 500000 -> "Rp 500.000"
function rupiah(angka) {
  const n = Number(angka) || 0;
  return "Rp " + n.toLocaleString("id-ID");
}

// Potong teks kalau kepanjangan, biar tidak merusak baris
function potong(teks, maks) {
  teks = String(teks == null ? "" : teks);
  return teks.length > maks ? teks.slice(0, maks - 1) + "\u2026" : teks;
}

// Rata tengah dengan spasi
function tengah(teks, lebar) {
  lebar = lebar || LEBAR;
  teks = potong(teks, lebar);
  const sisa = lebar - teks.length;
  const kiri = Math.floor(sisa / 2);
  return " ".repeat(kiri) + teks;
}

// Rata kanan dengan spasi
function kanan(teks, lebar) {
  lebar = lebar || LEBAR;
  teks = potong(teks, lebar);
  return " ".repeat(lebar - teks.length) + teks;
}

// Label di kiri, nilai di kanan, diisi spasi di tengahnya.
// Kalau tidak muat satu baris, nilainya dipindah ke baris berikutnya.
function barisLabelNilai(label, nilai) {
  label = String(label);
  nilai = String(nilai == null ? "" : nilai);

  if (label.length + 1 + nilai.length <= LEBAR) {
    const spasi = LEBAR - label.length - nilai.length;
    return [label + " ".repeat(spasi) + nilai];
  }
  // Tidak muat: label di baris sendiri, nilai rata kanan di bawahnya
  return [potong(label, LEBAR), kanan(potong(nilai, LEBAR))];
}

// Pecah kalimat panjang jadi beberapa baris.
// Hasilnya baris polos tanpa spasi perata; yang meratakan nanti
// masing-masing renderer lewat tanda center.
function bungkusBaris(teks, lebar) {
  lebar = lebar || LEBAR;
  const kata = String(teks || "").split(/\s+/).filter(Boolean);
  const hasil = [];
  let baris = "";
  for (const k of kata) {
    if ((baris + " " + k).trim().length <= lebar) {
      baris = (baris + " " + k).trim();
    } else {
      if (baris) hasil.push(baris);
      baris = k;
    }
  }
  if (baris) hasil.push(baris);
  return hasil;
}

/* ---------- Pembentuk baris struk ----------
   Setiap baris berbentuk objek:
     { text: "...", bold: true/false, big: true/false, center: true/false }
   big    = huruf dobel (cuma muat 16 karakter)
   center = rata tengah

   Catatan penting soal center:
   Dulu perataan tengah dilakukan dengan menambahkan spasi di depan teks.
   Cara itu hanya akurat kalau semua huruf sama lebar. Pada baris "big"
   dan pada pratinjau HTML lebarnya tidak persis sama, jadi judulnya
   kelihatan meleset dari tengah. Sekarang baris cuma DITANDAI center,
   lalu tiap renderer meratakan dengan caranya sendiri:
     - teks WA : ditambah spasi (grid karakter, memang pas)
     - HTML    : text-align center
     - Canvas  : diukur pakai measureText, presisi piksel
     - Printer : perintah ESC a 1 bawaan printer (Sprint 3)
------------------------------------------- */

function T(text, opsi) {
  return Object.assign(
    { text: text, bold: false, big: false, center: false },
    opsi || {}
  );
}

function buildLines(data, cfg) {
  const baris = [];
  const tambah = (arr, opsi) => arr.forEach((t) => baris.push(T(t, opsi)));

  /* --- Kepala struk --- */
  baris.push(T(potong(cfg.namaWarung || "WARUNG", 16), { big: true, bold: true, center: true }));
  if (cfg.alamat) tambah(bungkusBaris(cfg.alamat), { center: true });
  if (cfg.telepon) baris.push(T(cfg.telepon, { center: true }));

  baris.push(T("-".repeat(LEBAR)));

  /* --- Jenis transaksi --- */
  baris.push(T((data.jenis || "").toUpperCase(), { bold: true, center: true }));
  baris.push(T("-".repeat(LEBAR)));

  /* --- Info struk --- */
  tambah(barisLabelNilai("No. Struk", data.noStruk));
  tambah(barisLabelNilai("Waktu", data.waktu));
  if (cfg.kasir) tambah(barisLabelNilai("Kasir", cfg.kasir));

  /* --- Detail transaksi ---
     Dikumpulkan dulu ke wadah sendiri. Kalau semuanya kosong,
     garis pemisahnya tidak ikut dicetak (biar tidak ada garis dobel). */
  const detail = [];
  if (data.tujuan) detail.push(...barisLabelNilai("Tujuan", data.tujuan));
  if (data.rekening) detail.push(...barisLabelNilai("No. Rek/ID", data.rekening));
  if (data.bank) detail.push(...barisLabelNilai("Bank", data.bank));
  if (data.referensi) detail.push(...barisLabelNilai("Ref. Bank", data.referensi));

  if (detail.length) {
    baris.push(T("-".repeat(LEBAR)));
    tambah(detail);
  }

  baris.push(T("-".repeat(LEBAR)));

  /* --- Uang --- */
  const nominal = Number(data.nominal) || 0;
  const admin = Number(data.admin) || 0;
  const total = nominal + admin;

  tambah(barisLabelNilai("Nominal", rupiah(nominal)));
  tambah(barisLabelNilai("Biaya layanan", rupiah(admin)));

  baris.push(T("=".repeat(LEBAR)));
  tambah(barisLabelNilai("TOTAL BAYAR", rupiah(total)), { bold: true });
  baris.push(T("=".repeat(LEBAR)));

  /* --- Kaki struk --- */
  baris.push(T(""));
  baris.push(T("TERIMA KASIH", { bold: true, center: true }));
  tambah(
    bungkusBaris(
      cfg.footer ||
        "Struk diterbitkan oleh warung sebagai bukti pembayaran termasuk biaya layanan. Bukti transaksi bank tersimpan dan dapat diminta."
    ),
    { center: true }
  );
  baris.push(T(""));

  return baris;
}

/* ---------- Render ke teks biasa (untuk WhatsApp) ----------
   WhatsApp menampilkan teks di antara tiga backtick dengan huruf monospace,
   jadi perataan kolom struk tetap rapi walau dikirim sebagai pesan biasa.
   Ini GRATIS: cuma teks, bukan WhatsApp Business API.
----------------------------------------------------------- */

function strukKeTeks(baris) {
  const isi = baris
    .map(function (b) {
      // di teks semua huruf sama lebar, jadi rata tengah pakai spasi memang pas
      const t = b.center ? tengah(b.text, LEBAR) : b.text;
      return t.replace(/\s+$/, "");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return "```" + isi + "```";
}

/* ---------- Render ke layar (HTML) ---------- */

function renderKeHTML(baris, wadah) {
  wadah.innerHTML = "";
  for (const b of baris) {
    const div = document.createElement("div");
    div.className =
      "sline" +
      (b.bold ? " bold" : "") +
      (b.big ? " big" : "") +
      (b.center ? " center" : "");
    // pakai spasi non-breaking supaya perataan tidak hilang di HTML
    div.textContent = b.text.replace(/ /g, "\u00a0") || "\u00a0";
    wadah.appendChild(div);
  }
}

/* ---------- Render ke gambar (Canvas) ----------
   Lebar 384 piksel = standar printer thermal 58mm.
   Courier New punya lebar huruf tepat 0.6 x ukuran font,
   jadi font 20px -> 12px per huruf -> 32 huruf = 384px. Pas.
---------------------------------------------- */

function renderKeCanvas(baris, skala) {
  skala = skala || 2; // 2x biar tajam di layar HP

  const LEBAR_TEKS = 384; // area teks: 32 huruf x 12 px
  const PAD_X = 28; // ruang kosong kiri-kanan biar tidak mepet
  const PAD_Y = 28;
  const TINGGI_BARIS = 26;
  const TINGGI_BARIS_BESAR = 46;

  const LEBAR_PX = LEBAR_TEKS + PAD_X * 2;

  let tinggi = PAD_Y * 2;
  for (const b of baris) tinggi += b.big ? TINGGI_BARIS_BESAR : TINGGI_BARIS;

  const canvas = document.createElement("canvas");
  canvas.width = LEBAR_PX * skala;
  canvas.height = tinggi * skala;

  const ctx = canvas.getContext("2d");
  ctx.scale(skala, skala);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, LEBAR_PX, tinggi);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  let y = PAD_Y;
  for (const b of baris) {
    const ukuran = b.big ? 40 : 20;
    ctx.font = (b.bold ? "bold " : "") + ukuran + 'px "Courier New", Courier, monospace';

    // rata tengah diukur dari lebar teks sebenarnya, bukan dari jumlah spasi
    const x = b.center
      ? PAD_X + (LEBAR_TEKS - ctx.measureText(b.text).width) / 2
      : PAD_X;

    ctx.fillText(b.text, x, y);
    y += b.big ? TINGGI_BARIS_BESAR : TINGGI_BARIS;
  }

  return canvas;
}
