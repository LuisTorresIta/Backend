const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para login
router.post('/login', authController.login);

// Ruta para cambiar contraseña
router.post('/change-password', authController.changePassword);

module.exports = router;