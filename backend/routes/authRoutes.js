const express = require('express');
const authController = require('../controllers/auth.Controller');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/multer');

const router = express.Router();

router.post('/register', upload.single('imageprofile'), authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, upload.single('imageprofile'), authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
