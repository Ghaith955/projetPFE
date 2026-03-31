const express = require('express');
const entrainementController = require('../controllers/entrainement.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.get('/', entrainementController.getAllEntrainements);
router.get('/:id', entrainementController.getEntrainementById);
router.post('/', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), entrainementController.createEntrainement);
router.put('/:id', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), entrainementController.updateEntrainement);
router.delete('/:id', roleMiddleware('RESPONSABLE'), entrainementController.deleteEntrainement);

module.exports = router;
