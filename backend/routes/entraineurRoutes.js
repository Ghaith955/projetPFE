const express = require('express');
const entraineurController = require('../controllers/entraineur.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');
const upload = require('../middleware/multer');

const router = express.Router();

router.use(authenticateToken);

router.get('/', entraineurController.getAllEntraineurs);
router.get('/:id', entraineurController.getEntraineurById);
router.post('/register', roleMiddleware('RESPONSABLE'), upload.single('imageprofile'), entraineurController.registerEntraineur);
router.put('/:id', roleMiddleware('RESPONSABLE'), upload.single('imageprofile'), entraineurController.updateEntraineur);
router.delete('/:id', roleMiddleware('RESPONSABLE'), entraineurController.deleteEntraineur);

module.exports = router;