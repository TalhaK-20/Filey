const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.get('/', fileController.home);

module.exports = router;
