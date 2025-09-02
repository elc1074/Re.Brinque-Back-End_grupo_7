// swagger.js

const swaggerAutogen = require('swagger-autogen')();

// Define se o ambiente é de produção (Render.com) ou desenvolvimento
const isProduction = process.env.NODE_ENV === 'production';

const doc = {
  info: {
    title: 'API Re.Brinque',
    description: 'Documentação da API do projeto Re.Brinque.',
    version: '1.0.0',
  },
  // Define o host dinamicamente
  // Se estiver em produção, usa a URL do Render, senão, localhost
  host: isProduction ? 'back-rebrinque.onrender.com' : 'localhost:3000',
  // Define o protocolo (http ou https) dinamicamente
  schemes: isProduction ? ['https'] : ['http'],
  
  // (Opcional) Adicione definições de segurança se usar JWT
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: "Token de autenticação JWT. Exemplo: 'Bearer {token}'"
    }
  }
};

const outputFile = './swagger-output.json';
// Caminho CORRETO para o seu arquivo principal de rotas
const endpointsFiles = ['./index.js']; 

// Gera o arquivo de documentação
swaggerAutogen(outputFile, endpointsFiles, doc);