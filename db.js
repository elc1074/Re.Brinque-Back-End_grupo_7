// db.js

require('dotenv').config();
const sql = require('mssql');

// Configuração da conexão usando as variáveis de ambiente
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true, // Obrigatório com base na sua imagem (Encrypt: Mandatory)
    trustServerCertificate: true // Obrigatório com base na sua imagem (Trust server certificate: True)
  }
};

// Função assíncrona para conectar e testar a conexão
async function connectToDatabase() {
  try {
    await sql.connect(config);
    console.log('✅ Conexão com o SQL Server bem-sucedida!');
  } catch (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err);
    // Encerra o processo se não conseguir conectar ao banco,
    // pois a aplicação não funcionará sem ele.
    process.exit(1); 
  }
}

// Exportamos o 'sql' para que possamos fazer queries em outros arquivos
// e a função de conectar.
module.exports = {
  sql,
  connectToDatabase
};