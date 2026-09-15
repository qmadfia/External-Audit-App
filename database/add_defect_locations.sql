-- ========================================================================
-- QUERY SQL: TAMBAH DEFECT LOCATIONS (AREAS) KE SUPABASE
-- ========================================================================
-- Jalankan query ini di SQL Editor pada Supabase Dashboard:

INSERT INTO areas (name) VALUES 
    ('Quarter Medial'),
    ('Quarter Lateral'),
    ('Forefoot Medial'),
    ('Forefoot Lateral'),
    ('Toe'),
    ('Heel'),
    ('Heel Lateral'),
    ('Heel Medial'),
    ('Lace'),
    ('Interior'),
    ('Collar'),
    ('Bottom Side')
ON CONFLICT (name) DO NOTHING;
