const express = require('express');
const router = express.Router();
const { authMiddleware } = require('xueqi-shared');
const { upload, uploadImage } = require('../controllers/uploadController');

router.post('/upload/image', authMiddleware, upload.single('image'), uploadImage);

module.exports = router;
