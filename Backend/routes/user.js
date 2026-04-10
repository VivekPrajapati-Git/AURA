const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Setup auth wall
router.use(auth);

router.get('/:userId/stats', userController.getUserStats);
router.get('/:userId/profile', userController.getUserProfile);

module.exports = router;
