const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Define route for the chat/LLM completion
router.post('/', chatController.sendMessage);

module.exports = router;
