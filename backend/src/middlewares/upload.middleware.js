const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXT = new Set(['.jpeg', '.jpg', '.png', '.pdf', '.doc', '.docx']);
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const MAGIC = [
    { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
    { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

const looksLikeZipDocx = (buf) => buf[0] === 0x50 && buf[1] === 0x4b; // PK zip (docx/docx-like)

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_EXT.has(ext) ? ext : '';
        const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        cb(null, `${file.fieldname}-${unique}${safeExt}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('Only images, PDFs, and Word documents are allowed!'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

/** Verify magic bytes after multer writes the file; delete if mismatch. */
const verifyUploadedFile = (req, res, next) => {
    if (!req.file) return next();
    try {
        const fd = fs.openSync(req.file.path, 'r');
        const buf = Buffer.alloc(8);
        fs.readSync(fd, buf, 0, 8, 0);
        fs.closeSync(fd);

        const ext = path.extname(req.file.originalname).toLowerCase();
        let ok = false;
        if (ext === '.jpg' || ext === '.jpeg') {
            ok = MAGIC[0].bytes.every((b, i) => buf[i] === b);
        } else if (ext === '.png') {
            ok = MAGIC[1].bytes.every((b, i) => buf[i] === b);
        } else if (ext === '.pdf') {
            ok = MAGIC[2].bytes.every((b, i) => buf[i] === b);
        } else if (ext === '.docx') {
            ok = looksLikeZipDocx(buf);
        } else if (ext === '.doc') {
            // Legacy OLE compound doc
            ok = buf[0] === 0xd0 && buf[1] === 0xcf;
        }

        if (!ok) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Invalid file content' });
        }
        next();
    } catch (err) {
        return res.status(400).json({ success: false, message: 'File verification failed' });
    }
};

module.exports = upload;
module.exports.verifyUploadedFile = verifyUploadedFile;
