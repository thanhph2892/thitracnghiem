window.capitalizeFirstOnly = function(str) { if (!str) return ''; return str.charAt(0).toUpperCase() + str.slice(1); };
window.autoFillExamDetails = function(mode) { const viInput = document.getElementById(mode === 'add' ? 'new-exam-name-vi' : 'edit-exam-name-vi'); const enInput = document.getElementById(mode === 'add' ? 'new-exam-name-en' : 'edit-exam-name-en'); if(viInput) { let val = viInput.value; if(val.length > 0) viInput.value = val.charAt(0).toUpperCase() + val.slice(1); if(viInput.value.trim() && !enInput.value.trim()) { enInput.value = viInput.value; } } }
window.getExamIcon = function(nameVi) { const lower = (nameVi || '').toLowerCase(); if (lower.includes('điện')) return '⚡'; if (lower.includes('trên cao')) return '🏗️'; if (lower.includes('kín') || lower.includes('hạn chế')) return '🕳️'; if (lower.includes('hóa chất')) return '🧪'; if (lower.includes('cháy') || lower.includes('pccc')) return '🔥'; if (lower.includes('cấp cứu') || lower.includes('y tế')) return '🚑'; if (lower.includes('giao thông') || lower.includes('xe')) return '🚦'; if (lower.includes('môi trường')) return '🌿'; if (lower.includes('cơ khí') || lower.includes('máy')) return '⚙️'; if (lower.includes('nâng hạ') || lower.includes('cẩu')) return '🏗️'; if (lower.includes('hàn') || lower.includes('cắt')) return '🧑‍🏭'; if (lower.includes('ban đầu')) return '🔰'; if (lower.includes('đánh giá') || lower.includes('khảo sát')) return '📝'; if (lower.includes('chuyên sâu')) return '🌟'; return '📋';  }

window.loadExamMenuEditor = async function() {
    if (!window.qbankData || window.qbankData.length === 0) { if (typeof window.loadQBanks === 'function') await window.loadQBanks(); } else { if (typeof window.loadFolderDropdowns === 'function') window.loadFolderDropdowns(); }
    const typeContainer = document.getElementById('new-exam-type');
    if (typeContainer && typeContainer.tagName === 'SELECT') { 
        const parent = typeContainer.parentElement; 
        parent.innerHTML = `<label class="cfg-form-label">Tên nhóm/Mô-đun (Gõ tên mới hoặc chọn từ danh sách)</label><input type="text" id="new-exam-type" list="module-list" class="config-input" placeholder="VD: Mô-đun Đặc biệt..." style="margin-top: 10px;" /><datalist id="module-list"><option value="Mô-đun Cơ bản"></option><option value="Mô-đun Chuyên sâu"></option></datalist>`; 
    }
    
    // Nâng cấp Nút "Thêm bài thi"
    const addBtn = document.querySelector('button[onclick="window.addNewExam()"]');
    if(addBtn) { addBtn.className = 'btn-modern btn-modern-primary'; addBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Thêm Bài Thi Mới'; }
    
    // Nâng cấp Nút "Lưu tất cả"
    const saveBtn = document.querySelector('button[onclick="window.saveExamsConfig()"]');
    if(saveBtn) { saveBtn.className = 'btn-modern btn-modern-success'; saveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> LƯU TẤT CẢ THAY ĐỔI'; }

    try { const res = await fetch(`/api/exams-config?t=${Date.now()}`); const data = await res.json(); if (data && !data.error) { window.examsConfig = data; window.renderExamListEditor(); } } catch(e) {}
}

window.renderExamListEditor = function() {
    const el = document.getElementById('exam-list-editor'); if (!el) return;
    const renderGroup = (groupKey) => {
        const examList = window.examsConfig[groupKey] || []; if (examList.length === 0) return '';
        return `<div class="exam-editor-group">
            <div class="exam-editor-group-header">
                <span class="exam-editor-group-title">🏷️ ${groupKey}</span>
                <button class="btn-edit-module" onclick="window.renameModule('${groupKey}')">✏️ Sửa Tên Mô-đun</button>
            </div>
            ${examList.map((exam, idx) => { 
                const isSingleFile = exam.files && exam.files.length === 1; 
                const folderDisplay = isSingleFile ? `📄 File: ${exam.files[0].split('/')[1]}` : `📁 Thư mục: ${exam.folder}`; 
                return `<div class="exam-editor-row ${exam.enabled ? '' : 'exam-disabled'}">
                    <div class="exam-editor-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" ${exam.enabled ? 'checked' : ''} onchange="window.toggleExamEnabled('${groupKey}', ${idx}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="exam-editor-info">
                        <div class="exam-editor-name">
                            <span style="font-size:1.8rem; background:#f1f5f9; width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:14px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);">${exam.icon || '📋'}</span>
                            ${exam.nameVi}
                        </div>
                        <div class="exam-editor-meta">
                            <span>⏱ <b>${exam.timeMinutes}</b> phút</span>
                            <span style="color:#cbd5e1;">|</span>
                            <span>📝 <b>${exam.questionCount}</b> câu</span>
                            <span style="color:#cbd5e1;">|</span>
                            <span class="qbank-file-tag">${folderDisplay}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-modern btn-modern-outline" style="padding:10px 16px;" onclick="window.openExamEditModal('${groupKey}', ${idx})">Sửa</button>
                        <button class="btn-modern btn-modern-danger" style="padding:10px 16px;" onclick="window.removeExam('${groupKey}', ${idx})">Xóa</button>
                    </div>
                </div>`; 
            }).join('')}
        </div>`;
    };
    const allGroups = Object.keys(window.examsConfig || {}); let htmlContent = '';
    allGroups.forEach(groupKey => { htmlContent += renderGroup(groupKey); });
    el.innerHTML = htmlContent || '<div class="qbank-empty">Chưa có cấu hình bài thi nào</div>';
}

window.renameModule = async function(oldName) {
    const overlay = document.createElement('div'); overlay.className = 'confirm-overlay show'; overlay.style.zIndex = '999999';
    overlay.innerHTML = `<div class="confirm-box" style="width: 450px;"><div class="confirm-title" style="margin-bottom: 20px;">✏️ Đổi tên Mô-đun</div><div style="margin-bottom: 15px;"><label class="cfg-form-label">Tên mô-đun hiện tại:</label><input type="text" class="config-input" value="${oldName}" disabled style="margin-top: 6px; background: #f1f5f9; color: #64748b; cursor: not-allowed;" /></div><div style="margin-bottom: 30px;"><label class="cfg-form-label" style="color: #4f46e5;">Nhập tên mô-đun mới:</label><input type="text" id="custom-rename-input" class="config-input" placeholder="VD: Mô-đun Chuyên môn..." style="margin-top: 6px; border-color: #4f46e5;" /></div><div class="confirm-actions"><button class="btn-modern btn-modern-outline" onclick="this.closest('.confirm-overlay').remove()">Hủy</button><button class="btn-modern btn-modern-primary" onclick="window.confirmRenameModule('${oldName}', document.getElementById('custom-rename-input').value, this)">Lưu tên mới</button></div></div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('custom-rename-input'); input.focus();
    input.addEventListener('input', function() { let val = this.value; if(val.length > 0) this.value = val.charAt(0).toUpperCase() + val.slice(1); });
};

window.confirmRenameModule = async function(oldName, newName, btn) {
    if (!newName || newName.trim() === '' || newName.trim() === oldName) { btn.closest('.confirm-overlay').remove(); return; }
    const cleanName = window.capitalizeFirstOnly(newName.trim());
    if (window.examsConfig[cleanName]) return window.showAlert("Trùng lặp", "Tên mô-đun này đã tồn tại! Vui lòng chọn tên khác.", "warning");
    window.examsConfig[cleanName] = window.examsConfig[oldName]; delete window.examsConfig[oldName];
    btn.closest('.confirm-overlay').remove(); await window.saveExamsConfig();
}

window.toggleExamEnabled = function(group, idx, enabled) { window.examsConfig[group][idx].enabled = enabled; window.renderExamListEditor(); }
window.removeExam = function(group, idx) { const exam = window.examsConfig[group][idx]; window.showConfirm(() => { window.examsConfig[group].splice(idx, 1); window.renderExamListEditor(); window.showToast('Đã xóa', 'success'); }, 'Xóa bài thi', `Xóa vĩnh viễn Menu bài thi "${exam.nameVi}"? Nhớ ấn Lưu Thay Đổi để áp dụng.`, 'danger'); }

window.openExamEditModal = async function(group, idx) {
    const exam = window.examsConfig[group][idx];
    const editNameViInput = document.getElementById('edit-exam-name-vi');
    if (editNameViInput && !document.getElementById('edit-exam-group-input')) {
        const container = document.createElement('div'); container.style.marginBottom = '20px';
        container.innerHTML = `<label class="cfg-form-label" style="color:#e11d48;">Thuộc Mô-đun/Nhóm (Gõ tên để chuyển)</label><input type="text" id="edit-exam-group-input" list="module-list-edit" class="config-input" style="margin-top: 6px; border:2px solid #fda4af;" /><datalist id="module-list-edit">${Object.keys(window.examsConfig).map(g => `<option value="${g}"></option>`).join('')}</datalist><input type="hidden" id="edit-exam-old-group" />`;
        editNameViInput.parentElement.insertAdjacentElement('beforebegin', container);
        document.getElementById('edit-exam-group-input').addEventListener('input', function() { let val = this.value; if(val.length > 0) this.value = val.charAt(0).toUpperCase() + val.slice(1); });
    }

    document.getElementById('edit-exam-id').value = idx; 
    if (document.getElementById('edit-exam-group-input')) { document.getElementById('edit-exam-group-input').value = group; document.getElementById('edit-exam-old-group').value = group; }
    document.getElementById('edit-exam-name-vi').value = exam.nameVi || ''; document.getElementById('edit-exam-name-en').value = exam.nameEn || ''; document.getElementById('edit-exam-time').value = exam.timeMinutes || 30; document.getElementById('edit-exam-qs').value = exam.questionCount || 30;
    
    if (!window.qbankData || window.qbankData.length === 0) { if (typeof window.loadQBanks === 'function') await window.loadQBanks(); } else { if (typeof window.loadFolderDropdowns === 'function') window.loadFolderDropdowns(); }
    const isSingleFile = exam.files && exam.files.length === 1; document.getElementById('edit-exam-folder').value = isSingleFile ? `FILE::${exam.files[0]}` : `FOLDER::${exam.folder}`;
    
    const modal = document.getElementById('exam-edit-modal'); modal.style.setProperty('display', 'flex', 'important'); modal.style.setProperty('opacity', '1', 'important'); modal.style.setProperty('visibility', 'visible', 'important'); modal.style.setProperty('pointer-events', 'auto', 'important');
}

window.closeExamEditModal = function() { const modal = document.getElementById('exam-edit-modal'); if(modal) { modal.style.setProperty('opacity', '0', 'important'); modal.style.setProperty('visibility', 'hidden', 'important'); modal.style.setProperty('pointer-events', 'none', 'important'); setTimeout(() => { modal.style.setProperty('display', 'none', 'important'); }, 300); } }

window.loadFolderDropdowns = async function() {
    const pw = window.getStoredPw(); const dropdowns = ['new-exam-folder', 'edit-exam-folder']; let optionsHtml = '<option value="">— Chọn cấu hình nguồn câu hỏi —</option>';
    if(window.qbankData && window.qbankData.length > 0) {
        for (let b of window.qbankData) {
            try {
                const files = await fetch(`/api/qbanks/${encodeURIComponent(b.name)}/all-files?adminPassword=${encodeURIComponent(pw)}`).then(r => r.json());
                const jsonFiles = Array.isArray(files) ? files.filter(f => f.toLowerCase().endsWith('.json')) : [];
                optionsHtml += `<optgroup label="📁 THƯ MỤC LỚN: ${b.name}">`; optionsHtml += `<option value="FOLDER::${b.name}">👉 Lấy TẤT CẢ các file JSON trong thư mục này</option>`;
                for(let f of jsonFiles) { optionsHtml += `<option value="FILE::${b.name}/${f}">📄 Chỉ lấy riêng file cố định: ${f}</option>`; } optionsHtml += `</optgroup>`;
            } catch(e) {}
        }
    }
    dropdowns.forEach(id => { const sel = document.getElementById(id); if (!sel) return; const cur = sel.value; sel.innerHTML = optionsHtml; if (cur) sel.value = cur; });
}

window.addNewExam = async function() {
    const typeInput = document.getElementById('new-exam-type'); let type = typeInput ? typeInput.value.trim() : 'Mô-đun Cơ bản'; if (!type) type = 'Mô-đun Cơ bản'; type = window.capitalizeFirstOnly(type);
    let nameVi = document.getElementById('new-exam-name-vi').value.trim(); let nameEn = document.getElementById('new-exam-name-en').value.trim(); nameVi = window.capitalizeFirstOnly(nameVi);
    const sourceVal = document.getElementById('new-exam-folder').value; const msgEl = document.getElementById('add-exam-msg');
    if (!nameVi || !sourceVal) { window.showAlert('Nhập thiếu', 'Vui lòng nhập Tên và Chọn Nguồn dữ liệu', 'warning'); return; }

    const isFile = sourceVal.startsWith('FILE::'); const folder = isFile ? sourceVal.split('::')[1].split('/')[0] : sourceVal.split('::')[1];
    try {
        const fileList = await fetch(`/api/qbanks/${encodeURIComponent(folder)}/all-files?adminPassword=${encodeURIComponent(window.getStoredPw())}`).then(r => r.json());
        const jsonFiles = Array.isArray(fileList) ? fileList.filter(f => f.toLowerCase().endsWith('.json')) : [];
        let targetFiles = []; if (isFile) { targetFiles = [sourceVal.split('::')[1]]; } else { targetFiles = jsonFiles.map(f => `${folder}/${f}`); }

        if (targetFiles.length === 0) return window.showAlert('Rỗng', 'Thư mục trống hoặc File không tồn tại!', 'error');
        
        if (!window.examsConfig) window.examsConfig = {}; if (!window.examsConfig[type]) window.examsConfig[type] = [];
        window.examsConfig[type].push({ id: nameVi.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') + '-' + Date.now(), nameVi, nameEn, timeMinutes: parseInt(document.getElementById('new-exam-time').value) || 30, questionCount: parseInt(document.getElementById('new-exam-qs').value) || 30, folder: folder, files: targetFiles, uploadTime: Date.now(), enabled: true, icon: window.getExamIcon(nameVi) });
        
        window.renderExamListEditor(); 
        window.showToast("Đã thêm vào nhóm", "success"); document.getElementById('new-exam-name-vi').value = ''; document.getElementById('new-exam-name-en').value = '';
    } catch(e) { window.showAlert('Lỗi', 'Lỗi tải dữ liệu', 'error'); }
}

window.saveExamEdit = async function() {
    const oldGroup = document.getElementById('edit-exam-old-group') ? document.getElementById('edit-exam-old-group').value : document.getElementById('edit-exam-group').value;
    const newGroupInput = document.getElementById('edit-exam-group-input') ? document.getElementById('edit-exam-group-input').value.trim() : oldGroup;
    const newGroup = window.capitalizeFirstOnly(newGroupInput); 
    const idx = parseInt(document.getElementById('edit-exam-id').value);
    const sourceVal = document.getElementById('edit-exam-folder').value;

    let nameVi = document.getElementById('edit-exam-name-vi').value.trim(); let nameEn = document.getElementById('edit-exam-name-en').value.trim(); nameVi = window.capitalizeFirstOnly(nameVi);
    if (!sourceVal) return window.showAlert('Báo lỗi', 'Chọn nguồn dữ liệu', 'error');

    const isFile = sourceVal.startsWith('FILE::'); const folder = isFile ? sourceVal.split('::')[1].split('/')[0] : sourceVal.split('::')[1];
    try {
        const fileList = await fetch(`/api/qbanks/${encodeURIComponent(folder)}/all-files?adminPassword=${encodeURIComponent(window.getStoredPw())}`).then(r => r.json());
        const jsonFiles = Array.isArray(fileList) ? fileList.filter(f => f.toLowerCase().endsWith('.json')) : [];
        let targetFiles = []; if (isFile) { targetFiles = [sourceVal.split('::')[1]]; } else { targetFiles = jsonFiles.map(f => `${folder}/${f}`); }

        if (targetFiles.length === 0) return window.showAlert('Rỗng', 'Nguồn dữ liệu không hợp lệ', 'error');
        
        if (oldGroup !== newGroup) {
            const examObj = window.examsConfig[oldGroup][idx]; window.examsConfig[oldGroup].splice(idx, 1); if (window.examsConfig[oldGroup].length === 0) delete window.examsConfig[oldGroup];
            if (!window.examsConfig[newGroup]) window.examsConfig[newGroup] = []; window.examsConfig[newGroup].push(examObj);
            const newIdx = window.examsConfig[newGroup].length - 1;
            Object.assign(window.examsConfig[newGroup][newIdx], { nameVi, nameEn, timeMinutes: parseInt(document.getElementById('edit-exam-time').value) || 30, questionCount: parseInt(document.getElementById('edit-exam-qs').value) || 30, folder: folder, files: targetFiles, uploadTime: Date.now(), icon: window.getExamIcon(nameVi) });
        } else {
            Object.assign(window.examsConfig[oldGroup][idx], { nameVi, nameEn, timeMinutes: parseInt(document.getElementById('edit-exam-time').value) || 30, questionCount: parseInt(document.getElementById('edit-exam-qs').value) || 30, folder: folder, files: targetFiles, uploadTime: Date.now(), icon: window.getExamIcon(nameVi) });
        }
        window.closeExamEditModal(); window.renderExamListEditor(); window.showToast('Đã cập nhật (Nhớ bấm LƯU THAY ĐỔI)', 'success');
    } catch(e) { window.showAlert('Lỗi', 'Lỗi máy chủ', 'error'); }
}

window.saveExamsConfig = async function() {
    const pw = window.getStoredPw(), msgEl = document.getElementById('exam-config-msg');
    if (!pw) return; msgEl.textContent = '⏳ Đang đồng bộ...'; msgEl.className = 'cfg-msg';
    try {
        const res = await fetch('/api/exams-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: pw, config: window.examsConfig }) });
        if (res.ok) { msgEl.textContent = '✅ Đã lưu lên Web!'; msgEl.className = 'cfg-msg success'; window.renderExamListEditor(); window.showToast('Đã lưu dữ liệu!', 'success'); }
    } catch(e) { msgEl.textContent = '⚠ Lỗi'; msgEl.className = 'cfg-msg error'; }
}

document.addEventListener('DOMContentLoaded', () => {
    const newExamTypeInput = document.getElementById('new-exam-type');
    if (newExamTypeInput) { newExamTypeInput.addEventListener('input', function() { let val = this.value; if(val.length > 0) this.value = val.charAt(0).toUpperCase() + val.slice(1); }); }
});

// =================================================================================
// BỘ MÁY TỰ ĐỘNG LỘT XÁC GIAO DIỆN NÚT BẤM (UI ENGINE)
// Tự động tìm các nút Hủy/Cập nhật cũ kỹ và biến đổi chúng thành giao diện Modern.
// =================================================================================
setTimeout(() => {
    // 1. Lột xác cho Modal Sửa Bài Thi (Chỉnh sửa)
    const editModal = document.getElementById('exam-edit-modal');
    if (editModal) {
        const saveBtn = editModal.querySelector('button[onclick="window.saveExamEdit()"]');
        if (saveBtn && saveBtn.parentElement) {
            saveBtn.parentElement.style.cssText = "display: flex; gap: 15px; margin-top: 35px; width: 100%;";
            saveBtn.parentElement.innerHTML = `
                <button type="button" onclick="window.closeExamEditModal()" 
                    style="flex: 1; padding: 16px; border-radius: 16px; background: #f1f5f9; color: #475569; font-weight: 800; border: none; cursor: pointer; font-size: 1.05rem; transition: all 0.2s ease; font-family: 'Plus Jakarta Sans', sans-serif;"
                    onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" 
                    onmouseout="this.style.background='#f1f5f9'; this.style.color='#475569';">
                    Hủy bỏ
                </button>
                <button type="button" onclick="window.saveExamEdit()" 
                    style="flex: 1; padding: 16px; border-radius: 16px; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #fff; font-weight: 800; border: none; cursor: pointer; font-size: 1.05rem; box-shadow: 0 10px 25px rgba(79,70,229,0.3); transition: all 0.2s ease; font-family: 'Plus Jakarta Sans', sans-serif;"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 35px rgba(79,70,229,0.4)';" 
                    onmouseout="this.style.transform='none'; this.style.boxShadow='0 10px 25px rgba(79,70,229,0.3)';">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Cập nhật Bài thi
                </button>
            `;
        }
    }

    // 2. Lột xác cho Modal Thêm Bài Thi Mới
    const addModal = document.getElementById('exam-modal');
    if (addModal) {
        const saveAddBtn = addModal.querySelector('button[onclick="window.saveExamConfig()"]');
        if (saveAddBtn && saveAddBtn.parentElement) {
            saveAddBtn.parentElement.style.cssText = "display: flex; gap: 15px; margin-top: 35px; width: 100%;";
            saveAddBtn.parentElement.innerHTML = `
                <button type="button" onclick="window.closeExamModal()" 
                    style="flex: 1; padding: 16px; border-radius: 16px; background: #f1f5f9; color: #475569; font-weight: 800; border: none; cursor: pointer; font-size: 1.05rem; transition: all 0.2s ease; font-family: 'Plus Jakarta Sans', sans-serif;"
                    onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" 
                    onmouseout="this.style.background='#f1f5f9'; this.style.color='#475569';">
                    Hủy bỏ
                </button>
                <button type="button" onclick="window.saveExamConfig()" 
                    style="flex: 1; padding: 16px; border-radius: 16px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 800; border: none; cursor: pointer; font-size: 1.05rem; box-shadow: 0 10px 25px rgba(16,185,129,0.3); transition: all 0.2s ease; font-family: 'Plus Jakarta Sans', sans-serif;"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 35px rgba(16,185,129,0.4)';" 
                    onmouseout="this.style.transform='none'; this.style.boxShadow='0 10px 25px rgba(16,185,129,0.3)';">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px; vertical-align: text-bottom;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Tạo Bài thi
                </button>
            `;
        }
    }
}, 1000);