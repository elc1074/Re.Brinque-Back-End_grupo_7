// db.js

const { Pool } = require('pg');

// O construtor do Pool irá ler automaticamente a variável de ambiente DATABASE_URL
// que você configurou no arquivo .env.
// A configuração de SSL é necessária para conexões com o Render.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function connectToDatabase() {
  try {
    // Testa a conexão pegando um cliente do pool.
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL (Render) com sucesso!');
    // Libera o cliente de volta para o pool.
    client.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  }
}

// Exportamos apenas o pool, que será usado para fazer as queries na aplicação.
module.exports = {
  pool,
  connectToDatabase,
};