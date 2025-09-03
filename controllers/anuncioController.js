const { sql } = require('../db');

// Criar anúncio
exports.criar = async (req, res) => {
  const {
    usuario_id,
    categoria_id,
    endereco_id,
    titulo,
    descricao,
    tipo,
    condicao,
    status
  } = req.body;

  if (!usuario_id || !categoria_id || !titulo || !tipo || !condicao || !status) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
  }

  try {
    const result = await sql.query`
      INSERT INTO anuncios (
        usuario_id, categoria_id, endereco_id, titulo, descricao, tipo, condicao, status, data_publicacao, data_atualizacao
      )
      OUTPUT INSERTED.*
      VALUES (
        ${usuario_id}, ${categoria_id}, ${endereco_id}, ${titulo}, ${descricao}, ${tipo}, ${condicao}, ${status}, GETDATE(), GETDATE()
      )
    `;
    res.status(201).json({ anuncio: result.recordset[0] });
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Editar anúncio
exports.editar = async (req, res) => {
  const { id } = req.params;
  const {
    categoria_id,
    endereco_id,
    titulo,
    descricao,
    tipo,
    condicao,
    status
  } = req.body;

  try {
    const result = await sql.query`
      UPDATE anuncios
      SET
        categoria_id = ${categoria_id},
        endereco_id = ${endereco_id},
        titulo = ${titulo},
        descricao = ${descricao},
        tipo = ${tipo},
        condicao = ${condicao},
        status = ${status},
        data_atualizacao = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = ${id}
    `;
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Anúncio não encontrado.' });
    }
    res.json({ anuncio: result.recordset[0] });
  } catch (error) {
    console.error('Erro ao editar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Listar todos os anúncios
exports.listarTodos = async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM anuncios`;
    res.json({ anuncios: result.recordset });
  } catch (error) {
    console.error('Erro ao listar anúncios:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Listar anúncio por id
exports.listarPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await sql.query`SELECT * FROM anuncios WHERE id = ${id}`;
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Anúncio não encontrado.' });
    }
    res.json({ anuncio: result.recordset[0] });
  } catch (error) {
    console.error('Erro ao buscar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Excluir anúncio
exports.excluir = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await sql.query`
      DELETE FROM anuncios
      OUTPUT DELETED.*
      WHERE id = ${id}
    `;
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Anúncio não encontrado.' });
    }
    res.json({ message: 'Anúncio excluído com sucesso.', anuncio: result.recordset[0] });
  } catch (error) {
    console.error('Erro ao excluir anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};