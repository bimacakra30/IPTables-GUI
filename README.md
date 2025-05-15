# 🔐 IPTables GUI Control Panel

IPTables GUI Control Panel adalah antarmuka web modern berbasis **React**, **Vite**, dan **Tailwind CSS** untuk mengelola dan memantau aturan iptables secara interaktif. Aplikasi ini ditujukan untuk sysadmin, devops, dan pengguna Linux yang ingin memvisualisasikan serta mengatur firewall rules tanpa perlu mengetikkan perintah di terminal.

---

## ✨ Fitur Utama

- 🚀 Dibangun dengan stack modern: **React + Vite + Tailwind CSS**
- 🧩 Visualisasi daftar aturan (`iptables -L`) secara real-time
- 🎛️ Form dinamis untuk menambah dan menghapus aturan
- 🔁 Sinkronisasi otomatis antara tabel dan chain yang valid
- ⚡ Responsif dan ringan, cocok untuk server headless
- 💾 Auto-persist IP backend selama 30 menit via localStorage
- 🌐 Kompatibel dengan backend berbasis Express.js yang memanggil perintah `iptables`

---

## 📦 Instalasi

### ⚙️ Konfigurasi Sudo (Visudo)

Agar backend dapat menjalankan perintah `iptables` tanpa meminta password, tambahkan aturan berikut pada file sudoers dengan perintah:

```bash
sudo visudo
```
Kemudian tambahkan baris berikut:
```bash
root ALL=(ALL) NOPASSWD: /sbin/iptables
```
Aturan ini memungkinkan user root (atau sesuaikan dengan user yang menjalankan backend) menjalankan iptables tanpa perlu memasukkan password, sehingga proses automatisasi bisa berjalan lancar dan aman.

### 1. Pastikan **Node.js** telah terinstal di sistem Anda.

> 📝 [Download Node.js](https://nodejs.org/) jika belum tersedia.

### 2. Clone proyek ini

```bash
git clone https://github.com/bimacakra30/IPTables-GUI.git
cd IPTables-GUI
```

### 3. Install semua dependensi

```bash
npm run install-all
```

> 🔧 Ini akan menginstall semua package yang dibutuhkan oleh proyek frontend.

### 4. Jalankan aplikasi

```bash
npm run start-all
```

> Aplikasi akan tersedia di `http://IP_SERVER:5173/` (default dari Vite)

---


## 🛡️ Catatan Keamanan

Karena proyek ini memanggil `iptables`, pastikan:
- Backend dijalankan dengan hak akses yang aman (misalnya via `sudo` atau service).
- UI hanya diakses oleh admin atau IP yang tepercaya.
- Jangan expose langsung backend ke internet tanpa autentikasi.

---

## 📃 Lisensi

MIT License. Bebas digunakan untuk pengembangan pribadi maupun komersial.

---

## 🙌 Kontribusi

Pull Request, saran, dan masukan sangat dihargai! Silakan fork dan buat PR jika ingin menambahkan fitur baru.

---

> Dibuat oleh Bima Cakra Bara Karebet
