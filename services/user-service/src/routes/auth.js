const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, requireRole } = require('xueqi-shared');

router.get('/captcha', authController.getCaptcha);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.put('/change-password', authMiddleware, authController.changePassword);
router.get('/admin/login-logs', authMiddleware, requireRole('super_admin'), authController.getAdminLoginLogs);

module.exports = router;
