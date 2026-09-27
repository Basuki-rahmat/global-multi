CREATE DATABASE IF NOT EXISTS multi_global CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE multi_global;

CREATE TABLE IF NOT EXISTS tenants (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  business_type ENUM('printing', 'retail', 'car_workshop', 'motorcycle_workshop', 'culinary', 'travel') NOT NULL,
  logo_url VARCHAR(500) NULL,
  status ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPER_ADMIN', 'ADMIN_TENANT', 'OPERATOR', 'CS', 'OWNER') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Token lupa password. Token disimpan sebagai SHA-256, jadi isi database
-- tidak bisa langsung dipakai untuk login.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  request_ip VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_reset_user_token (user_id, token_hash),
  INDEX idx_password_reset_user_active (user_id, used_at, expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_orders (
  id CHAR(36) PRIMARY KEY,
  order_code VARCHAR(24) NOT NULL UNIQUE,
  business_name VARCHAR(160) NOT NULL,
  whatsapp VARCHAR(24) NOT NULL,
  email VARCHAR(190) NOT NULL,
  application_name VARCHAR(120) NOT NULL,
  features JSON NOT NULL,
  domain_mode ENUM('SUBDOMAIN', 'CUSTOM_DOMAIN') NOT NULL,
  status ENUM('PENDING', 'CONTACTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_orders_status_created (status, created_at)
);

-- Database lama yang sudah dibuat sebelum kolom email ada. Dijaga dengan
-- information_schema karena MySQL 8 tidak mendukung ADD COLUMN IF NOT EXISTS.
SET @app_orders_email_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_orders' AND COLUMN_NAME = 'email'
);
SET @app_orders_email_sql := IF(
  @app_orders_email_exists = 0,
  'ALTER TABLE app_orders ADD COLUMN email VARCHAR(190) NULL AFTER whatsapp',
  'DO 0'
);
PREPARE app_orders_email_stmt FROM @app_orders_email_sql;
EXECUTE app_orders_email_stmt;
DEALLOCATE PREPARE app_orders_email_stmt;

-- Backfill pesanan lama supaya kolom NOT NULL di CREATE TABLE tidak jadi masalah
-- saat tabel baru dibuat dari nol tapi pesanan lama tidak ada.
UPDATE app_orders SET email = 'admin@multiglobal.test' WHERE email IS NULL OR email = '';

CREATE TABLE IF NOT EXISTS tenant_users (
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id),
  CONSTRAINT fk_tenant_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS domains (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  type ENUM('SUBDOMAIN', 'CUSTOM_DOMAIN') NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('PENDING', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
  ssl_status ENUM('PENDING', 'ACTIVE', 'ERROR') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_domains_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_agents (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  type ENUM('CS', 'OPERATOR', 'ADMIN') NOT NULL,
  name VARCHAR(120) NOT NULL,
  language VARCHAR(40) NOT NULL DEFAULT 'id-ID',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_agents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  agent_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_conversations_tenant (tenant_id),
  CONSTRAINT fk_ai_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  model VARCHAR(120) NULL,
  token_usage INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_messages_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cs_agents (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_concurrent_chats INT UNSIGNED NOT NULL DEFAULT 5,
  active_chats INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cs_agents_tenant_status (tenant_id, is_active, is_online),
  CONSTRAINT fk_cs_agents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cs_routing_settings (
  tenant_id CHAR(36) PRIMARY KEY,
  routing_mode ENUM('LEAST_BUSY', 'ROUND_ROBIN') NOT NULL DEFAULT 'LEAST_BUSY',
  queue_limit INT UNSIGNED NOT NULL DEFAULT 50,
  overflow_message VARCHAR(255) NOT NULL DEFAULT 'Semua CS sedang sibuk. Pesan Anda sudah masuk antrean.',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cs_routing_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

INSERT IGNORE INTO tenants (id, name, slug, business_type) VALUES ('demo-tenant', 'Percetakan Jaya', 'percetakan-jaya', 'printing');
INSERT IGNORE INTO cs_agents (id, tenant_id, display_name, avatar_url) VALUES ('demo-cs-001', 'demo-tenant', 'CS Multi Global', NULL);
INSERT IGNORE INTO cs_routing_settings (tenant_id) VALUES ('demo-tenant');

-- Admin owner penyedia aplikasi (lokal saja). Password: MultiGlobal123!
-- Seed ini memakai email demo. Sebelum dipakai sungguhan, ganti email DAN password-nya:
-- ganti email lewat SQL, lalu ganti password lewat fitur "Lupa password" di aplikasi.
-- Login demo ini otomatis mati begitu email di atas diganti (lihat server/src/app.js).
INSERT IGNORE INTO users (id, name, email, password_hash, role)
VALUES ('platform-owner', 'Owner Multi Global', 'admin@multiglobal.test', '$2b$10$Zyc4i9TfezL.x0xWX01K5OJn2StCZA868EzEpqqt89Y/kZLSwfE6.', 'SUPER_ADMIN');
INSERT IGNORE INTO tenant_users (tenant_id, user_id) VALUES ('demo-tenant', 'platform-owner');
