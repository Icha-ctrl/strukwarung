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

/* Font struk.
   Harus monospace (semua huruf sama lebar), kalau tidak kolom angka di
   kanan jadi bergerigi. Tapi tidak harus Courier New yang kaku itu.
   Daftar di bawah memakai font monospace modern bawaan tiap sistem:
   iPhone/Mac pakai SF Mono, Android pakai Roboto Mono, Windows pakai
   Cascadia/Consolas. Bentuknya jauh lebih halus dan bulat.
   Tidak ada font yang diunduh, jadi aplikasi tetap jalan offline. */
const FONT_STRUK =
  'ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';

/* =========================================================================
   SKEMA LAYANAN
   -------------------------------------------------------------------------
   Tiap jenis layanan punya kolom yang berbeda. Semuanya diatur di sini,
   dan SATU sumber ini dipakai untuk dua hal sekaligus:
     1. Membentuk kolom di form (app.js membacanya, tidak perlu ganti HTML)
     2. Membentuk isi struk (buildLines di bawah)
   Mau menambah layanan baru? Cukup tambah satu entri di sini.

   Arti tiap bagian:
     penyedia     : dropdown teratas — bank, e-wallet, atau provider
     labelNominal : nama baris uang di struk ("Nominal" / "Tagihan")
     kolom        : daftar kolom isian
         k     = nama kunci data (dipakai juga oleh Riwayat)
         label = tulisan di form dan di struk
         ph    = contoh isian
         num   = keyboard angka di HP
         blok  = dicetak besar di tengah struk, bukan sebaris label-nilai
                 (dipakai untuk kode token listrik)
   ========================================================================= */

const SKEMA = {
  Transfer: {
    penyedia: {
      label: "Bank tujuan",
      opsi: ["BRI", "BCA", "BNI", "Mandiri", "BSI", "BTN", "CIMB Niaga", "Permata", "Danamon", "Bank Nagari", "SeaBank", "Jago"],
    },
    labelNominal: "Nominal",
    kolom: [
      { k: "rekening", label: "No. Rekening", ph: "3021 **** 8847", num: true },
      { k: "tujuan", label: "Nama Penerima", ph: "SITI RAHMAWATI" },
    ],
  },

  "Top Up E-Wallet": {
    penyedia: {
      label: "E-Wallet",
      opsi: ["DANA", "OVO", "GoPay", "ShopeePay", "LinkAja", "Sakuku", "Astrapay"],
    },
    labelNominal: "Nominal",
    kolom: [
      { k: "rekening", label: "No. HP / ID", ph: "0812xxxxxxx", num: true },
      { k: "tujuan", label: "Nama Pemilik", ph: "SITI RAHMAWATI" },
    ],
  },

  "Token Listrik": {
    penyedia: { label: "Penyedia", opsi: ["PLN Prabayar"] },
    labelNominal: "Nominal",
    kolom: [
      { k: "rekening", label: "No. Meter", ph: "86077590163", num: true },
      { k: "tujuan", label: "Nama Pelanggan", ph: "RAHAYU" },
      { k: "idpel", label: "ID Pelanggan", ph: "opsional", num: true },
      { k: "tarif", label: "Tarif / Daya", ph: "R1B / 2200 VA" },
      { k: "kwh", label: "Jml kWh", ph: "13" },
      { k: "token", label: "KODE TOKEN", ph: "4329103778640663 9703", num: true, blok: true },
    ],
  },

  "PLN Pascabayar": {
    penyedia: { label: "Penyedia", opsi: ["PLN Pascabayar"] },
    labelNominal: "Tagihan",
    kolom: [
      { k: "rekening", label: "No. Pelanggan", ph: "152001372966", num: true },
      { k: "tujuan", label: "Nama Pelanggan", ph: "IRWAN HASANI" },
      { k: "periode", label: "Periode", ph: "JUL26" },
      { k: "tarif", label: "Tarif / Daya", ph: "R1 / 1300 VA" },
    ],
  },

  "Bayar Air (PAM)": {
    penyedia: { label: "Penyedia", opsi: ["PAM Batam", "PDAM", "Air Minum Daerah"] },
    labelNominal: "Tagihan",
    kolom: [
      { k: "rekening", label: "No. Pelanggan", ph: "160510", num: true },
      { k: "tujuan", label: "Nama Pelanggan", ph: "DEDE KOSWARA" },
      { k: "periode", label: "Periode", ph: "JUL26" },
    ],
  },

  "Pulsa & Data": {
    penyedia: {
      label: "Provider",
      opsi: ["Telkomsel", "Indosat", "XL", "Tri", "Smartfren", "Axis", "by.U"],
    },
    labelNominal: "Nominal",
    kolom: [
      { k: "rekening", label: "No. HP", ph: "0812xxxxxxx", num: true },
      { k: "paket", label: "Paket", ph: "Pulsa 50rb / Data 10GB" },
    ],
  },

  BPJS: {
    penyedia: { label: "Penyedia", opsi: ["BPJS Kesehatan", "BPJS Ketenagakerjaan"] },
    labelNominal: "Tagihan",
    kolom: [
      { k: "rekening", label: "No. Kartu / VA", ph: "8888801234567", num: true },
      { k: "tujuan", label: "Nama Peserta", ph: "DEDE KOSWARA" },
      { k: "periode", label: "Periode", ph: "1 bulan / JUL26" },
      { k: "kwh", label: "Jml Peserta", ph: "3" },
    ],
  },

  Lainnya: {
    penyedia: { label: "Penyedia", opsi: [] },
    labelNominal: "Nominal",
    kolom: [
      { k: "rekening", label: "No. Pelanggan", ph: "kode / nomor", num: true },
      { k: "tujuan", label: "Nama Pelanggan", ph: "nama" },
      { k: "periode", label: "Keterangan", ph: "opsional" },
    ],
  },
};

function daftarJenis() {
  return Object.keys(SKEMA);
}

// Kalau jenisnya tidak dikenal (misal data lama), pakai skema "Lainnya"
function skemaDari(jenis) {
  return SKEMA[jenis] || SKEMA.Lainnya;
}

/* ---------- Alat bantu teks ---------- */

// 500000 -> "Rp 500.000"
function rupiah(angka) {
  const n = Number(angka) || 0;
  return "Rp " + n.toLocaleString("id-ID");
}

// "20000" -> "20.000" (untuk ditampilkan di kotak isian, tanpa "Rp")
function ribuan(angka) {
  const n = Number(angka);
  if (!angka && angka !== 0) return "";
  if (!isFinite(n)) return "";
  return n.toLocaleString("id-ID");
}

// "20.000" -> 20000  (buang semua yang bukan angka)
function angkaBersih(teks) {
  const bersih = String(teks == null ? "" : teks).replace(/[^0-9]/g, "");
  return bersih ? Number(bersih) : 0;
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

// "43291037786406639703" -> "4329 1037 7864 0663 9703"
// Kode token 20 digit susah dibaca kalau menempel. Dikelompokkan per 4.
function kelompok4(teks) {
  const bersih = String(teks || "").replace(/\s+/g, "");
  if (!/^[0-9]+$/.test(bersih)) return String(teks || "").trim();
  return bersih.replace(/(.{4})/g, "$1 ").trim();
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
  const skema = skemaDari(data.jenis);

  /* --- Kepala struk --- */
  baris.push(T(potong(cfg.namaWarung || "WARUNG", 16), { big: true, bold: true, center: true }));
  if (cfg.alamat) tambah(bungkusBaris(cfg.alamat), { center: true });
  if (cfg.telepon) baris.push(T(cfg.telepon, { center: true }));

  baris.push(T("-".repeat(LEBAR)));

  /* --- Jenis layanan --- */
  baris.push(T((data.jenis || "").toUpperCase(), { bold: true, center: true }));
  baris.push(T("-".repeat(LEBAR)));

  /* --- Info struk --- */
  tambah(barisLabelNilai("No. Struk", data.noStruk));
  tambah(barisLabelNilai("Waktu", data.waktu));
  if (cfg.kasir) tambah(barisLabelNilai("Kasir", cfg.kasir));

  /* --- Detail layanan ---
     Isinya mengikuti SKEMA di atas, jadi struk listrik dan struk transfer
     otomatis berbeda. Dikumpulkan dulu ke wadah sendiri: kalau semuanya
     kosong, garis pemisahnya tidak ikut dicetak. */
  const detail = [];
  if (data.bank) detail.push(...barisLabelNilai(skema.penyedia.label, data.bank));

  const blok = []; // kolom yang dicetak besar di tengah (kode token)
  for (const kol of skema.kolom) {
    const isi = String(data[kol.k] == null ? "" : data[kol.k]).trim();
    if (!isi) continue;
    if (kol.blok) {
      blok.push(kol);
      continue;
    }
    detail.push(...barisLabelNilai(kol.label, isi));
  }

  if (data.referensi) detail.push(...barisLabelNilai("Ref", data.referensi));

  if (detail.length) {
    baris.push(T("-".repeat(LEBAR)));
    tambah(detail);
  }

  /* --- Kode token, dicetak besar biar mudah dibaca pelanggan --- */
  for (const kol of blok) {
    baris.push(T("-".repeat(LEBAR)));
    baris.push(T(kol.label, { center: true }));
    // huruf dobel cuma muat 16 karakter, jadi dipecah per kelompok angka
    tambah(bungkusBaris(kelompok4(data[kol.k]), 16), {
      big: true,
      bold: true,
      center: true,
    });
  }

  baris.push(T("-".repeat(LEBAR)));

  /* --- Uang --- */
  const nominal = Number(data.nominal) || 0;
  const admin = Number(data.admin) || 0;
  const total = nominal + admin;

  tambah(barisLabelNilai(skema.labelNominal || "Nominal", rupiah(nominal)));
  tambah(barisLabelNilai("Biaya layanan", rupiah(admin)));

  baris.push(T("=".repeat(LEBAR)));
  tambah(barisLabelNilai("TOTAL BAYAR", rupiah(total)), { bold: true });
  baris.push(T("=".repeat(LEBAR)));

  /* --- Kaki struk ---
     Sengaja pendek. Paragraf panjang bikin struk terlihat penuh dan
     memakan kertas, padahal yang dicari pelanggan cuma dua hal:
     transaksinya berhasil, dan ucapan terima kasih. */
  baris.push(T(""));
  baris.push(T("** TRANSAKSI BERHASIL **", { bold: true, center: true }));
  baris.push(T("TERIMA KASIH", { center: true }));
  if (cfg.footer) tambah(bungkusBaris(cfg.footer), { center: true });
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
   Printer thermal 58mm = 384 titik per baris, dan satu baris muat 32 huruf.
   Dulu lebar huruf dihitung manual (Courier New tepat 0,6 x ukuran font).
   Sekarang fontnya font sistem yang lebih halus, dan lebar hurufnya
   berbeda-beda antar HP. Jadi lebar huruf DIUKUR dulu pakai measureText,
   lalu ukuran fontnya disetel supaya 32 huruf pas 384 titik.
   Hasilnya: font lebih enak dilihat, tapi kolom angka tetap lurus.
---------------------------------------------- */

function renderKeCanvas(baris, skala) {
  skala = skala || 2; // 2x biar tajam di layar HP

  const LEBAR_TEKS = 384; // area teks: 32 huruf
  const PAD_X = 28; // ruang kosong kiri-kanan biar tidak mepet
  const PAD_Y = 28;
  const TINGGI_BARIS = 27;
  const TINGGI_BARIS_BESAR = 48;

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

  // Cari ukuran font yang bikin 32 huruf pas 384 titik.
  // Diukur sekali, dipakai untuk semua baris biasa.
  function ukuranPas(target, hurufPerBaris, tebal) {
    let ukuran = 20;
    for (let i = 0; i < 6; i++) {
      ctx.font = (tebal ? "bold " : "") + ukuran + "px " + FONT_STRUK;
      const lebarSatu = ctx.measureText("0").width;
      if (!lebarSatu) break;
      ukuran = (ukuran * target) / (lebarSatu * hurufPerBaris);
    }
    return ukuran;
  }

  const UKURAN_NORMAL = ukuranPas(LEBAR_TEKS, LEBAR, false);
  const UKURAN_BESAR = ukuranPas(LEBAR_TEKS, 16, true);

  let y = PAD_Y;
  for (const b of baris) {
    const ukuran = b.big ? UKURAN_BESAR : UKURAN_NORMAL;
    ctx.font = (b.bold ? "bold " : "") + ukuran.toFixed(2) + "px " + FONT_STRUK;

    // rata tengah diukur dari lebar teks sebenarnya, bukan dari jumlah spasi
    const x = b.center
      ? PAD_X + (LEBAR_TEKS - ctx.measureText(b.text).width) / 2
      : PAD_X;

    ctx.fillText(b.text, x, y);
    y += b.big ? TINGGI_BARIS_BESAR : TINGGI_BARIS;
  }

  return canvas;
}
