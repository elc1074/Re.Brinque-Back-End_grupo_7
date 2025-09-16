// swagger.js

const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.3' });

const isProduction = process.env.NODE_ENV === 'production';

const doc = {
  info: {
    title: 'API Re-Brinque',
    description: 'Documentação da API do projeto Re-Brinque, para gerenciamento de usuários, anúncios de brinquedos e transações.',
    version: '1.0.0',
  },
  // Define os servidores de produção e desenvolvimento
  servers: [
    {
      url: isProduction ? 'https://back-rebrinque.onrender.com' : 'http://localhost:3000',
      description: isProduction ? 'Servidor de Produção' : 'Servidor de Desenvolvimento'
    }
  ],
  // Define as tags para organizar os endpoints
  tags: [
    { name: 'Autenticação', description: 'Endpoints para registro, login e gerenciamento de sessão.' },
    { name: 'Anúncios', description: 'Endpoints para gerenciar os anúncios de brinquedos.' },
    { name: 'Configuração', description: 'Endpoints de configurações de serviços externos.' }
  ],
  // Define os componentes reutilizáveis, como schemas e segurança
  components: {
    // Definição do esquema de segurança JWT para OpenAPI 3.0
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: "Token de autenticação JWT. Exemplo: 'Bearer {token}'"
      }
    },
    // Definição dos Schemas (modelos de dados)
    schemas: {
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome_completo: { type: 'string', example: 'João da Silva' },
          email: { type: 'string', format: 'email', example: 'joao@example.com' },
          telefone: { type: 'string', nullable: true, example: '11987654321' },
          google_id: { type: 'string', nullable: true },
          data_cadastro: { type: 'string', format: 'date-time' }
        }
      },
      Anuncio: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          usuario_id: { type: 'integer', example: 1 },
          categoria_id: { type: 'integer', nullable: true, example: 5 },
          titulo: { type: 'string', example: 'Carrinho de Controle Remoto' },
          descricao: { type: 'string', nullable: true, example: 'Pouco usado, em perfeito estado.' },
          marca: { type: 'string', nullable: true, example: 'Hot Wheels' },
          tipo: { type: 'string', enum: ['TROCA', 'DOACAO'], example: 'TROCA' },
          condicao: { type: 'string', enum: ['NOVO', 'SEMINOVO', 'USADO'], example: 'SEMINOVO' },
          status: { type: 'string', enum: ['DISPONIVEL', 'NEGOCIANDO', 'FINALIZADO'], example: 'DISPONIVEL' },
          data_publicacao: { type: 'string', format: 'date-time' },
          imagens: {
            type: 'array',
            items: { $ref: '#/components/schemas/ImagemAnuncio' }
          }
        }
      },
      ImagemAnuncio: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          url_imagem: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/...' },
          principal: { type: 'boolean', example: true }
        }
      },
      CorpoRegistroUsuario: {
        type: 'object',
        required: ['nome_completo', 'email', 'senha'],
        properties: {
          nome_completo: { type: 'string', example: 'Maria Souza' },
          email: { type: 'string', format: 'email', example: 'maria.souza@example.com' },
          senha: { type: 'string', format: 'password', example: 'senhaForte123' },
          telefone: { type: 'string', nullable: true, example: '21912345678' }
        }
      },
      CorpoLoginUsuario: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email', example: 'maria.souza@example.com' },
          senha: { type: 'string', format: 'password', example: 'senhaForte123' }
        }
      },
      CorpoCriarAnuncio: {
        type: 'object',
        required: ['usuario_id', 'categoria_id', 'titulo', 'tipo', 'condicao'],
        properties: {
          usuario_id: { type: 'integer' },
          categoria_id: { type: 'integer' },
          endereco_completo: { type: 'string' },
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          marca: { type: 'string' },
          tipo: { type: 'string', enum: ['TROCA', 'DOACAO'] },
          condicao: { type: 'string', enum: ['NOVO', 'SEMINOVO', 'USADO'] },
          status: { type: 'string', enum: ['DISPONIVEL', 'NEGOCIANDO', 'FINALIZADO'] },
          imagens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url_imagem: { type: 'string', format: 'uri' },
                principal: { type: 'boolean' }
              }
            }
          }
        }
      },
      RespostaAutenticacao: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string' },
          usuario: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              nome: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          },
          auth_type: { type: 'string', enum: ['normal', 'google'] }
        }
      }
    }
  }
};

const outputFile = './swagger-output.json';
// O ideal é apontar para o arquivo que define suas rotas principais
const endpointsFiles = ['./index.js']; // ou './app.js', etc.

swaggerAutogen(outputFile, endpointsFiles, doc);