/* =========================================================================
   riwayat.js — penyimpanan transaksi, layar Riwayat, dan Rekap harian
   -------------------------------------------------------------------------
   Semua data disimpan di localStorage HP itu sendiri. Tidak ada server,
   tidak ada internet. Bentuk satu transaksi:
     { noStruk, iso, waktu, jenis, bank, tujuan, rekening,
       referensi, nominal, admin, total }
   ========================================================================= */

const KUNCI_TRX = "strukwarung.trx";

/* ---------- 1. Lapisan data ---------- */

function bacaTrx() {
  try {
    const mentah = localStorage.getItem(KUNCI_TRX);
    const arr = mentah ? JSON.parse(mentah) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function tulisTrx(daftar) {
  localStorage.setItem(KUNCI_TRX, JSON.stringify(daftar));
}

/* Simpan transaksi. Kalau nomor struk yang sama dikeluarkan dua kali
   (misal Simpan PNG lalu Bagikan), catatannya DIPERBARUI, bukan digandakan. */
function tambahTrx(data) {
  const daftar = bacaTrx();
  // Object.assign({}, data, ...) : kolom khas layanan (kode token, periode,
  // no. meter, tarif, dst) ikut tersimpan apa adanya, supaya struk listrik
  // yang dibuka lagi dari Riwayat tetap lengkap. Kolom di bawah menimpanya
  // dengan versi yang sudah dibersihkan.
  const catatan = Object.assign({}, data, {
    noStruk: data.noStruk,
    iso: new Date().toISOString(),
    waktu: data.waktu,
    jenis: data.jenis,
    bank: data.bank,
    tujuan: data.tujuan,
    rekening: data.rekening,
    referensi: data.referensi,
    nominal: Number(data.nominal) || 0,
    admin: Number(data.admin) || 0,
    total: (Number(data.nominal) || 0) + (Number(data.admin) || 0),
  });

  const posisi = daftar.findIndex((t) => t.noStruk === catatan.noStruk);
  if (posisi >= 0) {
    catatan.iso = daftar[posisi].iso; // pertahankan waktu simpan pertama
    daftar[posisi] = catatan;
  } else {
    daftar.unshift(catatan);
  }
  tulisTrx(daftar);
  return catatan;
}

function hapusTrx(noStruk) {
  tulisTrx(bacaTrx().filter((t) => t.noStruk !== noStruk));
}

/* ---------- 2. Penyaring ---------- */

let filterAktif = "hari";
let kataCari = "";

function awalHari(geser) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (geser || 0));
  return d;
}

function lolosFilter(t) {
  const waktu = new Date(t.iso);

  if (filterAktif === "hari" && waktu < awalHari(0)) return false;
  if (filterAktif === "minggu" && waktu < awalHari(6)) return false;
  if (filterAktif === "bulan") {
    const skr = new Date();
    if (waktu.getMonth() !== skr.getMonth() || waktu.getFullYear() !== skr.getFullYear()) return false;
  }

  if (kataCari) {
    const k = kataCari.toLowerCase();
    const gabung = [t.tujuan, t.referensi, t.noStruk, t.bank, t.jenis, t.rekening]
      .join(" ")
      .toLowerCase();
    if (gabung.indexOf(k) === -1) return false;
  }
  return true;
}

function trxTersaring() {
  return bacaTrx().filter(lolosFilter);
}

/* ---------- 3. Gambar layar ---------- */

const rel = (id) => document.getElementById(id);

function gambarRekap(daftar) {
  const jumlah = daftar.length;
  const totalNominal = daftar.reduce((a, t) => a + t.nominal, 0);
  const totalAdmin = daftar.reduce((a, t) => a + t.admin, 0);

  rel("stJumlah").textContent = jumlah;
  rel("stNominal").textContent = rupiah(totalNominal);
  rel("stAdmin").textContent = rupiah(totalAdmin);

  // Rincian per jenis transaksi
  const per = {};
  daftar.forEach((t) => {
    const j = t.jenis || "(tanpa jenis)";
    if (!per[j]) per[j] = { n: 0, admin: 0 };
    per[j].n += 1;
    per[j].admin += t.admin;
  });

  const wadah = rel("perJenis");
  wadah.innerHTML = "";
  const kunci = Object.keys(per).sort((a, b) => per[b].admin - per[a].admin);

  if (!kunci.length) {
    wadah.innerHTML = '<p class="muted">Belum ada data pada rentang ini.</p>';
    return;
  }

  kunci.forEach((j) => {
    const b = document.createElement("div");
    b.className = "jbaris";
    b.innerHTML =
      '<span class="jnama"></span><span class="jn"></span><span class="jadmin"></span>';
    b.querySelector(".jnama").textContent = j;
    b.querySelector(".jn").textContent = per[j].n + "x";
    b.querySelector(".jadmin").textContent = rupiah(per[j].admin);
    wadah.appendChild(b);
  });
}

function gambarDaftar(daftar) {
  const wadah = rel("listRiwayat");
  wadah.innerHTML = "";

  if (!daftar.length) {
    const kosong = document.createElement("div");
    kosong.className = "kosong";
    kosong.textContent = bacaTrx().length
      ? "Tidak ada transaksi yang cocok dengan penyaring ini."
      : "Belum ada transaksi tersimpan. Buat struk dulu di tab Buat Struk.";
    wadah.appendChild(kosong);
    return;
  }

  daftar.forEach((t) => {
    const item = document.createElement("div");
    item.className = "ritem";

    const kiri = document.createElement("div");
    kiri.className = "rkiri";
    const judul = document.createElement("div");
    judul.className = "rjudul";
    judul.textContent = t.tujuan || t.jenis || "Transaksi";
    const meta = document.createElement("div");
    meta.className = "rmeta";
    meta.textContent = [t.jenis, t.bank, t.noStruk, t.waktu].filter(Boolean).join(" \u00b7 ");
    kiri.appendChild(judul);
    kiri.appendChild(meta);

    const kanan = document.createElement("div");
    kanan.className = "rkanan";
    const tot = document.createElement("div");
    tot.className = "rtotal";
    tot.textContent = rupiah(t.total);
    const adm = document.createElement("div");
    adm.className = "radmin";
    adm.textContent = "admin " + rupiah(t.admin);
    kanan.appendChild(tot);
    kanan.appendChild(adm);

    const aksi = document.createElement("div");
    aksi.className = "raksi";
    const bBuka = document.createElement("button");
    bBuka.className = "btn kecil";
    bBuka.textContent = "Buka";
    bBuka.addEventListener("click", () => bukaTrx(t));
    const bHapus = document.createElement("button");
    bHapus.className = "btn kecil bahaya";
    bHapus.textContent = "Hapus";
    bHapus.addEventListener("click", () => {
      const yakin = confirm(
        "Hapus transaksi " + t.noStruk + " (" + rupiah(t.total) + ")?\n\nCatatan yang sudah dihapus tidak bisa dikembalikan."
      );
      if (!yakin) return;
      hapusTrx(t.noStruk);
      gambarRiwayat();
    });
    aksi.appendChild(bBuka);
    aksi.appendChild(bHapus);

    item.appendChild(kiri);
    item.appendChild(kanan);
    item.appendChild(aksi);
    wadah.appendChild(item);
  });
}

function gambarRiwayat() {
  const daftar = trxTersaring();
  gambarRekap(daftar);
  gambarDaftar(daftar);
  rel("jmlTampil").textContent =
    daftar.length + " dari " + bacaTrx().length + " transaksi tersimpan";
}

/* ---------- 4. Export CSV ---------- */

function selCsv(nilai) {
  const s = String(nilai == null ? "" : nilai);
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCsv() {
  const daftar = trxTersaring();
  if (!daftar.length) {
    alert("Tidak ada data untuk diexport pada rentang ini.");
    return;
  }

  const kepala = [
    "No Struk", "Waktu", "Jenis", "Bank", "Tujuan",
    "No Rekening", "Referensi", "Nominal", "Biaya Admin", "Total",
  ];

  const baris = daftar.map((t) =>
    [t.noStruk, t.waktu, t.jenis, t.bank, t.tujuan, t.rekening, t.referensi, t.nominal, t.admin, t.total]
      .map(selCsv)
      .join(",")
  );

  // \ufeff = penanda supaya Excel membaca huruf Indonesia dengan benar
  const isi = "\ufeff" + kepala.map(selCsv).join(",") + "\n" + baris.join("\n");
  const blob = new Blob([isi], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "rekap-struk-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- 5. Pasang listener ---------- */

function siapkanRiwayat() {
  document.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      filterAktif = c.dataset.rentang;
      gambarRiwayat();
    });
  });

  rel("cari").addEventListener("input", function () {
    kataCari = this.value.trim();
    gambarRiwayat();
  });

  rel("btnCsv").addEventListener("click", exportCsv);
  gambarRiwayat();
}
