const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('xueqi-shared');

router.get('/rooms/:id/messages', authMiddleware, chatController.getMessages);
router.get('/chat/rooms', authMiddleware, chatController.getRooms);
router.get('/chat/my-rooms', authMiddleware, chatController.getMyRooms);
router.post('/chat/mark-read', authMiddleware, chatController.markRead);

// Image upload config
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR
      ? path.join(process.env.UPLOAD_DIR, 'chat')
      : path.join(__dirname, '../../uploads/chat');
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式'), false);
    }
    cb(null, `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片文件'), false);
    }
  }
});

router.post('/chat/upload', authMiddleware, upload.single('image'), chatController.uploadImage);

module.exports = router;
