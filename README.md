# Pante – Meme dengan Utilitas

Sebuah proyek web3 yang menggabungkan budaya meme dengan utilitas DeFi yang nyata. Dibangun dengan fokus pada kemudahan penggunaan, desain modern, dan interaksi yang halus.

## 📌 Deskripsi Singkat
- **Ekosistem DeFi**: DEX, liquidity mining, staking, governance, dan fitur tambahan.
- **Desain Modern**: Dark theme, garis RGB tipis yang bergerak, efek scroll reveal, menu geser dari kanan, dan efek klik yang menarik.
- **Teks Putih**: Semua teks di menu (daftar isi) disesuaikan menjadi warna putih agar jelas di semua latar belakang.

## ✨ Fitur Utama
- **Scroll Reveal**: Konten muncul secara perlahan saat digulir ke dalam viewport (klas `.reveal`).
- **Garis RGB Bergerak**: Garis tipis berwarna gradient RGB yang bergerak melintasi layar.
- **Menu Geser**: Panel menu meluncur dari kanan dengan animasi halus.
- **Efek Klik**: Efek ripple/skala pada tombol menu, link, dan fitur kartu.
- **Border Tebal**: Semua bagian utama (header, nav, hero, features, footer) memiliki border 2px berwarna oranye (#ff9500) dengan kelas `.bordered`.

## 🚀 Cara Kerja
1. **Clone repositori**  
   ```bash
   git clone https://github.com/YourUsername/Pante.git
   cd Pante
   ```

2. **Pasang dependensi (jika ada)**  
   Tidak ada dependensi khusus, cukup buka file di browser.

3. **Jalankan server lokal**  
   ```bash
   python3 -m http.server 12345 --bind 0.0.0.0
   ```

4. **Buka di browser**  
   Kunjungi `http://localhost:12345` untuk melihat hasilnya.

## 📂 Struktur File
```
/root/.hermes/Pante/
├── index.html          # Halaman utama
├── about.html          # Halaman About
├── whitepaper.html     # Halaman Whitepaper
├── style.css           # CSS styling (modern, scroll, effects)
├── script.js           # JavaScript interaktif (menu, scroll reveal)
├── banner.png          # Gambar hero
├── logo.png            # Logo (rasio 1:1)
└── backup/             # Backup file sebelum setiap perubahan
```

## 🛠️ Pengaturan & Pengaturan
- **Server**: Berjalan di port 12345 (bisa diubah). Gunakan `python3 -m http.server 12345 --bind 0.0.0.0`.
- **Mode Pengembangan**: Untuk pengujian lebih lanjut, Anda dapat menambahkan live‑reload dengan `nodemon` atau `livereload` bila diperlukan.
- **Responsive**: Layout responsif, menyesuaikan pada perangkat mobile dan desktop.

## 📝 Kontribusi
1. Fork repositori.
2. Buat branch fitur: `git checkout -b feature/your-feature`.
3. Lakukan perubahan, commit: `git commit -m "Add feature"`.
4. Push ke branch: `git push origin feature/your-feature`.
5. Buat Pull Request.

## 📜 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## 🙏 Terima Kasih
Terima kasih kepada komunitas open‑source dan semua kontributor yang membantu membuat proyek ini menjadi lebih baik.