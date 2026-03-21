const express= require('express');
const router= express.Router();
const passwordController= require('../controllers/password.Controller');

router.post('/request-password-reset', passwordController.requestPasswordReset);
router.post('/reset-password/:token', passwordController.resetPassword);
router.get('/reset-password/:token', passwordController.showResetPasswordForm);


module.exports=router;
