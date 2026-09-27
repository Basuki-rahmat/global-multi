import 'dotenv/config'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL_CS || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  openaiApiKeys: (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  mail: {
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT || 465),
    // 465 = SSL langsung (umum di cPanel/sPanel), 587 = STARTTLS (umum di Gmail/Exim)
    secure: (process.env.MAIL_SECURE || '').toLowerCase() === 'true'
      || (!(process.env.MAIL_SECURE || '').length && Number(process.env.MAIL_PORT || 465) === 465),
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    fromName: process.env.MAIL_FROM_NAME || 'Multi Global',
    fromAddress: process.env.MAIL_FROM || process.env.MAIL_USER || '',
    // Mailbox manusia yang menerima balas-jawab. Sender tetap mailbox tanpa auto-responder.
    replyTo: process.env.MAIL_REPLY_TO || '',
    // Alamat aplikasi untuk tautan reset. Kosongkan agar memakai clientUrl.
    publicUrl: (process.env.APP_URL || '').replace(/\/+$/, ''),
    tokenTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60),
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'multi_global',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
}
