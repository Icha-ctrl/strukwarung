/* =========================================================================
   app.js — penghubung antara form, pengaturan, dan pratinjau struk
   -------------------------------------------------------------------------
   Isi file ini:
     1. Simpan/baca pengaturan warung di localStorage
     2. Nomor struk otomatis (reset tiap hari)
     3. Perbarui pratinjau setiap kali ada yang diketik
     4. Simpan PNG & Bagikan
     5. Daftarkan service worker (biar bisa jalan offline)
   ========================================================================= */

/* ---------- 1. Pengaturan ---------- */

const KUNCI_CFG = "strukwarung.cfg";
const KUNCI_NOMOR = "strukwarung.nomor";

const CFG_BAWAAN = {
  namaWarung: "DNA STORE BATAM",
  // Alamat ditulis lengkap. bungkusBaris() di struk.js otomatis memecahnya
  // per kata jadi beberapa baris rata tengah, jadi tidak perlu disingkat.
  alamat: "Perumahan Taman Cipta Indah 1 Blok D1-09",
  telepon: "0857-6142-9633",
  kasir: "DNA",
  kode: "DNA",
  adminDefault: 5000,
  footer:
    "Struk diterbitkan oleh toko sebagai bukti pembayaran termasuk biaya layanan. Bukti transaksi bank tersimpan dan dapat diminta.",
  jenisList:
    "Transfer, Top Up E-Wallet, Token Listrik, PLN Pascabayar, Bayar Air (PAM), Pulsa & Data, BPJS",
};

function bacaCfg() {
  try {
    const mentah = localStorage.getItem(KUNCI_CFG);
    return Object.assign({}, CFG_BAWAAN, mentah ? JSON.parse(mentah) : {});
  } catch (e) {
    return Object.assign({}, CFG_BAWAAN);
  }
}

function simpanCfg(cfg) {
  localStorage.setItem(KUNCI_CFG, JSON.stringify(cfg));
}

let CFG = bacaCfg();

/* ---------- 2. Nomor struk otomatis ---------- */

// Format: NJ-260812-001  (kode - tanggal - urutan hari itu)
function nomorStrukBaru() {
  const skr = new Date();
  const yy = String(skr.getFullYear()).slice(2);
  const mm = String(skr.getMonth() + 1).padStart(2, "0");
  const dd = String(skr.getDate()).padStart(2, "0");
  const tanggal = yy + mm + dd;

  let data = { tanggal: tanggal, urutan: 0 };
  try {
    const mentah = localStorage.getItem(KUNCI_NOMOR);
    if (mentah) data = JSON.parse(mentah);
  } catch (e) {}

  // Ganti hari -> mulai lagi dari 1
  if (data.tanggal !== tanggal) data = { tanggal: tanggal, urutan: 0 };

  const urutan = data.urutan + 1;
  return {
    teks: CFG.kode + "-" + tanggal + "-" + String(urutan).padStart(3, "0"),
    simpan: function () {
      localStorage.setItem(KUNCI_NOMOR, JSON.stringify({ tanggal: tanggal, urutan: urutan }));
    },
  };
}

let nomorAktif = null;

/* ---------- Alat bantu ---------- */

const $ = (id) => document.getElementById(id);

function waktuSekarang() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes())
  );
}

function pesan(el, teks, jenis) {
  el.textContent = teks;
  el.className = "note" + (jenis ? " " + jenis : "");
  if (teks) {
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.textContent = "";
      el.className = "note";
    }, 3500);
  }
}

/* ---------- 3. Pratinjau ---------- */

function ambilData() {
  return {
    jenis: $("jenis").value,
    bank: $("bank").value.trim(),
    tujuan: $("tujuan").value.trim(),
    rekening: $("rekening").value.trim(),
    nominal: $("nominal").value,
    admin: $("admin").value,
    referensi: $("referensi").value.trim(),
    waktu: $("waktu").value.trim(),
    noStruk: $("noStruk").value,
  };
}

function perbarui() {
  const data = ambilData();
  const baris = buildLines(data, CFG);
  renderKeHTML(baris, $("struk"));

  const total = (Number(data.nominal) || 0) + (Number(data.admin) || 0);
  $("totalStrip").textContent = rupiah(total);
}

/* ---------- 4. Simpan PNG & Bagikan ---------- */

function buatCanvas() {
  return renderKeCanvas(buildLines(ambilData(), CFG), 2);
}

function namaBerkas() {
  return "struk-" + ($("noStruk").value || "baru") + ".png";
}

function simpanPNG() {
  const canvas = buatCanvas();
  const nomorLama = $("noStruk").value;
  canvas.toBlob(function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = namaBerkas();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    selesaikanStruk("Gambar struk " + nomorLama + " tersimpan.");
  }, "image/png");
}

/* ---------- Kirim lewat WhatsApp (tanpa API, gratis) ----------
   Memakai tautan resmi wa.me. Yang terbuka adalah aplikasi WhatsApp milik
   kakak sendiri, dengan isi pesan sudah terisi otomatis. Tinggal tekan
   tombol kirim. Tidak ada pendaftaran, tidak ada biaya per pesan.
--------------------------------------------------------------- */

function rapikanNomorWa(mentah) {
  let n = String(mentah || "").replace(/[^0-9]/g, "");
  if (!n) return "";
  if (n.startsWith("62")) return n;
  if (n.startsWith("0")) return "62" + n.slice(1);
  if (n.startsWith("8")) return "62" + n;
  return n;
}

// Cek sekali: apakah HP ini bisa mengirim file lewat menu bagikan bawaan?
function bisaKirimGambar() {
  try {
    const contoh = new File([new Blob(["x"])], "x.png", { type: "image/png" });
    return !!(navigator.canShare && navigator.canShare({ files: [contoh] }));
  } catch (e) {
    return false;
  }
}

/* Tombol utama: kirim struk sebagai GAMBAR.
   Di HP, ini membuka menu bagikan dan WhatsApp ada di baris pertama.
   Di laptop, menu itu tidak ada, jadi otomatis mundur ke versi teks. */
function kirimWA() {
  if (bisaKirimGambar()) {
    bagikan();
  } else {
    pesan($("note"), "Laptop tidak bisa kirim gambar ke WhatsApp. Dikirim sebagai teks.", "warn");
    setTimeout(kirimWaTeks, 900);
  }
}

// Cadangan: struk versi teks lewat tautan wa.me
function kirimWaTeks() {
  const teks = strukKeTeks(buildLines(ambilData(), CFG));
  const nomor = rapikanNomorWa($("waPelanggan").value);
  const nomorStruk = $("noStruk").value;

  const tautan =
    "https://wa.me/" + nomor + "?text=" + encodeURIComponent(teks);
  window.open(tautan, "_blank");

  selesaikanStruk(
    nomor
      ? "Struk " + nomorStruk + " dibuka di WhatsApp. Tinggal tekan kirim."
      : "Struk " + nomorStruk + " dibuka di WhatsApp. Pilih kontak pelanggannya."
  );
}

function bagikan() {
  const canvas = buatCanvas();
  canvas.toBlob(async function (blob) {
    const file = new File([blob], namaBerkas(), { type: "image/png" });

    // Web Share API: memanggil menu "bagikan" bawaan HP. GRATIS, bukan WhatsApp API.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        // Hanya file, tanpa teks. Kalau teks ikut disertakan, sebagian versi
        // WhatsApp justru mengirim teksnya saja dan gambarnya hilang.
        await navigator.share({ files: [file], title: "Struk transaksi" });
        selesaikanStruk("Struk terkirim sebagai gambar.");
      } catch (e) {
        /* pengguna membatalkan, tidak apa-apa */
      }
    } else {
      pesan($("note"), "Kirim gambar hanya jalan di HP. Di laptop, pakai Simpan PNG.", "warn");
    }
  }, "image/png");
}

/* Nomor struk baru "dipakai" hanya kalau struknya benar-benar dikeluarkan.
   Di saat yang sama transaksinya dicatat ke Riwayat. Jadi yang masuk catatan
   hanya struk yang sungguh-sungguh diberikan ke pelanggan, bukan setiap
   ketikan di form. */
function kunciNomor() {
  tambahTrx(ambilData());
  if (nomorAktif) {
    nomorAktif.simpan();
    nomorAktif = null;
  }
  gambarRiwayat();
}

/* Satu pintu untuk semua cara mengeluarkan struk:
   catat ke riwayat -> bersihkan form -> siap melayani pelanggan berikutnya.
   Struk yang lama tidak hilang, tinggal dibuka lagi dari tab Riwayat. */
function selesaikanStruk(kabar) {
  kunciNomor();
  transaksiBaru();
  pesan($("note"), kabar + " Form sudah siap untuk transaksi berikutnya.", "ok");
}

/* Dipanggil dari layar Riwayat: tampilkan ulang struk lama di form */
function bukaTrx(t) {
  $("jenis").value = t.jenis || $("jenis").value;
  $("bank").value = t.bank || "";
  $("tujuan").value = t.tujuan || "";
  $("rekening").value = t.rekening || "";
  $("nominal").value = t.nominal || "";
  $("admin").value = t.admin || 0;
  $("referensi").value = t.referensi || "";
  $("waktu").value = t.waktu || "";
  $("noStruk").value = t.noStruk;
  $("waPelanggan").value = "";

  // struk lama: nomornya sudah terpakai, jangan ambil nomor baru
  nomorAktif = null;

  document.querySelector('.tab[data-tab="buat"]').click();
  perbarui();
  pesan($("note"), "Struk " + t.noStruk + " dibuka kembali. Bisa dibagikan atau dicetak ulang.", "ok");
}

function transaksiBaru() {
  ["bank", "tujuan", "rekening", "nominal", "referensi", "waPelanggan"].forEach((id) => ($(id).value = ""));
  $("admin").value = CFG.adminDefault;
  $("waktu").value = waktuSekarang();
  nomorAktif = nomorStrukBaru();
  $("noStruk").value = nomorAktif.teks;
  perbarui();
  $("tujuan").focus();
}

/* ---------- Pengaturan: isi & simpan form ---------- */

function isiFormCfg() {
  $("cfgNama").value = CFG.namaWarung;
  $("cfgAlamat").value = CFG.alamat;
  $("cfgTelepon").value = CFG.telepon;
  $("cfgKasir").value = CFG.kasir;
  $("cfgKode").value = CFG.kode;
  $("cfgAdmin").value = CFG.adminDefault;
  $("cfgFooter").value = CFG.footer;
  $("cfgJenis").value = CFG.jenisList;
}

function isiPilihanJenis() {
  const sel = $("jenis");
  const terpilih = sel.value;
  sel.innerHTML = "";
  CFG.jenisList.split(",").map((s) => s.trim()).filter(Boolean).forEach(function (j) {
    const opt = document.createElement("option");
    opt.textContent = j;
    sel.appendChild(opt);
  });
  if (terpilih) sel.value = terpilih;
}

function simpanFormCfg() {
  CFG = {
    namaWarung: $("cfgNama").value.trim() || "WARUNG",
    alamat: $("cfgAlamat").value.trim(),
    telepon: $("cfgTelepon").value.trim(),
    kasir: $("cfgKasir").value.trim(),
    kode: ($("cfgKode").value.trim() || "ST").toUpperCase(),
    adminDefault: Number($("cfgAdmin").value) || 0,
    footer: $("cfgFooter").value.trim(),
    jenisList: $("cfgJenis").value.trim() || CFG_BAWAAN.jenisList,
  };
  simpanCfg(CFG);
  isiPilihanJenis();
  $("brandName").textContent = CFG.namaWarung;
  perbarui();
  pesan($("noteCfg"), "Pengaturan tersimpan.", "ok");
}

/* ---------- Tab ---------- */

document.querySelectorAll(".tab").forEach(function (tombol) {
  tombol.addEventListener("click", function () {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tombol.classList.add("active");
    tombol.setAttribute("aria-selected", "true");
    $("tab-" + tombol.dataset.tab).classList.add("active");
    if (tombol.dataset.tab === "riwayat") gambarRiwayat();
    window.scrollTo(0, 0);
  });
});

/* ---------- Pasang semua listener ---------- */

["jenis", "bank", "tujuan", "rekening", "nominal", "admin", "referensi", "waktu"].forEach(function (id) {
  $(id).addEventListener("input", perbarui);
  $(id).addEventListener("change", perbarui);
});

$("btnPNG").addEventListener("click", simpanPNG);
$("btnWA").addEventListener("click", kirimWA);
$("btnTeks").addEventListener("click", kirimWaTeks);
$("btnReset").addEventListener("click", transaksiBaru);
$("btnSimpanCfg").addEventListener("click", simpanFormCfg);

/* Tombol "Cetak" sengaja belum ada. Tombol yang tidak melakukan apa-apa
   hanya bikin bingung. Nanti di Sprint 3 dia yang jadi aksi utama,
   menggeser "Kirim ke WhatsApp" ke baris aksi cadangan. */

/* ---------- Jalan pertama kali ---------- */

isiFormCfg();
isiPilihanJenis();
$("brandName").textContent = CFG.namaWarung;
transaksiBaru();
siapkanRiwayat();

/* ---------- 5. Service worker (offline) ---------- */

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      /* diabaikan saat pengembangan */
    });
  });
}
