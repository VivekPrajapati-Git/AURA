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

module.exports = router;
