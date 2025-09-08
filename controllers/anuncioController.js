// Importamos o 'pool' para poder usar transações e requisições explícitas.
const { sql, pool } = require('../db');

// Criar anúncio com imagens
exports.criar = async (req, res) => {
  const {
    usuario_id,
    categoria_id,
    endereco_id,
    titulo,
    descricao,
    tipo,
    condicao,
    status,
    imagens 
  } = req.body;

  if (!usuario_id || !categoria_id || !endereco_id || !titulo || !tipo || !condicao) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
  }

  const transaction = pool.transaction();
  try {
    await transaction.begin();

    const resultAnuncio = await transaction.request().query`
      INSERT INTO anuncios (
        usuario_id, categoria_id, endereco_id, titulo, descricao, tipo, condicao, status, data_publicacao, data_atualizacao
      )
      OUTPUT INSERTED.id
      VALUES (
        ${usuario_id}, ${categoria_id}, ${endereco_id}, ${titulo}, ${descricao}, ${tipo}, ${condicao}, ${status || 'DISPONIVEL'}, GETDATE(), GETDATE()
      )
    `;
    const anuncioId = resultAnuncio.recordset[0].id;

    if (imagens && imagens.length > 0) {
      for (const imagem of imagens) {
        await transaction.request().query`
          INSERT INTO imagensAnuncio (anuncio_id, url_imagem, principal)
          VALUES (${anuncioId}, ${imagem.url_imagem}, ${imagem.principal || 0})
        `;
      }
    }

    await transaction.commit();
    
    await exports.listarPorId({ params: { id: anuncioId } }, res, true);
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Editar anúncio com imagens
exports.editar = async (req, res) => {
  const { id } = req.params;
  const {
    categoria_id,
    endereco_id,
    titulo,
    descricao,
    tipo,
    condicao,
    status,
    imagens
  } = req.body;

  const transaction = pool.transaction();
  try {
    await transaction.begin();

    const result = await transaction.request().query`
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
      await transaction.rollback();
      return res.status(404).json({ message: 'Anúncio não encontrado.' });
    }

    await transaction.request().query`DELETE FROM imagensAnuncio WHERE anuncio_id = ${id}`;

    if (imagens && imagens.length > 0) {
      for (const imagem of imagens) {
        await transaction.request().query`
          INSERT INTO imagensAnuncio (anuncio_id, url_imagem, principal)
          VALUES (${id}, ${imagem.url_imagem}, ${imagem.principal || 0})
        `;
      }
    }

    await transaction.commit();
    
    await exports.listarPorId({ params: { id } }, res, true);

  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao editar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.listarTodos = async (req, res) => {
  try {
    const result = await pool.request().query`
        SELECT 
            a.*, 
            ia.id as imagem_id, 
            ia.url_imagem, 
            ia.principal
        FROM 
            anuncios a
        LEFT JOIN 
            imagensAnuncio ia ON a.id = ia.anuncio_id
        ORDER BY a.data_publicacao DESC
    `;

    const anunciosMap = new Map();
    result.recordset.forEach(row => {
      if (!anunciosMap.has(row.id)) {
        anunciosMap.set(row.id, {
          ...row,
          imagens: []
        });
        delete anunciosMap.get(row.id).imagem_id;
        delete anunciosMap.get(row.id).url_imagem;
        delete anunciosMap.get(row.id).principal;
      }
      
      if (row.imagem_id) {
        anunciosMap.get(row.id).imagens.push({
          id: row.imagem_id,
          url_imagem: row.url_imagem,
          principal: row.principal
        });
      }
    });

    const anuncios = Array.from(anunciosMap.values());
    res.json({ anuncios });

  } catch (error) {
    console.error('Erro ao listar anúncios:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Listar um anúncio por id com suas imagens
exports.listarPorId = async (req, res, returnResult = false) => {
  const { id } = req.params;
  try {

    const resultAnuncio = await pool.request().query`SELECT * FROM anuncios WHERE id = ${id}`;
    
    if (resultAnuncio.recordset.length === 0) {
      if (!returnResult) {
        return res.status(404).json({ message: 'Anúncio não encontrado.' });
      }
      return null;
    }

    const resultImagens = await pool.request().query`SELECT id, url_imagem, principal FROM imagensAnuncio WHERE anuncio_id = ${id}`;
    
    const anuncio = resultAnuncio.recordset[0];
    anuncio.imagens = resultImagens.recordset;

    if (returnResult) {
        if (res.headersSent) return; 
        res.status(201).json({ anuncio });
    } else {
        res.json({ anuncio });
    }

  } catch (error) {
    console.error('Erro ao buscar anúncio:', error);
    if (!returnResult && !res.headersSent) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  }
};

// Excluir anúncio
exports.excluir = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request().query`
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