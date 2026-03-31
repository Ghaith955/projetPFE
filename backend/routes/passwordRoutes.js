const express = require('express');
const passwordController = require('../controllers/password.Controller');

const router = express.Router();

router.post('/request-reset', passwordController.requestPasswordReset);
router.get('/reset/:token', passwordController.showResetPasswordForm);
router.post('/reset/:token', passwordController.resetPassword);

module.exports = router;
