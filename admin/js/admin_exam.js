window.initExamMenuTab = function() {
    loadExamConfigs();
};

// ─── THUẬT TOÁN ÉP VIẾT HOA CHỮ CÁI ĐẦU MỖI TỪ ───
window.formatTitleCase = function(input) {
    let val = input.value;
    val = val.split(' ').map(word => {
        if (word.length > 0) {
            // Chữ cái đầu viết hoa, phần còn lại giữ nguyên (cả hoa và thường đều được)
            return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return '';
    }).join(' ');
    input.value = val;
}

window.loadExamConfigs = async function() {
    const tbody = document.getElementById('admin-exam-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color:#4f46e5; font-weight:700;">⏳ Đang tải cấu hình bài thi...</td></tr>';

    try {
        const res = await fetch('/api/exams-config');
        const data = await res.json();
        
        let html = '';
        const renderGroup = (groupName, items, type) => {
            if (!items || items.length === 0) return;
            html += `<tr style="background:#f8fafc;"><td colspan="7" style="padding:12px 20px; font-weight:900; color:#0f172a; text-transform:uppercase;">${groupName}</td></tr>`;
            
            items.forEach((e, idx) => {
                const statusHtml = e.enabled 
                    ? `<span style="background:#ecfdf5; color:#059669; padding:4px 12px; border-radius:100px; font-weight:700; font-size:0.8rem; border:1px solid #a7f3d0;">Bật</span>`
                    : `<span style="background:#f1f5f9; color:#64748b; padding:4px 12px; border-radius:100px; font-weight:700; font-size:0.8rem; border:1px solid #cbd5e1;">Tắt</span>`;
                
                html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:16px 20px; font-size:1.5rem; text-align:center;">${e.icon || '📋'}</td>
                    <td style="padding:16px 20px;">
                        <div style="font-weight:800; color:#0f172a; font-size:1rem;">${e.nameVi}</div>
                        <div style="font-size:0.8rem; color:#64748b; font-weight:600; margin-top:4px;">${e.nameEn || e.nameVi}</div>
                    </td>
                    <td style="padding:16px 20px; text-align:center; font-weight:700; color:#475569;">${e.timeMinutes}p</td>
                    <td style="padding:16px 20px; text-align:center; font-weight:700; color:#475569;">${e.questionCount} câu</td>
                    <td style="padding:16px 20px;">
                        <div style="max-height:60px; overflow-y:auto; font-size:0.8rem; color:#64748b; background:#f8fafc; padding:8px; border-radius:8px; border:1px solid #e2e8f0;">
                            ${(e.files || []).join('<br>')}
                        </div>
                    </td>
                    <td style="padding:16px 20px; text-align:center;">${statusHtml}</td>
                    <td style="padding:16px 20px; text-align:center;">
                        <button onclick="editExamConfig('${type}', ${idx})" style="background:#e0e7ff; color:#4f46e5; border:none; padding:8px 12px; border-radius:8px; font-weight:700; cursor:pointer; margin-right:6px;">Sửa</button>
                        <button onclick="deleteExamConfig('${type}', ${idx})" style="background:#fff1f2; color:#e11d48; border:none; padding:8px 12px; border-radius:8px; font-weight:700; cursor:pointer;">Xóa</button>
                    </td>
                </tr>`;
            });
        };

        renderGroup('Mô-đun Cơ bản', data.basic, 'basic');
        renderGroup('Mô-đun Chuyên sâu', data.advanced, 'advanced');
        
        tbody.innerHTML = html;
        window.currentExamConfig = data;

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color:#e11d48; font-weight:700;">Lỗi kết nối máy chủ</td></tr>';
    }
}

// Modal Mở Form Sửa / Thêm Mới
window.openExamModal = function(type = 'basic', idx = -1) {
    const modal = document.getElementById('exam-modal');
    if (!modal) return;
    
    document.getElementById('exam-type').value = type;
    document.getElementById('exam-idx').value = idx;
    
    // Gắn sự kiện viết hoa thông minh cho 2 ô Input Tên bài thi
    const nameViInput = document.getElementById('exam-name-vi');
    const nameEnInput = document.getElementById('exam-name-en');
    nameViInput.oninput = function() { window.formatTitleCase(this); };
    nameEnInput.oninput = function() { window.formatTitleCase(this); };

    if (idx >= 0 && window.currentExamConfig) {
        const e = window.currentExamConfig[type][idx];
        nameViInput.value = e.nameVi || '';
        nameEnInput.value = e.nameEn || '';
        document.getElementById('exam-icon').value = e.icon || '📋';
        document.getElementById('exam-time').value = e.timeMinutes || 30;
        document.getElementById('exam-qcount').value = e.questionCount || 30;
        document.getElementById('exam-files').value = (e.files || []).join('\n');
        document.getElementById('exam-enabled').value = e.enabled !== false ? 'true' : 'false';
        document.getElementById('modal-title').innerText = 'Cập nhật Bài thi';
    } else {
        nameViInput.value = '';
        nameEnInput.value = '';
        document.getElementById('exam-icon').value = '📋';
        document.getElementById('exam-time').value = 30;
        document.getElementById('exam-qcount').value = 30;
        document.getElementById('exam-files').value = '';
        document.getElementById('exam-enabled').value = 'true';
        document.getElementById('modal-title').innerText = 'Thêm Bài thi mới';
    }
    
    modal.style.display = 'flex';
}

window.closeExamModal = function() {
    const modal = document.getElementById('exam-modal');
    if (modal) modal.style.display = 'none';
}

window.saveExamConfig = async function() {
    const type = document.getElementById('exam-type').value;
    const idx = parseInt(document.getElementById('exam-idx').value);
    
    const nameVi = document.getElementById('exam-name-vi').value.trim();
    const nameEn = document.getElementById('exam-name-en').value.trim();
    const icon = document.getElementById('exam-icon').value.trim();
    const timeMinutes = parseInt(document.getElementById('exam-time').value) || 30;
    const questionCount = parseInt(document.getElementById('exam-qcount').value) || 30;
    const filesRaw = document.getElementById('exam-files').value.split('\n').map(s => s.trim()).filter(s => s);
    const enabled = document.getElementById('exam-enabled').value === 'true';

    if (!nameVi || filesRaw.length === 0) {
        alert('Vui lòng điền tên bài thi và ít nhất 1 file JSON (vd: thumuc/file.json)');
        return;
    }

    let newData = JSON.parse(JSON.stringify(window.currentExamConfig || { basic: [], advanced: [] }));
    if (!newData[type]) newData[type] = [];

    const item = { nameVi, nameEn, icon, timeMinutes, questionCount, files: filesRaw, enabled };

    if (idx >= 0) {
        newData[type][idx] = item;
    } else {
        newData[type].push(item);
    }

    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch('/api/exams-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: newData, adminPassword: pw })
        });
        
        if (res.ok) {
            closeExamModal();
            loadExamConfigs();
            if (typeof window.showToast === 'function') window.showToast('Đã lưu cấu hình', 'success');
        } else {
            alert('Lỗi lưu cấu hình. Vui lòng kiểm tra quyền Admin.');
        }
    } catch(e) {
        alert('Lỗi kết nối máy chủ');
    }
}

window.editExamConfig = function(type, idx) {
    openExamModal(type, idx);
}

window.deleteExamConfig = async function(type, idx) {
    if (!confirm('Chắc chắn xóa bài thi này?')) return;
    
    let newData = JSON.parse(JSON.stringify(window.currentExamConfig));
    newData[type].splice(idx, 1);

    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch('/api/exams-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: newData, adminPassword: pw })
        });
        
        if (res.ok) {
            loadExamConfigs();
        } else {
            alert('Lỗi lưu cấu hình');
        }
    } catch(e) {
        alert('Lỗi máy chủ');
    }
}

// Chạy khởi tạo
setTimeout(() => {
    if (document.getElementById('admin-exam-tbody')) {
        window.initExamMenuTab();
    }
}, 300);