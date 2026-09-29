const langData = {
    vi: { title: "Hệ Thống Đánh Giá Năng Lực<br>An Toàn - Sức Khỏe - Môi Trường", sub: "Vui lòng chọn mô-đun bài thi và xác thực thông tin để bắt đầu", startBtn: "BẮT ĐẦU THI", warn: "Vui lòng chọn bài thi và điền đầy đủ thông tin hợp lệ để tiếp tục", warnCccd: "CCCD không hợp lệ: Phải đủ 12 số, đúng mã vùng tỉnh thành.", warnName: "Họ tên không hợp lệ: Phải gõ TIẾNG VIỆT CÓ DẤU, có nghĩa và không gõ bừa.", warnCompany: "Tên công ty không hợp lệ (Không gõ bừa bàn phím).", ready: "Sẵn sàng", mins: "phút", qs: "câu" },
    en: { title: "Competency Assessment System<br>Health - Safety - Environment", sub: "Please select exam modules and authenticate to begin", startBtn: "START EXAM", warn: "Please select an exam and fill in all valid information", warnCccd: "Invalid Passport — please enter a valid passport number", warnName: "Invalid Name: Must be valid words, no keyboard smashing.", warnCompany: "Invalid Company: No keyboard smashing allowed.", ready: "Ready", mins: "mins", qs: "questions" }
};

let currentLang = 'vi'; 
let selectedExams = []; 
let activeGroup = null; 
let dynamicExamsConfig = null; 
let typingTimer;

// BỘ LỌC ÉP VIẾT HOA TITLE CASE BÀI THI (DÙNG CHUNG CHO CẢ THẺ BÀI THI VÀ LỊCH SỬ)
function formatExamTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|[\s&+\-]+)\S/g, match => match.toUpperCase());
}

async function loadDynamicExamConfig() { 
    try { 
        const res = await fetch(`/api/exams-config?t=${Date.now()}`); 
        if (res.ok) { 
            dynamicExamsConfig = await res.json(); 
            renderDynamicExams(); 
        } 
    } catch(e) {} 
}

function renderDynamicExams() { 
    if (!dynamicExamsConfig) return; 
    const leftPanel = document.querySelector('.left-panel') || document.getElementById('dynamic-left-panel'); 
    if (!leftPanel) return; 
    
    const headingDiv = leftPanel.querySelector('.font-heading'); 
    leftPanel.innerHTML = ''; 
    if (headingDiv) leftPanel.appendChild(headingDiv); 
    
    Object.keys(dynamicExamsConfig).forEach(groupName => { 
        const exams = dynamicExamsConfig[groupName].filter(e => e.enabled); 
        if (exams.length === 0) return; 
        
        const isBasic = groupName.toLowerCase().includes('cơ bản') || groupName.toLowerCase().includes('basic'); 
        const dotColor = isBasic ? 'blue' : 'orange'; 
        
        // XỬ LÝ TIÊU ĐỀ TIẾNG VIỆT
        let mainTitleVi = groupName; 
        let subNoteVi = ''; 
        if (groupName.includes('(')) { 
            const parts = groupName.split('('); 
            mainTitleVi = parts[0].trim(); 
            subNoteVi = '(' + parts.slice(1).join('('); 
        } 

        // XỬ LÝ DỊCH TIÊU ĐỀ TIẾNG ANH CHUẨN XÁC
        let mainTitleEn = isBasic ? "BASIC MODULES" : "ADVANCED MODULES";
        let subNoteEn = isBasic ? "(Choose 1 module only)" : "(Multiple selections allowed)";
        
        let cardsHtml = exams.map(exam => { 
            const nameEn = exam.nameEn || exam.nameVi; 
            const isSelected = selectedExams.some(e => e.id === exam.id) ? 'selected' : ''; 
            
            // GỌI BỘ LỌC VIẾT HOA CHO CẢ TÊN TIẾNG VIỆT LẪN TIẾNG ANH
            const formattedNameVi = formatExamTitleCase(exam.nameVi);
            const formattedNameEn = formatExamTitleCase(nameEn);

            return `<div class="exam-tag ${isSelected}" data-id="${exam.id}" data-group="${groupName}">
                        <div class="exam-icon">${exam.icon || '📋'}</div>
                        <div class="exam-name">
                            <div class="vi" style="display:${currentLang==='vi'?'block':'none'}">${formattedNameVi}</div>
                            <div class="en" style="display:${currentLang==='en'?'block':'none'}">${formattedNameEn}</div>
                        </div>
                    </div>`; 
        }).join(''); 
        
        const groupDiv = document.createElement('div'); 
        groupDiv.className = 'module-group'; 
        groupDiv.setAttribute('data-group-wrapper', groupName); 
        groupDiv.innerHTML = `
            <div class="module-group-title font-heading vi" style="display:${currentLang==='vi'?'flex':'none'}">
                <div class="dot ${dotColor}"></div> ${mainTitleVi} <span style="font-size:0.85rem; color:#64748b; margin-left:6px; font-weight:500; text-transform:none;">${subNoteVi}</span>
            </div>
            <div class="module-group-title font-heading en" style="display:${currentLang==='en'?'flex':'none'}">
                <div class="dot ${dotColor}"></div> ${mainTitleEn} <span style="font-size:0.85rem; color:#64748b; margin-left:6px; font-weight:500; text-transform:none;">${subNoteEn}</span>
            </div>
            <div class="exam-list-wrap">${cardsHtml}</div>`; 
            
        leftPanel.appendChild(groupDiv); 
    }); 
    
    bindDynamicCardEvents(); 
    updateUIState(); 
}

function bindDynamicCardEvents() { 
    document.querySelectorAll('.exam-tag').forEach(card => { 
        card.addEventListener('click', () => { 
            const id = card.getAttribute('data-id'); 
            const group = card.getAttribute('data-group'); 
            const isBasicRule = group.toLowerCase().includes('cơ bản') || group.toLowerCase().includes('basic'); 
            
            if (activeGroup && activeGroup !== group) { 
                document.querySelectorAll('.exam-tag').forEach(c => c.classList.remove('selected')); 
                selectedExams = []; 
                activeGroup = group; 
            } 
            
            if (card.classList.contains('selected')) { 
                card.classList.remove('selected'); 
                selectedExams = selectedExams.filter(e => e.id !== id); 
                if (selectedExams.length === 0) activeGroup = null; 
            } else { 
                activeGroup = group; 
                const sourceExam = dynamicExamsConfig[group].find(e => e.id === id); 
                const examObj = { ...sourceExam, group: group }; 
                if (isBasicRule) { 
                    document.querySelectorAll(`.exam-tag[data-group="${group}"]`).forEach(c => c.classList.remove('selected')); 
                    selectedExams = [examObj]; 
                    card.classList.add('selected'); 
                } else { 
                    selectedExams.push(examObj); 
                    card.classList.add('selected'); 
                } 
            } 
            
            document.querySelectorAll('.module-group').forEach(grp => { 
                const grpName = grp.getAttribute('data-group-wrapper'); 
                if (activeGroup && grpName !== activeGroup) grp.classList.add('disabled-section'); 
                else grp.classList.remove('disabled-section'); 
            }); 
            updateUIState(); 
        }); 
    }); 
}

function removeVietnameseTones(str) { 
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d"); 
    return str; 
}

// ĐÃ SỬA: Loại bỏ cụm từ "test" ra khỏi danh sách bị cấm để không chặn QUATEST
function isGibberish(text) { 
    const t = removeVietnameseTones(text.toLowerCase()); 
    if (/(.)\1\1/.test(t)) return true; 
    if (/(asd|qwe|zxc|jkl|fgh|1234)/.test(t)) return true; 
    if (/[bcdfghjklmnpqrstvwxz]{4,}/.test(t)) return true; 
    return false; 
}

function checkNameValid(name, isEn) { 
    const trimmed = name.trim(); 
    const words = trimmed.split(/\s+/); 
    if (words.length < 2) return false; 
    if (!isEn) { 
        const hasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed); 
        if (!hasDiacritics) return false; 
    } 
    for (let word of words) { 
        if (isGibberish(word)) return false; 
        if (word.length > 10) return false; 
    } 
    return true; 
}

function checkCompanyValid(comp) { 
    const c = comp.trim(); 
    if (c.length < 2) return false; 
    if (/^\d+$/.test(c)) return false; 
    const lowerC = c.toLowerCase(); 
    if (/(.)\1\1/.test(lowerC)) return false; 
    if (/(asd|qwe|zxc|jkl|fgh)/i.test(lowerC)) return false; 
    if (c.length > 5 && isGibberish(c)) return false; 
    return true; 
}

function validateCccd(val) { 
    if (!val || val.length !== 12) return false; 
    if (!/^\d{12}$/.test(val)) return false; 
    if (!val.startsWith('0')) return false; 
    const province = parseInt(val.substring(0, 3), 10); 
    if (province < 1 || province > 96) return false; 
    if ('01234567890123456789'.includes(val) || '98765432109876543210'.includes(val)) return false; 
    if (/^(.)\1{11}$/.test(val)) return false; 
    return true; 
}

window.formatCccdInput = function(input, isEn) { 
    input.value = input.value.replace(/[^a-zA-Z0-9]/g, ''); 
    if (!isEn) input.value = input.value.replace(/\D/g, '').slice(0, 12); 
    updateUIState(); 
    clearTimeout(typingTimer); 
    const isValid = isEn ? input.value.trim().length >= 4 : validateCccd(input.value); 
    if (isValid) { 
        typingTimer = setTimeout(() => { fetchCandidateData(input.value.trim(), isEn); }, 600); 
    } else { 
        const wrap = document.getElementById('history-full-wrap'); 
        if(wrap) wrap.style.display = 'none'; 
    } 
}

window.formatNameInput = function(input) { updateUIState(); }
window.formatCompanyInput = function(input) { updateUIState(); }

function updateUIState() { 
    const isEn = document.body.classList.contains('lang-en'); 
    const cccd = isEn ? document.getElementById('user-id-input-en').value : document.getElementById('user-id-input').value; 
    const name = (isEn ? document.getElementById('user-name-input-en').value : document.getElementById('user-name-input').value) || ''; 
    const comp = (isEn ? document.getElementById('user-company-input-en').value : document.getElementById('user-company-input').value) || ''; 
    const btn = document.getElementById('btn-start-exam'); 
    const hasExamSelected = selectedExams.length > 0; 
    const isNameValid = checkNameValid(name, isEn); 
    const isCompValid = checkCompanyValid(comp); 
    const idOk = isEn ? cccd.trim().length >= 4 : validateCccd(cccd); 
    
    if (idOk && isNameValid && isCompValid && hasExamSelected) { 
        btn.classList.add('active'); 
    } else { 
        btn.classList.remove('active'); 
    } 
}

window.switchLanguage = function(lang) { 
    currentLang = lang; 
    document.body.className = `lang-${lang}`; 
    document.getElementById('btn-lang-vi').classList.remove('active'); 
    document.getElementById('btn-lang-en').classList.remove('active'); 
    document.getElementById(`btn-lang-${lang}`).classList.add('active'); 
    
    const idVi = document.getElementById('user-id-input'); 
    const idEn = document.getElementById('user-id-input-en'); 
    const nameVi = document.getElementById('user-name-input'); 
    const nameEn = document.getElementById('user-name-input-en'); 
    const compVi = document.getElementById('user-company-input'); 
    const compEn = document.getElementById('user-company-input-en'); 
    
    if(lang === 'en') { 
        if(idEn && idVi) idEn.value = idVi.value; 
        if(nameEn && nameVi) nameEn.value = nameVi.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D"); 
        if(compEn && compVi) compEn.value = compVi.value; 
    } else { 
        if(idVi && idEn) idVi.value = idEn.value; 
        if(nameVi && nameEn) nameVi.value = nameEn.value; 
        if(compVi && compEn) compVi.value = compEn.value; 
    } 
    renderDynamicExams(); 
    updateUIState(); 
}

function toTitleCase(str) { 
    return str.trim().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' '); 
}

window.startExam = function() { 
    const btn = document.getElementById('btn-start-exam'); 
    if(!btn.classList.contains('active')) return; 
    
    const isEn = document.body.classList.contains('lang-en'); 
    const userId = isEn ? document.getElementById('user-id-input-en').value.trim() : document.getElementById('user-id-input').value.trim(); 
    const userName = isEn ? document.getElementById('user-name-input-en').value : document.getElementById('user-name-input').value; 
    const userComp = isEn ? document.getElementById('user-company-input-en').value : document.getElementById('user-company-input').value; 
    
    const fmtName = toTitleCase(userName); 
    const fmtComp = userComp.trim().toUpperCase(); 
    
    sessionStorage.setItem('currentUserId', userId); 
    sessionStorage.setItem('cachedUserName', fmtName); 
    sessionStorage.setItem('cachedCompany', fmtComp); 
    sessionStorage.setItem('currentLang', currentLang); 
    
    const payload = { basic: [], advanced: [] }; 
    selectedExams.forEach(e => { 
        const isBasicObj = e.group && (e.group.toLowerCase().includes('cơ bản') || e.group.toLowerCase().includes('basic')); 
        if (isBasicObj) payload.basic.push(e); 
        else payload.advanced.push(e); 
    }); 
    
    sessionStorage.setItem('selectedExamsPayload', JSON.stringify(payload)); 
    window.location.href = 'giaodienthi/exam.html'; 
}

async function fetchCandidateData(cccd, isEn) { 
    try { 
        const res = await fetch(`/api/history?cccd=${encodeURIComponent(cccd)}`); 
        let data = await res.json(); 
        const historyWrap = document.getElementById('history-full-wrap'); 
        const tbody = document.getElementById('history-full-tbody'); 
        const countBadge = document.getElementById('history-count'); 

        const spamCompanies = ['A', 'SAO', 'BBBB', 'ƯE', 'P', 'SA', 'SD', 'SDSD', 'PM', 'S', 'Ê', 'SDD', 'DA'];
        data = data.filter(r => {
            let n = (r.userName || r.name || '').trim().toLowerCase();
            let c = (r.company || r.details?.company || '').trim().toUpperCase();
            if (n === 'thí sinh ẩn danh' || n === '' || n === 'null' || n === 'undefined') return false;
            if (spamCompanies.includes(c)) return false; 
            return true;
        });

        if (data && data.length > 0) { 
            window.candidateHistoryData = data; 
            const user = data[0]; 
            const uName = user.userName || ''; 
            const uComp = (user.company || '').toUpperCase(); 

            if(isEn) { 
                document.getElementById('user-name-input-en').value = removeVietnameseTones(uName); 
                document.getElementById('user-company-input-en').value = uComp; 
            } else { 
                document.getElementById('user-name-input').value = uName; 
                document.getElementById('user-company-input').value = uComp; 
            } 

            if(historyWrap) historyWrap.style.display = 'block'; 
            if(countBadge) countBadge.innerText = data.length; 

            if(tbody) { 
                tbody.innerHTML = data.map((row, idx) => { 
                    const timeValue = row.endTime || row.timestamp || row.examDate || row.createdAt || Date.now(); 
                    const dateObj = new Date(timeValue); 
                    const dateStr = dateObj.toLocaleDateString('vi-VN'); 
                    
                    let startObj = row.startTime ? new Date(row.startTime) : new Date(dateObj.getTime());
                    const startStr = startObj.toLocaleTimeString('vi-VN', { hour12: false }); 
                    const endStr = dateObj.toLocaleTimeString('vi-VN', { hour12: false });

                    const examNameVi = formatExamTitleCase(row.examName || 'Bài thi chung'); 
                    const examNameEn = formatExamTitleCase(row.examNameEn || 'HSE EXAM'); 

                    const scoreRaw = row.score !== undefined ? row.score : '-'; 
                    let fraction = '-'; 
                    let isPass = false; 

                    let tCount = row.totalQuestions || row.totalCount;
                    let cCount = row.correctCount;

                    if (!tCount) tCount = (examNameVi.toLowerCase().includes('đánh giá') || examNameVi.toLowerCase().includes('chuyên sâu')) ? 50 : 30;
                    if (cCount === undefined && scoreRaw !== '-') cCount = Math.round((scoreRaw / 100) * tCount);

                    if (cCount !== undefined && tCount) { 
                        fraction = `${cCount}/${tCount}`; isPass = (tCount - cCount) <= 2; 
                    } else { isPass = row.result === 'pass' || row.status === 'Đạt' || scoreRaw >= 80; } 

                    const scorePercent = row.percentage !== undefined ? `${row.percentage}%` : (scoreRaw <= 100 && scoreRaw !== '-' ? `${scoreRaw}%` : ''); 

                    const isBanned = (row.status && row.status.toLowerCase().includes('đình chỉ')) || (row.result && row.result.toLowerCase().includes('đình chỉ'));
                    const rowStyle = isBanned ? 'background-color: #fff1f2;' : '';
                    let statusBadgeHTML = '';
                    
                    if (isBanned) {
                        statusBadgeHTML = '<span class="status-badge" style="background: #e11d48; color: #fff; border: none; padding: 6px 14px; box-shadow: 0 4px 10px rgba(225, 29, 72, 0.3);">CẤM THI</span>';
                    } else {
                        statusBadgeHTML = isPass ? '<span class="status-badge pass">ĐẠT YÊU CẦU</span>' : '<span class="status-badge fail">KHÔNG ĐẠT</span>';
                    }

                    return `
                        <tr class="history-card-row" style="${rowStyle}">
                            <td style="font-weight: 800; color: #94a3b8; text-align: center; font-size: 0.95rem;">${idx + 1}</td>
                            <td style="text-align: center; white-space: nowrap;"><span class="td-cccd">${cccd}</span></td>
                            <td style="text-align: left; white-space: nowrap;"><span class="td-name">${uName}</span></td>
                            <td style="text-align: center; white-space: nowrap;"><span style="font-weight: 800; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 8px;">${uComp}</span></td>
                            <td style="text-align: center; white-space: nowrap;">
                                <div class="time-box">
                                    <div class="time-date-badge">📅 ${dateStr}</div>
                                    <div class="time-range-badge">
                                        <span class="t-start">${startStr}</span>
                                        <span class="t-arrow">→</span>
                                        <span class="t-end">${endStr}</span>
                                    </div>
                                </div>
                            </td>
                            <td style="text-align: center; min-width: 180px;">
                                <div class="exam-title-vi">${examNameVi}</div>
                                <div class="exam-title-en">${examNameEn}</div>
                            </td>
                            <td style="text-align: center; white-space: nowrap;">
                                <div class="score-box">
                                    <div class="score-percent">${scorePercent}</div>
                                    <div class="score-fraction">${fraction}</div>
                                </div>
                            </td>
                            <td style="text-align: center; white-space: nowrap;">
                                ${statusBadgeHTML}
                            </td>
                            <td style="text-align: center; white-space: nowrap;">
                                <button class="btn-view-modern" onclick="window.reviewPastExam(${idx})">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Xem chi tiết
                                </button>
                            </td>
                        </tr>
                    `; 
                }).join(''); 
                updateUIState(); 
            } 
        } else { 
            if(historyWrap) historyWrap.style.display = 'none'; 
            if(tbody) tbody.innerHTML = ''; 
            updateUIState(); 
        } 
    } catch(e) {} 
}

window.reviewPastExam = function(idx) { 
    try { 
        const rowData = window.candidateHistoryData[idx]; 
        const hasNewData = rowData.questions && rowData.userAnswers; 
        const hasOldData = rowData.details && rowData.details.questions && rowData.details.userAnswers; 
        if (!hasNewData && !hasOldData) return alert("CẢNH BÁO: Bài thi này bị lỗi lưu trữ nên không thể xem lại chi tiết."); 
        sessionStorage.setItem('reviewExamData', JSON.stringify(rowData)); 
        sessionStorage.setItem('currentUserId', rowData.userId || rowData.cccd || 'N/A'); 
        sessionStorage.setItem('cachedUserName', rowData.userName || rowData.name || 'Thí sinh ẩn danh'); 
        sessionStorage.setItem('cachedCompany', (rowData.company || '').toUpperCase()); 
        window.location.href = 'giaodienthi/exam.html'; 
    } catch(e) {} 
}

async function fetchOnlineCount() {
    try {
        const res = await fetch('/api/active-exams');
        const activeExams = await res.json();
        const count = activeExams.length || 0;
        const formattedCount = count < 10 ? '0' + count : count; 

        const badge = document.querySelector('.live-badge');
        if (badge) {
            let textContainer = badge.querySelector('.badge-text-container');
            if (!textContainer) {
                badge.innerHTML = '<div class="badge-text-container" style="display:flex; align-items:center; gap:8px;"></div>';
                textContainer = badge.querySelector('.badge-text-container');
            }

            let tooltip = document.getElementById('live-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'live-tooltip';
                tooltip.style.cssText = 'position:absolute; top:calc(100% + 10px); left:50%; transform:translateX(-50%); background:var(--bg-body, #fff); border:1px solid rgba(0,0,0,0.08); border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.12); min-width:280px; max-width:340px; z-index:500; padding:10px; opacity:0; visibility:hidden; transition:all 0.2s ease; pointer-events:none; text-align:left; color:var(--text-main, #0f172a);';
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
                textContainer.innerHTML = `<span class="vi" style="color:#64748b; font-weight:600;">Hiện không có ai đang thi</span><span class="en" style="color:#64748b; font-weight:600;">No one is taking exam</span>`;
                badge.style.background = 'transparent';
                badge.style.borderColor = 'transparent';
                badge.style.cursor = 'default';
                badge.style.boxShadow = 'none';
                tooltip.style.display = 'none';
            } else {
                textContainer.innerHTML = `<div class="live-dot"></div><span class="vi"><span>${formattedCount}</span> người đang thi trực tiếp</span><span class="en"><span>${formattedCount}</span> people in exam</span>`;
                badge.style.background = '#ecfdf5';
                badge.style.borderColor = '#a7f3d0';
                badge.style.cursor = 'pointer';
                tooltip.style.display = 'block';

                const now = Date.now();
                tooltip.innerHTML = activeExams.map((s, i) => {
                    const elapsed = Math.floor((now - (s.startTime || now)) / 1000);
                    const m = Math.floor(elapsed / 60); const sec = elapsed % 60;
                    const timeStr = m > 0 ? `${m}p ${sec}s` : `${sec}s`;
                    return `
                        <div style="display:flex; gap:12px; padding:10px; border-bottom:1px solid #f3f4f6; align-items:flex-start;">
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:0.9rem; font-weight:800; line-height:1.3;">
                                    <span style="color:#4f46e5; margin-right:4px;">${i + 1}.</span> 
                                    ${s.userId || '—'} - <span style="font-weight:700; color:#475569;">${s.userName || ''}</span>
                                </div>
                                <div style="font-size:0.75rem; color:#64748b; font-weight:600; margin-top:4px;">🏢 ${(s.company || '').toUpperCase()}</div>
                                <div style="font-size:0.8rem; color:#059669; font-weight:700; margin-top:4px;">${s.examName || 'Bài thi chung'}</div>
                                <div style="font-size:0.75rem; color:#9ca3b8; font-weight:600; margin-top:4px;">⏱ Đang làm: ${timeStr}</div>
                            </div>
                        </div>
                    `;
                }).join('').replace(/border-bottom:1px solid #f3f4f6;(?=[^<]*$)/, ''); 
            }
        }
    } catch(e) {}
}

loadDynamicExamConfig();
fetchOnlineCount();
setInterval(fetchOnlineCount, 3000);