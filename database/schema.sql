-- ========================================================================
-- SUPABASE DATABASE SCHEMA: LINE WALK THROUGH (INSPECTION BV APP)
-- ========================================================================
-- Petunjuk: Jalankan skrip ini di menu 'SQL Editor' pada Dashboard Supabase.

-- 1. TABEL KATEGORI VALIDASI (Admin Manageable)
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name) VALUES 
    ('HFPA'), 
    ('FTT'), 
    ('PEAC')
ON CONFLICT (name) DO NOTHING;

-- 2. TABEL LINES (Admin Manageable)
CREATE TABLE IF NOT EXISTS lines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default lines (101-116, 201-216)
INSERT INTO lines (name)
SELECT s::text FROM generate_series(101, 116) s
ON CONFLICT (name) DO NOTHING;

INSERT INTO lines (name)
SELECT s::text FROM generate_series(201, 216) s
ON CONFLICT (name) DO NOTHING;

-- 3. TABEL MASTER AREA DEFECT (Admin Manageable)
CREATE TABLE IF NOT EXISTS areas (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default shoe areas
INSERT INTO areas (name) VALUES 
    ('Upper'),
    ('Toe Box'),
    ('Vamp'),
    ('Eyestay'),
    ('Tongue'),
    ('Quarter'),
    ('Collar'),
    ('Heel Counter / Backtab'),
    ('Midsole'),
    ('Outsole'),
    ('Foxing'),
    ('Insole / Sockliner'),
    ('Lining'),
    ('Laces / Eyelets'),
    ('Inner Box / Packaging'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- 4. TABEL MASTER DEFECT TYPES (Admin Manageable)
CREATE TABLE IF NOT EXISTS defect_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default defect types
INSERT INTO defect_types (name) VALUES 
    ('Component alignment (visible or expose component)'),
    ('Component alignment right versus left'),
    ('Cutting/trimming (rubber flash, over triming, component edge; hairy & fraying)'),
    ('Lacing - Finished shoe lacing'),
    ('Midsole shape - less definition, deform and midsole texture'),
    ('Over cement on Finish shoes'),
    ('Over cement on Bottom unit'),
    ('Perforation, laser, or 2nd cutting consistency'),
    ('Staining/Contamination'),
    ('Stitching margins and SPI'),
    ('Thread End'),
    ('Toe spring'),
    ('Toe stuffing (shape and placement inside the shoe)'),
    ('Tongue shape'),
    ('Wrapping paper'),
    ('Wrinkling midsole'),
    ('Wrinkling Upper'),
    ('X-Ray'),
    ('Sockliner Placement - missed position on finished shoes'),
    ('Painting Quality'),
    ('Binding or Folding Quality and consistency'),
    ('Stockfit part Quality (Placement and fitting)'),
    ('Airbag Contamination (PU, Painting and cement)'),
    ('Rat hole'),
    ('Color migration and color mismatch'),
    ('Heel, Collar and Toe shape'),
    ('Hot Knife- Incomplete Hot Knife cutting'),
    ('Inner box condition (crushed, wrinkled, color variation, etc.)'),
    ('Lace loop/pull tab attachment - Broken lace loop/pull tab'),
    ('Midsole Color/Burning'),
    ('Midsole - under/over side wall buffing'),
    ('Emblishment; Quality and molded component definition'),
    ('Outsole colors (dam spillover) - Color Bleeding'),
    ('Over buffing'),
    ('Rocking (>2mm)'),
    ('Off center'),
    ('UPC label damaged'),
    ('Yellowing on sole unit'),
    ('Yellowing on upper'),
    ('Rubber outsole quality (under cure, double skin, concave)'),
    ('Bond Gap and Delamination'),
    ('Broken Lace'),
    ('Twisted and Inverted stance (banana shoe)'),
    ('Material tearing/damage'),
    ('Metal contamination'),
    ('Moldy'),
    ('No-sew Quality'),
    ('Plate/shank damage'),
    ('Size mis-match/ Wrong size/Wrong C/O label/Missing UPC label'),
    ('Stitching (missing or gaps) - Broken / loose stitched'),
    ('Other Defects')
ON CONFLICT (name) DO NOTHING;

-- 5. TABEL STYLES (Style Number & Model Mapping)
CREATE TABLE IF NOT EXISTS styles (
    id BIGSERIAL PRIMARY KEY,
    style_number VARCHAR(100) UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_styles_style_number ON styles(style_number);

-- 6. TABEL INSPECTIONS (Header Data)
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_code VARCHAR(100) UNIQUE NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    auditor TEXT NOT NULL,
    validation_category VARCHAR(100) NOT NULL,
    style_number VARCHAR(100) NOT NULL,
    model TEXT NOT NULL,
    line VARCHAR(50) NOT NULL,
    total_ok INTEGER NOT NULL DEFAULT 0,
    total_ng INTEGER NOT NULL DEFAULT 0,
    ppc_rate VARCHAR(20) NOT NULL DEFAULT '0%',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_code ON inspections(inspection_code);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);

-- 7. TABEL INSPECTION DEFECTS (Normalized / Tall Format untuk Pivot Table)
CREATE TABLE IF NOT EXISTS inspection_defects (
    id BIGSERIAL PRIMARY KEY,
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    pair_number INTEGER NOT NULL,
    status VARCHAR(10) NOT NULL, -- 'OK' atau 'NG'
    defect_type TEXT,
    position VARCHAR(20), -- 'L', 'R', atau 'Both'
    area VARCHAR(100),
    photo_name TEXT,
    photo_data TEXT, -- Base64 atau Storage URL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defects_inspection_id ON inspection_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_defects_pair_status ON inspection_defects(pair_number, status);

-- 8. AKTIFKAN ROW LEVEL SECURITY (RLS) DENGAN AKSES ANOMIM (NO LOGIN)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_defects ENABLE ROW LEVEL SECURITY;

-- Buka izin penuh untuk anon role (agar admin & inspector bisa baca/tulis tanpa login)
DROP POLICY IF EXISTS "Allow public read-write for categories" ON categories;
CREATE POLICY "Allow public read-write for categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for lines" ON lines;
CREATE POLICY "Allow public read-write for lines" ON lines FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for areas" ON areas;
CREATE POLICY "Allow public read-write for areas" ON areas FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for defect_types" ON defect_types;
CREATE POLICY "Allow public read-write for defect_types" ON defect_types FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for styles" ON styles;
CREATE POLICY "Allow public read-write for styles" ON styles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for inspections" ON inspections;
CREATE POLICY "Allow public read-write for inspections" ON inspections FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for inspection_defects" ON inspection_defects;
CREATE POLICY "Allow public read-write for inspection_defects" ON inspection_defects FOR ALL TO anon USING (true) WITH CHECK (true);

-- 9. TABEL ADMIN USERS (Validasi Akses Admin Panel)
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- SHA-256 Hex
    full_name VARCHAR(150),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon select admin_users" ON admin_users;
CREATE POLICY "Allow anon select admin_users" ON admin_users FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon insert admin_users" ON admin_users;
CREATE POLICY "Allow anon insert admin_users" ON admin_users FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon update admin_users" ON admin_users;
CREATE POLICY "Allow anon update admin_users" ON admin_users FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon delete admin_users" ON admin_users;
CREATE POLICY "Allow anon delete admin_users" ON admin_users FOR DELETE TO anon USING (true);

-- Default Superadmin: username 'admin', password 'admin123'
INSERT INTO admin_users (username, password_hash, full_name, role)
VALUES (
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Super Administrator',
    'superadmin'
)
ON CONFLICT (username) DO NOTHING;

