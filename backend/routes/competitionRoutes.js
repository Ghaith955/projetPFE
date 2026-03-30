const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competition.Controller');
const authenticateToken = require('../midelwars/auth');

router.get('/', authenticateToken, competitionController.getAllCompetitions);
router.get('/:id', authenticateToken, competitionController.getCompetitionById);
router.post('/', authenticateToken, competitionController.createCompetition);
router.put('/:id', authenticateToken, competitionController.updateCompetition);
router.delete('/:id', authenticateToken, competitionController.deleteCompetition);

module.exports = router;
