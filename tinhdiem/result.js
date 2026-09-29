document.addEventListener("DOMContentLoaded", () => {
    const rawData = localStorage.getItem('examResult');
    if (!rawData) {
        alert("Không tìm thấy kết quả bài thi! Vui lòng quay lại.");
        window.location.href = '../index.html';
        return;
    }

    const examData = JSON.parse(rawData);
    const { userId, userName, company, examName, examNameEn, timestamp, startTime, questions, userAnswers, lang, displayLang, exams } = examData;
    const currentLang = displayLang || lang || 'vi';

    const langDict = {
        vi: { calculating: "ĐANG TÍNH ĐIỂM...", candidate: "ĐỊNH DANH / CCCD", nameLabel: "Họ và Tên", companyLabel: "Công ty", timeLabel: "Thời gian thi", correctCount: "SỐ CÂU ĐÚNG", btnReview: "Xem Chi Tiết Bài Làm", btnHome: "Về Trang Chủ", detailTitle: "Chi Tiết Đáp Án", correctLabel: "Đáp án đúng", wrongLabel: "Bạn chọn sai", pass: "ĐẠT YÊU CẦU", fail: "KHÔNG ĐẠT", questionStr: "Câu số", btnHomeBottom: "VỀ TRANG CHỦ" },
        en: { calculating: "CALCULATING...", candidate: "ID / PASSPORT", nameLabel: "Full Name", companyLabel: "Company", timeLabel: "Exam Time", correctCount: "CORRECT ANSWERS", btnReview: "Detailed Review", btnHome: "Back to Home", detailTitle: "Detailed Answers", correctLabel: "Correct Answer", wrongLabel: "Your Wrong Answer", pass: "PASSED", fail: "FAILED", questionStr: "Question", btnHomeBottom: "BACK TO HOME" }
    };

    const t = langDict[currentLang];

    document.getElementById('result-status').innerText = t.calculating;
    document.getElementById('lbl-candidate').innerText = t.candidate;
    document.getElementById('lbl-correct-count').innerText = t.correctCount;
    document.getElementById('btn-review').innerText = t.btnReview;
    document.getElementById('btn-home').innerText = t.btnHome;
    document.getElementById('lbl-detail-title').innerText = t.detailTitle;
    document.getElementById('lbl-correct-legend').innerText = t.correctLabel;
    document.getElementById('lbl-wrong-legend').innerText = t.wrongLabel;

    function toTitleCase(str) { return str ? str.trim().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ') : ''; }

    const infoEl = document.getElementById('candidate-extra-info');
    if (infoEl) {
        let infoHtml = '';
        const displayName = toTitleCase(userName || '');
        const displayCompany = toTitleCase(company || '');
        if (displayName) infoHtml += `<div class="extra-info-row"><span class="extra-info-label">${t.nameLabel}:</span> <strong>${displayName}</strong></div>`;
        if (displayCompany) infoHtml += `<div class="extra-info-row"><span class="extra-info-label">${t.companyLabel}:</span> <strong>${displayCompany}</strong></div>`;
        if (startTime && timestamp) {
            const fmt = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
            infoHtml += `<div class="extra-info-row"><span class="extra-info-label">${t.timeLabel}:</span> <strong>${fmt(startTime)} → ${fmt(timestamp)}</strong></div>`;
        }
        infoEl.innerHTML = infoHtml;
    }

    let correctCount = 0;
    let reviewHTML = '';

    questions.forEach((q, index) => {
        const qNum = index + 1;
        const qNumStr = qNum.toString().padStart(2, '0');
        const userAnswerLabel = userAnswers[qNum] || "";
        const correctOpt = q.options.find(o => String(o.is_correct).trim().toLowerCase() === "true");
        const isCorrect = (userAnswerLabel === correctOpt.label);
        if (isCorrect) correctCount++;

        const mainQuestion = currentLang === 'en' ? q.question_en : q.question_vn;
        const subQuestion = currentLang === 'en' ? q.question_vn : q.question_en;

        reviewHTML += `<div class="q-card ${isCorrect ? 'is-correct' : 'is-wrong'}"><div class="q-card-inner"><div class="q-left"><div class="q-number">${t.questionStr} ${qNumStr}</div><div class="q-status-icon-big ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '✓' : '✕'}</div></div><div class="q-right"><div class="q-content"><div class="lang-top">${mainQuestion}</div><div class="lang-bot">${subQuestion}</div></div>${q.image ? `<div class="q-image"><img src="../${q.image}" alt="Image"></div>` : ''}<div class="options-group">`;

        q.options.forEach(opt => {
            const isThisOptCorrect = String(opt.is_correct).trim().toLowerCase() === "true";
            const isThisOptSelected = (opt.label === userAnswerLabel);
            let optClass = ""; let iconHTML = "";
            if (isThisOptCorrect) { optClass = "is-correct-ans"; iconHTML = `<div class="opt-status-icon">✓</div>`; }
            else if (isThisOptSelected) { optClass = "is-user-wrong"; iconHTML = `<div class="opt-status-icon">✕</div>`; }

            const mainOpt = currentLang === 'en' ? opt.text_en : opt.text_vn;
            const subOpt = currentLang === 'en' ? opt.text_vn : opt.text_en;
            const optBody = opt.image ? `<img src="../${opt.image}" alt="${opt.label}" class="opt-image">` : `<strong>${mainOpt || ''}</strong><small>${subOpt || ''}</small>`;

            reviewHTML += `<div class="opt-pill ${optClass}"><div class="opt-label">${opt.label}</div><div class="opt-text">${optBody}</div>${iconHTML}</div>`;
        });
        reviewHTML += `</div></div></div></div>`;
    });

    reviewHTML += `<div class="bottom-action-container"><button id="btn-home-bottom" class="btn-bottom-home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> ${t.btnHomeBottom}</button></div>`;

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    
    // LUẬT THÉP: Sai tối đa 2 câu là ĐẠT
    const wrongCount = totalQuestions - correctCount;
    const isPass = (wrongCount <= 2);

    document.getElementById('student-id').innerText = userId;
    document.getElementById('correct-count').innerText = `${correctCount} / ${totalQuestions}`;
    document.getElementById('score-text').innerText = `${score}%`;
    document.getElementById('review-content').innerHTML = reviewHTML;

    const mainCard = document.getElementById('main-card');
    const statusTxt = document.getElementById('result-status');
    if (isPass) { mainCard.classList.add('status-pass'); statusTxt.innerText = t.pass; }
    else { mainCard.classList.add('status-fail'); statusTxt.innerText = t.fail; }

    setTimeout(() => { document.getElementById('score-path').style.strokeDasharray = `${score}, 100`; }, 300);

    document.getElementById('btn-review').onclick = () => { const sec = document.getElementById('review-section'); sec.style.display = 'block'; sec.scrollIntoView({ behavior: 'smooth' }); };
    document.getElementById('btn-home').onclick = () => { window.location.href = '../index.html'; };
    document.getElementById('btn-home-bottom').onclick = () => { window.location.href = '../index.html'; };
});