const express = require('express');
const router = express.Router();
const nageurController = require('../controllers/nageur.Controller');
const uploadImage = require('../midelwars/multer');
const authenticateToken = require('../midelwars/auth');

router.get('/', authenticateToken, nageurController.getAllNageurs);
router.get('/:id', authenticateToken, nageurController.getNageurById);
router.post('/register_Nageur', uploadImage.single('imageprofile'), nageurController.registerNageur);
router.put('/:id', authenticateToken, nageurController.updateNageur);
router.delete('/:id', authenticateToken, nageurController.deleteNageur);

module.exports = router;