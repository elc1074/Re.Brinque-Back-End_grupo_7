const express = require('express');
const router = express.Router();
const cloudinaryController = require('../controllers/cloudinaryController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/config', authMiddleware, cloudinaryController.getCloudinaryConfig);

module.exports = router;