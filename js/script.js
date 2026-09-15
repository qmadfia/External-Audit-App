/**
 * @file script.js
 * @description Main application logic for Line Walk Through with Supabase integration,
 * claymorphism UI, interactive NG defect flow, and tall-format pivot-ready reporting.
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

    let saveTimeout = null;
    let activePairForModal = null;
    let tempDefectsListForModal = [];
    let selectedPositionForModal = 'Both';
    let selectedAreaForModal = '';
    let currentModalAction = { onConfirm: null, onCancel: null };
    let lastSavedFileData = null;

    // =========================================================================
    // 2. DOM ELEMENTS
    // =========================================================================
    const DOMElements = {
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
        
        // PPC Stats
        ppcTotalOk: document.getElementById('ppc-total-ok'),
        ppcTotalNg: document.getElementById('ppc-total-ng'),
        ppcRateValue: document.getElementById('ppc-rate-value'),

        // NG Defect Modal
        ngDefectModal: document.getElementById('ng-defect-modal'),
        ngModalTitle: document.getElementById('ng-modal-title'),
        ngModalClose: document.getElementById('ng-modal-close'),
        ngModalCancel: document.getElementById('ng-modal-cancel'),
        ngModalSave: document.getElementById('ng-modal-save'),
        ngDefectInput: document.getElementById('ng-defect-input'),
        defectSuggestions: document.getElementById('defect-suggestions'),
        ngPositionGroup: document.getElementById('ng-position-group'),
        ngAreasContainer: document.getElementById('ng-areas-container'),
        ngCustomAreaInput: document.getElementById('ng-custom-area-input'),
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
    // 3. INDEXEDDB SETUP (LOCAL BACKUP)
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
    // 4. PPC RATE COMPUTATION
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
    // 5. MASTER DATA INITIALIZATION (SUPABASE + LOCAL FALLBACK)
    // =========================================================================
    async function initSupabaseAndMasterData() {
        // 1. Connection check
        const test = await SupabaseService.testConnection();
        if (test.success) {
            DOMElements.statusDot.className = 'status-dot online';
            DOMElements.statusText.textContent = 'Cloud Sync Aktif';
        } else {
            DOMElements.statusDot.className = 'status-dot offline';
            DOMElements.statusText.textContent = 'Mode Lokal';
        }

        // 2. Load Categories
        try {
            const categories = await SupabaseService.getCategories();
            DOMElements.validationCategory.innerHTML = '<option value="">Pilih Kategori...</option>';
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
            DOMElements.line.innerHTML = '<option value="">Pilih Line...</option>';
            lines.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.name;
                opt.textContent = `Line ${l.name}`;
                DOMElements.line.appendChild(opt);
            });
        } catch (e) {
            console.warn('Error loading lines:', e);
        }

        // 4. Populate Defect Suggestions in Datalist
        if (window.defectTypes && Array.isArray(window.defectTypes)) {
            DOMElements.defectSuggestions.innerHTML = '';
            window.defectTypes.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                DOMElements.defectSuggestions.appendChild(opt);
            });
        }

        // 5. Load Areas for NG Defect Modal
        try {
            const areas = await SupabaseService.getAreas();
            DOMElements.ngAreasContainer.innerHTML = '';
            areas.forEach((a, idx) => {
                const chip = document.createElement('div');
                chip.className = 'area-chip' + (idx === 0 ? ' active' : '');
                chip.textContent = a.name;
                chip.dataset.area = a.name;
                chip.addEventListener('click', () => {
                    DOMElements.ngAreasContainer.querySelectorAll('.area-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    selectedAreaForModal = a.name;
                    DOMElements.ngCustomAreaInput.value = '';
                });
                DOMElements.ngAreasContainer.appendChild(chip);
            });
            if (areas.length > 0) {
                selectedAreaForModal = areas[0].name;
            }
        } catch (e) {
            console.warn('Error loading areas:', e);
        }
    }

    // =========================================================================
    // 6. GENERATE ROWS & TABLE INTERACTIONS
    // =========================================================================
    function generateDataEntryRows() {
        const tbody = DOMElements.dataEntryBody;
        tbody.innerHTML = '';

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
                            <span class="placeholder-text">Pilih 'NG' untuk mengisi</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="photo-container">
                        <div class="photo-gallery"></div>
                        <button class="add-photo-btn" style="display:none;">+ Foto</button>
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
            placeholder.textContent = status === 'NG' ? 'Klik untuk tambah defect...' : "Pilih 'NG' untuk mengisi";
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
    // 7. NEW NG DEFECT FLOW MODAL LOGIC
    // =========================================================================
    // FLOW: NG -> Isi defect type manual -> pilih posisi L/R -> pilih area
    function openNgDefectModal(tr) {
        activePairForModal = tr;
        const pairNum = tr.dataset.pairNumber;
        DOMElements.ngModalTitle.textContent = `Input Defect: Pair #${pairNum}`;

        // Load existing defects
        tempDefectsListForModal = JSON.parse(tr.dataset.defects || '[]');
        renderTempDefectsList();

        // Reset step inputs
        DOMElements.ngDefectInput.value = '';
        DOMElements.ngCustomAreaInput.value = '';

        // Position: default to Both
        selectedPositionForModal = 'Both';
        DOMElements.ngPositionGroup.querySelectorAll('.toggle-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.pos === 'Both');
        });

        // Area: pick first active
        const firstAreaChip = DOMElements.ngAreasContainer.querySelector('.area-chip');
        if (firstAreaChip) {
            DOMElements.ngAreasContainer.querySelectorAll('.area-chip').forEach(c => c.classList.remove('active'));
            firstAreaChip.classList.add('active');
            selectedAreaForModal = firstAreaChip.dataset.area;
        }

        DOMElements.ngDefectModal.style.display = 'flex';
        setTimeout(() => DOMElements.ngDefectInput.focus(), 150);
    }

    function closeNgDefectModal() {
        DOMElements.ngDefectModal.style.display = 'none';
        activePairForModal = null;
    }

    function renderTempDefectsList() {
        DOMElements.ngDefectCount.textContent = tempDefectsListForModal.length;
        if (tempDefectsListForModal.length === 0) {
            DOMElements.ngCurrentDefectsList.innerHTML = `<span class="placeholder-text" style="text-align: center; margin: auto;">Belum ada defect yang ditambahkan.</span>`;
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

    // Toggle position selection (L / R / Both)
    DOMElements.ngPositionGroup.addEventListener('click', (e) => {
        const option = e.target.closest('.toggle-option');
        if (!option) return;
        DOMElements.ngPositionGroup.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        selectedPositionForModal = option.dataset.pos;
    });

    // Custom area input overrides chip
    DOMElements.ngCustomAreaInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
            DOMElements.ngAreasContainer.querySelectorAll('.area-chip').forEach(c => c.classList.remove('active'));
            selectedAreaForModal = val;
        }
    });

    // Add defect to list button
    DOMElements.btnAddDefectItem.addEventListener('click', () => {
        const defectName = DOMElements.ngDefectInput.value.trim();
        if (!defectName) {
            alert('Harap isi nama/tipe defect terlebih dahulu.');
            DOMElements.ngDefectInput.focus();
            return;
        }

        const customArea = DOMElements.ngCustomAreaInput.value.trim();
        const areaToUse = customArea || selectedAreaForModal || 'General';

        tempDefectsListForModal.push({
            defectType: defectName,
            position: selectedPositionForModal,
            area: areaToUse
        });

        renderTempDefectsList();

        // Reset input for next entry
        DOMElements.ngDefectInput.value = '';
        DOMElements.ngCustomAreaInput.value = '';
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

        // If user typed in the box but didn't click add button, automatically add it
        const remainingInput = DOMElements.ngDefectInput.value.trim();
        if (remainingInput) {
            const customArea = DOMElements.ngCustomAreaInput.value.trim();
            const areaToUse = customArea || selectedAreaForModal || 'General';
            tempDefectsListForModal.push({
                defectType: remainingInput,
                position: selectedPositionForModal,
                area: areaToUse
            });
        }

        if (tempDefectsListForModal.length === 0) {
            alert('Harap masukkan minimal 1 defect untuk status NG.');
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
    // 8. TABLE EVENT HANDLERS
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
            if (confirm(`Reset inspeksi untuk Pair #${tr.dataset.pairNumber}?`)) {
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
            alert(`Maksimal ${MAX_PHOTOS_PER_PAIR} foto per pair.`);
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
    // 9. STYLE AUTOCOMPLETE (SUPABASE + LOCAL)
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
    // 10. AUTO-SAVE & DRAFT RESTORATION
    // =========================================================================
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

            const photoSavePromises = [];
            DOMElements.dataEntryBody.querySelectorAll('tr').forEach(tr => {
                const photos = JSON.parse(tr.dataset.photos || '[]');
                const checked = tr.querySelector('.status-radio:checked');
                const statusValue = checked ? checked.value : '';

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
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
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
        } catch (err) {
            console.warn('Error restoring draft:', err);
        }
    }

    async function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
        await clearAllDraftPhotos();
    }

    // Auto-save listeners on form header
    DOMElements.auditor.addEventListener('input', () => saveDraftToLocalStorage(false));
    DOMElements.validationCategory.addEventListener('change', () => saveDraftToLocalStorage(true));
    DOMElements.styleNumberInput.addEventListener('input', () => saveDraftToLocalStorage(false));
    DOMElements.line.addEventListener('change', () => saveDraftToLocalStorage(true));

    // =========================================================================
    // 11. SAVE INSPECTION & REPORTING
    // =========================================================================
    DOMElements.saveButton.addEventListener('click', handleSaveInspection);

    async function handleSaveInspection() {
        if (!DOMElements.auditor.value.trim()) {
            return alert('Harap isi nama Auditor.');
        }
        if (!DOMElements.validationCategory.value) {
            return alert('Harap pilih Validation Category.');
        }
        if (!DOMElements.styleNumberInput.value.trim()) {
            return alert('Harap isi Style Number.');
        }
        if (!DOMElements.line.value) {
            return alert('Harap pilih Line.');
        }

        // Validate that every NG pair has at least 1 defect item
        const rows = DOMElements.dataEntryBody.querySelectorAll('tr');
        for (const tr of rows) {
            const checked = tr.querySelector('.status-radio:checked');
            if (checked && checked.value === 'NG') {
                const defects = JSON.parse(tr.dataset.defects || '[]');
                if (defects.length === 0) {
                    return alert(`Pair #${tr.dataset.pairNumber} berstatus NG namun belum ada detail defect. Harap lengkapi terlebih dahulu.`);
                }
            }
        }

        const inspectedCount = Array.from(document.querySelectorAll('.status-radio:checked')).length;
        if (inspectedCount < TOTAL_PAIRS) {
            if (!confirm(`Inspeksi baru terisi ${inspectedCount} dari ${TOTAL_PAIRS} pair. Apakah Anda tetap ingin menyimpan?`)) {
                return;
            }
        }

        await executeSave();
    }

    async function executeSave() {
        showLoading('Menyimpan inspeksi ke Supabase & Local...');

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
    // 12. EXPORT REPORTING (TALL / FORMAT KEBAWAH UNTUK PIVOT TABLE)
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
        showLoading('Membuat bundle ZIP...');
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
    // 13. SAVED FILES LIST RENDERING
    // =========================================================================
    async function renderSavedFilesList() {
        const list = DOMElements.savedFilesList;
        const data = await getFromDB();

        if (data.length === 0) {
            list.innerHTML = '<li style="color:var(--text-muted); padding:12px;">Belum ada file inspeksi tersimpan di perangkat ini.</li>';
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
            if (confirm('Hapus file rekaman lokal ini?')) {
                await deleteFromDB(id);
                renderSavedFilesList();
            }
        }
    });

    // =========================================================================
    // 14. APPLICATION INITIALIZATION
    // =========================================================================
    async function init() {
        console.log('🚀 Launching Line Walk Through with Claymorphism & Supabase...');
        generateDataEntryRows();
        await initSupabaseAndMasterData();
        await restoreDraft();
        await renderSavedFilesList();
    }

    init();
});
