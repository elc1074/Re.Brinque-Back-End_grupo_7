const express = require('express');
const router = express.Router();
const anuncioController = require('../controllers/anuncioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Criar anúncio
router.post('/', authMiddleware, anuncioController.criar);

// Editar anúncio
router.put('/:id', authMiddleware, anuncioController.editar);

// Listar todos os anúncios
router.get('/', anuncioController.listarTodos);

// Listar anúncio por id
router.get('/:id', anuncioController.listarPorId);

// Excluir anúncio
router.delete('/:id', authMiddleware, anuncioController.excluir);

module.exports = router;