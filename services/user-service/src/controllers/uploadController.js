const path = require('path');
const fs = require('fs');
const multer = require('multer');
const userService = require('../services/userService');
const { logger } = require('xueqi-shared');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const avatarDir = path.join(UPLOAD_DIR, 'avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式'));
    }
    const filename = `avatar_${req.user.userId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式'));
    }
  }
});

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.error('请选择要上传的头像', 400);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const profile = await userService.updateAvatar(req.user.userId, avatarUrl);

    logger.info(`User ${req.user.userId} uploaded avatar: ${avatarUrl}`);
    res.success(profile, '头像上传成功');
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadAvatar };
