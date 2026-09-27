# PROMPT.md — Multi Global SaaS Platform

## 1. Tujuan Proyek

Bangun aplikasi SaaS **Multi Global** berbasis **Node.js + MySQL** yang dapat berjalan sepenuhnya di lingkungan **localhost Windows** dan siap dikembangkan/deploy ke VPS.

Platform ini menyediakan **6 jenis aplikasi bisnis** dalam satu sistem:

1. Percetakan
2. Toko Retail / Grosir
3. Bengkel Mobil
4. Bengkel Motor
5. Kuliner / UMKM / Rumah Makan
6. Travel

Konsep utama:

> **Satu Platform — Banyak Usaha — Banyak Tenant — Karyawan AI**

Setiap tenant memiliki data, pengguna, konfigurasi, dashboard, transaksi, dan domain/subdomain yang terisolasi.

Aplikasi harus memiliki tampilan **responsive**, **tema terang dan gelap**, dashboard modern, mobile-friendly, serta **Live Chat AI menggunakan Groq API**.

---

# 2. Branding

## Brand

**Multi Global**

Gunakan identitas visual yang terinspirasi dari desain referensi:

- Biru sebagai warna utama
- Biru tua/navy untuk header dan navigasi
- Putih untuk background utama pada Light Mode
- Biru muda sebagai aksen
- Kuning/oranye sebagai CTA dan highlight
- Hijau untuk status berhasil/aktif
- Merah untuk error/peringatan
- Ungu/oranye/teal dapat digunakan sebagai aksen tiap kategori aplikasi

### Light Mode

Nuansa harus mirip dengan gambar referensi:

- Background: putih / very light blue
- Primary: blue
- Secondary: navy
- Accent: cyan/light blue
- CTA: orange/yellow
- Card: putih dengan border tipis
- Shadow: lembut
- Border radius: modern, sekitar 12–20px

### Dark Mode

Sediakan dark mode penuh:

- Background: #0B1220 / #111827
- Card: #172033 / #1F2937
- Primary: blue/cyan
- Text utama: putih
- Text sekunder: slate/gray
- Border: dark blue/gray
- Tetap gunakan aksen Multi Global agar identitas brand tidak hilang.

Sediakan tombol:

- Light
- Dark
- System

Preferensi tema disimpan di browser/localStorage dan, jika user login, juga dapat disimpan di database.

---

# 3. Teknologi

Gunakan stack yang mudah dijalankan di Windows localhost.

## Backend

- Node.js
- Express.js
- JavaScript/TypeScript
- REST API
- WebSocket atau Socket.IO untuk live chat dan realtime notification
- JWT atau session authentication
- bcrypt/argon2 untuk password
- dotenv untuk environment variables
- Helmet
- CORS
- Rate limiting
- Validation menggunakan Zod/Joi/express-validator

## Database

- MySQL 8+
- mysql2 atau Prisma ORM
- Migration system
- Foreign key
- Indexing
- Transaction
- Soft delete untuk data penting

## Frontend

Gunakan salah satu:

- React + Vite

atau, bila ingin arsitektur lebih sederhana:

- EJS + Bootstrap/Tailwind

Prioritaskan **React + Vite + Tailwind CSS** untuk UI modern dan responsive.

## UI

- Tailwind CSS
- Lucide Icons
- Chart.js atau Recharts
- Responsive desktop/tablet/mobile
- PWA-ready jika memungkinkan

---

# 4. Struktur Aplikasi

Gunakan arsitektur modular.

Contoh:

```text
multi-global/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── modules/
│   │   │   ├── printing/
│   │   │   ├── retail/
│   │   │   ├── workshop/
│   │   │   ├── motorcycle/
│   │   │   ├── culinary/
│   │   │   └── travel/
│   │   ├── ai/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── router/
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── tenant/
│   │   │   ├── domain/
│   │   │   └── notification/
│   │   ├── modules/
│   │   │   ├── printing/
│   │   │   ├── retail/
│   │   │   ├── workshop/
│   │   │   ├── motorcycle/
│   │   │   ├── culinary/
│   │   │   └── travel/
│   │   ├── sockets/
│   │   └── app.js
│   └── ...
│
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── schema.sql
│
├── uploads/
├── logs/
├── .env.example
├── package.json
└── README.md
```

---

# 5. Multi-Tenant Architecture

Sistem harus mendukung banyak tenant.

Contoh tenant:

```text
Percetakan Jaya
Bengkel Maju
Toko Sejahtera
RM Nusantara
Travel Lampung
```

Setiap tenant mempunyai:

- tenant_id
- nama usaha
- slug
- jenis usaha
- logo
- alamat
- nomor telepon
- email
- status
- paket/langganan
- konfigurasi
- domain
- subdomain
- created_at
- updated_at

Data antar tenant **WAJIB terisolasi**.

Jangan sampai user Tenant A dapat melihat data Tenant B.

Semua query bisnis harus menggunakan:

```text
tenant_id
```

dan backend harus melakukan validasi tenant pada setiap request yang membutuhkan data tenant.

---

# 6. Jenis User

Implementasikan Role Based Access Control.

Role minimal:

### Super Admin

Mengelola seluruh platform Multi Global:

- tenant
- paket
- subscription
- domain
- user
- konfigurasi
- AI
- billing
- system settings
- monitoring

### Admin Tenant

Mengelola satu tenant:

- user
- produk
- pelanggan
- transaksi
- laporan
- pengaturan usaha
- AI assistant
- integrasi

### Operator

Mengelola operasional:

- input transaksi
- pesanan
- stok
- pelanggan
- status pekerjaan
- pelayanan

### CS

Mengelola komunikasi:

- live chat
- pelanggan
- pertanyaan
- follow-up
- pesanan

### Owner

Melihat:

- dashboard
- omzet
- laba
- laporan
- grafik
- AI business insight

---

# 7. Karyawan AI

Sediakan tiga pilihan Karyawan AI.

## CS AI

Tugas:

- menjawab pertanyaan pelanggan
- memberikan informasi produk
- menjawab FAQ
- menerima pesanan
- membantu booking
- memberikan informasi harga
- melakukan follow-up
- komunikasi teks
- siap dikembangkan ke voice

Contoh:

> "Halo, ada yang bisa saya bantu?"

## Operator AI

Tugas:

- membantu input data
- membantu proses pesanan
- membantu pengecekan stok
- membuat ringkasan pekerjaan
- memberikan notifikasi
- membantu pekerjaan administratif

## Admin AI

Tugas:

- membuat ringkasan laporan
- menganalisis penjualan
- memberikan business insight
- membaca KPI
- membantu administrasi
- memberikan rekomendasi berdasarkan data
- membuat laporan otomatis

AI harus memiliki konteks tenant sehingga tidak boleh mencampurkan data tenant lain.

---

# 8. Groq API

Gunakan **Groq API** sebagai provider AI.

Jangan pernah menyimpan API key di source code.

Gunakan:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
```

Jika model tersebut sudah tidak tersedia pada saat implementasi, gunakan model Groq yang tersedia dan stabil.

API key hanya berada di:

```text
.env
```

dan server-side.

JANGAN:

- expose API key ke browser
- memasukkan key ke React
- memasukkan key ke GitHub
- hard-code API key

Tambahkan:

```text
.env
.env.local
```

ke `.gitignore`.

Buat:

```text
.env.example
```

sebagai template.

Contoh:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=multi_global
DB_USER=root
DB_PASSWORD=

GROQ_API_KEY=
GROQ_MODEL=

JWT_SECRET=
SESSION_SECRET=

APP_URL=http://localhost:3000
API_URL=http://localhost:5000
```

---

# 9. Live Chat AI

Implementasikan widget chat yang selalu dapat diakses dari dashboard.

Posisi:

```text
kanan bawah layar
```

Tampilan:

```text
┌──────────────────────────────┐
│ 🤖 Multi Global AI       ×   │
├──────────────────────────────┤
│ Halo! Ada yang bisa saya     │
│ bantu?                       │
│                              │
│ Anda: Berapa penjualan hari? │
│                              │
│ AI: Total penjualan hari ini │
│ Rp 12.500.000                │
├──────────────────────────────┤
│ Tulis pesan...          ➤    │
└──────────────────────────────┘
```

Fitur:

- streaming response bila tersedia
- typing indicator
- conversation history
- clear conversation
- retry
- copy response
- timestamp
- role AI
- context tenant
- context user
- context modul
- rate limit
- logging

Gunakan Socket.IO/WebSocket untuk realtime bila diperlukan.

---

# 10. AI Context

AI harus memahami konteks aplikasi.

Contoh context:

```json
{
  "tenant_id": "tenant_001",
  "tenant_name": "Percetakan Jaya",
  "business_type": "printing",
  "user_role": "admin",
  "user_name": "Admin",
  "current_module": "orders"
}
```

AI tidak boleh mengakses data tenant lain.

Untuk pertanyaan bisnis, backend mengambil data yang relevan terlebih dahulu lalu mengirimkan context terkontrol kepada AI.

Jangan mengirim seluruh database ke model.

---

# 11. Enam Aplikasi Bisnis

## 11.1 Percetakan

Fitur:

- produk cetak
- kategori produk
- order cetak
- desain
- bahan
- stok bahan
- produksi
- finishing
- tracking order
- pelanggan
- invoice
- pembayaran
- laporan penjualan
- laporan produksi

Contoh produk:

- banner
- kartu nama
- brosur
- undangan
- stiker
- spanduk
- poster
- merchandise

---

# 12. Toko Retail / Grosir

Fitur:

- produk
- kategori
- barcode
- stok
- supplier
- pelanggan
- POS
- transaksi
- pembelian
- penjualan
- harga retail
- harga grosir
- diskon
- pembayaran
- laporan

Tambahkan:

- barcode scanner
- printer thermal support
- cetak invoice
- stok minimum
- notifikasi stok

---

# 13. Bengkel Mobil

Fitur:

- pelanggan
- kendaraan
- nomor polisi
- tipe kendaraan
- kilometer
- booking service
- antrian
- mekanik
- service
- sparepart
- stok
- riwayat kendaraan
- invoice
- pembayaran
- laporan

---

# 14. Bengkel Motor

Fitur:

- pelanggan
- motor
- nomor polisi
- tipe motor
- booking
- antrian
- mekanik
- servis
- sparepart
- stok
- riwayat servis
- invoice
- pembayaran
- laporan

---

# 15. Kuliner / UMKM / Rumah Makan

Fitur:

- menu
- kategori menu
- meja
- dine-in
- takeaway
- delivery
- order
- kitchen order
- kasir
- pelanggan
- pembayaran
- laporan
- stok bahan
- resep sederhana

Status order:

```text
Pesanan Baru
Diproses
Dimasak
Siap
Diantar
Selesai
Dibatalkan
```

---

# 16. Travel

Fitur:

- paket travel
- tujuan
- jadwal
- armada
- kursi
- driver
- booking
- pelanggan
- tiket
- pembayaran
- itinerary
- hotel
- laporan
- manifest penumpang

---

# 17. Dashboard

Dashboard harus berbeda berdasarkan role.

## Owner Dashboard

Tampilkan:

- omzet hari ini
- omzet bulan ini
- transaksi
- pelanggan baru
- laba
- produk terlaris
- grafik penjualan
- AI insight
- notifikasi

## Admin Dashboard

Tampilkan:

- transaksi
- user
- stok
- pelanggan
- laporan
- aktivitas sistem

## Operator Dashboard

Tampilkan:

- pekerjaan hari ini
- pesanan
- antrian
- tugas
- notifikasi

## CS Dashboard

Tampilkan:

- chat masuk
- pelanggan
- pesanan
- follow-up
- status pelayanan

---

# 18. Domain dan Subdomain

Sediakan pilihan:

### Subdomain Multi Global

Contoh:

```text
usahaku.multiglobal.co.id
```

atau:

```text
percetakanjaya.multiglobal.co.id
```

### Domain Sendiri

Contoh:

```text
www.percetakanjaya.com
```

atau:

```text
app.percetakanjaya.com
```

Buat tabel:

```text
domains
```

dengan minimal:

```text
id
tenant_id
domain
type
is_primary
status
ssl_status
created_at
updated_at
```

Type:

```text
SUBDOMAIN
CUSTOM_DOMAIN
```

Pada localhost, simulasi dapat menggunakan:

```text
tenant1.localhost:3000
tenant2.localhost:3000
```

atau konfigurasi hosts file Windows.

---

# 19. Subscription / Paket

Siapkan arsitektur untuk paket:

### Starter

- 1 tenant
- fitur dasar
- 1 AI employee

### Business

- fitur lengkap
- beberapa user
- 3 AI employee

### Enterprise

- custom domain
- multi user
- advanced AI
- laporan lanjutan
- API
- integrasi

Jangan mengunci implementasi terlalu keras agar paket dapat diubah dari admin.

---

# 20. Database Minimal

Buat tabel inti:

```text
users
roles
permissions
tenants
tenant_users
subscriptions
plans
domains
settings

ai_agents
ai_conversations
ai_messages

customers
products
categories
suppliers

orders
order_items
payments

inventory
inventory_movements

notifications
activity_logs

files
reports
```

Kemudian tabel khusus per modul:

```text
printing_orders
printing_productions

workshop_vehicles
workshop_services
workshop_mechanics
workshop_service_orders

motorcycle_vehicles
motorcycle_services
motorcycle_service_orders

restaurant_tables
restaurant_orders
restaurant_order_items
kitchen_orders

travel_packages
travel_schedules
travel_bookings
travel_passengers
```

Semua tabel tenant-specific harus mempunyai:

```text
tenant_id
```

jika datanya memang berada dalam scope tenant.

---

# 21. Keamanan

Implementasikan:

- password hashing
- JWT/session security
- HTTP-only cookie jika menggunakan cookie auth
- CSRF protection bila relevan
- Helmet
- CORS
- rate limiting
- input validation
- SQL injection protection
- XSS protection
- authorization middleware
- tenant isolation
- audit log
- secure file upload
- file type validation
- maximum upload size
- error handling tanpa membocorkan secret

API key AI hanya di backend.

---

# 22. Upload File

Dukung:

- logo
- foto produk
- dokumen
- desain percetakan
- bukti pembayaran

Struktur:

```text
/uploads/{tenant_id}/
```

Validasi:

- MIME type
- extension
- ukuran
- nama file aman

Jangan gunakan nama file user secara langsung sebagai path.

---

# 23. Notifikasi

Sediakan sistem notifikasi:

- stok minimum
- pesanan baru
- pembayaran
- booking
- service selesai
- pelanggan baru
- AI alert
- sistem

UI:

```text
🔔
```

dengan unread counter.

---

# 24. Responsive Design

Aplikasi wajib optimal pada:

- Desktop
- Laptop
- Tablet
- Android
- iPhone

Breakpoint:

```text
mobile
tablet
desktop
large desktop
```

Sidebar:

Desktop:

```text
Sidebar permanent
```

Mobile:

```text
Drawer / bottom navigation
```

Tabel harus responsive menggunakan:

- horizontal scroll
- card mode
- responsive columns

---

# 25. Landing Page

Buat landing page Multi Global berdasarkan desain referensi.

Hero:

> **Kelola Semua Usaha Dalam Satu Platform**

Subheadline:

> Sistem aplikasi modern, mudah digunakan, dan didukung Karyawan AI yang siap membantu bisnis Anda 24/7.

Highlight:

```text
6 APLIKASI
1 PLATFORM
TAK TERBATAS
```

Tampilkan:

- logo Multi Global
- dashboard preview
- mobile preview
- Karyawan AI
- CS AI
- Operator AI
- Admin AI
- pilihan domain
- enam kategori bisnis
- CTA

CTA:

> **Wujudkan Bisnis Digital Anda Bersama Multi Global**

---

# 26. Enam Kartu Aplikasi

Landing page harus menampilkan enam kartu:

### 1. Percetakan

Kelola pesanan cetak, desain, produksi, dan finishing.

### 2. Toko Retail / Grosir

Kelola penjualan retail dan grosir, stok, dan pelanggan.

### 3. Bengkel Mobil

Kelola servis, sparepart, mekanik, dan kendaraan.

### 4. Bengkel Motor

Kelola servis motor, sparepart, antrian, dan pelanggan.

### 5. Kuliner / UMKM

Kelola menu, meja, pesanan, kasir, dan penjualan.

### 6. Travel

Kelola paket travel, booking, tiket, pelanggan, dan perjalanan.

---

# 27. Pilihan Karyawan AI

Pada saat membuat tenant, tampilkan wizard:

```text
Pilih Karyawan AI

☑ CS AI
☑ Operator AI
☑ Admin AI
```

User dapat:

- memilih satu
- memilih dua
- memilih semua

Setiap AI memiliki konfigurasi:

```text
nama AI
avatar
gaya komunikasi
bahasa
jam aktif
instruksi khusus
```

---

# 28. Wizard Pembuatan Tenant

Flow:

```text
1. Pilih jenis usaha
2. Masukkan nama usaha
3. Upload logo
4. Masukkan alamat
5. Pilih Karyawan AI
6. Pilih Subdomain / Domain
7. Pilih paket
8. Konfirmasi
9. Tenant dibuat
10. Masuk Dashboard
```

---

# 29. REST API

Gunakan struktur:

```text
/api/auth
/api/tenants
/api/users
/api/domains
/api/subscriptions
/api/dashboard

/api/ai/chat
/api/ai/conversations
/api/ai/agents

/api/printing
/api/retail
/api/workshop
/api/motorcycle
/api/culinary
/api/travel

/api/products
/api/customers
/api/orders
/api/payments
/api/reports
/api/notifications
```

Semua endpoint harus mempunyai authorization yang sesuai.

---

# 30. AI API Endpoint

Contoh:

```http
POST /api/ai/chat
```

Request:

```json
{
  "agent": "cs",
  "message": "Berapa harga produk A?",
  "conversationId": "..."
}
```

Backend:

1. autentikasi user
2. identifikasi tenant
3. identifikasi role
4. identifikasi AI agent
5. ambil data relevan
6. buat system prompt
7. panggil Groq API
8. simpan conversation
9. kirim response ke frontend

---

# 31. System Prompt AI

Gunakan konsep:

```text
Anda adalah Karyawan AI Multi Global.

Anda bekerja untuk tenant:
{{tenant_name}}

Jenis usaha:
{{business_type}}

Role:
{{user_role}}

Anda hanya boleh menggunakan informasi yang tersedia
untuk tenant ini.

Jangan mengarang data transaksi.

Jika informasi tidak tersedia,
katakan bahwa data tersebut belum tersedia.

Jaga kerahasiaan data bisnis.

Gunakan Bahasa Indonesia yang jelas,
sopan, singkat, dan membantu.
```

Tambahkan instruksi berbeda untuk:

```text
CS AI
Operator AI
Admin AI
```

---

# 32. Logging AI

Simpan:

```text
ai_conversations
ai_messages
token_usage
model
response_time
status
```

Jangan menyimpan API key.

---

# 33. Localhost Windows

Aplikasi harus mudah dijalankan oleh developer Windows.

Persyaratan:

```text
Node.js LTS
MySQL 8+
Git
npm
```

Contoh:

```bash
git clone <repository>
cd multi-global

npm install
```

Buat database:

```sql
CREATE DATABASE multi_global;
```

Copy:

```text
.env.example
```

menjadi:

```text
.env
```

Isi:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=multi_global
DB_USER=root
DB_PASSWORD=
GROQ_API_KEY=
```

Kemudian:

```bash
npm run migrate
npm run seed
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:5000
```

---

# 34. Scripts

Siapkan:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "nodemon server/src/app.js",
    "client:dev": "vite --config client/vite.config.js",
    "build": "npm run client:build",
    "client:build": "vite build --config client/vite.config.js",
    "start": "node server/src/app.js",
    "migrate": "...",
    "seed": "..."
  }
}
```

Jika struktur package berbeda, sesuaikan tanpa menghilangkan fungsi tersebut.

---

# 35. Seed Data

Buat demo tenant:

```text
Percetakan Jaya
Toko Sejahtera
Bengkel Maju
Bengkel Motor 88
RM Nusantara
Travel Lampung
```

Buat demo user:

```text
superadmin
admin
operator
cs
owner
```

Gunakan password demo yang aman untuk development dan dokumentasikan bahwa password tersebut hanya untuk localhost.

---

# 36. UX

Gunakan:

- loading skeleton
- toast notification
- confirmation modal
- empty state
- error state
- success state
- pagination
- search
- filter
- sorting
- date range
- export CSV/PDF jika relevan

Jangan membuat UI terlalu padat.

Prioritaskan:

```text
jelas
cepat
modern
mudah dipahami
mobile friendly
```

---

# 37. Dashboard Visual

Gunakan komponen:

```text
Stat Card
Revenue Chart
Sales Chart
Recent Orders
Top Products
Customer Growth
AI Insight
Notification
Quick Actions
```

Contoh:

```text
Total Penjualan
Rp 12.500.000
↑ 12.5%

Transaksi
128
↑ 8.7%

Pelanggan
820
↑ 15.3%
```

---

# 38. AI Insight

Admin AI/Owner AI dapat menghasilkan:

```text
Ringkasan Penjualan
Produk Terlaris
Produk Lambat
Pelanggan Aktif
Tren Penjualan
Anomali
Rekomendasi
```

Contoh:

> Penjualan minggu ini meningkat dibanding minggu sebelumnya. Produk A menjadi produk dengan transaksi tertinggi.

AI tidak boleh membuat klaim angka yang tidak berasal dari data aktual.

---

# 39. Dark Mode

Pastikan semua komponen mendukung dark mode:

- sidebar
- navbar
- card
- table
- modal
- form
- chart
- chat
- dropdown
- notification
- login
- landing page

Gunakan Tailwind `dark:` atau sistem theme yang konsisten.

Jangan menggunakan warna hard-coded yang menyebabkan teks sulit dibaca.

---

# 40. Accessibility

Minimal:

- semantic HTML
- keyboard navigation
- focus state
- aria-label
- contrast yang baik
- ukuran tombol mobile yang cukup
- form label
- error message yang jelas

---

# 41. Performance

Optimalkan:

- lazy loading
- code splitting
- pagination
- database index
- query optimization
- caching bila diperlukan
- kompresi response
- image optimization

Jangan melakukan query database berulang yang tidak diperlukan.

---

# 42. Backup

Siapkan mekanisme backup MySQL:

```text
/backups
```

Dokumentasikan perintah Windows:

```bash
mysqldump -u root -p multi_global > backup.sql
```

Restore:

```bash
mysql -u root -p multi_global < backup.sql
```

---

# 43. Dokumentasi

Buat:

```text
README.md
INSTALL-WINDOWS.md
API.md
DATABASE.md
AI.md
DEPLOYMENT.md
```

README harus menjelaskan:

- requirement
- instalasi
- MySQL
- `.env`
- Groq API
- migration
- seed
- menjalankan localhost
- troubleshooting

---

# 44. Environment Development

Pastikan project dapat berjalan tanpa domain publik.

Mode development:

```text
localhost
```

Mode production:

```text
domain sendiri
subdomain
HTTPS
```

Pisahkan konfigurasi:

```text
development
production
```

---

# 45. Domain Routing

Implementasikan konsep tenant resolution:

```text
Request
   ↓
Host / Domain
   ↓
Resolve Tenant
   ↓
Authentication
   ↓
Authorization
   ↓
Tenant Context
   ↓
Controller
   ↓
Service
   ↓
Database
```

Contoh:

```text
percetakanjaya.multiglobal.co.id
```

resolve menjadi:

```text
tenant_id = 001
```

Untuk localhost:

```text
percetakanjaya.localhost:3000
```

dapat digunakan sebagai simulasi.

---

# 46. Jangan Membuat Overengineering

Prioritaskan MVP yang benar-benar dapat berjalan.

Tahap pertama:

```text
Authentication
Multi Tenant
Dashboard
6 Modul
CRUD
MySQL
AI Chat Groq
Light/Dark Mode
Responsive
Subdomain Simulation
```

Tahap berikutnya:

```text
Voice AI
WhatsApp
Telegram
Payment Gateway
Custom Domain Automation
Subscription Billing
Advanced Analytics
Mobile App
```

---

# 47. Acceptance Criteria

Project dianggap berhasil jika:

- [ ] dapat berjalan di Windows localhost
- [ ] Node.js berhasil start
- [ ] MySQL berhasil terkoneksi
- [ ] migration berhasil
- [ ] seed berhasil
- [ ] login berhasil
- [ ] multi-tenant berhasil
- [ ] tenant tidak dapat mengakses data tenant lain
- [ ] 6 modul tersedia
- [ ] CRUD berjalan
- [ ] dashboard responsive
- [ ] Light Mode berjalan
- [ ] Dark Mode berjalan
- [ ] live chat tersedia
- [ ] Groq API dapat digunakan melalui backend
- [ ] API key tidak terekspos ke frontend
- [ ] CS AI tersedia
- [ ] Operator AI tersedia
- [ ] Admin AI tersedia
- [ ] subdomain simulation tersedia
- [ ] custom domain architecture tersedia
- [ ] notification tersedia
- [ ] audit log tersedia
- [ ] dokumentasi Windows tersedia

---

# 48. Instruksi Implementasi untuk AI Developer

Saat membangun project ini:

1. Analisis requirement terlebih dahulu.
2. Buat struktur project.
3. Buat database schema.
4. Buat migration.
5. Buat seed data.
6. Buat backend Express.
7. Buat authentication.
8. Buat multi-tenant middleware.
9. Buat RBAC.
10. Buat frontend.
11. Buat dashboard.
12. Buat enam modul bisnis.
13. Buat AI service Groq.
14. Buat CS AI.
15. Buat Operator AI.
16. Buat Admin AI.
17. Buat live chat.
18. Buat theme system.
19. Buat domain/subdomain resolver.
20. Buat notification.
21. Buat audit log.
22. Buat responsive UI.
23. Jalankan test.
24. Perbaiki error.
25. Buat dokumentasi.
26. Pastikan aplikasi benar-benar dapat dijalankan di Windows localhost.

Jangan hanya membuat mockup.

Semua fitur utama harus memiliki:

```text
Frontend
↓
REST API
↓
Service
↓
Database
```

dan AI:

```text
Frontend Chat
↓
Backend /api/ai/chat
↓
Tenant Context
↓
Business Data
↓
Groq API
↓
AI Response
↓
Database Conversation
↓
Frontend
```

---

# 49. Prinsip Utama

**Multi Global bukan sekadar template dashboard.**

Bangun sebagai platform SaaS modular yang nantinya dapat berkembang menjadi:

```text
Multi Global
│
├── Percetakan
├── Retail / Grosir
├── Bengkel Mobil
├── Bengkel Motor
├── Kuliner / UMKM
└── Travel
       │
       ├── CS AI
       ├── Operator AI
       └── Admin AI
```

Target akhirnya:

> **Satu akun, satu platform, banyak jenis usaha, banyak tenant, dapat menggunakan subdomain atau domain sendiri, dan memiliki Karyawan AI yang membantu operasional bisnis 24/7.**
