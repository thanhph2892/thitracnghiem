// ─── TÍNH NĂNG CHỐNG GIAN LẬN (ANTI-CHEAT) ───
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', function(e) {
    if(e.keyCode === 123) { e.preventDefault(); return false; }
    if(e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) { e.preventDefault(); return false; }
    if(e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
    if(e.ctrlKey && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88 || e.keyCode === 65 || e.keyCode === 80)) {
        e.preventDefault(); return false;
    }
});

document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

// ─── TÍNH NĂNG GIAO DIỆN TỐI (DARK MODE) ───
window.toggleTheme = function() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if(isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('hse_theme', 'light');
        document.querySelector('.moon-icon').style.display = 'block';
        document.querySelector('.sun-icon').style.display = 'none';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('hse_theme', 'dark');
        document.querySelector('.moon-icon').style.display = 'none';
        document.querySelector('.sun-icon').style.display = 'block';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
        const moon = document.querySelector('.moon-icon');
        const sun = document.querySelector('.sun-icon');
        if(moon && sun) { moon.style.display = 'none'; sun.style.display = 'block'; }
    }
});

// ─── TRÌNH QUẢN LÝ ÂM THANH TÍCH HỢP (WEB AUDIO API) ───
const SoundManager = {
    ctx: null,
    init: function() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone: function(freq, type, duration, vol = 0.1) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playTick: function() { this.playTone(880, 'sine', 0.1, 0.05); },
    playPass: function() { 
        setTimeout(() => this.playTone(523.25, 'triangle', 0.3, 0.2), 0);   
        setTimeout(() => this.playTone(659.25, 'triangle', 0.3, 0.2), 150); 
        setTimeout(() => this.playTone(783.99, 'triangle', 0.4, 0.2), 300); 
        setTimeout(() => this.playTone(1046.50, 'triangle', 0.8, 0.2), 450); 
    },
    playFail: function() { 
        setTimeout(() => this.playTone(300, 'sawtooth', 0.4, 0.2), 0);
        setTimeout(() => this.playTone(250, 'sawtooth', 0.4, 0.2), 300);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.8, 0.2), 600);
    }
};

document.addEventListener('click', () => SoundManager.init(), { once: true });

// ─── KHAI BÁO BIẾN CỐT LÕI ───
let questions = [];      
let userAnswers = [];    
let flaggedQuestions = new Set(); 
let totalMinutes = 0;    
let timerInterval;       
let isReviewMode = false; 

let currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let examStartTime = Date.now();
let pingInterval;

function pingServer() {
    if (isReviewMode) return; 
    const payloadRaw = sessionStorage.getItem('selectedExamsPayload');
    let examNameVi = 'Bài thi chung', examNameEn = 'General Exam';
    if (payloadRaw) {
        const payload = JSON.parse(payloadRaw);
        const allExams = [...(payload.basic || []), ...(payload.advanced || [])];
        if (allExams.length > 0) {
            examNameVi = allExams.map(e => e.nameVi).join(' & ');
            examNameEn = allExams.map(e => e.nameEn || e.nameVi).join(' & ');
        }
    }
    const pingData = { sessionId: currentSessionId, userId: sessionStorage.getItem('currentUserId') || 'N/A', userName: sessionStorage.getItem('cachedUserName') || 'Thí sinh', company: sessionStorage.getItem('cachedCompany') || 'N/A', examName: examNameVi, examNameEn: examNameEn, startTime: examStartTime };
    
    fetch('/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pingData) })
    .then(r => r.json())
    .then(data => {
        if (data.forceSubmit) {
            clearInterval(timerInterval);
            if (pingInterval) clearInterval(pingInterval);
            window.executeForceSubmit(data.reason); 
        }
    })
    .catch(e => {}); 
}

function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
function distributeEvenly(pools, target) { let result = []; let currentPools = pools.map(p => shuffleArray([...p])); let needed = target; while (needed > 0 && currentPools.length > 0) { currentPools = currentPools.filter(p => p.length > 0); if (currentPools.length === 0) break; let takePerPool = Math.max(1, Math.floor(needed / currentPools.length)); let remainder = needed % currentPools.length; for (let i = 0; i < currentPools.length; i++) { if (needed <= 0) break; let take = takePerPool + (remainder > 0 ? 1 : 0); if (remainder > 0) remainder--; let actuallyTaken = currentPools[i].splice(0, take); result.push(...actuallyTaken); needed -= actuallyTaken.length; } } return result; }
function extractText(opt) { if (typeof opt === 'string') return opt; if (typeof opt === 'object' && opt !== null) { return opt.text_vn || opt.textVi || opt.text || opt.value || opt.name || opt.answer || JSON.stringify(opt); } return String(opt); }
function normalizeQuestion(q, folderName) { let contentVi = q.question_vn || q.questionVi || q.question || q.cau_hoi || q.content || 'Nội dung câu hỏi bị thiếu'; let contentEn = q.question_en || q.questionEn || contentVi; let optsVi = []; let optsEn = []; let correctIndex = 0; if (Array.isArray(q.options)) { q.options.forEach((opt, idx) => { let textVi = extractText(opt); let textEn = opt.text_en || opt.textEn || textVi; optsVi.push(textVi); optsEn.push(textEn); if (opt.is_correct === true || opt.correct === true) correctIndex = idx; }); } else { let rawOptsVi = q.optionsVi || q.options_vi || q.answers || q.dap_an || []; optsVi = rawOptsVi.map(extractText); let rawOptsEn = q.optionsEn || q.options_en || []; optsEn = rawOptsEn.length > 0 ? rawOptsEn.map(extractText) : optsVi; if (q.correct !== undefined) correctIndex = q.correct; } let image = q.image || q.img || null; if (image && !image.startsWith('http') && !image.startsWith('/')) { image = image.includes('nganhangcauhoi') ? `../${image}` : `../nganhangcauhoi/${folderName}/${image}`; } return { contentVi, contentEn, optsVi, optsEn, correct: correctIndex, image }; }

async function getQuestionsForModule(exam, targetCount) { if (!exam || !exam.folder) return []; let currentFiles = exam.files || []; if (exam.nameVi.toLowerCase().includes('etest') || exam.nameVi.toLowerCase().includes('đánh giá kiến thức')) { try { const res = await fetch(`/api/public/qbanks/all-json`); if (res.ok) currentFiles = await res.json(); } catch(e) {} } else if (currentFiles.length !== 1) { try { const res = await fetch(`/api/public/qbanks/${encodeURIComponent(exam.folder)}/files`); if (res.ok) { const allFiles = await res.json(); const jsonFiles = allFiles.filter(f => f.toLowerCase().endsWith('.json')); if (jsonFiles.length > 0) currentFiles = jsonFiles.map(f => `${exam.folder}/${f}`); } } catch(e) {} } let filePools = []; for (const file of currentFiles) { try { const actualFolder = file.includes('/') ? file.split('/')[0] : exam.folder; const res = await fetch(`../nganhangcauhoi/${file}?t=${new Date().getTime()}`); if (!res.ok) continue; const rawData = await res.json(); let dataArray = Array.isArray(rawData) ? rawData : (rawData.questions || rawData.data || [rawData]); filePools.push(dataArray.map(q => normalizeQuestion(q, actualFolder))); } catch(err) {} } if (exam.nameVi.toLowerCase().includes('etest') || exam.nameVi.toLowerCase().includes('đánh giá kiến thức')) { let giantPool = []; filePools.forEach(pool => giantPool.push(...pool)); return shuffleArray(giantPool).slice(0, targetCount); } return distributeEvenly(filePools, targetCount); }

async function initExam() {
    try {
        const lang = sessionStorage.getItem('currentLang') || 'vi';
        switchLanguage(lang);

        const reviewDataRaw = sessionStorage.getItem('reviewExamData');
        if (reviewDataRaw) {
            const reviewData = JSON.parse(reviewDataRaw);
            if (reviewData.details && reviewData.details.questions && reviewData.details.userAnswers) {
                questions = reviewData.details.questions.map(q => {
                    let contentVi = q.question_vn || q.questionVi || q.question || 'N/A';
                    let contentEn = q.question_en || q.questionEn || contentVi;
                    let optsVi = []; let optsEn = []; let correctIndex = 0;
                    if (Array.isArray(q.options)) {
                        q.options.forEach((opt, idx) => {
                            let textVi = typeof opt === 'object' ? (opt.text_vn || opt.textVi || opt.text || opt.label) : String(opt);
                            let textEn = typeof opt === 'object' ? (opt.text_en || opt.textEn || textVi) : textVi;
                            optsVi.push(textVi); optsEn.push(textEn);
                            if (typeof opt === 'object' && (opt.is_correct === true || opt.correct === true)) correctIndex = idx;
                        });
                    }
                    let img = q.image || q.img || null;
                    if (img && !img.startsWith('http') && !img.startsWith('../') && !img.startsWith('/')) img = `../${img}`;
                    return { contentVi, contentEn, optsVi, optsEn, correct: correctIndex, image: img };
                });
                userAnswers = new Array(questions.length).fill(null);
                const oldAnswers = reviewData.details.userAnswers;
                for (let i = 0; i < questions.length; i++) {
                    const ansLabel = oldAnswers[String(i + 1)]; 
                    if (ansLabel) {
                        const optIndex = String(ansLabel).toUpperCase().charCodeAt(0) - 65; 
                        if (optIndex >= 0 && optIndex < questions[i].optsVi.length) userAnswers[i] = optIndex;
                    }
                }
            } else {
                questions = reviewData.questions; 
                userAnswers = reviewData.userAnswers; 
            }
            
            document.getElementById('c-id').innerText = sessionStorage.getItem('currentUserId');
            document.getElementById('c-name').innerText = sessionStorage.getItem('cachedUserName');
            document.getElementById('c-company').innerText = sessionStorage.getItem('cachedCompany');
            const eNameVi = reviewData.examName || 'Bài thi chung';
            const eNameEn = reviewData.examNameEn || eNameVi;
            document.getElementById('exam-title-display').innerHTML = `<span class="vi">XEM LẠI: ${eNameVi.toUpperCase()}</span><span class="en">REVIEW: ${eNameEn.toUpperCase()}</span>`;
            document.getElementById('countdown').innerText = '--:--:--';
            document.getElementById('loader').style.display = 'none';
            
            renderAllQuestions(); 
            buildNavGrid(); 
            setupScrollSpy(); 
            setupReviewUI(); 

            let correctCount = 0;
            for (let i = 0; i < questions.length; i++) {
                if (userAnswers[i] === questions[i].correct) correctCount++;
            }
            
            const wrongCount = questions.length - correctCount;
            const isPass = wrongCount <= 2; 
            const score = (correctCount / questions.length) * 100;

            document.getElementById('score-val').innerText = score.toFixed(1);
            document.getElementById('correct-count').innerText = `${correctCount}/${questions.length}`;
            
            const statusBadge = document.getElementById('pass-status');
            const scoreCircle = document.querySelector('.score-circle');
            const resultIcon = document.getElementById('result-icon');

            scoreCircle.className = `score-circle ${isPass ? 'pass' : 'fail'}`;
            
            if (isPass) {
                statusBadge.innerHTML = `<span class="status-badge pass"><span class="vi">ĐẠT YÊU CẦU</span><span class="en">PASSED</span></span>`;
                resultIcon.className = 'result-icon pass';
                resultIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            } else {
                statusBadge.innerHTML = `<span class="status-badge fail"><span class="vi">KHÔNG ĐẠT</span><span class="en">FAILED</span></span>`;
                resultIcon.className = 'result-icon fail';
                resultIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            }
            
            document.getElementById('result-modal').classList.add('show');
            return;
        }

        const payloadRaw = sessionStorage.getItem('selectedExamsPayload');
        const userId = sessionStorage.getItem('currentUserId');
        const cachedName = sessionStorage.getItem('cachedUserName') || 'Thí sinh mới';
        const cachedCompany = sessionStorage.getItem('cachedCompany') || 'N/A'; 
        
        if (!payloadRaw || !userId) throw new Error("Mất kết nối dữ liệu. Vui lòng quay lại chọn bài.");
        
        document.getElementById('c-id').innerText = userId;
        document.getElementById('c-name').innerText = cachedName;
        document.getElementById('c-company').innerText = cachedCompany; 

        const payload = JSON.parse(payloadRaw); 
        let displayExams = [...(payload.basic || []), ...(payload.advanced || [])];
        if(displayExams.length === 0) throw new Error("Bạn chưa chọn bài thi nào.");

        const titleVi = displayExams.map(e => e.nameVi).join(' & ');
        const titleEn = displayExams.map(e => e.nameEn || e.nameVi).join(' & ');
        document.getElementById('exam-title-display').innerHTML = `<span class="vi">${titleVi}</span><span class="en">${titleEn}</span>`;

        const targetTotal = displayExams[0].questionCount || 30;
        let totalTime = 0;
        displayExams.forEach(e => totalTime += (e.timeMinutes || 30));
        totalMinutes = Math.round(totalTime / displayExams.length); 

        let rawQuestionPool = [];
        const isEtest = displayExams.some(e => e.nameVi.toLowerCase().includes('etest') || e.nameVi.toLowerCase().includes('đánh giá kiến thức'));

        if (isEtest) {
            const etestExam = displayExams.find(e => e.nameVi.toLowerCase().includes('etest') || e.nameVi.toLowerCase().includes('đánh giá kiến thức'));
            const qList = await getQuestionsForModule(etestExam, targetTotal);
            rawQuestionPool.push(...qList);
        } else {
            let needed = targetTotal;
            let takePerExam = Math.max(1, Math.floor(needed / displayExams.length));
            let remainder = needed % displayExams.length;

            for (let i = 0; i < displayExams.length; i++) {
                let take = takePerExam + (remainder > 0 ? 1 : 0);
                if (remainder > 0) remainder--;
                const qList = await getQuestionsForModule(displayExams[i], take);
                rawQuestionPool.push(...qList);
            }
        }

        if (rawQuestionPool.length === 0) throw new Error("Kho dữ liệu trống. Không tìm thấy câu hỏi hợp lệ.");

        questions = shuffleArray(rawQuestionPool);
        userAnswers = new Array(questions.length).fill(null);

        document.getElementById('loader').style.display = 'none';
        renderAllQuestions();
        buildNavGrid();
        setupScrollSpy(); 
        startTimer(totalMinutes * 60);

        pingServer();
        pingInterval = setInterval(pingServer, 10000); 

    } catch (error) {
        document.getElementById('loader').style.display = 'none';
        const mainArea = document.querySelector('.main-scroll-area');
        if(mainArea) {
            mainArea.innerHTML = `
                <div style="background:#fff1f2; padding:40px; border-radius:24px; border:2px solid #fda4af; margin-bottom:40px; text-align:center;">
                    <h2 style="color:#e11d48; margin-bottom:10px;">⚠ LỖI THIẾT LẬP BÀI THI</h2>
                    <p style="color:#1e293b; font-size:1.1rem; font-weight:600;">Lý do: ${error.message}</p>
                    <button onclick="window.location.href='../index.html'" style="margin-top:25px; padding:12px 24px; background:#e11d48; color:#fff; border:none; border-radius:12px; font-weight:700; cursor:pointer;">QUAY LẠI TRANG CHỦ</button>
                </div>`;
        }
    }
}

function renderAllQuestions() {
    const wrapper = document.getElementById('questions-wrapper');
    let html = '';
    const labelsAlpha = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let index = 0; index < questions.length; index++) {
        const q = questions[index];
        const imgHtml = q.image ? `<img src="${q.image}" class="q-image" alt="Question Image">` : '';
        let optsHtml = '';
        const numOpts = Math.max(q.optsVi.length, q.optsEn.length);
        
        for (let i = 0; i < numOpts; i++) {
            const optVi = q.optsVi[i] || '';
            const optEn = q.optsEn[i] || optVi;
            const labelLtr = labelsAlpha[i] || '';
            
            optsHtml += `
            <div class="opt-label" id="lbl-q${index}-opt${i}" onclick="window.selectOption(${index}, ${i})">
                <input type="radio" id="radio-q${index}-opt${i}" name="q${index}-option" value="${i}" style="display:none;">
                <div class="radio-custom"></div>
                <div class="opt-text">
                    <span style="font-weight: 900; color: #4f46e5; margin-right: 8px;">${labelLtr}.</span>
                    <span class="vi">${optVi}</span>
                    <span class="en">${optEn}</span>
                </div>
            </div>`;
        }

        html += `
        <div class="question-card" id="question-card-${index}" data-index="${index}">
            <div class="q-meta">
                <div class="q-number-label">Câu</div>
                <div class="q-number-val">${index + 1}</div>
                <button class="btn-flag" id="btn-flag-${index}" onclick="window.toggleFlag(${index})">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                    <div class="vi" style="font-size:0.75rem; margin-top:6px; font-weight:700;">Đánh dấu</div>
                    <div class="en" style="font-size:0.75rem; margin-top:6px; font-weight:700;">Flag</div>
                </button>
            </div>
            <div class="q-body">
                <div class="q-content vi">${q.contentVi}</div>
                <div class="q-content en">${q.contentEn}</div>
                ${imgHtml}
                <div class="options-list">
                    ${optsHtml}
                </div>
            </div>
        </div>`;
    }
    wrapper.innerHTML = html;
    switchLanguage(document.body.classList.contains('lang-en') ? 'en' : 'vi');
}

function buildNavGrid() {
    const grid = document.getElementById('nav-grid');
    grid.innerHTML = questions.map((q, idx) => 
        `<div class="q-box" id="nav-box-${idx}" onclick="window.jumpToQuestion(${idx})">
            ${idx + 1}
            <div class="corner-flag"><svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg></div>
        </div>`
    ).join('');
}

window.toggleFlag = function(index) {
    const btn = document.getElementById(`btn-flag-${index}`);
    const navBox = document.getElementById(`nav-box-${index}`);
    if (flaggedQuestions.has(index)) {
        flaggedQuestions.delete(index);
        btn.classList.remove('flagged');
        navBox.classList.remove('flagged');
    } else {
        flaggedQuestions.add(index);
        btn.classList.add('flagged');
        navBox.classList.add('flagged');
    }
}

window.selectOption = function(qIndex, optIndex) {
    if (isReviewMode) return; 
    for (let i = 0; i < 6; i++) {
        const lbl = document.getElementById(`lbl-q${qIndex}-opt${i}`);
        if (lbl) lbl.classList.remove('selected-opt');
    }
    const navBox = document.getElementById(`nav-box-${qIndex}`);
    const radioBtn = document.getElementById(`radio-q${qIndex}-opt${optIndex}`);

    if (userAnswers[qIndex] === optIndex) {
        userAnswers[qIndex] = null;
        if (navBox) navBox.classList.remove('answered');
        if (radioBtn) radioBtn.checked = false;
    } else {
        userAnswers[qIndex] = optIndex;
        if (navBox) navBox.classList.add('answered');
        const selectedLabel = document.getElementById(`lbl-q${qIndex}-opt${optIndex}`);
        if (selectedLabel) selectedLabel.classList.add('selected-opt');
        if (radioBtn) radioBtn.checked = true;
    }
    const unanswered = userAnswers.filter(a => a === null).length;
    const submitWrap = document.getElementById('submit-wrapper');
    if (submitWrap) submitWrap.style.display = unanswered === 0 ? 'block' : 'none';
}

window.jumpToQuestion = function(idx) { 
    const el = document.getElementById(`question-card-${idx}`);
    if(el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 150; 
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

function setupScrollSpy() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const idx = entry.target.getAttribute('data-index');
                document.querySelectorAll('.q-box').forEach(el => el.classList.remove('active'));
                document.getElementById(`nav-box-${idx}`).classList.add('active');
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' }); 
    document.querySelectorAll('.question-card').forEach(card => observer.observe(card));
}

window.switchLanguage = function(lang) {
    document.body.classList.remove('lang-vi', 'lang-en');
    document.body.classList.add(`lang-${lang}`);
    
    document.getElementById('btn-lang-vi').classList.remove('active');
    document.getElementById('btn-lang-en').classList.remove('active');
    document.getElementById(`btn-lang-${lang}`).classList.add('active');
}

function startTimer(durationSeconds) {
    let timer = durationSeconds;
    const display = document.getElementById('countdown');
    const timerBox = document.querySelector('.timer-box');

    timerInterval = setInterval(function () {
        let hours = parseInt(timer / 3600, 10);
        let minutes = parseInt((timer % 3600) / 60, 10);
        let seconds = parseInt(timer % 60, 10);
        
        display.textContent = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
        
        if (timer <= 60 && timer > 0) {
            timerBox.style.animation = "pulse-red 1s infinite";
            SoundManager.playTick(); 
        }

        if (--timer < 0) {
            clearInterval(timerInterval);
            timerBox.style.animation = "none";
            window.executeSubmit(); 
        }
    }, 1000);
}

const style = document.createElement('style');
style.innerHTML = `@keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); } 100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); } }`;
document.head.appendChild(style);

window.submitExam = function(force = false) {
    if (isReviewMode) { window.goHome(); return; }
    if (force) { window.executeSubmit(); return; }
    const unanswered = userAnswers.filter(a => a === null).length;
    const msgVi = unanswered > 0 ? `Bạn còn <b>${unanswered}</b> câu chưa làm.<br>Bạn có chắc chắn muốn nộp bài?` : `Xác nhận hoàn tất và nộp bài thi?`;
    const msgEn = unanswered > 0 ? `You have <b>${unanswered}</b> unanswered questions.<br>Submit anyway?` : `Submit exam now?`;
    document.getElementById('confirm-msg-vi').innerHTML = msgVi;
    document.getElementById('confirm-msg-en').innerHTML = msgEn;
    document.getElementById('confirm-submit-modal').classList.add('show');
}

window.closeConfirmModal = function() { document.getElementById('confirm-submit-modal').classList.remove('show'); }

window.executeForceSubmit = async function(reason) {
    window.closeConfirmModal();
    clearInterval(timerInterval);
    if (pingInterval) clearInterval(pingInterval);

    SoundManager.playFail();

    const payloadRaw = sessionStorage.getItem('selectedExamsPayload');
    let examNameVi = 'Bài thi chung', examNameEn = 'General Exam';
    if (payloadRaw) {
        const payload = JSON.parse(payloadRaw);
        const allExams = [...(payload.basic || []), ...(payload.advanced || [])];
        if (allExams.length > 0) {
            examNameVi = allExams.map(e => e.nameVi).join(' & ');
            examNameEn = allExams.map(e => e.nameEn || e.nameVi).join(' & ');
        }
    }

    const record = {
        userId: sessionStorage.getItem('currentUserId'),
        cccd: sessionStorage.getItem('currentUserId'),
        userName: sessionStorage.getItem('cachedUserName'),
        company: sessionStorage.getItem('cachedCompany'),
        examName: examNameVi,
        examNameEn: examNameEn,
        score: 0,
        percentage: 0,
        correctCount: 0,
        totalQuestions: questions.length,
        result: 'fail',
        status: 'Không đạt (Bị đình chỉ)',
        startTime: examStartTime, 
        timestamp: Date.now(),
        time: new Date().toISOString(),
        endTime: new Date().toISOString(),
        questions: questions,
        userAnswers: new Array(questions.length).fill(null)
    };

    try {
        await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
    } catch(e) {}

    document.getElementById('ban-reason-text').innerText = reason || "Vi phạm quy chế thi";
    document.getElementById('ban-modal').classList.add('show');
}

window.executeSubmit = async function() {
    window.closeConfirmModal();
    clearInterval(timerInterval);
    if (pingInterval) clearInterval(pingInterval); 

    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
        if (userAnswers[i] === questions[i].correct) correctCount++;
    }
    
    // LUẬT THÉP: Sai tối đa 2 câu là ĐẠT
    const wrongCount = questions.length - correctCount;
    const isPass = wrongCount <= 2; 
    
    const score = (correctCount / questions.length) * 100;

    try {
        const payloadRaw = sessionStorage.getItem('selectedExamsPayload');
        let examNameVi = 'Bài thi chung', examNameEn = 'General Exam';
        if (payloadRaw) {
            const payload = JSON.parse(payloadRaw);
            const allExams = [...(payload.basic || []), ...(payload.advanced || [])];
            if (allExams.length > 0) {
                examNameVi = allExams.map(e => e.nameVi).join(' & ');
                examNameEn = allExams.map(e => e.nameEn || e.nameVi).join(' & ');
            }
        }

        const record = {
            userId: sessionStorage.getItem('currentUserId'),
            cccd: sessionStorage.getItem('currentUserId'),
            userName: sessionStorage.getItem('cachedUserName'),
            company: sessionStorage.getItem('cachedCompany'),
            examName: examNameVi,
            examNameEn: examNameEn,
            score: parseFloat(score.toFixed(1)),
            percentage: parseFloat(score.toFixed(1)),
            correctCount: correctCount,
            totalQuestions: questions.length,
            result: isPass ? 'pass' : 'fail',
            status: isPass ? 'Đạt' : 'Không đạt',
            startTime: examStartTime, 
            timestamp: Date.now(),
            time: new Date().toISOString(),
            endTime: new Date().toISOString(),
            questions: questions,
            userAnswers: userAnswers
        };
        await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
    } catch (error) {}

    if (isPass) {
        SoundManager.playPass();
    } else {
        SoundManager.playFail();
    }

    document.getElementById('score-val').innerText = score.toFixed(1);
    document.getElementById('correct-count').innerText = `${correctCount}/${questions.length}`;
    
    const statusBadge = document.getElementById('pass-status');
    const scoreCircle = document.querySelector('.score-circle');
    const resultIcon = document.getElementById('result-icon');
    scoreCircle.className = `score-circle ${isPass ? 'pass' : 'fail'}`;
    
    if (isPass) {
        statusBadge.innerHTML = `<span class="status-badge pass"><span class="vi">ĐẠT YÊU CẦU</span><span class="en">PASSED</span></span>`;
        resultIcon.className = 'result-icon pass';
        resultIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else {
        statusBadge.innerHTML = `<span class="status-badge fail"><span class="vi">KHÔNG ĐẠT</span><span class="en">FAILED</span></span>`;
        resultIcon.className = 'result-icon fail';
        resultIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    }
    document.getElementById('result-modal').classList.add('show');
}

window.setupReviewUI = function() {
    isReviewMode = true; 
    document.body.classList.add('review-mode');

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i], userAns = userAnswers[i], correctAns = q.correct;
        const navBox = document.getElementById(`nav-box-${i}`);
        if(navBox) navBox.classList.remove('active', 'answered');

        if (userAns !== null) {
            if (userAns === correctAns) {
                const lbl = document.getElementById(`lbl-q${i}-opt${userAns}`);
                if(lbl) lbl.classList.add('opt-correct');
                if(navBox) { navBox.style.background = '#d1fae5'; navBox.style.borderColor = '#10b981'; navBox.style.color = '#059669'; }
            } else {
                const lblW = document.getElementById(`lbl-q${i}-opt${userAns}`);
                const lblC = document.getElementById(`lbl-q${i}-opt${correctAns}`);
                if(lblW) lblW.classList.add('opt-wrong');
                if(lblC) lblC.classList.add('opt-correct');
                if(navBox) { navBox.style.background = '#ffe4e6'; navBox.style.borderColor = '#f43f5e'; navBox.style.color = '#e11d48'; }
            }
        } else {
            const lblC = document.getElementById(`lbl-q${i}-opt${correctAns}`);
            if(lblC) lblC.classList.add('opt-correct');
            if(navBox) { navBox.style.background = '#f1f5f9'; navBox.style.borderColor = '#cbd5e1'; navBox.style.color = '#94a3b8'; }
        }
    }

    const btnSubmit = document.querySelector('.btn-submit');
    if (btnSubmit) {
        btnSubmit.innerHTML = `<span class="vi">HOÀN TẤT XEM & VỀ TRANG CHỦ</span><span class="en">FINISH REVIEW & HOME</span>`;
        btnSubmit.style.background = "linear-gradient(135deg, #0f172a 0%, #334155 100%)";
        btnSubmit.style.boxShadow = "0 15px 35px rgba(15,23,42,0.3)";
    }
    const submitWrap = document.getElementById('submit-wrapper');
    if (submitWrap) submitWrap.style.display = 'block';

    let navHomeBtn = document.getElementById('nav-btn-home');
    if (!navHomeBtn) {
        const navPanel = document.querySelector('.nav-panel');
        if (navPanel) {
            navHomeBtn = document.createElement('button');
            navHomeBtn.id = 'nav-btn-home';
            navHomeBtn.className = 'btn-submit';
            navHomeBtn.onclick = window.goHome;
            navHomeBtn.style.marginTop = '25px';
            navHomeBtn.style.padding = '16px';
            navHomeBtn.style.background = 'linear-gradient(135deg, #0f172a 0%, #334155 100%)';
            navHomeBtn.style.boxShadow = '0 10px 25px rgba(15,23,42,0.2)';
            navHomeBtn.innerHTML = `<span class="vi">🏠 VỀ TRANG CHỦ</span><span class="en">🏠 BACK TO HOME</span>`;
            navPanel.appendChild(navHomeBtn);
        }
    }
}

window.reviewExam = function() {
    document.getElementById('result-modal').classList.remove('show');
    if (!isReviewMode) { setupReviewUI(); }
    window.scrollTo({top: 0, behavior: 'smooth'});
}

window.goHome = function() {
    sessionStorage.removeItem('selectedExamsPayload');
    sessionStorage.removeItem('reviewExamData'); 
    window.location.href = '../index.html';
}

initExam();