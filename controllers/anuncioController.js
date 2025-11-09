const { pool } = require('../db');

// Criar anúncio com imagens
exports.criar = async (req, res) => {
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Criar um novo anúncio'
    #swagger.description = 'Cria um novo anúncio associado a um usuário, incluindo imagens e geolocalização.'
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
    titulo,
    descricao,
    marca,
    tipo,
    condicao,
    status,
    imagens,
    location 
  } = req.body;

  if (!usuario_id || !categoria_id || !titulo || !tipo || !condicao) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
  }

  // Validação da localização
  if (!location || typeof location.latitude === 'undefined' || typeof location.longitude === 'undefined') {
    return res.status(400).json({ message: 'Localização (latitude e longitude) é obrigatória.' });
  }

  const client = await pool.connect(); 
  try {
    await client.query('BEGIN'); 

    const queryAnuncio = `
      INSERT INTO anuncios (
        usuario_id, categoria_id, titulo, descricao, marca, tipo, condicao, status, 
        localizacao, 
        data_publicacao, data_atualizacao
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
        ST_MakePoint($9, $10), 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    const valuesAnuncio = [
      usuario_id,       // $1
      categoria_id,     // $2
      titulo,           // $3
      descricao,        // $4
      marca,            // $5
      tipo,             // $6
      condicao,         // $7
      status || 'DISPONIVEL', // $8
      location.longitude, // $9
      location.latitude   // $10
    ];
    
    const resultAnuncio = await client.query(queryAnuncio, valuesAnuncio);
    const anuncioId = resultAnuncio.rows[0].id;

    if (imagens && imagens.length > 0) {
      for (const imagem of imagens) {
        const queryImagem = `
          INSERT INTO imagensAnuncio (anuncio_id, url_imagem, principal)
          VALUES ($1, $2, $3)
        `;
        const valuesImagem = [anuncioId, imagem.url_imagem, imagem.principal || false];
        await client.query(queryImagem, valuesImagem);
      }
    }

    await client.query('COMMIT'); 
    
    await exports.listarPorId({ params: { id: anuncioId } }, res, true); 
    
  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  } finally {
    client.release(); 
  }
};

// Editar anúncio com imagens
exports.editar = async (req, res) => {
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Editar um anúncio'
    #swagger.description = 'Atualiza os dados de um anúncio existente pelo seu ID, incluindo a geolocalização.'
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
    titulo,
    descricao,
    marca,
    tipo,
    condicao,
    status,
    imagens,
    location 
  } = req.body;

  if (!location || typeof location.latitude === 'undefined' || typeof location.longitude === 'undefined') {
    return res.status(400).json({ message: 'Localização (latitude e longitude) é obrigatória.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const queryUpdate = `
      UPDATE anuncios
      SET
        categoria_id = $1,
        titulo = $2,
        descricao = $3,
        marca = $4,
        tipo = $5,
        condicao = $6,
        status = $7,
        localizacao = ST_MakePoint($8, $9), 
        data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const valuesUpdate = [
      categoria_id,       // $1
      titulo,             // $2
      descricao,          // $3
      marca,              // $4
      tipo,               // $5
      condicao,           // $6
      status,             // $7
      location.longitude, // $8
      location.latitude,  // $9
      id                  // $10
    ];

    const result = await client.query(queryUpdate, valuesUpdate);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Anúncio não encontrado.' });
    }

    await client.query('DELETE FROM imagensAnuncio WHERE anuncio_id = $1', [id]);
    if (imagens && imagens.length > 0) {
      for (const imagem of imagens) {
        const queryImagem = `
          INSERT INTO imagensAnuncio (anuncio_id, url_imagem, principal)
          VALUES ($1, $2, $3)
        `;
        const valuesImagem = [id, imagem.url_imagem, imagem.principal || false];
        await client.query(queryImagem, valuesImagem);
      }
    }

    await client.query('COMMIT');
    
    await exports.listarPorId({ params: { id } }, res, true);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao editar anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};

// Listar e filtrar anúncios
exports.listarTodos = async (req, res) => {
  /*
    #swagger.tags = ['Anúncios']
    #swagger.summary = 'Listar e filtrar anúncios (com geolocalização)'
    #swagger.description = 'Retorna uma lista de todos os anúncios, com a possibilidade de aplicar filtros e busca por proximidade.'
    #swagger.parameters['titulo'] = { in: 'query', description: 'Filtrar por título (busca parcial)', type: 'string' }
    #swagger.parameters['categoria_id'] = { in: 'query', description: 'Filtrar por ID da categoria', type: 'integer' }
    #swagger.parameters['tipo'] = { in: 'query', description: 'Filtrar por tipo', type: 'string', enum: ['TROCA', 'DOACAO'] }
    #swagger.parameters['condicao'] = { in: 'query', description: 'Filtrar por condição', type: 'string', enum: ['NOVO', 'SEMINOVO', 'USADO'] }
    #swagger.parameters['marca'] = { in: 'query', description: 'Filtrar por marca (busca parcial)', type: 'string' }
    #swagger.parameters['latitude'] = { in: 'query', description: 'Latitude do usuário (para busca por proximidade)', type: 'number', format: 'float' }
    #swagger.parameters['longitude'] = { in: 'query', description: 'Longitude do usuário (para busca por proximidade)', type: 'number', format: 'float' }
    #swagger.parameters['raio'] = { in: 'query', description: 'Raio de busca em quilômetros (usar com latitude/longitude)', type: 'number', format: 'float' }
    #swagger.responses[200] = {
      description: 'Lista de anúncios retornada com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: {
          anuncios: {
            type: 'array',
            items: { $ref: '#/components/schemas/AnuncioComDistancia' }
          }
        }
      } } }
    }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { 
    titulo, 
    categoria_id, 
    tipo, 
    condicao, 
    marca, 
    latitude,
    longitude,
    raio 
  } = req.query;

  try {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // --- Parâmetros de Filtro Padrão ---
    conditions.push(`a.status NOT IN ($${paramIndex++}, $${paramIndex++})`);
    values.push('NEGOCIANDO', 'FINALIZADO');

    if (titulo) {
      conditions.push(`a.titulo ILIKE $${paramIndex++}`); 
      values.push(`%${titulo}%`);
    }
    if (categoria_id) {
      conditions.push(`a.categoria_id = $${paramIndex++}`);
      values.push(categoria_id);
    }
    if (tipo) {
      conditions.push(`a.tipo = $${paramIndex++}`);
      values.push(tipo);
    }
    if (condicao) {
      conditions.push(`a.condicao = $${paramIndex++}`);
      values.push(condicao);
    }
    if (marca) {
        conditions.push(`a.marca ILIKE $${paramIndex++}`);
        values.push(`%${marca}%`);
    }
    
    let selectDistancia = '';
    let orderBy = 'ORDER BY a.data_publicacao DESC';
   
    if (latitude && longitude) {
      const userLon = parseFloat(longitude);
      const userLat = parseFloat(latitude);

      // Adiciona o cálculo de distância ao SELECT
      selectDistancia = `, ST_Distance(a.localizacao, ST_MakePoint($${paramIndex++}, $${paramIndex++})::geography) AS distancia_metros`;
      values.push(userLon, userLat);

      // Se um 'raio' for fornecido, adiciona um filtro ST_DWithin
      if (raio) {
        const raioEmMetros = parseFloat(raio) * 1000;
        
        conditions.push(`ST_DWithin(a.localizacao, ST_MakePoint($${paramIndex++}, $${paramIndex++})::geography, $${paramIndex++})`);
        values.push(userLon, userLat, raioEmMetros);
      }
      
      // Se a localização for fornecida, sempre ordena por distância
      orderBy = 'ORDER BY distancia_metros ASC NULLS LAST'; 
    }

    // --- Construção da Query ---
    let query = `
        SELECT 
          a.*,
          u.nome_completo as nome_usuario,
          ia.id as imagem_id, 
          ia.url_imagem, 
          ia.principal,
          ST_Y(a.localizacao::geometry) as latitude,  
          ST_X(a.localizacao::geometry) as longitude 
          ${selectDistancia} 
        FROM 
          anuncios a
        JOIN 
          usuarios u ON a.usuario_id = u.id 
        LEFT JOIN 
          imagensAnuncio ia ON a.id = ia.anuncio_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ${orderBy}`; 

    // --- Execução e Formatação ---
    const result = await pool.query(query, values);

    const anunciosMap = new Map();
    result.rows.forEach(row => {
      if (!anunciosMap.has(row.id)) {
        anunciosMap.set(row.id, {
          ...row,
          imagens: []
        });
        delete anunciosMap.get(row.id).imagem_id;
        delete anunciosMap.get(row.id).url_imagem;
        delete anunciosMap.get(row.id).principal;
        delete anunciosMap.get(row.id).localizacao; 
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

// Listar anúncios por ID do usuário
exports.listarPorUsuario = async (req, res) => {
    /*
      #swagger.tags = ['Anúncios']
      #swagger.summary = 'Listar anúncios por ID do usuário'
      #swagger.description = 'Retorna todos os anúncios criados por um usuário específico, incluindo dados de localização.'
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
        const query = `
            SELECT 
                a.*,
                u.nome_completo as nome_usuario,
                ST_Y(a.localizacao::geometry) as latitude,
                ST_X(a.localizacao::geometry) as longitude,
                ia.id as imagem_id, 
                ia.url_imagem, 
                ia.principal
            FROM 
                anuncios a
            JOIN 
                usuarios u ON a.usuario_id = u.id 
            LEFT JOIN 
                imagensAnuncio ia ON a.id = ia.anuncio_id
            WHERE
                a.usuario_id = $1
            ORDER BY a.data_publicacao DESC
        `;
        const result = await pool.query(query, [usuario_id]);

        if (result.rows.length === 0) {
            return res.json({ anuncios: [] });
        }

        const anunciosMap = new Map();
        result.rows.forEach(row => {
            if (!anunciosMap.has(row.id)) {
                anunciosMap.set(row.id, {
                    ...row,
                    imagens: []
                });
                delete anunciosMap.get(row.id).imagem_id;
                delete anunciosMap.get(row.id).url_imagem;
                delete anunciosMap.get(row.id).principal;
                delete anunciosMap.get(row.id).localizacao;
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
    #swagger.description = 'Retorna os detalhes de um anúncio específico pelo seu ID, including localização.'
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
    const queryAnuncio = `
      SELECT 
        a.*, 
        u.nome_completo as nome_usuario,
        ST_Y(a.localizacao::geometry) as latitude,
        ST_X(a.localizacao::geometry) as longitude
      FROM anuncios a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = $1
    `;
    const resultAnuncio = await pool.query(queryAnuncio, [id]);
    
    if (resultAnuncio.rows.length === 0) {
      if (!returnResult) {
        return res.status(404).json({ message: 'Anúncio não encontrado.' });
      }
      return null;
    }

    const resultImagens = await pool.query('SELECT id, url_imagem, principal FROM imagensAnuncio WHERE anuncio_id = $1', [id]);
    
    const anuncio = resultAnuncio.rows[0];
    anuncio.imagens = resultImagens.rows;
    delete anuncio.localizacao; 

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
          anuncio: { $ref: '#/components/schemas/AnuncioExcluido' }
        }
      } } }
    }
    #swagger.responses[404] = { description: 'Anúncio não encontrado.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM anuncios WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Anúncio não encontrado.' });
    }
    res.json({ message: 'Anúncio excluído com sucesso.', anuncio: result.rows[0] });
  } catch (error) {
    console.error('Erro ao excluir anúncio:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Atualizar o status de um anúncio
  exports.atualizarStatus = async (req, res) => {
    /*
      #swagger.tags = ['Anúncios']
      #swagger.summary = 'Atualizar o status de um anúncio'
      #swagger.description = 'Atualiza o status de um anúncio (ex: DISPONIVEL, NEGOCIANDO, FINALIZADO). Requer autenticação e que o usuário seja o dono do anúncio.'
      #swagger.security = [{ "bearerAuth": [] }]
      #swagger.parameters['id'] = { in: 'path', description: 'ID do Anúncio', required: true, type: 'integer' }
      #swagger.requestBody = {
        required: true,
        content: { "application/json": { schema: { 
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['DISPONIVEL', 'NEGOCIANDO', 'FINALIZADO'] }
          },
          required: ['status']
        } } }
      }
      #swagger.responses[200] = { 
        description: 'Status do anúncio atualizado com sucesso.',
        content: { "application/json": { schema: { 
            type: 'object',
            properties: { anuncio: { $ref: '#/components/schemas/Anuncio' } }
        } } }
      }
      #swagger.responses[400] = { description: 'Status inválido ou não fornecido.' }
      #swagger.responses[404] = { description: 'Anúncio não encontrado ou usuário não autorizado.' }
      #swagger.responses[500] = { description: 'Erro interno do servidor.' }
    */
    
    const { id } = req.params;
    const { status } = req.body;
    const usuarioId = req.user.id; 

    const allowedStatus = ['DISPONIVEL', 'NEGOCIANDO', 'FINALIZADO'];
    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({ 
        message: 'Status inválido. Valores permitidos: DISPONIVEL, NEGOCIANDO, FINALIZADO.' 
      });
    }

    try {
      const query = `
        UPDATE anuncios
        SET 
          status = $1, 
          data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $2 AND usuario_id = $3
        RETURNING *;
      `;
      
      const result = await pool.query(query, [status, id, usuarioId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Anúncio não encontrado ou usuário não autorizado para esta ação.' });
      }

      await exports.listarPorId({ params: { id } }, res);

    } catch (error) {
      console.error('Erro ao atualizar status do anúncio:', error);
      res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  };