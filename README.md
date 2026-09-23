# Boardgame Kartu — Prototipe (4 Pemain)

Kerangka dasar untuk boardgame kartu dengan 2 wilayah:
- **Wilayah 1 — Meja Publik**: dek kartu, semua pemain bisa melihat proses kocok/ambil kartu, tapi hanya pemain yang sedang giliran yang bisa bertindak.
- **Wilayah 2 — Meja Pribadi**: tiap pemain punya area "Merangkai Kartu" dan "Penyimpanan Kartu" sendiri. Kartu di area ini **tidak pernah dikirim ke pemain lain** — server yang menjaga privasi ini, bukan cuma disembunyikan di tampilan.

Saat pemain menekan **"Tunjukkan ke Publik"** pada gilirannya, isi Area Merangkai berpindah menjadi kartu terbuka yang terlihat semua orang.

## Yang BELUM diisi (sengaja)

Aturan susun kartu (misalnya harus membentuk set/run tertentu) belum ditentukan. Titik untuk mengisi aturan itu ada di `server.js`, fungsi:

```js
function validateArrangement(arrangingCards) {
  // TODO: isi aturan sebenarnya di sini
}
```

Begitu aturan main sudah fix, kita tinggal isi fungsi ini — tidak perlu bongkar struktur lain.

## Cara Menjalankan di Komputer Kamu

Butuh [Node.js](https://nodejs.org) (versi 18 ke atas) sudah terpasang.

```bash
cd cardgame
npm install
npm start
```

Buka `http://localhost:3000` di 4 tab/browser berbeda (atau 4 device di jaringan yang sama, ganti `localhost` dengan IP komputer kamu) untuk simulasi 4 pemain.

## Cara Deploy Online (supaya bisa diakses 4 pemain dari mana saja)

Karena ini pakai Socket.io (perlu koneksi WebSocket terus-menerus), pilih hosting yang mendukung **long-running Node.js process**, bukan hosting statis biasa. Rekomendasi (semua ada free/hobby tier, cukup untuk 4 pemain 1 sesi):

### Opsi: Render.com
1. Push folder ini ke repo GitHub.
2. Di Render, buat **New Web Service**, hubungkan repo.
3. Build command: `npm install`, Start command: `npm start`.
4. Deploy — Render kasih URL publik otomatis.

### Opsi: Railway.app
1. Push ke GitHub, import project di Railway.
2. Railway otomatis deteksi Node.js, jalankan `npm start`.
3. Aktifkan domain publik di tab Settings.

### Opsi: Fly.io
Cocok kalau mau kontrol lebih (region server, dsb), tapi setup sedikit lebih teknis (perlu `fly launch` dari CLI).

> Catatan: Vercel/Netlify **tidak cocok** untuk server Socket.io persisten seperti ini karena mereka berbasis serverless function (koneksi WebSocket akan terputus). Pakai salah satu di atas.

## Struktur Project

```
cardgame/
├── server.js          # Semua logic game & privasi data ada di sini
├── package.json
├── public/
│   ├── index.html      # UI: wilayah publik + wilayah pribadi
│   ├── style.css        # Tema meja kartu (felt hijau + aksen kayu)
│   └── client.js         # Koneksi socket & render state
└── README.md
```

## Alur Main Saat Ini (MVP)

1. Buka halaman → isi nama → "Gabung Sesi". Game mulai otomatis begitu 4 orang bergabung.
2. Giliran berjalan sesuai urutan bergabung (seperti UNO).
3. Saat giliran kamu: **Kocok Kartu** dan/atau **Ambil Kartu** (masuk ke Penyimpanan).
4. Kapan saja (tidak perlu nunggu giliran): klik kartu untuk pindah antara Area Merangkai ⇄ Penyimpanan, menyusun strategi.
5. Saat giliran kamu dan susunan sudah siap: **Tunjukkan ke Publik** → kartu di Area Merangkai jadi terlihat semua orang.
6. **Selesai Giliran** → giliran pindah ke pemain berikutnya.

## Yang Masih Perlu Didiskusikan / Dikembangkan

- Aturan valid tidaknya susunan kartu (fungsi `validateArrangement`)
- Kondisi menang/kalah & akhir permainan
- Kartu terbuka di meja publik (discard pile) — kerangkanya sudah ada (`openCards`) tapi belum dipakai di UI
- Reconnect handling kalau pemain putus koneksi di tengah sesi
