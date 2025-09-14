// index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middlewares/authMiddleware');
const anuncioRoutes = require('./routes/anuncioRoutes');
const cloudinaryRoutes = require('./routes/cloudinaryRoutes');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: 'https://front-re-brinque.vercel.app',
  credentials: true,
}));
app.use(express.json());

  const swaggerUi = require('swagger-ui-express');
  const swaggerFile = require('./swagger-output.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// --- ROTAS ---
// Rotas de autenticação (não protegidas)
app.use('/api/auth', authRoutes);

// Rotas de anúncios (protegidas e não protegidas, conforme definido em anuncioRoutes.js)
app.use('/api/anuncios', anuncioRoutes);

// Rota para configurações do Cloudinary (protegida)
app.use('/api/cloudinary', cloudinaryRoutes);

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