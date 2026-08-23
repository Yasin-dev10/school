const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const chat = require('../controllers/chat.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const dir = path.join(process.cwd(), 'uploads', 'chat');
fs.mkdirSync(dir, { recursive: true });
const allowed = new Set(['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg']);
const upload = multer({
    storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, dir), filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => allowed.has(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported attachment type'))
});

const verifyAttachment = (req, res, next) => {
    if (!req.file) return next();
    try {
        const buffer = Buffer.alloc(16);
        const fd = fs.openSync(req.file.path, 'r');
        fs.readSync(fd, buffer, 0, 16, 0); fs.closeSync(fd);
        const mime = req.file.mimetype;
        const signatures = {
            'image/jpeg': buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
            'image/png': buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
            'application/pdf': buffer.subarray(0, 4).toString() === '%PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': buffer.subarray(0, 2).toString() === 'PK',
            'application/msword': buffer.subarray(0, 2).equals(Buffer.from([0xd0, 0xcf])),
            'audio/webm': buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
            'audio/ogg': buffer.subarray(0, 4).toString() === 'OggS',
            'audio/wav': buffer.subarray(0, 4).toString() === 'RIFF',
            'audio/mpeg': buffer.subarray(0, 3).toString() === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
            'audio/mp4': buffer.subarray(4, 8).toString() === 'ftyp'
        };
        if (!signatures[mime]) { fs.unlinkSync(req.file.path); return res.status(400).json({ success: false, message: 'Attachment content does not match its file type' }); }
        next();
    } catch (_) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(400).json({ success: false, message: 'Could not verify attachment' });
    }
};

const router = express.Router();
router.use(protect);
router.get('/contacts', chat.getContacts);
router.get('/reports', authorize('school-admin', 'super-admin'), chat.getReports);
router.get('/moderation/stats', authorize('school-admin', 'super-admin'), chat.getModerationStats);
router.put('/reports/:reportId', authorize('school-admin', 'super-admin'), chat.moderateReport);
router.route('/conversations').get(chat.getConversations).post(chat.createConversation);
router.get('/conversations/:id/messages', chat.getMessages);
router.post('/conversations/:id/messages', upload.single('attachment'), verifyAttachment, chat.sendMessage);
router.put('/conversations/:id/read', chat.markRead);
router.post('/messages/:messageId/report', chat.reportMessage);

module.exports = router;
