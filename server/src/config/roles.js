// Dua tingkat admin harus dibedakan secara tegas:
// - PLATFORM_ADMIN  : admin owner penyedia aplikasi (pemilik/operator platform Multi Global),
//                     mengelola seluruh tenant, paket, domain, dan PESANAN PEMBUATAN APLIKASI.
// - TENANT_ADMIN    : admin sebuah tenant, hanya mengelola data di dalam tenant-nya sendiri.
export const ROLES = {
  PLATFORM_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'ADMIN_TENANT',
  OPERATOR: 'OPERATOR',
  CS: 'CS',
  TENANT_OWNER: 'OWNER',
}

export const ROLE_LABELS = {
  [ROLES.PLATFORM_ADMIN]: 'Admin Owner Penyedia Aplikasi',
  [ROLES.TENANT_ADMIN]: 'Admin Tenant',
  [ROLES.OPERATOR]: 'Operator',
  [ROLES.CS]: 'Customer Service',
  [ROLES.TENANT_OWNER]: 'Owner Tenant',
}

export const ACCESS_SCOPES = {
  PLATFORM: 'platform',
  TENANT: 'tenant',
}

export function describeRole(role) {
  return {
    role,
    roleLabel: ROLE_LABELS[role] || role,
    scope: role === ROLES.PLATFORM_ADMIN ? ACCESS_SCOPES.PLATFORM : ACCESS_SCOPES.TENANT,
  }
}
