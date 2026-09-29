window.selectedBankFiles = []; 
window.bankFolderGroups = {};

window.updateFolderSelectUI = function(input) {
    if (!input.files || input.files.length === 0) return;
    const fileArray = Array.from(input.files);
    window.selectedBankFiles = fileArray.filter(f => { const name = f.name.toLowerCase(); return name.endsWith('.json') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif'); });
    window.bankFolderGroups = {};
    window.selectedBankFiles.forEach(f => {
        const pathParts = (f.webkitRelativePath || f.name).split('/'); pathParts.pop(); 
        const parentFolder = pathParts.length > 0 ? pathParts.pop() : 'Thu_Muc_Goc'; 
        if (!window.bankFolderGroups[parentFolder]) window.bankFolderGroups[parentFolder] = [];
        window.bankFolderGroups[parentFolder].push(f);
    });
    const folderNames = Object.keys(window.bankFolderGroups);
    const infoDiv = document.getElementById('folder-selected-info'); const nameSpan = document.getElementById('folder-selected-name'); const countSpan = document.getElementById('folder-selected-count'); const msg = document.getElementById('qbank-upload-msg');
    if (folderNames.length > 0) {
        if (infoDiv) infoDiv.style.display = 'flex'; if (nameSpan) nameSpan.textContent = folderNames.join(', '); if (countSpan) countSpan.textContent = window.selectedBankFiles.length; if (msg) { msg.textContent = ''; msg.className = 'cfg-msg'; }
    } else {
        if (infoDiv) infoDiv.style.display = 'none'; if (msg) { msg.textContent = '⚠ Thư mục không hợp lệ!'; msg.className = 'cfg-msg error'; }
    }
};

window.uploadQBankFolder = async function() {
    const foldersToUpload = Object.keys(window.bankFolderGroups);
    if (foldersToUpload.length === 0) return window.showAlert("Chưa chọn file", "Vui lòng chọn thư mục chứa JSON và Hình ảnh trước khi nhấn tải lên.", "warning");

    const overlay = document.createElement('div');
    overlay.innerHTML = `<div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.8); backdrop-filter:blur(8px); z-index:999999; display:flex; justify-content:center; align-items:center; flex-direction:column; color:#fff; font-family:'Plus Jakarta Sans', sans-serif;"><div style="background:#ffffff; width:450px; padding:30px; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);"><div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;"><div style="width:24px; height:24px; border:3px solid #e0e7ff; border-top-color:#4f46e5; border-radius:50%; animation:spin 1s linear infinite;"></div><div style="color:#0f172a; font-size:1.2rem; font-weight:800;">Đang đồng bộ dữ liệu...</div></div><div style="width:100%; background:#f1f5f9; border-radius:100px; height:10px; overflow:hidden; margin-bottom:15px;"><div id="premium-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #4f46e5, #818cf8); border-radius:100px; transition:width 0.3s ease;"></div></div><div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:700; color:#4f46e5;"><span id="premium-progress-text">Khởi tạo...</span><span id="premium-progress-pct">0%</span></div></div></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
    document.body.appendChild(overlay);

    const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
    try {
        for (let i = 0; i < foldersToUpload.length; i++) {
            const folderName = foldersToUpload[i]; const files = window.bankFolderGroups[folderName];
            const percent = Math.round(((i) / foldersToUpload.length) * 100);
            document.getElementById('premium-progress-bar').style.width = `${percent}%`; document.getElementById('premium-progress-text').innerText = `Tải: ${folderName}...`; document.getElementById('premium-progress-pct').innerText = `${percent}%`;
            const formData = new FormData();
            files.forEach(file => { formData.append('files', file); formData.append('paths', `${folderName}/${file.name}`); });
            await fetch(`/api/qbanks/upload-folder?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData });
        }
        document.getElementById('premium-progress-bar').style.width = `100%`; document.getElementById('premium-progress-pct').innerText = `100%`; document.getElementById('premium-progress-text').innerText = `Hoàn tất!`;
    } catch (e) {} 
    
    setTimeout(() => {
        overlay.remove();
        window.showToast("Đã tải lên xong", "success");
        window.selectedBankFiles = []; window.bankFolderGroups = {};
        const inputUpload = document.getElementById('qbank-folder-input'); if (inputUpload) inputUpload.value = '';
        const infoDiv = document.getElementById('folder-selected-info'); if (infoDiv) infoDiv.style.display = 'none';
        window.loadQBanks();
    }, 800);
};

window.loadQBanks = async function() {
    let container = document.getElementById('qbank-list'); if (!container) return;
    container.innerHTML = '<div style="color:#4f46e5; font-weight:bold; padding: 20px;">⏳ Đang đọc dữ liệu từ Máy chủ...</div>';
    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch(`/api/qbanks?adminPassword=${encodeURIComponent(pw)}`);
        const folders = await res.json();
        if (!folders || folders.length === 0) {
            container.innerHTML = `<div style="background:#f8fafc; border:2px dashed #cbd5e1; border-radius:16px; padding:40px; text-align:center; color:#64748b; font-weight:700;">Ngân hàng câu hỏi đang trống</div>`;
            window.qbankData = []; return;
        }
        container.innerHTML = folders.map(folder => {
            const imgCount = folder.fileCount - folder.jsonCount;
            return `<div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; margin-bottom:16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow:hidden;"><div style="padding:20px; display:flex; justify-content:space-between; align-items:center;"><div style="display:flex; align-items:center; gap:16px;"><div style="background:#e0e7ff; color:#4f46e5; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">📂</div><div><div style="font-weight:900; color:#0f172a; font-size:1.15rem;">${folder.name}</div><div style="font-size:0.85rem; color:#64748b; font-weight:600; margin-top:4px;">📄 <span style="color:#4f46e5; font-weight:800;">${folder.jsonCount}</span> JSON<span style="margin:0 6px; color:#cbd5e1;">|</span>🖼️ <span style="color:#ea580c; font-weight:800;">${imgCount}</span> Hình ảnh</div></div></div><div style="display:flex; gap:10px;"><button type="button" onclick="window.toggleFolderView('${folder.name}')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:10px 20px; border-radius:10px; font-weight:800; cursor:pointer; transition:0.2s;">👁️ Xem & Sửa</button><button type="button" onclick="window.deleteBankFolder('${folder.name}')" style="background:#fff1f2; color:#e11d48; border:1px solid #fecdd3; padding:10px 20px; border-radius:10px; font-weight:800; cursor:pointer; transition:0.2s;">🗑️ Xóa</button></div></div><div id="files-of-${folder.name}" style="display:none; background:#f8fafc; border-top:1px dashed #cbd5e1; padding:0;"></div></div>`;
        }).join('');
        window.qbankData = folders;
    } catch(e) { container.innerHTML = `<div style="color:#e11d48; font-weight:bold; padding:20px;">⚠ Lỗi mạng</div>`; }
};

window.deleteBankFolder = async function(folderName) {
    window.showConfirm(async () => {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        await fetch(`/api/qbanks/${encodeURIComponent(folderName)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: pw }) });
        window.loadQBanks();
        window.showToast("Đã xóa thư mục thành công", "success");
    }, "Xác nhận xóa thư mục", `Thư mục "${folderName}" và tất cả hình ảnh/câu hỏi bên trong sẽ bị xóa vĩnh viễn.`, "danger");
};

window.toggleFolderView = async function(folderName) {
    const detailBox = document.getElementById(`files-of-${folderName}`);
    if (!detailBox) return;
    if (detailBox.style.display === 'block') { detailBox.style.display = 'none'; detailBox.innerHTML = ''; return; }
    detailBox.style.display = 'block'; detailBox.innerHTML = '<div style="padding:30px; text-align:center; color:#4f46e5; font-weight:bold;">⏳ Đang tải danh sách file...</div>';

    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch(`/api/qbanks/${encodeURIComponent(folderName)}/all-files?adminPassword=${encodeURIComponent(pw)}`);
        const files = await res.json();
        if (files.length === 0) { detailBox.innerHTML = '<div style="padding:30px; text-align:center; color:#64748b; font-weight:bold;">Thư mục trống.</div>'; return; }

        const jsons = files.filter(f => f.toLowerCase().endsWith('.json')); const imgs = files.filter(f => !f.toLowerCase().endsWith('.json'));
        let html = '<div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">';
        jsons.forEach(f => { html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:#fff; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 5px rgba(0,0,0,0.02);"><div style="font-weight:700; font-family:monospace; color:#4f46e5; font-size:1.05rem;">📄 <span style="color:#1e293b; margin-left:8px;">${f}</span></div><button type="button" onclick="window.openDynamicEditor('${folderName}', '${f}')" style="background:#eef2ff; color:#4f46e5; border:1px solid #c7d2fe; padding:8px 16px; border-radius:10px; font-weight:800; cursor:pointer;">✎ Sửa Code JSON</button></div>`; });
        imgs.forEach(f => { html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:#fff; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 5px rgba(0,0,0,0.02);"><div style="font-weight:700; font-family:monospace; color:#ea580c; font-size:1.05rem;">🖼️ <span style="color:#1e293b; margin-left:8px;">${f}</span></div><div style="display:flex; gap:8px;"><button type="button" onclick="window.showDynamicImage('${folderName}', '${f}')" style="background:#f8fafc; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:10px; font-weight:800; cursor:pointer;">👁️ Xem</button><button type="button" onclick="window.replaceDynamicImage('${folderName}', '${f}')" style="background:#fff1f2; color:#e11d48; border:1px solid #fecdd3; padding:8px 16px; border-radius:10px; font-weight:800; cursor:pointer;">🔄 Đổi Ảnh</button></div></div>`; });
        html += '</div>'; detailBox.innerHTML = html;
    } catch(err) { detailBox.innerHTML = `<div style="padding:30px; color:#e11d48; text-align:center; font-weight:bold;">⚠ Lỗi tải file</div>`; }
};

window.openDynamicEditor = async function(folder, file) {
    const overlay = document.createElement('div'); overlay.id = 'ram-editor-overlay';
    overlay.innerHTML = `<div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); z-index:999999; display:flex; justify-content:center; align-items:center;"><div style="background:#ffffff; width:900px; max-width:95%; border-radius:24px; padding:30px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><div style="font-size:1.2rem; font-weight:800; color:#0f172a; font-family:'Plus Jakarta Sans', sans-serif;">✏️ Đang sửa: <span style="color:#4f46e5;">${file}</span></div><button onclick="document.getElementById('ram-editor-overlay').remove()" style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 16px; border-radius:10px; font-weight:bold; cursor:pointer; color:#475569;">✕ Đóng</button></div><div style="background:#0f172a; padding:15px; border-radius:16px; margin-bottom:20px;"><textarea id="ram-json-textarea" spellcheck="false" style="width:100%; height:450px; background:transparent; border:none; color:#38bdf8; font-family:'Courier New', Courier, monospace; font-size:0.95rem; line-height:1.6; outline:none; resize:vertical;">⏳ Đang tải dữ liệu từ máy chủ...</textarea></div><div style="display:flex; justify-content:flex-end;"><button onclick="window.saveDynamicJson('${folder}', '${file}')" style="background:linear-gradient(135deg,#059669,#10b981); color:#fff; border:none; padding:14px 28px; border-radius:12px; font-weight:800; cursor:pointer; font-size:1rem; box-shadow:0 10px 20px rgba(16,185,129,0.3);">💾 Lưu Thay Đổi JSON</button></div></div></div>`;
    document.body.appendChild(overlay);

    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch(`/api/qbanks/${encodeURIComponent(folder)}/file?path=${encodeURIComponent(file)}&adminPassword=${encodeURIComponent(pw)}`);
        const content = await res.text(); const textarea = document.getElementById('ram-json-textarea');
        try { const jsonObj = JSON.parse(content); textarea.value = JSON.stringify(jsonObj, null, 4); } catch(err) { textarea.value = content; }
    } catch(e) { document.getElementById('ram-json-textarea').value = "LỖI MẠNG: Không thể tải file!"; }
};

window.saveDynamicJson = async function(folder, file) {
    const content = document.getElementById('ram-json-textarea').value;
    try { JSON.parse(content); } catch(e) { return window.showAlert("Cấu trúc JSON bị hỏng", "File của bạn đang bị sai dấu ngoặc, thiếu dấu phẩy hoặc dư chữ cái. Vui lòng sửa lại lỗi cú pháp!", "error"); }

    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch(`/api/qbanks/${encodeURIComponent(folder)}/file`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: pw, path: file, content: content }) });
        if (res.ok) { window.showToast('Lưu JSON thành công!', 'success'); document.getElementById('ram-editor-overlay').remove(); } 
        else window.showAlert("Lỗi lưu file", "Máy chủ từ chối cập nhật file!", "error");
    } catch(e) { window.showAlert("Lỗi mạng", "Mất kết nối với máy chủ.", "error"); }
};

window.showDynamicImage = function(folder, file) {
    const overlay = document.createElement('div');
    overlay.innerHTML = `<div onclick="this.remove()" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); z-index:999999; display:flex; justify-content:center; align-items:center; cursor:pointer;"><img src="/nganhangcauhoi/${folder}/${file}?t=${Date.now()}" style="max-width:90%; max-height:90vh; border-radius:16px; box-shadow:0 25px 50px rgba(0,0,0,0.5);"><div style="position:absolute; top:20px; right:30px; color:#fff; font-size:2rem; font-weight:bold;">✕</div></div>`;
    document.body.appendChild(overlay);
};

window.replaceDynamicImage = function(folder, file) {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png, image/jpeg, image/jpg, image/gif';
    input.onchange = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const formData = new FormData(); const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        formData.append('adminPassword', pw); formData.append('files', e.target.files[0]); formData.append('paths', `${folder}/${file}`); 
        try {
            window.showToast("Đang tải ảnh lên...", "default");
            const res = await fetch(`/api/qbanks/upload-folder?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData });
            if (res.ok) { window.showToast('Đổi ảnh thành công!', 'success'); } 
            else window.showAlert("Lỗi tải ảnh", "Có lỗi xảy ra khi lưu ảnh.", "error");
        } catch(err) { window.showAlert("Lỗi kết nối", "Mất mạng.", "error"); }
    };
    input.click(); 
};

setTimeout(() => { if (document.getElementById('qbank-list')) window.loadQBanks(); }, 300);