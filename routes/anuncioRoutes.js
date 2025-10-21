const express = require('express');
const router = express.Router();
const anuncioController = require('../controllers/anuncioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Criar anúncio
router.post('/', authMiddleware, anuncioController.criar);

// Editar anúncio
router.put('/:id', authMiddleware, anuncioController.editar);

// Atualizar status do anúncio
router.patch('/:id/status', authMiddleware, anuncioController.atualizarStatus);

// Listar todos os anúncios (com filtros)
router.get('/', anuncioController.listarTodos);

// Listar anúncio por id
router.get('/:id', anuncioController.listarPorId);

// Listar anúncios por ID do usuário
router.get('/usuario/:usuario_id', anuncioController.listarPorUsuario);

// Excluir anúncio
router.delete('/:id', authMiddleware, anuncioController.excluir);

module.exports = router;