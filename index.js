// index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

  const swaggerUi = require('swagger-ui-express');
  const swaggerFile = require('./swagger-output.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// --- ROTAS ---
// Rotas de autenticação (não protegidas)
app.use('/api/auth', authRoutes);

// Rota de exemplo PROTEGIDA
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