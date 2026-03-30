const express = require('express');
const router = express.Router();
const cotisationController = require('../controllers/cotisation.Controller');
const authenticateToken = require('../midelwars/auth');

router.get('/stats', authenticateToken, cotisationController.getStats);
router.get('/', authenticateToken, cotisationController.getAllCotisations);
router.get('/:id', authenticateToken, cotisationController.getCotisationById);
router.post('/', authenticateToken, cotisationController.createCotisation);
router.put('/:id', authenticateToken, cotisationController.updateCotisation);
router.delete('/:id', authenticateToken, cotisationController.deleteCotisation);

module.exports = router;
