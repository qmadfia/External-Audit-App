/**
 * @file supabaseClient.js
 * @description Supabase integration client with local fallback support.
 */

(function(window) {
    // Default config keys in localStorage
    const STORAGE_KEY_URL = 'lwt_supabase_url';
    const STORAGE_KEY_KEY = 'lwt_supabase_anon_key';

    // Default Fallbacks if Supabase is not yet configured
    const DEFAULT_CATEGORIES = ['HFPA', 'FTT', 'PEAC'];
    const DEFAULT_LINES = [
        ...Array.from({length: 16}, (_, i) => String(101 + i)),
        ...Array.from({length: 16}, (_, i) => String(201 + i))
    ];
    const DEFAULT_AREAS = [
        'Upper', 'Toe Box', 'Vamp', 'Eyestay', 'Tongue', 'Quarter',
        'Collar', 'Heel Counter / Backtab', 'Midsole', 'Outsole',
        'Foxing', 'Insole / Sockliner', 'Lining', 'Laces / Eyelets',
        'Inner Box / Packaging', 'Other'
    ];

    // Default Supabase Project Credentials
    const DEFAULT_SUPABASE_URL = 'https://erhozdfadachjoexwrle.supabase.co';
    const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaG96ZGZhZGFjaGpvZXh3cmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzUxNTAsImV4cCI6MjEwNTAxMTE1MH0.1PUtuSQz3LA8RzPTG7z_rCzYAWD8zYngdxbSjyPtr1M';

    let supabaseInstance = null;

    function getCredentials() {
        const url = localStorage.getItem(STORAGE_KEY_URL) || window.__SUPABASE_URL || DEFAULT_SUPABASE_URL;
        const key = localStorage.getItem(STORAGE_KEY_KEY) || window.__SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
        return { url: url.trim(), key: key.trim() };
    }

    function initClient() {
        const { url, key } = getCredentials();
        if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                supabaseInstance = window.supabase.createClient(url, key);
                console.log('✓ Supabase Client initialized successfully with:', url);
                return supabaseInstance;
            } catch (err) {
                console.warn('⚠ Failed to init Supabase client:', err);
                supabaseInstance = null;
            }
        }
        return null;
    }

    // Initialize on load
    initClient();

    const SupabaseService = {
        getCredentials,
        
        saveCredentials(url, key) {
            localStorage.setItem(STORAGE_KEY_URL, url.trim());
            localStorage.setItem(STORAGE_KEY_KEY, key.trim());
            return initClient();
        },

        isConnected() {
            return !!supabaseInstance;
        },

        async testConnection() {
            if (!supabaseInstance) initClient();
            if (!supabaseInstance) {
                return { success: false, message: 'URL atau Anon Key Supabase belum diisi atau script Supabase belum termuat.' };
            }
            try {
                const { data, error } = await supabaseInstance.from('categories').select('count', { count: 'exact', head: true });
                if (error) throw error;
                return { success: true, message: 'Koneksi ke Supabase berhasil! Tabel ditemukan.' };
            } catch (err) {
                console.error('Supabase connection test error:', err);
                return { success: false, message: 'Gagal tersambung: ' + (err.message || 'Cek kembali URL, Key, dan pastikan schema.sql sudah dijalankan di Supabase.') };
            }
        },

        // ==========================================
        // 1. KATEGORI VALIDASI
        // ==========================================
        async getCategories() {
            if (supabaseInstance) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('categories')
                        .select('*')
                        .order('name', { ascending: true });
                    if (!error && data && data.length > 0) return data;
                } catch (e) {
                    console.warn('Fallback to default categories due to Supabase error:', e);
                }
            }
            // Fallback
            const local = JSON.parse(localStorage.getItem('lwt_custom_categories') || 'null');
            if (local && local.length > 0) return local;
            return DEFAULT_CATEGORIES.map((name, id) => ({ id: id + 1, name }));
        },

        async addCategory(name) {
            const cleanName = name.trim();
            if (!cleanName) throw new Error('Nama kategori tidak boleh kosong');
            if (supabaseInstance) {
                const { data, error } = await supabaseInstance
                    .from('categories')
                    .insert([{ name: cleanName }])
                    .select();
                if (error) throw error;
                return data[0];
            } else {
                const cats = await this.getCategories();
                if (cats.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
                    throw new Error('Kategori sudah ada');
                }
                const newCat = { id: Date.now(), name: cleanName };
                cats.push(newCat);
                localStorage.setItem('lwt_custom_categories', JSON.stringify(cats));
                return newCat;
            }
        },

        async deleteCategory(id) {
            if (supabaseInstance) {
                const { error } = await supabaseInstance
                    .from('categories')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return true;
            } else {
                let cats = await this.getCategories();
                cats = cats.filter(c => c.id != id);
                localStorage.setItem('lwt_custom_categories', JSON.stringify(cats));
                return true;
            }
        },

        // ==========================================
        // 2. LINES
        // ==========================================
        async getLines() {
            if (supabaseInstance) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('lines')
                        .select('*')
                        .order('name', { ascending: true });
                    if (!error && data && data.length > 0) return data;
                } catch (e) {
                    console.warn('Fallback to default lines due to Supabase error:', e);
                }
            }
            const local = JSON.parse(localStorage.getItem('lwt_custom_lines') || 'null');
            if (local && local.length > 0) return local;
            return DEFAULT_LINES.map((name, id) => ({ id: id + 1, name }));
        },

        async addLine(name) {
            const cleanName = name.trim();
            if (!cleanName) throw new Error('Nama/Nomor Line tidak boleh kosong');
            if (supabaseInstance) {
                const { data, error } = await supabaseInstance
                    .from('lines')
                    .insert([{ name: cleanName }])
                    .select();
                if (error) throw error;
                return data[0];
            } else {
                const lines = await this.getLines();
                if (lines.some(l => l.name.toLowerCase() === cleanName.toLowerCase())) {
                    throw new Error('Line sudah ada');
                }
                const newLine = { id: Date.now(), name: cleanName };
                lines.push(newLine);
                localStorage.setItem('lwt_custom_lines', JSON.stringify(lines));
                return newLine;
            }
        },

        async deleteLine(id) {
            if (supabaseInstance) {
                const { error } = await supabaseInstance
                    .from('lines')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return true;
            } else {
                let lines = await this.getLines();
                lines = lines.filter(l => l.id != id);
                localStorage.setItem('lwt_custom_lines', JSON.stringify(lines));
                return true;
            }
        },

        // ==========================================
        // 3. MASTER AREAS
        // ==========================================
        async getAreas() {
            if (supabaseInstance) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('areas')
                        .select('*')
                        .order('name', { ascending: true });
                    if (!error && data && data.length > 0) return data;
                } catch (e) {
                    console.warn('Fallback to default areas due to Supabase error:', e);
                }
            }
            const local = JSON.parse(localStorage.getItem('lwt_custom_areas') || 'null');
            if (local && local.length > 0) return local;
            return DEFAULT_AREAS.map((name, id) => ({ id: id + 1, name }));
        },

        async addArea(name) {
            const cleanName = name.trim();
            if (!cleanName) throw new Error('Nama Area tidak boleh kosong');
            if (supabaseInstance) {
                const { data, error } = await supabaseInstance
                    .from('areas')
                    .insert([{ name: cleanName }])
                    .select();
                if (error) throw error;
                return data[0];
            } else {
                const areas = await this.getAreas();
                if (areas.some(a => a.name.toLowerCase() === cleanName.toLowerCase())) {
                    throw new Error('Area sudah ada');
                }
                const newArea = { id: Date.now(), name: cleanName };
                areas.push(newArea);
                localStorage.setItem('lwt_custom_areas', JSON.stringify(areas));
                return newArea;
            }
        },

        async deleteArea(id) {
            if (supabaseInstance) {
                const { error } = await supabaseInstance
                    .from('areas')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return true;
            } else {
                let areas = await this.getAreas();
                areas = areas.filter(a => a.id != id);
                localStorage.setItem('lwt_custom_areas', JSON.stringify(areas));
                return true;
            }
        },

        // ==========================================
        // 4. MASTER DEFECT TYPES
        // ==========================================
        async getDefectTypes() {
            if (supabaseInstance) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('defect_types')
                        .select('*')
                        .order('name', { ascending: true });
                    if (!error && data && data.length > 0) return data;
                } catch (e) {
                    console.warn('Fallback to default defect types due to Supabase error:', e);
                }
            }
            const local = JSON.parse(localStorage.getItem('lwt_custom_defects') || 'null');
            if (local && local.length > 0) return local;
            const defaults = window.defectTypes || [];
            return defaults.map((name, id) => ({ id: id + 1, name }));
        },

        async addDefectType(name) {
            const cleanName = name.trim();
            if (!cleanName) throw new Error('Nama Defect tidak boleh kosong');
            if (supabaseInstance) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('defect_types')
                        .insert([{ name: cleanName }])
                        .select();
                    if (!error && data && data[0]) return data[0];
                } catch (err) {
                    console.warn('Supabase defect_types insert failed, saving to local:', err);
                }
            }
            const list = await this.getDefectTypes();
            if (list.some(d => d.name.toLowerCase() === cleanName.toLowerCase())) {
                throw new Error('Tipe defect sudah ada');
            }
            const newDefect = { id: Date.now(), name: cleanName };
            list.push(newDefect);
            localStorage.setItem('lwt_custom_defects', JSON.stringify(list));
            if (window.defectTypes && !window.defectTypes.includes(cleanName)) {
                window.defectTypes.push(cleanName);
            }
            return newDefect;
        },

        async deleteDefectType(id, name) {
            if (supabaseInstance) {
                try {
                    const { error } = await supabaseInstance
                        .from('defect_types')
                        .delete()
                        .eq('id', id);
                    if (!error) return true;
                } catch (e) {
                    console.warn('Supabase delete defect error:', e);
                }
            }
            let list = await this.getDefectTypes();
            list = list.filter(d => d.id != id && d.name !== name);
            localStorage.setItem('lwt_custom_defects', JSON.stringify(list));
            if (window.defectTypes && name) {
                window.defectTypes = window.defectTypes.filter(x => x !== name);
            }
            return true;
        },

        // ==========================================
        // 5. STYLES & MODELS
        // ==========================================
        async getStyles({ search = '', limit = 50, page = 1 } = {}) {
            if (supabaseInstance) {
                try {
                    let query = supabaseInstance
                        .from('styles')
                        .select('*', { count: 'exact' });

                    if (search) {
                        query = query.or(`style_number.ilike.%${search}%,model_name.ilike.%${search}%`);
                    }

                    const from = (page - 1) * limit;
                    const to = from + limit - 1;
                    const { data, count, error } = await query
                        .order('created_at', { ascending: false })
                        .range(from, to);

                    if (!error) {
                        return { data, totalCount: count || 0 };
                    }
                } catch (e) {
                    console.warn('Fallback to local styleModelMap:', e);
                }
            }

            // Fallback search directly in styleModelMap (from database.js)
            const map = window.styleModelMap || {};
            const keys = Object.keys(map);
            let filteredKeys = keys;
            if (search) {
                const s = search.toLowerCase();
                filteredKeys = keys.filter(k => k.toLowerCase().includes(s) || (map[k] && map[k].toLowerCase().includes(s)));
            }
            const totalCount = filteredKeys.length;
            const from = (page - 1) * limit;
            const slice = filteredKeys.slice(from, from + limit);
            const data = slice.map((k, idx) => ({
                id: from + idx + 1,
                style_number: k,
                model_name: map[k],
                created_at: new Date().toISOString()
            }));

            return { data, totalCount };
        },

        async searchStylesAutocomplete(keyword, limit = 15) {
            if (!keyword) return [];
            if (supabaseInstance) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('styles')
                        .select('style_number, model_name')
                        .or(`style_number.ilike.%${keyword}%,model_name.ilike.%${keyword}%`)
                        .limit(limit);
                    if (!error && data && data.length > 0) {
                        return data;
                    }
                } catch (e) {
                    console.warn('Supabase autocomplete search failed, using local:', e);
                }
            }

            // Fallback from database.js
            const map = window.styleModelMap || {};
            const keys = Object.keys(map);
            const lower = keyword.toLowerCase();
            const results = [];
            for (let i = 0; i < keys.length && results.length < limit; i++) {
                const key = keys[i];
                if (key.toLowerCase().includes(lower)) {
                    results.push({ style_number: key, model_name: map[key] });
                }
            }
            return results;
        },

        async addStyle(styleNumber, modelName) {
            const cleanStyle = styleNumber.trim().toUpperCase();
            const cleanModel = modelName.trim().toUpperCase();
            if (!cleanStyle || !cleanModel) throw new Error('Style Number dan Model wajib diisi');

            if (supabaseInstance) {
                const { data, error } = await supabaseInstance
                    .from('styles')
                    .insert([{ style_number: cleanStyle, model_name: cleanModel }])
                    .select();
                if (error) throw error;
                // Also update local cache
                if (window.styleModelMap) window.styleModelMap[cleanStyle] = cleanModel;
                return data[0];
            } else {
                if (!window.styleModelMap) window.styleModelMap = {};
                window.styleModelMap[cleanStyle] = cleanModel;
                const localAdditions = JSON.parse(localStorage.getItem('lwt_local_styles') || '{}');
                localAdditions[cleanStyle] = cleanModel;
                localStorage.setItem('lwt_local_styles', JSON.stringify(localAdditions));
                return { id: Date.now(), style_number: cleanStyle, model_name: cleanModel };
            }
        },

        async deleteStyle(id, styleNumber) {
            if (supabaseInstance && id) {
                const { error } = await supabaseInstance
                    .from('styles')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            }
            if (styleNumber && window.styleModelMap) {
                delete window.styleModelMap[styleNumber];
                const localAdditions = JSON.parse(localStorage.getItem('lwt_local_styles') || '{}');
                delete localAdditions[styleNumber];
                localStorage.setItem('lwt_local_styles', JSON.stringify(localAdditions));
            }
            return true;
        },

        async batchSeedFromDatabaseJs(onProgress) {
            if (!supabaseInstance) throw new Error('Koneksi Supabase belum aktif');
            const map = window.styleModelMap || {};
            const keys = Object.keys(map);
            const total = keys.length;
            if (total === 0) throw new Error('Data styleModelMap di database.js kosong');

            const batchSize = 250;
            let inserted = 0;

            for (let i = 0; i < total; i += batchSize) {
                const chunkKeys = keys.slice(i, i + batchSize);
                const records = chunkKeys.map(k => ({
                    style_number: k,
                    model_name: map[k]
                }));

                const { error } = await supabaseInstance
                    .from('styles')
                    .upsert(records, { onConflict: 'style_number' });

                if (error) throw error;
                inserted += records.length;
                if (typeof onProgress === 'function') {
                    onProgress(inserted, total);
                }
            }

            return { totalInserted: inserted };
        },

        // ==========================================
        // 5. INSPECTIONS & DEFECTS (TALL FORMAT)
        // ==========================================
        async saveInspectionCloud(inspectionHeader, defectRows) {
            // inspectionHeader: { inspection_code, inspection_date, auditor, validation_category, style_number, model, line, total_ok, total_ng, ppc_rate }
            // defectRows: [ { pair_number, status, defect_type, position, area, photo_name, photo_data } ]
            if (!supabaseInstance) {
                console.warn('Supabase not connected. Skipping cloud save.');
                return null;
            }

            try {
                // 1. Insert header
                const { data: headerData, error: headerErr } = await supabaseInstance
                    .from('inspections')
                    .insert([inspectionHeader])
                    .select();

                if (headerErr) throw headerErr;
                const inspectionId = headerData[0].id;

                // 2. Insert defect items in tall format
                if (defectRows && defectRows.length > 0) {
                    const batchSize = 100;
                    for (let i = 0; i < defectRows.length; i += batchSize) {
                        const chunk = defectRows.slice(i, i + batchSize).map(row => ({
                            inspection_id: inspectionId,
                            pair_number: row.pair_number,
                            status: row.status,
                            defect_type: row.defect_type || null,
                            position: row.position || null,
                            area: row.area || null,
                            photo_name: row.photo_name || null,
                            photo_data: row.photo_data || null
                        }));

                        const { error: itemsErr } = await supabaseInstance
                            .from('inspection_defects')
                            .insert(chunk);

                        if (itemsErr) {
                            console.error('Error saving defect row chunk:', itemsErr);
                        }
                    }
                }

                console.log('✓ Inspection saved successfully to Supabase with ID:', inspectionId);
                return headerData[0];
            } catch (err) {
                console.error('Failed to save inspection to Supabase:', err);
                throw err;
            }
        },

        async getInspectionsCloud({ limit = 50, page = 1, search = '' } = {}) {
            if (!supabaseInstance) return [];
            try {
                let query = supabaseInstance
                    .from('inspections')
                    .select('*', { count: 'exact' });

                if (search) {
                    query = query.or(`inspection_code.ilike.%${search}%,auditor.ilike.%${search}%,style_number.ilike.%${search}%`);
                }

                const from = (page - 1) * limit;
                const to = from + limit - 1;
                const { data, count, error } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;
                return { data, totalCount: count || 0 };
            } catch (e) {
                console.error('Error fetching inspections from Supabase:', e);
                return { data: [], totalCount: 0 };
            }
        },

        async getInspectionFullDetails(inspectionId) {
            if (!supabaseInstance) return null;
            try {
                const { data: header, error: hErr } = await supabaseInstance
                    .from('inspections')
                    .select('*')
                    .eq('id', inspectionId)
                    .single();

                if (hErr) throw hErr;

                const { data: defects, error: dErr } = await supabaseInstance
                    .from('inspection_defects')
                    .select('*')
                    .eq('inspection_id', inspectionId)
                    .order('pair_number', { ascending: true })
                    .order('id', { ascending: true });

                if (dErr) throw dErr;

                return { header, defects };
            } catch (e) {
                console.error('Error fetching full inspection details:', e);
                throw e;
            }
        },

        async deleteInspectionCloud(inspectionId) {
            if (!supabaseInstance) return false;
            try {
                const { error } = await supabaseInstance
                    .from('inspections')
                    .delete()
                    .eq('id', inspectionId);
                if (error) throw error;
                return true;
            } catch (e) {
                console.error('Error deleting inspection from Supabase:', e);
                throw e;
            }
        }
    };

    window.SupabaseService = SupabaseService;
})(window);
