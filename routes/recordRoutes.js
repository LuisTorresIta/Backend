const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// Ruta para guardar registros
router.post('/saveRecord', recordController.saveRecord);

module.exports = router;