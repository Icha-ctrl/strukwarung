/* =========================================================================
   ocr.js — isi form otomatis dari foto / screenshot struk bank
   -------------------------------------------------------------------------
   Cara kerjanya: gambar dikirim ke Gemini, lalu Gemini diminta menjawab
   HANYA dalam bentuk JSON dengan nama kunci yang sama seperti kolom di
   SKEMA (struk.js). Jadi hasilnya bisa langsung dituang ke form.

   PENTING soal kunci API:
   Kunci TIDAK boleh ditulis di dalam kode, karena repo ini publik — kunci
   yang ter-commit akan langsung dipanen robot dan dipakai orang lain.
   Jadi kunci diisi kakak sendiri di tab Pengaturan, lalu disimpan di HP
   masing-masing (localStorage) dan tidak pernah ikut ke GitHub.
   ========================================================================= */

const KUNCI_API = "strukwarung.kunci";
const MODEL_OCR = "gemini-2.0-flash";

function bacaKunci() {
  return localStorage.getItem(KUNCI_API) || "";
}

function simpanKunci(nilai) {
  localStorage.setItem(KUNCI_API, String(nilai || "").trim());
}

// File gambar -> teks base64 (bentuk yang diminta Gemini)
function fileKeBase64(file) {
  return new Promise(function (selesai, gagal) {
    const pembaca = new FileReader();
    pembaca.onload = function () {
      // hasilnya "data:image/jpeg;base64,XXXX" -> ambil bagian setelah koma
      selesai(String(pembaca.result).split(",")[1]);
    };
    pembaca.onerror = gagal;
    pembaca.readAsDataURL(file);
  });
}

/* Perintah untuk Gemini.
   Dibuat sangat kaku: daftar jenis dibatasi, nama kunci ditentukan, dan
   nominal wajib angka polos. Kalau perintahnya longgar, jawabannya
   berubah-ubah bentuk dan form jadi salah isi. */
function perintahOcr() {
  return (
    "Kamu membaca struk transaksi Indonesia dari gambar. " +
    "Jawab HANYA JSON, tanpa penjelasan, tanpa tanda kutip tiga.\n\n" +
    'Bentuk JSON: {"jenis":"","bank":"","rekening":"","tujuan":"","idpel":"",' +
    '"tarif":"","kwh":"","token":"","periode":"","paket":"","nominal":0,' +
    '"referensi":"","waktu":""}\n\n' +
    "Aturan:\n" +
    '- "jenis" HARUS salah satu dari: ' + daftarJenis().join(" | ") + "\n" +
    '- "bank" = nama bank, e-wallet, atau penyedia (BRI, BCA, DANA, PLN, PAM Batam, Telkomsel).\n' +
    '- "rekening" = nomor rekening, nomor pelanggan, nomor meter, atau nomor HP tujuan.\n' +
    '- "tujuan" = nama penerima atau nama pelanggan.\n' +
    '- "token" = kode token listrik (biasanya 20 digit). Tulis angkanya saja tanpa spasi.\n' +
    '- "nominal" = jumlah transaksi dalam angka polos tanpa titik dan tanpa "Rp". ' +
    "JANGAN masukkan biaya admin atau total ke sini.\n" +
    '- "referensi" = nomor referensi / ID transaksi dari bank.\n' +
    '- "waktu" = format DD/MM/YY HH:MM.\n' +
    "- Kolom yang tidak ada di struk, isi string kosong.\n" +
    "- Jangan menebak. Kalau tidak yakin, kosongkan."
  );
}

async function scanStruk(file) {
  const kunci = bacaKunci();
  if (!kunci) {
    pesan($("noteOcr"), "Isi dulu kunci Gemini di tab Pengaturan.", "warn");
    return;
  }

  pesan($("noteOcr"), "Membaca struk… tunggu beberapa detik.", "");

  try {
    const base64 = await fileKeBase64(file);

    const balasan = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        MODEL_OCR +
        ":generateContent?key=" +
        encodeURIComponent(kunci),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: perintahOcr() },
                {
                  inline_data: {
                    mime_type: file.type || "image/jpeg",
                    data: base64,
                  },
                },
              ],
            },
          ],
          // suhu 0 = jawaban paling patuh, tidak mengarang
          generationConfig: { temperature: 0, response_mime_type: "application/json" },
        }),
      }
    );

    if (!balasan.ok) {
      throw new Error(
        balasan.status === 400 || balasan.status === 403
          ? "kunci API salah atau belum aktif"
          : "server menolak (" + balasan.status + ")"
      );
    }

    const hasil = await balasan.json();
    const teks =
      hasil &&
      hasil.candidates &&
      hasil.candidates[0] &&
      hasil.candidates[0].content.parts[0].text;

    if (!teks) throw new Error("jawaban kosong");

    isiDariHasil(JSON.parse(teks));
  } catch (e) {
    pesan(
      $("noteOcr"),
      "Gagal membaca (" + e.message + "). Isi manual saja, struknya tetap bisa dibuat.",
      "warn"
    );
  }
}

/* Tuang hasil bacaan ke form.
   Biaya admin SENGAJA tidak diisi dari gambar — itu biaya toko sendiri,
   tidak ada di struk bank. Selalu dipasang dari pengaturan. */
function isiDariHasil(h) {
  if (h.jenis && SKEMA[h.jenis]) $("jenis").value = h.jenis;

  isiPilihanBank(h.bank || "");
  gambarKolomJenis(h); // kunci JSON sama dengan nama kolom di SKEMA

  if (h.nominal) $("nominal").value = ribuan(angkaBersih(h.nominal));
  if (h.referensi) $("referensi").value = h.referensi;
  if (h.waktu) $("waktu").value = h.waktu;
  $("admin").value = ribuan(CFG.adminDefault);

  perbarui();
  pesan($("noteOcr"), "Struk terbaca. Cek dulu angkanya sebelum dikirim.", "ok");
}

/* ---------- Pasang tombol ---------- */

$("btnKamera").addEventListener("click", function () {
  $("fotoKamera").click();
});

$("btnGaleri").addEventListener("click", function () {
  $("fotoGaleri").click();
});

["fotoKamera", "fotoGaleri"].forEach(function (id) {
  $(id).addEventListener("change", function () {
    if (this.files && this.files[0]) scanStruk(this.files[0]);
    this.value = ""; // dikosongkan supaya foto yang sama bisa dipilih lagi
  });
});

$("cfgKunci").value = bacaKunci();

$("btnSimpanKunci").addEventListener("click", function () {
  simpanKunci($("cfgKunci").value);
  pesan($("noteKunci"), "Kunci tersimpan di HP ini saja.", "ok");
});