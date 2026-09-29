const PAGE_SIZE = 20;
let currentPage = 1;

function toTitleCase(str) {
    if (!str) return '';
    return str.trim().split(/\s+/).map(w =>
        w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''
    ).join(' ');
}

function formatExamName(r) {
    const vi = r.examName || '';
    const en = r.examNameEn || '';
    return `<span class="exam-name-vi">${vi}</span>${en ? `<span class="exam-name-en">${en}</span>` : ''}`;
}

let allData = [];
let filtered = [];
let toastTimer = null;
let qbankData = [];
let examsConfig = { basic: [], advanced: [] };

function showToast(msg, type = 'default') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ─── CƠ CHẾ BẬT/TẮT MODAL & POPUP CHUẨN XÁC ───
function showConfirm(onOk, title, msg) {
    const overlay = document.getElementById('confirm-overlay');
    if(overlay) overlay.classList.add('show');
    if (title) document.getElementById('confirm-title').textContent = title;
    if (msg) document.getElementById('confirm-msg').textContent = msg;
    const btn = document.getElementById('confirm-ok-btn');
    if(btn) btn.onclick = () => { closeConfirm(); onOk(); };
}

function closeConfirm() { 
    const overlay = document.getElementById('confirm-overlay');
    if(overlay) overlay.classList.remove('show'); 
}

function closeFolderViewModal() { 
    const modal = document.getElementById('folder-view-modal');
    if(modal) modal.classList.remove('show'); 
}

function openExamEditModal(group, idx) {
    const exam = examsConfig[group][idx];
    document.getElementById('edit-exam-id').value = idx;
    document.getElementById('edit-exam-group').value = group;
    document.getElementById('edit-exam-name-vi').value = exam.nameVi || '';
    document.getElementById('edit-exam-name-en').value = exam.nameEn || '';
    document.getElementById('edit-exam-time').value = exam.timeMinutes || 30;
    document.getElementById('edit-exam-qs').value = exam.questionCount || 30;
    
    loadFolderDropdowns();
    let examFolder = exam.folder;
    if (!examFolder && exam.files && exam.files.length > 0) {
        examFolder = exam.files[0].split('/')[0];
    }
    document.getElementById('edit-exam-folder').value = examFolder || '';
    
    document.getElementById('exam-edit-modal').classList.add('show');
}

function closeExamEditModal() { 
    document.getElementById('exam-edit-modal').classList.remove('show'); 
}

const confirmOverlay = document.getElementById('confirm-overlay');
if (confirmOverlay) {
    confirmOverlay.addEventListener('click', e => {
        if (e.target === confirmOverlay) closeConfirm();
    });
}
const folderViewModal = document.getElementById('folder-view-modal');
if (folderViewModal) {
    folderViewModal.addEventListener('click', e => {
        if (e.target === folderViewModal) closeFolderViewModal();
    });
}
const examEditModal = document.getElementById('exam-edit-modal');
if (examEditModal) {
    examEditModal.addEventListener('click', e => {
        if (e.target === examEditModal) closeExamEditModal();
    });
}

function switchTab(tabId, el) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    if (el) el.classList.add('active');
    
    const pageTitle = document.getElementById('current-page-title');
    if (pageTitle) {
        if (tabId === 'tab-dashboard') pageTitle.innerText = "Tổng quan hệ thống";
        if (tabId === 'tab-history') pageTitle.innerText = "Lịch sử thi";
        if (tabId === 'tab-qbank') pageTitle.innerText = "Ngân hàng câu hỏi";
        if (tabId === 'tab-menu') pageTitle.innerText = "Quản lý Menu Bài thi";
        if (tabId === 'tab-settings') pageTitle.innerText = "Cài đặt nâng cao";
    }
}

function startAdminApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'flex';
    loadData();
    loadAdminConfig();
    pollOnline();
    pollLiveExams();
    setInterval(pollOnline, 30000);
    setInterval(pollLiveExams, 5000);
    loadQBanks();
    loadExamMenuEditor();
}

async function doLogin() {
    const pw = document.getElementById('pw-input').value;
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
        });
        if (res.ok) {
            sessionStorage.setItem('admin_auth', '1');
            sessionStorage.setItem('admin_pw_b64', btoa(pw));
            startAdminApp();
        } else {
            document.getElementById('pw-error').style.display = 'block';
        }
    } catch(e) { document.getElementById('pw-error').style.display = 'block'; }
}

const pwInput = document.getElementById('pw-input');
if(pwInput) {
    pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function doLogout() {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('admin_pw_b64');
    window.location.href = '../index.html';
}

if (sessionStorage.getItem('admin_auth') === '1') { startAdminApp(); }

async function loadAdminConfig() {
    try {
        const res = await fetch('/api/admin/config');
        const cfg = await res.json();
        // Update system info panel
        const recEl = document.getElementById('cfg-record-count');
        if (recEl) recEl.textContent = (cfg.recordCount || 0).toLocaleString();
        const portEl = document.getElementById('cfg-port-val');
        if (portEl) portEl.textContent = cfg.port || 5000;
        const urlEl = document.getElementById('cfg-url-val');
        if (urlEl) urlEl.textContent = window.location.origin;
        // Load general settings
        const spInput = document.getElementById('cfg-sp-url');
        if (spInput && cfg.sharePointUrl) spInput.value = cfg.sharePointUrl;
        const nameInput = document.getElementById('cfg-app-name');
        if (nameInput) nameInput.value = cfg.appName || 'Safety Portal HSE';
        const threshInput = document.getElementById('cfg-pass-threshold');
        if (threshInput) threshInput.value = cfg.passThreshold ?? 80;
    } catch(e) {}
}

function getStoredPw() { try { return atob(sessionStorage.getItem('admin_pw_b64') || ''); } catch(e) { return ''; } }

async function changeAdminPassword() {
    const cur = document.getElementById('cfg-cur-pw').value;
    const nw = document.getElementById('cfg-new-pw').value;
    const cf = document.getElementById('cfg-confirm-pw').value;
    const msg = document.getElementById('cfg-pw-msg');
    if (!cur || !nw || !cf) { msg.textContent = '⚠ Vui lòng điền đầy đủ'; msg.className = 'cfg-msg error'; return; }
    if (nw !== cf) { msg.textContent = '⚠ Mật khẩu xác nhận không khớp'; msg.className = 'cfg-msg error'; return; }
    if (nw.length < 6) { msg.textContent = '⚠ Mật khẩu tối thiểu 6 ký tự'; msg.className = 'cfg-msg error'; return; }
    try {
        const res = await fetch('/api/admin/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: cur, newPassword: nw })
        });
        const data = await res.json();
        if (res.ok) {
            sessionStorage.setItem('admin_pw_b64', btoa(nw));
            msg.textContent = '✅ Đổi mật khẩu thành công!';
            msg.className = 'cfg-msg success';
            document.getElementById('cfg-cur-pw').value = ''; document.getElementById('cfg-new-pw').value = ''; document.getElementById('cfg-confirm-pw').value = '';
        } else {
            msg.textContent = `⚠ ${data.error || 'Lỗi'}`; msg.className = 'cfg-msg error';
        }
    } catch(e) { msg.textContent = '⚠ Lỗi kết nối server'; msg.className = 'cfg-msg error'; }
}

async function saveAdminSettings() {
    const pw = getStoredPw();
    const spUrl = (document.getElementById('cfg-sp-url') || {}).value?.trim() || '';
    const appName = (document.getElementById('cfg-app-name') || {}).value?.trim() || '';
    const passThreshold = parseInt((document.getElementById('cfg-pass-threshold') || {}).value) || 80;
    const msg = document.getElementById('cfg-settings-msg');
    if (!pw) { msg.textContent = '⚠ Phiên hết hạn, đăng nhập lại'; msg.className = 'cfg-msg error'; return; }
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: pw, sharePointUrl: spUrl, appName, passThreshold })
        });
        const data = await res.json();
        if (res.ok) {
            msg.textContent = '✅ Đã lưu cài đặt!'; msg.className = 'cfg-msg success';
            setTimeout(() => { msg.textContent = ''; }, 3000);
        } else {
            msg.textContent = `⚠ ${data.error || 'Lỗi'}`; msg.className = 'cfg-msg error';
        }
    } catch(e) { msg.textContent = '⚠ Lỗi kết nối server'; msg.className = 'cfg-msg error'; }
}

async function downloadDatabase() {
    const pw = getStoredPw();
    if (!pw) { showToast('Phiên hết hạn, đăng nhập lại', 'error'); return; }
    try {
        const res = await fetch(`/api/database/download?adminPassword=${encodeURIComponent(pw)}`);
        if (!res.ok) { showToast('Lỗi tải xuống database', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('Đã tải xuống database thành công', 'success');
    } catch(e) { showToast('Lỗi kết nối server', 'error'); }
}

async function clearAllHistory() {
    if (!confirm('⚠️ XÓA TOÀN BỘ lịch sử thi?\n\nHành động này KHÔNG THỂ HOÀN TÁC!\nToàn bộ dữ liệu sẽ bị xóa vĩnh viễn.\n\nNhấn OK để xác nhận.')) return;
    const pw = getStoredPw();
    try {
        const emptyDb = JSON.stringify([]);
        const blob = new Blob([emptyDb], { type: 'application/json' });
        const formData = new FormData();
        formData.append('dbfile', blob, 'database.json');
        const res = await fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData });
        if (res.ok) {
            allData = []; filtered = [];
            buildExamFilter(); applyFilters(); renderStats([]);
            const recEl = document.getElementById('cfg-record-count');
            if (recEl) recEl.textContent = '0';
            showToast('Đã xóa toàn bộ lịch sử thi', 'success');
        } else { showToast('Lỗi xóa dữ liệu', 'error'); }
    } catch(e) { showToast('Lỗi kết nối server', 'error'); }
}

async function uploadDatabase() {
    const fileInput = document.getElementById('db-upload-input');
    const msgEl = document.getElementById('db-upload-msg');
    const pw = getStoredPw();

    if (!fileInput.files[0]) { msgEl.textContent = '⚠ Chọn file database.json'; msgEl.className = 'cfg-msg error'; return; }
    if (!pw) { msgEl.textContent = '⚠ Vui lòng đăng nhập lại'; msgEl.className = 'cfg-msg error'; return; }

    msgEl.textContent = '⏳ Đang tải lên...'; msgEl.className = 'cfg-msg';

    const formData = new FormData();
    formData.append('dbfile', fileInput.files[0]);

    try {
        const res = await fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (err) { throw new Error('Phản hồi từ server bị lỗi định dạng.'); }

        if (res.ok) {
            msgEl.textContent = `✅ ${data.message}`; msgEl.className = 'cfg-msg success';
            fileInput.value = ''; loadData();
        } else { msgEl.textContent = `⚠ ${data.error}`; msgEl.className = 'cfg-msg error'; }
    } catch(e) { msgEl.textContent = `⚠ ${e.message}`; msgEl.className = 'cfg-msg error'; }
}

let liveSessionData = [];
let liveTimerInterval = null;

function startLiveTimerTick() {
    if (liveTimerInterval) return;
    liveTimerInterval = setInterval(() => {
        if (!liveSessionData.length) return;
        const now = Date.now();
        document.querySelectorAll('.live-timer[data-start]').forEach(el => {
            const start = parseInt(el.dataset.start, 10);
            const elapsed = Math.floor((now - start) / 1000);
            const h = Math.floor(elapsed / 3600);
            const m = Math.floor((elapsed % 3600) / 60);
            const s = elapsed % 60;
            el.querySelector('.live-timer-text').textContent = h > 0 ? `${h}g ${m}p ${String(s).padStart(2,'0')}s` : m > 0 ? `${m} phút ${String(s).padStart(2,'0')} giây` : `${s} giây`;
        });
    }, 1000);
}

async function pollOnline() {
    try {
        const res = await fetch('/api/online');
        const data = await res.json();
        const badge = document.getElementById('admin-online-count');
        if (badge) badge.textContent = data.online;
    } catch (_) {}
}

async function pollLiveExams() {
    try {
        const res = await fetch('/api/active-exams');
        const active = await res.json();
        liveSessionData = active;
        renderLiveExams(active);
        const list = document.getElementById('live-list');
        if (active.length === 0 && list && list.dataset.hadActive === '1') { loadData(); }
        if (list) list.dataset.hadActive = active.length > 0 ? '1' : '0';
    } catch (_) {}
}

function renderLiveExams(active) {
    const list = document.getElementById('live-list');
    const badge = document.getElementById('live-count-badge');
    const now = Date.now();

    if (!list) return;

    if (!active || active.length === 0) {
        if (badge) badge.style.display = 'none';
        list.innerHTML = `<div class="live-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><span>Hiện không có ai đang thi</span></div>`;
        return;
    }

    if (badge) {
        badge.style.display = 'inline-flex';
        badge.textContent = active.length;
    }

    list.innerHTML = active.map((s, idx) => {
        const startTime = s.startTime || now;
        const lastSeen = s.lastSeen || now;
        const elapsed = Math.floor((now - startTime) / 1000);
        const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), sec = elapsed % 60;
        const elapsedStr = h > 0 ? `${h}g ${m}p ${String(sec).padStart(2,'0')}s` : m > 0 ? `${m} phút ${String(sec).padStart(2,'0')} giây` : `${sec} giây`;
        const uid = s.userId || '—';
        const name = toTitleCase(s.userName || s.details?.userName || '');
        const company = (s.company || s.details?.company || '').toUpperCase();
        const exam = s.examName || 'Đang tải...';
        const examEn = s.examNameEn ? ` — ${s.examNameEn}` : '';
        
        const d = new Date(startTime);
        const startStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        
        const lastSeenAgo = Math.floor((now - lastSeen) / 1000);
        const pingStr = lastSeenAgo < 5 ? 'Vừa xong' : lastSeenAgo < 60 ? `${lastSeenAgo}s trước` : `${Math.floor(lastSeenAgo/60)}p trước`;

        return `<div class="live-card">
            <div class="live-avatar">${idx + 1}</div>
            <div class="live-card-info">
                <div class="live-uid">${uid}${name ? ` · <span class="live-name">${name}</span>` : ''}</div>
                ${company ? `<div class="live-company">🏢 ${company}</div>` : ''}
                <div class="live-exam">${exam}<span class="live-exam-en">${examEn}</span></div>
            </div>
            <div class="live-card-meta">
                <div class="live-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Bắt đầu: <strong>${startStr}</strong></div>
                <div class="live-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.63 19a19.45 19.45 0 0 1-6.63-6.63 19.79 19.79 0 0 1-2.92-8.19A2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91"/></svg> Ping: <strong>${pingStr}</strong></div>
            </div>
            <div class="live-card-right">
                <div class="live-timer" data-start="${startTime}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> <span class="live-timer-text">${elapsedStr}</span></div>
                <div class="live-status-pill"><div class="live-status-dot"></div>Đang thi</div>
            </div>
        </div>`;
    }).join('');

    startLiveTimerTick();
}

async function loadData() {
    try {
        const res = await fetch('/api/history');
        const data = await res.json();
        if (Array.isArray(data)) {
            allData = data;
        } else {
            console.error("Lỗi dữ liệu từ máy chủ (Không phải Array):", data);
            allData = [];
        }
    } catch (e) {
        console.error("Lỗi Fetch lịch sử thi:", e);
        allData = [];
    } finally {
        buildExamFilter();
        applyFilters();
        renderStats(allData);
    }
}

function buildExamFilter() {
    const names = [...new Set(allData.map(r => r.examName))].sort();
    const sel = document.getElementById('f-exam');
    if(!sel) return;
    sel.innerHTML = '<option value="">Tất cả bài thi</option>';
    names.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        sel.appendChild(opt);
    });
}

function renderStats(data) {
    const grid = document.getElementById('exam-stats-grid');

    if (!data || data.length === 0) {
        if(grid) grid.innerHTML = '<span style="color:#64748b; font-size:0.95rem; font-weight:600; padding:10px;">Chưa có dữ liệu thống kê nào để hiển thị.</span>';
        return;
    }

    const total = data.length;
    const passed = data.filter(r => r.isPass).length;
    const failed = total - passed;
    const passRate = total > 0 ? Math.round(passed / total * 100) : 0;
    const failRate = total > 0 ? Math.round(failed / total * 100) : 0;
    const avgScore = total > 0 ? Math.round(data.reduce((s, r) => s + (Number(r.score) || 0), 0) / total) : 0;

    const elTotal = document.getElementById('stat-total');
    const elPass = document.getElementById('stat-pass');
    const elFail = document.getElementById('stat-users');
    const elAvg = document.getElementById('stat-avg');
    
    if(elTotal) elTotal.textContent = total.toLocaleString();
    if(elPass) elPass.textContent = passRate + '%';
    if(elFail) elFail.textContent = failRate + '%';
    if(elAvg) elAvg.textContent = avgScore + '%';

    const circumference = 2 * Math.PI * 30;
    const passArc = total > 0 ? (passed / total) * circumference : 0;
    const failArc = total > 0 ? (failed / total) * circumference : 0;

    const donutPassArc = document.getElementById('donut-pass-arc');
    const donutFailArc = document.getElementById('donut-fail-arc');
    if (donutPassArc) donutPassArc.setAttribute('stroke-dasharray', `${passArc} ${circumference - passArc}`);
    if (donutFailArc) {
        donutFailArc.setAttribute('stroke-dasharray', `${failArc} ${circumference - failArc}`);
        donutFailArc.style.transform = `rotate(${(passArc / circumference) * 360 - 90}deg)`;
    }
    
    const centerEl = document.getElementById('donut-center-text');
    if (centerEl) {
        centerEl.textContent = total > 0 ? passRate + '%' : '—';
        centerEl.style.color = passRate >= 70 ? '#059669' : passRate >= 50 ? '#ea580c' : '#e11d48';
    }
    
    const valPass = document.getElementById('donut-pass-val');
    const valFail = document.getElementById('donut-fail-val');
    if(valPass) valPass.textContent = passed.toLocaleString();
    if(valFail) valFail.textContent = failed.toLocaleString();

    const examMap = {};
    data.forEach(r => {
        let key = r.examName ? r.examName.trim() : 'CHƯA RÕ BÀI THI';
        
        if (key.toUpperCase().includes('CHUYÊN SÂU') || key.toUpperCase().includes('ADVANCED') || (r.exams && r.exams.length > 1)) {
            key = 'MÔ-ĐUN CHUYÊN SÂU (TỔNG HỢP)';
        }

        if (!examMap[key]) examMap[key] = { total: 0, passed: 0 };
        examMap[key].total++;
        if (r.isPass) examMap[key].passed++;
    });
    
    if(grid) {
        if (Object.keys(examMap).length === 0) {
            grid.innerHTML = '<span style="color:#64748b; font-size:0.95rem; font-weight:600; padding:10px;">Chưa có dữ liệu bài thi.</span>';
        } else {
            grid.innerHTML = Object.entries(examMap)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, s]) => {
                    const rate = Math.round(s.passed / s.total * 100);
                    const color = rate >= 70 ? '#059669' : rate >= 50 ? '#ea580c' : '#e11d48';
                    const bg = rate >= 70 ? '#ecfdf5' : rate >= 50 ? '#fff7ed' : '#fff1f2';
                    const border = rate >= 70 ? '#a7f3d0' : rate >= 50 ? '#fed7aa' : '#fecdd3';
                    return `<div class="exam-stat-card">
                        <div class="exam-name">${name}</div>
                        <div class="exam-bar-wrap"><div class="exam-bar" style="width:${rate}%; background:${color}"></div></div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
                            <div class="exam-rate" style="color:${color}; background:${bg}; border:1px solid ${border}">${rate}% đạt</div>
                            <div class="exam-count">${s.passed}/${s.total} lượt</div>
                        </div>
                    </div>`;
                }).join('');
        }
    }
}

let adminKnownIds = [];
async function loadAdminKnownIds() { try { adminKnownIds = [...new Set(allData.map(r => r.userId).filter(Boolean))]; } catch (_) {} }

function updateAdminCccdGhost(val) {
    const ghost = document.getElementById('f-cccd-ghost');
    if (!ghost) return;
    if (!val) { ghost.innerHTML = ''; return; }
    const match = adminKnownIds.find(id => id.startsWith(val) && id !== val);
    if (match) ghost.innerHTML = `<span style="color:transparent">${val}</span><span class="ghost-suffix">${match.slice(val.length)}</span>`;
    else ghost.innerHTML = '';
}

const fCccd = document.getElementById('f-cccd');
if(fCccd){
    fCccd.addEventListener('input', function() { loadAdminKnownIds(); updateAdminCccdGhost(this.value.trim()); applyFilters(); });
    fCccd.addEventListener('keydown', function(e) {
        const ghost = document.getElementById('f-cccd-ghost');
        if (!ghost) return;
        if ((e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'Enter') && ghost.querySelector('.ghost-suffix')) {
            const suffix = ghost.querySelector('.ghost-suffix').textContent;
            if (suffix) { e.preventDefault(); this.value += suffix; ghost.innerHTML = ''; applyFilters(); }
        }
    });
}

function applyFilters() {
    const cccdEl = document.getElementById('f-cccd');
    const examEl = document.getElementById('f-exam');
    const statusEl = document.getElementById('f-status');
    const dateEl = document.getElementById('f-date');
    const nameEl = document.getElementById('f-name');
    const companyEl = document.getElementById('f-company');

    const cccd = cccdEl ? cccdEl.value.trim().toLowerCase() : '';
    const exam = examEl ? examEl.value : '';
    const status = statusEl ? statusEl.value : '';
    const date = dateEl ? dateEl.value : '';
    const name = nameEl ? nameEl.value.trim().toLowerCase() : '';
    const company = companyEl ? companyEl.value.trim().toLowerCase() : '';

    filtered = allData.filter(r => {
        if (cccd && !r.userId.toLowerCase().includes(cccd)) return false;
        if (name && !(r.userName || '').toLowerCase().includes(name)) return false;
        if (company && !(r.company || r.details?.company || '').toLowerCase().includes(company)) return false;
        if (exam && r.examName !== exam) return false;
        if (status === 'pass' && !r.isPass) return false;
        if (status === 'fail' && r.isPass) return false;
        if (date) {
            const d = new Date(r.timestamp);
            if (`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` !== date) return false;
        }
        return true;
    });

    currentPage = 1; renderTable(filtered); renderPagination();
    const tableMeta = document.getElementById('table-meta');
    if(tableMeta) tableMeta.textContent = `Hiển thị ${filtered.length} / ${allData.length} kết quả`;
}

function resetFilters() {
    if(document.getElementById('f-cccd')) document.getElementById('f-cccd').value = ''; 
    if(document.getElementById('f-exam')) document.getElementById('f-exam').value = ''; 
    if(document.getElementById('f-status')) document.getElementById('f-status').value = ''; 
    if(document.getElementById('f-date')) document.getElementById('f-date').value = '';
    if(document.getElementById('f-name')) document.getElementById('f-name').value = '';
    if(document.getElementById('f-company')) document.getElementById('f-company').value = '';
    const ghost = document.getElementById('f-cccd-ghost'); if (ghost) ghost.innerHTML = '';
    applyFilters();
}

// ─── LỘT XÁC RENDER TABLE ADMIN: CÓ GIÂY, CLICK-TO-EDIT, BẢNG NỔI KHỐI ───
function renderTable(data) {
    const tbody = document.getElementById('admin-tbody');
    const noData = document.getElementById('no-data');

    if (!tbody || !noData) return;

    if (data.length === 0) { tbody.innerHTML = ''; noData.style.display = 'flex'; return; }
    noData.style.display = 'none';

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = pageData.map((r, i) => {
        const startT = r.startTime || r.details?.startTime;
        const endTs = r.timestamp;
        const dE = new Date(endTs);
        const dateStrTxt = `${String(dE.getDate()).padStart(2,'0')}/${String(dE.getMonth()+1).padStart(2,'0')}/${dE.getFullYear()}`;
        
        const fmtT = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        const svgCal = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px; margin-top:-2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
        
        let dateBlock = '';
        if (startT && startT !== endTs) {
            const dS = new Date(startT);
            dateBlock = `
                <div class="time-box">
                    <div class="time-date-badge">${svgCal} ${dateStrTxt}</div>
                    <div class="time-range-badge">
                        <span class="t-start">${fmtT(dS)}</span>
                        <span class="t-arrow">→</span>
                        <span class="t-end">${fmtT(dE)}</span>
                    </div>
                </div>`;
        } else {
            dateBlock = `
                <div class="time-box">
                    <div class="time-date-badge">${svgCal} ${dateStrTxt}</div>
                    <div class="time-range-badge"><span class="t-end">${fmtT(dE)}</span></div>
                </div>`;
        }

        const name = toTitleCase(r.userName || r.details?.userName || '');
        const company = (r.company || r.details?.company || '').toUpperCase();
        
        return `<tr id="row-${r.timestamp}">
            <td class="td-num">${start + i + 1}</td>
            
            <td><span class="editable-text" onclick="startEdit(${r.timestamp})" title="Nhấn để sửa"><strong>${r.userId}</strong></span></td>
            <td class="td-name"><span class="editable-text" onclick="startEdit(${r.timestamp})" title="Nhấn để sửa">${name || '<span class="td-missing">—</span>'}</span></td>
            <td class="td-company"><span class="editable-text" onclick="startEdit(${r.timestamp})" title="Nhấn để sửa">${company || '<span class="td-missing">—</span>'}</span></td>
            
            <td>${dateBlock}</td>
            <td>${formatExamName(r)}</td>
            <td class="td-score">${r.correctCount}/${r.totalCount}<span class="score-pct">${r.score}%</span></td>
            <td><span class="badge ${r.isPass ? 'pass' : 'fail'}">${r.isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}</span></td>
            <td class="action-cell" id="actions-${r.timestamp}">
                <button class="btn-review" onclick="reviewRecord(${filtered.indexOf(r)})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Xem</button>
                <button class="btn-delete" onclick="deleteRecord(${r.timestamp})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M9 6V4h6v2"></path></svg> Xóa</button>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination() {
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const container = document.getElementById('pagination');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<div class="page-info">Trang ${currentPage} / ${totalPages}</div><div class="page-btns">`;
    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" onclick="goToPage(${currentPage - 1})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg></button>`;

    const range = getPageRange(currentPage, totalPages);
    range.forEach(p => {
        if (p === '...') html += `<span class="page-ellipsis">…</span>`;
        else html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
    });

    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" onclick="goToPage(${currentPage + 1})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div>`;
    container.innerHTML = html;
}

function getPageRange(current, total) {
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total-4, total-3, total-2, total-1, total];
    return [1, '...', current-1, current, current+1, '...', total];
}

function goToPage(page) {
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page; renderTable(filtered); renderPagination();
    const ts = document.getElementById('table-section');
    if(ts) ts.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function reviewRecord(index) {
    const record = filtered[index];
    if (!record || !record.details) return;
    const details = { ...record.details, displayLang: record.details.lang || 'vi' };
    localStorage.setItem('examResult', JSON.stringify(details));
    window.open('../tinhdiem/result.html', '_blank');
}

function deleteRecord(timestamp) {
    showConfirm(async () => {
        try {
            const res = await fetch(`/api/history/${timestamp}`, { method: 'DELETE' });
            if (res.ok) {
                allData = allData.filter(r => r.timestamp !== timestamp);
                applyFilters(); renderStats(allData); buildExamFilter();
                showToast('Đã xóa bản ghi thành công', 'success');
            } else { showToast('Lỗi: không thể xóa bản ghi', 'error'); }
        } catch (e) { showToast('Lỗi kết nối server', 'error'); }
    }, 'Xác nhận xóa', 'Bản ghi này sẽ bị xóa vĩnh viễn khỏi lịch sử thi. Hành động này không thể hoàn tác.');
}

function startEdit(timestamp) {
    const row = document.getElementById(`row-${timestamp}`);
    if (!row) return;
    const record = allData.find(r => r.timestamp === timestamp);
    if (!record) return;
    
    row.classList.add('editing-row');
    
    // Đổi CCCD, Tên, Công ty thành ô Input
    row.cells[1].innerHTML = `<input class="td-inline-input" id="edit-cccd-${timestamp}" value="${record.userId}" style="text-align: center; width: 120px;" />`;
    row.cells[2].innerHTML = `<input class="td-inline-input" id="edit-name-${timestamp}" value="${toTitleCase(record.userName || record.details?.userName || '').replace(/"/g, '&quot;')}" style="text-align: center;" />`;
    row.cells[3].innerHTML = `<input class="td-inline-input" id="edit-company-${timestamp}" value="${(record.company || record.details?.company || '').toUpperCase().replace(/"/g, '&quot;')}" style="text-transform: uppercase; text-align: center;" />`;

    // Hiển thị nút Lưu / Hủy
    document.getElementById(`actions-${timestamp}`).innerHTML = `
        <button class="btn-save-inline" onclick="saveEdit(${timestamp})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Lưu</button>
        <button class="btn-cancel-inline" onclick="cancelEdit()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Hủy</button>`;
}

async function saveEdit(timestamp) {
    const cccdEl = document.getElementById(`edit-cccd-${timestamp}`);
    const nameEl = document.getElementById(`edit-name-${timestamp}`);
    const companyEl = document.getElementById(`edit-company-${timestamp}`);
    
    if (!cccdEl || !nameEl || !companyEl) return;
    
    const newUserId = cccdEl.value.trim();
    const newName = toTitleCase(nameEl.value.trim());
    const newCompany = companyEl.value.trim().toUpperCase();

    if (!newUserId) { showToast('CCCD không được để trống', 'error'); return; }

    try {
        const res = await fetch(`/api/history/${timestamp}`, {
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ userId: newUserId, userName: newName, company: newCompany })
        });
        if (!res.ok) throw new Error('Server error');
        
        const rec = allData.find(r => r.timestamp === timestamp);
        if (rec) { 
            rec.userId = newUserId;
            rec.userName = newName; 
            rec.company = newCompany; 
            if (rec.details) { 
                rec.details.userId = newUserId;
                rec.details.userName = newName; 
                rec.details.company = newCompany; 
            } 
        }
        applyFilters(); 
        showToast('Đã lưu thành công', 'success');
    } catch (e) { showToast('Lỗi lưu thay đổi', 'error'); }
}

function cancelEdit() { applyFilters(); }

function exportExcel() {
    if (!window.XLSX) { showToast('Thư viện Excel chưa tải', 'error'); return; }
    const rows = [['STT', 'CCCD / Hộ chiếu', 'Họ và Tên', 'Công ty', 'Bắt đầu', 'Kết thúc', 'Bài thi (VN)', 'Bài thi (EN)', 'Câu đúng', 'Tổng câu', 'Điểm %', 'Kết quả']];
    filtered.forEach((r, i) => {
        const vi = r.examName || '', en = r.examNameEn || '';
        rows.push([i + 1, r.userId, toTitleCase(r.userName || r.details?.userName || ''), (r.company || r.details?.company || '').toUpperCase(), r.startTime ? fmtTime(r.startTime) : '', fmtTime(r.timestamp), vi, en, r.correctCount, r.totalCount, r.score, r.isPass ? 'ĐẠT' : 'KHÔNG ĐẠT']);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [4,14,18,18,16,16,28,24,8,8,8,12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Kết quả thi');
    XLSX.writeFile(wb, `KetQuaThi_${new Date().getTime()}.xlsx`);
    showToast(`Đã xuất ${filtered.length} bản ghi`, 'success');
}

function toggleConfigSection(el) {
    el.classList.toggle('collapsed');
    const body = el.nextElementSibling;
    if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('cfg-cur-url'); if (el) el.textContent = window.location.origin;
});

// ─── TẢI LÊN FOLDER NGÂN HÀNG CÂU HỎI ───
async function uploadQBankFolder() {
    const folderInput = document.getElementById('qbank-folder-input');
    const msgEl = document.getElementById('qbank-upload-msg');
    const pw = getStoredPw();

    if (!folderInput.files.length) { msgEl.textContent = '⚠ Vui lòng chọn thư mục chứa JSON và Hình ảnh'; msgEl.className = 'cfg-msg error'; return; }
    if (!pw) { msgEl.textContent = '⚠ Phiên hết hạn, đăng nhập lại'; msgEl.className = 'cfg-msg error'; return; }

    msgEl.textContent = '⏳ Đang tải thư mục lên hệ thống (Vui lòng đợi vài giây nếu thư mục nặng)...';
    msgEl.className = 'cfg-msg';

    const formData = new FormData();
    for (let i = 0; i < folderInput.files.length; i++) {
        const f = folderInput.files[i];
        formData.append('files', f); 
        formData.append('paths', f.webkitRelativePath);
    }

    try {
        const res = await fetch(`/api/qbanks/upload-folder?adminPassword=${encodeURIComponent(pw)}`, {
            method: 'POST', body: formData
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(err) { throw new Error('Máy chủ phản hồi sai định dạng (File quá nặng hoặc mất kết nối).'); }
        
        if (!res.ok) throw new Error(data.error || 'Lỗi tải thư mục');

        msgEl.textContent = `✅ ${data.message}`;
        msgEl.className = 'cfg-msg success';
        folderInput.value = '';
        loadQBanks();
    } catch(e) {
        msgEl.textContent = `⚠ ${e.message}`;
        msgEl.className = 'cfg-msg error';
    }
}

async function loadQBanks() {
    const pw = getStoredPw();
    const listEl = document.getElementById('qbank-list');
    listEl.innerHTML = '<div class="qbank-empty">Đang tải...</div>';
    try {
        const res = await fetch(`/api/qbanks?adminPassword=${encodeURIComponent(pw)}`);
        const data = await res.json();
        
        if (res.ok && Array.isArray(data)) {
            qbankData = data;
            renderQBankList(qbankData);
            loadFolderDropdowns();
        } else {
            listEl.innerHTML = `<div class="qbank-empty" style="color:#e11d48">Lỗi tải danh sách: ${data.error || 'Dữ liệu không hợp lệ'}</div>`;
        }
    } catch(e) {
        listEl.innerHTML = '<div class="qbank-empty" style="color:#e11d48">Lỗi kết nối máy chủ</div>';
    }
}

function renderQBankList(banks) {
    const listEl = document.getElementById('qbank-list');
    if (!banks.length) {
        listEl.innerHTML = '<div class="qbank-empty">Chưa có thư mục nào trong ngân hàng câu hỏi</div>';
        return;
    }
    listEl.innerHTML = banks.map(b => {
        const fmtDate = new Date(b.uploadTime).toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        return `
        <div class="qbank-item">
            <div class="qbank-item-icon">📁</div>
            <div class="qbank-item-info">
                <div class="qbank-item-name">${b.name}</div>
                <div class="qbank-item-meta">⏳ Cập nhật lúc: ${fmtDate} · ${b.jsonCount} file JSON · ${b.fileCount} file tổng · ${b.sizeMB} MB</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-view-files" onclick="viewFolderContents('${b.name}')">👁️ Xem file</button>
                <button class="btn-delete qbank-delete-btn" onclick="deleteQBank('${b.name}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M9 6V4h6v2"></path></svg>
                    Xóa
                </button>
            </div>
        </div>
    `}).join('');
}

async function viewFolderContents(folderName) {
    const modal = document.getElementById('folder-view-modal');
    const title = document.getElementById('folder-view-title');
    const list = document.getElementById('folder-file-list');
    
    title.innerText = `Chi tiết thư mục: ${folderName}`;
    list.innerHTML = '⏳ Đang tải danh sách file...';
    modal.classList.add('show'); // LỆNH BẬT MODAL

    const pw = getStoredPw();
    try {
        const res = await fetch(`/api/qbanks/${encodeURIComponent(folderName)}/all-files?adminPassword=${encodeURIComponent(pw)}`);
        const files = await res.json();
        if (!res.ok) throw new Error(files.error || 'Lỗi đọc file');
        
        if (files.length === 0) {
            list.innerHTML = 'Thư mục trống.';
        } else {
            list.innerHTML = files.map(f => {
                const isJson = f.toLowerCase().endsWith('.json');
                const icon = isJson ? '📄' : '🖼️';
                return `<div class="file-item-row"><span class="file-icon">${icon}</span><span class="file-name">${f}</span></div>`;
            }).join('');
        }
    } catch(e) {
        list.innerHTML = `<span style="color:#e11d48;">Lỗi: ${e.message}</span>`;
    }
}

async function deleteQBank(folder) {
    const pw = getStoredPw();
    showConfirm(async () => {
        try {
            const res = await fetch(`/api/qbanks/${encodeURIComponent(folder)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: pw })
            });
            if (res.ok) {
                showToast(`Đã xóa thư mục "${folder}"`, 'success');
                loadQBanks();
                loadFolderDropdowns();
            } else {
                const d = await res.json();
                showToast(`Lỗi: ${d.error}`, 'error');
            }
        } catch(e) { showToast('Lỗi kết nối server', 'error'); }
    }, 'Xác nhận xóa thư mục', `Thư mục "${folder}" và toàn bộ file bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`);
}

function loadFolderDropdowns() {
    const dropdowns = ['new-exam-folder', 'edit-exam-folder'];
    dropdowns.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Chọn thư mục —</option>';
        qbankData.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
    });
}

// ─── QUẢN LÝ MENU BÀI THI & AUTO-HEAL ───
async function loadExamMenuEditor() {
    try {
        const res = await fetch('/api/exams-config');
        const data = await res.json();
        if (data && typeof data === 'object' && !data.error) {
            examsConfig = data;
            if (!examsConfig.basic) examsConfig.basic = [];
            if (!examsConfig.advanced) examsConfig.advanced = [];
            renderExamListEditor();
        } else {
            document.getElementById('exam-list-editor').innerHTML = '<div class="qbank-empty" style="color:#e11d48">Cấu hình bài thi bị lỗi định dạng</div>';
        }
    } catch(e) { document.getElementById('exam-list-editor').innerHTML = '<div class="qbank-empty" style="color:#e11d48">Lỗi tải cấu hình bài thi</div>'; }
}

function renderExamListEditor() {
    const el = document.getElementById('exam-list-editor');
    if (!el) return;

    const renderGroup = (group, label) => `
        <div class="exam-editor-group">
            <div class="exam-editor-group-title">${label}</div>
            ${(examsConfig[group] || []).map((exam, idx) => {
                const folderDisplay = exam.folder || ((exam.files && exam.files.length > 0) ? exam.files[0].split('/')[0] : 'Chưa có');
                let timeStr = 'Chưa rõ';
                if (exam.uploadTime) {
                    const d = new Date(exam.uploadTime);
                    timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                }
                return `
                <div class="exam-editor-row ${exam.enabled ? '' : 'exam-disabled'}">
                    <div class="exam-editor-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" ${exam.enabled ? 'checked' : ''} onchange="toggleExamEnabled('${group}', ${idx}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="exam-editor-info">
                        <div class="exam-editor-name">${exam.nameVi}</div>
                        <div class="exam-editor-meta">
                            <span>⏱ ${exam.timeMinutes} phút</span>
                            <span>📝 ${exam.questionCount} câu</span>
                            <span class="exam-editor-files"><span class="qbank-file-tag">📁 Thư mục: ${folderDisplay}</span></span>
                            <span style="color:#059669; font-weight:800;">⏳ Cập nhật lúc: ${timeStr}</span>
                        </div>
                    </div>
                    <div class="exam-editor-actions">
                        <button class="btn-edit" onclick="openExamEditModal('${group}', ${idx})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Sửa
                        </button>
                        <button class="btn-delete" onclick="removeExam('${group}', ${idx})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path></svg>
                            Xóa
                        </button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;

    el.innerHTML = renderGroup('basic', '🔵 Mô-đun Cơ Bản') + renderGroup('advanced', '🟡 Mô-đun Chuyên Sâu');
}

function toggleExamEnabled(group, idx, enabled) {
    if (examsConfig[group] && examsConfig[group][idx]) {
        examsConfig[group][idx].enabled = enabled;
        renderExamListEditor();
    }
}

function removeExam(group, idx) {
    const exam = examsConfig[group][idx];
    showConfirm(() => {
        examsConfig[group].splice(idx, 1);
        renderExamListEditor();
        showToast(`Đã xóa bài thi "${exam.nameVi}" khỏi danh sách`, 'success');
    }, 'Xóa bài thi khỏi menu', `Xóa bài thi "${exam.nameVi}"? Bạn phải nhấn nút "LƯU TẤT CẢ THAY ĐỔI" màu xanh bên trên để xác nhận lưu vào Web.`);
}

function addNewExam() {
    const type = document.getElementById('new-exam-type').value;
    const nameVi = document.getElementById('new-exam-name-vi').value.trim();
    const nameEn = document.getElementById('new-exam-name-en').value.trim();
    const timeMinutes = parseInt(document.getElementById('new-exam-time').value) || 30;
    const questionCount = parseInt(document.getElementById('new-exam-qs').value) || 30;
    const folder = document.getElementById('new-exam-folder').value;
    const msgEl = document.getElementById('add-exam-msg');

    if (!nameVi) { msgEl.textContent = '⚠ Vui lòng nhập tên bài thi tiếng Việt'; msgEl.className = 'cfg-msg error'; return; }
    if (!folder) { msgEl.textContent = '⚠ Vui lòng chọn một thư mục câu hỏi đã tải lên'; msgEl.className = 'cfg-msg error'; return; }

    fetch(`/api/qbanks/${encodeURIComponent(folder)}/all-files?adminPassword=${encodeURIComponent(getStoredPw())}`)
    .then(res => res.json())
    .then(files => {
        if (!Array.isArray(files) || files.length === 0) {
            msgEl.textContent = '⚠ Thư mục này không có file nào!'; msgEl.className = 'cfg-msg error'; return;
        }
        
        const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
        if (jsonFiles.length === 0) {
            msgEl.textContent = '⚠ Thư mục này không có file JSON nào!'; msgEl.className = 'cfg-msg error'; return;
        }

        const id = nameVi.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') + '-' + Date.now();
        const newExam = {
            id, nameVi, nameEn, timeMinutes, questionCount, folder,
            files: jsonFiles.map(f => `${folder}/${f}`),
            uploadTime: Date.now(),
            enabled: true
        };

        examsConfig[type] = examsConfig[type] || [];
        examsConfig[type].push(newExam);
        renderExamListEditor();

        document.getElementById('new-exam-name-vi').value = '';
        document.getElementById('new-exam-name-en').value = '';
        document.getElementById('new-exam-time').value = '30';
        document.getElementById('new-exam-qs').value = '30';
        document.getElementById('new-exam-folder').value = '';

        msgEl.textContent = `✅ Đã thêm bài thi "${nameVi}" thành công! (Nhấn LƯU TẤT CẢ THAY ĐỔI để áp dụng)`;
        msgEl.className = 'cfg-msg success';
    })
    .catch(err => {
        msgEl.textContent = '⚠ Lỗi kết nối tới thư mục.'; msgEl.className = 'cfg-msg error';
    });
}

function saveExamEdit() {
    const group = document.getElementById('edit-exam-group').value;
    const idx = parseInt(document.getElementById('edit-exam-id').value);
    const nameVi = document.getElementById('edit-exam-name-vi').value.trim();
    const nameEn = document.getElementById('edit-exam-name-en').value.trim();
    const timeMinutes = parseInt(document.getElementById('edit-exam-time').value) || 30;
    const questionCount = parseInt(document.getElementById('edit-exam-qs').value) || 30;
    const folder = document.getElementById('edit-exam-folder').value;

    if (!nameVi) { showToast('Vui lòng nhập tên tiếng Việt', 'error'); return; }
    if (!folder) { showToast('Vui lòng chọn thư mục câu hỏi', 'error'); return; }

    fetch(`/api/qbanks/${encodeURIComponent(folder)}/all-files?adminPassword=${encodeURIComponent(getStoredPw())}`)
    .then(res => res.json())
    .then(files => {
        if (!Array.isArray(files) || files.length === 0) {
            showToast('Thư mục này không có file nào!', 'error'); return;
        }
        
        const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
        if (jsonFiles.length === 0) {
            showToast('Thư mục không có file JSON!', 'error'); return;
        }

        let examObj = examsConfig[group][idx];
        examObj.nameVi = nameVi;
        examObj.nameEn = nameEn;
        examObj.timeMinutes = timeMinutes;
        examObj.questionCount = questionCount;
        examObj.folder = folder;
        examObj.files = jsonFiles.map(f => `${folder}/${f}`); 
        examObj.uploadTime = Date.now();

        closeExamEditModal();
        renderExamListEditor();
        showToast('✅ Đang lưu thay đổi...', 'success');
        saveExamsConfig();
    })
    .catch(err => { showToast('Lỗi kết nối tới thư mục.', 'error'); });
}

async function saveExamsConfig() {
    const pw = getStoredPw();
    const msgEl = document.getElementById('exam-config-msg');
    if (!pw) { msgEl.textContent = '⚠ Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'; msgEl.className = 'cfg-msg error'; return; }
    
    msgEl.textContent = '⏳ Đang đồng bộ thư mục và lưu dữ liệu...';
    msgEl.className = 'cfg-msg';

    try {
        for (let type of ['basic', 'advanced']) {
            if (!examsConfig[type]) continue;
            for (let exam of examsConfig[type]) {
                if ((!exam.files || exam.files.length === 0) && exam.folder) {
                    try {
                        const res = await fetch(`/api/qbanks/${encodeURIComponent(exam.folder)}/all-files?adminPassword=${encodeURIComponent(pw)}`);
                        const files = await res.json();
                        if (Array.isArray(files)) {
                            const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
                            exam.files = jsonFiles.map(f => `${exam.folder}/${f}`);
                        }
                    } catch(e) { console.error('Lỗi auto-heal', e); }
                }
            }
        }

        const res = await fetch('/api/exams-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pw, config: examsConfig })
        });
        const data = await res.json();
        if (res.ok) {
            msgEl.textContent = '✅ Đã lưu cấu hình bài thi! Web Trang Chủ sẽ tự cập nhật ngay lập tức.';
            msgEl.className = 'cfg-msg success';
            showToast('Đã lưu dữ liệu Menu bài thi lên Website', 'success');
            renderExamListEditor(); 
        } else { msgEl.textContent = `⚠ ${data.error}`; msgEl.className = 'cfg-msg error'; }
    } catch(e) { msgEl.textContent = '⚠ Lỗi kết nối server'; msgEl.className = 'cfg-msg error'; }
}