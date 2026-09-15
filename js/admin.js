/**
 * @file admin.js
 * @description Logic for the Admin Panel (Styles, Categories, Lines, Areas, Audit Trail & Supabase Config)
 */

document.addEventListener('DOMContentLoaded', () => {
    const { SupabaseService } = window;

    // State
    let currentStylePage = 1;
    const STYLES_PER_PAGE = 30;
    let styleSearchQuery = '';
    let selectedInspectionForModal = null;

    // DOM Elements
    const elements = {
        cloudStatusBadge: document.getElementById('cloud-status-badge'),
        statusDot: document.getElementById('status-dot'),
        statusText: document.getElementById('status-text'),
        
        // Tabs
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        
        // Styles Tab
        formAddStyle: document.getElementById('form-add-style'),
        inputStyleNumber: document.getElementById('input-style-number'),
        inputModelName: document.getElementById('input-model-name'),
        styleSearchInput: document.getElementById('style-search-input'),
        stylesTableBody: document.getElementById('styles-table-body'),
        styleTotalCount: document.getElementById('style-total-count'),
        btnPrevPage: document.getElementById('btn-prev-page'),
        btnNextPage: document.getElementById('btn-next-page'),
        pageIndicator: document.getElementById('page-indicator'),
        btnSeedStyles: document.getElementById('btn-seed-styles'),
        seedProgressContainer: document.getElementById('seed-progress-container'),
        seedProgressBar: document.getElementById('seed-progress-bar'),
        seedProgressText: document.getElementById('seed-progress-text'),

        // Master Tab
        formAddCategory: document.getElementById('form-add-category'),
        inputCategoryName: document.getElementById('input-category-name'),
        categoriesList: document.getElementById('categories-list'),

        formAddLine: document.getElementById('form-add-line'),
        inputLineName: document.getElementById('input-line-name'),
        linesContainer: document.getElementById('lines-container'),

        formAddArea: document.getElementById('form-add-area'),
        inputAreaName: document.getElementById('input-area-name'),
        areasContainer: document.getElementById('areas-container'),

        // Audit Tab
        auditSearchInput: document.getElementById('audit-search-input'),
        auditTableBody: document.getElementById('audit-table-body'),

        // Settings Tab
        formSupabaseConfig: document.getElementById('form-supabase-config'),
        cfgSupabaseUrl: document.getElementById('cfg-supabase-url'),
        cfgSupabaseKey: document.getElementById('cfg-supabase-key'),
        btnTestConnection: document.getElementById('btn-test-connection'),

        // Modal & Overlay
        adminModal: document.getElementById('admin-modal'),
        adminModalTitle: document.getElementById('admin-modal-title'),
        adminModalBody: document.getElementById('admin-modal-body'),
        adminModalClose: document.getElementById('admin-modal-close'),
        adminModalCancelBtn: document.getElementById('admin-modal-cancel-btn'),
        adminModalDownloadBtn: document.getElementById('admin-modal-download-btn'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.getElementById('loading-text'),
    };

    function showLoading(text = 'Memproses...') {
        elements.loadingText.textContent = text;
        elements.loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        elements.loadingOverlay.style.display = 'none';
    }

    // =========================================================================
    // 1. KONEKSI & STATUS SUPABASE
    // =========================================================================
    async function updateConnectionStatus() {
        const creds = SupabaseService.getCredentials();
        elements.cfgSupabaseUrl.value = creds.url;
        elements.cfgSupabaseKey.value = creds.key;

        if (!creds.url || !creds.key) {
            elements.statusDot.className = 'status-dot offline';
            elements.statusText.textContent = 'Mode Lokal (Supabase belum diisi)';
            return;
        }

        const test = await SupabaseService.testConnection();
        if (test.success) {
            elements.statusDot.className = 'status-dot online';
            elements.statusText.textContent = 'Supabase Cloud Terhubung';
        } else {
            elements.statusDot.className = 'status-dot offline';
            elements.statusText.textContent = 'Supabase Terputus (Mode Lokal)';
        }
    }

    // =========================================================================
    // 2. TAB SWITCHING
    // =========================================================================
    function setupTabs() {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                elements.tabPanels.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(targetTab)?.classList.add('active');

                // Refresh tab data on switch
                if (targetTab === 'tab-styles') loadStyles();
                if (targetTab === 'tab-master') loadMasterData();
                if (targetTab === 'tab-audit') loadAuditTrail();
            });
        });
    }

    // =========================================================================
    // 3. TAB 1: STYLES & MODELS
    // =========================================================================
    async function loadStyles() {
        elements.stylesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">Memuat data...</td></tr>`;
        
        try {
            const { data, totalCount } = await SupabaseService.getStyles({
                search: styleSearchQuery,
                limit: STYLES_PER_PAGE,
                page: currentStylePage
            });

            elements.styleTotalCount.textContent = totalCount;
            const totalPages = Math.ceil(totalCount / STYLES_PER_PAGE) || 1;
            elements.pageIndicator.textContent = `Halaman ${currentStylePage} dari ${totalPages}`;
            elements.btnPrevPage.disabled = currentStylePage <= 1;
            elements.btnNextPage.disabled = currentStylePage >= totalPages;

            if (!data || data.length === 0) {
                elements.stylesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">Tidak ada data style ditemukan.</td></tr>`;
                return;
            }

            elements.stylesTableBody.innerHTML = data.map(item => `
                <tr>
                    <td style="font-weight:700; color:var(--primary);">${item.style_number}</td>
                    <td style="font-weight:600;">${item.model_name}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-danger delete-style-btn" data-id="${item.id}" data-stylenumber="${item.style_number}">Hapus</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            elements.stylesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger);">Gagal memuat: ${e.message}</td></tr>`;
        }
    }

    elements.formAddStyle.addEventListener('submit', async (e) => {
        e.preventDefault();
        const styleNumber = elements.inputStyleNumber.value.trim();
        const modelName = elements.inputModelName.value.trim();

        if (!styleNumber || !modelName) return;

        showLoading('Menambahkan style...');
        try {
            await SupabaseService.addStyle(styleNumber, modelName);
            elements.inputStyleNumber.value = '';
            elements.inputModelName.value = '';
            alert('Style berhasil ditambahkan!');
            loadStyles();
        } catch (err) {
            alert('Gagal menambah style: ' + err.message);
        } finally {
            hideLoading();
        }
    });

    elements.stylesTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.delete-style-btn');
        if (!target) return;
        const id = target.dataset.id;
        const styleNum = target.dataset.stylenumber;

        if (confirm(`Hapus style ${styleNum}?`)) {
            showLoading('Menghapus style...');
            try {
                await SupabaseService.deleteStyle(id, styleNum);
                loadStyles();
            } catch (err) {
                alert('Gagal menghapus: ' + err.message);
            } finally {
                hideLoading();
            }
        }
    });

    // Style search with debounce
    let searchDebounceTimer = null;
    elements.styleSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            styleSearchQuery = e.target.value.trim();
            currentStylePage = 1;
            loadStyles();
        }, 300);
    });

    elements.btnPrevPage.addEventListener('click', () => {
        if (currentStylePage > 1) {
            currentStylePage--;
            loadStyles();
        }
    });

    elements.btnNextPage.addEventListener('click', () => {
        currentStylePage++;
        loadStyles();
    });

    // Seed styles from database.js to Supabase
    elements.btnSeedStyles.addEventListener('click', async () => {
        if (!confirm('Apakah Anda yakin ingin mengunggah seluruh style dari database.js (~3340 item) ke Supabase? Ini dapat memakan waktu 10-30 detik.')) return;

        elements.seedProgressContainer.style.display = 'block';
        elements.seedProgressBar.style.width = '0%';
        elements.seedProgressText.textContent = '0%';

        try {
            await SupabaseService.batchSeedFromDatabaseJs((inserted, total) => {
                const pct = Math.round((inserted / total) * 100);
                elements.seedProgressBar.style.width = `${pct}%`;
                elements.seedProgressText.textContent = `${pct}% (${inserted}/${total})`;
            });

            alert('✓ Sukses! Seluruh data style dari database.js berhasil di-sync ke Supabase!');
            loadStyles();
        } catch (err) {
            alert('Gagal sinkronisasi data: ' + err.message);
        } finally {
            setTimeout(() => {
                elements.seedProgressContainer.style.display = 'none';
            }, 3000);
        }
    });

    // =========================================================================
    // 4. TAB 2: MASTER KATEGORI, LINE & AREA
    // =========================================================================
    async function loadMasterData() {
        loadCategories();
        loadLines();
        loadAreas();
    }

    async function loadCategories() {
        elements.categoriesList.innerHTML = '<li>Memuat...</li>';
        try {
            const categories = await SupabaseService.getCategories();
            elements.categoriesList.innerHTML = categories.map(cat => `
                <li style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 14px; border-radius:10px; box-shadow:var(--clay-badge-shadow);">
                    <span style="font-weight:700;">${cat.name}</span>
                    <button class="btn btn-sm btn-danger delete-cat-btn" data-id="${cat.id}">×</button>
                </li>
            `).join('');
        } catch (err) {
            elements.categoriesList.innerHTML = `<li style="color:var(--danger)">Error: ${err.message}</li>`;
        }
    }

    elements.formAddCategory.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = elements.inputCategoryName.value.trim();
        if (!name) return;
        showLoading('Menambah kategori...');
        try {
            await SupabaseService.addCategory(name);
            elements.inputCategoryName.value = '';
            loadCategories();
        } catch (err) {
            alert('Gagal: ' + err.message);
        } finally {
            hideLoading();
        }
    });

    elements.categoriesList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-cat-btn');
        if (!btn) return;
        if (confirm('Hapus kategori ini?')) {
            showLoading();
            try {
                await SupabaseService.deleteCategory(btn.dataset.id);
                loadCategories();
            } catch (err) {
                alert('Gagal: ' + err.message);
            } finally {
                hideLoading();
            }
        }
    });

    async function loadLines() {
        elements.linesContainer.innerHTML = 'Memuat lines...';
        try {
            const lines = await SupabaseService.getLines();
            elements.linesContainer.innerHTML = lines.map(line => `
                <span class="clay-badge" style="display:inline-flex; align-items:center; gap:6px; background:white; padding:6px 12px; border-radius:20px; font-weight:700; box-shadow:var(--clay-badge-shadow);">
                    ${line.name}
                    <button class="delete-line-btn" data-id="${line.id}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:800; font-size:13px;">×</button>
                </span>
            `).join('');
        } catch (err) {
            elements.linesContainer.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
        }
    }

    elements.formAddLine.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = elements.inputLineName.value.trim();
        if (!name) return;
        showLoading('Menambah line...');
        try {
            await SupabaseService.addLine(name);
            elements.inputLineName.value = '';
            loadLines();
        } catch (err) {
            alert('Gagal: ' + err.message);
        } finally {
            hideLoading();
        }
    });

    elements.linesContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-line-btn');
        if (!btn) return;
        if (confirm('Hapus line ini?')) {
            showLoading();
            try {
                await SupabaseService.deleteLine(btn.dataset.id);
                loadLines();
            } catch (err) {
                alert('Gagal: ' + err.message);
            } finally {
                hideLoading();
            }
        }
    });

    async function loadAreas() {
        elements.areasContainer.innerHTML = 'Memuat area...';
        try {
            const areas = await SupabaseService.getAreas();
            elements.areasContainer.innerHTML = areas.map(area => `
                <span class="clay-badge" style="display:inline-flex; align-items:center; gap:6px; background:white; padding:6px 14px; border-radius:20px; font-weight:700; color:#4f46e5; box-shadow:var(--clay-badge-shadow);">
                    ${area.name}
                    <button class="delete-area-btn" data-id="${area.id}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:800; font-size:13px;">×</button>
                </span>
            `).join('');
        } catch (err) {
            elements.areasContainer.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
        }
    }

    elements.formAddArea.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = elements.inputAreaName.value.trim();
        if (!name) return;
        showLoading('Menambah area...');
        try {
            await SupabaseService.addArea(name);
            elements.inputAreaName.value = '';
            loadAreas();
        } catch (err) {
            alert('Gagal: ' + err.message);
        } finally {
            hideLoading();
        }
    });

    elements.areasContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-area-btn');
        if (!btn) return;
        if (confirm('Hapus area ini?')) {
            showLoading();
            try {
                await SupabaseService.deleteArea(btn.dataset.id);
                loadAreas();
            } catch (err) {
                alert('Gagal: ' + err.message);
            } finally {
                hideLoading();
            }
        }
    });

    // =========================================================================
    // 5. TAB 3: AUDIT TRAIL & EXPORT REPORTING
    // =========================================================================
    async function loadAuditTrail() {
        elements.auditTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">Memuat riwayat inspeksi...</td></tr>`;

        try {
            const { data } = await SupabaseService.getInspectionsCloud({
                search: elements.auditSearchInput.value.trim(),
                limit: 50
            });

            if (!data || data.length === 0) {
                elements.auditTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">Belum ada riwayat inspeksi di Supabase.</td></tr>`;
                return;
            }

            elements.auditTableBody.innerHTML = data.map(item => `
                <tr>
                    <td>
                        <strong style="color:var(--primary); font-size:0.85rem;">${item.inspection_code}</strong><br>
                        <small style="color:var(--text-muted);">${item.inspection_date}</small>
                    </td>
                    <td>${item.auditor}</td>
                    <td><span class="defect-pos-badge" style="background:#0ea5e9;">${item.validation_category}</span></td>
                    <td>
                        <strong>${item.style_number}</strong><br>
                        <small style="color:var(--text-muted);">${item.model}</small>
                    </td>
                    <td><strong>Line ${item.line}</strong></td>
                    <td style="color:var(--success); font-weight:700;">${item.total_ok}</td>
                    <td style="color:var(--danger); font-weight:700;">${item.total_ng}</td>
                    <td><strong style="color:var(--primary);">${item.ppc_rate}</strong></td>
                    <td style="text-align:center;">
                        <div style="display:flex; gap:6px; justify-content:center;">
                            <button class="btn btn-sm btn-secondary btn-view-inspection" data-id="${item.id}" title="Lihat Detail Defect">👁️</button>
                            <button class="btn btn-sm btn-success btn-export-inspection" data-id="${item.id}" title="Export Excel Pivot-Ready">📊</button>
                            <button class="btn btn-sm btn-danger btn-delete-inspection" data-id="${item.id}" title="Hapus Inspeksi">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            elements.auditTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--danger);">Gagal memuat: ${e.message}</td></tr>`;
        }
    }

    elements.auditSearchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(loadAuditTrail, 300);
    });

    elements.auditTableBody.addEventListener('click', async (e) => {
        const viewBtn = e.target.closest('.btn-view-inspection');
        const exportBtn = e.target.closest('.btn-export-inspection');
        const deleteBtn = e.target.closest('.btn-delete-inspection');

        if (viewBtn) {
            const id = viewBtn.dataset.id;
            showLoading('Memuat rincian inspeksi...');
            try {
                const fullData = await SupabaseService.getInspectionFullDetails(id);
                selectedInspectionForModal = fullData;
                showInspectionDetailModal(fullData);
            } catch (err) {
                alert('Gagal mengambil rincian: ' + err.message);
            } finally {
                hideLoading();
            }
        } else if (exportBtn) {
            const id = exportBtn.dataset.id;
            showLoading('Membuat file Excel pivot-ready...');
            try {
                const fullData = await SupabaseService.getInspectionFullDetails(id);
                exportInspectionToExcel(fullData);
            } catch (err) {
                alert('Gagal export: ' + err.message);
            } finally {
                hideLoading();
            }
        } else if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Hapus seluruh catatan inspeksi ini beserta defect-nya secara permanen?')) {
                showLoading('Menghapus data...');
                try {
                    await SupabaseService.deleteInspectionCloud(id);
                    loadAuditTrail();
                } catch (err) {
                    alert('Gagal menghapus: ' + err.message);
                } finally {
                    hideLoading();
                }
            }
        }
    });

    function showInspectionDetailModal({ header, defects }) {
        elements.adminModalTitle.textContent = `Detail: ${header.inspection_code}`;
        
        let defectRowsHTML = '';
        if (!defects || defects.length === 0) {
            defectRowsHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Tidak ada defect dicatat (Semua OK).</td></tr>`;
        } else {
            defectRowsHTML = defects.map(d => `
                <tr>
                    <td style="font-weight:700; text-align:center;">Pair #${d.pair_number}</td>
                    <td>
                        <span class="status-dot ${d.status === 'OK' ? 'online' : 'offline'}"></span>
                        <strong style="color:${d.status === 'OK' ? 'var(--success)' : 'var(--danger)'};">${d.status}</strong>
                    </td>
                    <td>${d.defect_type || '-'}</td>
                    <td>${d.position ? `<span class="defect-pos-badge">${d.position}</span>` : '-'}</td>
                    <td>${d.area ? `<span class="defect-area-badge">${d.area}</span>` : '-'}</td>
                    <td>${d.photo_name || '-'}</td>
                </tr>
            `).join('');
        }

        elements.adminModalBody.innerHTML = `
            <div style="background:#f8fafc; padding:16px; border-radius:12px; margin-bottom:16px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; font-size:0.9rem;">
                <div><strong>Auditor:</strong> ${header.auditor}</div>
                <div><strong>Kategori:</strong> ${header.validation_category}</div>
                <div><strong>Tanggal:</strong> ${header.inspection_date}</div>
                <div><strong>Style:</strong> ${header.style_number}</div>
                <div><strong>Model:</strong> ${header.model}</div>
                <div><strong>Line:</strong> ${header.line}</div>
                <div><strong>Total OK:</strong> <span style="color:var(--success); font-weight:700;">${header.total_ok}</span></div>
                <div><strong>Total NG:</strong> <span style="color:var(--danger); font-weight:700;">${header.total_ng}</span></div>
                <div><strong>PPC Rate:</strong> <span style="color:var(--primary); font-weight:800;">${header.ppc_rate}</span></div>
            </div>

            <h5 style="font-weight:700; margin-bottom:10px; font-size:0.95rem;">Tabel Defect Baris Kebawah (Tall Format):</h5>
            <div class="table-wrapper">
                <table style="font-size:0.85rem;">
                    <thead>
                        <tr>
                            <th>Pair</th>
                            <th>Status</th>
                            <th>Tipe Defect</th>
                            <th>Posisi</th>
                            <th>Area Sepatu</th>
                            <th>Foto</th>
                        </tr>
                    </thead>
                    <tbody>${defectRowsHTML}</tbody>
                </table>
            </div>
        `;

        elements.adminModal.style.display = 'flex';
    }

    elements.adminModalDownloadBtn.addEventListener('click', () => {
        if (selectedInspectionForModal) {
            exportInspectionToExcel(selectedInspectionForModal);
        }
    });

    elements.adminModalClose.addEventListener('click', () => elements.adminModal.style.display = 'none');
    elements.adminModalCancelBtn.addEventListener('click', () => elements.adminModal.style.display = 'none');

    // =========================================================================
    // EXPORT TO EXCEL: TALL FORMAT (FORMAT KEBAWAH UNTUK PIVOT TABLE)
    // =========================================================================
    function exportInspectionToExcel({ header, defects }) {
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

        // Format kebawah: 1 baris per record defect
        if (!defects || defects.length === 0) {
            // Jika kosong, masukkan 1 baris ringkasan
            rows.push([
                header.inspection_date,
                header.auditor,
                header.validation_category,
                header.style_number,
                header.model,
                header.line,
                '-',
                'OK',
                '-',
                '-',
                '-',
                'None'
            ]);
        } else {
            defects.forEach(d => {
                rows.push([
                    header.inspection_date,
                    header.auditor,
                    header.validation_category,
                    header.style_number,
                    header.model,
                    header.line,
                    d.pair_number,
                    d.status,
                    d.defect_type || '-',
                    d.position || '-',
                    d.area || '-',
                    d.photo_name || '-'
                ]);
            });
        }

        // Summary Tab Sheet
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
            ['Total OK Pairs', header.total_ok],
            ['Total NG Pairs', header.total_ng],
            ['PPC Rate %', header.ppc_rate],
            ['Total Defect Recorded', defects.filter(d => d.status === 'NG').length]
        ];

        const wb = XLSX.utils.book_new();
        const wsData = XLSX.utils.aoa_to_sheet(rows);
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

        XLSX.utils.book_append_sheet(wb, wsData, 'Pivot_Raw_Data');
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Inspection_Summary');

        const fileName = `${header.inspection_code}_Tall_Data.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // =========================================================================
    // 6. TAB 4: PENGATURAN SUPABASE
    // =========================================================================
    elements.formSupabaseConfig.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = elements.cfgSupabaseUrl.value.trim();
        const key = elements.cfgSupabaseKey.value.trim();

        SupabaseService.saveCredentials(url, key);
        alert('Kredensial Supabase berhasil disimpan!');
        updateConnectionStatus();
    });

    elements.btnTestConnection.addEventListener('click', async () => {
        showLoading('Menguji koneksi ke Supabase...');
        try {
            const res = await SupabaseService.testConnection();
            alert((res.success ? '✅ ' : '❌ ') + res.message);
            updateConnectionStatus();
        } finally {
            hideLoading();
        }
    });

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    async function init() {
        setupTabs();
        await updateConnectionStatus();
        loadStyles();
    }

    init();
});
