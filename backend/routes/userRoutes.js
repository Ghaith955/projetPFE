const express= require('express');
const router= express.Router();
const admindController= require('../controllers/admin.Controller');

router.post('/reister-Admin', admindController.registerAdmin);



module.exports=router;
