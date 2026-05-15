const express = require('express');
const adminController = require('../controllers/admin.Controller');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/rbac');
const upload = require('../middleware/multer');

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticateToken, roleMiddleware('RESPONSABLE'));

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', upload.single('imageprofile'), adminController.createUser);
router.put('/users/:id', upload.single('imageprofile'), adminController.updateUser);
router.patch('/users/:id/toggle-active', adminController.toggleActive);
router.delete('/users/:id', adminController.deleteUser);
router.post('/assign-entraineur', adminController.assignNageurToEntraineur);
router.get('/stats', adminController.getStats);
router.get('/idss-evaluations/latest', adminController.getLatestIdssEvaluation);
router.get('/pending-registrations', adminController.getPendingRegistrations);
router.patch('/pending-registrations/:id', adminController.approvePendingRegistration);

module.exports = router;
