const express = require('express');
const router = express.Router();
const entrainementController = require('../controllers/entrainement.Controller');
const authenticateToken = require('../midelwars/auth');

router.get('/', authenticateToken, entrainementController.getAllEntrainements);
router.get('/:id', authenticateToken, entrainementController.getEntrainementById);
router.post('/', authenticateToken, entrainementController.createEntrainement);
router.put('/:id', authenticateToken, entrainementController.updateEntrainement);
router.delete('/:id', authenticateToken, entrainementController.deleteEntrainement);

module.exports = router;
