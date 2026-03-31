const express = require('express');
const nageurController = require('../controllers/nageur.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');
const upload = require('../middleware/multer');

const router = express.Router();

router.use(authenticateToken);

router.get('/', nageurController.getAllNageurs);
router.get('/:id', nageurController.getNageurById);
router.post('/register', roleMiddleware('RESPONSABLE'), upload.single('imageprofile'), nageurController.registerNageur);
router.put('/:id', roleMiddleware('RESPONSABLE', 'ENTRAINEUR'), upload.single('imageprofile'), nageurController.updateNageur);
router.delete('/:id', roleMiddleware('RESPONSABLE'), nageurController.deleteNageur);

module.exports = router;