let currentPage = 1;
const rowsPerPage = 20;

window.selectedHistoryIds = new Set();

window.getHistoryTbody = function() {
    return document.getElementById('admin-tbody') || 
           document.getElementById('admin-history-tbody') || 
           document.querySelector('.admin-table tbody');
};

// ─── CỖ MÁY CHUẨN HÓA ĐỒNG BỘ 100% TÊN BÀI THI (FIX LỖI DẤU NGOẶC) ───
window.formatExamNameVi = function(str) {
    if (!str) return 'Bài thi chung';
    let s = String(str).trim();
    
    // 1. Lột xác dữ liệu cũ: Nếu có ngoặc đơn, bóc lõi bên trong ra
    // (VD: "An Toàn Chuyên Sâu (An Toàn Hàn Cắt)" -> "An Toàn Hàn Cắt")
    const match = s.match(/\(([^)]+)\)/);
    if (match && match[1]) {
        s = match[1];
    }
    
    // 2. Viết hoa chữ cái đầu tiên của MỌI từ (Kể cả sau khoảng trắng, dấu ngoặc, dấu &, dấu +)
    s = s.toLowerCase().replace(/(?:^|[\s&+\-(]+)\S/g, m => m.toUpperCase());
    
    // 3. Ép hoa tuyệt đối các từ viết tắt chuyên ngành
    s = s.replace(/Kghc/gi, 'KGHC');
    s = s.replace(/Atskmt/gi, 'ATSKMT');
    s = s.replace(/Pccc/gi, 'PCCC');
    
    // 4. Đồng bộ tên cũ về chuẩn chung
    if (s.toLowerCase() === 'etest') s = 'Đánh Giá Kiến Thức ATSKMT';
    
    return s.trim();
};

window.formatExamNameEn = function(str) {
    if (!str) return 'HSE Exam';
    let s = String(str).trim();
    
    const match = s.match(/\(([^)]+)\)/);
    if (match && match[1]) {
        s = match[1];
    }
    
    s = s.toLowerCase().replace(/(?:^|[\s&+\-(]+)\S/g, m => m.toUpperCase());
    s = s.replace(/Kghc/gi, 'Confined Space');
    if (s.toLowerCase() === 'etest') s = 'HSE Knowledge Assessment';
    
    return s.trim();
};

window.loadHistory = async function(isSilent = false) {
    const tbody = window.getHistoryTbody();
    if (tbody && !isSilent) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px; color:#4f46e5; font-weight:700; font-size: 1.1rem;">⏳ Đang tải và dọn dẹp dữ liệu...</td></tr>';
    }
    
    const htmlExportBtn = document.querySelector('.btn-export');
    if (htmlExportBtn && !isSilent) htmlExportBtn.style.display = 'none';
    
    try {
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        const res = await fetch(`/api/history`);
        let data = await res.json();
        
        if (data && Array.isArray(data)) {
            const nameDictionary = {
                "Duong Ngoc Thinh": "Dương Ngọc Thịnh",
                "Nguyen Le Hoang Dat": "Nguyễn Lê Hoàng Đạt",
                "Nguyen Thanh Linh": "Nguyễn Thành Linh",
                "Nguyen Van Dao": "Nguyễn Văn Đảo",
                "Bui Thuan": "Bùi Thuận"
            };

            const spamCompanies = ['A', 'SAO', 'BBBB', 'ƯE', 'P', 'SA', 'SD', 'SDSD', 'PM', 'S', 'Ê', 'SDD', 'DA'];

            let dbNeedsUpdate = false;
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
                            r.userName = withAccent; r.name = withAccent;
                            if (r.details && r.details.userName) r.details.userName = withAccent;
                            dbNeedsUpdate = true;
                        }
                        break;
                    }
                }
            });

            if (dbNeedsUpdate && !isSilent) {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const formData = new FormData();
                formData.append('dbfile', blob, 'database.json');
                fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData }).catch(e=>console.log(e));
            }

            data.forEach(r => {
                let tCount = r.totalQuestions || r.totalCount || 30;
                let cCount = r.correctCount;
                if (cCount === undefined && r.score !== undefined) cCount = Math.round((r.score / 100) * tCount);
                if (cCount !== undefined && tCount) {
                    r.isPass = (tCount - cCount) <= 2;
                } else {
                    r.isPass = r.result === 'pass' || r.status === 'Đạt' || r.score >= 80;
                }
            });

            window.historyData = data.sort((a, b) => {
                const timeA = new Date(a.endTime || a.timestamp || a.examDate || a.createdAt || 0).getTime();
                const timeB = new Date(b.endTime || b.timestamp || b.examDate || b.createdAt || 0).getTime();
                return timeB - timeA;
            });

            if (!isSilent) {
                window.buildExamFilter(); 
                window.applyFilters(); 
            } else {
                const tabHistory = document.getElementById('tab-history');
                if (tabHistory && tabHistory.classList.contains('active')) {
                    window.renderHistoryTable(); 
                }
            }
            
            if (typeof window.renderStats === 'function') window.renderStats(window.historyData);
        } else {
            if (tbody && !isSilent) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px; color:#e11d48; font-weight:700;">Không có dữ liệu lịch sử thi</td></tr>';
        }
    } catch(e) {
        if (tbody && !isSilent) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 40px; color:#e11d48; font-weight:700;">⚠ Lỗi kết nối CSDL</td></tr>`;
    }
}

// ─── TỰ ĐỘNG CẬP NHẬT LỌC TÌM KIẾM THEO ĐÚNG DỮ LIỆU ĐÃ ĐƯỢC CHUẨN HÓA ───
window.buildExamFilter = function() {
    if (!window.historyData) return;
    
    // 1. Quét toàn bộ lịch sử thi, lấy tên và ép chuẩn bằng hàm ĐỒNG BỘ 100%
    const cleanNames = window.historyData.map(r => window.formatExamNameVi(r.examName));
    
    // 2. Dùng Set loại bỏ trùng lặp và sắp xếp theo A-Z
    const uniqueNames = [...new Set(cleanNames)].sort();
    
    const sel = document.getElementById('f-exam');
    if(!sel) return;
    
    // Giữ lại lựa chọn hiện tại nếu đang load ngầm (Auto-refresh)
    const currentVal = sel.value;
    
    sel.innerHTML = '<option value="">Tất cả bài thi</option>';
    uniqueNames.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; 
        opt.textContent = n; 
        sel.appendChild(opt);
    });
    
    // Phục hồi lại giá trị cũ nếu hợp lệ
    if (uniqueNames.includes(currentVal)) {
        sel.value = currentVal;
    }
}

window.applyFilters = function() {
    currentPage = 1;
    window.renderHistoryTable();
};

window.getFilteredData = function() {
    if (!window.historyData) return [];

    const fCccd = (document.getElementById('f-cccd')?.value || '').toLowerCase().trim();
    const fName = (document.getElementById('f-name')?.value || '').toLowerCase().trim();
    const fComp = (document.getElementById('f-company')?.value || '').toLowerCase().trim();
    const fExam = document.getElementById('f-exam')?.value || '';
    const fStatus = document.getElementById('f-status')?.value || '';
    const fDate = document.getElementById('f-date')?.value || '';

    return window.historyData.filter(r => {
        const cccd = (r.userId || r.cccd || '').toLowerCase();
        const name = (r.userName || r.name || '').toLowerCase();
        const comp = (r.company || r.details?.company || '').toLowerCase();
        
        if (fCccd && !cccd.includes(fCccd)) return false;
        if (fName && !name.includes(fName)) return false;
        if (fComp && !comp.includes(fComp)) return false;
        
        // ĐỐI CHIẾU 1:1 - Khớp chính xác với tên Bài thi đã chuẩn hóa
        if (fExam && window.formatExamNameVi(r.examName) !== fExam) return false;
        
        if (fStatus === 'pass' && !r.isPass) return false;
        if (fStatus === 'fail' && r.isPass) return false;

        if (fDate) {
            const d = new Date(r.endTime || r.timestamp || r.examDate || r.createdAt);
            const rowDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (rowDate !== fDate) return false;
        }

        return true;
    });
};

window.resetFilters = function() {
    if(document.getElementById('f-cccd')) document.getElementById('f-cccd').value = ''; 
    if(document.getElementById('f-name')) document.getElementById('f-name').value = '';
    if(document.getElementById('f-company')) document.getElementById('f-company').value = '';
    if(document.getElementById('f-exam')) document.getElementById('f-exam').value = ''; 
    if(document.getElementById('f-status')) document.getElementById('f-status').value = ''; 
    if(document.getElementById('f-date')) document.getElementById('f-date').value = '';
    window.selectedHistoryIds.clear(); 
    window.applyFilters();
}

window.renderHistoryTable = function() {
    const tbody = window.getHistoryTbody();
    if (!tbody) return;

    const filteredData = window.getFilteredData();

    const theadTr = tbody.closest('table').querySelector('thead tr');
    if (theadTr && !theadTr.querySelector('.th-chk')) {
        const th = document.createElement('th');
        th.className = 'th-chk';
        th.style.width = '40px';
        th.innerHTML = '<input type="checkbox" class="chk-all" onchange="window.toggleAllChecks(this)" style="transform: scale(1.3); cursor: pointer; accent-color: #4f46e5;">';
        theadTr.insertBefore(th, theadTr.firstChild);
    }

    if (!filteredData || filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 60px 20px; color:#64748b; font-weight:600;">Danh sách trống.</td></tr>';
        document.querySelectorAll('.pagination-container').forEach(e => e.remove());
        const tableMeta = document.getElementById('table-meta');
        if(tableMeta) tableMeta.textContent = `Hiển thị 0 kết quả`;
        window.updateBulkDeleteBtn();
        return;
    }

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1; 
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedData.map((row, index) => {
        const actualIdx = window.historyData.indexOf(row); 
        const cccd = row.userId || row.cccd || 'N/A';
        const name = row.userName || row.name || 'N/A';
        const comp = (row.company || 'N/A').toUpperCase();

        const timeValue = row.endTime || row.timestamp || row.examDate || row.createdAt || Date.now();
        const dateObj = new Date(timeValue);
        const dateStr = dateObj.toLocaleDateString('vi-VN');
        
        let startObj = row.startTime ? new Date(row.startTime) : new Date(dateObj.getTime());
        const startStr = startObj.toLocaleTimeString('vi-VN', { hour12: false }); 
        const endStr = dateObj.toLocaleTimeString('vi-VN', { hour12: false });

        // SỬ DỤNG HÀM CHUẨN HÓA TÊN BÀI THI LÚC RENDER BẢNG
        const examNameVi = window.formatExamNameVi(row.examName);
        const examNameEn = window.formatExamNameEn(row.examNameEn || row.examName);

        let tCount = row.totalQuestions || row.totalCount;
        let cCount = row.correctCount;
        if (!tCount) tCount = (examNameVi.toLowerCase().includes('đánh giá') || examNameVi.toLowerCase().includes('chuyên sâu')) ? 50 : 30;
        if (cCount === undefined && row.score !== undefined) cCount = Math.round((row.score / 100) * tCount);

        let fraction = (cCount !== undefined && tCount) ? `${cCount}/${tCount}` : '-';
        const scoreRaw = row.score !== undefined ? row.score : '-';
        const scorePercent = row.percentage !== undefined ? `${row.percentage}%` : (scoreRaw <= 100 && scoreRaw !== '-' ? `${scoreRaw}%` : '');

        const isBanned = (row.status && row.status.toLowerCase().includes('đình chỉ')) || (row.result && row.result.toLowerCase().includes('đình chỉ'));
        const rowStyle = isBanned ? 'background-color: #fff1f2;' : '';
        let statusBadgeHTML = '';
        
        const hoverAttrs = isBanned 
            ? `onmouseover="this.style.backgroundColor='var(--hover-bg, #ffe4e6)'" onmouseout="this.style.backgroundColor='var(--bg-card, #fff1f2)'"` 
            : '';

        if (isBanned) {
            statusBadgeHTML = '<span class="badge" style="background: #e11d48; color: #fff; border: none; padding: 6px 14px; box-shadow: 0 4px 10px rgba(225, 29, 72, 0.3);">CẤM THI</span>';
        } else {
            statusBadgeHTML = `<span class="badge ${row.isPass ? 'pass' : 'fail'}">${row.isPass ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT'}</span>`;
        }

        const ipStr = row.ip || 'Chưa ghi nhận';
        const deviceStr = row.deviceType ? `${row.deviceType} - ${row.deviceName}` : 'Chưa ghi nhận';
        const deviceIcon = row.deviceType === 'Điện thoại' ? '📱' : (row.deviceType === 'Máy tính bảng' ? '📟' : '🖥️');

        return `
        <tr id="row-${row.timestamp || row.id}" class="history-card-row" style="${rowStyle}" ${hoverAttrs}>
            <td style="text-align: center;">
                <input type="checkbox" class="row-chk" value="${actualIdx}" onchange="window.updateBulkDeleteBtn()" style="transform: scale(1.3); cursor: pointer; accent-color: #4f46e5;" ${window.selectedHistoryIds.has(String(actualIdx)) ? 'checked' : ''}>
            </td>
            <td class="td-num">${startIndex + index + 1}</td>
            
            <td style="text-align: center;">
                <span class="editable-text" onclick="window.makeEditable(this, ${actualIdx}, 'userId')" title="Nhấn để sửa"><strong>${cccd}</strong></span>
            </td>
            
            <td class="td-name">
                <span class="editable-text" onclick="window.makeEditable(this, ${actualIdx}, 'userName')" title="Nhấn để sửa">${name}</span>
                <br>
                <div style="display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 5px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s ease;" 
                     onclick="window.showModernModal({title: 'Thiết bị & Kết nối', msg: '<div style=\\'text-align:left; font-size:1.05rem; line-height:1.8; color:var(--text-main, #334155); background:var(--bg-body, #f8fafc); padding:20px; border-radius:16px; border:1px solid var(--border-color, #e2e8f0);\\'><b>👤 Thí sinh:</b> <span style=\\'font-weight:800;\\'>${name}</span><br><b>💳 Định danh:</b> <span style=\\'font-weight:800;\\'>${cccd}</span><hr style=\\'border:none; border-top:1px dashed var(--border-color, #cbd5e1); margin:12px 0;\\'><b>🌐 Địa chỉ IP:</b> <span style=\\'color:#e11d48; font-family:monospace; font-weight:800; background:rgba(225,29,72,0.1); padding:3px 8px; border-radius:6px;\\'>${ipStr}</span><br><b>🖥️ Thiết bị:</b> <span style=\\'color:#059669; font-weight:800; background:rgba(16,185,129,0.1); padding:3px 8px; border-radius:6px;\\'>${deviceIcon} ${deviceStr}</span></div>', type: 'default'})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    Xem Máy & IP
                </div>
            </td>
            
            <td class="td-company">
                <span class="editable-text" onclick="window.makeEditable(this, ${actualIdx}, 'company')" title="Nhấn để sửa"><span style="background: #f1f5f9; padding: 4px 10px; border-radius: 8px;">${comp}</span></span>
            </td>
            
            <td style="text-align: center;">
                <div class="time-box">
                    <div class="time-date-badge">📅 ${dateStr}</div>
                    <div class="time-range-badge"><span class="t-start">${startStr}</span> <span class="t-arrow">→</span> <span class="t-end">${endStr}</span></div>
                </div>
            </td>
            
            <td style="text-align: center;">
                <span class="exam-name-vi">${examNameVi}</span>
                <span class="exam-name-en">${examNameEn}</span>
            </td>
            
            <td class="td-score">
                <span class="score-pct">${scorePercent}</span>
                ${fraction}
            </td>
            <td style="text-align: center;">
                ${statusBadgeHTML}
            </td>
            <td style="text-align: center;">
                <div class="action-cell" id="actions-${row.timestamp || row.id}">
                    <button class="btn-review" onclick="window.viewHistoryDetail(${actualIdx})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Xem
                    </button>
                    <button class="btn-delete" onclick="window.deleteHistory(${actualIdx})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Xóa
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPaginationControls(totalPages);
    const tableMeta = document.getElementById('table-meta');
    if(tableMeta) tableMeta.textContent = `Hiển thị ${filteredData.length} kết quả (Trang ${currentPage}/${totalPages})`;
    
    setTimeout(() => { window.updateBulkDeleteBtn(); }, 50);
}

window.toggleAllChecks = function(cb) {
    const checkboxes = document.querySelectorAll('.row-chk');
    checkboxes.forEach(chk => {
        chk.checked = cb.checked;
        if (cb.checked) window.selectedHistoryIds.add(chk.value);
        else window.selectedHistoryIds.delete(chk.value);
    });
    window.updateBulkDeleteBtn();
}

window.updateBulkDeleteBtn = function() {
    const checkboxes = document.querySelectorAll('.row-chk');
    checkboxes.forEach(chk => {
        if (chk.checked) window.selectedHistoryIds.add(chk.value);
        else window.selectedHistoryIds.delete(chk.value);
    });

    let bulkWrap = document.getElementById('bulk-action-wrap');
    if (!bulkWrap) {
        const tableMeta = document.getElementById('table-meta');
        if (tableMeta) {
            bulkWrap = document.createElement('div');
            bulkWrap.id = 'bulk-action-wrap';
            bulkWrap.style.display = 'flex';
            bulkWrap.style.justifyContent = 'space-between';
            bulkWrap.style.alignItems = 'center';
            bulkWrap.style.marginBottom = '15px';
            tableMeta.parentNode.insertBefore(bulkWrap, tableMeta);
            bulkWrap.appendChild(tableMeta); 
            tableMeta.style.marginBottom = '0';
            
            const btn = document.createElement('button');
            btn.id = 'btn-bulk-delete';
            btn.className = 'btn-modern btn-modern-danger';
            btn.style.padding = '10px 20px';
            btn.style.display = 'none';
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> <span style="margin-left: 6px;">Xóa (<span id="bulk-delete-count">0</span>) dòng</span>';
            btn.onclick = window.bulkDeleteHistory;
            bulkWrap.appendChild(btn);
        }
    }

    const btn = document.getElementById('btn-bulk-delete');
    if (btn) {
        if (window.selectedHistoryIds.size > 0) {
            btn.style.display = 'inline-flex';
            document.getElementById('bulk-delete-count').textContent = window.selectedHistoryIds.size;
        } else {
            btn.style.display = 'none';
        }
    }

    const chkAll = document.querySelector('.chk-all');
    if (chkAll) {
        if (checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(c => c.checked);
            chkAll.checked = allChecked;
        } else {
            chkAll.checked = false;
        }
    }
}

window.bulkDeleteHistory = async function() {
    if (window.selectedHistoryIds.size === 0) return;
    
    window.showConfirm(async () => {
        window.showToast("Đang xử lý xóa hàng loạt...", "warning");
        const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
        
        const indexes = Array.from(window.selectedHistoryIds).map(Number).sort((a,b) => b - a);
        let successCount = 0;
        
        for (let idx of indexes) {
            const row = window.historyData[idx];
            if (row) {
                try {
                    const res = await fetch(`/api/history/${row.timestamp || row.id}`, { method: 'DELETE', headers: { 'x-admin-pw': pw } });
                    if (res.ok) {
                        successCount++;
                        window.historyData.splice(idx, 1);
                    }
                } catch (e) { console.error(e); }
            }
        }
        
        window.selectedHistoryIds.clear();
        window.renderHistoryTable(); 
        if (typeof window.renderStats === 'function') window.renderStats(window.historyData);
        window.showToast(`Đã xóa thành công ${successCount} bản ghi!`, "success");
        
    }, "Xóa nhiều bản ghi", `Bạn có chắc chắn muốn xóa vĩnh viễn ${window.selectedHistoryIds.size} bản ghi đã chọn? Hành động này không thể hoàn tác.`, "danger");
}

function renderPaginationControls(totalPages) {
    document.querySelectorAll('.pagination-container').forEach(e => e.remove());

    if (totalPages <= 1) return;

    let html = `<button class="page-btn" onclick="window.changePage(${currentPage - 1}, ${totalPages})" ${currentPage === 1 ? 'disabled' : ''}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="window.changePage(1, ${totalPages})">1</button>`;
        if (startPage > 2) html += `<span class="page-dots">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.changePage(${i}, ${totalPages})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="page-dots">...</span>`;
        html += `<button class="page-btn" onclick="window.changePage(${totalPages}, ${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="page-btn" onclick="window.changePage(${currentPage + 1}, ${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </button>`;

    html += `
        <div style="display:flex; align-items:center; gap:8px; margin-left: 15px; border-left: 2px solid var(--border-color, #e2e8f0); padding-left: 15px;">
            <span style="font-weight: 700; color: #64748b; font-size: 0.95rem;">Tới trang:</span>
            <input type="number" min="1" max="${totalPages}" placeholder="Go" style="width: 70px; height: 46px; border-radius: 12px; border: 1.5px solid #cbd5e1; text-align: center; font-weight: 800; font-size: 1rem; font-family: 'Plus Jakarta Sans', sans-serif; color: #4f46e5; outline: none; transition: 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);" onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#cbd5e1'" onkeydown="if(event.key==='Enter') window.changePage(parseInt(this.value), ${totalPages})">
        </div>
    `;

    const topPagination = document.createElement('div');
    topPagination.className = 'pagination-container';
    topPagination.innerHTML = html;

    const botPagination = document.createElement('div');
    botPagination.className = 'pagination-container';
    botPagination.innerHTML = html;

    const tableWrap = document.querySelector('.table-wrapper');
    if (tableWrap) {
        tableWrap.parentNode.insertBefore(topPagination, tableWrap); 
        tableWrap.parentNode.insertBefore(botPagination, tableWrap.nextSibling); 
    }
}

window.changePage = function(newPage, maxPage) {
    if (!newPage || isNaN(newPage)) return;
    if (maxPage !== undefined && newPage > maxPage) newPage = maxPage;
    if (newPage < 1) newPage = 1;
    currentPage = newPage;
    window.renderHistoryTable(); 
    const table = window.getHistoryTbody().closest('table');
    table.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', () => {
        currentPage = 1; 
        window.renderHistoryTable();
    });
});

window.deleteHistory = async function(idx) {
    window.showConfirm(async () => {
        try {
            const row = window.historyData[idx];
            const pw = window.getStoredPw ? window.getStoredPw() : localStorage.getItem('adminPassword');
            await fetch(`/api/history/${row.timestamp || row.id}`, { method: 'DELETE', headers: { 'x-admin-pw': pw } });
            
            window.historyData.splice(idx, 1);
            window.selectedHistoryIds.delete(String(idx)); 
            
            window.renderHistoryTable();
            window.showToast("Đã xóa bản ghi", "success");
            
            if (typeof window.renderStats === 'function') window.renderStats(window.historyData);
        } catch(e) {
            window.historyData.splice(idx, 1);
            window.renderHistoryTable();
        }
    }, "Xác nhận xóa", "Bạn có chắc chắn muốn xóa bản ghi thi này khỏi hệ thống?", "danger");
}

window.makeEditable = function(tdElement, idx, field) { 
    if (tdElement.querySelector('input')) return; 

    const rowData = window.historyData[idx];
    let val = '';
    if (field === 'userId') val = rowData.userId || rowData.cccd || '';
    if (field === 'userName') val = rowData.userName || rowData.name || '';
    if (field === 'company') val = rowData.company || '';

    const originalHtml = tdElement.innerHTML;

    tdElement.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; justify-content: center;">
            <input type="text" id="inline-${idx}-${field}" value="${val}" style="padding:6px 10px; border:2px solid #4f46e5; border-radius:8px; outline:none; font-size:0.9rem; font-weight:600; width:150px; font-family:'Inter', sans-serif;">
            <button onclick="window.saveInlineEdit(${idx}, '${field}', this, '${encodeURIComponent(originalHtml)}')" style="background:#10b981; color:#fff; border:none; padding:8px; border-radius:8px; cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
            <button onclick="window.cancelInlineEdit(this, '${encodeURIComponent(originalHtml)}')" style="background:var(--btn-bg, #f1f5f9); color:var(--btn-text, #64748b); border:none; padding:8px; border-radius:8px; cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
    `;
    const input = document.getElementById(`inline-${idx}-${field}`);
    input.focus();
    input.selectionStart = input.selectionEnd = input.value.length;
}

window.cancelInlineEdit = function(btn, originalHtmlEnc) {
    btn.closest('td').innerHTML = decodeURIComponent(originalHtmlEnc);
}

window.saveInlineEdit = async function(idx, field, btn, originalHtmlEnc) {
    const input = document.getElementById(`inline-${idx}-${field}`);
    const newVal = input.value.trim();
    if (!newVal) { window.showAlert('Lỗi', 'Không được để trống giá trị!', 'warning'); return; }

    const rowData = window.historyData[idx];
    if (field === 'userId') { 
        rowData.userId = newVal; 
        rowData.cccd = newVal; 
    }
    if (field === 'userName') { 
        const formattedName = newVal.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
        rowData.userName = formattedName; 
        rowData.name = formattedName; 
        if (rowData.details) rowData.details.userName = formattedName; 
    }
    if (field === 'company') { 
        const formattedComp = newVal.toUpperCase(); 
        rowData.company = formattedComp; 
        if (rowData.details) rowData.details.company = formattedComp; 
    }

    btn.innerHTML = '⏳...'; 
    btn.disabled = true;

    try {
        const pw = window.getStoredPw();
        const blob = new Blob([JSON.stringify(window.historyData, null, 2)], { type: 'application/json' });
        const formData = new FormData();
        formData.append('dbfile', blob, 'database.json');
        
        const res = await fetch(`/api/database/upload?adminPassword=${encodeURIComponent(pw)}`, { method: 'POST', body: formData });
        if (res.ok) {
            window.showToast("Cập nhật thành công!", "success");
            window.renderHistoryTable();
            if (typeof window.renderStats === 'function') window.renderStats(window.historyData);
        } else {
            window.showAlert("Lỗi", "Không thể lưu vào CSDL. Hãy kiểm tra quyền truy cập.", "error");
            window.cancelInlineEdit(btn, originalHtmlEnc);
        }
    } catch(e) {
        window.showAlert("Lỗi kết nối", "Hệ thống mất mạng.", "error");
        window.cancelInlineEdit(btn, originalHtmlEnc);
    }
}

window.viewHistoryDetail = function(idx) { 
    try {
        const rowData = window.historyData[idx];
        sessionStorage.setItem('reviewExamData', JSON.stringify(rowData));
        sessionStorage.setItem('currentUserId', rowData.userId || rowData.cccd || 'N/A');
        sessionStorage.setItem('cachedUserName', rowData.userName || rowData.name || 'Thí sinh ẩn danh');
        sessionStorage.setItem('cachedCompany', (rowData.company || '').toUpperCase());
        window.open('../giaodienthi/exam.html', '_blank'); 
    } catch(e) { window.showAlert("Lỗi dữ liệu", "Lỗi đọc dữ liệu hệ thống.", "error"); }
}

window.loadHistory();

setInterval(() => {
    if (window.selectedHistoryIds && window.selectedHistoryIds.size > 0) return;
    const tbody = window.getHistoryTbody();
    if (tbody && tbody.querySelector('input[type="text"]')) return;
    if (document.getElementById('modern-modal-overlay')) return;

    window.loadHistory(true);
}, 10000);