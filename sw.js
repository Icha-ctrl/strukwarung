/* =========================================================================
   sw.js — service worker
   -------------------------------------------------------------------------
   Tugasnya satu: menyimpan semua file aplikasi di HP, supaya aplikasi
   tetap bisa dibuka walaupun tidak ada internet.

   PENTING: setiap kali kamu mengubah kode, naikkan angka VERSI di bawah.
   Kalau tidak, HP akan terus memakai versi lama yang tersimpan.
   ========================================================================= */

const VERSI = "v7";
const NAMA_CACHE = "struk-warung-" + VERSI;

const BERKAS = [
  "./",
  "./index.html",
  "./style.css",
  "./struk.js",
  "./riwayat.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// Saat dipasang: simpan semua file ke cache
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(NAMA_CACHE).then(function (cache) {
      return cache.addAll(BERKAS);
    })
  );
  self.skipWaiting();
});

// Saat aktif: hapus cache versi lama
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (kunciList) {
      return Promise.all(
        kunciList
          .filter(function (k) {
            return k !== NAMA_CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

// Saat halaman minta file: ambil dari cache dulu, kalau tidak ada baru dari internet
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (tersimpan) {
      return (
        tersimpan ||
        fetch(event.request).catch(function () {
          return caches.match("./index.html");
        })
      );
    })
  );
});
