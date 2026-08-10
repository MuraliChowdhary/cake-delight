const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/live', healthController.getLiveness);
router.get('/ready', healthController.getReadiness);

module.exports = router;
