const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/community');
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式'), false);
    }
    const rand = crypto.randomBytes(3).toString('hex');
    cb(null, `post_${Date.now()}_${rand}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'), false);
  }
});

async function uploadImage(req, res, next) {
  try {
    if (!req.file) return res.error('请选择图片', 400);
    const url = `/uploads/community/${req.file.filename}`;
    res.success({ url }, '上传成功');
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadImage };
