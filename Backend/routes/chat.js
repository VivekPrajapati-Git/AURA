const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// All chat routes require authentication
router.use(auth);

router.post('/create', chatController.createChat);
router.post('/message', chatController.sendMessage);
router.get('/list/:userId', chatController.getUserChats);
router.get('/:chatId', chatController.getChat);

// Advanced Endpoints
router.patch('/:chatId/title', chatController.updateChatTitle);
router.delete('/:chatId', chatController.deleteChat);
router.get('/:chatId/message/:messageId', chatController.getMessageById);
router.post('/message/stream/:chatId', chatController.streamMessage);
router.get('/:chatId/metrics/:messageId', chatController.getMessageMetrics);

module.exports = router;
