const express = require('express');
const router = express.Router();
const entraineurController = require('../controllers/entraineur.Controller');
const uploadImage = require('../midelwars/multer');
const authenticateToken = require('../midelwars/auth');

router.get('/', authenticateToken, entraineurController.getAllEntraineurs);
router.get('/:id', authenticateToken, entraineurController.getEntraineurById);
router.post('/register_entraineur', uploadImage.single('imageprofile'), entraineurController.registerEntraineur);
router.put('/:id', authenticateToken, entraineurController.updateEntraineur);
router.delete('/:id', authenticateToken, entraineurController.deleteEntraineur);

module.exports = router;