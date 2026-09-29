window.startLiveTimerTick = function() {
    if (window.liveTimerInterval) return;
    window.liveTimerInterval = setInterval(() => {
        if (!window.liveSessionData || !window.liveSessionData.length) return;
        const now = Date.now();
        document.querySelectorAll('.live-timer[data-start]').forEach(el => {
            const elapsed = Math.floor((now - parseInt(el.dataset.start, 10)) / 1000);
            const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
            el.querySelector('.live-timer-text').textContent = h > 0 ? `${h}g ${m}p ${String(s).padStart(2,'0')}s` : m > 0 ? `${m} phút ${String(s).padStart(2,'0')} giây` : `${s} giây`;
        });
    }, 1000);
}

window.pollLiveExams = async function() {
    try {
        const res = await fetch('/api/active-exams');
        const activeExams = await res.json();
        const count = activeExams.length || 0;
        const formattedCount = count < 10 ? '0' + count : count; 
        
        window.liveSessionData = activeExams;
        
        if (document.getElementById('tab-live') && document.getElementById('tab-live').classList.contains('active')) {
            window.renderLiveExams(activeExams);
        }

        const badge = document.getElementById('admin-online-badge');

        if (badge) {
            let textSpan = badge.querySelector('.admin-badge-text');
            if (!textSpan) {
                badge.innerHTML = '<span class="admin-badge-text" style="display:flex; align-items:center; gap:8px;"></span>';
                textSpan = badge.querySelector('.admin-badge-text');
            }

            let tooltip = document.getElementById('admin-live-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'admin-live-tooltip';
                tooltip.style.cssText = 'position:absolute; top:calc(100% + 15px); right:0; background:#fff; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 15px 40px rgba(0,0,0,0.15); min-width:340px; z-index:99999; padding:12px; opacity:0; visibility:hidden; transition:all 0.2s ease; pointer-events:none; text-align:left; color:#0f172a;';
                
                badge.style.position = 'relative';
                badge.appendChild(tooltip);

                badge.addEventListener('mouseenter', () => { 
                    tooltip.style.opacity = '1'; 
                    tooltip.style.visibility = 'visible'; 
                    tooltip.style.top = 'calc(100% + 8px)'; 
                });
                badge.addEventListener('mouseleave', () => { 
                    tooltip.style.opacity = '0'; 
                    tooltip.style.visibility = 'hidden'; 
                    tooltip.style.top = 'calc(100% + 15px)'; 
                });
            }

            if (count === 0) {
                textSpan.innerHTML = `<span style="color:#64748b; font-weight:600;">⚪ Hiện không có ai đang thi</span>`;
                badge.style.background = 'transparent';
                badge.style.borderColor = 'transparent';
                badge.style.cursor = 'default';
                badge.style.boxShadow = 'none';
                tooltip.style.display = 'none';
            } else {
                textSpan.innerHTML = `● <span id="admin-online-count">${formattedCount}</span> người đang thi trực tiếp`;
                badge.style.background = '#ffffff';
                badge.style.borderColor = '#a7f3d0';
                badge.style.cursor = 'pointer';
                badge.style.boxShadow = '0 4px 15px rgba(5,150,105,0.08)';
                tooltip.style.display = 'block';

                const now = Date.now();
                tooltip.innerHTML = activeExams.map((s, i) => {
                    const elapsed = Math.floor((now - (s.startTime || now)) / 1000);
                    const m = Math.floor(elapsed / 60); const sec = elapsed % 60;
                    const timeStr = m > 0 ? `${m}p ${sec}s` : `${sec}s`;
                    const deviceIcon = s.deviceType === 'Điện thoại' ? '📱' : (s.deviceType === 'Máy tính bảng' ? '📟' : '🖥️');
                    
                    return `<div style="display:flex; gap:12px; padding:10px; border-bottom:1px solid #f1f5f9; align-items:flex-start;"><div style="width:24px; height:24px; border-radius:50%; background:#4f46e5; color:#fff; font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">${i + 1}</div><div style="flex:1; min-width:0;"><div style="font-size:0.85rem; font-weight:800; color:#0f172a; line-height:1.2;">${s.userId || '—'} <span style="font-weight:600; color:#475569; margin-left:4px;">${s.userName || ''}</span></div><div style="font-size:0.75rem; color:#64748b; font-weight:600; margin-top:4px;">🏢 ${(s.company || '').toUpperCase()}</div><div style="font-size:0.75rem; color:#4f46e5; font-weight:700; margin-top:4px;">${deviceIcon} ${s.deviceName || 'Unknown'} | IP: ${s.ip || 'N/A'}</div><div style="font-size:0.8rem; color:#059669; font-weight:700; margin-top:4px;">${s.examName || 'Bài thi chung'}</div><div style="font-size:0.75rem; color:#94a3b8; font-weight:600; margin-top:4px;">⏱ Đang làm: ${timeStr}</div></div></div>`;
                }).join('').replace(/border-bottom:1px solid #f1f5f9;(?=[^<]*$)/, '');
            }
        }
    } catch (_) {}
}

setInterval(window.pollLiveExams, 3000);
window.pollLiveExams();

window.renderLiveExams = function(active) {
    const list = document.getElementById('live-list'), badge = document.getElementById('admin-online-badge'), now = Date.now();
    if (!list) return;
    if (!active || active.length === 0) {
        list.innerHTML = `<div style="background:#f8fafc; border:2px dashed #cbd5e1; border-radius:24px; padding:60px; text-align:center; color:#94a3b8; font-size:1.1rem; font-weight:700;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:10px;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><br>Hiện không có thí sinh nào đang thi</div>`;
        return;
    }

    list.innerHTML = active.map((s, idx) => {
        const startTs = s.startTime || now, lastSeen = s.lastSeen || now;
        const elapsed = Math.floor((now - startTs) / 1000);
        const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), sec = elapsed % 60;
        const elapsedStr = h > 0 ? `${h}g ${m}p ${String(sec).padStart(2,'0')}s` : m > 0 ? `${m} phút ${String(sec).padStart(2,'0')} giây` : `${sec} giây`;
        const d = new Date(startTs), startStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        const lastSeenAgo = Math.floor((now - lastSeen) / 1000), pingStr = lastSeenAgo < 5 ? 'Vừa xong' : lastSeenAgo < 60 ? `${lastSeenAgo}s trước` : `${Math.floor(lastSeenAgo/60)}p trước`;
        
        const deviceIcon = s.deviceType === 'Điện thoại' ? '📱' : (s.deviceType === 'Máy tính bảng' ? '📟' : '🖥️');

        return `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:24px; padding:25px; box-shadow:0 10px 30px rgba(0,0,0,0.03); display:flex; gap:25px; align-items:center; flex-wrap:wrap; transition:0.3s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 15px 40px rgba(0,0,0,0.06)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.03)';">
            <div style="width:55px; height:55px; background:linear-gradient(135deg, #4f46e5, #3730a3); color:#fff; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:900; flex-shrink:0; box-shadow:0 10px 20px rgba(79,70,229,0.3); font-family: 'Plus Jakarta Sans', sans-serif;">${idx + 1}</div>
            
            <div style="flex:2; min-width:250px;">
                <div style="font-size:1.25rem; font-weight:900; color:#0f172a; margin-bottom:6px; font-family: 'Plus Jakarta Sans', sans-serif;">${s.userId || '—'} <span style="color:#475569; font-weight:700; margin-left:6px;">${window.toTitleCase(s.userName || '')}</span></div>
                <div style="font-size:0.9rem; color:#64748b; font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                    <span style="background:#f1f5f9; padding:4px 10px; border-radius:8px; border:1px solid #e2e8f0;">🏢 ${(s.company || '').toUpperCase()}</span>
                    <span style="background:#ecfdf5; color:#059669; padding:4px 10px; border-radius:8px; border:1px solid #a7f3d0;">${s.examName || 'Bài thi chung'}</span>
                </div>
                <div style="font-size:0.85rem; color:#4f46e5; font-weight:700; background:#eef2ff; padding:6px 12px; border-radius:8px; border:1px solid #c7d2fe; display:inline-block;">
                    ${deviceIcon} ${s.deviceType} (${s.deviceName || 'Unknown'}) <span style="margin:0 6px; color:#a5b4fc;">|</span> IP: ${s.ip || 'N/A'}
                </div>
            </div>

            <div style="flex:1; min-width:200px; display:flex; flex-direction:column; gap:10px; border-left:2px dashed #e2e8f0; padding-left:25px;">
                <div style="font-size:0.9rem; color:#64748b; font-weight:600;"><span style="display:inline-block; width:80px;">Bắt đầu lúc:</span> <strong style="color:#0f172a;">${startStr}</strong></div>
                <div style="font-size:0.9rem; color:#64748b; font-weight:600;"><span style="display:inline-block; width:80px;">Thời gian thi:</span> <strong style="color:#059669; font-size:1.1rem; background:#dcfce7; padding:2px 8px; border-radius:6px;" class="live-timer" data-start="${startTs}"><span class="live-timer-text">${elapsedStr}</span></strong></div>
                <div style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:800; color:#10b981; margin-top:4px;"><span style="width:8px;height:8px;background:#10b981;border-radius:50%;box-shadow:0 0 8px #10b981; animation: pulse-green 1.5s infinite;"></span> Đang kết nối (Ping: ${pingStr})</div>
            </div>

            <div style="flex-shrink:0;">
                <button onclick="window.forceSubmitCandidate('${s.sessionId}', '${window.toTitleCase(s.userName || 'Thí sinh')}')" style="background:#fff1f2; color:#e11d48; border:1px solid #fecdd3; padding:16px 24px; border-radius:16px; font-weight:900; font-size:1rem; cursor:pointer; display:flex; align-items:center; gap:8px; transition:0.3s; font-family: 'Plus Jakarta Sans', sans-serif;" onmouseover="this.style.background='#ffe4e6'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 20px rgba(225,29,72,0.2)';" onmouseout="this.style.background='#fff1f2'; this.style.transform='none'; this.style.boxShadow='none';">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    Hủy & Thu bài
                </button>
            </div>
        </div>`;
    }).join('');
    window.startLiveTimerTick();
}

window.forceSubmitCandidate = function(sessionId, name) {
    window.showModernModal({
        title: "Đình chỉ bài thi",
        msg: `Bạn đang muốn đình chỉ và thu bài thi của thí sinh <b>${name}</b> ngay lập tức.<br><br><input type='text' id='force-reason' placeholder='Nhập lý do đình chỉ (để trống hệ thống sẽ dùng lý do mặc định)...' style='width:100%; margin-top:15px; padding:16px 20px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; outline:none; font-family:"Inter", sans-serif;' onfocus="this.style.borderColor='#e11d48'" onblur="this.style.borderColor='#e2e8f0'">`,
        type: "danger",
        isConfirm: true,
        onOk: async () => {
            const reason = document.getElementById('force-reason').value.trim();
            const pw = window.getStoredPw();
            try {
                const res = await fetch('/api/admin/force-submit', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({adminPassword: pw, sessionId: sessionId, reason: reason})
                });
                if (res.ok) {
                    window.showToast("Đã gửi lệnh thu bài thành công!", "success");
                    window.pollLiveExams();
                } else {
                    window.showAlert("Lỗi", "Phiên thi không còn tồn tại.", "error");
                }
            } catch(e) {
                window.showAlert("Lỗi mạng", "Không kết nối được tới máy chủ.", "error");
            }
        }
    });
}

window.loadData = async function() {
    try {
        const res = await fetch('/api/history');
        let data = await res.json();
        
        const nameDictionary = {
            "Duong Ngoc Thinh": "Dương Ngọc Thịnh",
            "Nguyen Le Hoang Dat": "Nguyễn Lê Hoàng Đạt",
            "Nguyen Thanh Linh": "Nguyễn Thành Linh",
            "Nguyen Van Dao": "Nguyễn Văn Đảo",
            "Bui Thuan": "Bùi Thuận"
        };

        const spamCompanies = ['A', 'SAO', 'BBBB', 'ƯE', 'P', 'SA', 'SD', 'SDSD', 'PM', 'S', 'Ê', 'SDD', 'DA'];

        let dbNeedsUpdate = false;
        if (Array.isArray(data)) {
            let originalLen = data.length;

            data = data.filter(r => {
                let n = (r.userName || r.name || '').trim().toLowerCase();
                let c = (r.company || r.details?.company || '').trim().toUpperCase();

                if (n === 'thí sinh ẩn danh' || n === '' || n === 'null' || n === 'undefined') return false;
                if (spamCompanies.includes(c)) return false; 

                return true;
            });

            if (data.length !== originalLen) dbNeedsUpdate = true;

            data.forEach(r => {
                let comp = (r.company || r.details?.company || '').toUpperCase().trim();
                if (comp === 'P M S') { r.company = 'PMS'; if (r.details) r.details.company = 'PMS'; dbNeedsUpdate = true; }
                if (comp === 'P V M R') { r.company = 'PVMR'; if (r.details) r.details.company = 'PVMR'; dbNeedsUpdate = true; }

                let currentName = (r.userName || r.name || '').trim();
                for (let [noAccent, withAccent] of Object.entries(nameDictionary)) {
                    if (currentName.toLowerCase() === noAccent.toLowerCase()) {
                        if (r.userName !== withAccent || r.name !== withAccent) {
                            if (r.userName) r.userName = withAccent;
                            if (r.name) r.name = withAccent;
                            if (r.details && r.details.userName) r.details.userName = withAccent;
                            dbNeedsUpdate = true;
                        }
                        break;
                    }
                }
            });
            
            if (dbNeedsUpdate) {
                const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const formData = new FormData();
                formData.append('dbfile', blob, 'database.json');
                fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData }).catch(e=>console.log("Auto-fix DB error:", e));
            }
            window.allData = data;
        } else {
            window.allData = [];
        }
    } catch (e) {
        window.allData = [];
    } finally {
        if (typeof window.buildExamFilter === 'function') window.buildExamFilter();
        if (typeof window.applyFilters === 'function') window.applyFilters();
        window.renderStats(window.allData);
    }
}

window.renderStats = function(data) {
    const statsGrid = document.querySelector('.stats-grid');
    const grid = document.getElementById('exam-stats-grid');
    const contractorList = document.getElementById('contractor-stats-list');
    const hardQList = document.getElementById('hard-questions-list');
    
    if (!data || data.length === 0) {
        if(statsGrid) statsGrid.innerHTML = '<div style="grid-column: 1/-1; padding:30px; text-align:center; color:#64748b; font-weight:bold;">Chưa có dữ liệu thống kê.</div>';
        if(grid) grid.innerHTML = '<span style="color:#64748b; font-size:0.95rem; font-weight:600;">Chưa có dữ liệu.</span>';
        if(contractorList) contractorList.innerHTML = '<span style="color:#64748b; font-size:0.95rem; font-weight:600;">Chưa có dữ liệu.</span>';
        if(hardQList) hardQList.innerHTML = '<span style="color:#64748b; font-size:0.95rem; font-weight:600;">Chưa có dữ liệu.</span>';
        return;
    }

    const totalAttempts = data.length;
    const uniqueUsersMap = new Map();
    const examMap = {}; 
    const companyMap = {}; 
    const qMap = {};

    const EXAM_DISPLAY_ORDER = [
        'AN TOÀN BAN ĐẦU',
        'AN TOÀN GIAO THÔNG',
        'ĐÁNH GIÁ KIẾN THỨC ATSKMT',
        'AN TOÀN TRÊN CAO',
        'AN TOÀN HÀN CẮT',
        'AN TOÀN KHÔNG GIAN HẠN CHẾ',
        'AN TOÀN TRÊN CAO + AN TOÀN HÀN CẮT',
        'AN TOÀN TRÊN CAO + AN TOÀN KHÔNG GIAN HẠN CHẾ',
        'AN TOÀN HÀN CẮT + AN TOÀN KHÔNG GIAN HẠN CHẾ',
        'AN TOÀN TRÊN CAO + AN TOÀN HÀN CẮT + AN TOÀN KHÔNG GIAN HẠN CHẾ'
    ];

    EXAM_DISPLAY_ORDER.forEach(name => {
        examMap[name] = { totalAttempts: 0, uniqueUsers: new Set(), uniquePassed: new Set() };
    });

    data.forEach(r => {
        let examNameVi = (r.examName || '').toLowerCase();
        let tCount = r.totalQuestions || r.totalCount || ((examNameVi.includes('đánh giá kiến thức') || examNameVi.includes('chuyên sâu')) ? 50 : 30);
        let cCount = r.correctCount;
        if (cCount === undefined && r.score !== undefined) cCount = Math.round((r.score / 100) * tCount);
        
        let isPassInd = (cCount !== undefined && tCount) ? ((tCount - cCount) <= 2) : (r.isPass || r.result === 'pass' || r.status === 'Đạt' || r.score >= 80);
        
        let userId = (r.userId || r.cccd || 'UNKNOWN').trim();

        if (!uniqueUsersMap.has(userId)) {
            uniqueUsersMap.set(userId, { passed: false });
        }
        if (isPassInd) {
            uniqueUsersMap.get(userId).passed = true;
        }

        let rawName = (r.examName || '').toUpperCase();
        let finalCategory = null;

        let hasCoBan1 = rawName.includes('BAN ĐẦU');
        let hasCoBan2 = rawName.includes('GIAO THÔNG');
        let hasCoBan3 = rawName.includes('ATSKMT') || rawName.includes('KIẾN THỨC');

        let hasTrenCao = rawName.includes('TRÊN CAO');
        let hasHanCat = rawName.includes('HÀN CẮT');
        let hasKhongGian = rawName.includes('KHÔNG GIAN');

        if (hasCoBan1) finalCategory = 'AN TOÀN BAN ĐẦU';
        else if (hasCoBan2) finalCategory = 'AN TOÀN GIAO THÔNG';
        else if (hasCoBan3) finalCategory = 'ĐÁNH GIÁ KIẾN THỨC ATSKMT';
        else {
            if (hasTrenCao && hasHanCat && hasKhongGian) {
                finalCategory = 'AN TOÀN TRÊN CAO + AN TOÀN HÀN CẮT + AN TOÀN KHÔNG GIAN HẠN CHẾ';
            } else if (hasTrenCao && hasHanCat) {
                finalCategory = 'AN TOÀN TRÊN CAO + AN TOÀN HÀN CẮT';
            } else if (hasTrenCao && hasKhongGian) {
                finalCategory = 'AN TOÀN TRÊN CAO + AN TOÀN KHÔNG GIAN HẠN CHẾ';
            } else if (hasHanCat && hasKhongGian) {
                finalCategory = 'AN TOÀN HÀN CẮT + AN TOÀN KHÔNG GIAN HẠN CHẾ';
            } else if (hasTrenCao) {
                finalCategory = 'AN TOÀN TRÊN CAO';
            } else if (hasHanCat) {
                finalCategory = 'AN TOÀN HÀN CẮT';
            } else if (hasKhongGian) {
                finalCategory = 'AN TOÀN KHÔNG GIAN HẠN CHẾ';
            }
        }

        if (finalCategory) {
            examMap[finalCategory].totalAttempts++;
            examMap[finalCategory].uniqueUsers.add(userId);
            if (isPassInd) examMap[finalCategory].uniquePassed.add(userId);
        }

        let compKey = (r.company || r.details?.company || 'CÁ NHÂN / KHÁC').trim().toUpperCase();
        if (compKey === 'P M S') compKey = 'PMS'; 
        if (compKey === 'P V M R') compKey = 'PVMR'; 
        if (compKey === '' || compKey === 'N/A' || compKey === 'CÁ NHÂN' || compKey === 'KHÁC') compKey = 'CÁ NHÂN / KHÁC';

        if (!companyMap[compKey]) {
            companyMap[compKey] = { totalAttempts: 0, uniqueUsers: new Set(), uniquePassed: new Set() };
        }
        companyMap[compKey].totalAttempts++;
        companyMap[compKey].uniqueUsers.add(userId);
        if (isPassInd) companyMap[compKey].uniquePassed.add(userId);

        if (r.questions && r.userAnswers) {
            r.questions.forEach((q, idx) => {
                const qText = (q.contentVi || q.question_vn || q.questionVi || q.question || 'Câu hỏi không xác định').trim();
                const userAns = Array.isArray(r.userAnswers) ? r.userAnswers[idx] : r.userAnswers[String(idx+1)];
                let isCorrect = false;
                if (typeof userAns === 'number' && userAns === q.correct) isCorrect = true;
                else if (typeof userAns === 'string' && String(userAns).toUpperCase().charCodeAt(0) - 65 === q.correct) isCorrect = true;
                else if (q.options && typeof userAns === 'string') {
                   const correctOpt = q.options.find(o => String(o.is_correct).toLowerCase() === 'true');
                   if (correctOpt && correctOpt.label === userAns) isCorrect = true;
                }
                if (!qMap[qText]) qMap[qText] = { total: 0, wrong: 0, text: qText };
                qMap[qText].total++;
                if (!isCorrect && userAns !== null && userAns !== undefined) qMap[qText].wrong++;
            });
        }
    });

    const totalUniqueUsers = uniqueUsersMap.size;
    let passedUniqueUsers = 0;
    uniqueUsersMap.forEach(stat => { if (stat.passed) passedUniqueUsers++; });

    const passRate = totalUniqueUsers > 0 ? Math.round((passedUniqueUsers / totalUniqueUsers) * 100) : 0;
    const passRateColor = passRate >= 70 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#f43f5e';

    if(statsGrid) {
        statsGrid.style.display = 'block'; 
        statsGrid.innerHTML = `
            <div style="background: #ffffff; border-radius: 32px; padding: 40px; box-shadow: 0 15px 35px -10px rgba(15,23,42,0.05); border: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 40px; margin-bottom: 40px;">
                
                <div style="position: relative; width: 200px; height: 200px; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                    <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg); filter: drop-shadow(0 8px 16px ${passRateColor}40);">
                        <path stroke="#f1f5f9" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path stroke="${passRateColor}" stroke-dasharray="${passRate}, 100" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="transition: stroke-dasharray 1.5s ease-out;" />
                    </svg>
                    <div style="position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 3rem; font-weight: 900; color: ${passRateColor}; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif;">${passRate}%</span>
                        <span style="font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Tỷ lệ đạt</span>
                    </div>
                </div>

                <div style="display: flex; gap: 40px; flex-wrap: wrap; flex: 1; min-width: 300px; justify-content: center;">
                    <div style="display: flex; flex-direction: column; gap: 25px; flex: 1; min-width: 200px;">
                        <div style="display: flex; align-items: center; gap: 15px; padding: 20px; background: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0;">
                            <div style="width: 56px; height: 56px; border-radius: 18px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(59,130,246,0.15);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
                            <div>
                                <div style="font-size: 2rem; font-weight: 900; color: #0f172a; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif;">${totalAttempts.toLocaleString()}</div>
                                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tổng Lượt Thi</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px; padding: 20px; background: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0;">
                            <div style="width: 56px; height: 56px; border-radius: 18px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(234,88,12,0.15);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                            <div>
                                <div style="font-size: 2rem; font-weight: 900; color: #0f172a; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif;">${totalUniqueUsers.toLocaleString()}</div>
                                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tổng Thí Sinh</div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 25px; flex: 1; min-width: 200px;">
                        <div style="display: flex; align-items: center; gap: 15px; padding: 20px; background: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0;">
                            <div style="width: 56px; height: 56px; border-radius: 18px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16,185,129,0.15);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
                            <div>
                                <div style="font-size: 2rem; font-weight: 900; color: #0f172a; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif;">${passedUniqueUsers.toLocaleString()}</div>
                                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Thí Sinh Đạt</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px; padding: 20px; background: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0;">
                            <div style="width: 56px; height: 56px; border-radius: 18px; background: #fff1f2; color: #e11d48; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(225,29,72,0.15);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>
                            <div>
                                <div style="font-size: 2rem; font-weight: 900; color: #0f172a; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif;">${(totalUniqueUsers - passedUniqueUsers).toLocaleString()}</div>
                                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Thí Sinh Rớt</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if(grid) {
        grid.innerHTML = EXAM_DISPLAY_ORDER.map(name => {
            const s = examMap[name];
            const totalPeople = s.uniqueUsers.size;
            const passedPeople = s.uniquePassed.size;
            const rate = totalPeople > 0 ? Math.round((passedPeople / totalPeople) * 100) : 0;
            
            const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : (totalPeople === 0 ? '#94a3b8' : '#f43f5e');
            const bg = rate >= 80 ? '#ecfdf5' : rate >= 50 ? '#fffbeb' : (totalPeople === 0 ? '#f8fafc' : '#fff1f2');
            const border = rate >= 80 ? '#a7f3d0' : rate >= 50 ? '#fde68a' : (totalPeople === 0 ? '#e2e8f0' : '#fecdd3');

            // Format Title Case for display
            const displayTitle = name.toLowerCase().replace(/(?:^|[\s+]+)\S/g, match => match.toUpperCase());

            return `
                <div class="exam-stat-item" style="display: flex; align-items: center; gap: 15px; padding: 15px 20px; margin-bottom: 12px; background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: 0.3s;">
                    <div style="position: relative; width: 55px; height: 55px; flex-shrink: 0;">
                        <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
                            <path stroke="#f1f5f9" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path stroke="${color}" stroke-dasharray="${rate}, 100" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="transition: stroke-dasharray 1.5s ease-out;" />
                        </svg>
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 900; color: ${color};">${rate}%</div>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="exam-name" style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; line-height:1.4; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${displayTitle}">${displayTitle}</div>
                        <div style="display: flex; gap: 10px; flex-wrap: nowrap; font-size: 0.8rem; overflow: hidden;">
                            <span style="background: ${bg}; color: ${color}; border: 1px solid ${border}; padding: 4px 10px; border-radius: 8px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">Đạt: ${passedPeople}/${totalPeople} người</span>
                            <span style="background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 8px; font-weight: 600; white-space: nowrap; flex-shrink: 0;">Tổng: ${s.totalAttempts} lượt</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    if(contractorList) {
        const sortedComps = Object.entries(companyMap).sort((a, b) => {
            const isOtherA = a[0] === 'CÁ NHÂN / KHÁC'; 
            const isOtherB = b[0] === 'CÁ NHÂN / KHÁC';
            if (isOtherA && !isOtherB) return 1; 
            if (!isOtherA && isOtherB) return -1;
            
            const passA = a[1].uniquePassed.size;
            const passB = b[1].uniquePassed.size;
            if (passB !== passA) return passB - passA;
            
            return b[1].uniqueUsers.size - a[1].uniqueUsers.size; 
        }); 

        contractorList.innerHTML = sortedComps.map(([name, s], idx) => {
            const totalPeople = s.uniqueUsers.size;
            const passedPeople = s.uniquePassed.size;
            const totalAttempts = s.totalAttempts;

            const rate = totalPeople > 0 ? Math.round((passedPeople / totalPeople) * 100) : 0;
            const rateColor = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#f43f5e';
            
            let rankStyle = '';
            let watermark = '';
            if (idx === 0) {
                rankStyle = 'background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #fff; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);';
                watermark = '<svg style="position:absolute; right:-10px; top:-10px; width:80px; height:80px; color:#f59e0b; opacity:0.1; z-index:0;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.25l-4.5 2.75 1.2-5.1-4-3.5 5.2-.45L12 4l2.1 4.95 5.2.45-4 3.5 1.2 5.1z"/></svg>';
            } else if (idx === 1) {
                rankStyle = 'background: linear-gradient(135deg, #64748b, #94a3b8); color: #fff; box-shadow: 0 4px 10px rgba(100, 116, 139, 0.3);';
            } else if (idx === 2) {
                rankStyle = 'background: linear-gradient(135deg, #b45309, #d97706); color: #fff; box-shadow: 0 4px 10px rgba(180, 83, 9, 0.3);';
            } else {
                rankStyle = 'background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;';
            }
            
            return `
                <div style="flex-shrink: 0; position: relative; padding: 18px 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: 0.3s; overflow: hidden; display: flex; flex-direction: column; gap: 14px;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.05)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.02)';">

                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0;">
                            <div style="width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.15rem; flex-shrink: 0; font-family: 'Plus Jakarta Sans', sans-serif; ${rankStyle}">
                                ${idx + 1}
                            </div>
                            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0; text-align: left;">
                                <div style="font-weight: 900; font-size: 1.05rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Plus Jakarta Sans', sans-serif;" title="${name}">${name}</div>
                                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; margin-top: 5px; display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                                    <span style="background: #f8fafc; padding: 3px 8px; border-radius: 6px; color: #475569; border: 1px solid #e2e8f0; flex-shrink: 0; white-space: nowrap;">Đạt: <strong style="color:#0f172a;">${passedPeople}/${totalPeople}</strong> người</span>
                                    <span style="color: #cbd5e1; flex-shrink: 0;">|</span>
                                    <span style="flex-shrink: 0; white-space: nowrap;">${totalAttempts} lượt thi</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end;">
                            <div style="color: ${rateColor}; font-weight: 900; font-size: 1.6rem; font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1;">${rate}%</div>
                        </div>
                    </div>
                    <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 100px; overflow: hidden; z-index: 1;">
                        <div style="height: 100%; width: ${rate}%; background: ${rateColor}; border-radius: 100px; transition: width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                    </div>
                    ${watermark}
                </div>
            `;
        }).join('');
    }

    if(hardQList) {
        const sortedQs = Object.values(qMap)
            .filter(q => q.total >= 3) 
            .map(q => ({ ...q, failRate: Math.round((q.wrong / q.total) * 100) }))
            .sort((a, b) => b.wrong - a.wrong) 
            .slice(0, 10); 

        if (sortedQs.length === 0) {
            hardQList.innerHTML = '<span style="color:#64748b; font-size:0.95rem; font-weight:600;">Chưa đủ dữ liệu để phân tích.</span>';
        } else {
            hardQList.innerHTML = sortedQs.map(q => `
                <div class="hard-q-card">
                    <div class="hard-q-text" title="${q.text}">${q.text}</div>
                    <div class="q-stats-row">
                        <div class="q-fail-count">Sai <strong>${q.wrong}</strong> / ${q.total} lần</div>
                        <div class="q-fail-badge">${q.failRate}% Sai</div>
                    </div>
                </div>
            `).join('');
        }
    }
}