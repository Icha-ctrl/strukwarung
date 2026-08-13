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
  // Kaki struk sengaja dikosongkan. Struk cuma perlu "TRANSAKSI BERHASIL"
  // dan "TERIMA KASIH" (sudah otomatis di struk.js). Paragraf panjang bikin
  // struk terlihat penuh dan memakan kertas.
  footer: "",
};

// Kalimat panjang bawaan versi lama. Kalau masih tersimpan di HP, dibersihkan
// otomatis supaya struk baru ikut jadi ringkas tanpa harus disetel manual.
const FOOTER_LAMA = [
  "Struk diterbitkan oleh warung sebagai bukti pembayaran termasuk biaya layanan. Bukti transaksi bank tersimpan dan dapat diminta.",
  "Struk diterbitkan oleh toko sebagai bukti pembayaran termasuk biaya layanan. Bukti transaksi bank tersimpan dan dapat diminta.",
];

function bacaCfg() {
  try {
    const mentah = localStorage.getItem(KUNCI_CFG);
    const cfg = Object.assign({}, CFG_BAWAAN, mentah ? JSON.parse(mentah) : {});
    if (FOOTER_LAMA.indexOf(cfg.footer) >= 0) cfg.footer = "";
    return cfg;
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

/* ---------- Titik ribuan otomatis ----------
   Kakak sulit membedakan 20000 dan 2000 saat mengetik cepat. Jadi begitu
   diketik, angkanya langsung dirapikan jadi 20.000 dan 2.000.
   Yang disimpan tetap angka murni; titiknya cuma tampilan.
------------------------------------------- */

function pasangRibuan(el) {
  el.addEventListener("input", function () {
    const diUjung = el.selectionStart === el.value.length;
    const kosong = el.value.trim() === "";
    el.value = kosong ? "" : ribuan(angkaBersih(el.value));
    // kursor dikembalikan ke ujung, kalau tidak dia melompat saat titik masuk
    if (diUjung) el.setSelectionRange(el.value.length, el.value.length);
  });
}

/* ---------- Kolom yang berubah per jenis layanan ----------
   Bentuk kolomnya dibaca dari SKEMA di struk.js. Jadi struk listrik minta
   No. Meter dan Kode Token, sedangkan transfer minta No. Rekening.
   Tidak ada HTML yang perlu diubah kalau nanti menambah layanan baru.
--------------------------------------------------------- */

const PENYEDIA_LAIN = "… lainnya";

function gambarKolomJenis(nilaiAwal) {
  const wadah = $("kolomJenis");
  const isiLama = {};

  if (nilaiAwal) {
    Object.assign(isiLama, nilaiAwal);
  } else {
    // pindah jenis layanan: isian yang sudah diketik jangan sampai hilang
    wadah.querySelectorAll("input").forEach(function (el) {
      isiLama[el.dataset.k] = el.value;
    });
  }

  wadah.innerHTML = "";
  skemaDari($("jenis").value).kolom.forEach(function (kol) {
    const f = document.createElement("div");
    f.className = "f" + (kol.blok ? " full" : "");

    const lab = document.createElement("label");
    lab.setAttribute("for", "kol-" + kol.k);
    lab.textContent = kol.label;

    const inp = document.createElement("input");
    inp.id = "kol-" + kol.k;
    inp.dataset.k = kol.k;
    inp.placeholder = kol.ph || "";
    inp.autocomplete = "off";
    if (kol.num) inp.setAttribute("inputmode", "numeric");
    inp.value = isiLama[kol.k] == null ? "" : isiLama[kol.k];

    f.appendChild(lab);
    f.appendChild(inp);
    wadah.appendChild(f);
  });
}

function aturPenyediaLain() {
  const lain = $("bank").value === PENYEDIA_LAIN;
  $("bankLain").hidden = !lain;
  if (lain) $("bankLain").focus();
}

function isiPilihanBank(pilih) {
  const sel = $("bank");
  const skema = skemaDari($("jenis").value);
  const label = document.querySelector('label[for="bank"]');
  if (label) label.textContent = skema.penyedia.label;

  sel.innerHTML = "";
  skema.penyedia.opsi.forEach(function (nama) {
    const opt = document.createElement("option");
    opt.textContent = nama;
    sel.appendChild(opt);
  });
  const opt = document.createElement("option");
  opt.textContent = PENYEDIA_LAIN;
  sel.appendChild(opt);

  if (pilih && skema.penyedia.opsi.indexOf(pilih) >= 0) {
    sel.value = pilih;
    $("bankLain").value = "";
  } else if (pilih) {
    sel.value = PENYEDIA_LAIN;
    $("bankLain").value = pilih;
  }
  aturPenyediaLain();
}

function penyediaAktif() {
  return $("bank").value === PENYEDIA_LAIN
    ? $("bankLain").value.trim()
    : $("bank").value;
}

/* ---------- 3. Pratinjau ---------- */

function ambilData() {
  const jenis = $("jenis").value;
  const data = {
    jenis: jenis,
    bank: penyediaAktif(),
    nominal: angkaBersih($("nominal").value),
    admin: angkaBersih($("admin").value),
    referensi: $("referensi").value.trim(),
    waktu: $("waktu").value.trim(),
    noStruk: $("noStruk").value,
  };
  // kolom khas layanan ini (no. pelanggan, nama, periode, kode token, dst)
  skemaDari(jenis).kolom.forEach(function (kol) {
    const el = $("kol-" + kol.k);
    data[kol.k] = el ? el.value.trim() : "";
  });
  return data;
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
  if (t.jenis && SKEMA[t.jenis]) $("jenis").value = t.jenis;
  isiPilihanBank(t.bank || "");
  gambarKolomJenis(t); // isi kolom khas layanan dari catatan riwayat
  $("nominal").value = ribuan(t.nominal || "");
  $("admin").value = ribuan(t.admin || 0);
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
  ["nominal", "referensi", "waPelanggan", "bankLain"].forEach((id) => ($(id).value = ""));
  isiPilihanBank("");
  gambarKolomJenis({}); // kolom khas layanan dikosongkan
  $("admin").value = ribuan(CFG.adminDefault);
  $("waktu").value = waktuSekarang();
  nomorAktif = nomorStrukBaru();
  $("noStruk").value = nomorAktif.teks;
  perbarui();
  const pertama = $("kolomJenis").querySelector("input");
  if (pertama) pertama.focus();
}

/* ---------- Pengaturan: isi & simpan form ---------- */

function isiFormCfg() {
  $("cfgNama").value = CFG.namaWarung;
  $("cfgAlamat").value = CFG.alamat;
  $("cfgTelepon").value = CFG.telepon;
  $("cfgKasir").value = CFG.kasir;
  $("cfgKode").value = CFG.kode;
  $("cfgAdmin").value = ribuan(CFG.adminDefault);
  $("cfgFooter").value = CFG.footer;
}

// Daftar jenis layanan diambil dari SKEMA di struk.js, bukan diketik manual.
// Alasannya: tiap jenis punya kolom sendiri, jadi menambah nama lewat
// pengaturan saja tidak cukup — kolomnya juga harus didefinisikan.
function isiPilihanJenis() {
  const sel = $("jenis");
  const terpilih = sel.value;
  sel.innerHTML = "";
  daftarJenis().forEach(function (j) {
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
    adminDefault: angkaBersih($("cfgAdmin").value),
    footer: $("cfgFooter").value.trim(),
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

["bank", "bankLain", "nominal", "admin", "referensi", "waktu"].forEach(function (id) {
  $(id).addEventListener("input", perbarui);
  $(id).addEventListener("change", perbarui);
});

// Kolom khas layanan dibuat ulang setiap ganti jenis, jadi listener-nya
// dipasang di wadahnya (satu kali) bukan di tiap kotak isian.
$("kolomJenis").addEventListener("input", perbarui);

$("jenis").addEventListener("change", function () {
  isiPilihanBank("");
  gambarKolomJenis();
  perbarui();
});

$("bank").addEventListener("change", aturPenyediaLain);

pasangRibuan($("nominal"));
pasangRibuan($("admin"));
pasangRibuan($("cfgAdmin"));

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
