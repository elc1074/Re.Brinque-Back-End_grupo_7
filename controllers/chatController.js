// controllers/chatController.js
const pool = require('../db').pool;

// Inicia uma conversa ou a retorna se já existir
exports.startOrGetConversation = async (req, res) => {
  const { anuncioId, interessadoId } = req.body;

  try {
    const anuncioRes = await pool.query('SELECT usuario_id FROM anuncios WHERE id = $1', [anuncioId]);
    if (anuncioRes.rows.length === 0) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }
    const anuncianteId = anuncioRes.rows[0].usuario_id;

    const getConversationDetailsQuery = `
      SELECT
        c.*,
        anunciante.nome_completo AS nome_anunciante
      FROM conversas c
      JOIN usuarios AS anunciante ON c.anunciante_id = anunciante.id
      WHERE c.anuncio_id = $1 AND c.interessado_id = $2
    `;

    let conversaRes = await pool.query(getConversationDetailsQuery, [anuncioId, interessadoId]);

    if (conversaRes.rows.length > 0) {
      return res.status(200).json(conversaRes.rows[0]);
    } else {
      await pool.query(
        'INSERT INTO conversas (anuncio_id, anunciante_id, interessado_id) VALUES ($1, $2, $3)',
        [anuncioId, anuncianteId, interessadoId]
      );

      const newConversaDetails = await pool.query(getConversationDetailsQuery, [anuncioId, interessadoId]);
      
      return res.status(201).json(newConversaDetails.rows[0]);
    }
  } catch (error) {
    console.error('Erro ao iniciar ou obter conversa:', error);
    res.status(500).json({ error: 'Erro no servidor ao processar a conversa.' });
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
    const query = `
      SELECT 
        c.*, 
        a.titulo AS anuncio_titulo,
        anunciante.nome_completo AS nome_anunciante,
        interessado.nome_completo AS nome_interessado
      FROM conversas c
      JOIN anuncios a ON c.anuncio_id = a.id
      JOIN usuarios anunciante ON c.anunciante_id = anunciante.id
      JOIN usuarios interessado ON c.interessado_id = interessado.id
      WHERE c.interessado_id = $1 OR c.anunciante_id = $1
      ORDER BY c.id DESC
    `;
    
    const conversasRes = await pool.query(query, [userId]);

    res.status(200).json(conversasRes.rows);
  } catch (error) {
    // É uma boa prática logar o erro real no console para debug
    console.error('Erro detalhado ao buscar conversas:', error); 
    res.status(500).json({ error: 'Erro ao buscar conversas do usuário.' });
  }
};
