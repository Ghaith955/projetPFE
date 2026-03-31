const express = require('express');
const demandeController = require('../controllers/demande.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.get('/', demandeController.getAll);
router.get('/pending/count', demandeController.getPendingCount);
router.post('/', roleMiddleware('NAGEUR'), demandeController.create);
router.patch('/:id/respond', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), demandeController.respond);

module.exports = router;
