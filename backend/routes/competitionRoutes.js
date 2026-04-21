const express = require('express');
const competitionController = require('../controllers/competition.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.get('/', competitionController.getAllCompetitions);
router.get('/:id', competitionController.getCompetitionById);
router.post('/', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), competitionController.createCompetition);
router.put('/:id', roleMiddleware('RESPONSABLE'), competitionController.updateCompetition);
router.delete('/:id', roleMiddleware('RESPONSABLE'), competitionController.deleteCompetition);

module.exports = router;
