const express = require('express');
const rankingController = require('../controllers/ranking.Controller');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/latest', rankingController.getLatestRanking);
router.get('/by-period', rankingController.getRankingByPeriod);
router.get('/history/:userId', rankingController.getUserHistory);
router.post('/recompute', rankingController.recomputeRanking);

module.exports = router;
