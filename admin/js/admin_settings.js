window.renderSettingsTab = function() {
    const tabSettings = document.getElementById('tab-settings');
    if (!tabSettings) return;

    tabSettings.innerHTML = `
        <div class="settings-container">
            <div class="section-block">
                <div class="section-title">🖥️ Thông tin Máy chủ (Server Status)</div>
                <div class="sys-grid" id="sys-info-grid">
                    <div class="sys-box"><div class="sys-box-title">Trạng thái</div><div class="sys-box-val" style="color:#10b981; font-size:1.1rem; display:flex; align-items:center; gap:8px;"><span style="width:12px;height:12px;background:#10b981;border-radius:50%;display:inline-block;box-shadow: 0 0 10px rgba(16,185,129,0.8);"></span> Đang hoạt động</div></div>
                    <div class="sys-box"><div class="sys-box-title">Tổng bản ghi thi</div><div class="sys-box-val" id="sys-records">Đang tải...</div></div>
                    <div class="sys-box"><div class="sys-box-title">Phiên bản Hệ thống</div><div class="sys-box-val" style="color:#0f172a;">v3.0 Pro</div></div>
                </div>
            </div>

            <!-- BỘ CÔNG CỤ XUẤT NHẬP DỮ LIỆU ĐỈNH CAO -->
            <div class="section-block">
                <div class="section-title" style="color: #4f46e5;">💾 Xuất Dữ liệu & Phục hồi (Database JSON)</div>
                <p style="color: #64748b; font-size: 1rem; margin-bottom: 25px; font-weight: 600;">Bạn có thể tải xuống toàn bộ dữ liệu dưới dạng Excel (để báo cáo) hoặc JSON (để Backup dự phòng).</p>
                <div style="display:flex; gap:20px; margin-bottom:40px;">
                    <button class="btn-modern btn-modern-success" style="flex:1; padding: 18px;" onclick="window.exportFullExcel()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
                        Xuất file Excel Đầy đủ
                    </button>
                    <button class="btn-modern btn-modern-warning" style="flex:1; padding: 18px;" onclick="window.downloadDatabase()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 
                        Tải xuống Backup (.json)
                    </button>
                </div>

                <div style="height: 2px; background: linear-gradient(90deg, #e2e8f0 0%, transparent 100%); margin-bottom: 30px;"></div>

                <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 24px; padding: 40px; text-align: center;">
                    <p style="color: #1d4ed8; font-size: 1rem; margin-bottom: 20px; font-weight:800;">Tải lên tệp <code style="background:#fff; padding:4px 8px; border-radius:6px; color:#e11d48;">database.json</code> để phục hồi dữ liệu (Sẽ ghi đè lịch sử hiện tại).</p>
                    <label class="btn-modern btn-modern-primary" for="db-upload-input" style="cursor: pointer; display: inline-flex; margin-bottom: 15px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Chọn tệp phục hồi
                        <input type="file" id="db-upload-input" accept=".json" style="display: none;">
                    </label>
                    <div id="db-file-selected" style="font-weight: 700; color: #64748b; font-size: 0.95rem;">Chưa có tệp nào được chọn</div>
                    <button class="btn-modern btn-modern-success" onclick="window.uploadDatabase()" style="width: 100%; margin-top: 20px; padding: 18px;">
                        Bắt đầu Phục hồi Database
                    </button>
                </div>
            </div>

            <!-- CÀI ĐẶT BẢO MẬT -->
            <div class="section-block">
                <div class="section-title">🔒 Bảo mật & Đổi mật khẩu</div>
                
                <div class="form-group" style="margin-bottom: 25px;">
                    <label class="cfg-form-label">Mật khẩu Admin hiện tại</label>
                    <input type="password" id="cfg-cur-pw" class="config-input" style="margin-top: 10px;" placeholder="Nhập mật khẩu cũ để xác thực...">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px; margin-bottom: 30px;">
                    <div>
                        <label class="cfg-form-label">Mật khẩu mới</label>
                        <input type="password" id="cfg-new-pw" class="config-input" style="margin-top: 10px;" placeholder="Tối thiểu 6 ký tự...">
                    </div>
                    <div>
                        <label class="cfg-form-label">Xác nhận mật khẩu mới</label>
                        <input type="password" id="cfg-confirm-pw" class="config-input" style="margin-top: 10px;" placeholder="Nhập lại mật khẩu mới...">
                    </div>
                </div>
                <button class="btn-modern btn-modern-primary" onclick="window.changeAdminPassword()" style="padding:16px 30px;">
                    Cập nhật Mật khẩu
                </button>
            </div>

            <!-- VÙNG NGUY HIỂM -->
            <div class="section-block" style="border-color: #fecdd3; background: #fff1f2;">
                <div class="section-title" style="color: #e11d48;">⚠️ VÙNG NGUY HIỂM</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:900; color:#be123c; font-size:1.2rem; text-transform:uppercase; margin-bottom:8px;">Xóa toàn bộ lịch sử thi</div>
                        <div style="color:#881337; font-size:1rem; font-weight: 600;">Hành động này sẽ xóa vĩnh viễn dữ liệu trong hệ thống. Hãy sao lưu Backup trước khi thực hiện.</div>
                    </div>
                    <button onclick="window.clearAllHistory()" class="btn-modern btn-modern-danger" style="padding:16px 24px; font-size:1.05rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Xóa tất cả dữ liệu
                    </button>
                </div>
            </div>
            
        </div>
    `;

    if (typeof window.allData !== 'undefined') {
        const recordsEl = document.getElementById('sys-records');
        if (recordsEl) recordsEl.textContent = window.allData.length.toLocaleString();
    }
}

window.exportFullExcel = async function() {
    try {
        window.showToast("Đang chuẩn bị file Excel...", "default");
        const res = await fetch('/api/history');
        const data = await res.json();
        
        if (!data || data.length === 0) return window.showAlert('Trống', 'Không có dữ liệu lịch sử thi để xuất!', 'warning');

        const rows = [['STT', 'CCCD / Hộ chiếu', 'Họ và Tên', 'Công ty', 'Thời gian bắt đầu', 'Thời gian nộp bài', 'Bài thi (VN)', 'Bài thi (EN)', 'Điểm số (%)', 'Số câu đúng', 'Tổng số câu', 'Đánh giá']];
        
        data.forEach((row, index) => {
            const cccd = row.userId || row.cccd || 'N/A';
            const name = row.userName || row.name || 'Thí sinh ẩn danh';
            const comp = (row.company || 'N/A').toUpperCase();

            const timeValue = row.endTime || row.timestamp || row.examDate || row.createdAt || Date.now();
            const dateObj = new Date(timeValue);
            const endStr = dateObj.toLocaleTimeString('vi-VN', { hour12: false }) + ' ' + dateObj.toLocaleDateString('vi-VN');
            
            let startObj = row.startTime ? new Date(row.startTime) : new Date(dateObj.getTime());
            const startStr = startObj.toLocaleTimeString('vi-VN', { hour12: false }) + ' ' + startObj.toLocaleDateString('vi-VN');

            const examNameVi = (row.examName || row.exam || 'Bài thi chung');
            const examNameEn = (row.examNameEn || row.examEn || 'HSE Exam');

            const scoreRaw = row.score !== undefined ? row.score : '-';
            let isPass = false; let cCount = row.correctCount || 0; let tCount = row.totalQuestions || row.totalCount || 30;

            if (row.correctCount !== undefined && row.totalQuestions !== undefined) { isPass = (row.totalQuestions - row.correctCount) <= 2; } 
            else { isPass = row.result === 'pass' || row.status === 'Đạt' || scoreRaw >= 80; }
            
            const scorePercent = row.percentage !== undefined ? row.percentage : (scoreRaw <= 100 && scoreRaw !== '-' ? scoreRaw : '');
            
            const isBanned = (row.status && row.status.toLowerCase().includes('đình chỉ')) || (row.result && row.result.toLowerCase().includes('đình chỉ'));
            let status = '';
            if (isBanned) status = 'CẤM THI';
            else status = isPass ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT';

            rows.push([index + 1, cccd, name, comp, startStr, endStr, examNameVi, examNameEn, scorePercent, cCount, tCount, status]);
        });

        if (window.XLSX) {
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{wch: 5}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 30}, {wch: 30}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 15}];
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "LichSuThi");
            XLSX.writeFile(wb, `ToanBo_LichSuThi_HSE_${new Date().getTime()}.xlsx`);
            window.showAlert("Thành công", "Đã xuất dữ liệu Excel thành công!", "success");
        } else { window.showAlert("Lỗi hệ thống", "Thư viện Excel chưa được tải!", "error"); }
    } catch(e) { window.showAlert("Lỗi", "Quá trình xuất dữ liệu thất bại.", "error"); }
};

window.downloadDatabase = async function() {
    const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
    try {
        window.showToast("Đang chuẩn bị file Backup JSON...", "default");
        const res = await fetch(`/api/history`); 
        const data = await res.json();
        
        if (!data || data.length === 0) return window.showAlert('Trống', 'Không có dữ liệu để xuất Backup!', 'warning');

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `database_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        
        window.showAlert('Thành công', 'Đã tải xuống file Backup hệ thống.', 'success');
    } catch(e) { window.showAlert('Lỗi mạng', 'Không thể kết nối máy chủ.', 'error'); }
}

window.uploadDatabase = async function() {
    const fileInput = document.getElementById('db-upload-input');
    const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');

    if (!fileInput || !fileInput.files[0]) {
        return window.showAlert('Thiếu File', 'Vui lòng nhấn nút "Chọn tệp phục hồi" để tải lên file database.json trước.', 'warning');
    }

    window.showConfirm(async () => {
        window.showToast('Đang phục hồi dữ liệu...', 'default');
        const formData = new FormData();
        formData.append('dbfile', fileInput.files[0]);

        try {
            const res = await fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData });
            const data = await res.json();

            if (res.ok) {
                window.showAlert('Phục hồi thành công!', 'Hệ thống sẽ tải lại để áp dụng dữ liệu mới.', 'success');
                fileInput.value = '';
                setTimeout(() => location.reload(), 2000);
            } else { 
                window.showAlert('Lỗi phục hồi', data.error || 'Dữ liệu file không hợp lệ.', 'error');
            }
        } catch(e) { window.showAlert('Lỗi kết nối', 'Mất kết nối tới máy chủ.', 'error'); }
    }, 'Xác nhận phục hồi', 'Hành động này sẽ GHI ĐÈ toàn bộ lịch sử thi hiện tại. Bạn có chắc chắn muốn tiếp tục?', 'warning');
}

document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'db-upload-input') {
        const labelText = document.getElementById('db-file-selected');
        if (labelText) {
            if (e.target.files.length > 0) {
                labelText.innerHTML = `<span style="color:#059669; font-weight:800; font-size:1.1rem;">✅ Đã chọn: ${e.target.files[0].name}</span>`;
            } else {
                labelText.innerText = 'Chưa có tệp nào được chọn';
            }
        }
    }
});

window.changeAdminPassword = async function() {
    const cur = document.getElementById('cfg-cur-pw').value;
    const nw = document.getElementById('cfg-new-pw').value;
    const cf = document.getElementById('cfg-confirm-pw').value;
    
    if (!cur || !nw || !cf) return window.showAlert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường!', 'warning');
    if (nw !== cf) return window.showAlert('Lỗi nhập liệu', 'Mật khẩu xác nhận không khớp!', 'warning');
    if (nw.length < 6) return window.showAlert('Lỗi nhập liệu', 'Mật khẩu tối thiểu 6 ký tự!', 'warning');
    
    try {
        const res = await fetch('/api/admin/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: cur, newPassword: nw })
        });
        const data = await res.json();
        
        if (res.ok) {
            sessionStorage.setItem('admin_pw_b64', btoa(nw));
            window.showAlert('Thành công', 'Đổi mật khẩu thành công! Hệ thống sẽ yêu cầu đăng nhập lại.', 'success');
            setTimeout(() => { window.doLogout(); }, 2000);
        } else {
            window.showAlert('Từ chối', data.error || 'Mật khẩu cũ không chính xác.', 'error');
        }
    } catch(e) { window.showAlert('Lỗi', 'Không kết nối được server.', 'error'); }
}

window.clearAllHistory = async function() {
    window.showConfirm(async () => {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        try {
            const emptyDb = JSON.stringify([]);
            const blob = new Blob([emptyDb], { type: 'application/json' });
            const formData = new FormData();
            formData.append('dbfile', blob, 'database.json');
            
            const res = await fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { 
                method: 'POST', body: formData 
            });
            
            if (res.ok) {
                window.showAlert('Đã Xóa', 'Đã xóa trắng toàn bộ dữ liệu lịch sử thi!', 'success');
                if (typeof window.loadData === 'function') window.loadData();
            } else { window.showAlert('Lỗi', 'Không thể xóa dữ liệu.', 'error'); }
        } catch(e) { window.showAlert('Lỗi mạng', 'Mất kết nối máy chủ.', 'error'); }
    }, 'CẢNH BÁO XÓA DỮ LIỆU', 'Toàn bộ dữ liệu lịch sử thi sẽ bị xóa vĩnh viễn khỏi hệ thống. Bạn có chắc chắn muốn làm điều này?', 'danger');
}

setTimeout(window.renderSettingsTab, 300);