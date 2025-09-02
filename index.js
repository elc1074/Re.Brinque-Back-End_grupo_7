// index.js

require('dotenv').config();
const express = require('express');
const { connectToDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middleware/authMiddleware'); // Importa o middleware

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir que o Express entenda JSON no corpo das requisições
app.use(express.json());

// --- ROTAS ---
// Rotas de autenticação (não protegidas)
app.use('/api/auth', authRoutes);

// Rota de exemplo PROTEGIDA
// Apenas usuários com um token válido podem acessar esta rota
app.get('/api/perfil', verifyToken, (req, res) => {
  // As informações do usuário estão em req.user, adicionadas pelo middleware
  res.json({
    message: `Bem-vindo ao seu perfil, usuário com ID ${req.user.id}!`,
    usuario: req.user
  });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
