const express = require('express');
const performanceController = require('../controllers/performance.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.get('/', performanceController.getAll);
router.get('/trends', performanceController.getTrends);
router.get('/insights', performanceController.getInsights);
router.post('/training-result', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), performanceController.createTrainingResult);
router.post('/', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), performanceController.create);
router.put('/:id', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), performanceController.update);
router.delete('/:id', roleMiddleware('RESPONSABLE'), performanceController.delete);

module.exports = router;
