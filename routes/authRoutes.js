// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para registrar um novo usuário
// POST /api/auth/register
router.post('/register', authController.register);

// Rota para fazer login  
// POST /api/auth/login
router.post('/login', authController.login);

// Rota para sincronizar usuário Google
// POST /api/auth/sync
router.post('/sync', authController.syncUsuario);

// Callback do Google
// POST /api/auth/google-callback
router.post('/google-callback', authController.googleCallback);

module.exports = router;