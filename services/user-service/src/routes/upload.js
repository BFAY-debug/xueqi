const express = require('express');
const router = express.Router();
const { authMiddleware } = require('xueqi-shared');
const { upload, uploadAvatar } = require('../controllers/uploadController');

router.post('/upload/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);

module.exports = router;
