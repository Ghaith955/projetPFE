const express = require('express');
const notificationController = require('../controllers/notification.Controller');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;
