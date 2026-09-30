const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const admin = require("firebase-admin");

// ==========================================
// 1. KHỞI TẠO FIREBASE ADMIN (AN TOÀN)
// ==========================================
let db = null;
try {
    if (!process.env.FIREBASE_CREDENTIALS) {
        console.warn("⚠️ CẢNH BÁO: Không tìm thấy FIREBASE_CREDENTIALS. Các API Firebase sẽ bị lỗi.");
    } else {
        const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
        console.log("✅ Kết nối Firebase thành công!");
    }
} catch (error) {
    console.error("🔥 LỖI KHỞI TẠO FIREBASE:", error.message);
}

// ==========================================
// 2. CẤU HÌNH EXPRESS APP
// ==========================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// PHỤC VỤ GIAO DIỆN WEB (STATIC FILES)
app.use(express.static(__dirname));

// Mặc định cấu hình hệ thống
const defaultSysConfig = { adminPassword: 'admin@hse', sharePointUrl: '', appName: 'Safety Portal HSE' };
const defaultExamsConfig = { basic: [], advanced: [] };

// Hàm tiện ích lấy cấu hình từ Firestore
async function getSysConfig() {
    try {
        if (!db) throw new Error("Database chưa sẵn sàng");
        const doc = await db.collection('system').doc('config').get();
        if (doc.exists) return { ...defaultSysConfig, ...doc.data() };
        await db.collection('system').doc('config').set(defaultSysConfig);
        return defaultSysConfig;
    } catch(e) { return defaultSysConfig; }
}

async function getExamsConfig() {
    try {
        if (!db) throw new Error("Database chưa sẵn sàng");
        const doc = await db.collection('system').doc('exams').get();
        if (doc.exists) return doc.data();
        return defaultExamsConfig;
    } catch(e) { return defaultExamsConfig; }
}

// Hàm ghi Log Admin vào Firestore
async function logAdminAction(action, details, req) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip && typeof ip === 'string') ip = ip.split(',')[0].trim().replace('::ffff:', '');
    
    try {
        if (!db) return;
        await db.collection('audit_logs').add({
            timestamp: Date.now(),
            action: action,
            details: details,
            ip: ip
        });
    } catch(e) { console.error("Lỗi ghi Audit Log", e); }
}

// ==========================================
// 3. API ADMIN & HỆ THỐNG
// ==========================================
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const sysConfig = await getSysConfig();
    if (password === sysConfig.adminPassword) { 
        logAdminAction('ĐĂNG NHẬP', 'Đăng nhập vào bảng điều khiển Admin thành công', req);
        res.json({ ok: true, sharePointUrl: sysConfig.sharePointUrl, appName: sysConfig.appName }); 
    } else { res.status(401).json({ ok: false }); }
});

app.post('/api/admin/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const sysConfig = await getSysConfig();
    if (currentPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    
    try {
        if (!db) throw new Error("Lỗi kết nối CSDL");
        await db.collection('system').doc('config').update({ adminPassword: newPassword });
        logAdminAction('ĐỔI MẬT KHẨU', 'Admin đã thay đổi mật khẩu hệ thống', req);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Không thể cập nhật cấu hình' }); }
});

app.post('/api/admin/settings', async (req, res) => {
    const { currentPassword, sharePointUrl, appName } = req.body;
    const sysConfig = await getSysConfig();
    if (currentPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Xác thực thất bại' });
    
    const updates = {};
    if (sharePointUrl !== undefined) updates.sharePointUrl = sharePointUrl;
    if (appName !== undefined && appName.trim()) updates.appName = appName.trim();
    
    try {
        if (!db) throw new Error("Lỗi kết nối CSDL");
        await db.collection('system').doc('config').update(updates);
        logAdminAction('SỬA CÀI ĐẶT', 'Thay đổi cấu hình hệ thống', req);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Không thể cập nhật cấu hình' }); }
});

app.get('/api/admin/config', async (req, res) => {
    try {
        const sysConfig = await getSysConfig();
        let recordCount = 0;
        if (db) {
            const historySnapshot = await db.collection('history').count().get();
            recordCount = historySnapshot.data().count;
        }
        res.json({ 
            port: process.env.PORT || 5000, 
            dbFile: 'Firebase Firestore', 
            sharePointUrl: sysConfig.sharePointUrl, 
            appName: sysConfig.appName, 
            recordCount: recordCount 
        });
    } catch(e) { res.status(500).json({ error: 'Lỗi lấy cấu hình' }); }
});

app.get('/api/admin/audit-records', async (req, res) => {
    const adminPw = req.query.adminPassword || req.headers['x-admin-pw'];
    const sysConfig = await getSysConfig();
    if (adminPw !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    try {
        if (!db) throw new Error("Lỗi kết nối CSDL");
        const snapshot = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(500).get();
        const logs = [];
        snapshot.forEach(doc => logs.push(doc.data()));
        res.json(logs);
    } catch(e) { res.status(500).json({ error: 'Lỗi đọc log' }); }
});

app.get('/api/exams-config', async (req, res) => { res.json(await getExamsConfig()); });
app.post('/api/exams-config', async (req, res) => {
    const { adminPassword, config } = req.body;
    const sysConfig = await getSysConfig();
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    try {
        if (!db) throw new Error("Lỗi kết nối CSDL");
        await db.collection('system').doc('exams').set(config);
        logAdminAction('CẬP NHẬT MENU', 'Cập nhật danh sách Menu bài thi', req);
        res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: 'Lỗi lưu cấu hình' }); }
});

// ==========================================
// 4. API QUẢN LÝ LỊCH SỬ THI (FIRESTORE)
// ==========================================
const dbUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/api/database/upload', dbUpload.single('dbfile'), async (req, res) => {
    const adminPw = req.query.adminPassword || req.headers['x-admin-pw'];
    const sysConfig = await getSysConfig();
    if (adminPw !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    if (!req.file) return res.status(400).json({ error: 'Không nhận được file' });
    
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const data = JSON.parse(req.file.buffer.toString('utf8'));
        if (!Array.isArray(data)) return res.status(400).json({ error: 'File phải chứa mảng JSON' });
        
        // Cảnh báo: Batch write trên Firestore giới hạn 500 thao tác/lần.
        const chunks = [];
        for (let i = 0; i < data.length; i += 400) {
            const chunk = data.slice(i, i + 400);
            const batch = db.batch();
            chunk.forEach(record => {
                const docRef = db.collection('history').doc(record.timestamp.toString());
                batch.set(docRef, record);
            });
            chunks.push(batch.commit());
        }
        await Promise.all(chunks);

        logAdminAction('PHỤC HỒI DB', `Tải lên database Firebase (${data.length} bản ghi)`, req);
        res.json({ ok: true, message: 'Đã nhập dữ liệu vào Firestore thành công!' });
    } catch(e) { res.status(400).json({ error: 'Lỗi ghi Firebase: ' + e.message }); }
});

app.get('/api/history', async (req, res) => {
    const cccd = req.query.cccd;
    try {
        if (!db) throw new Error("Database chưa kết nối");
        let query = db.collection('history').orderBy('timestamp', 'desc');
        if (cccd) query = db.collection('history').where('userId', '==', cccd).orderBy('timestamp', 'desc');
        
        const snapshot = await query.get();
        const data = [];
        snapshot.forEach(doc => data.push(doc.data()));
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Lỗi đọc dữ liệu từ Firebase' }); }
});

app.post('/api/history', async (req, res) => {
    const newRecord = req.body;
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip && typeof ip === 'string') ip = ip.split(',')[0].trim().replace('::ffff:', '');
    newRecord.ip = ip;
    
    const ua = req.headers['user-agent'] || '';
    newRecord.deviceType = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) ? 'Máy tính bảng' : 
                           /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle/i.test(ua) ? 'Điện thoại' : 'PC / Laptop';
    newRecord.deviceName = ua.includes('Windows') ? 'Windows' : ua.includes('Mac OS') ? 'MacOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS (iPhone)' : 'Không xác định';

    try {
        if (!db) throw new Error("Database chưa kết nối");
        await db.collection('history').doc(newRecord.timestamp.toString()).set(newRecord);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Lỗi ghi dữ liệu bài thi' }); }
});

app.patch('/api/history/:timestamp', async (req, res) => {
    const ts = req.params.timestamp;
    const { userId, userName, company } = req.body;
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const updateData = {};
        if (userId !== undefined) { updateData.userId = userId; updateData['details.userId'] = userId; }
        if (userName !== undefined) { updateData.userName = userName; updateData['details.userName'] = userName; }
        if (company !== undefined) { updateData.company = company; updateData['details.company'] = company; }
        
        await db.collection('history').doc(ts).update(updateData);
        logAdminAction('CHỈNH SỬA BÀI THI', `Chỉnh sửa thông tin thí sinh: ${userName || userId}`, req);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Lỗi cập nhật dữ liệu' }); }
});

app.delete('/api/history/:timestamp', async (req, res) => {
    const ts = req.params.timestamp;
    try {
        if (!db) throw new Error("Database chưa kết nối");
        await db.collection('history').doc(ts).delete();
        logAdminAction('XÓA BÀI THI', `Đã xóa bản ghi thi có Timestamp: ${ts}`, req);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Lỗi xóa dữ liệu' }); }
});

// ==========================================
// 5. API NGÂN HÀNG CÂU HỎI (FIRESTORE)
// ==========================================
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { files: 2000, fieldSize: 50 * 1024 * 1024 } });

app.post('/api/qbanks/upload-folder', memoryUpload.any(), async (req, res) => {
    const adminPw = req.query.adminPassword;
    const sysConfig = await getSysConfig();
    if (adminPw !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Không nhận được file nào' });

    try {
        if (!db) throw new Error("Database chưa kết nối");
        let folderName = ''; let paths = req.body.paths;
        if (!paths) return res.status(400).json({ error: 'Thiếu dữ liệu đường dẫn' });
        if (!Array.isArray(paths)) paths = [paths];
        if (paths.length > 0) folderName = paths[0].split('/')[0].trim();
        if (!folderName) folderName = `qbank_${Date.now()}`;

        const batch = db.batch();
        const uploadTime = Date.now();

        req.files.forEach((file, i) => {
            const relPath = paths[i];
            if (!relPath) return;
            const parts = relPath.split('/'); parts.shift();
            const safeRelPath = parts.join('/');
            
            if (safeRelPath && file.originalname.toLowerCase().endsWith('.json')) { 
                const docRef = db.collection('qbanks').doc();
                batch.set(docRef, {
                    folder: folderName,
                    path: safeRelPath,
                    content: file.buffer.toString('utf8'),
                    size: file.size,
                    uploadTime: uploadTime
                });
            }
        });
        
        await batch.commit();
        logAdminAction('TẢI NGÂN HÀNG', `Tải lên thư mục câu hỏi lên Cloud: ${folderName}`, req);
        res.json({ ok: true, message: `Đã cập nhật thư mục "${folderName}" thành công` });
    } catch(e) { res.status(500).json({ error: 'Lỗi khi lưu thư mục: ' + e.message }); }
});

app.get('/api/qbanks', async (req, res) => {
    const adminPassword = req.query.adminPassword || req.headers['x-admin-pw'];
    const sysConfig = await getSysConfig();
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const snapshot = await db.collection('qbanks').get();
        const folderMap = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!folderMap[data.folder]) {
                folderMap[data.folder] = { name: data.folder, jsonCount: 0, fileCount: 0, sizeByte: 0, uploadTime: data.uploadTime || 0 };
            }
            folderMap[data.folder].fileCount++;
            if (data.path.toLowerCase().endsWith('.json')) folderMap[data.folder].jsonCount++;
            folderMap[data.folder].sizeByte += data.size || 0;
            if (data.uploadTime > folderMap[data.folder].uploadTime) folderMap[data.folder].uploadTime = data.uploadTime;
        });

        const folders = Object.values(folderMap).map(f => ({
            ...f,
            sizeMB: (f.sizeByte / 1024 / 1024).toFixed(3)
        })).sort((a, b) => b.uploadTime - a.uploadTime);
        
        res.json(folders);
    } catch(e) { res.status(500).json({ error: 'Lỗi đọc thư mục Firestore' }); }
});

app.get('/api/qbanks/:folder/all-files', async (req, res) => {
    const folder = decodeURIComponent(req.params.folder);
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const snapshot = await db.collection('qbanks').where('folder', '==', folder).get();
        const allFiles = [];
        snapshot.forEach(doc => allFiles.push(doc.data().path));
        res.json(allFiles);
    } catch(e) { res.status(500).json({ error: 'Lỗi truy vấn file' }); }
});

app.get('/api/public/qbanks/:folder/files', async (req, res) => {
    const folder = decodeURIComponent(req.params.folder);
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const snapshot = await db.collection('qbanks').where('folder', '==', folder).get();
        const allFiles = [];
        snapshot.forEach(doc => allFiles.push(doc.data().path));
        res.json(allFiles);
    } catch(e) { res.json([]); }
});

app.get('/api/public/qbanks/all-json', async (req, res) => {
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const snapshot = await db.collection('qbanks').get();
        const allJson = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.path.toLowerCase().endsWith('.json')) {
                allJson.push(`${data.folder}/${data.path}`);
            }
        });
        res.json(allJson);
    } catch(e) { res.json([]); }
});

app.get('/api/qbanks/:folder/file', async (req, res) => {
    const folder = decodeURIComponent(req.params.folder);
    const filePath = req.query.path;
    try {
        if (!db) throw new Error("Database chưa kết nối");
        const snapshot = await db.collection('qbanks').where('folder', '==', folder).where('path', '==', filePath).limit(1).get();
        if (snapshot.empty) return res.status(404).json({ error: 'Không tìm thấy file' });
        res.send(snapshot.docs[0].data().content);
    } catch(e) { res.status(500).json({ error: 'Lỗi đọc nội dung file' }); }
});

app.put('/api/qbanks/:folder/file', async (req, res) => {
    const { adminPassword, path: filePath, content } = req.body;
    const sysConfig = await getSysConfig();
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    const folder = decodeURIComponent(req.params.folder);
    
    try {
        if (!db) throw new Error("Database chưa kết nối");
        JSON.parse(content); // Kiểm tra JSON hợp lệ
        const snapshot = await db.collection('qbanks').where('folder', '==', folder).where('path', '==', filePath).limit(1).get();
        if (snapshot.empty) return res.status(404).json({ error: 'Không tìm thấy file' });
        
        await db.collection('qbanks').doc(snapshot.docs[0].id).update({ content: content });
        logAdminAction('SỬA JSON', `Sửa tệp ${filePath} trong thư mục ${folder}`, req);
        res.json({ ok: true, message: 'Đã lưu thành công' });
    } catch(e) { res.status(400).json({ error: 'Lỗi cấu trúc hoặc kết nối' }); }
});

app.delete('/api/qbanks/:folder', async (req, res) => {
    const { adminPassword } = req.body;
    const sysConfig = await getSysConfig();
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu admin' });
    const folder = decodeURIComponent(req.params.folder);
    
    try { 
        if (!db) throw new Error("Database chưa kết nối");
        const snapshot = await db.collection('qbanks').where('folder', '==', folder).get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        logAdminAction('XÓA NGÂN HÀNG', `Xóa thư mục câu hỏi: ${folder}`, req);
        res.json({ ok: true }); 
    } 
    catch(e) { res.status(500).json({ error: 'Lỗi xóa thư mục' }); }
});

// ==========================================
// 6. QUẢN LÝ PHIÊN THI (IN-MEMORY)
// ==========================================
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
            startTime: startTime || existing.startTime || Date.now()
        });
    }
    res.json({ online: activeSessions.size });
});

app.post('/api/admin/force-submit', async (req, res) => {
    const { adminPassword, sessionId, reason } = req.body;
    const sysConfig = await getSysConfig();
    if (adminPassword !== sysConfig.adminPassword) return res.status(401).json({ error: 'Sai mật khẩu' });
    
    if (activeSessions.has(sessionId)) {
        let session = activeSessions.get(sessionId);
        session.forceSubmit = true;
        session.forceReason = reason || 'Quản trị viên đã đình chỉ bài thi của bạn do vi phạm quy chế.';
        activeSessions.set(sessionId, session);
        logAdminAction('ĐÌNH CHỈ THI', `Đã ép thu bài thí sinh: ${session.userName}`, req);
        res.json({ ok: true });
    } else { res.status(404).json({ error: 'Phiên thi không tồn tại hoặc đã kết thúc' }); }
});

app.get('/api/online', (req, res) => { res.json({ online: activeSessions.size }); });
app.get('/api/active-exams', (req, res) => {
    const now = Date.now();
    const active = [];
    for (const [id, data] of activeSessions.entries()) {
        if (now - data.lastSeen <= SESSION_TIMEOUT) active.push({ sessionId: id, ...data });
    }
    res.json(active);
});

// Bắt lỗi chung
app.use((err, req, res, next) => {
    console.error('Lỗi hệ thống Server:', err);
    res.status(500).json({ error: err.message || 'Lỗi máy chủ không xác định' });
});

// Tương thích môi trường Local và Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n=========================================`);
        console.log(`🚀 HỆ THỐNG HSE SERVER ĐÃ KHỞI ĐỘNG (FIREBASE)!`);
        console.log(`👉 Đã khắc phục lỗi EROFS cho Vercel.`);
        console.log(`👉 Truy cập tại: http://localhost:${PORT}`);
        console.log(`=========================================\n`);
    });
}

// Bắt buộc phải có dòng này để Vercel nhận diện API
module.exports = app;