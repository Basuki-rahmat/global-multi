import { env } from '../config/env.js'

const buildSystemPrompt = (tenantId) => `Anda adalah CS AI Multi Global, asisten layanan pelanggan digital yang ramah, sopan, proaktif, dan sangat menguasai seluruh ekosistem platform Multi Global.

PENGETAHUAN PLATFORM MULTI GLOBAL:
1. PRODUK & APLIKASI TERSEDIA:
   - Percetakan: Kelola order cetak, desain, produksi, & finishing.
   - Retail / Grosir: Kasir POS, pencetakan barcode, & manajemen stok real-time.
   - Bengkel Mobil: Booking servis online, pengelolaan sparepart, & riwayat kendaraan.
   - Bengkel Motor: Antrian digital, stok sparepart, & transaksi kasir.
   - Kuliner / UMKM: Manajemen menu & meja, kitchen order system, & kasir.
   - Travel: Booking tiket, jadwal perjalanan, & manifest penumpang.

2. KARYAWAN AI (EKOSISTEM 24/7):
   - CS AI: Menjawab pertanyaan, menerima pesanan, & follow-up otomatis.
   - Operator AI: Membantu input data, cek stok & pesanan, serta ringkasan pekerjaan.
   - Admin AI: Analisis data penjualan, laporan otomatis, & rekomendasi keputusan bisnis.

3. DOMAIN & HOSTING:
   - Subdomain Gratis: usahaku.multiglobal.co.id
   - Domain Sendiri: www.usahaku.com (rekomendasi untuk profesionalitas)
   - Partner Hosting Resmi: Klikhost (https://billing.klikhost.com/aff.php?aff=1288)

PANDUAN KEPRIBADIAN CS AI:
- Berikan jawaban yang SINGKAT, JELAS, TEPAT, dan TO THE POINT (maksimal 2-3 paragraf pendek atau poin ringkas). Jangan bertele-tele.
- Gunakan Bahasa Indonesia yang ramah, profesional, dan solutif.
- Bantu calon pengguna memilih aplikasi/fitur yang sesuai kebutuhan bisnis mereka.
- Arahkan ke tombol "Pesan Sekarang" jika calon pelanggan siap memulai.
- Tenant ID aktif: ${tenantId}.`

const knowledgeBase = [
  {
    keywords: ['karyawan ai', 'cara penggunaan', 'menggunakan ai', 'cara kerja ai', 'cara kerja', 'bagaimana cara', 'bagaimana kerjanya', 'guna ai', 'fungsi ai', 'asisten ai', 'pakai ai'],
    answer: 'Platform Multi Global bekerja secara terintegrasi:\n\n1. Pilih Aplikasi Bisnis yang sesuai (Percetakan, Retail, Bengkel, Kuliner, atau Travel).\n2. Aktifkan Karyawan AI (CS AI melayani pembeli & pesanan 24/7, Operator AI membantu stok & operasional, Admin AI merangkum laporan & strategi bisnis).\n3. Sambungkan Domain Anda (Subdomain gratis atau Domain sendiri via Klikhost).\n\nSemua fitur dikelola dari 1 Dashboard terpadu yang mudah dan cepat!'
  },
  {
    keywords: ['percetakan', 'cetak'],
    answer: 'Aplikasi Percetakan Multi Global dilengkapi kalkulator harga cetak otomatis, kelola antrian desain, estimasi waktu produksi, hingga finishing dan pengiriman.'
  },
  {
    keywords: ['retail', 'grosir', 'toko', 'pos', 'kasir'],
    answer: 'Aplikasi Retail & Grosir mencakup Sistem Kasir POS modern, cetak/scan barcode produk, kelola harga grosir bertingkat, serta pemantauan stok otomatis.'
  },
  {
    keywords: ['bengkel mobil', 'mobil'],
    answer: 'Aplikasi Bengkel Mobil menyediakan fitur booking servis online, stok sparepart & oli, pembagian kerja mekanik, serta riwayat perawatan kendaraan pelanggan.'
  },
  {
    keywords: ['bengkel motor', 'motor'],
    answer: 'Aplikasi Bengkel Motor memiliki fitur nomor antrean digital, sistem kasir cepat sparepart, serta pengingat jadwal servis berkala ke WhatsApp pelanggan.'
  },
  {
    keywords: ['kuliner', 'umkm', 'resto', 'cafer', 'makanan', 'meja'],
    answer: 'Aplikasi Kuliner / UMKM dilengkapi manajemen meja & QR menu, Kitchen Order Display (KOD) ke dapur, serta kasir terintegrasi.'
  },
  {
    keywords: ['travel', 'tiket', 'tour'],
    answer: 'Aplikasi Travel memudahkan pemesanan tiket perjalanan online, kelola jadwal armada/tour, serta cetak manifest penumpang otomatis.'
  },
  {
    keywords: ['domain', 'website', 'klikhost', 'hosting'],
    answer: 'Anda mendapatkan Subdomain gratis (usahaku.multiglobal.co.id) atau bisa menggunakan Domain Sendiri (.com / .id) melalui integrasi resmi dengan Klikhost.'
  },
  {
    keywords: ['mulai', 'daftar', 'cara pesan', 'harga', 'gratis'],
    answer: 'Anda bisa mulai secara Gratis! Klik tombol "Mulai Sekarang" atau "Pesan Sekarang" di menu utama untuk memilih paket aplikasi dan domain bisnis Anda.'
  },
  {
    keywords: ['admin owner', 'admin penyedia', 'admin platform', 'owner admin', 'admin aplikasi', 'login admin', 'admin'],
    answer: 'Admin yang dimaksud di sini adalah Admin Owner Penyedia Aplikasi (pemilik platform Multi Global), bukan admin tenant. Tugasnya mengelola seluruh tenant, paket, domain, dan terutama PESANAN PEMBUATAN APLIKASI yang masuk dari calon pengguna. Admin tenant hanya mengelola data di dalam tenant-nya sendiri. Untuk masuk, pilih "Masuk" lalu minta CS AI membuka form Login Admin Multi Global.'
  },
  {
    keywords: ['pesanan pembuatan aplikasi', 'pesanan aplikasi', 'order aplikasi', 'daftar pesanan', 'status pesanan', 'approval'],
    answer: 'Pesanan pembuatan aplikasi dikirim saat Anda menekan tombol "Pesan Sekarang" pada salah satu kartu aplikasi. Setiap pesanan punya kode MG-XXXX dan status: PENDING, CONTACTED, APPROVED, atau REJECTED. Semua pesanan tersebut dikelola oleh Admin Owner Penyedia Aplikasi Multi Global.'
  },
]

const knowledgeBaseReply = (message) => {
  const query = message.toLowerCase()
  const found = knowledgeBase.find((item) => item.keywords.some((keyword) => query.includes(keyword)))
  return found
    ? found.answer
    : 'Halo! Saya CS AI Multi Global. Saya siap membantu Anda mengenai 6 Aplikasi Bisnis (Percetakan, Retail, Bengkel Mobil, Bengkel Motor, Kuliner, Travel), 3 Karyawan AI (CS, Operator, Admin), serta pengaturan Domain bisnis Anda. Apa yang ingin Anda tanyakan?'
}

// Rantai cadangan: Groq (utama) -> OpenAI (cadangan, key dirotasi) -> knowledge base lokal
const groqProviders = env.groqApiKey
  ? [{ name: 'groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, model: env.groqModel }]
  : []

const openaiKeyTotal = env.openaiApiKeys.length
let openaiKeyCursor = 0

const ROTATABLE_STATUS = new Set([401, 403, 429])

const isRotatableFailure = (err) => !err.status || err.status >= 500 || ROTATABLE_STATUS.has(err.status)

function openaiProviders() {
  if (!openaiKeyTotal) return []
  return Array.from({ length: openaiKeyTotal }, (_unused, offset) => {
    const keyIndex = (openaiKeyCursor + offset) % openaiKeyTotal
    return { name: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: env.openaiApiKeys[keyIndex], model: env.openaiModel, keyIndex }
  })
}

async function askAiProvider(provider, system, message) {
  const result = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    }),
  })

  if (!result.ok) {
    const error = new Error(`${result.status} ${await result.text()}`)
    error.status = result.status
    throw error
  }

  const payload = await result.json()
  return payload.choices?.[0]?.message?.content || ''
}

export async function replyToCustomer(message, tenantId) {
  const providers = [...groqProviders, ...openaiProviders()]

  if (!providers.length) {
    return {
      mode: 'demo',
      message: 'Mode demo aktif. Tambahkan GROQ_API_KEY atau OPENAI_API_KEYS di file .env untuk mengaktifkan Karyawan AI.',
    }
  }

  const system = buildSystemPrompt(tenantId)

  for (const provider of providers) {
    try {
      const answer = await askAiProvider(provider, system, message)
      if (answer) return { mode: provider.name, message: answer }
      console.warn(`[ai] ${provider.name} tidak mengembalikan isi jawaban.`)
    } catch (err) {
      if (provider.name === 'openai' && isRotatableFailure(err)) {
        openaiKeyCursor = (provider.keyIndex + 1) % openaiKeyTotal
        console.warn(`[ai] OpenAI key #${provider.keyIndex + 1} bermasalah, key berikutnya dipakai untuk request ini dan request selanjutnya.`)
      }
      console.error(`[ai] ${provider.name} gagal, mencoba provider berikutnya:`, err.message)
    }
  }

  return { mode: 'knowledge-base', message: knowledgeBaseReply(message) }
}
