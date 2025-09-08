// db.js

const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true 
  }
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

async function connectToDatabase() {
  try {
    await poolConnect;
    console.log('✅ Conectado ao SQL Server com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  }
}

module.exports = {
  sql,
  pool,
  connectToDatabase
};