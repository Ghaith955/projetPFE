const express = require('express');
const authController =require('../controllers/auth.Controller');
const authenticateToken=require('../midelwars/auth');

const router=express.Router();

router.post('/login',authController.login);
router.post('/logout',authController.logout);
router.get('/user-info',authenticateToken,authController.getUserInfo);
module.exports= router;
