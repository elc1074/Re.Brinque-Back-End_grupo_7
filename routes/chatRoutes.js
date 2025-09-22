// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const verifyToken = require('../middlewares/authMiddleware'); // Proteja suas rotas!

// Rota para iniciar/obter uma conversa
router.post('/conversas', verifyToken, chatController.startOrGetConversation);

// Rota para listar todas as conversas de um usuário
router.get('/usuario/:userId/conversas', verifyToken, chatController.getUserConversations);

// Rota para obter o histórico de mensagens de uma conversa
router.get('/conversas/:conversationId/mensagens', verifyToken, chatController.getMessages);

module.exports = router;