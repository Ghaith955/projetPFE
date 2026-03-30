const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.Controller');
const authenticateToken = require('../midelwars/auth');

router.get('/', authenticateToken, adminController.getAllUsers);
router.get('/:id', authenticateToken, adminController.getUserById);
router.post('/register-Admin', adminController.registerAdmin);
router.put('/:id', authenticateToken, adminController.updateUser);
router.patch('/:id/toggle-active', authenticateToken, adminController.toggleActive);
router.delete('/:id', authenticateToken, adminController.deleteUser);

module.exports = router;
