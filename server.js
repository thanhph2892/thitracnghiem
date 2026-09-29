const express = require('express');
const fs = require('fs');
const fsp = require('fs').promises; 
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

const CONFIG_FILE = path.join(__dirname, 'config.json');
let sysConfig = { adminPassword: 'admin@hse', sharePointUrl: '', appName: 'Safety Portal HSE' };
if (fs.existsSync(CONFIG_FILE)) {
    try { sysConfig = { ...sysConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; } catch(e) {}
} else {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(sysConfig, null, 2));
}

const EXAMS_CONFIG_FILE = path.join(__dirname, 'exams-config.json');
function loadExamsConfig() {
    try { return JSON.parse(fs.readFileSync(EXAMS_CONFIG_FILE, 'utf8')); } catch(e) { return { basic: [], advanced: [] }; }
}
function saveExamsConfig(cfg) {
    fs.writeFileSync(EXAMS_CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

const QBANK_DIR = path.join(__dirname, 'nganhangcauhoi');
if (!fs.existsSync(QBANK_DIR)) fs.mkdirSync(QBANK_DIR);

const TEMP_UPLOAD_DIR = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(TEMP_UPLOAD_DIR)) fs.mkdirSync(TEMP_UPLOAD_DIR);

let dbLock = false;
const dbQueue = [];

async function processDbQueue() {
    if (dbLock || dbQueue.length === 0) return;
    dbLock = true;
    const task = dbQueue.shift();
    try {
        await task.operation();
        task.resolve();
    } catch (error) {
        task.reject(error);
    } finally {
        dbLock = false;
        processDbQueue();
    }
}

function safeDbOperation(operation) {
    return new Promise((resolve, reject) => {
        dbQueue.push({ operation, resolve, reject });
        processDbQueue();
    });
}

const AUDIT_FILE = path.join(__dirname, 'audit_log.json');
if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, JSON.stringify([]));

async function logAdminAction(action, details, req) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip && typeof ip === 'string') {
        ip = ip.split(',')[0].trim();
        if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
    }
    
    const logEntry = {
        timestamp: Date.now(),
        action: action,
        details: details,
        ip: ip
    };

    try {
        await safeDbOperation(async () => {
            const raw = await fsp.readFile(AUDIT_FILE, 'utf8');
            let logs = JSON.parse(raw);
            logs.unshift(logEntry); 
            if (logs.length > 500) logs = logs.slice(0, 500); 
            await fsp.writeFile(AUDIT_FILE, JSON.stringify(logs, null, 2));
        });
    } catch(e) { console.error("Lỗi ghi Audit Log", e); }
}

app.get('/api/admin/audit-records', async (req, res) => {
    const adminPw = req.query.adminPassword || req.headers['x-admin-pw'];
    if (adminPw !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    try {
        const raw = await fsp.readFile(AUDIT_FILE, 'utf8');
        res.json(JSON.parse(raw));
    } catch(e) { res.status(500).json({ error: 'Lỗi đọc log' }); }
});

const activeSessions = new Map();
const SESSION_TIMEOUT = 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [id, data] of activeSessions.entries()) {
        if (now - data.lastSeen > SESSION_TIMEOUT) activeSessions.delete(id);
    }
}, 30000);

app.post('/api/ping', (req, res) => {
    const { sessionId, userId, userName, company, examName, examNameEn, startTime } = req.body;
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    if (ip && typeof ip === 'string') {
        ip = ip.split(',')[0].trim();
        if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
    }
    
    const ua = req.headers['user-agent'] || '';
    
    let deviceType = 'PC / Laptop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        deviceType = 'Máy tính bảng';
    } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle/i.test(ua)) {
        deviceType = 'Điện thoại';
    }
    
    let deviceName = 'Không xác định';
    if (ua.includes('Windows')) deviceName = 'Windows';
    else if (ua.includes('Mac OS')) deviceName = 'MacOS';
    else if (ua.includes('Linux')) deviceName = 'Linux';
    else if (ua.includes('Android')) deviceName = 'Android';
    else if (ua.includes('iPhone')) deviceName = 'iOS (iPhone)';
    else if (ua.includes('iPad')) deviceName = 'iOS (iPad)';
    
    if (ua.includes('Edg/')) deviceName += ' (Edge)';
    else if (ua.includes('Chrome/') || ua.includes('CriOS/')) deviceName += ' (Chrome)';
    else if (ua.includes('Safari/') && !ua.includes('Chrome') && !ua.includes('CriOS')) deviceName += ' (Safari)';
    else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) deviceName += ' (Firefox)';
    else if (ua.includes('Coccoc/')) deviceName += ' (Cốc Cốc)';

    if (sessionId) {
        const existing = activeSessions.get(sessionId) || {};
        if (existing.forceSubmit) {
            res.json({ online: activeSessions.size, forceSubmit: true, reason: existing.forceReason });
            activeSessions.delete(sessionId);
            return;
        }

        activeSessions.set(sessionId, {
            lastSeen: Date.now(),
            userId: userId || existing.userId || '',
            userName: userName || existing.userName || '',
            company: company || existing.company || '',
            examName: examName || existing.examName || '',
            examNameEn: examNameEn || existing.examNameEn || '',
            startTime: startTime || existing.startTime || Date.now(),
            ip: ip, deviceType: deviceType, deviceName: deviceName
        });
    }
    res.json({ online: activeSessions.size });
});

app.post('/api/admin/force-submit', (req, res) => {
    const { adminPassword, sessionId, reason } = req.body;
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu' });
    
    if (activeSessions.has(sessionId)) {
        let session = activeSessions.get(sessionId);
        session.forceSubmit = true;
        session.forceReason = reason || 'Quản trị viên đã đình chỉ bài thi của bạn do vi phạm quy chế.';
        activeSessions.set(sessionId, session);
        logAdminAction('ĐÌNH CHỈ THI', `Đã ép thu bài thí sinh: ${session.userName} (${session.userId}). Lý do: ${session.forceReason}`, req);
        res.json({ ok: true });
    } else {
        res.status(404).json({ error: 'Phiên thi không tồn tại hoặc đã kết thúc' });
    }
});

app.get('/api/online', (req, res) => { res.json({ online: activeSessions.size }); });
app.get('/api/active-exams', (req, res) => {
    const now = Date.now();
    const active = [];
    for (const [id, data] of activeSessions.entries()) {
        if (now - data.lastSeen <= SESSION_TIMEOUT) {
            active.push({ sessionId: id, ...data });
        }
    }
    res.json(active);
});

// SỬA LỖI ĐỌC THƯ MỤC TIẾNG VIỆT
app.get('/api/public/qbanks/:folder/files', (req, res) => {
    const folder = decodeURIComponent(req.params.folder);
    if (folder.includes('..')) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
    const folderPath = path.join(QBANK_DIR, folder);
    if (!fs.existsSync(folderPath)) return res.json([]);
    try {
        let allFiles = [];
        function scanDir(dir, relPrefix = '') {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            files.forEach(file => {
                if (file.isDirectory()) { scanDir(path.join(dir, file.name), relPrefix + file.name + '/'); } 
                else { allFiles.push(relPrefix + file.name); }
            });
        }
        scanDir(folderPath); res.json(allFiles);
    } catch(e) { res.json([]); }
});

app.get('/api/public/qbanks/all-json', (req, res) => {
    try {
        let allJson = [];
        const folders = fs.readdirSync(QBANK_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
        folders.forEach(folder => {
            const folderPath = path.join(QBANK_DIR, folder.name);
            function scanDir(dir, relPrefix = '') {
                const files = fs.readdirSync(dir, { withFileTypes: true });
                files.forEach(file => {
                    if (file.isDirectory()) { scanDir(path.join(dir, file.name), relPrefix + file.name + '/'); } 
                    else if (file.name.toLowerCase().endsWith('.json')) { allJson.push(`${folder.name}/${relPrefix}${file.name}`); }
                });
            }
            scanDir(folderPath);
        });
        res.json(allJson);
    } catch(e) { res.json([]); }
});

app.get('/api/exams-config', (req, res) => { res.json(loadExamsConfig()); });
app.post('/api/exams-config', (req, res) => {
    const { adminPassword, config } = req.body;
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    try {
        saveExamsConfig(config);
        logAdminAction('CẬP NHẬT MENU', 'Cập nhật danh sách Menu bài thi', req);
        res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: 'Lỗi lưu cấu hình' }); }
});

const dbUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
app.post('/api/database/upload', dbUpload.single('dbfile'), async (req, res) => {
    const adminPw = req.query.adminPassword || req.headers['x-admin-pw'];
    if (adminPw !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    if (!req.file) return res.status(400).json({ error: 'Không nhận được file' });
    try {
        const data = JSON.parse(req.file.buffer.toString('utf8'));
        if (!Array.isArray(data)) return res.status(400).json({ error: 'File phải chứa mảng JSON' });
        
        await safeDbOperation(async () => { await fsp.writeFile(DB_FILE, req.file.buffer); });
        if(data.length === 0) logAdminAction('XÓA DỮ LIỆU', 'Đã xóa toàn bộ Lịch sử thi', req);
        else logAdminAction('PHỤC HỒI DB', `Tải lên file database (${data.length} bản ghi)`, req);

        res.json({ ok: true, message: 'Đã thay thế database.json thành công!' });
    } catch(e) { res.status(400).json({ error: 'File JSON không hợp lệ: ' + e.message }); }
});

const folderUploadDisk = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, TEMP_UPLOAD_DIR),
        filename: (req, file, cb) => cb(null, `up_${Date.now()}_${Math.random().toString(36).substring(2,8)}`)
    }), limits: { files: 20000, fieldSize: 50 * 1024 * 1024 }
});

app.post('/api/qbanks/upload-folder', folderUploadDisk.any(), (req, res) => {
    const adminPw = req.query.adminPassword;
    if (adminPw !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Không nhận được file nào' });

    try {
        let folderName = ''; let paths = req.body.paths;
        if (!paths) return res.status(400).json({ error: 'Thiếu dữ liệu đường dẫn' });
        if (!Array.isArray(paths)) paths = [paths];

        // GIỮ NGUYÊN TÊN TIẾNG VIỆT CHO FOLDER
        if (paths.length > 0) folderName = paths[0].split('/')[0].trim();
        if (!folderName) folderName = `qbank_${Date.now()}`;

        const destDir = path.join(QBANK_DIR, folderName);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        req.files.forEach((file, i) => {
            const relPath = paths[i];
            if (!relPath) { fs.unlinkSync(file.path); return; }
            const parts = relPath.split('/'); parts.shift(); 
            const safeRelPath = parts.join('/');

            if (safeRelPath) { 
                const fullPath = path.join(destDir, safeRelPath);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.copyFileSync(file.path, fullPath); fs.unlinkSync(file.path);
            } else { fs.unlinkSync(file.path); }
        });

        logAdminAction('TẢI NGÂN HÀNG', `Tải lên thư mục câu hỏi: ${folderName}`, req);
        res.json({ ok: true, message: `Đã cập nhật thư mục "${folderName}" thành công` });
    } catch(e) {
        if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch(err){} });
        res.status(500).json({ error: 'Lỗi khi lưu thư mục: ' + e.message });
    }
});

app.get('/api/qbanks', (req, res) => {
    const adminPassword = req.query.adminPassword || req.headers['x-admin-pw'];
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    try {
        const folders = fs.readdirSync(QBANK_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
                const folderPath = path.join(QBANK_DIR, d.name);
                const stat = fs.statSync(folderPath);
                let jsonCount = 0; let totalFiles = 0; let totalSize = 0;
                function scanDir(dir) {
                    const files = fs.readdirSync(dir, { withFileTypes: true });
                    files.forEach(file => {
                        const fullPath = path.join(dir, file.name);
                        if (file.isDirectory()) { scanDir(fullPath); } 
                        else { totalFiles++; totalSize += fs.statSync(fullPath).size; if (file.name.toLowerCase().endsWith('.json')) jsonCount++; }
                    });
                }
                scanDir(folderPath);
                return { name: d.name, jsonCount, fileCount: totalFiles, sizeMB: (totalSize / 1024 / 1024).toFixed(1), uploadTime: stat.mtime.getTime() };
            });
        folders.sort((a, b) => b.uploadTime - a.uploadTime);
        res.json(folders);
    } catch(e) { res.status(500).json({ error: 'Lỗi đọc thư mục' }); }
});

app.get('/api/qbanks/:folder/all-files', (req, res) => {
    const folder = decodeURIComponent(req.params.folder);
    if (folder.includes('..')) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
    const folderPath = path.join(QBANK_DIR, folder);
    if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    try {
        let allFiles = [];
        function scanDir(dir, relPrefix = '') {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            files.forEach(file => {
                if (file.isDirectory()) { scanDir(path.join(dir, file.name), relPrefix + file.name + '/'); } 
                else { allFiles.push(relPrefix + file.name); }
            });
        }
        scanDir(folderPath); res.json(allFiles);
    } catch(e) { res.status(500).json({ error: 'Lỗi đọc chi tiết file' }); }
});

app.get('/api/qbanks/:folder/file', (req, res) => {
    const folder = decodeURIComponent(req.params.folder);
    const filePath = req.query.path;
    if (!filePath || filePath.includes('..') || folder.includes('..')) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
    const fullPath = path.join(QBANK_DIR, folder, filePath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Không tìm thấy file' });
    try { res.send(fs.readFileSync(fullPath, 'utf8')); } catch(e) { res.status(500).json({ error: 'Lỗi đọc file' }); }
});

app.put('/api/qbanks/:folder/file', (req, res) => {
    const { adminPassword, path: filePath, content } = req.body;
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    const folder = decodeURIComponent(req.params.folder);
    if (!filePath || filePath.includes('..') || folder.includes('..')) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
    const fullPath = path.join(QBANK_DIR, folder, filePath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Không tìm thấy file' });
    try {
        JSON.parse(content); fs.writeFileSync(fullPath, content, 'utf8');
        logAdminAction('SỬA JSON', `Sửa tệp ${filePath} trong thư mục ${folder}`, req);
        res.json({ ok: true, message: 'Đã lưu thành công' });
    } catch(e) { res.status(400).json({ error: 'Nội dung JSON bị lỗi cấu trúc' }); }
});

app.delete('/api/qbanks/:folder', (req, res) => {
    const { adminPassword } = req.body;
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    const folder = decodeURIComponent(req.params.folder);
    if (folder.includes('..')) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
    const folderPath = path.join(QBANK_DIR, folder);
    if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    try { 
        fs.rmSync(folderPath, { recursive: true, force: true }); 
        logAdminAction('XÓA NGÂN HÀNG', `Xóa thư mục câu hỏi: ${folder}`, req);
        res.json({ ok: true }); 
    } 
    catch(e) { res.status(500).json({ error: 'Lỗi xóa thư mục' }); }
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === sysConfig.adminPassword) { 
        logAdminAction('ĐĂNG NHẬP', 'Đăng nhập vào bảng điều khiển Admin thành công', req);
        res.json({ ok: true, sharePointUrl: sysConfig.sharePointUrl, appName: sysConfig.appName }); 
    } else { res.status(401).json({ ok: false }); }
});

app.post('/api/admin/password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (currentPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    sysConfig.adminPassword = newPassword;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(sysConfig, null, 2));
    logAdminAction('ĐỔI MẬT KHẨU', 'Admin đã thay đổi mật khẩu hệ thống', req);
    res.json({ ok: true });
});

app.get('/api/admin/config', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        res.json({ port: process.env.PORT || PORT, dbFile: DB_FILE, sharePointUrl: sysConfig.sharePointUrl, appName: sysConfig.appName, recordCount: data.length });
    } catch(e) { res.json({ port: process.env.PORT || PORT, dbFile: DB_FILE, sharePointUrl: sysConfig.sharePointUrl, appName: sysConfig.appName, recordCount: 0 }); }
});

app.post('/api/admin/settings', (req, res) => {
    const { currentPassword, sharePointUrl, appName } = req.body;
    if (currentPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Xác thực thất bại' });
    if (sharePointUrl !== undefined) sysConfig.sharePointUrl = sharePointUrl;
    if (appName !== undefined && appName.trim()) sysConfig.appName = appName.trim();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(sysConfig, null, 2));
    logAdminAction('SỬA CÀI ĐẶT', 'Thay đổi cấu hình hệ thống', req);
    res.json({ ok: true });
});

app.patch('/api/history/:timestamp', async (req, res) => {
    const ts = Number(req.params.timestamp);
    const { userId, userName, company } = req.body;
    try {
        await safeDbOperation(async () => {
            const raw = await fsp.readFile(DB_FILE, 'utf8');
            let data = JSON.parse(raw);
            const idx = data.findIndex(item => item.timestamp === ts);
            if (idx === -1) throw new Error('Không tìm thấy bản ghi');
            
            if (userId !== undefined) { data[idx].userId = userId; if (data[idx].details) data[idx].details.userId = userId; }
            if (userName !== undefined) { data[idx].userName = userName; if (data[idx].details) data[idx].details.userName = userName; }
            if (company !== undefined) { data[idx].company = company; if (data[idx].details) data[idx].details.company = company; }
            
            await fsp.writeFile(DB_FILE, JSON.stringify(data, null, 2));
        });
        logAdminAction('CHỈNH SỬA BÀI THI', `Chỉnh sửa thông tin thí sinh: ${userName} (${userId})`, req);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message || 'Lỗi cập nhật dữ liệu' }); }
});

app.delete('/api/history/:timestamp', async (req, res) => {
    const ts = Number(req.params.timestamp);
    try {
        await safeDbOperation(async () => {
            const raw = await fsp.readFile(DB_FILE, 'utf8');
            let data = JSON.parse(raw);
            const before = data.length;
            data = data.filter(item => item.timestamp !== ts);
            if (data.length === before) throw new Error('Không tìm thấy bản ghi');
            await fsp.writeFile(DB_FILE, JSON.stringify(data, null, 2));
        });
        logAdminAction('XÓA BÀI THI', `Đã xóa bản ghi thi có Timestamp: ${ts}`, req);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message || 'Lỗi xóa dữ liệu' }); }
});

app.get('/api/history', async (req, res) => {
    const cccd = req.query.cccd;
    try {
        const raw = await fsp.readFile(DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        res.json(cccd ? data.filter(item => item.userId === cccd) : data);
    } catch (error) { res.status(500).json({ error: 'Lỗi đọc dữ liệu' }); }
});

app.post('/api/history', async (req, res) => {
    const newRecord = req.body;
    
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip && typeof ip === 'string') {
        ip = ip.split(',')[0].trim();
        if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
    }
    newRecord.ip = ip;
    
    const ua = req.headers['user-agent'] || '';
    let deviceType = 'PC / Laptop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        deviceType = 'Máy tính bảng';
    } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle/i.test(ua)) {
        deviceType = 'Điện thoại';
    }
    newRecord.deviceType = deviceType;
    
    let deviceName = 'Không xác định';
    if (ua.includes('Windows')) deviceName = 'Windows';
    else if (ua.includes('Mac OS')) deviceName = 'MacOS';
    else if (ua.includes('Linux')) deviceName = 'Linux';
    else if (ua.includes('Android')) deviceName = 'Android';
    else if (ua.includes('iPhone')) deviceName = 'iOS (iPhone)';
    else if (ua.includes('iPad')) deviceName = 'iOS (iPad)';
    
    if (ua.includes('Edg/')) deviceName += ' (Edge)';
    else if (ua.includes('Chrome/') || ua.includes('CriOS/')) deviceName += ' (Chrome)';
    else if (ua.includes('Safari/') && !ua.includes('Chrome') && !ua.includes('CriOS')) deviceName += ' (Safari)';
    else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) deviceName += ' (Firefox)';
    else if (ua.includes('Coccoc/')) deviceName += ' (Cốc Cốc)';

    newRecord.deviceName = deviceName;

    try {
        await safeDbOperation(async () => {
            const raw = await fsp.readFile(DB_FILE, 'utf8');
            const data = JSON.parse(raw);
            const isExists = data.some(item => item.timestamp === newRecord.timestamp);
            if (!isExists) {
                data.unshift(newRecord);
                await fsp.writeFile(DB_FILE, JSON.stringify(data, null, 2));
            }
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Lỗi ghi dữ liệu bài thi' }); }
});

app.use((err, req, res, next) => {
    console.error('Lỗi hệ thống Server:', err);
    res.status(500).json({ error: err.message || 'Lỗi máy chủ không xác định' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`🚀 HỆ THỐNG HSE SERVER ĐÃ KHỞI ĐỘNG!`);
    console.log(`👉 Lỗi đường dẫn tiếng Việt đã được khắc phục hoàn toàn.`);
    console.log(`👉 Truy cập tại: http://localhost:${PORT}`);
    console.log(`=========================================\n`);
});