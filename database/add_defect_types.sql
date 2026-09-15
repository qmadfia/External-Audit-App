-- ========================================================================
-- QUERY SQL: TAMBAH DEFECT TYPES (DROPDOWN) KE SUPABASE
-- ========================================================================
-- Petunjuk: Jalankan skrip ini di menu 'SQL Editor' pada Dashboard Supabase Anda:
-- Project: https://erhozdfadachjoexwrle.supabase.co

INSERT INTO defect_types (name) VALUES 
    ('Airbag Defect'),
    ('Alignment L+R Symmetry'),
    ('Bond gap / Rat hole'),
    ('Delamination'),
    ('Over cement'),
    ('Contamination'),
    ('Interior'),
    ('Accessory'),
    ('Color / Paint migration, bleeding'),
    ('Color mis-match'),
    ('Paint surface quality'),
    ('Material damaged'),
    ('Holes Quality(eyelet or upper perforation)'),
    ('Over buffing'),
    ('Jump / Broken / Loose Stitch'),
    ('Thread end'),
    ('Stitching margin'),
    ('Off-center'),
    ('Rocking'),
    ('Toe Spring'),
    ('Wrinkle or Deformation Upper'),
    ('Wrinkle or Deformation Bottom'),
    ('X-ray'),
    ('Yellowing'),
    ('Others')
ON CONFLICT (name) DO NOTHING;
