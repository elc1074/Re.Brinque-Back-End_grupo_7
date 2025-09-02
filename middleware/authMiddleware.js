// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Pega o token do header 'Authorization' (geralmente no formato 'Bearer TOKEN')
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  try {
    // Verifica se o token é válido usando o segredo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adiciona os dados do usuário decodificados ao objeto da requisição
    req.user = decoded;
    
    // Continua para a próxima função (o controller da rota)
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido.' });
  }
};

module.exports = verifyToken;
