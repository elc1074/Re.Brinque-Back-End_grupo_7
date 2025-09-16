const { sql, pool } = require('../db');

// Criar anúncio com imagens
exports.criar = async (req, res) => {
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Criar um novo anúncio'
    #swagger.description = 'Cria um novo anúncio associado a um usuário, incluindo imagens.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/CorpoCriarAnuncio" } } }
    }
    #swagger.responses[201] = { 
      description: 'Anúncio criado com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: { anuncio: { $ref: '#/components/schemas/Anuncio' } }
      } } }
    }
    #swagger.responses[400] = { description: 'Campos obrigatórios faltando.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const {
    usuario_id,
    categoria_id,
    endereco_completo,
    titulo,
    descricao,
    marca,
    tipo,
    condicao,
    status,
    imagens 
  } = req.body;

  if (!usuario_id || !categoria_id || !titulo || !tipo || !condicao) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
  }

  const transaction = pool.transaction();
  try {
    await transaction.begin();

    const resultAnuncio = await transaction.request().query`
      INSERT INTO anuncios (
        usuario_id, categoria_id, endereco_completo, titulo, descricao, marca, tipo, condicao, status, data_publicacao, data_atualizacao
      )
      OUTPUT INSERTED.id
      VALUES (
        ${usuario_id}, ${categoria_id}, ${endereco_completo}, ${titulo}, ${descricao}, ${marca}, ${tipo}, ${condicao}, ${status || 'DISPONIVEL'}, GETDATE(), GETDATE()
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
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Editar um anúncio'
    #swagger.description = 'Atualiza os dados de um anúncio existente pelo seu ID.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID do Anúncio', required: true, type: 'integer' }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/CorpoEditarAnuncio" } } }
    }
    #swagger.responses[201] = { 
      description: 'Anúncio atualizado com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: { anuncio: { $ref: '#/components/schemas/Anuncio' } }
      } } }
    }
    #swagger.responses[404] = { description: 'Anúncio não encontrado.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { id } = req.params;
  const {
    categoria_id,
    endereco_completo,
    titulo,
    descricao,
    marca,
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
        endereco_completo = ${endereco_completo},
        titulo = ${titulo},
        descricao = ${descricao},
        marca = ${marca},
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
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Listar e filtrar anúncios'
    #swagger.description = 'Retorna uma lista de todos os anúncios, com a possibilidade de aplicar filtros.'
    #swagger.parameters['titulo'] = { in: 'query', description: 'Filtrar por título (busca parcial)', type: 'string' }
    #swagger.parameters['categoria_id'] = { in: 'query', description: 'Filtrar por ID da categoria', type: 'integer' }
    #swagger.parameters['tipo'] = { in: 'query', description: 'Filtrar por tipo', type: 'string', enum: ['TROCA', 'DOACAO'] }
    #swagger.parameters['condicao'] = { in: 'query', description: 'Filtrar por condição', type: 'string', enum: ['NOVO', 'SEMINOVO', 'USADO'] }
    #swagger.parameters['marca'] = { in: 'query', description: 'Filtrar por marca (busca parcial)', type: 'string' }
    #swagger.responses[200] = {
      description: 'Lista de anúncios retornada com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: {
          anuncios: {
            type: 'array',
            items: { $ref: '#/components/schemas/Anuncio' }
          }
        }
      } } }
    }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { titulo, categoria_id, tipo, condicao, marca } = req.query;

  try {
    let query = `
        SELECT 
            a.*, 
            ia.id as imagem_id, 
            ia.url_imagem, 
            ia.principal
        FROM 
            anuncios a
        LEFT JOIN 
            imagensAnuncio ia ON a.id = ia.anuncio_id
    `;

    const conditions = [];
    const request = pool.request();

    if (titulo) {
      conditions.push(`a.titulo LIKE @titulo`);
      request.input('titulo', sql.VarChar, `%${titulo}%`);
    }
    if (categoria_id) {
      conditions.push(`a.categoria_id = @categoria_id`);
      request.input('categoria_id', sql.Int, categoria_id);
    }
    if (tipo) {
      conditions.push(`a.tipo = @tipo`);
      request.input('tipo', sql.VarChar, tipo);
    }
    if (condicao) {
      conditions.push(`a.condicao = @condicao`);
      request.input('condicao', sql.VarChar, condicao);
    }
    if (marca) {
        conditions.push(`a.marca LIKE @marca`);
        request.input('marca', sql.VarChar, `%${marca}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.data_publicacao DESC`;

    const result = await request.query(query);

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

//Listar anúncios por ID do usuário
exports.listarPorUsuario = async (req, res) => {
    /*
      #swagger.tags = ['Anúncios']
      #swagger.summary = 'Listar anúncios por ID do usuário'
      #swagger.description = 'Retorna todos os anúncios criados por um usuário específico.'
      #swagger.security = [{ "bearerAuth": [] }]
      #swagger.parameters['usuario_id'] = { in: 'path', description: 'ID do Usuário', required: true, type: 'integer' }
      #swagger.responses[200] = {
        description: 'Lista de anúncios do usuário retornada com sucesso.',
        content: { "application/json": { schema: { 
          type: 'object',
          properties: {
            anuncios: {
              type: 'array',
              items: { $ref: '#/components/schemas/Anuncio' }
            }
          }
        } } }
      }
      #swagger.responses[500] = { description: 'Erro interno do servidor.' }
    */
    const { usuario_id } = req.params;

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
            WHERE
                a.usuario_id = ${usuario_id}
            ORDER BY a.data_publicacao DESC
        `;

        if (result.recordset.length === 0) {
            return res.json({ anuncios: [] });
        }

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
        console.error('Erro ao listar anúncios do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar anúncio por id
exports.listarPorId = async (req, res, returnResult = false) => {
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Obter anúncio por ID'
    #swagger.description = 'Retorna os detalhes de um anúncio específico pelo seu ID.'
    #swagger.parameters['id'] = { in: 'path', description: 'ID do Anúncio', required: true, type: 'integer' }
    #swagger.responses[200] = {
      description: 'Anúncio encontrado com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: { anuncio: { $ref: '#/components/schemas/Anuncio' } }
      } } }
    }
    #swagger.responses[404] = { description: 'Anúncio não encontrado.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
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
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Excluir um anúncio'
    #swagger.description = 'Remove um anúncio do sistema pelo seu ID.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', description: 'ID do Anúncio', required: true, type: 'integer' }
    #swagger.responses[200] = {
      description: 'Anúncio excluído com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: { 
          message: { type: 'string', example: 'Anúncio excluído com sucesso.' },
          anuncio: { $ref: '#/components/schemas/Anuncio' }
        }
      } } }
    }
    #swagger.responses[404] = { description: 'Anúncio não encontrado.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
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