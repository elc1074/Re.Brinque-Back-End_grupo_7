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

const allowedOrigins = [
  'https://front-re-brinque.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// ✅ Swagger para documentação da API
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use('/api/auth', authRoutes);
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);

// ✅ Rota protegida de exemplo
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
