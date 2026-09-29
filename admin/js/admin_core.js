window.PAGE_SIZE = 20;
window.currentPage = 1;
window.allData = [];
window.filtered = [];
window.qbankData = [];
window.examsConfig = { basic: [], advanced: [] };
window.liveSessionData = [];
window.liveTimerInterval = null;
window.adminKnownIds = [];
window.toastTimer = null;

window.toTitleCase = function(str) { return str.trim().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' '); }
window.formatExamName = function(r) { return `<span class="exam-name-vi">${r.examName || ''}</span>${r.examNameEn ? `<span class="exam-name-en">${r.examNameEn}</span>` : ''}`; }
window.showToast = function(msg, type = 'default') {
    const t = document.getElementById('toast'); t.textContent = msg; t.className = `toast ${type} show`;
    clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}
window.getStoredPw = function() { try { return atob(sessionStorage.getItem('admin_pw_b64') || ''); } catch(e) { return ''; } }

// ─── HỆ THỐNG MODAL ALERT & CONFIRM HIỆN ĐẠI ───
window.showModernModal = function({title, msg, type = 'warning', isConfirm = false, onOk = null}) {
    const existing = document.getElementById('modern-modal-overlay');
    if (existing) existing.remove();

    let iconHtml = ''; let color = '#f59e0b'; let bg = '#fffbeb';
    if (type === 'error' || type === 'danger') {
        color = '#e11d48'; bg = '#fff1f2';
        iconHtml = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'success') {
        color = '#10b981'; bg = '#ecfdf5';
        iconHtml = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
        color = '#f59e0b'; bg = '#fffbeb';
        iconHtml = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }

    const overlay = document.createElement('div');
    overlay.id = 'modern-modal-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); z-index:999999; display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s ease;';

    let buttonsHtml = isConfirm 
        ? `<button id="modal-btn-cancel" style="flex:1; padding:16px; border-radius:16px; background:var(--btn-bg, #f1f5f9); color:var(--btn-text, #475569); font-weight:800; border:none; cursor:pointer; font-size:1.05rem; transition:0.2s; font-family:'Plus Jakarta Sans',sans-serif;">Hủy bỏ</button>
           <button id="modal-btn-ok" style="flex:1; padding:16px; border-radius:16px; background:${color}; color:#fff; font-weight:800; border:none; cursor:pointer; font-size:1.05rem; box-shadow:0 10px 25px ${color}40; transition:0.2s; font-family:'Plus Jakarta Sans',sans-serif;">Xác nhận</button>`
        : `<button id="modal-btn-ok" style="width:100%; padding:16px; border-radius:16px; background:${color}; color:#fff; font-weight:800; border:none; cursor:pointer; font-size:1.05rem; box-shadow:0 10px 25px ${color}40; transition:0.2s; font-family:'Plus Jakarta Sans',sans-serif;">Đã hiểu</button>`;

    overlay.innerHTML = `
        <div style="background:var(--modal-bg, #fff); width:90%; max-width:440px; border-radius:36px; padding:45px 35px; text-align:center; box-shadow:0 30px 60px -12px rgba(0,0,0,0.25); transform:scale(0.95); transition:0.3s cubic-bezier(0.16, 1, 0.3, 1);" id="modern-modal-box">
            <div style="width:85px; height:85px; background:${bg}; color:${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 25px; box-shadow:0 15px 30px ${bg};">
                ${iconHtml}
            </div>
            <h3 style="font-size:1.6rem; font-weight:900; color:var(--text-main, #0f172a); margin-bottom:14px; font-family:'Plus Jakarta Sans',sans-serif;">${title}</h3>
            <p style="font-size:1.05rem; color:var(--text-sub, #64748b); font-weight:600; line-height:1.6; margin-bottom:35px;">${msg}</p>
            <div style="display:flex; gap:16px;">${buttonsHtml}</div>
        </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        document.getElementById('modern-modal-box').style.transform = 'scale(1)';
    });

    const closeFunc = () => {
        overlay.style.opacity = '0';
        document.getElementById('modern-modal-box').style.transform = 'scale(0.95)';
        setTimeout(() => overlay.remove(), 300);
    };

    if (document.getElementById('modal-btn-cancel')) document.getElementById('modal-btn-cancel').onclick = closeFunc;
    document.getElementById('modal-btn-ok').onclick = () => { closeFunc(); if (onOk) onOk(); };
};

window.showAlert = function(title, msg, type = 'warning') { window.showModernModal({title, msg, type, isConfirm: false}); };
window.showConfirm = function(onOk, title, msg, type = 'danger') { window.showModernModal({title, msg, type, isConfirm: true, onOk}); };

window.closeFolderViewModal = function() { const m = document.getElementById('folder-view-modal'); if(m) m.classList.remove('show'); };
window.closeExamEditModal = function() { const m = document.getElementById('exam-edit-modal'); if(m) m.classList.remove('show'); };
document.addEventListener('click', e => {
    if (e.target.id === 'folder-view-modal') window.closeFolderViewModal();
    if (e.target.id === 'exam-edit-modal') window.closeExamEditModal();
});

window.toggleSidebar = function() { document.getElementById('admin-app').classList.toggle('sidebar-hidden'); };

window.loadAuditLogs = async function() {
    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color:#4f46e5; font-weight:700;">Đang tải dữ liệu...</td></tr>';
    
    try {
        const pw = window.getStoredPw();
        const res = await fetch(`/api/admin/audit-records?adminPassword=${encodeURIComponent(pw)}`);
        if (res.ok) {
            const logs = await res.json();
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color:#64748b; font-weight:700;">Hệ thống chưa ghi nhận thao tác nào.</td></tr>';
                return;
            }
            tbody.innerHTML = logs.map(l => {
                const d = new Date(l.timestamp);
                const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                
                let actionColor = '#3b82f6';
                let actionBg = '#eff6ff';
                if (l.action.includes('XÓA')) { actionColor = '#e11d48'; actionBg = '#fff1f2'; }
                if (l.action.includes('SỬA') || l.action.includes('CẬP NHẬT') || l.action.includes('ĐỔI')) { actionColor = '#d97706'; actionBg = '#fffbeb'; }
                if (l.action.includes('ĐĂNG NHẬP') || l.action.includes('PHỤC HỒI')) { actionColor = '#059669'; actionBg = '#ecfdf5'; }

                return `<tr style="transition: 0.3s;" class="audit-row" onmouseover="this.style.background='var(--hover-bg, #f8fafc)'" onmouseout="this.style.background='transparent'">
                    <td style="font-weight:800; color:var(--text-sub, #64748b); text-align:center; font-family:'Plus Jakarta Sans',sans-serif;">${timeStr}</td>
                    <td style="text-align:center;">
                        <span style="font-weight:900; color:${actionColor}; background:${actionBg}; padding:6px 12px; border-radius:8px; font-size:0.85rem;">${l.action}</span>
                    </td>
                    <td class="audit-detail" style="color:var(--text-main, #0f172a); font-weight:600; text-align:left;">${l.details}</td>
                    <td style="text-align:center; font-family:monospace; font-weight:800; color:var(--text-sub, #94a3b8);">${l.ip}</td>
                </tr>`;
            }).join('');
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color:#e11d48; font-weight:700;">Lỗi kết nối hoặc phiên đăng nhập hết hạn</td></tr>';
    }
}

window.switchTab = function(tabId, el) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    if (el) el.classList.add('active');
    
    const titles = {
        'tab-dashboard': 'Tổng quan hệ thống', 
        'tab-live': 'Giám sát phòng thi trực tiếp',
        'tab-history': 'Lịch sử thi', 
        'tab-qbank': 'Ngân hàng câu hỏi', 
        'tab-menu': 'Quản lý Menu Bài thi', 
        'tab-settings': 'Cài đặt nâng cao',
        'tab-audit': 'Nhật ký hoạt động'
    };
    document.getElementById('current-page-title').innerText = titles[tabId];

    if (tabId === 'tab-qbank') window.loadQBanks();
    if (tabId === 'tab-menu') window.loadExamMenuEditor();
    if (tabId === 'tab-audit') window.loadAuditLogs(); 
    if (tabId === 'tab-live') window.pollLiveExams(); 
    if (tabId === 'tab-history') { if(window.allData.length === 0) window.loadData(); else window.applyFilters(); }
}

window.startAdminApp = function() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'flex';
    window.loadData(); window.loadAdminConfig(); window.loadQBanks(); window.loadExamMenuEditor();
    window.pollOnline(); window.pollLiveExams();
    setInterval(window.pollOnline, 30000); setInterval(window.pollLiveExams, 5000);
}

window.doLogin = async function() {
    const pw = document.getElementById('pw-input').value;
    try {
        const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
        if (res.ok) { sessionStorage.setItem('admin_auth', '1'); sessionStorage.setItem('admin_pw_b64', btoa(pw)); window.startAdminApp(); } 
        else document.getElementById('pw-error').style.display = 'block';
    } catch(e) { document.getElementById('pw-error').style.display = 'block'; }
}
document.getElementById('pw-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); });
window.doLogout = function() { sessionStorage.clear(); window.location.href = '../index.html'; }


// ==============================================================================
// BỘ QUY TẮC CSS DARK MODE TUYỆT ĐỐI (ABSOLUTE CSS INJECTION)
// Đè bẹp mọi style nội tuyến, trả lại giao diện Dark Mode chuẩn mực
// ==============================================================================
window.initAdminDarkMode = function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* LỚP BẢO VỆ CƠ BẢN */
        [data-theme="dark"] body { background-color: #0f172a !important; color: #f8fafc !important; }
        [data-theme="dark"] .sidebar { background: #1e293b !important; border-right: 1px solid #334155 !important; }
        [data-theme="dark"] .top-bar { background: rgba(30, 41, 59, 0.9) !important; border-bottom: 1px solid #334155 !important; }
        [data-theme="dark"] .sidebar .nav-item { color: #94a3b8 !important; }
        [data-theme="dark"] .sidebar .nav-item:hover, [data-theme="dark"] .sidebar .nav-item.active { background: #334155 !important; color: #f8fafc !important; }
        [data-theme="dark"] { --modal-bg: #1e293b; --text-main: #f8fafc; --text-sub: #94a3b8; --hover-bg: #334155; --btn-bg: #334155; --btn-text: #cbd5e1;}

        /* ==============================================
           1. FIX TẬN GỐC THỐNG KÊ BÀI THI & NHÀ THẦU
           ============================================== */
        /* Khối ngoài cùng chứa thống kê */
        [data-theme="dark"] .stats-grid > div { 
            background: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important; 
        }
        
        /* Từng dòng bài thi & nhà thầu bên trong */
        [data-theme="dark"] .exam-stat-item, 
        [data-theme="dark"] #contractor-stats-list > div,
        [data-theme="dark"] #live-list > div { 
            background: #1e293b !important; 
            border: 1px solid #334155 !important; 
        }
        [data-theme="dark"] .exam-stat-item:hover, 
        [data-theme="dark"] #contractor-stats-list > div:hover {
            background: #334155 !important; border-color: #475569 !important;
        }

        /* Chữ bên trong thống kê (Sửa lỗi tàng hình) */
        [data-theme="dark"] .exam-name, 
        [data-theme="dark"] .exam-stat-item div:not([style*="background"]),
        [data-theme="dark"] #contractor-stats-list div:not([style*="background"]) { 
            color: #f8fafc !important; 
        }
        [data-theme="dark"] #contractor-stats-list strong { color: #ffffff !important; }
        
        /* Thẻ "Đạt / Tổng" bên trong bài thi */
        [data-theme="dark"] .exam-stat-item span { 
            background: #0f172a !important; border-color: #334155 !important; color: #cbd5e1 !important; 
        }
        /* Thẻ đạt người bên trong xếp hạng */
        [data-theme="dark"] #contractor-stats-list span[style*="background"] {
            background: #0f172a !important; border: 1px solid #334155 !important; color: #cbd5e1 !important;
        }
        [data-theme="dark"] #contractor-stats-list span[style*="color: #64748b"],
        [data-theme="dark"] #contractor-stats-list span[style*="color:#64748b"] {
            color: #94a3b8 !important;
        }

        /* ==============================================
           2. FIX TẬN GỐC BẢNG LỊCH SỬ THI
           ============================================== */
        [data-theme="dark"] .table-wrapper, [data-theme="dark"] .card { background: #1e293b !important; border-color: #334155 !important; }
        [data-theme="dark"] .admin-table { background: transparent !important; }
        [data-theme="dark"] .admin-table th { background: #0f172a !important; color: #94a3b8 !important; border-bottom: 1px solid #334155 !important; }
        
        /* Nền từng dòng lịch sử */
        [data-theme="dark"] .history-card-row { background: #1e293b !important; }
        [data-theme="dark"] .history-card-row:hover { background: #334155 !important; }
        [data-theme="dark"] .history-card-row td { border-color: #334155 !important; color: #cbd5e1 !important; }
        
        /* Dòng bị cấm thi (Đỏ nhạt sang trọng) */
        [data-theme="dark"] .history-card-row[style*="fff1f2"] { background: rgba(225, 29, 72, 0.1) !important; }
        [data-theme="dark"] .history-card-row[style*="fff1f2"]:hover { background: rgba(225, 29, 72, 0.18) !important; }

        /* Chữ trong Lịch sử */
        [data-theme="dark"] .td-name, [data-theme="dark"] .exam-name-vi, [data-theme="dark"] .exam-title-vi, [data-theme="dark"] .history-card-row strong { color: #f8fafc !important; }
        [data-theme="dark"] .td-cccd, [data-theme="dark"] .exam-title-en { color: #94a3b8 !important; }
        
        /* Nút Xem Máy & IP / Tên công ty / Ngày tháng */
        [data-theme="dark"] .history-card-row div[onclick*="showModernModal"],
        [data-theme="dark"] .history-card-row span[style*="background"],
        [data-theme="dark"] .time-date-badge { 
            background: #0f172a !important; border: 1px solid #334155 !important; color: #cbd5e1 !important; 
        }
        [data-theme="dark"] .history-card-row div[onclick*="showModernModal"]:hover { background: #334155 !important; color: #fff !important; border-color: #475569 !important; }

        [data-theme="dark"] .time-range-badge, [data-theme="dark"] .t-arrow { color: #94a3b8 !important; }
        [data-theme="dark"] .t-start, [data-theme="dark"] .t-end { color: #f8fafc !important; }
        [data-theme="dark"] .score-pct { color: #818cf8 !important; }

        /* ==============================================
           3. THIẾT KẾ LẠI THANH PHÂN TRANG (TO HƠN, RÕ HƠN)
           ============================================== */
        /* Áp dụng chung cho cả Sáng và Tối */
        .page-btn { 
            padding: 10px 18px !important; 
            font-size: 1.05rem !important; 
            border-radius: 12px !important; 
            min-width: 46px; 
            height: 46px; 
            font-weight: 800 !important; 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            cursor: pointer; transition: 0.2s; 
        }
        
        /* Khi bật Dark Mode */
        [data-theme="dark"] .pagination-container button { background: #1e293b !important; border: 1px solid #334155 !important; color: #cbd5e1 !important; }
        [data-theme="dark"] .pagination-container button.active { background: #4f46e5 !important; border-color: #4f46e5 !important; color: #ffffff !important; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4) !important;}
        [data-theme="dark"] .pagination-container button:hover:not(:disabled) { background: #334155 !important; color: #fff !important; border-color: #475569 !important; }
        
        [data-theme="dark"] .pagination-container input { background: #0f172a !important; border: 1px solid #334155 !important; color: #818cf8 !important; height: 46px !important; font-size: 1.1rem !important; border-radius: 12px !important;}
        [data-theme="dark"] .pagination-container span { color: #94a3b8 !important; }

        /* BỘ LỌC TÌM KIẾM */
        [data-theme="dark"] .filter-section { background: #1e293b !important; border-color: #334155 !important; }
        [data-theme="dark"] .filter-section input, [data-theme="dark"] .filter-section select { background: #0f172a !important; border: 1px solid #334155 !important; color: #f8fafc !important; height: 46px !important; font-size: 0.95rem !important; }
        [data-theme="dark"] .filter-section input:focus, [data-theme="dark"] .filter-section select:focus { border-color: #6366f1 !important; }

        /* ==============================================
           4. MENU BÀI THI & CÁC TRANG KHÁC
           ============================================== */
        [data-theme="dark"] .exam-editor-row { background: #1e293b !important; border-color: #334155 !important; }
        [data-theme="dark"] .audit-row { background: #1e293b !important; border-color: #334155 !important; }
        [data-theme="dark"] .audit-row:hover { background: #334155 !important; }
        [data-theme="dark"] input, [data-theme="dark"] select, [data-theme="dark"] textarea { background: #0f172a !important; border-color: #334155 !important; color: #f8fafc !important; }

        /* GIAO DIỆN NÚT TOGGLE GÓC PHẢI DƯỚI */
        .admin-theme-toggle { position: fixed; bottom: 30px; right: 30px; z-index: 9999; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 50%; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); color: #64748b; }
        .admin-theme-toggle:hover { transform: translateY(-4px) scale(1.05); box-shadow: 0 10px 25px rgba(0,0,0,0.1); color: #0f172a; }
        [data-theme="dark"] .admin-theme-toggle { background: #1e293b; border-color: #334155; color: #fbbf24; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
        [data-theme="dark"] .admin-theme-toggle:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.6); color: #fcd34d; }
    `;
    document.head.appendChild(style);

    // THÊM NÚT SÁNG/TỐI
    const btn = document.createElement('button');
    btn.className = 'admin-theme-toggle';
    btn.title = "Chuyển đổi Sáng/Tối";
    btn.innerHTML = `
        <svg class="moon-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        <svg class="sun-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:none;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
    `;
    document.body.appendChild(btn);

    const checkAndApplyTheme = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.querySelector('.admin-theme-toggle .moon-icon').style.display = 'none';
            document.querySelector('.admin-theme-toggle .sun-icon').style.display = 'block';
        } else {
            document.querySelector('.admin-theme-toggle .moon-icon').style.display = 'block';
            document.querySelector('.admin-theme-toggle .sun-icon').style.display = 'none';
        }
    };

    btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('hse_theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('hse_theme', 'dark');
        }
        checkAndApplyTheme();
    });

    if (localStorage.getItem('hse_theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    checkAndApplyTheme();
};
document.addEventListener('DOMContentLoaded', window.initAdminDarkMode);