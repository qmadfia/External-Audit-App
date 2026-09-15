-- ========================================================================
-- SUPABASE SQL: TABEL ADMIN USERS & AUTENTIKASI ADMIN PANEL
-- ========================================================================
-- Petunjuk: Jalankan skrip ini di menu 'SQL Editor' pada Dashboard Supabase Anda:
-- Project: https://erhozdfadachjoexwrle.supabase.co

-- 1. Buat Tabel admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- SHA-256 Hex Hash
    full_name VARCHAR(150),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan Akses (Policy) untuk Role Anon (Frontend)
DROP POLICY IF EXISTS "Allow anon select admin_users" ON admin_users;
CREATE POLICY "Allow anon select admin_users" ON admin_users FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert admin_users" ON admin_users;
CREATE POLICY "Allow anon insert admin_users" ON admin_users FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update admin_users" ON admin_users;
CREATE POLICY "Allow anon update admin_users" ON admin_users FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete admin_users" ON admin_users;
CREATE POLICY "Allow anon delete admin_users" ON admin_users FOR DELETE TO anon USING (true);

-- 4. Seed Akun Admin Awal:
-- Username: admin
-- Password default: admin123
-- SHA-256 dari 'admin123' adalah: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO admin_users (username, password_hash, full_name, role)
VALUES (
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Super Administrator',
    'superadmin'
)
ON CONFLICT (username) DO NOTHING;
