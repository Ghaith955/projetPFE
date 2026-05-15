const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middleware/auth');

// All chat routes require authentication
router.use(authenticateToken);

// Define route for the chat/LLM completion
router.post('/', chatController.sendMessage);

module.exports = router;
