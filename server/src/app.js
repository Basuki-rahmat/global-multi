import express from 'express'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import morgan from 'morgan'
import { env } from './config/env.js'
import { sendPasswordResetEmail, sendOrderConfirmationEmail, isMailConfigured } from './services/mailer.js'
import { checkDatabase, pool } from './config/db.js'
import { requireAuth, requireRole, signUser } from './middleware/auth.js'
import { ROLES, describeRole } from './config/roles.js'
import { replyToCustomer } from './services/ai.js'

const app = express()
// Demo password hash – increase cost factor for production (e.g., 12)
let demoPasswordHash = await bcrypt.hash('MultiGlobal123!', 10)

// ---------- Security Middleware ----------
// Helmet with strict CSP and HSTS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 30 * 24 * 60 * 60, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  })
);

// Request logging for audit trails
app.use(morgan('combined'));

// Keep production locked to the configured client; Vite may choose another port in development.
// Tunnel publik (devtunnels dan sejenisnya) juga hanya boleh aktif di luar production.
const TUNNEL_ORIGIN = /^https:\/\/[\w-]+(?:\.[\w-]+)*\.devtunnels\.ms$/i
app.use(cors({
  origin: (origin, callback) => {
    const isLocalDevelopmentOrigin = env.nodeEnv !== 'production'
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
    const isTunnelDevelopmentOrigin = env.nodeEnv !== 'production'
      && TUNNEL_ORIGIN.test(origin || '')
    callback(null, !origin || origin === env.clientUrl || isLocalDevelopmentOrigin || isTunnelDevelopmentOrigin)
  },
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Global rate limiter for public endpoints
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7' }));

// Separate stricter limiter for admin routes (defined later)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
});

// Enforce HTTPS in production (if behind a proxy set X‑Forwarded‑Proto)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

app.get('/api/health', async (_request, response) => {
  let database = 'unavailable'
  try {
    await checkDatabase()
    database = 'connected'
  } catch {
    database = 'not-configured'
  }

  response.json({ status: 'ok', service: 'multi-global-api', database, timestamp: new Date().toISOString() })
})

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })
const forgotPasswordSchema = z.object({ email: z.string().email() })
const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(200),
  password: z.string().min(8).max(128).regex(/[a-z]/, 'Password harus memuat huruf kecil.')
    .regex(/[A-Z]/, 'Password harus memuat huruf besar.')
    .regex(/[0-9]/, 'Password harus memuat angka.'),
})

// Satu-satunya akun yang boleh masuk lewat login admin di landing page:
// admin owner penyedia aplikasi Multi Global (bukan admin tenant).
const platformAdmin = {
  id: 'platform-owner',
  tenantId: null,
  role: ROLES.PLATFORM_ADMIN,
  name: 'Owner Multi Global',
  ...describeRole(ROLES.PLATFORM_ADMIN),
  manages: 'app-orders',
}

async function findPlatformUserByEmail(email) {
  try {
    const [rows] = await pool.execute(`
      SELECT u.id, u.name, u.email, u.password_hash AS passwordHash, u.role
      FROM users u
      LEFT JOIN tenant_users tu ON tu.user_id = u.id
      WHERE u.email = :email AND u.role = :role
      LIMIT 1
    `, { email, role: ROLES.PLATFORM_ADMIN })
    return rows[0] || null
  } catch {
    return null
  }
}

// Akun demo in-memory hanya boleh hidup selama tabel users belum punya satu pun
// admin platform. Begitu seed dijalankan, akun ini harus mati supaya
// admin@multiglobal.test / MultiGlobal123! tidak jadi pintu masuk tersembunyi.
async function isDemoLoginAvailable() {
  if (env.nodeEnv === 'production') return false
  try {
    const [rows] = await pool.execute('SELECT 1 FROM users WHERE role = :role LIMIT 1', { role: ROLES.PLATFORM_ADMIN })
    return rows.length === 0
  } catch {
    return true
  }
}

app.post('/api/auth/login', async (request, response) => {
  const parsed = loginSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Email dan password tidak valid.' })

  const { email, password } = parsed.data
  // Hash dari database didahulukan agar password yang baru di-reset langsung berlaku.
  // Hash demo in-memory hanya dipakai sebagai cadangan saat database belum siap.
  const stored = await findPlatformUserByEmail(email)
  const demoAllowed = !stored && await isDemoLoginAvailable()
  const passwordMatches = stored
    ? await bcrypt.compare(password, stored.passwordHash)
    : demoAllowed && email === 'admin@multiglobal.test' && await bcrypt.compare(password, demoPasswordHash)
  if (!passwordMatches) return response.status(401).json({ message: 'Email atau password salah.' })

  response.json({ token: signUser(platformAdmin), user: platformAdmin })
})

// Rate limit khusus lupa password: membatasi percobaan spam per IP,
// tanpa membocorkan apakah email terdaftar atau tidak.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  message: { message: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' },
})

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  message: { message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
})

const GENERIC_RESET_MESSAGE = 'Jika email tersebut terdaftar, tautan reset password sudah kami kirim ke inbox Anda.'

app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (request, response) => {
  const parsed = forgotPasswordSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Email tidak valid.' })

  const user = await findPlatformUserByEmail(parsed.data.email)
  if (!user) {
    // Balasan tetap sama supaya email terdaftar/tidak tidak bisa ditebak.
    return response.json({ message: GENERIC_RESET_MESSAGE })
  }

  if (!isMailConfigured()) {
    console.warn('[forgot-password] SMTP belum dikonfigurasi. Isi MAIL_HOST/MAIL_USER/MAIL_PASS di .env.')
    return response.status(503).json({ message: 'Layanan email belum dikonfigurasi. Hubungi admin platform.' })
  }

  // Token acak dikirim lewat email, yang disimpan database hanya hash-nya (SHA-256).
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const ttlMinutes = env.mail.tokenTtlMinutes
  const tokenId = randomUUID()

  try {
    await pool.execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = :userId AND used_at IS NULL', { userId: user.id })
    await pool.execute(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, request_ip)
      VALUES (:id, :userId, :tokenHash, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL :ttlMinutes MINUTE), :requestIp)
    `, {
      id: tokenId,
      userId: user.id,
      tokenHash,
      ttlMinutes,
      requestIp: request.ip?.slice(0, 64) || null,
    })
  } catch {
    return response.status(503).json({ message: 'Permintaan reset password belum dapat diproses. Coba lagi beberapa saat lagi.' })
  }

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, token })
    return response.json({ message: GENERIC_RESET_MESSAGE })
  } catch (error) {
    // Email gagal = token tidak pernah sampai ke siapa pun. Hapus supaya tidak
    // tertinggal aktif di database dan tidak membatalkan token yang berhasil.
    console.error(`[forgot-password] gagal mengirim email ke ${user.email}:`, error.code || error.message)
    try {
      await pool.execute('DELETE FROM password_reset_tokens WHERE id = :id', { id: tokenId })
    } catch (cleanupError) {
      console.error('[forgot-password] gagal membersihkan token:', cleanupError)
    }

    // Jangan disamarkan sebagai "coba lagi": untuk email terdaftar, kegagalan
    // hampir selalu berarti konfigurasi SMTP, bukan snapShot sesaat.
    const reason = error.code === 'EAUTH'
      ? 'Layanan email ditolak server. Periksa kredensial SMTP di .env.'
      : 'Email reset password gagal dikirim. Periksa konfigurasi SMTP di .env.'
    return response.status(503).json({ message: reason })
  }
})

app.post('/api/auth/reset-password', resetPasswordLimiter, async (request, response) => {
  const parsed = resetPasswordSchema.safeParse(request.body)
  if (!parsed.success) {
    return response.status(400).json({ message: parsed.error.issues[0]?.message || 'Password baru tidak valid.' })
  }

  const { token, password } = parsed.data
  const tokenHash = createHash('sha256').update(token).digest('hex')

  try {
    const [rows] = await pool.execute(`
      SELECT id, user_id AS userId
      FROM password_reset_tokens
      WHERE token_hash = :tokenHash AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `, { tokenHash })
    const record = rows[0]
    if (!record) return response.status(400).json({ message: 'Tautan reset password tidak valid atau sudah kedaluwarsa.' })

    const passwordHash = await bcrypt.hash(password, 12)
    await pool.execute('UPDATE users SET password_hash = :passwordHash WHERE id = :userId', { passwordHash, userId: record.userId })
    await pool.execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = :id', { id: record.id })

    return response.json({ message: 'Password berhasil diperbarui. Silakan masuk dengan password baru.' })
  } catch (error) {
    console.error('[reset-password] gagal menyimpan password baru:', error)
    return response.status(503).json({ message: 'Password belum dapat diperbarui. Coba lagi beberapa saat lagi.' })
  }
})

const appOrderSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  whatsapp: z.string().trim().min(8).max(24),
  email: z.string().trim().email().max(190),
  applicationName: z.enum(['Percetakan', 'Retail / Grosir', 'Bengkel Mobil', 'Bengkel Motor', 'Kuliner / UMKM', 'Travel']),
  features: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  domainMode: z.enum(['subdomain', 'custom']),
})
const appOrderStatusSchema = z.object({ status: z.enum(['PENDING', 'CONTACTED', 'APPROVED', 'REJECTED']) })

// Endpoint publik yang memicu email, jadi limiter-nya lebih ketat dari batas global
// agar tidak dipakai mengirim spam ke alamat mana pun.
const appOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  message: { message: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' },
})

app.post('/api/app-orders', appOrderLimiter, async (request, response) => {
  const parsed = appOrderSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Data pesanan aplikasi tidak valid.' })

  const id = randomUUID()
  const orderCode = `MG-${randomUUID().slice(0, 8).toUpperCase()}`
  const order = parsed.data
  const domainLabel = order.domainMode === 'custom' ? 'Domain sendiri' : 'Subdomain Multi Global'

  try {
    await pool.execute(`
      INSERT INTO app_orders (id, order_code, business_name, whatsapp, email, application_name, features, domain_mode)
      VALUES (:id, :orderCode, :businessName, :whatsapp, :email, :applicationName, :features, :domainMode)
    `, {
      id,
      orderCode,
      businessName: order.businessName,
      whatsapp: order.whatsapp,
      email: order.email,
      applicationName: order.applicationName,
      features: JSON.stringify(order.features),
      domainMode: order.domainMode === 'custom' ? 'CUSTOM_DOMAIN' : 'SUBDOMAIN',
    })
  } catch {
    return response.status(503).json({ message: 'Pesanan belum tersimpan. Pastikan schema database terbaru sudah dijalankan.' })
  }

  // Email gagal tidak boleh membatalkan pesanan yang sudah masuk.
  let emailSent = false
  if (isMailConfigured()) {
    try {
      await sendOrderConfirmationEmail({
        to: order.email,
        businessName: order.businessName,
        orderCode,
        applicationName: order.applicationName,
        features: order.features,
        domainMode: order.domainMode,
      })
      emailSent = true
    } catch (error) {
      console.error('[app-orders] konfirmasi email gagal:', error)
    }
  } else {
    console.warn('[app-orders] SMTP belum dikonfigurasi, email konfirmasi tidak dikirim.')
  }

  response.status(201).json({
    data: { id, orderCode, ...order, domainLabel, status: 'PENDING' },
    emailSent,
  })
})

app.get('/api/admin/app-orders', requireAuth, requireRole(ROLES.PLATFORM_ADMIN), async (_request, response) => {
  try {
    const [orders] = await pool.execute(`
      SELECT id, order_code AS orderCode, business_name AS businessName,
        whatsapp, email, application_name AS applicationName, features,
        domain_mode AS domainMode, status, created_at AS createdAt
      FROM app_orders
      ORDER BY created_at DESC
    `)
    response.json({ data: orders })
  } catch {
    response.status(503).json({ message: 'Daftar pesanan belum tersedia. Jalankan schema database terbaru.' })
  }
})

app.patch('/api/admin/app-orders/:id', requireAuth, requireRole(ROLES.PLATFORM_ADMIN), async (request, response) => {
  const parsed = appOrderStatusSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Status pesanan tidak valid.' })

  try {
    const [result] = await pool.execute(
      'UPDATE app_orders SET status = :status WHERE id = :id',
      { id: request.params.id, status: parsed.data.status },
    )
    if (!result.affectedRows) return response.status(404).json({ message: 'Pesanan tidak ditemukan.' })
    response.json({ message: 'Status pesanan berhasil diperbarui.' })
  } catch {
    response.status(503).json({ message: 'Status pesanan belum dapat diperbarui.' })
  }
})

app.get('/api/tenants', requireAuth, requireRole(ROLES.PLATFORM_ADMIN), async (_request, response) => {
  try {
    const [tenants] = await pool.query('SELECT id, name, slug, business_type, status FROM tenants ORDER BY created_at DESC')
    response.json({ data: tenants })
  } catch {
    response.status(503).json({ message: 'Database tenant belum tersedia. Jalankan schema terlebih dahulu.' })
  }
})

const csAgentSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  avatarUrl: z.string().url().max(500).nullable().optional(),
  isOnline: z.boolean().optional(),
  maxConcurrentChats: z.number().int().min(1).max(100).optional(),
})
const routingSchema = z.object({
  routingMode: z.enum(['LEAST_BUSY', 'ROUND_ROBIN']),
  queueLimit: z.number().int().min(0).max(10000),
  overflowMessage: z.string().trim().min(10).max(255),
})

app.get('/api/admin/cs-agents', requireAuth, requireRole(ROLES.TENANT_ADMIN), async (request, response) => {
  try {
    const [agents] = await pool.execute(`
      SELECT id, display_name AS displayName, avatar_url AS avatarUrl,
        is_online AS isOnline, is_active AS isActive,
        max_concurrent_chats AS maxConcurrentChats, active_chats AS activeChats,
        created_at AS createdAt, updated_at AS updatedAt
      FROM cs_agents
      WHERE tenant_id = :tenantId
      ORDER BY is_active DESC, display_name ASC
    `, { tenantId: request.user.tenantId })
    const [settings] = await pool.execute(`
      SELECT routing_mode AS routingMode, queue_limit AS queueLimit, overflow_message AS overflowMessage
      FROM cs_routing_settings WHERE tenant_id = :tenantId
    `, { tenantId: request.user.tenantId })
    response.json({ data: agents, routing: settings[0] || { routingMode: 'LEAST_BUSY', queueLimit: 50, overflowMessage: 'Semua CS sedang sibuk. Pesan Anda sudah masuk antrean.' } })
  } catch {
    response.status(503).json({ message: 'Pengaturan CS belum tersedia. Jalankan migration database terbaru.' })
  }
})

app.post('/api/admin/cs-agents', requireAuth, requireRole(ROLES.TENANT_ADMIN), async (request, response) => {
  const parsed = csAgentSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Data CS tidak valid.' })
  const agent = parsed.data
  try {
    const id = randomUUID()
    await pool.execute(`
      INSERT INTO cs_agents (id, tenant_id, display_name, avatar_url, is_online, max_concurrent_chats)
      VALUES (:id, :tenantId, :displayName, :avatarUrl, :isOnline, :maxConcurrentChats)
    `, {
      id,
      tenantId: request.user.tenantId,
      displayName: agent.displayName,
      avatarUrl: agent.avatarUrl ?? null,
      isOnline: agent.isOnline ?? true,
      maxConcurrentChats: agent.maxConcurrentChats ?? 5,
    })
    const [created] = await pool.execute('SELECT id, display_name AS displayName, avatar_url AS avatarUrl, is_online AS isOnline, is_active AS isActive, max_concurrent_chats AS maxConcurrentChats, active_chats AS activeChats FROM cs_agents WHERE id = :id', { id })
    response.status(201).json({ data: created[0] })
  } catch {
    response.status(503).json({ message: 'CS belum dapat ditambahkan. Pastikan schema terbaru sudah dijalankan.' })
  }
})

app.patch('/api/admin/cs-agents/:id', requireAuth, requireRole(ROLES.TENANT_ADMIN), async (request, response) => {
  const parsed = csAgentSchema.partial().safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Data perubahan CS tidak valid.' })
  const agent = parsed.data
  try {
    const [result] = await pool.execute(`
      UPDATE cs_agents SET
        display_name = COALESCE(:displayName, display_name),
        avatar_url = COALESCE(:avatarUrl, avatar_url),
        is_online = COALESCE(:isOnline, is_online),
        max_concurrent_chats = COALESCE(:maxConcurrentChats, max_concurrent_chats)
      WHERE id = :id AND tenant_id = :tenantId
    `, { id: request.params.id, tenantId: request.user.tenantId, displayName: agent.displayName ?? null, avatarUrl: agent.avatarUrl ?? null, isOnline: agent.isOnline ?? null, maxConcurrentChats: agent.maxConcurrentChats ?? null })
    if (!result.affectedRows) return response.status(404).json({ message: 'CS tidak ditemukan.' })
    response.json({ message: 'Pengaturan CS berhasil diperbarui.' })
  } catch {
    response.status(503).json({ message: 'CS belum dapat diperbarui.' })
  }
})

app.delete('/api/admin/cs-agents/:id', requireAuth, requireRole(ROLES.TENANT_ADMIN), async (request, response) => {
  try {
    const [result] = await pool.execute('UPDATE cs_agents SET is_active = FALSE, is_online = FALSE WHERE id = :id AND tenant_id = :tenantId', { id: request.params.id, tenantId: request.user.tenantId })
    if (!result.affectedRows) return response.status(404).json({ message: 'CS tidak ditemukan.' })
    response.json({ message: 'CS dinonaktifkan.' })
  } catch {
    response.status(503).json({ message: 'CS belum dapat dinonaktifkan.' })
  }
})

app.patch('/api/admin/cs-routing', requireAuth, requireRole(ROLES.TENANT_ADMIN), async (request, response) => {
  const parsed = routingSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Pengaturan routing tidak valid.' })
  const settings = parsed.data
  try {
    await pool.execute(`
      INSERT INTO cs_routing_settings (tenant_id, routing_mode, queue_limit, overflow_message)
      VALUES (:tenantId, :routingMode, :queueLimit, :overflowMessage)
      ON DUPLICATE KEY UPDATE routing_mode = VALUES(routing_mode), queue_limit = VALUES(queue_limit), overflow_message = VALUES(overflow_message)
    `, { tenantId: request.user.tenantId, ...settings })
    response.json({ message: 'Routing CS berhasil diperbarui.', data: settings })
  } catch {
    response.status(503).json({ message: 'Routing CS belum dapat diperbarui.' })
  }
})

function resolveTenantId(request) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) return 'demo-tenant'
  try {
    return jwt.verify(token, env.jwtSecret).tenantId
  } catch {
    return 'demo-tenant'
  }
}

app.post('/api/cs/assign', async (request, response) => {
  const connection = await pool.getConnection()
  try {
    const tenantId = resolveTenantId(request)
    await connection.beginTransaction()
    const [routingRows] = await connection.execute('SELECT routing_mode AS routingMode, queue_limit AS queueLimit FROM cs_routing_settings WHERE tenant_id = :tenantId FOR UPDATE', { tenantId })
    const routing = routingRows[0] || { routingMode: 'LEAST_BUSY', queueLimit: 50 }
    const order = routing.routingMode === 'ROUND_ROBIN' ? 'updated_at ASC' : 'active_chats ASC, updated_at ASC'
    const [agents] = await connection.query(`SELECT id, display_name AS displayName, avatar_url AS avatarUrl, active_chats AS activeChats, max_concurrent_chats AS maxConcurrentChats FROM cs_agents WHERE tenant_id = ? AND is_active = TRUE AND is_online = TRUE AND active_chats < max_concurrent_chats ORDER BY ${order} LIMIT 1 FOR UPDATE`, [tenantId])
    if (!agents.length) {
      await connection.rollback()
      return response.status(409).json({ assigned: false, queued: true, message: routing.queueLimit > 0 ? 'Semua CS sedang sibuk. Pesan Anda masuk antrean.' : 'Semua CS sedang sibuk. Silakan coba lagi nanti.' })
    }
    const agent = agents[0]
    await connection.execute('UPDATE cs_agents SET active_chats = active_chats + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [agent.id])
    await connection.commit()
    response.json({ assigned: true, agent })
  } catch {
    await connection.rollback()
    response.status(503).json({ message: 'Sistem assignment CS belum tersedia.' })
  } finally {
    connection.release()
  }
})

app.post('/api/cs/:id/release', async (request, response) => {
  try {
    const tenantId = resolveTenantId(request)
    const [result] = await pool.execute('UPDATE cs_agents SET active_chats = GREATEST(active_chats - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = :id AND tenant_id = :tenantId', { id: request.params.id, tenantId })
    if (!result.affectedRows) return response.status(404).json({ message: 'CS tidak ditemukan.' })
    response.json({ released: true })
  } catch {
    response.status(503).json({ message: 'Status percakapan CS belum dapat diperbarui.' })
  }
})

const chatSchema = z.object({
  agent: z.enum(['cs', 'operator', 'admin']).default('cs'),
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().optional(),
})

app.post('/api/ai/chat', (request, response, next) => {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try {
      request.user = jwt.verify(token, env.jwtSecret)
    } catch {
      return response.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' })
    }
  } else {
    request.user = { sub: 'guest', tenantId: 'demo-tenant', role: 'GUEST', name: 'Pengunjung' }
  }
  return next()
}, async (request, response) => {
  const parsed = chatSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Pesan chat tidak valid.' })

  try {
    const result = await replyToCustomer(parsed.data.message, request.user.tenantId)
    return response.json({ ...result, context: { tenantId: request.user.tenantId, agent: parsed.data.agent } })
  } catch (err) {
    console.error('AI chat error:', err)
    return response.status(502).json({ message: 'Gagal terhubung ke layanan AI.' })
  }
})

app.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'Multi Global Backend API',
    adminScope: {
      platformAdminRole: ROLES.PLATFORM_ADMIN,
      platformAdminLabel: 'Admin Owner Penyedia Aplikasi',
      platformAdminManages: ['app-orders', 'tenants', 'plans', 'domains', 'billing'],
      tenantAdminRole: ROLES.TENANT_ADMIN,
      tenantAdminLabel: 'Admin Tenant',
      tenantAdminManages: ['users', 'products', 'customers', 'orders', 'reports'],
    },
    endpoints: {
      health: '/api/health',
      authLogin: '/api/auth/login',
      authForgotPassword: '/api/auth/forgot-password',
      authResetPassword: '/api/auth/reset-password',
      appOrders: '/api/app-orders',
      platformAppOrders: '/api/admin/app-orders',
      aiChat: '/api/ai/chat',
    },
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Terjadi kesalahan pada server.' })
})

app.listen(env.port, () => {
  console.log(`Multi Global API berjalan di http://localhost:${env.port}`)
})
