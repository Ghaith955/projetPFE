const express = require('express');
const router=express.Router();
const nageurController=require('../controllers/nageur.Controller')
const uploadImage = require('../midelwars/multer'); 
const authenticateToken=require('../midelwars/auth');
const roleMiddleware =require('../midelwars/rbac');


router.post('/register_Nageur',uploadImage.single('imageprofile'), nageurController.registerNageur);

module.exports=router;
