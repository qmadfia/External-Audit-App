/**
 * @file script.js
 * @description Main application logic for Line Walk Through with Supabase integration,
 * claymorphism UI, interactive bilingual support (ID/EN with flag), split-input NG defect flow,
 * and tall-format pivot-ready reporting.
 */

document.addEventListener('DOMContentLoaded', () => {
    const { SupabaseService } = window;

    // =========================================================================
    // 1. CONSTANTS & VARIABLES
    // =========================================================================
    const TOTAL_PAIRS = 20;
    const DRAFT_KEY = 'lineWalkThroughDraft_v2';
    const DRAFT_PHOTOS_STORE = 'draftPhotos';
    const DB_NAME = 'LWT_DB';
    const DB_VERSION = 2;
    const STORE_NAME = 'inspections';

    const MAX_PHOTOS_PER_PAIR = 10;
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const MAX_WIDTH = 1024;
    const MAX_HEIGHT = 1024;

    let currentLang = localStorage.getItem('lwt_language') || 'id';
    let saveTimeout = null;
    let activePairForModal = null;
    let tempDefectsListForModal = [];
    let selectedPositionForModal = 'Both';
    let lastSavedFileData = null;

    // =========================================================================
    // 2. BILINGUAL TRANSLATION DICTIONARY (ID & EN)
    // =========================================================================
    const translations = {
        id: {
            app_title: "Line Walk Through",
            admin_panel_btn: "Admin Panel",
            status_online: "Cloud Sync Aktif",
            status_offline: "Mode Lokal",
            auditor_label: "Auditor",
            auditor_ph: "Nama Auditor...",
            category_label: "Validation Category",
            category_ph: "Pilih Kategori...",
            style_label: "Style Number",
            style_ph: "Ketik untuk mencari...",
            model_label: "Model",
            model_ph: "Otomatis terisi",
            line_label: "Line",
            line_ph: "Pilih Line...",
            inspection_heading: "Data Inspeksi Sepatu (20 Pairs)",
            ppc_ok: "Total OK",
            ppc_ng: "Total NG",
            ppc_rate: "PPC Rate",
            col_pair: "Pair #",
            col_status: "Status",
            col_defect: "Rincian Defect (Tipe | Posisi | Area)",
            col_photo: "Foto Defect",
            col_reset: "Reset",
            btn_save_inspection: "💾 Simpan Data & Selesai Inspeksi",
            saved_title: "File Tersimpan di Perangkat",
            saved_limit: "(Maksimal 10 inspeksi lokal)",
            no_saved_files: "Belum ada file inspeksi tersimpan di perangkat ini.",
            placeholder_ng_fill: "Pilih 'NG' untuk mengisi",
            placeholder_add_defect: "Klik untuk tambah defect...",
            btn_photo: "+ Foto",
            step1_title: "Tipe Defect",
            manual_defect_label: "Input Manual (Default)",
            manual_defect_ph: "Ketik nama defect...",
            select_defect_label: "Pilih dari Master List",
            select_defect_ph: "-- Pilih Rekomendasi Defect --",
            step2_title: "Pilih Posisi",
            pos_left: "Left (L)",
            pos_right: "Right (R)",
            pos_both: "Both (L & R)",
            step3_title: "Pilih Area Sepatu",
            manual_area_label: "Input Manual",
            manual_area_ph: "Ketik area manual...",
            select_area_label: "Pilih dari Master List",
            select_area_ph: "-- Pilih Area Sepatu --",
            btn_add_defect: "+ Tambahkan Defect Ini",
            defect_list_title: "Daftar Defect untuk Pair Ini",
            no_defects_yet: "Belum ada defect yang ditambahkan.",
            btn_cancel: "Batal",
            btn_save_pair: "✓ Simpan untuk Pair Ini",
            btn_confirm: "Konfirmasi",
            finish_title: "Inspeksi Selesai & Berhasil Disimpan!",
            finish_desc: "Data telah tersimpan ke sistem. Anda dapat langsung mengunduh file laporan.",
            btn_dl_excel: "📊 Download Report Excel",
            btn_dl_zip: "📦 Download Bundle ZIP",
            btn_close_new: "Tutup & Mulai Inspeksi Baru",
            alert_fill_auditor: "Harap isi nama Auditor.",
            alert_select_cat: "Harap pilih Validation Category.",
            alert_fill_style: "Harap isi Style Number.",
            alert_select_line: "Harap pilih Line.",
            alert_defect_required: "Pair #{pair} berstatus NG namun belum ada detail defect. Harap lengkapi terlebih dahulu.",
            confirm_partial_inspection: "Inspeksi baru terisi {count} dari {total} pair. Apakah Anda tetap ingin menyimpan?",
            confirm_reset_row: "Reset inspeksi untuk Pair #{pair}?",
            confirm_delete_saved: "Hapus file rekaman lokal ini?",
            photo_limit_alert: "Maksimal {max} foto per pair.",
            draft_saved_text: "Draf tersimpan di memori",
            btn_clear_draft: "Hapus Draf",
            btn_discard_draft: "Hapus Draf",
            modal_clear_draft_title: "Hapus Draf Tersimpan?",
            modal_clear_draft_desc: "Tindakan ini akan mengosongkan seluruh input inspeksi, foto defect di memori lokal (IndexedDB), dan draf yang tersimpan di LocalStorage untuk menghemat memori perangkat.",
            btn_confirm_clear: "Ya, Hapus Draf"
        },
        en: {
            app_title: "Line Walk Through",
            admin_panel_btn: "Admin Panel",
            status_online: "Cloud Sync Active",
            status_offline: "Local Mode",
            auditor_label: "Auditor",
            auditor_ph: "Auditor Name...",
            category_label: "Validation Category",
            category_ph: "Select Category...",
            style_label: "Style Number",
            style_ph: "Type to search...",
            model_label: "Model",
            model_ph: "Auto-filled",
            line_label: "Line",
            line_ph: "Select Line...",
            inspection_heading: "Shoe Inspection Data (20 Pairs)",
            ppc_ok: "Total OK",
            ppc_ng: "Total NG",
            ppc_rate: "PPC Rate",
            col_pair: "Pair #",
            col_status: "Status",
            col_defect: "Defect Details (Type | Position | Area)",
            col_photo: "Defect Photo",
            col_reset: "Reset",
            btn_save_inspection: "💾 Save Data & Complete Inspection",
            saved_title: "Saved Files on Device",
            saved_limit: "(Maximum 10 local records)",
            no_saved_files: "No saved inspection records found on this device.",
            placeholder_ng_fill: "Select 'NG' to fill details",
            placeholder_add_defect: "Click to add defects...",
            btn_photo: "+ Photo",
            step1_title: "Defect Type",
            manual_defect_label: "Manual Input (Default)",
            manual_defect_ph: "Type defect name...",
            select_defect_label: "Select from Master List",
            select_defect_ph: "-- Select Recommended Defect --",
            step2_title: "Select Position",
            pos_left: "Left (L)",
            pos_right: "Right (R)",
            pos_both: "Both (L & R)",
            step3_title: "Select Shoe Area",
            manual_area_label: "Manual Input",
            manual_area_ph: "Type area manually...",
            select_area_label: "Select from Master List",
            select_area_ph: "-- Select Shoe Area --",
            btn_add_defect: "+ Add This Defect",
            defect_list_title: "Defects for This Pair",
            no_defects_yet: "No defects added yet.",
            btn_cancel: "Cancel",
            btn_save_pair: "✓ Save for This Pair",
            btn_confirm: "Confirm",
            finish_title: "Inspection Completed & Saved!",
            finish_desc: "Data has been recorded. You can now download the inspection report.",
            btn_dl_excel: "📊 Download Excel Report",
            btn_dl_zip: "📦 Download ZIP Bundle",
            btn_close_new: "Close & Start New Inspection",
            alert_fill_auditor: "Please enter Auditor name.",
            alert_select_cat: "Please select Validation Category.",
            alert_fill_style: "Please enter Style Number.",
            alert_select_line: "Please select Line.",
            alert_defect_required: "Pair #{pair} is marked NG but has no defect details. Please complete before saving.",
            confirm_partial_inspection: "Inspection only has {count} of {total} pairs filled. Do you still want to save?",
            confirm_reset_row: "Reset inspection for Pair #{pair}?",
            confirm_delete_saved: "Delete this local inspection record?",
            photo_limit_alert: "Maximum {max} photos per pair.",
            draft_saved_text: "Draft saved in memory",
            btn_clear_draft: "Clear Draft",
            btn_discard_draft: "Clear Draft",
            modal_clear_draft_title: "Clear Saved Draft?",
            modal_clear_draft_desc: "This action will clear all inspection inputs, defect photos in local memory (IndexedDB), and saved draft in LocalStorage to free up device memory.",
            btn_confirm_clear: "Yes, Clear Draft"
        }
    };

    // =========================================================================
    // 3. DOM ELEMENTS
    // =========================================================================
    const DOMElements = {
        btnLangToggle: document.getElementById('btn-lang-toggle'),
        knobFlag: document.getElementById('knob-flag'),

        statusDot: document.getElementById('status-dot'),
        statusText: document.getElementById('status-text'),
        auditor: document.getElementById('auditor'),
        validationCategory: document.getElementById('validation-category'),
        styleNumberInput: document.getElementById('style-number'),
        autocompleteResults: document.getElementById('autocomplete-results'),
        model: document.getElementById('model'),
        line: document.getElementById('line'),
        dataEntryBody: document.getElementById('data-entry-body'),
        saveButton: document.getElementById('save-button'),
        savedFilesList: document.getElementById('saved-files-list'),

        // Draft Storage Elements
        draftStatusBar: document.getElementById('draft-status-bar'),
        draftStatusText: document.getElementById('draft-status-text'),
        draftTime: document.getElementById('draft-time'),
        btnClearDraft: document.getElementById('btn-clear-draft'),
        btnDiscardDraft: document.getElementById('btn-discard-draft'),
        modalConfirmDeleteDraft: document.getElementById('modal-confirm-delete-draft'),
        btnCancelClearDraft: document.getElementById('btn-cancel-clear-draft'),
        btnConfirmClearDraft: document.getElementById('btn-confirm-clear-draft'),
        
        // PPC Stats
        ppcTotalOk: document.getElementById('ppc-total-ok'),
        ppcTotalNg: document.getElementById('ppc-total-ng'),
        ppcRateValue: document.getElementById('ppc-rate-value'),

        // NG Defect Modal (Split Inputs: Manual & Dropdown)
        ngDefectModal: document.getElementById('ng-defect-modal'),
        ngModalTitle: document.getElementById('ng-modal-title'),
        ngModalClose: document.getElementById('ng-modal-close'),
        ngModalCancel: document.getElementById('ng-modal-cancel'),
        ngModalSave: document.getElementById('ng-modal-save'),
        ngDefectInput: document.getElementById('ng-defect-input'),
        ngDefectSelect: document.getElementById('ng-defect-select'),
        ngPositionGroup: document.getElementById('ng-position-group'),
        ngCustomAreaInput: document.getElementById('ng-custom-area-input'),
        ngAreaSelect: document.getElementById('ng-area-select'),
        btnAddDefectItem: document.getElementById('btn-add-defect-item'),
        ngCurrentDefectsList: document.getElementById('ng-current-defects-list'),
        ngDefectCount: document.getElementById('ng-defect-count'),

        // Finish Report Modal
        finishReportModal: document.getElementById('finish-report-modal'),
        finishTotalOk: document.getElementById('finish-total-ok'),
        finishTotalNg: document.getElementById('finish-total-ng'),
        finishPpcRate: document.getElementById('finish-ppc-rate'),
        btnFinishDownloadExcel: document.getElementById('btn-finish-download-excel'),
        btnFinishDownloadZip: document.getElementById('btn-finish-download-zip'),
        btnFinishClose: document.getElementById('btn-finish-close'),

        // Generic Modal & Loading
        appModal: document.getElementById('app-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingOverlayText: document.getElementById('loading-overlay-text')
    };

    function showLoading(text = 'Sedang Menyimpan Data...') {
        if (DOMElements.loadingOverlay) {
            DOMElements.loadingOverlayText.textContent = text;
            DOMElements.loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoading() {
        if (DOMElements.loadingOverlay) {
            DOMElements.loadingOverlay.style.display = 'none';
        }
    }

    // =========================================================================
    // 4. LANGUAGE SYSTEM (i18n WITH PILL SWITCH)
    // =========================================================================
    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('lwt_language', lang);

        if (DOMElements.btnLangToggle) {
            if (lang === 'id') {
                DOMElements.btnLangToggle.classList.remove('state-en');
                DOMElements.btnLangToggle.classList.add('state-id');
                if (DOMElements.knobFlag) DOMElements.knobFlag.textContent = '🇮🇩';
            } else {
                DOMElements.btnLangToggle.classList.remove('state-id');
                DOMElements.btnLangToggle.classList.add('state-en');
                if (DOMElements.knobFlag) DOMElements.knobFlag.textContent = '🇬🇧';
            }
        }

        const t = translations[lang];

        // Update elements with [data-i18n]
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (t[key]) el.textContent = t[key];
        });

        // Update elements with [data-i18n-ph]
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.dataset.i18nPh;
            if (t[key]) el.placeholder = t[key];
        });

        // Update dynamic row placeholders in table
        DOMElements.dataEntryBody.querySelectorAll('tr').forEach(tr => {
            const checked = tr.querySelector('.status-radio:checked');
            const placeholder = tr.querySelector('.placeholder-text');
            if (placeholder) {
                if (checked && checked.value === 'NG') {
                    placeholder.textContent = t.placeholder_add_defect;
                } else {
                    placeholder.textContent = t.placeholder_ng_fill;
                }
            }
        });

        // Update status text
        if (DOMElements.statusDot.classList.contains('online')) {
            DOMElements.statusText.textContent = t.status_online;
        } else {
            DOMElements.statusText.textContent = t.status_offline;
        }

        // Update modal title if open
        if (activePairForModal) {
            const pairNum = activePairForModal.dataset.pairNumber;
            DOMElements.ngModalTitle.textContent = `Input Defect: Pair #${pairNum}`;
        }
    }

    if (DOMElements.btnLangToggle) {
        DOMElements.btnLangToggle.addEventListener('click', () => {
            const nextLang = currentLang === 'id' ? 'en' : 'id';
            setLanguage(nextLang);
        });
    }

    // =========================================================================
    // 5. INDEXEDDB SETUP (LOCAL BACKUP)
    // =========================================================================
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(DRAFT_PHOTOS_STORE)) {
                    db.createObjectStore(DRAFT_PHOTOS_STORE, { keyPath: 'pairNumber' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function saveToDB(data) {
        const db = await openDB();
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).put(data);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getFromDB() {
        const db = await openDB();
        const tx = db.transaction([STORE_NAME], 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    async function deleteFromDB(id) {
        const db = await openDB();
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function saveDraftPhotos(pairNumber, photos) {
        try {
            const db = await openDB();
            const tx = db.transaction([DRAFT_PHOTOS_STORE], 'readwrite');
            tx.objectStore(DRAFT_PHOTOS_STORE).put({ pairNumber: parseInt(pairNumber), photos });
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error('Error saving draft photo:', error);
        }
    }

    async function getDraftPhotos(pairNumber) {
        try {
            const db = await openDB();
            const tx = db.transaction([DRAFT_PHOTOS_STORE], 'readonly');
            const req = tx.objectStore(DRAFT_PHOTOS_STORE).get(parseInt(pairNumber));
            return new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result ? req.result.photos : []);
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            return [];
        }
    }

    async function clearAllDraftPhotos() {
        try {
            const db = await openDB();
            const tx = db.transaction([DRAFT_PHOTOS_STORE], 'readwrite');
            tx.objectStore(DRAFT_PHOTOS_STORE).clear();
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error('Error clearing draft photos:', error);
        }
    }

    function compressImage(base64String, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = base64String;
        });
    }

    // =========================================================================
    // 6. PPC RATE COMPUTATION
    // =========================================================================
    function calculatePPCRate() {
        let totalOK = 0;
        let totalNG = 0;

        DOMElements.dataEntryBody.querySelectorAll('tr').forEach(tr => {
            const checkedRadio = tr.querySelector('.status-radio:checked');
            if (!checkedRadio) return;
            if (checkedRadio.value === 'OK') totalOK++;
            else if (checkedRadio.value === 'NG') totalNG++;
        });

        const totalOutput = totalOK + totalNG;
        let ppcRate = '—';
        if (totalOutput > 0) {
            if (totalNG === 0) ppcRate = '100%';
            else ppcRate = ((totalOK / totalOutput) * 100).toFixed(2) + '%';
        }

        DOMElements.ppcTotalOk.textContent = totalOK;
        DOMElements.ppcTotalNg.textContent = totalNG;
        DOMElements.ppcRateValue.textContent = ppcRate;

        return { totalOK, totalNG, ppcRate };
    }

    // =========================================================================
    // 7. MASTER DATA INITIALIZATION (SUPABASE + LOCAL FALLBACK)
    // =========================================================================
    async function initSupabaseAndMasterData() {
        // 1. Connection check
        const test = await SupabaseService.testConnection();
        const t = translations[currentLang];
        if (test.success) {
            DOMElements.statusDot.className = 'status-dot online';
            DOMElements.statusText.textContent = t.status_online;
        } else {
            DOMElements.statusDot.className = 'status-dot offline';
            DOMElements.statusText.textContent = t.status_offline;
        }

        // 2. Load Categories
        try {
            const categories = await SupabaseService.getCategories();
            DOMElements.validationCategory.innerHTML = `<option value="">${t.category_ph}</option>`;
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = cat.name;
                DOMElements.validationCategory.appendChild(opt);
            });
        } catch (e) {
            console.warn('Error loading categories:', e);
        }

        // 3. Load Lines
        try {
            const lines = await SupabaseService.getLines();
            DOMElements.line.innerHTML = `<option value="">${t.line_ph}</option>`;
            lines.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.name;
                opt.textContent = `Line ${l.name}`;
                DOMElements.line.appendChild(opt);
            });
        } catch (e) {
            console.warn('Error loading lines:', e);
        }

        // 4. Load Defect Types into Dropdown Selector (#ng-defect-select)
        try {
            const defectTypes = await SupabaseService.getDefectTypes();
            DOMElements.ngDefectSelect.innerHTML = `<option value="">${t.select_defect_ph}</option>`;
            defectTypes.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = d.name;
                DOMElements.ngDefectSelect.appendChild(opt);
            });
        } catch (e) {
            console.warn('Error loading defect types:', e);
        }

        // 5. Load Areas into Dropdown Selector (#ng-area-select)
        try {
            const areas = await SupabaseService.getAreas();
            DOMElements.ngAreaSelect.innerHTML = `<option value="">${t.select_area_ph}</option>`;
            areas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.name;
                opt.textContent = a.name;
                DOMElements.ngAreaSelect.appendChild(opt);
            });
        } catch (e) {
            console.warn('Error loading areas:', e);
        }

        // Apply translations
        setLanguage(currentLang);
    }

    // =========================================================================
    // 8. GENERATE ROWS & TABLE INTERACTIONS
    // =========================================================================
    function generateDataEntryRows() {
        const tbody = DOMElements.dataEntryBody;
        tbody.innerHTML = '';
        const t = translations[currentLang];

        for (let i = 1; i <= TOTAL_PAIRS; i++) {
            const tr = document.createElement('tr');
            tr.dataset.pairNumber = i;
            tr.dataset.photos = '[]';
            tr.dataset.defects = '[]'; // Array of { defectType, position, area }

            tr.innerHTML = `
                <td style="font-weight: 800; font-size: 1.05rem;">${i}</td>
                <td>
                    <div class="status-radio-group">
                        <label class="radio-label radio-ok">
                            <input type="radio" name="status-${i}" value="OK" class="status-radio">
                            <span class="radio-custom">OK</span>
                        </label>
                        <label class="radio-label radio-ng">
                            <input type="radio" name="status-${i}" value="NG" class="status-radio">
                            <span class="radio-custom">NG</span>
                        </label>
                    </div>
                </td>
                <td>
                    <div class="defect-input-container disabled">
                        <div class="defect-tags-wrapper">
                            <span class="placeholder-text">${t.placeholder_ng_fill}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="photo-container">
                        <div class="photo-gallery"></div>
                        <button class="add-photo-btn" style="display:none;">${t.btn_photo}</button>
                        <input type="file" accept="image/*" class="hidden-file-input" multiple style="display:none;">
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="delete-row-btn" title="Reset Baris Ini">↺</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    }

    function updateDefectTags(tr) {
        const wrapper = tr.querySelector('.defect-tags-wrapper');
        const defects = JSON.parse(tr.dataset.defects || '[]');
        const t = translations[currentLang];
        wrapper.innerHTML = '';

        if (defects.length > 0) {
            defects.forEach(item => {
                const chip = document.createElement('span');
                chip.className = 'defect-tag-chip';
                chip.innerHTML = `
                    <span>${item.defectType}</span>
                    <span class="defect-pos-badge">${item.position || 'Both'}</span>
                    <span class="defect-area-badge">${item.area || 'General'}</span>
                `;
                wrapper.appendChild(chip);
            });
        } else {
            const placeholder = document.createElement('span');
            placeholder.className = 'placeholder-text';
            const checkedRadio = tr.querySelector('.status-radio:checked');
            const status = checkedRadio ? checkedRadio.value : '';
            placeholder.textContent = status === 'NG' ? t.placeholder_add_defect : t.placeholder_ng_fill;
            wrapper.appendChild(placeholder);
        }
    }

    function updatePhotoGallery(tr) {
        const gallery = tr.querySelector('.photo-gallery');
        const photos = JSON.parse(tr.dataset.photos || '[]');
        gallery.innerHTML = '';

        photos.forEach((photo, index) => {
            gallery.innerHTML += `
                <div class="thumbnail-wrapper">
                    <img src="${photo.data}" class="thumbnail-img" alt="Foto Defect">
                    <button class="remove-photo-btn" data-index="${index}">×</button>
                </div>
            `;
        });
    }

    function resetRow(tr) {
        tr.querySelectorAll('.status-radio').forEach(r => r.checked = false);
        const defectContainer = tr.querySelector('.defect-input-container');
        defectContainer.classList.remove('enabled');
        defectContainer.classList.add('disabled');
        tr.querySelector('.add-photo-btn').style.display = 'none';

        tr.dataset.defects = '[]';
        tr.dataset.photos = '[]';
        updateDefectTags(tr);
        updatePhotoGallery(tr);
    }

    // =========================================================================
    // 9. NG DEFECT MODAL LOGIC (SPLIT 2-COLUMN: MANUAL & DROPDOWN)
    // =========================================================================
    function openNgDefectModal(tr) {
        activePairForModal = tr;
        const pairNum = tr.dataset.pairNumber;
        DOMElements.ngModalTitle.textContent = `Input Defect: Pair #${pairNum}`;

        // Load existing defects
        tempDefectsListForModal = JSON.parse(tr.dataset.defects || '[]');
        renderTempDefectsList();

        // Reset step inputs
        DOMElements.ngDefectInput.value = '';
        DOMElements.ngDefectSelect.value = '';
        DOMElements.ngCustomAreaInput.value = '';
        DOMElements.ngAreaSelect.value = '';

        // Position: default to Both
        selectedPositionForModal = 'Both';
        DOMElements.ngPositionGroup.querySelectorAll('.toggle-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.pos === 'Both');
        });

        DOMElements.ngDefectModal.style.display = 'flex';
        setTimeout(() => DOMElements.ngDefectInput.focus(), 150);
    }

    function closeNgDefectModal() {
        DOMElements.ngDefectModal.style.display = 'none';
        activePairForModal = null;
    }

    function renderTempDefectsList() {
        DOMElements.ngDefectCount.textContent = tempDefectsListForModal.length;
        const t = translations[currentLang];
        if (tempDefectsListForModal.length === 0) {
            DOMElements.ngCurrentDefectsList.innerHTML = `<span class="placeholder-text" style="text-align: center; margin: auto;">${t.no_defects_yet}</span>`;
            return;
        }

        DOMElements.ngCurrentDefectsList.innerHTML = tempDefectsListForModal.map((d, index) => `
            <div class="current-defect-item">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:var(--danger); font-weight:800;">•</span>
                    <span>${d.defectType}</span>
                    <span class="defect-pos-badge">${d.position}</span>
                    <span class="defect-area-badge">${d.area}</span>
                </div>
                <button type="button" class="btn btn-sm btn-danger btn-remove-temp-defect" data-index="${index}" style="padding:2px 8px; border-radius:50%;">×</button>
            </div>
        `).join('');
    }

    // Sync: Selecting from Defect Dropdown fills Manual Input on the left
    DOMElements.ngDefectSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            DOMElements.ngDefectInput.value = e.target.value;
            DOMElements.ngDefectInput.focus();
        }
    });

    // Sync: Selecting from Area Dropdown fills Manual Area Input on the left
    DOMElements.ngAreaSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            DOMElements.ngCustomAreaInput.value = e.target.value;
            DOMElements.ngCustomAreaInput.focus();
        }
    });

    // Toggle position selection (L / R / Both)
    DOMElements.ngPositionGroup.addEventListener('click', (e) => {
        const option = e.target.closest('.toggle-option');
        if (!option) return;
        DOMElements.ngPositionGroup.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        selectedPositionForModal = option.dataset.pos;
    });

    // Add defect to list button
    DOMElements.btnAddDefectItem.addEventListener('click', () => {
        const t = translations[currentLang];
        const defectName = DOMElements.ngDefectInput.value.trim() || DOMElements.ngDefectSelect.value.trim();
        if (!defectName) {
            alert(currentLang === 'id' ? 'Harap isi atau pilih tipe defect terlebih dahulu.' : 'Please enter or select a defect type.');
            DOMElements.ngDefectInput.focus();
            return;
        }

        const areaToUse = DOMElements.ngCustomAreaInput.value.trim() || DOMElements.ngAreaSelect.value.trim() || 'General';

        tempDefectsListForModal.push({
            defectType: defectName,
            position: selectedPositionForModal,
            area: areaToUse
        });

        renderTempDefectsList();

        // Reset inputs for next defect
        DOMElements.ngDefectInput.value = '';
        DOMElements.ngDefectSelect.value = '';
        DOMElements.ngCustomAreaInput.value = '';
        DOMElements.ngAreaSelect.value = '';
        DOMElements.ngDefectInput.focus();
    });

    // Remove single defect from temp list
    DOMElements.ngCurrentDefectsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove-temp-defect');
        if (!btn) return;
        const index = parseInt(btn.dataset.index);
        tempDefectsListForModal.splice(index, 1);
        renderTempDefectsList();
    });

    // Save defect for active pair
    DOMElements.ngModalSave.addEventListener('click', () => {
        if (!activePairForModal) return;

        // If user typed in the box but forgot to click "+ Tambah Defect", automatically add it
        const remainingDefect = DOMElements.ngDefectInput.value.trim() || DOMElements.ngDefectSelect.value.trim();
        if (remainingDefect) {
            const areaToUse = DOMElements.ngCustomAreaInput.value.trim() || DOMElements.ngAreaSelect.value.trim() || 'General';
            tempDefectsListForModal.push({
                defectType: remainingDefect,
                position: selectedPositionForModal,
                area: areaToUse
            });
        }

        if (tempDefectsListForModal.length === 0) {
            alert(currentLang === 'id' ? 'Harap masukkan minimal 1 defect untuk status NG.' : 'Please add at least 1 defect for NG status.');
            return;
        }

        activePairForModal.dataset.defects = JSON.stringify(tempDefectsListForModal);
        updateDefectTags(activePairForModal);

        closeNgDefectModal();
        calculatePPCRate();
        saveDraftToLocalStorage(true);
    });

    DOMElements.ngModalClose.addEventListener('click', closeNgDefectModal);
    DOMElements.ngModalCancel.addEventListener('click', () => {
        if (!activePairForModal) return closeNgDefectModal();
        const existing = JSON.parse(activePairForModal.dataset.defects || '[]');
        if (existing.length === 0) {
            // Revert radio if user cancels without adding defect
            activePairForModal.querySelectorAll('.status-radio').forEach(r => r.checked = false);
            const defectContainer = activePairForModal.querySelector('.defect-input-container');
            defectContainer.classList.remove('enabled');
            defectContainer.classList.add('disabled');
            activePairForModal.querySelector('.add-photo-btn').style.display = 'none';
            calculatePPCRate();
        }
        closeNgDefectModal();
    });

    // =========================================================================
    // 10. TABLE EVENT HANDLERS
    // =========================================================================
    DOMElements.dataEntryBody.addEventListener('change', (e) => {
        const target = e.target;

        if (target.classList.contains('status-radio')) {
            const tr = target.closest('tr');
            const statusValue = target.value;
            const defectContainer = tr.querySelector('.defect-input-container');
            const addPhotoBtn = tr.querySelector('.add-photo-btn');

            if (statusValue === 'NG') {
                defectContainer.classList.remove('disabled');
                defectContainer.classList.add('enabled');
                addPhotoBtn.style.display = 'inline-flex';
                // Trigger NG Defect Flow immediately!
                openNgDefectModal(tr);
            } else if (statusValue === 'OK') {
                defectContainer.classList.remove('enabled');
                defectContainer.classList.add('disabled');
                addPhotoBtn.style.display = 'none';
                tr.dataset.defects = '[]';
                tr.dataset.photos = '[]';
                updateDefectTags(tr);
                updatePhotoGallery(tr);
            }

            calculatePPCRate();
            saveDraftToLocalStorage(true);
        }

        if (target.classList.contains('hidden-file-input')) {
            handleImageUpload(e);
        }
    });

    DOMElements.dataEntryBody.addEventListener('click', (e) => {
        const target = e.target;
        const tr = target.closest('tr');
        if (!tr) return;

        if (target.classList.contains('add-photo-btn')) {
            const fileInput = tr.querySelector('.hidden-file-input');
            fileInput.click();
        } else if (target.classList.contains('remove-photo-btn')) {
            const idx = parseInt(target.dataset.index);
            removePhoto(tr, idx);
        } else if (target.classList.contains('delete-row-btn')) {
            const t = translations[currentLang];
            const confirmMsg = t.confirm_reset_row.replace('{pair}', tr.dataset.pairNumber);
            if (confirm(confirmMsg)) {
                resetRow(tr);
                calculatePPCRate();
                saveDraftToLocalStorage(true);
            }
        } else if (target.closest('.defect-input-container.enabled')) {
            openNgDefectModal(tr);
        }
    });

    // Handle Image Uploads with compression
    async function handleImageUpload(e) {
        const files = e.target.files;
        if (!files.length) return;
        const tr = e.target.closest('tr');

        let currentPhotos = JSON.parse(tr.dataset.photos || '[]');
        if (currentPhotos.length >= MAX_PHOTOS_PER_PAIR) {
            const t = translations[currentLang];
            alert(t.photo_limit_alert.replace('{max}', MAX_PHOTOS_PER_PAIR));
            e.target.value = '';
            return;
        }

        const availableSlots = MAX_PHOTOS_PER_PAIR - currentPhotos.length;
        const toProcess = Array.from(files).slice(0, availableSlots);

        for (const file of toProcess) {
            if (!file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            reader.onload = async (evt) => {
                let base64 = evt.target.result;
                if (file.size > 500 * 1024) {
                    try {
                        base64 = await compressImage(base64);
                    } catch (err) {
                        console.warn('Compress failed:', err);
                    }
                }
                currentPhotos.push({ name: file.name, data: base64 });
                tr.dataset.photos = JSON.stringify(currentPhotos);
                updatePhotoGallery(tr);
                saveDraftToLocalStorage(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }

    function removePhoto(tr, index) {
        let photos = JSON.parse(tr.dataset.photos || '[]');
        photos.splice(index, 1);
        tr.dataset.photos = JSON.stringify(photos);
        updatePhotoGallery(tr);
        saveDraftToLocalStorage(true);
    }

    // =========================================================================
    // 11. STYLE AUTOCOMPLETE (SUPABASE + LOCAL)
    // =========================================================================
    let autocompleteTimer = null;
    DOMElements.styleNumberInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearTimeout(autocompleteTimer);

        if (val.length < 2) {
            DOMElements.autocompleteResults.style.display = 'none';
            return;
        }

        autocompleteTimer = setTimeout(async () => {
            const results = await SupabaseService.searchStylesAutocomplete(val, 15);
            if (results.length > 0) {
                DOMElements.autocompleteResults.innerHTML = results.map(r => `
                    <div data-style="${r.style_number}" data-model="${r.model_name}">
                        <strong style="color:var(--primary);">${r.style_number}</strong> - <span>${r.model_name}</span>
                    </div>
                `).join('');
                DOMElements.autocompleteResults.style.display = 'block';
            } else {
                DOMElements.autocompleteResults.style.display = 'none';
            }
        }, 200);
    });

    DOMElements.autocompleteResults.addEventListener('click', (e) => {
        const item = e.target.closest('div[data-style]');
        if (!item) return;
        DOMElements.styleNumberInput.value = item.dataset.style;
        DOMElements.model.value = item.dataset.model;
        DOMElements.autocompleteResults.style.display = 'none';
        saveDraftToLocalStorage(true);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            DOMElements.autocompleteResults.style.display = 'none';
        }
    });

    // =========================================================================
    // 12. AUTO-SAVE & DRAFT RESTORATION
    // =========================================================================
    function updateDraftStatusBar(timestamp) {
        if (!DOMElements.draftStatusBar) return;
        if (timestamp) {
            DOMElements.draftStatusBar.style.display = 'flex';
            if (DOMElements.draftTime) {
                const dateObj = new Date(timestamp);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                DOMElements.draftTime.textContent = `(${timeStr})`;
            }
        } else {
            DOMElements.draftStatusBar.style.display = 'none';
        }
    }

    function saveDraftToLocalStorage(immediate = false) {
        const doSave = async () => {
            const draftData = {
                timestamp: Date.now(),
                form: {
                    auditor: DOMElements.auditor.value,
                    validationCategory: DOMElements.validationCategory.value,
                    styleNumber: DOMElements.styleNumberInput.value,
                    model: DOMElements.model.value,
                    line: DOMElements.line.value
                },
                pairs: []
            };

            let hasContent = !!(draftData.form.auditor || draftData.form.styleNumber || draftData.form.line);

            const photoSavePromises = [];
            DOMElements.dataEntryBody.querySelectorAll('tr').forEach(tr => {
                const photos = JSON.parse(tr.dataset.photos || '[]');
                const checked = tr.querySelector('.status-radio:checked');
                const statusValue = checked ? checked.value : '';

                if (statusValue || photos.length > 0 || (tr.dataset.defects && tr.dataset.defects !== '[]')) {
                    hasContent = true;
                }

                draftData.pairs.push({
                    pairNumber: tr.dataset.pairNumber,
                    status: statusValue,
                    defects: tr.dataset.defects || '[]'
                });

                if (photos.length > 0) {
                    photoSavePromises.push(saveDraftPhotos(tr.dataset.pairNumber, photos));
                }
            });

            await Promise.all(photoSavePromises);
            
            if (hasContent) {
                try {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
                    updateDraftStatusBar(draftData.timestamp);
                } catch (err) {
                    console.warn('LocalStorage quota exceeded saat menyimpan draft:', err);
                }
            }
        };

        if (immediate) {
            if (saveTimeout) clearTimeout(saveTimeout);
            doSave();
        } else {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(doSave, 300);
        }
    }

    async function restoreDraft() {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            if (!data.form || !data.pairs) return;

            DOMElements.auditor.value = data.form.auditor || '';
            DOMElements.validationCategory.value = data.form.validationCategory || '';
            DOMElements.styleNumberInput.value = data.form.styleNumber || '';
            DOMElements.model.value = data.form.model || '';
            DOMElements.line.value = data.form.line || '';

            for (const p of data.pairs) {
                const tr = DOMElements.dataEntryBody.querySelector(`tr[data-pair-number="${p.pairNumber}"]`);
                if (!tr) continue;

                if (p.status) {
                    const radio = tr.querySelector(`.status-radio[value="${p.status}"]`);
                    if (radio) radio.checked = true;

                    const defectContainer = tr.querySelector('.defect-input-container');
                    const addPhotoBtn = tr.querySelector('.add-photo-btn');

                    if (p.status === 'NG') {
                        defectContainer.classList.remove('disabled');
                        defectContainer.classList.add('enabled');
                        addPhotoBtn.style.display = 'inline-flex';
                    }
                }

                tr.dataset.defects = p.defects || '[]';
                const photos = await getDraftPhotos(p.pairNumber);
                tr.dataset.photos = JSON.stringify(photos);

                updateDefectTags(tr);
                updatePhotoGallery(tr);
            }

            calculatePPCRate();
            updateDraftStatusBar(data.timestamp || Date.now());
        } catch (err) {
            console.warn('Error restoring draft:', err);
        }
    }

    async function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
        await clearAllDraftPhotos();
        updateDraftStatusBar(null);
    }

    async function handleFullResetDraft() {
        await clearDraft();

        // Reset Header
        DOMElements.auditor.value = '';
        DOMElements.validationCategory.value = '';
        DOMElements.styleNumberInput.value = '';
        DOMElements.model.value = '';
        DOMElements.line.value = '';

        // Reset Table Rows
        DOMElements.dataEntryBody.querySelectorAll('tr').forEach(tr => {
            tr.querySelectorAll('.status-radio').forEach(r => r.checked = false);
            tr.dataset.defects = '[]';
            tr.dataset.photos = '[]';

            const defectContainer = tr.querySelector('.defect-input-container');
            const addPhotoBtn = tr.querySelector('.add-photo-btn');
            if (defectContainer) {
                defectContainer.classList.remove('enabled');
                defectContainer.classList.add('disabled');
            }
            if (addPhotoBtn) {
                addPhotoBtn.style.display = 'none';
            }

            updateDefectTags(tr);
            updatePhotoGallery(tr);
        });

        calculatePPCRate();

        if (DOMElements.modalConfirmDeleteDraft) {
            DOMElements.modalConfirmDeleteDraft.style.display = 'none';
        }

        const msg = currentLang === 'id' ? 'Draf berhasil dihapus & memori lokal dibersihkan.' : 'Draft successfully cleared and local memory freed.';
        alert(msg);
    }

    // Event listeners untuk hapus draf
    if (DOMElements.btnClearDraft) {
        DOMElements.btnClearDraft.addEventListener('click', () => {
            if (DOMElements.modalConfirmDeleteDraft) {
                DOMElements.modalConfirmDeleteDraft.style.display = 'flex';
            }
        });
    }

    if (DOMElements.btnDiscardDraft) {
        DOMElements.btnDiscardDraft.addEventListener('click', () => {
            if (DOMElements.modalConfirmDeleteDraft) {
                DOMElements.modalConfirmDeleteDraft.style.display = 'flex';
            }
        });
    }

    if (DOMElements.btnCancelClearDraft) {
        DOMElements.btnCancelClearDraft.addEventListener('click', () => {
            if (DOMElements.modalConfirmDeleteDraft) {
                DOMElements.modalConfirmDeleteDraft.style.display = 'none';
            }
        });
    }

    if (DOMElements.btnConfirmClearDraft) {
        DOMElements.btnConfirmClearDraft.addEventListener('click', handleFullResetDraft);
    }

    // Auto-save listeners on form header
    DOMElements.auditor.addEventListener('input', () => saveDraftToLocalStorage(false));
    DOMElements.validationCategory.addEventListener('change', () => saveDraftToLocalStorage(true));
    DOMElements.styleNumberInput.addEventListener('input', () => saveDraftToLocalStorage(false));
    DOMElements.line.addEventListener('change', () => saveDraftToLocalStorage(true));

    // =========================================================================
    // 13. SAVE INSPECTION & REPORTING
    // =========================================================================
    DOMElements.saveButton.addEventListener('click', handleSaveInspection);

    async function handleSaveInspection() {
        const t = translations[currentLang];
        if (!DOMElements.auditor.value.trim()) {
            return alert(t.alert_fill_auditor);
        }
        if (!DOMElements.validationCategory.value) {
            return alert(t.alert_select_cat);
        }
        if (!DOMElements.styleNumberInput.value.trim()) {
            return alert(t.alert_fill_style);
        }
        if (!DOMElements.line.value) {
            return alert(t.alert_select_line);
        }

        // Validate that every NG pair has at least 1 defect item
        const rows = DOMElements.dataEntryBody.querySelectorAll('tr');
        for (const tr of rows) {
            const checked = tr.querySelector('.status-radio:checked');
            if (checked && checked.value === 'NG') {
                const defects = JSON.parse(tr.dataset.defects || '[]');
                if (defects.length === 0) {
                    return alert(t.alert_defect_required.replace('{pair}', tr.dataset.pairNumber));
                }
            }
        }

        const inspectedCount = Array.from(document.querySelectorAll('.status-radio:checked')).length;
        if (inspectedCount < TOTAL_PAIRS) {
            const confirmMsg = t.confirm_partial_inspection.replace('{count}', inspectedCount).replace('{total}', TOTAL_PAIRS);
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        await executeSave();
    }

    async function executeSave() {
        showLoading(currentLang === 'id' ? 'Menyimpan inspeksi ke Supabase & Local...' : 'Saving inspection to Supabase & Local...');

        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeCode = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
            const category = DOMElements.validationCategory.value;
            const code = `LWT-${category}-${dateStr.replace(/-/g, '')}-${timeCode}`;

            const { totalOK, totalNG, ppcRate } = calculatePPCRate();

            const headerData = {
                inspection_code: code,
                inspection_date: dateStr,
                auditor: DOMElements.auditor.value.trim(),
                validation_category: category,
                style_number: DOMElements.styleNumberInput.value.trim().toUpperCase(),
                model: DOMElements.model.value.trim().toUpperCase(),
                line: DOMElements.line.value,
                total_ok: totalOK,
                total_ng: totalNG,
                ppc_rate: ppcRate
            };

            // BUILD TALL FORMAT ROWS (FORMAT KEBAWAH)
            const defectRows = [];
            const allPhotosForZip = [];

            DOMElements.dataEntryBody.querySelectorAll('tr').forEach(tr => {
                const pairNum = parseInt(tr.dataset.pairNumber);
                const checked = tr.querySelector('.status-radio:checked');
                if (!checked) return;

                const status = checked.value;
                const defects = JSON.parse(tr.dataset.defects || '[]');
                const photos = JSON.parse(tr.dataset.photos || '[]');

                const photoNames = [];
                photos.forEach((ph, pIdx) => {
                    const pName = `Pair-${pairNum}-Foto-${pIdx + 1}.jpg`;
                    photoNames.push(pName);
                    allPhotosForZip.push({ name: pName, data: ph.data });
                });

                if (status === 'OK') {
                    defectRows.push({
                        pair_number: pairNum,
                        status: 'OK',
                        defect_type: null,
                        position: null,
                        area: null,
                        photo_name: null,
                        photo_data: null
                    });
                } else if (status === 'NG') {
                    // Setiap defect menjadi 1 baris terpisah (TALL FORMAT KEBAWAH)!
                    defects.forEach((d, dIdx) => {
                        defectRows.push({
                            pair_number: pairNum,
                            status: 'NG',
                            defect_type: d.defectType,
                            position: d.position,
                            area: d.area,
                            photo_name: dIdx === 0 ? photoNames.join(', ') : null,
                            photo_data: dIdx === 0 && photos[0] ? photos[0].data : null
                        });
                    });
                }
            });

            // 1. Save to Supabase Cloud
            try {
                await SupabaseService.saveInspectionCloud(headerData, defectRows);
            } catch (cloudErr) {
                console.warn('Could not save to Supabase, continuing with local save:', cloudErr);
            }

            // 2. Save to Local IndexedDB
            const fileId = `lwt_${now.getTime()}`;
            const fileRecord = {
                id: fileId,
                name: code,
                header: headerData,
                defectRows: defectRows,
                photos: allPhotosForZip
            };
            await saveToDB(fileRecord);
            lastSavedFileData = fileRecord;

            // 3. Clear draft & reload saved list
            await clearDraft();
            await renderSavedFilesList();

            // 4. Show Finish Reporting Modal
            DOMElements.finishTotalOk.textContent = totalOK;
            DOMElements.finishTotalNg.textContent = totalNG;
            DOMElements.finishPpcRate.textContent = ppcRate;
            DOMElements.finishReportModal.style.display = 'flex';

        } catch (err) {
            console.error('Save failed:', err);
            alert('Gagal menyimpan inspeksi: ' + err.message);
        } finally {
            hideLoading();
        }
    }

    function resetFullForm() {
        DOMElements.auditor.value = '';
        DOMElements.validationCategory.value = '';
        DOMElements.styleNumberInput.value = '';
        DOMElements.model.value = '';
        DOMElements.line.value = '';
        DOMElements.dataEntryBody.querySelectorAll('tr').forEach(resetRow);
        calculatePPCRate();
    }

    // =========================================================================
    // 14. EXPORT REPORTING (TALL / FORMAT KEBAWAH UNTUK PIVOT TABLE)
    // =========================================================================
    function generateTallFormatExcel(fileRecord) {
        const { header, defectRows } = fileRecord;

        const headers = [
            'Date',
            'Auditor',
            'Validation Category',
            'Style Number',
            'Model',
            'Line',
            'Pair Number',
            'Status',
            'Defect Type',
            'Position (L/R)',
            'Shoe Area',
            'Photo Attached'
        ];

        const rows = [headers];

        defectRows.forEach(r => {
            rows.push([
                header.inspection_date,
                header.auditor,
                header.validation_category,
                header.style_number,
                header.model,
                header.line,
                r.pair_number,
                r.status,
                r.defect_type || '-',
                r.position || '-',
                r.area || '-',
                r.photo_name || '-'
            ]);
        });

        // Sheet 2: Summary
        const summaryHeaders = ['Metric', 'Value'];
        const summaryRows = [
            summaryHeaders,
            ['Inspection Code', header.inspection_code],
            ['Date', header.inspection_date],
            ['Auditor', header.auditor],
            ['Validation Category', header.validation_category],
            ['Style Number', header.style_number],
            ['Model', header.model],
            ['Line', header.line],
            ['Total Pairs Inspected', defectRows.length],
            ['Total OK', header.total_ok],
            ['Total NG', header.total_ng],
            ['PPC Rate %', header.ppc_rate]
        ];

        const wb = XLSX.utils.book_new();
        const wsData = XLSX.utils.aoa_to_sheet(rows);
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

        XLSX.utils.book_append_sheet(wb, wsData, 'Pivot_Raw_Data');
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        return wb;
    }

    // Download Excel Directly
    function downloadExcelFile(fileRecord) {
        const wb = generateTallFormatExcel(fileRecord);
        const fileName = `${fileRecord.name}_Tall_Pivot_Ready.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // Download ZIP (Excel + Photos)
    async function downloadZipBundle(fileRecord) {
        showLoading(currentLang === 'id' ? 'Membuat bundle ZIP...' : 'Generating ZIP bundle...');
        try {
            const zip = new JSZip();
            const wb = generateTallFormatExcel(fileRecord);
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            zip.file(`${fileRecord.name}_Tall_Pivot_Ready.xlsx`, excelBuffer);

            if (fileRecord.photos && fileRecord.photos.length > 0) {
                const imgFolder = zip.folder('images');
                fileRecord.photos.forEach(ph => {
                    const rawData = ph.data.startsWith('data:image') ? ph.data.split(',')[1] : ph.data;
                    imgFolder.file(ph.name, rawData, { base64: true });
                });
            }

            const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${fileRecord.name}_Report_Bundle.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('Gagal membuat ZIP: ' + err.message);
        } finally {
            hideLoading();
        }
    }

    // Finish Modal Buttons
    DOMElements.btnFinishDownloadExcel.addEventListener('click', () => {
        if (lastSavedFileData) downloadExcelFile(lastSavedFileData);
    });

    DOMElements.btnFinishDownloadZip.addEventListener('click', () => {
        if (lastSavedFileData) downloadZipBundle(lastSavedFileData);
    });

    DOMElements.btnFinishClose.addEventListener('click', () => {
        DOMElements.finishReportModal.style.display = 'none';
        resetFullForm();
    });

    // =========================================================================
    // 15. SAVED FILES LIST RENDERING
    // =========================================================================
    async function renderSavedFilesList() {
        const list = DOMElements.savedFilesList;
        const data = await getFromDB();
        const t = translations[currentLang];

        if (data.length === 0) {
            list.innerHTML = `<li style="color:var(--text-muted); padding:12px;">${t.no_saved_files}</li>`;
            return;
        }

        data.sort((a, b) => b.id.localeCompare(a.id));
        list.innerHTML = data.map(item => `
            <li>
                <div>
                    <span class="file-name">${item.name}</span>
                    <div class="file-meta">
                        ${item.header.auditor} | ${item.header.style_number} | Line ${item.header.line} | PPC: <strong>${item.header.ppc_rate}</strong>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-success download-excel-btn" data-id="${item.id}">📊 Excel</button>
                    <button class="btn btn-sm btn-primary download-zip-btn" data-id="${item.id}">📦 ZIP</button>
                    <button class="btn btn-sm btn-danger delete-saved-btn" data-id="${item.id}">🗑️</button>
                </div>
            </li>
        `).join('');
    }

    DOMElements.savedFilesList.addEventListener('click', async (e) => {
        const excelBtn = e.target.closest('.download-excel-btn');
        const zipBtn = e.target.closest('.download-zip-btn');
        const deleteBtn = e.target.closest('.delete-saved-btn');

        if (excelBtn) {
            const id = excelBtn.dataset.id;
            const all = await getFromDB();
            const rec = all.find(x => x.id === id);
            if (rec) downloadExcelFile(rec);
        } else if (zipBtn) {
            const id = zipBtn.dataset.id;
            const all = await getFromDB();
            const rec = all.find(x => x.id === id);
            if (rec) downloadZipBundle(rec);
        } else if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const t = translations[currentLang];
            if (confirm(t.confirm_delete_saved)) {
                await deleteFromDB(id);
                renderSavedFilesList();
            }
        }
    });

    // =========================================================================
    // 16. APPLICATION INITIALIZATION
    // =========================================================================
    async function init() {
        console.log('🚀 Launching Line Walk Through with Bilingual & Split Defect/Area Inputs...');
        generateDataEntryRows();
        await initSupabaseAndMasterData();
        await restoreDraft();
        await renderSavedFilesList();
    }

    init();
});
