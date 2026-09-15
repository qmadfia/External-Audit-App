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

-- 4. TABEL STYLES (Style Number & Model Mapping)
CREATE TABLE IF NOT EXISTS styles (
    id BIGSERIAL PRIMARY KEY,
    style_number VARCHAR(100) UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_styles_style_number ON styles(style_number);

-- 5. TABEL INSPECTIONS (Header Data)
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

-- 6. TABEL INSPECTION DEFECTS (Normalized / Tall Format untuk Pivot Table)
-- Jika Pair OK: defect_type = null, position = null, area = null
-- Jika Pair NG: tiap defect dicatat sebagai 1 baris
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

-- 7. AKTIFKAN ROW LEVEL SECURITY (RLS) DENGAN AKSES ANOMIM (NO LOGIN)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "Allow public read-write for styles" ON styles;
CREATE POLICY "Allow public read-write for styles" ON styles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for inspections" ON inspections;
CREATE POLICY "Allow public read-write for inspections" ON inspections FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for inspection_defects" ON inspection_defects;
CREATE POLICY "Allow public read-write for inspection_defects" ON inspection_defects FOR ALL TO anon USING (true) WITH CHECK (true);
