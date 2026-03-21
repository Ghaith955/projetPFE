const express = require('express');
const router=express.Router();
const entraineurController=require('../controllers/entraineur.Controller')
const uploadImage = require('../midelwars/multer'); 
const authenticateToken=require('../midelwars/auth');
const roleMiddleware =require('../midelwars/rbac');


router.post('/register_entraineur',uploadImage.single('imageprofile'), entraineurController.registerEntraineur);

module.exports=router;
