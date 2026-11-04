# POPULAR VOTE ID
> **"Your Vote, Your Power"** — Platform Voting Digital Multi-Event Profesional & Terpercaya di Indonesia

---

## 🌟 Identitas Proyek & Arsitektur Utama

**POPULAR VOTE ID** adalah platform voting digital terintegrasi yang memungkinkan penyelenggaraan berbagai kategori kompetisi secara profesional, transparan, dan realtime dalam satu sistem:
1. **Modelling Competition**
2. **Beauty Pageant**
3. **Kids Modelling Competition**
4. **Talent Competition**
5. **Popularity Contest & Public Choice Award**
6. **Social Media & Entertainment Awards**

### Prinsip Single Administrator
Platform ini dibangun dengan prinsip **Single Administrator**:
- Hanya ada satu akun administrator pusat (`admin@popularvote.id`) dengan akses penuh terhadap seluruh kontrol sistem.
- Tidak ada multi-level EO, tidak ada finance admin terpisah, dan tidak ada registrasi publik untuk akun admin.
- Seluruh manajemen event, kategori, peserta, leaderboard, transaksi pembayaran, paket vote, dan verifikasi bukti bayar dikelola terpusat dari satu dashboard: **Admin Portal CMS**.

---

## 🚀 Teknologi Utama (Tech Stack)

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas API (Unduh Poster Resmi)
- **Backend API**: Node.js & Express (`/api/*`), terintegrasi di development (`server.ts` & Vite middleware) serta Vercel Serverless Function (`/api/index.ts`)
- **Database & ORM**: PostgreSQL via **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`, `pg`)
- **Autentikasi & Penyimpanan**: **Firebase Authentication** & Firestore
- **Deployment**:
  - Google Cloud Run (AI Studio Build): `https://popular-vote-id27.ai.studio`
  - Vercel Serverless & Custom Domain: `https://popularvote.id.my.id`

---

## 📂 Struktur Direktori Repositori

```
├── /api
│   └── index.ts                 # Vercel Serverless Function entrypoint
├── /public
│   └── assets/aistudio/         # Aset statis & logo QRIS resmi
├── /src
│   ├── /admin                   # Modul Admin Portal CMS (Single Administrator)
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminEvents.tsx
│   │   ├── AdminCandidates.tsx
│   │   ├── AdminCategories.tsx
│   │   ├── AdminVotePackages.tsx
│   │   ├── AdminTransactions.tsx# Verifikasi & ACC Bukti Pembayaran
│   │   ├── AdminWinners.tsx
│   │   ├── AdminSecurity.tsx
│   │   └── ...
│   ├── /api                     # Client-side API request helpers
│   ├── /components              # Komponen Public (Navbar, Footer, VotingModal, CandidateModal, dll.)
│   ├── /db                      # Database Configuration & Schema
│   │   ├── index.ts             # Connection Pool Drizzle (Cloud SQL socket & Vercel URL)
│   │   ├── schema.ts            # Definisi tabel PostgreSQL Drizzle
│   │   ├── seed.ts              # Data inisialisasi resmi (Fresh Model Hunt 2027 & Moon & Star)
│   │   └── drizzle.config.ts    # Drizzle Kit configuration
│   ├── /pages                   # Halaman Publik (Home, Events, Detail, Winners, FAQ, Cek Transaksi)
│   ├── /server                  # Backend Express Router
│   │   ├── app.ts               # Setup Express & inisialisasi database
│   │   └── api.ts               # Seluruh endpoint API publik & admin
│   ├── /types                   # Definisi tipe data TypeScript
│   ├── App.tsx                  # Root Application Router
│   └── main.tsx                 # Client entry point
├── .env.example                 # Dokumentasi environment variables
├── firebase-applet-config.json  # Konfigurasi client Firebase
├── metadata.json                # Metadata AI Studio Build
├── package.json                 # Dependency & build scripts
├── server.ts                    # Production full-stack server
├── vercel.json                  # Konfigurasi rewrite Vercel
└── vite.config.ts               # Vite build configuration
```

---

## 💳 Alur Pembayaran & Realtime Leaderboard

1. **Pemilihan Paket**:
   - Tersedia paket suara berbayar serta **Paket Free Vote (1 Suara, Rp 0)** yang langsung teralokasi otomatis ke Leaderboard.
2. **Pesan Dukungan (Opsional)**:
   - Voter dapat menuliskan ucapan atau pesan penyemangat yang akan tampil di profil kandidat dan kolom komentar setelah pembayaran sah.
3. **Nominal Unik Kode Finalis**:
   - Setiap pembelian vote ditambahkan nominal angka unik sesuai nomor urut finalis (contoh: paket Rp 1.000.000 untuk finalis No. 1 menjadi Rp 1.000.001).
4. **Metode Pembayaran**:
   - **QRIS**: QRIS Resmi *Noxaz Creative, Service* (NMID: ID1026594269932).
   - **Transfer Bank**: BCA Rek. `6110838067` A/N `I Gede Sakha Ari Wibawa`.
5. **Verifikasi Bukti & ACC Admin**:
   - Voter mengunggah foto/struk bukti pembayaran.
   - Status transaksi masuk ke antrean *Pending Verification*.
   - Saat Admin mengklik **ACC Bayar** di Admin Portal CMS, transaksi langsung ditandai *Paid*, suara otomatis bertambah ke Leaderboard secara realtime, dan pendukung masuk ke daftar **Top Supporter**.

---

## 🛠️ Panduan Menjalankan Project

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Lingkungan (.env)
Salin `.env.example` ke `.env` dan lengkapi konfigurasi database Anda:
```bash
cp .env.example .env
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Buka `http://localhost:3000` pada peramban web.

### 4. Build Production
```bash
npm run build
npm start
```

---

## 🔒 Hak Cipta & Kontak Bantuan Resmi

- **Platform**: POPULAR VOTE ID
- **WhatsApp Customer Care**: `+62 851-2804-6632 (24/7)`
- **Email**: `support@popularvote.id`
- **Kantor**: Denpasar, Bali
