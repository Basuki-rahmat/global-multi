import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight,
  Activity,
  BarChart3,
  Building2,
  Bell,
  Bot,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  Cloud,
  Code2,
  Command,
  CreditCard,
  Database,
  ExternalLink,
  Globe2,
  Headphones,
  History,
  Inbox,
  KeyRound,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Package,
  Palette,
  PanelLeft,
  Send,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
  Zap,
} from 'lucide-react'
import './styles.css'

// Default kosong = pakai origin yang sedang dipakai browser, sehingga request
// lewat proxy Vite dev (atau backend production yang menyajikan frontend).
// localhost:5000 hanya benar di mesin developer; lewat tunnel publik itu salah
// karena browser pengunjung tidak punya localhost. Isi VITE_API_URL hanya bila
// backend memang di-host terpisah, mis. tunnel kedua untuk port 5000.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const APP_ORDER_STATUS = {
  PENDING: { label: 'Menunggu', tone: 'pending' },
  CONTACTED: { label: 'Sudah Dihubungi', tone: 'contacted' },
  APPROVED: { label: 'Disetujui', tone: 'approved' },
  REJECTED: { label: 'Ditolak', tone: 'rejected' },
}

const PLATFORM_ADMIN_ROLE = 'SUPER_ADMIN'
const PLATFORM_SCOPE_LABEL = 'Seluruh platform (semua tenant)'

const THEME_MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

function usePrefersDarkScheme() {
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return undefined
    const handleChange = (event) => setPrefersDark(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return prefersDark
}

// Satu sumber kebenaran tema untuk landing page dan dashboard admin.
// 'system' mengikuti preferensi perangkat dan ikut berubah realtime.
function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('multi-global-theme')
    return THEME_MODES.some((mode) => mode.id === saved) ? saved : 'light'
  })
  const prefersDark = usePrefersDarkScheme()
  const isDark = theme === 'system' ? prefersDark : theme === 'dark'

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    localStorage.setItem('multi-global-theme', theme)
    localStorage.setItem('multi-global-theme-resolved', isDark ? 'dark' : 'light')
  }, [theme, isDark])

  return { theme, setTheme, isDark }
}

function ThemeSwitcher({ theme, onChange, variant = 'segmented' }) {
  if (variant === 'icon') {
    const currentIndex = Math.max(THEME_MODES.findIndex((mode) => mode.id === theme), 0)
    const current = THEME_MODES[currentIndex]
    const next = THEME_MODES[(currentIndex + 1) % THEME_MODES.length]
    const Icon = current.icon
    return <button className="theme-toggle" type="button" onClick={() => onChange(next.id)} aria-label={`Tema saat ini ${current.label}. Klik untuk beralih ke ${next.label}`} title={`Tema: ${current.label}`}><Icon size={17} /></button>
  }

  return <div className="admin-theme-switch" role="group" aria-label="Mode tema tampilan">
    {THEME_MODES.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={theme === id ? 'is-active' : ''} aria-pressed={theme === id} onClick={() => onChange(id)} title={label}><Icon size={15} /><span>{label}</span></button>)}
  </div>
}

const ADMIN_MENU = [
  {
    label: 'Utama',
    items: [
      { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard, description: 'Kondisi platform Multi Global hari ini.' },
    ],
  },
  {
    label: 'Penyediaan Layanan',
    items: [
      { id: 'app-orders', label: 'Pesanan Pembuatan Aplikasi', icon: Inbox, description: 'Proses pesanan dari calon pengguna.', badge: 'pending' },
      { id: 'tenants', label: 'Tenant', icon: Building2, description: 'Semua tenant yang terdaftar di platform.' },
      { id: 'plans', label: 'Paket & Langganan', icon: CreditCard, description: 'Paket Starter, Business, dan Enterprise.' },
      { id: 'domains', label: 'Domain', icon: Globe2, description: 'Subdomain Multi Global dan domain sendiri.' },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { id: 'notifications', label: 'Notifikasi', icon: Bell, description: 'Peringatan stok, pesanan, dan sistem.' },
      { id: 'activity', label: 'Log Aktivitas', icon: History, description: 'Audit trail perubahan data platform.' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { id: 'ai', label: 'Karyawan AI', icon: Bot, description: 'CS AI, Operator AI, dan Admin AI.' },
      { id: 'settings', label: 'Pengaturan Sistem', icon: Settings2, description: 'Konfigurasi provider AI dan platform.' },
    ],
  },
]

const ADMIN_VIEWS = ADMIN_MENU.flatMap((group) => group.items)

function readAdminView() {
  const requested = new URLSearchParams(window.location.search).get('view')
  return ADMIN_VIEWS.some((view) => view.id === requested) ? requested : 'overview'
}

function parseFeatures(features) {
  if (Array.isArray(features)) return features
  if (typeof features !== 'string') return []
  try {
    const parsed = JSON.parse(features)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeWhatsapp(whatsapp) {
  return String(whatsapp || '').replace(/[^0-9]/g, '').replace(/^0/, '62')
}

const DAY_MS = 86400000
const CHART_TONES = ['blue', 'green', 'orange', 'purple', 'cyan', 'coral']

const APPLICATION_TONES = {
  Percetakan: 'coral',
  'Retail / Grosir': 'blue',
  'Bengkel Mobil': 'orange',
  'Bengkel Motor': 'green',
  'Kuliner / UMKM': 'purple',
  Travel: 'cyan',
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function buildDailySeries(orders, days) {
  const today = startOfDay(Date.now()).getTime()
  const buckets = new Map()
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = today - offset * DAY_MS
    buckets.set(key, { key, label: new Date(key).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), value: 0 })
  }
  orders.forEach((order) => {
    const key = startOfDay(order.createdAt).getTime()
    const bucket = buckets.get(key)
    if (bucket) bucket.value += 1
  })
  return [...buckets.values()]
}

function countSince(orders, days) {
  const cutoff = Date.now() - days * DAY_MS
  return orders.filter((order) => new Date(order.createdAt).getTime() >= cutoff).length
}

function growthPercent(current, previous) {
  if (!previous) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function groupCounts(items, keyOf) {
  const counts = new Map()
  items.forEach((item) => {
    const key = keyOf(item)
    if (!key) return
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()].map(([label, value], index) => ({ label, value, tone: CHART_TONES[index % CHART_TONES.length] })).sort((a, b) => b.value - a.value)
}

function useCountUp(value, duration = 850) {
  const [display, setDisplay] = useState(0)
  const currentRef = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      currentRef.current = value
      setDisplay(value)
      return undefined
    }
    const from = currentRef.current
    const startedAt = performance.now()
    let frame
    const animate = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      const next = from + (value - from) * eased
      currentRef.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return display
}

function Sparkline({ points, tone = 'blue' }) {
  if (points.length < 2 || points.every((point) => point === 0)) return <div className={`admin-spark is-flat ${tone}`} aria-hidden="true" />
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = 100 / (points.length - 1)
  const coords = points.map((point, index) => [index * step, 27 - ((point - min) / range) * 23])
  const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const gradientId = `spark-${tone}-${points.length}-${points[points.length - 1]}`

  return <svg className={`admin-spark ${tone}`} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="currentColor" stopOpacity=".28" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={`${line} L100,30 L0,30 Z`} fill={`url(#${gradientId})`} stroke="none" />
    <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function AdminStatCard({ icon: Icon, tone, label, value, suffix = '', delta, deltaLabel, series, note }) {
  const animated = useCountUp(value)
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'

  return <article className="admin-kpi">
    <div className="admin-kpi-head">
      <span className={`admin-metric-icon ${tone}-icon`}><Icon size={18} /></span>
      <span className={`admin-kpi-delta ${direction}`}>
        {direction !== 'flat' && (direction === 'up' ? '▲' : '▼')} {Math.abs(delta)}%
      </span>
    </div>
    <small>{label}</small>
    <div className="admin-kpi-value">{Math.round(animated).toLocaleString('id-ID')}{suffix}</div>
    <em>{deltaLabel}{note ? ` · ${note}` : ''}</em>
    <Sparkline points={series} tone={tone} />
  </article>
}

function AdminTrendChart({ series }) {
  const max = Math.max(...series.map((point) => point.value), 1)
  const total = series.reduce((sum, point) => sum + point.value, 0)
  const peak = series.reduce((best, point) => (point.value > best.value ? point : best), series[0])
  const animatedPeak = useCountUp(peak.value, 900)

  return <section className="admin-chart-card admin-chart-wide">
    <header className="admin-chart-head">
      <div><h2>Permintaan 14 Hari Terakhir</h2><p>Jumlah Pesanan Pembuatan Aplikasi per hari, langsung dari data pesanan.</p></div>
      <div className="admin-chart-headline"><b>{total}</b><span>pesanan</span></div>
    </header>
    <div className="admin-trend" role="img" aria-label={`Permintaan 14 hari, total ${total} pesanan, tertinggi ${peak.value} pada ${peak.label}`}>
      {series.map((point, index) => <div className="admin-trend-col" key={point.key} title={`${point.label}: ${point.value} pesanan`}>
        <div className="admin-trend-bar" style={{ height: `${Math.max((point.value / max) * 100, point.value ? 6 : 2)}%`, animationDelay: `${index * 45}ms` }}><span>{point.value || ''}</span></div>
        <small>{index % 2 === 0 ? point.label : ''}</small>
      </div>)}
    </div>
    <footer className="admin-chart-foot">
      <span><i className="dot blue" /> Total 14 hari <b>{total}</b></span>
      <span><i className="dot green" /> Puncak <b>{Math.round(animatedPeak)}</b> ({peak.label})</span>
      <span><i className="dot orange" /> Rata-rata <b>{(total / series.length).toFixed(1)}</b>/hari</span>
    </footer>
  </section>
}

function AdminDonut({ segments, centerLabel, centerValue }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const animatedValue = useCountUp(centerValue, 900)

  return <section className="admin-chart-card">
    <header className="admin-chart-head"><div><h2>{centerLabel}</h2><p>Komposisi data saat ini.</p></div></header>
    <div className="admin-donut-wrap">
      <svg className="admin-donut" viewBox="0 0 100 100" role="img" aria-label={`${centerLabel}: ${total} total`}>
        <circle className="admin-donut-track" cx="50" cy="50" r={radius} />
        {total > 0 && segments.map((segment) => {
          const length = (segment.value / total) * circumference
          const dash = `${length} ${circumference - length}`
          const currentOffset = offset
          offset += length
          return <circle key={segment.label} className={`admin-donut-seg ${segment.tone}`} cx="50" cy="50" r={radius} strokeDasharray={dash} strokeDashoffset={-currentOffset} />
        })}
      </svg>
      <div className="admin-donut-center"><b>{Math.round(animatedValue).toLocaleString('id-ID')}</b><span>{centerLabel}</span></div>
    </div>
    <ul className="admin-legend">
      {segments.map((segment) => <li key={segment.label}><i className={`dot ${segment.tone}`} /><span>{segment.label}</span><b>{segment.value}</b></li>)}
      {total === 0 && <li className="admin-legend-empty">Belum ada data untuk ditampilkan.</li>}
    </ul>
  </section>
}

function AdminBarList({ items, emptyText, unit = 'pesanan' }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return <section className="admin-chart-card">
    <ul className="admin-barlist">
      {items.length === 0 && <li className="admin-legend-empty">{emptyText}</li>}
      {items.map((item) => <li key={item.label}>
        <div className="admin-barlist-head"><span>{item.label}</span><b>{item.value} <em>{unit}</em></b></div>
        <div className="admin-barlist-track"><i className={item.tone} style={{ width: `${(item.value / max) * 100}%` }} /></div>
        <small>{total ? Math.round((item.value / total) * 100) : 0}% dari total</small>
      </li>)}
    </ul>
  </section>
}

const appCards = [
  { number: '01', title: 'Percetakan', copy: 'Kelola pesanan cetak, desain, produksi, dan finishing.', icon: Palette, color: 'coral', image: '/assets/percetakan.webp', features: ['Order cetak', 'Produksi & finishing'] },
  { number: '02', title: 'Retail / Grosir', copy: 'Penjualan, stok, pelanggan, dan laporan dalam satu tempat.', icon: Package, color: 'blue', image: '/assets/retail.webp', features: ['POS & barcode', 'Stok real-time'] },
  { number: '03', title: 'Bengkel Mobil', copy: 'Servis, sparepart, mekanik, dan riwayat kendaraan.', icon: Settings2, color: 'yellow', image: '/assets/bengkel-mobil.webp', features: ['Booking servis', 'Riwayat kendaraan'] },
  { number: '04', title: 'Bengkel Motor', copy: 'Antrian servis, stok, pelanggan, dan pembayaran.', icon: Zap, color: 'green', image: '/assets/motor.webp', features: ['Antrian digital', 'Sparepart & kasir'] },
  { number: '05', title: 'Kuliner / UMKM', copy: 'Menu, meja, pesanan, kasir, dan penjualan.', icon: Command, color: 'purple', image: '/assets/kuliner.webp', features: ['Menu & meja', 'Kitchen order'] },
  { number: '06', title: 'Travel', copy: 'Paket perjalanan, booking, tiket, dan manifest.', icon: Globe2, color: 'cyan', image: '/assets/travel.webp', features: ['Booking tiket', 'Manifest penumpang'] },
]

const aiCards = [
  { 
    title: 'CS AI', 
    copy: 'Melayani pelanggan dengan cepat dan ramah.', 
    icon: Headphones, 
    color: 'peach', 
    image: '/assets/cs-ai.png', 
    features: ['Menjawab pertanyaan', 'Menerima pesanan', 'Follow-up otomatis'] 
  },
  { 
    title: 'Operator AI', 
    copy: 'Membantu operasional bisnis setiap hari.', 
    icon: Layers3, 
    color: 'sky', 
    image: '/assets/operator-ai.png', 
    features: ['Membantu input data', 'Cek stok & pesanan', 'Ringkasan pekerjaan'] 
  },
  { 
    title: 'Admin AI', 
    copy: 'Mengubah data menjadi insight bisnis.', 
    icon: BarChart3, 
    color: 'lime', 
    image: '/assets/admin-ai.png', 
    features: ['Analisis penjualan', 'Laporan otomatis', 'Rekomendasi bisnis'] 
  },
]

const productFeatures = {
  Percetakan: ['Percetakan', 'Order Cetak', 'Desain & Produksi', 'Finishing'],
  'Retail / Grosir': ['Toko', 'POS & Kasir', 'Stok Produk', 'Harga Grosir'],
  'Bengkel Mobil': ['Bengkel Mobil', 'Booking Servis', 'Sparepart', 'Riwayat Kendaraan'],
  'Bengkel Motor': ['Bengkel Motor', 'Antrian Servis', 'Sparepart', 'Riwayat Servis'],
  'Kuliner / UMKM': ['Kuliner', 'Menu & Meja', 'Kitchen Order', 'Kasir'],
  Travel: ['Travel', 'Booking Tiket', 'Jadwal Perjalanan', 'Manifest Penumpang'],
}

function Logo() {
  return (
    <a className="logo" href="#home" aria-label="Multi Global home">
      <span className="logo-mark"><Command size={18} strokeWidth={3} /></span>
      <span>Multi<span>Global</span></span>
    </a>
  )
}

function DashboardPreview() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % 2)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="preview-wrap" role="region" aria-roledescription="carousel" aria-label="Preview Multi Global">
      <div className="preview-glow" />
      <div className={`dashboard-window ${activeSlide === 1 ? 'plan-active' : ''}`}>
        <div className="window-topbar"><span /><span /><span /><div className="window-url">app.multiglobal.co.id/{activeSlide === 0 ? 'dashboard' : 'overview'}</div></div>
        {activeSlide === 0 ? <div className="dashboard-body" role="group" aria-roledescription="slide" aria-label="Slide 1 dari 2: Dashboard">
          <aside className="mini-sidebar">
            <div className="mini-brand"><span className="mini-mark"><Command size={10} /></span><b>Multi</b></div>
            <div className="mini-nav active"><PanelLeft size={12} /> Dashboard</div>
            <div className="mini-nav"><Package size={12} /> Produk</div>
            <div className="mini-nav"><Users size={12} /> Pelanggan</div>
            <div className="mini-nav"><BarChart3 size={12} /> Laporan</div>
            <div className="mini-nav"><Settings2 size={12} /> Pengaturan</div>
            <div className="mini-user"><span>AD</span><small>Admin Demo</small></div>
          </aside>
          <main className="mini-main">
            <div className="mini-heading"><div><small>Selamat datang kembali,</small><strong>Admin Demo 👋</strong></div><div className="mini-icons"><span>⌕</span><span>◔</span><span className="avatar">AD</span></div></div>
            <div className="mini-stats">
              <div className="mini-stat"><span>Omzet hari ini</span><b>Rp 12.500.000</b><em>↗ 12.5%</em><div className="spark blue-spark" /></div>
              <div className="mini-stat"><span>Transaksi</span><b>128</b><em>↗ 8.7%</em><div className="spark green-spark" /></div>
              <div className="mini-stat"><span>Pelanggan</span><b>820</b><em>↗ 15.3%</em><div className="spark orange-spark" /></div>
            </div>
            <div className="mini-grid"><div className="mini-chart"><div className="chart-title"><b>Ringkasan Penjualan</b><span>Minggu ini⌄</span></div><div className="chart-bars"><i /><i /><i /><i /><i /><i /><i /></div><div className="chart-labels"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div></div><div className="mini-orders"><b>Pesanan Terbaru</b><div><span className="order-dot coral-dot" />Percetakan Jaya <em>Selesai</em></div><div><span className="order-dot blue-dot" />Toko Sejahtera <em>Diproses</em></div><div><span className="order-dot green-dot" />RM Nusantara <em>Selesai</em></div></div></div>
          </main>
        </div> : <div className="plan-slide" role="group" aria-roledescription="slide" aria-label="Slide 2 dari 2: Rencana Multi Global"><img src="/assets/plan.webp" alt="Gambaran platform Multi Global" /></div>}
      </div>
      {activeSlide === 0 && <>
        <div className="floating-note ai-note"><span><Bot size={15} /></span><div><b>AI Insight</b><small>Penjualan meningkat 18%</small></div></div>
        <div className="floating-note notify-note"><span><Check size={14} /></span><div><b>Pesanan selesai!</b><small>Order #MG-1024</small></div></div>
      </>}
      <div className="preview-controls">
        <button type="button" aria-label="Slide sebelumnya" onClick={() => setActiveSlide((current) => (current + 1) % 2)}><ChevronLeft size={15} /></button>
        <div className="preview-dots">
          {[0, 1].map((slide) => <button type="button" key={slide} className={`preview-dot ${activeSlide === slide ? 'active' : ''}`} aria-label={`Tampilkan slide ${slide + 1}`} aria-pressed={activeSlide === slide} onClick={() => setActiveSlide(slide)} />)}
        </div>
        <button type="button" aria-label="Slide berikutnya" onClick={() => setActiveSlide((current) => (current + 1) % 2)}><ChevronRight size={15} /></button>
      </div>
    </div>
  )
}

function LiveChat({ open, onOpenChange, onPlatformAdminLogin }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const [sessionToken, setSessionToken] = useState(() => {
    let token = localStorage.getItem('multi-global-chat-session')
    if (!token) {
      token = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem('multi-global-chat-session', token)
    }
    return token
  })

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('multi-global-chat-history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {}
    }
    return [{ role: 'assistant', content: 'Halo! Saya Multi Global AI. Ada yang bisa saya bantu hari ini?' }]
  })

  useEffect(() => {
    localStorage.setItem('multi-global-chat-history', JSON.stringify(messages))
  }, [messages])

  function endChat() {
    if (window.confirm('Apakah Anda yakin ingin mengakhiri sesi chat ini? Riwayat chat akan dibersihkan.')) {
      const newSession = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem('multi-global-chat-session', newSession)
      setSessionToken(newSession)

      const initialMessage = [{ role: 'assistant', content: 'Sesi chat telah diakhiri. Halo! Ada yang bisa saya bantu lagi?' }]
      setMessages(initialMessage)
      localStorage.setItem('multi-global-chat-history', JSON.stringify(initialMessage))
    }
  }

  async function sendMessage(value = message) {
    const content = value.trim()
    if (!content || sending) return

    setMessage('')
    setMessages((current) => [...current, { role: 'user', content }])

    const normalizedMessage = content.toLowerCase().replace(/dahsboard|dashbord|dasboard/g, 'dashboard')
    const mentionsLogin = /(login|masuk|akses|bantu)/.test(normalizedMessage)
    const mentionsPlatformAdmin = /(admin|administrator|pengelola|owner)/.test(normalizedMessage)
    const mentionsDashboard = /(dashboard|dasbor)/.test(normalizedMessage)
    const mentionsAppOrder = /(pesanan pembuatan aplikasi|pesanan aplikasi|order aplikasi|daftar pesanan)/.test(normalizedMessage)
    const requestsPlatformAdminLogin = mentionsLogin && (mentionsPlatformAdmin || mentionsDashboard)
    if (requestsPlatformAdminLogin) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: 'Baik. Form di bawah untuk Admin Owner Penyedia Aplikasi Multi Global — Namely admin yang mengelola seluruh tenant dan Pesanan Pembuatan Aplikasi, bukan admin tenant. Tekan tombolnya untuk membuka login yang aman.',
        showAdminLogin: true,
      }])
      return
    }
    if (mentionsAppOrder) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: 'Pesanan pembuatan aplikasi yang Anda kirim akan masuk ke dashboard Admin Owner Penyedia Aplikasi, dengan kode MG-XXXX dan status PENDING. Admin tersebut yang akan menghubungi Anda lewat WhatsApp.',
        showAdminLogin: true,
      }])
      return
    }

    setSending(true)

    try {
      const token = localStorage.getItem('multi-global-token')
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agent: 'cs', message: content, conversationId: sessionToken }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Chat tidak tersedia')
      setMessages((current) => [...current, { role: 'assistant', content: payload.message }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Layanan CS AI sedang offline. Silakan coba lagi sebentar.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`live-chat ${open ? 'is-open' : ''}`}>
      {open && <section className="chat-panel" aria-label="Live Chat Multi Global">
        <div className="chat-header">
          <div className="chat-title"><span className="chat-bot-icon"><img src="/assets/cs-ai.png" alt="CS AI" className="chat-avatar-img" /></span><div><b>CS AI Multi Global</b><small><span className="chat-online" /> Online sekarang</small></div></div>
          <div className="chat-controls">
            <button onClick={endChat} title="Akhiri Chat" aria-label="Akhiri chat" className="chat-end-btn">Akhiri</button>
            <button onClick={() => onOpenChange(false)} aria-label="Minimalkan chat">−</button>
            <button onClick={() => onOpenChange(false)} aria-label="Tutup chat"><X size={15} /></button>
          </div>
        </div>
        <div className="chat-agent-badge"><span className="chat-agent-avatar"><img src="/assets/cs-ai.png" alt="CS AI" className="chat-avatar-img" /></span><div><b>CS AI</b><small>Customer service digital Anda</small></div><span className="chat-online" /></div>
        <div className="chat-messages" aria-live="polite">
          {messages.map((item, index) => <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}><span>{item.role === 'assistant' ? <img src="/assets/cs-ai.png" alt="CS AI" className="msg-avatar-img" /> : 'Anda'}</span><div className="chat-message-body"><p>{item.content}</p>{item.showAdminLogin && <button className="chat-login-cta" type="button" onClick={onPlatformAdminLogin}><LogIn size={14} /> Login Admin Multi Global</button>}</div></div>)}
          {sending && <div className="chat-message assistant"><span><img src="/assets/cs-ai.png" alt="CS AI" className="msg-avatar-img" /></span><p className="typing"><i /><i /><i /></p></div>}
        </div>
        {messages.length === 1 && <div className="chat-prompts"><button onClick={() => sendMessage('Bagaimana cara memulai?')}>Cara memulai?</button><button onClick={() => sendMessage('Apa saja aplikasi yang tersedia?')}>Lihat aplikasi</button></div>}
        <form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis pesan..." aria-label="Tulis pesan" /><button type="submit" disabled={!message.trim() || sending} aria-label="Kirim pesan"><Send size={16} /></button></form>
        <small className="chat-disclaimer">AI dapat membuat kesalahan. Jangan kirim data sensitif.</small>
      </section>}
      {!open && <button className="chat-launcher" onClick={() => onOpenChange(true)} aria-label="Buka Live Chat"><span className="launcher-ping" /><span className="launcher-avatar"><img src="/assets/cs-ai.png" alt="CS AI" /></span><b>Chat CS</b></button>}
    </div>
  )
}

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'Minimal 8 karakter' },
  { test: (value) => /[a-z]/.test(value), label: 'Huruf kecil (a-z)' },
  { test: (value) => /[A-Z]/.test(value), label: 'Huruf besar (A-Z)' },
  { test: (value) => /[0-9]/.test(value), label: 'Angka (0-9)' },
]

function readResetToken() {
  try {
    return new URLSearchParams(window.location.search).get('reset-password') || ''
  } catch {
    return ''
  }
}

function PlatformAdminLoginModal({ onClose, onAuthenticated, initialView = 'login', resetToken = '' }) {
  const [view, setView] = useState(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fulfilledRules = PASSWORD_RULES.filter((rule) => rule.test(newPassword))
  const passwordReady = fulfilledRules.length === PASSWORD_RULES.length && newPassword === confirmPassword

  function switchView(nextView) {
    setView(nextView)
    setError('')
    setNotice('')
  }

  function goBackToLogin() {
    setNewPassword('')
    setConfirmPassword('')
    switchView('login')
  }

  async function login(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Login gagal. Periksa kembali email dan password.')

      localStorage.setItem('multi-global-token', payload.token)
      localStorage.setItem('multi-global-user', JSON.stringify(payload.user))
      onAuthenticated(payload.user)
    } catch (loginError) {
      setError(loginError.message || 'Layanan login tidak tersedia. Coba lagi sebentar.')
    } finally {
      setLoading(false)
    }
  }

  async function requestResetLink(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Permintaan reset password gagal. Coba lagi sebentar.')
      setNotice(payload.message)
    } catch (requestError) {
      setError(requestError.message || 'Layanan email tidak tersedia. Coba lagi sebentar.')
    } finally {
      setLoading(false)
    }
  }

  async function submitNewPassword(event) {
    event.preventDefault()
    setError('')
    if (!passwordReady) {
      setError(confirmPassword !== newPassword
        ? 'Konfirmasi password tidak sama dengan password baru.'
        : 'Password baru belum memenuhi seluruh syarat.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Password belum dapat diperbarui.')

      setNotice(payload.message)
      setNewPassword('')
      setConfirmPassword('')
      window.history.replaceState({}, '', window.location.pathname)
    } catch (submitError) {
      setError(submitError.message || 'Layanan reset password tidak tersedia. Coba lagi sebentar.')
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = view === 'login' ? 'Login Admin Multi Global' : view === 'forgot' ? 'Lupa Password' : 'Buat Password Baru'
  const modalHint = view === 'login'
    ? 'Akun admin penyedia aplikasi: mengelola seluruh tenant, paket, domain, dan Pesanan Pembuatan Aplikasi. Bukan admin tenant.'
    : view === 'forgot'
      ? 'Masukkan email admin yang terdaftar. Kami kirim tautan reset password ke inbox Anda.'
      : 'Tautan reset hanya dapat dipakai satu kali dan berlaku singkat. Pilih password baru untuk akun admin Anda.'

  return (
    <div className="order-overlay admin-login-overlay" role="dialog" aria-modal="true" aria-label={`${modalTitle} — Admin Owner Penyedia Aplikasi Multi Global`} onClick={onClose}>
      <form className="order-modal admin-login-modal" onSubmit={view === 'login' ? login : view === 'forgot' ? requestResetLink : submitNewPassword} onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup login"><X size={17} /></button>
        <span className="section-kicker"><ShieldCheck size={13} /> Admin Owner Penyedia Aplikasi</span>
        <h2>{modalTitle}</h2>
        <p>{modalHint}</p>

        {view === 'login' && <>
          <ul className="admin-login-scope">
            <li><Check size={12} /> Pesanan Pembuatan Aplikasi masuk dari calon pengguna</li>
            <li><Check size={12} /> Tenant, paket, domain, dan billing platform</li>
            <li><Check size={12} /> Data operasional tenant dikelola oleh admin tenant</li>
          </ul>
          <label>Email admin penyedia aplikasi<input autoFocus required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email-anda.com" /></label>
          <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" /></label>
          <button className="admin-login-forgot" type="button" onClick={() => switchView('forgot')}><KeyRound size={13} /> Lupa password?</button>
        </>}

        {view === 'forgot' && <>
          <label>Email admin penyedia aplikasi<input autoFocus required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email-anda.com" /></label>
          <p className="admin-login-note">Tautan reset dikirim dari email resmi Multi Global. Jangan bagikan tautan ini kepada siapa pun.</p>
        </>}

        {view === 'reset' && <>
          <label>Password baru<input autoFocus required type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimal 8 karakter" /></label>
          <ul className="password-rules">
            {PASSWORD_RULES.map((rule) => <li className={rule.test(newPassword) ? 'is-met' : ''} key={rule.label}><Check size={12} /> {rule.label}</li>)}
          </ul>
          <label>Konfirmasi password baru<input required type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password baru" /></label>
        </>}

        {notice && <p className="admin-login-notice" role="status"><Check size={14} /> {notice}</p>}
        {error && <p className="admin-login-error" role="alert">{error}</p>}

        {view === 'login' && <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Memeriksa...' : 'Masuk sebagai Admin Provider'} <LogIn size={16} /></button>}
        {view === 'forgot' && !notice && <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Tautan Reset'} <Mail size={16} /></button>}
        {view === 'reset' && !notice && <button className="button button-primary" type="submit" disabled={loading || !passwordReady}>{loading ? 'Menyimpan...' : 'Simpan Password Baru'} <KeyRound size={16} /></button>}

        {(view === 'forgot' || view === 'reset') && (notice
          ? <button className="button button-dark" type="button" onClick={goBackToLogin}>Kembali ke Login <LogIn size={16} /></button>
          : <button className="admin-login-forgot" type="button" onClick={goBackToLogin}><ChevronLeft size={13} /> Kembali ke login</button>)}

        <small className="admin-login-hint">{view === 'login'
          ? 'Kredensial dikirim langsung ke server, tidak melalui percakapan chat.'
          : 'Token reset disimpan di server dalam bentuk hash dan hanya berlaku satu kali.'}</small>
      </form>
    </div>
  )
}

function AdminOverviewPanel({ user, service, orders, ordersStatus, tenants, tenantsStatus, goToView }) {
  const roleLabel = user.roleLabel || 'Admin Owner Penyedia Aplikasi'
  const ready = ordersStatus === 'ready'
  const last7 = countSince(orders, 7)
  const previous7 = Math.max(countSince(orders, 14) - last7, 0)
  const pendingOrders = orders.filter((order) => order.status === 'PENDING')
  const approvedOrders = orders.filter((order) => order.status === 'APPROVED')
  const rejectedOrders = orders.filter((order) => order.status === 'REJECTED')
  const approvalRate = orders.length ? Math.round((approvedOrders.length / orders.length) * 100) : 0
  const activeTenants = tenants.filter((tenant) => tenant.status === 'ACTIVE')
  const dailySeries = buildDailySeries(orders, 14)
  const byApplication = groupCounts(orders, (order) => order.applicationName).map((item) => ({ ...item, tone: APPLICATION_TONES[item.label] || 'blue' }))
  const byDomainMode = [
    { label: 'Subdomain', value: orders.filter((order) => order.domainMode === 'SUBDOMAIN').length, tone: 'blue' },
    { label: 'Domain sendiri', value: orders.filter((order) => order.domainMode === 'CUSTOM_DOMAIN').length, tone: 'orange' },
  ]
  const statusSegments = [
    { label: 'Menunggu', value: pendingOrders.length, tone: 'orange' },
    { label: 'Dihubungi', value: orders.filter((order) => order.status === 'CONTACTED').length, tone: 'blue' },
    { label: 'Disetujui', value: approvedOrders.length, tone: 'green' },
    { label: 'Ditolak', value: rejectedOrders.length, tone: 'coral' },
  ]

  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="section-kicker">Admin Owner Penyedia Aplikasi</span>
          <h1>Ringkasan Platform</h1>
          <p>Selamat datang, {user.name}. Berikut statistik Multi Global dan antrean Pesanan Pembuatan Aplikasi yang perlu Anda tangani.</p>
        </div>
        <span className="admin-session-status"><i /> Sesi aktif</span>
      </header>

      {ready && orders.length === 0 && <p className="admin-orders-alert admin-orders-hint">Belum ada Pesanan Pembuatan Aplikasi. Kirim pesanan dari landing page, dan seluruh statistik di bawah akan terisi otomatis dari data itu.</p>}

      <section className="admin-kpi-grid" aria-label="Statistik utama platform">
        <AdminStatCard icon={Inbox} tone="blue" label="Total Pesanan" value={orders.length} delta={growthPercent(last7, previous7)} deltaLabel="7 hari vs 7 hari sebelumnya" series={dailySeries.map((point) => point.value)} />
        <AdminStatCard icon={Clock3} tone="orange" label="Menunggu Diproses" value={pendingOrders.length} delta={pendingOrders.length} deltaLabel="Perlu dihubungi" series={dailySeries.slice(7).map((point) => point.value)} note="7 hari" />
        <AdminStatCard icon={Check} tone="green" label="Tingkat Persetujuan" value={approvalRate} suffix="%" delta={growthPercent(approvedOrders.length, rejectedOrders.length)} deltaLabel={`${approvedOrders.length} disetujui · ${rejectedOrders.length} ditolak`} series={dailySeries.map((point) => point.value)} />
        <AdminStatCard icon={Building2} tone="purple" label="Tenant Aktif" value={tenantsStatus === 'ready' ? activeTenants.length : 0} delta={tenantsStatus === 'ready' ? activeTenants.length - tenants.length : 0} deltaLabel={`Dari ${tenants.length} tenant terdaftar`} series={dailySeries.map((point) => point.value)} />
      </section>

      <section className="admin-chart-grid">
        <AdminTrendChart series={dailySeries} />
        <AdminDonut segments={statusSegments} centerLabel="Pesanan" centerValue={orders.length} />
        <AdminBarList items={byApplication} emptyText="Belum ada permintaan per jenis aplikasi." />
        <AdminBarList items={byDomainMode} emptyText="Belum ada pilihan domain tercatat." unit="pilihan" />
      </section>

      <section className="admin-panel" aria-label="Antrean pesanan terbaru">
        <header className="admin-panel-head">
          <div><h2>Antrean Pesanan Pembuatan Aplikasi</h2><p>Lima pesanan terbaru yang masuk dari landing page.</p></div>
          <button className="admin-panel-link" type="button" onClick={() => goToView('app-orders')}>Kelola semua <ChevronRight size={14} /></button>
        </header>
        {ordersStatus === 'loading' && <p className="admin-orders-state">Memuat pesanan...</p>}
        {ordersStatus === 'error' && <p className="admin-orders-state">Pesanan belum dapat dimuat. Pastikan server aktif dan schema database sudah dijalankan.</p>}
        {ordersStatus === 'ready' && orders.length === 0 && <p className="admin-orders-state">Belum ada pesanan pembuatan aplikasi.</p>}
        {ordersStatus === 'ready' && orders.length > 0 && <ul className="admin-order-list">
          {orders.slice(0, 5).map((order) => {
            const status = APP_ORDER_STATUS[order.status] || { label: order.status, tone: 'pending' }
            return <li className="admin-order-item" key={order.id}>
              <div className="admin-order-main">
                <div className="admin-order-title"><b>{order.businessName}</b><code>{order.orderCode}</code></div>
                <div className="admin-order-meta"><span><ListChecks size={12} /> {order.applicationName}</span><span><MessageCircle size={12} /> {order.whatsapp}</span><span>{new Date(order.createdAt).toLocaleString('id-ID')}</span></div>
              </div>
              <div className="admin-order-side"><span className={`admin-order-badge ${status.tone}`}>{status.label}</span></div>
            </li>
          })}
        </ul>}
      </section>

      <section className="admin-panel" aria-label="Status sistem">
        <header className="admin-panel-head"><div><h2>Status Sistem</h2><p>Koneksi API dan database platform.</p></div></header>
        <div className="admin-system-grid">
          <div className="admin-system-item"><small>API</small><b className={service.status === 'ok' ? 'status-good' : 'status-bad'}>{service.status}</b></div>
          <div className="admin-system-item"><small>Database</small><b>{service.database}</b></div>
          <div className="admin-system-item"><small>Tenant terdaftar</small><b>{tenantsStatus === 'ready' ? tenants.length : '…'}</b></div>
          <div className="admin-system-item"><small>Total pesanan</small><b>{ready ? orders.length : '…'}</b></div>
        </div>
      </section>

      <section className="admin-dashboard-note">
        <span className="admin-note-mark"><ShieldCheck size={18} /></span>
        <div><h2>Batas kewenangan {roleLabel}</h2><p>Admin penyedia aplikasi oversee platform Multi Global: pesanan pembuatan aplikasi, tenant, paket, domain, dan billing. Data harian tenant (produk, pelanggan, transaksi) tetap dikelola oleh admin tenant masing-masing.</p></div>
      </section>
    </>
  )
}

function AdminAppOrdersPanel({ orders, ordersStatus, ordersMessage, filter, setFilter, pendingId, onUpdateStatus }) {
  const visibleOrders = filter === 'ALL' ? orders : orders.filter((order) => order.status === filter)
  const countByStatus = (status) => orders.filter((order) => order.status === status).length

  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="section-kicker"><Inbox size={13} /> Penyediaan Layanan</span>
          <h1>Pesanan Pembuatan Aplikasi</h1>
          <p>Setiap tombol "Pesan Sekarang" di landing page menghasilkan pesanan di sini. Hubungi pemesan via WhatsApp, lalu perbarui statusnya.</p>
        </div>
        <div className="admin-order-filters" role="group" aria-label="Filter status pesanan">
          {[['ALL', 'Semua'], ['PENDING', 'Menunggu'], ['CONTACTED', 'Dihubungi'], ['APPROVED', 'Disetujui'], ['REJECTED', 'Ditolak']].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <span>{value === 'ALL' ? orders.length : countByStatus(value)}</span></button>
          ))}
        </div>
      </header>

      {ordersMessage && <p className="admin-orders-alert" role="alert">{ordersMessage}</p>}

      {ordersStatus === 'loading' && <p className="admin-orders-state">Memuat pesanan pembuatan aplikasi...</p>}
      {ordersStatus === 'error' && <p className="admin-orders-state">Pesanan belum dapat dimuat. Pastikan server aktif dan schema database sudah dijalankan.</p>}
      {ordersStatus === 'ready' && visibleOrders.length === 0 && <p className="admin-orders-state">Belum ada pesanan pada filter ini.</p>}

      {ordersStatus === 'ready' && visibleOrders.length > 0 && <ul className="admin-order-list">
        {visibleOrders.map((order) => {
          const status = APP_ORDER_STATUS[order.status] || { label: order.status, tone: 'pending' }
          return <li className="admin-order-item" key={order.id}>
            <div className="admin-order-main">
              <div className="admin-order-title"><b>{order.businessName}</b><code>{order.orderCode}</code></div>
              <div className="admin-order-meta">
                <span><ListChecks size={12} /> {order.applicationName}</span>
                <span><MessageCircle size={12} /> {order.whatsapp}</span>
                {order.email && <span><Mail size={12} /> <a className="admin-order-mail" href={`mailto:${order.email}`}>{order.email}</a></span>}
                <span><Globe2 size={12} /> {order.domainMode === 'CUSTOM_DOMAIN' ? 'Domain sendiri' : 'Subdomain'}</span>
                <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <div className="admin-order-features">{parseFeatures(order.features).map((feature) => <em key={feature}>{feature}</em>)}</div>
            </div>
            <div className="admin-order-side">
              <span className={`admin-order-badge ${status.tone}`}>{status.label}</span>
              <div className="admin-order-actions">
                <a className="admin-order-action" href={`https://wa.me/${normalizeWhatsapp(order.whatsapp)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} /> WhatsApp</a>
                {order.status !== 'CONTACTED' && <button type="button" disabled={pendingId === order.id} onClick={() => onUpdateStatus(order.id, 'CONTACTED')}>Tandai Sudah Dihubungi</button>}
                {order.status !== 'APPROVED' && <button type="button" disabled={pendingId === order.id} onClick={() => onUpdateStatus(order.id, 'APPROVED')}>Setujui</button>}
                {order.status !== 'REJECTED' && <button type="button" className="danger" disabled={pendingId === order.id} onClick={() => onUpdateStatus(order.id, 'REJECTED')}>Tolak</button>}
              </div>
            </div>
          </li>
        })}
      </ul>}
    </>
  )
}

const BUSINESS_TYPE_LABELS = {
  printing: 'Percetakan',
  retail: 'Retail / Grosir',
  car_workshop: 'Bengkel Mobil',
  motorcycle_workshop: 'Bengkel Motor',
  culinary: 'Kuliner / UMKM',
  travel: 'Travel',
}

function AdminTenantsPanel({ tenants, tenantsStatus }) {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="section-kicker"><Building2 size={13} /> Penyediaan Layanan</span>
          <h1>Tenant</h1>
          <p>Seluruh bisnis yang memakai aplikasi Multi Global. Data operasional masing-masing tenant dikelola oleh admin tenant-nya sendiri.</p>
        </div>
        <span className="admin-session-status"><i /> {tenants.length} tenant</span>
      </header>

      {tenantsStatus === 'loading' && <p className="admin-orders-state">Memuat data tenant...</p>}
      {tenantsStatus === 'unavailable' && <p className="admin-orders-state">Data tenant belum dapat dimuat. Jalankan schema database terbaru.</p>}
      {tenantsStatus === 'ready' && tenants.length === 0 && <p className="admin-orders-state">Belum ada tenant terdaftar. Tenant dibuat dari Pesanan Pembuatan Aplikasi yang disetujui.</p>}

      {tenantsStatus === 'ready' && tenants.length > 0 && <div className="admin-tenant-grid">
        {tenants.map((tenant) => <article className="admin-tenant-card" key={tenant.id}>
          <div className="admin-tenant-mark">{tenant.name.slice(0, 2).toUpperCase()}</div>
          <div className="admin-tenant-body">
            <b>{tenant.name}</b>
            <small>{BUSINESS_TYPE_LABELS[tenant.business_type] || tenant.business_type}</small>
            <code>{tenant.slug}</code>
          </div>
          <span className={`admin-order-badge ${tenant.status === 'ACTIVE' ? 'approved' : 'rejected'}`}>{tenant.status === 'ACTIVE' ? 'Aktif' : tenant.status}</span>
        </article>)}
      </div>}
    </>
  )
}

function AdminComingSoonPanel({ view }) {
  const Icon = view.icon
  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="section-kicker"><Icon size={13} /> {view.groupLabel}</span>
          <h1>{view.label}</h1>
          <p>{view.description}</p>
        </div>
        <span className="admin-panel-tag">Modul disiapkan</span>
      </header>
      <section className="admin-empty">
        <span className="admin-note-mark"><Icon size={18} /></span>
        <h2>{view.label} belum memiliki data</h2>
        <p>Endpoint backend untuk modul ini belum tersedia, jadi tampilannya masih kosong. Menu ini sudah siap dan bisa diisi tanpa mengubah struktur navigasi.</p>
      </section>
    </>
  )
}

function PlatformAdminDashboard({ user, onLogout, theme, onThemeChange }) {
  const [activeView, setActiveView] = useState(readAdminView)
  const [navOpen, setNavOpen] = useState(false)
  const [service, setService] = useState({ status: 'Memeriksa...', database: 'Memeriksa...' })
  const [orders, setOrders] = useState([])
  const [ordersStatus, setOrdersStatus] = useState('loading')
  const [ordersMessage, setOrdersMessage] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [pendingId, setPendingId] = useState('')
  const [tenants, setTenants] = useState([])
  const [tenantsStatus, setTenantsStatus] = useState('loading')

  const authHeaders = () => {
    const token = localStorage.getItem('multi-global-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    let isCurrent = true
    fetch(`${API_URL}/api/health`)
      .then((response) => response.json())
      .then((payload) => {
        if (isCurrent) setService({ status: payload.status, database: payload.database })
      })
      .catch(() => {
        if (isCurrent) setService({ status: 'offline', database: 'tidak diketahui' })
      })

    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    let isCurrent = true
    setOrdersStatus('loading')
    fetch(`${API_URL}/api/admin/app-orders`, { headers: authHeaders() })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.message || 'Daftar pesanan belum dapat dimuat.')
        return payload.data || []
      })
      .then((data) => {
        if (!isCurrent) return
        setOrders(data)
        setOrdersStatus('ready')
      })
      .catch((error) => {
        if (!isCurrent) return
        setOrdersStatus('error')
        setOrdersMessage(error.message || 'Daftar pesanan belum dapat dimuat.')
      })

    fetch(`${API_URL}/api/tenants`, { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('unavailable'))))
      .then((payload) => {
        if (isCurrent) setTenants(payload.data || [])
      })
      .catch(() => {
        if (isCurrent) setTenantsStatus('unavailable')
      })
      .finally(() => {
        if (isCurrent) setTenantsStatus('ready')
      })

    return () => { isCurrent = false }
  }, [])

  async function updateOrderStatus(orderId, status) {
    setPendingId(orderId)
    setOrdersMessage('')
    try {
      const response = await fetch(`${API_URL}/api/admin/app-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Status pesanan belum dapat diperbarui.')
      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)))
    } catch (error) {
      setOrdersMessage(error.message || 'Status pesanan belum dapat diperbarui.')
    } finally {
      setPendingId('')
    }
  }

  function goToView(viewId) {
    setActiveView(viewId)
    setNavOpen(false)
    window.history.replaceState({}, '', `/admin?view=${viewId}`)
  }

  const currentView = ADMIN_VIEWS.find((view) => view.id === activeView) || ADMIN_VIEWS[0]
  const currentGroup = ADMIN_MENU.find((group) => group.items.some((item) => item.id === currentView.id))
  const roleLabel = user.roleLabel || 'Admin Owner Penyedia Aplikasi'
  const pendingCount = orders.filter((order) => order.status === 'PENDING').length

  const panelProps = {
    'app-orders': <AdminAppOrdersPanel orders={orders} ordersStatus={ordersStatus} ordersMessage={ordersMessage} filter={filter} setFilter={setFilter} pendingId={pendingId} onUpdateStatus={updateOrderStatus} />,
    tenants: <AdminTenantsPanel tenants={tenants} tenantsStatus={tenantsStatus} />,
    overview: <AdminOverviewPanel user={user} service={service} orders={orders} ordersStatus={ordersStatus} tenants={tenants} tenantsStatus={tenantsStatus} goToView={goToView} />,
  }

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${navOpen ? 'is-open' : ''}`} id="admin-menu" aria-label="Menu admin penyedia aplikasi">
        <div className="admin-sidebar-head">
          <a className="logo" href="/" aria-label="Multi Global beranda"><span className="logo-mark"><Command size={18} strokeWidth={3} /></span><span>Multi<span>Global</span></span></a>
          <div className="admin-sidebar-head-actions">
            <ThemeSwitcher theme={theme} onChange={onThemeChange} variant="icon" />
            <button className="admin-sidebar-close" type="button" onClick={() => setNavOpen(false)} aria-label="Tutup menu"><X size={18} /></button>
          </div>
        </div>
        <div className="admin-sidebar-scope">
          <small>Admin Owner</small>
          <b>Admin Penyedia Aplikasi</b>
          <span>{roleLabel}</span>
        </div>
        <nav className="admin-nav">
          {ADMIN_MENU.map((group) => <div className="admin-nav-group" key={group.label}>
            <span className="admin-nav-group-label">{group.label}</span>
            {group.items.map((item) => {
              const Icon = item.icon
              const count = item.badge === 'pending' ? pendingCount : 0
              return <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${activeView === item.id ? 'is-active' : ''}`}
                aria-current={activeView === item.id ? 'page' : undefined}
                onClick={() => goToView(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {count > 0 && <em>{count}</em>}
              </button>
            })}
          </div>)}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-account"><span className="admin-account-copy"><b>{user.name}</b><small>{roleLabel}</small></span><button className="admin-logout" type="button" onClick={onLogout} aria-label="Keluar dari dashboard" title="Keluar"><LogOut size={17} /></button></div>
        </div>
      </aside>
      {navOpen && <button className="admin-sidebar-backdrop" type="button" onClick={() => setNavOpen(false)} aria-label="Tutup menu" />}

      <div className="admin-content">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" type="button" onClick={() => setNavOpen(true)} aria-label="Buka menu admin" aria-controls="admin-menu" aria-expanded={navOpen}><Menu size={19} /></button>
          <div className="admin-topbar-title">
            <small>{currentGroup?.label}</small>
            <b>{currentView.label}</b>
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-topbar-scope">{PLATFORM_SCOPE_LABEL}</span>
            <ThemeSwitcher theme={theme} onChange={onThemeChange} />
            <span className="admin-session-status"><i /> {service.status === 'ok' ? 'Aktif' : service.status}</span>
            <div className="admin-account admin-account-compact"><span className="admin-account-copy"><b>{user.name}</b><small>{roleLabel}</small></span><button className="admin-logout" type="button" onClick={onLogout} aria-label="Keluar dari dashboard" title="Keluar"><LogOut size={17} /></button></div>
          </div>
        </header>
        <main className="admin-dashboard-main">
          <div className="admin-breadcrumb">MULTI GLOBAL <span>/</span> ADMIN PENYEDIA APLIKASI <span>/</span> {currentView.label.toUpperCase()}</div>
          {panelProps[currentView.id] || <AdminComingSoonPanel view={{ ...currentView, groupLabel: currentGroup?.label }} />}
        </main>
      </div>
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [orderApp, setOrderApp] = useState(null)
  const [detailApp, setDetailApp] = useState(null)
  const [orderFeatures, setOrderFeatures] = useState(['Percetakan'])
  const [availableFeatures, setAvailableFeatures] = useState(productFeatures.Percetakan)
  const [domainMode, setDomainMode] = useState('subdomain')
  const [orderIds, setOrderIds] = useState({ orderId: '', tenantId: '' })
  const [chatOpen, setChatOpen] = useState(false)
  const [platformAdminUser, setPlatformAdminUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('multi-global-user') || 'null') } catch { return null }
  })
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const [adminLoginView, setAdminLoginView] = useState(() => (readResetToken() ? 'reset' : null))
  const [resetToken, setResetToken] = useState(() => readResetToken())
  const adminLoginOpen = adminLoginView !== null

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function finishLogin(user) {
    setPlatformAdminUser(user)
    setAdminLoginView(null)
    window.history.pushState({}, '', '/admin')
    setCurrentPath('/admin')
  }

  function logoutPlatformAdmin() {
    localStorage.removeItem('multi-global-token')
    localStorage.removeItem('multi-global-user')
    setPlatformAdminUser(null)
    window.history.pushState({}, '', '/')
    setCurrentPath('/')
  }

  function returnToChat() {
    window.history.replaceState({}, '', '/')
    setCurrentPath('/')
    setChatOpen(true)
  }

  if (currentPath === '/admin') {
    const isPlatformAdmin = platformAdminUser?.role === PLATFORM_ADMIN_ROLE
    if (isPlatformAdmin && localStorage.getItem('multi-global-token')) return <PlatformAdminDashboard user={platformAdminUser} onLogout={logoutPlatformAdmin} theme={theme} onThemeChange={setTheme} />
    return <main className="admin-gate"><span className="admin-note-mark"><LockKeyhole size={20} /></span><h1>Login Admin Penyedia Aplikasi diperlukan</h1><p>Halaman ini khusus Admin Owner Penyedia Aplikasi Multi Global, yang mengelola Pesanan Pembuatan Aplikasi dan seluruh tenant. Minta CS AI membuka form login di bawah.</p><button className="button button-primary" type="button" onClick={returnToChat}>Buka Chat CS <MessageCircle size={16} /></button><div className="admin-gate-theme"><ThemeSwitcher theme={theme} onChange={setTheme} /></div></main>
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container nav-inner">
          <Logo />
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
            <a href="#features" onClick={closeMenu}>Fitur</a>
            <a href="#applications" onClick={closeMenu}>Aplikasi</a>
            <a href="#ai" onClick={closeMenu}>Karyawan AI</a>
            <a href="#domains" onClick={closeMenu}>Domain</a>
            <a href="#about" onClick={closeMenu}>Tentang Kami</a>
          </nav>
          <div className="nav-actions">
            <ThemeSwitcher theme={theme} onChange={setTheme} variant="icon" />
            <a className="login-link" href="#login" onClick={(event) => { event.preventDefault(); setChatOpen(true) }}>Masuk</a>
            <a className="button button-small button-primary" href="#start">Mulai Sekarang <ArrowRight size={15} /></a>
            <button className="menu-toggle" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home"><div className="hero-grid" /><div className="container hero-inner"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> Platform Bisnis Generasi Baru</div><h1>Kelola Semua Usaha <span>Dalam Satu Platform.</span></h1><p>Satu ekosistem digital untuk mengelola berbagai jenis usaha dengan lebih mudah, cepat, dan cerdas.</p><div className="hero-actions"><a className="button button-primary" href="#start">Mulai Gratis <ArrowRight size={17} /></a><a className="text-link" href="#features">Lihat Cara Kerjanya <ChevronRight size={17} /></a></div><div className="hero-proof"><div className="proof-avatars"><span>AD</span><span>SR</span><span>MK</span><span>+</span></div><div><b>Dipercaya 1,000+ bisnis</b><small>untuk tumbuh lebih cepat</small></div></div></div><DashboardPreview /></div><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /></section>

        <section className="trust-strip" id="features"><div className="container trust-grid"><div className="trust-item"><span className="icon-box blue-icon"><Cloud size={19} /></span><div><b>Cloud Based</b><small>Akses dari mana saja</small></div></div><div className="trust-item"><span className="icon-box green-icon"><ShieldCheck size={19} /></span><div><b>Aman & Terpercaya</b><small>Data bisnis terlindungi</small></div></div><div className="trust-item"><span className="icon-box orange-icon"><Zap size={19} /></span><div><b>Fleksibel & Scalable</b><small>Tumbuh bersama bisnis</small></div></div><div className="trust-micro"><span className="mini-check"><Check size={12} /></span> Setup cepat & mudah</div></div></section>

        <section className="section applications" id="applications"><div className="container"><div className="section-heading"><div><span className="section-kicker">Satu platform, tanpa batas</span><h2>Semua yang bisnis Anda butuhkan.</h2></div><p>Pilih aplikasi yang sesuai dengan kebutuhan bisnis Anda. Semua terhubung dalam satu ekosistem yang powerful.</p></div><div className="application-grid">{appCards.map(({ number, title, copy, icon: Icon, color, image, features }) => <article className={`application-card ${color}`} key={title}><div className="application-image"><img src={image} alt={`Ilustrasi ${title}`} loading="lazy" /><span className="app-number">{number}</span><span className="card-icon"><Icon size={22} /></span></div><div className="application-content"><h3>{title}</h3><p>{copy}</p><ul>{features.map((feature) => <li key={feature}><Check size={12} />{feature}</li>)}</ul><div className="application-actions"><button className="card-detail" onClick={() => setDetailApp({ title, copy, image, features })}>Lihat Detail <ChevronRight size={14} /></button><button className="order-button" onClick={() => { setOrderApp(title); setAvailableFeatures(productFeatures[title]); setOrderFeatures(productFeatures[title].slice(0, 1)); setDomainMode('subdomain'); setOrderIds({ orderId: '', tenantId: '' }) }}>Pesan Sekarang <ArrowRight size={14} /></button></div></div></article>)}</div></div></section>

        <section className="section ai-section" id="ai"><div className="container ai-layout"><div className="ai-intro"><span className="section-kicker">Bukan sekadar software</span><h2>Kenalkan,<br /><span>Karyawan AI</span> Anda.</h2><p>Asisten cerdas yang selalu siap membantu operasional bisnis Anda, 24/7. Pilih peran yang paling Anda butuhkan.</p><a className="text-link" href="#start">Pelajari Karyawan AI <ArrowRight size={17} /></a><div className="ai-speech"><span className="speech-icon"><MessageCircle size={17} /></span><div><b>Halo! Ada yang bisa saya bantu?</b><small>Multi Global AI · Online</small></div></div></div><div className="ai-cards">{aiCards.map(({ title, copy, color, image, features }) => <article className={`ai-card ${color}`} key={title}><div className="ai-card-image">{image && <img src={image} alt={title} loading="lazy" />}</div><div className="ai-card-body"><h3>{title}</h3><p>{copy}</p><ul>{features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul><a href="#start" aria-label={`Pelajari ${title}`} className="ai-card-link">Pelajari Selengkapnya <ArrowRight size={15} /></a></div></article>)}</div></div></section>

        <section className="section domains-section" id="domains"><div className="container domains-layout"><div><span className="section-kicker">Brand Anda, cara Anda</span><h2>Hadir lebih profesional<br />dengan domain sendiri.</h2><p>Bangun kepercayaan pelanggan dengan alamat digital yang mencerminkan identitas bisnis Anda.</p><a className="button button-dark" href="https://billing.klikhost.com/aff.php?aff=1288" target="_blank" rel="noopener noreferrer">Cek Domain &amp; Hosting <ExternalLink size={16} /></a><small className="referral-note">Anda akan diarahkan ke Klikhost melalui tautan referral Multi Global.</small></div><div className="domain-cards"><div className="domain-card"><span className="domain-icon blue-icon"><Globe2 size={19} /></span><div><b>Subdomain Multi Global</b><small>usahaku.multiglobal.co.id</small></div><Check size={17} className="domain-check" /></div><div className="domain-card featured-domain"><span className="domain-icon orange-icon"><Code2 size={19} /></span><div><b>Domain Sendiri</b><small>www.usahaku.com</small></div><span className="recommended">Direkomendasikan</span><Check size={17} className="domain-check" /></div><div className="domain-card"><span className="domain-icon purple-icon"><LockKeyhole size={19} /></span><div><b>Domain Premium</b><small>usahaku.id</small></div><Check size={17} className="domain-check" /></div></div></div></section>

        <section className="final-cta" id="start"><div className="container cta-inner"><div><span className="section-kicker">Siap naik level?</span><h2>Wujudkan bisnis digital Anda<br /><span>bersama Multi Global.</span></h2><p>Mulai kelola bisnis lebih pintar hari ini.</p></div><a className="button button-light" href="#home">Mulai Sekarang <ArrowRight size={17} /></a></div></section>
      </main>

      <footer className="site-footer" id="about"><div className="container footer-main"><Logo /><p>Satu platform untuk semua kebutuhan bisnis Anda.</p><div className="footer-links"><a href="#features">Fitur</a><a href="#applications">Aplikasi</a><a href="#ai">Karyawan AI</a><a href="#domains">Domain</a><a href="#login" onClick={(event) => { event.preventDefault(); setChatOpen(true) }}>Masuk</a></div><div className="footer-security"><Database size={15} /> Data aman & terenkripsi</div></div><div className="container footer-bottom"><span>© 2024 Multi Global. All rights reserved.</span><span>Dibuat untuk bisnis Indonesia <span className="heart">♥</span></span></div></footer>
      <LiveChat open={chatOpen} onOpenChange={setChatOpen} onPlatformAdminLogin={() => setAdminLoginView('login')} />
      {adminLoginOpen && <PlatformAdminLoginModal onClose={() => setAdminLoginView(null)} onAuthenticated={finishLogin} initialView={adminLoginView} resetToken={resetToken} />}
      {detailApp && <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={`Detail ${detailApp.title}`} onClick={() => setDetailApp(null)}><article className="detail-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setDetailApp(null)} aria-label="Tutup detail"><X size={17} /></button><img src={detailApp.image} alt={`Ilustrasi ${detailApp.title}`} /><div className="detail-modal-content"><span className="section-kicker">Aplikasi Multi Global</span><h2>{detailApp.title}</h2><p>{detailApp.copy}</p><h3>Fitur utama</h3><ul>{productFeatures[detailApp.title].map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><button className="button button-primary" onClick={() => { setDetailApp(null); setOrderApp(detailApp.title); setAvailableFeatures(productFeatures[detailApp.title]); setOrderFeatures(productFeatures[detailApp.title].slice(0, 1)); setDomainMode('subdomain'); setOrderIds({ orderId: '', tenantId: '' }) }}>Pesan {detailApp.title} <ArrowRight size={16} /></button></div></article></div>}
      {orderApp && <div className="order-overlay" role="dialog" aria-modal="true" aria-label={`Pesan ${orderApp}`} onClick={() => setOrderApp(null)}><form className="order-modal" onSubmit={(event) => { event.preventDefault(); setOrderIds({ orderId: `MG-${Date.now().toString(36).toUpperCase()}`, tenantId: domainMode === 'subdomain' ? `TEN-${Date.now().toString(36).slice(-6).toUpperCase()}` : '' }) }} onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setOrderApp(null)} aria-label="Tutup form order"><X size={17} /></button><span className="section-kicker">Mulai bersama Multi Global</span><h2>Pesan {orderApp}</h2><p>Lengkapi konfigurasi fitur dan domain bisnis Anda.</p><label>Nama usaha<input required name="businessName" placeholder="Contoh: Percetakan Jaya" /></label><label>Nomor WhatsApp<input required name="whatsapp" type="tel" inputMode="numeric" pattern="^(\+62|62|0)8[0-9]{8,13}$" placeholder="Nomor WhatsApp, contoh: 081234567890" /></label><label>Email untuk konfirmasi<input required name="email" type="email" autoComplete="email" pattern="[^\s@]+@[^\s@]+\.[^\s@]+" placeholder="Email aktif, contoh: usaha@contoh.com" /><small className="order-field-hint">Kode pesanan dan daftar fitur dikirim ke email ini.</small></label><fieldset className="order-fieldset"><legend>Pilih fitur {orderApp}</legend>{availableFeatures.map((feature) => <label className="check-option" key={feature}><input type="checkbox" checked={orderFeatures.includes(feature)} onChange={(event) => setOrderFeatures((current) => event.target.checked ? [...new Set([...current, feature])] : current.filter((item) => item !== feature))} /> {feature}</label>)}</fieldset><fieldset className="order-fieldset"><legend>Domain dan hosting</legend><label className="check-option"><input type="radio" name="domainMode" value="custom" checked={domainMode === 'custom'} onChange={() => setDomainMode('custom')} /> Domain dan hosting sendiri</label><label className="check-option"><input type="radio" name="domainMode" value="subdomain" checked={domainMode === 'subdomain'} onChange={() => setDomainMode('subdomain')} /> Subdomain (wildcard)</label></fieldset>{domainMode === 'custom' && <a className="hosting-banner" href="https://billing.klikhost.com/aff.php?aff=1288" target="_blank" rel="noreferrer"><img src="https://klikhost.com/img/bannerhostingklikhost.jpg" width="750" alt="Jasa pembuatan blog dan hosting KlikHost" /></a>}{orderIds.orderId && <div className="generated-ids"><span><b>ID Pesanan</b><code>{orderIds.orderId}</code></span>{orderIds.tenantId && <span><b>ID Tenant</b><code>{orderIds.tenantId}</code></span>}</div>}<button className="button button-primary" type="submit">Kirim Permintaan <ArrowRight size={16} /></button></form></div>}
    </div>
  )
}

export default App

createRoot(document.getElementById('root')).render(<App />)
