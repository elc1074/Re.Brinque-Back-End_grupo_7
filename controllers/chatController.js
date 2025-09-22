// controllers/chatController.js
const pool = require('../db').pool;

// Inicia uma conversa ou a retorna se já existir
exports.startOrGetConversation = async (req, res) => {
  const { anuncioId, interessadoId } = req.body;
  
  try {
    // Pega o ID do anunciante
    const anuncioRes = await pool.query('SELECT usuario_id FROM anuncios WHERE id = $1', [anuncioId]);
    if (anuncioRes.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    const anuncianteId = anuncioRes.rows[0].usuario_id;

    // Verifica se a conversa já existe
    let conversaRes = await pool.query(
      'SELECT * FROM conversas WHERE anuncio_id = $1 AND interessado_id = $2',
      [anuncioId, interessadoId]
    );

    if (conversaRes.rows.length > 0) {
      // Conversa já existe, retorna os dados
      return res.status(200).json(conversaRes.rows[0]);
    } else {
      // Cria uma nova conversa
      const newConversaRes = await pool.query(
        'INSERT INTO conversas (anuncio_id, anunciante_id, interessado_id) VALUES ($1, $2, $3) RETURNING *',
        [anuncioId, anuncianteId, interessadoId]
      );
      return res.status(201).json(newConversaRes.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor ao iniciar conversa.' });
  }
};

// Pega todas as mensagens de uma conversa
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  try {
    const messagesRes = await pool.query(
      'SELECT * FROM mensagens WHERE conversa_id = $1 ORDER BY data_envio ASC',
      [conversationId]
    );
    res.status(200).json(messagesRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar mensagens.' });
  }
};

exports.getUserConversations = async (req, res) => {
  const { userId } = req.params;

  try {
    const conversasRes = await pool.query(
      `SELECT c.*, a.titulo AS anuncio_titulo
       FROM conversas c
       JOIN anuncios a ON c.anuncio_id = a.id
       WHERE c.interessado_id = $1 OR c.anunciante_id = $1
       ORDER BY c.id DESC`,
      [userId]
    );

    res.status(200).json(conversasRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar conversas do usuário.' });
  }
};
