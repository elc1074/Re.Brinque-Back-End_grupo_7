// index.js

require('dotenv').config();
const express = require('express');
const { connectToDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

  const swaggerUi = require('swagger-ui-express');
  const swaggerFile = require('./swagger-output.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// --- ROTAS ---
// Rotas de autenticação (não protegidas)
app.use('/api/auth', authRoutes);

// Rota de exemplo PROTEGIDA
// Apenas usuários com um token válido podem acessar esta rota
app.get('/api/perfil', verifyToken, (req, res) => {
  res.json({
    message: `Bem-vindo ao seu perfil, usuário com ID ${req.user.id}!`,
    usuario: req.user
  });
});

async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();