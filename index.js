// index.js (Versão completa com Socket.IO)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectToDatabase } = require('./db');

const authRoutes = require('./routes/authRoutes');
const anuncioRoutes = require('./routes/anuncioRoutes');
const cloudinaryRoutes = require('./routes/cloudinaryRoutes');
const chatRoutes = require('./routes/chatRoutes'); // <-- Nova rota do chat

const configureSocket = require('./socketManager');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://front-re-brinque.vercel.app',
  'http://localhost:3000',
  'null'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// // ADICIONE ESTE BLOCO PARA DEBUG
// app.use((req, res, next) => {
//   console.log('--- INÍCIO DA REQUISIÇÃO ---');
//   console.log('Método:', req.method);
//   console.log('URL:', req.originalUrl);
//   console.log('Cabeçalhos Recebidos:', req.headers);
//   console.log('--- FIM DA REQUISIÇÃO ---');
//   next();
// });

// ✅ Swagger para documentação da API
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Configuração das rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/chat', chatRoutes);

const verifyToken = require('./middlewares/authMiddleware');
app.get('/api/perfil', verifyToken, (req, res) => {
  res.json({
    message: `Bem-vindo ao seu perfil, usuário com ID ${req.user.id}!`,
    usuario: req.user
  });
});

configureSocket(io);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToDatabase();

  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();