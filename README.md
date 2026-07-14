<div align="center">

# ⚡ DataSheets

### Sistem Form Input Otomatis ke Google Sheets

**Form web dinamis berbasis Next.js yang secara otomatis menyesuaikan kolom dari Google Spreadsheet Anda — tanpa database, tanpa konfigurasi manual.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Google Sheets API](https://img.shields.io/badge/Google%20Sheets-API-34a853?style=for-the-badge&logo=google-sheets)](https://developers.google.com/sheets/api)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Fitur Utama

- 🔄 **Form Dinamis** — Kolom form otomatis menyesuaikan header dari Google Spreadsheet kamu, tanpa perlu edit kode apapun
- 🧠 **Smart Input Detection** — Tipe input (`date`, `email`, `url`, `number`, `tel`, `textarea`) otomatis terdeteksi berdasarkan nama kolom
- 🔒 **Aman & Serverless** — Kredensial Google disimpan di environment variable server, tidak pernah terekspos ke browser
- 📊 **Struktur Sheet Fleksibel** — Mendukung spreadsheet dengan header di baris mana saja (tidak harus baris pertama)
- 🚀 **Deploy Gratis** — Dirancang untuk Vercel Free Tier, tanpa database apapun
- 📱 **Responsif** — Tampilan optimal di desktop maupun mobile

---

## 🗂️ Arsitektur Sistem

```
Browser (Form UI)
      │
      │ POST /api/submit { fields: {...} }
      ▼
Next.js Serverless Function (route.js)
      │
      │ JWT Auth (Service Account)
      ▼
Google Sheets API
      │
      ▼
Google Spreadsheet ✅
```

**Alur kerja:**
1. Form di-load → frontend memanggil `GET /api/headers`
2. API membaca baris header dari Google Sheet → mengembalikan daftar kolom
3. Form merender input field secara dinamis sesuai kolom
4. User mengisi form → submit → `POST /api/submit`
5. API memvalidasi data dan menambahkan baris baru ke Google Sheet

---

## 📋 Prasyarat

Sebelum memulai, pastikan kamu sudah memiliki:

- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- Akun [Google Cloud](https://console.cloud.google.com/)
- Google Spreadsheet yang sudah disiapkan

---

## 🚀 Cara Setup

### 1. Clone Repository

```bash
git clone https://github.com/rzarxx/spreadsheet.git
cd spreadsheet
npm install
```

### 2. Setup Google Cloud Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Aktifkan **Google Sheets API**: `APIs & Services → Enable APIs → Google Sheets API`
4. Buat **Service Account**: `APIs & Services → Credentials → Create Credentials → Service Account`
5. Isi nama service account, klik **Create and Continue**
6. Di halaman Service Account, masuk ke tab **Keys → Add Key → Create New Key → JSON**
7. Download file JSON tersebut — di dalamnya ada `client_email` dan `private_key`

### 3. Siapkan Google Spreadsheet

1. Buka Google Spreadsheet yang akan digunakan
2. Pastikan **baris header** (baris yang berisi nama kolom) sudah terisi, contoh:

   | Tanggal | Platform | Akun | Judul | Tautan | Status | Views | Likes |
   |---------|----------|------|-------|--------|--------|-------|-------|
   | ...     | ...      | ...  | ...   | ...    | ...    | ...   | ...   |

3. Klik tombol **Share** → tambahkan email Service Account (dari file JSON tadi) sebagai **Editor**
4. Salin **Sheet ID** dari URL: `https://docs.google.com/spreadsheets/d/`**`[SHEET_ID_ADA_DI_SINI]`**`/edit`

### 4. Konfigurasi Environment Variables

Salin file template dan isi dengan kredensial kamu:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GOOGLE_CLIENT_EMAIL="nama-service-account@project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...[kunci lengkap]\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="1A2B3C4D5E6F7G8H9I0J..."

# Nomor baris (1-based) yang berisi header kolom di spreadsheet Anda
# Contoh: jika header ada di baris ke-6, isi dengan 6
GOOGLE_HEADER_ROW=1
```

> ⚠️ **PENTING**: Jangan pernah commit file `.env.local` ke Git. File ini sudah otomatis diabaikan di `.gitignore`.

### 5. Jalankan Secara Lokal

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser. Form akan otomatis menampilkan kolom sesuai header spreadsheet kamu.

---

## 🌐 Deploy ke Vercel

1. Push repository ke GitHub
2. Buka [vercel.com](https://vercel.com) → **New Project** → Import repository ini
3. Di bagian **Environment Variables**, tambahkan semua variabel dari `.env.local`:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_HEADER_ROW`
4. Klik **Deploy** ✅

---

## 🧩 Struktur Folder

```
spreadsheet/
├── src/
│   └── app/
│       ├── globals.css           # Styling global & Tailwind config
│       ├── layout.jsx            # HTML layout & font imports
│       ├── page.jsx              # Halaman utama (Form dinamis)
│       └── api/
│           ├── headers/
│           │   └── route.js     # GET - Ambil header kolom dari Sheet
│           └── submit/
│               └── route.js     # POST - Simpan data ke Sheet
├── .env.example                  # Template environment variables
├── .gitignore                    # Daftar file yang tidak di-push ke Git
├── next.config.mjs               # Konfigurasi Next.js
├── package.json
└── README.md
```

---

## 🔌 API Reference

### `GET /api/headers`
Mengambil daftar nama kolom dari header row Google Sheet.

**Response sukses (200):**
```json
{
  "headers": ["Tanggal", "Platform", "Akun", "Judul", "Tautan", "Status", "Views", "Likes"],
  "sheetTitle": "Sheet1",
  "headerRowIndex": 6
}
```

### `POST /api/submit`
Menyimpan data form sebagai baris baru di Google Sheet.

**Request body:**
```json
{
  "fields": {
    "Tanggal": "2026-07-14",
    "Platform": "Instagram",
    "Akun": "@euphiverselive",
    "Judul": "Konten baru",
    "Tautan": "https://instagram.com/p/xxx",
    "Status": "Live",
    "Views": "10000",
    "Likes": "500"
  }
}
```

**Response sukses (200):**
```json
{
  "success": true,
  "message": "Data berhasil disimpan ke Google Sheets."
}
```

---

## 🔐 Keamanan

- ✅ Kredensial Google **hanya** dibaca di sisi server via `process.env`
- ✅ Private Key di-sanitasi dengan `.replace(/\\n/g, "\n")` untuk mencegah format error
- ✅ Validasi input dilakukan di sisi server sebelum data dikirim ke Google
- ✅ File `.env.local` sudah terdaftar di `.gitignore`
- ✅ Service Account menggunakan scope minimal yang diperlukan

---

## 🛠️ Tech Stack

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| [Next.js](https://nextjs.org/) | 16 | Framework React + Serverless API |
| [React](https://react.dev/) | 19 | UI Library |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Styling |
| [google-spreadsheet](https://theoephraim.github.io/node-google-spreadsheet/) | 5 | Google Sheets SDK |
| [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) | 10 | JWT Authentication |

---

## 📄 License

MIT © 2026 [rzarxx](https://github.com/rzarxx)
