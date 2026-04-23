const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/community');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const rand = crypto.randomBytes(3).toString('hex');
    cb(null, `post_${Date.now()}_${rand}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('仅支持图片文件'), false);
  }
});

async function uploadImage(req, res, next) {
  if (!req.file) return res.error('请选择图片', 400);
  const url = `/uploads/community/${req.file.filename}`;
  res.success({ url }, '上传成功');
}

module.exports = { upload, uploadImage };
