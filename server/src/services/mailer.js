import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

// Header anti-balas-otomatis (RFC 3834 + yang dipakai Gmail/Outlook).
// Tanpa header ini, Penjawab Otomatis cPanel dan vacation responder di
// sisi penerima akan membalas email transaksi kita, sehingga muncul
// email bolak-balik yang tidak berguna.
const NO_AUTO_REPLY_HEADERS = {
  'Auto-Submitted': 'auto-generated',
  'X-Auto-Response-Suppress': 'All',
  'X-Auto-Response-Suppress-Control': 'reject',
  'Precedence': 'bulk',
  'X-Entity-Ref-ID': '',
}

let transport

export function isMailConfigured() {
  return Boolean(env.mail.host && env.mail.user && env.mail.pass && env.mail.fromAddress)
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: { user: env.mail.user, pass: env.mail.pass },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    })
  }
  return transport
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildOrderConfirmationEmail({ businessName, orderCode, applicationName, features, domainMode }) {
  const safeBusiness = escapeHtml(businessName)
  const safeCode = escapeHtml(orderCode)
  const safeApp = escapeHtml(applicationName)
  const featureList = features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')
  const domainLabel = domainMode === 'CUSTOM_DOMAIN' ? 'Domain sendiri' : 'Subdomain Multi Global'

  return {
    subject: `Registrasi ${applicationName} Anda Diterima - ${orderCode}`,
    text: [
      `Halo ${businessName},`,
      '',
      'Terima kasih. Registrasi Anda sudah kami terima.',
      '',
      `Kode pesanan : ${orderCode}`,
      `Jenis aplikasi: ${applicationName}`,
      `Fitur        : ${features.join(', ')}`,
      `Domain       : ${domainLabel}`,
      '',
      'Tim kami akan menghubungi Anda untuk langkah berikutnya.',
      'Jika tidak ada yang perlu ditanyakan, abaikan email ini.',
      '',
      '--',
      'Multi Global',
    ].join('\n'),
    html: `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="background:#0f2a5c;padding:20px 24px;color:#ffffff;">
          <div style="font-size:17px;font-weight:700;">Multi Global</div>
          <div style="font-size:12px;opacity:.85;margin-top:2px;">Satu Platform — Banyak Usaha</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 12px;font-size:18px;line-height:1.4;">Halo ${safeBusiness},</h1>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">
            Terima kasih. Registrasi <b>${safeApp}</b> Anda sudah kami terima dan akan kami lanjutkan ke tim kami.
          </p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:13px;">
            <tr>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;">Kode pesanan</td>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;font-family:'Segoe UI',monospace;font-weight:700;color:#0f172a;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Jenis aplikasi</td>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">${safeApp}</td>
            </tr>
            <tr>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Domain</td>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(domainLabel)}</td>
            </tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;">Fitur yang dipilih</p>
          <ul style="margin:0 0 20px;padding-left:20px;font-size:13px;line-height:1.7;color:#334155;">${featureList}</ul>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
            Simpan kode pesanan di atas. Tim kami akan menghubungi Anda pada
            <b>noreply@fadlanbersaudara.com</b> untuk langkah berikutnya. Jika tidak ada yang perlu ditanyakan, abaikan email ini.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;font-size:11px;color:#94a3b8;">
          Email konfirmasi otomatis. Jangan membalas email ini.
        </td>
      </tr>
    </table>
  </body>
</html>`,
  }
}

function buildResetEmail({ name, resetUrl, ttlMinutes }) {
  const safeName = escapeHtml(name || 'Pengguna')
  const safeUrl = escapeHtml(resetUrl)
  const minutes = Number(ttlMinutes)

  return {
    subject: 'Reset Password Akun Multi Global Anda',
    text: [
      `Halo ${name || 'Pengguna'},`,
      '',
      'Kami menerima permintaan reset password untuk akun Multi Global Anda.',
      'Gunakan tautan berikut untuk membuat password baru:',
      resetUrl,
      '',
      `Tautan berlaku ${minutes} menit dan hanya dapat dipakai satu kali.`,
      'Jika Anda tidak meminta reset password, abaikan email ini dan tidak ada perubahan yang dilakukan.',
      '',
      '--',
      'Multi Global',
    ].join('\n'),
    html: `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="background:#0f2a5c;padding:20px 24px;color:#ffffff;">
          <div style="font-size:17px;font-weight:700;letter-spacing:.2px;">Multi Global</div>
          <div style="font-size:12px;opacity:.85;margin-top:2px;">Satu Platform — Banyak Usaha</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 12px;font-size:18px;line-height:1.4;">Halo ${safeName},</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
            Kami menerima permintaan reset password untuk akun Multi Global Anda. Klik tombol di bawah untuk membuat password baru.
          </p>
          <p style="margin:0 0 20px;">
            <a href="${safeUrl}" style="display:inline-block;background:#f59e0b;color:#1f2937;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">Buat Password Baru</a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">
            Jika tombol tidak berfungsi, salin tautan ini ke browser Anda:
          </p>
          <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" style="color:#1d4ed8;">${safeUrl}</a></p>
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">
            Tautan berlaku <strong>${minutes} menit</strong> dan hanya dapat dipakai satu kali.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
            Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;font-size:11px;color:#94a3b8;">
          Email ini dikirim otomatis oleh sistem Multi Global. Jangan membalas email ini.
        </td>
      </tr>
    </table>
  </body>
</html>`,
  }
}

export function buildPasswordResetUrl(token) {
  const base = env.mail.publicUrl || env.clientUrl
  return `${base.replace(/\/+$/, '')}/?reset-password=${encodeURIComponent(token)}`
}

// Satu pintu untuk semua email transaksional (registrasi, reset password, notifikasi).
// Sender memakai mailbox khusus yang tidak punya Penjawab Otomatis, sementara
// replyTo diarahkan ke mailbox manusia supaya balas-jawab tetap sampai ke orangnya.
export async function sendTransactionalMail({ to, subject, text, html, replyTo }) {
  const info = await getTransport().sendMail({
    from: { name: env.mail.fromName, address: env.mail.fromAddress },
    to,
    replyTo: replyTo || env.mail.replyTo || undefined,
    subject,
    text,
    html,
    headers: NO_AUTO_REPLY_HEADERS,
  })

  return { messageId: info.messageId }
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = buildPasswordResetUrl(token)
  const message = buildResetEmail({ name, resetUrl, ttlMinutes: env.mail.tokenTtlMinutes })
  return sendTransactionalMail({ to, subject: message.subject, text: message.text, html: message.html })
}

export async function sendOrderConfirmationEmail({ to, businessName, orderCode, applicationName, features, domainMode }) {
  const message = buildOrderConfirmationEmail({ businessName, orderCode, applicationName, features, domainMode })
  return sendTransactionalMail({ to, subject: message.subject, text: message.text, html: message.html })
}
