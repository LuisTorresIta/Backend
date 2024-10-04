const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');

// Ruta para verificar conexión
router.get('/check-connection', queryController.checkConnection);

// Ruta para obtener empresas
router.get('/query', queryController.getEmpresas);

// Ruta para obtener periodos
router.get('/periodos', queryController.getPeriodos);

module.exports = router;