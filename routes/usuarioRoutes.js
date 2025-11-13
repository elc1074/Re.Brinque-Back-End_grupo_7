const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const verifyToken = require('../middlewares/authMiddleware'); // Middleware para proteger a rota

// Rota protegida para atualizar a foto de perfil do usuário logado
router.put('/perfil/foto', verifyToken, usuarioController.atualizarFotoPerfil);

router.get('/:id/foto', usuarioController.buscarFotoPorId);

module.exports = router;