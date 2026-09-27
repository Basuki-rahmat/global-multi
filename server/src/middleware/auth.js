import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signUser(user) {
  return jwt.sign(
    { sub: user.id, tenantId: user.tenantId, role: user.role, name: user.name },
    env.jwtSecret,
    { expiresIn: '8h' },
  )
}

export function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) return response.status(401).json({ message: 'Token autentikasi diperlukan.' })

  try {
    request.user = jwt.verify(token, env.jwtSecret)
    return next()
  } catch {
    return response.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' })
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) return response.status(403).json({ message: 'Akses tidak diizinkan.' })
    return next()
  }
}
