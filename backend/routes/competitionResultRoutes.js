const express = require('express');
const competitionResultController = require('../controllers/competitionResult.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.post('/', roleMiddleware('ENTRAINEUR'), competitionResultController.createResult);
router.get('/user/:userId', competitionResultController.getResultsByUser);
router.get('/competition/:competitionId', competitionResultController.getResultsByCompetition);

module.exports = router;
