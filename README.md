# External Audit-App (Line Walk Through)

Aplikasi inspeksi sepatu dan audit lini produksi (*Line Walk Through*) berbasis web dengan estetika **Claymorphism 3D**, integrasi **Supabase Cloud**, pelaporan format kebawah (*Tall / Normalized Pivot-Ready*), dan panel administratif lengkap tanpa perlu login.

---

## 🌟 Fitur Utama

1. **Integrasi Supabase Cloud & Local Fallback**:
   - Skema database relasional: `styles`, `categories`, `lines`, `areas`, `inspections`, dan `inspection_defects`.
   - Penyimpanan cloud otomatis dengan fallback ke IndexedDB & LocalStorage jika offline.

2. **Panel Admin Terpisah (`admin.html`)**:
   - Dapat diakses tanpa login.
   - Manajemen Master Style Number & Model (+ tombol sekali klik migrasi 3340+ style bawaan ke Supabase).
   - Manajemen Kategori Validasi (HFPA, FTT, PEAC, dll.).
   - Manajemen Line Produksi (101-116, 201-216, dll.).
   - Manajemen Master Area Defect Sepatu.
   - Audit Trail & riwayat inspeksi lengkap dengan export laporan.
   - Konfigurasi Supabase URL & Anon Key dengan tombol uji koneksi.

3. **Alur Input Defect NG Bertahap**:
   - Ketika status diubah ke **NG**:
     1. Ketik Tipe Defect (manual / rekomendasi datalist).
     2. Pilih Posisi (`Left (L)` / `Right (R)` / `Both (L & R)`).
     3. Pilih Area Sepatu (Toe Box, Vamp, Midsole, Outsole, dll.).
     4. Mendukung penambahan banyak defect dalam 1 pair.

4. **Reporting Format Kebawah (Pivot-Ready)**:
   - Data defect disimpan dan diekspor dalam format normalisasi baris kebawah (*Tall Format*), bukan kolom kesamping.
   - Sangat mudah diolah langsung dengan Excel Pivot Table.
   - Popup otomatis setelah inspeksi selesai untuk download file Excel (`.xlsx`) dan bundle foto (`.zip`).

5. **Desain Claymorphism 3D & Prinsip Gestalt**:
   - Tampilan visual modern, lembut, dan tactile dengan efek elevasi 3D.
   - Tata letak terstruktur dengan pengelompokan Gestalt (*Proximity* & *Similarity*).

---

## 📁 Struktur Folder Proyek

```text
External-Audit-App/
├── css/
│   └── styles.css          # Sistem Desain Claymorphism 3D & Gestalt
├── js/
│   ├── script.js           # Logika utama aplikasi inspeksi & reporting
│   ├── admin.js            # Logika panel administratif & audit trail
│   ├── supabaseClient.js   # Client service Supabase & offline fallback
│   └── database.js         # Master data style awal (~3340 item)
├── database/
│   └── schema.sql          # Skrip inisialisasi tabel & RLS Supabase
├── index.html              # Halaman utama inspeksi sepatu
├── admin.html              # Halaman panel admin
├── .gitignore              # Proteksi file kredensial lokal (.env)
└── README.md               # Dokumentasi proyek
```

---

## 🚀 Panduan Setup Database (Supabase)

1. Buat project baru di [Supabase](https://supabase.com).
2. Buka menu **SQL Editor** pada dashboard Supabase.
3. Buka file `database/schema.sql`, salin seluruh kodenya, dan jalankan (**Run**).
4. Buka halaman `admin.html`, pilih tab **⚙️ Pengaturan Supabase**.
5. Masukkan **Project URL** dan **Public Anon Key**, lalu klik **Simpan & Hubungkan**.
6. Pada tab **👟 Style & Model**, klik **🚀 Sync database.js ke Supabase** untuk mengunggah master data style awal.

---

## 💻 Menjalankan Aplikasi Secara Lokal

Anda dapat membuka file `index.html` langsung di browser atau menggunakan live server lokal:

```bash
# Menggunakan Python
python -m http.server 8080

# Atau menggunakan Node / npx
npx serve .
```

Akses aplikasi di browser:
- Halaman Inspeksi: `http://localhost:8080/index.html`
- Halaman Admin: `http://localhost:8080/admin.html`