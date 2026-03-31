const express = require('express');
const cotisationController = require('../controllers/cotisation.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.get('/', cotisationController.getAllCotisations);
router.get('/stats', cotisationController.getStats);
router.get('/:id', cotisationController.getCotisationById);
router.post('/', roleMiddleware('RESPONSABLE'), cotisationController.createCotisation);
router.put('/:id', roleMiddleware('RESPONSABLE'), cotisationController.updateCotisation);
router.delete('/:id', roleMiddleware('RESPONSABLE'), cotisationController.deleteCotisation);

module.exports = router;
