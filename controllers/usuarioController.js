const { pool } = require('../db');

/**
 * Atualiza a foto de perfil do usuário (URL da imagem).
 * A URL da imagem DEVE ser enviada pelo frontend após o upload para o Cloudinary.
 */
exports.atualizarFotoPerfil = async (req, res) => {
  /*
    #swagger.tags = ['Usuários']
    #swagger.summary = 'Atualizar foto de perfil do usuário'
    #swagger.description = 'Atualiza a URL da foto de perfil para o usuário logado.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { 
        type: 'object',
        properties: {
          foto_perfil_url: { type: 'string', description: 'URL da imagem após o upload para o Cloudinary.' }
        },
        required: ['foto_perfil_url']
      } } }
    }
    #swagger.responses[200] = { 
      description: 'Foto de perfil atualizada com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: { 
          message: { type: 'string' },
          usuario: { $ref: '#/components/schemas/UsuarioDetalhes' }
        }
      } } }
    }
    #swagger.responses[400] = { description: 'URL da foto não fornecida.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { foto_perfil_url } = req.body;
  const usuarioId = req.user.id; // ID do usuário injetado pelo `verifyToken`

  if (!foto_perfil_url) {
    return res.status(400).json({ message: 'URL da foto não fornecida.' });
  }

  try {
    const query = `
      UPDATE usuarios
      SET 
        foto_perfil_url = $1
      WHERE id = $2
      RETURNING id, nome_completo, email, telefone, google_id, foto_perfil_url;
    `;
    
    const result = await pool.query(query, [foto_perfil_url, usuarioId]);

    if (result.rows.length === 0) {
      // Isso teoricamente não deve acontecer se o middleware `verifyToken` funcionar corretamente
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const usuarioAtualizado = result.rows[0];

    // Oculta dados sensíveis (embora a query já filtre a senha_hash)
    delete usuarioAtualizado.senha_hash; 

    res.status(200).json({ 
      message: 'Foto de perfil atualizada com sucesso.', 
      usuario: usuarioAtualizado 
    });

  } catch (error) {
    console.error('Erro ao atualizar foto de perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.buscarFotoPorId = async (req, res) => {
  /*
    #swagger.tags = ['Usuários']
    #swagger.summary = 'Obter foto de perfil por ID'
    #swagger.description = 'Retorna a URL da foto de perfil de um usuário específico. Não requer autenticação.'
    #swagger.parameters['id'] = { in: 'path', description: 'ID do Usuário', required: true, type: 'integer' }
    #swagger.responses[200] = { 
      description: 'URL da foto de perfil retornada com sucesso.',
      content: { "application/json": { schema: { 
        type: 'object',
        properties: {
          foto_perfil_url: { type: 'string', nullable: true, example: 'https://res.cloudinary.com/.../foto.jpg' }
        }
      } } }
    }
    #swagger.responses[404] = { description: 'Usuário não encontrado.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        foto_perfil_url
      FROM usuarios
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Se o usuário for encontrado, retorna a URL. 
    // Se a foto não foi enviada, será retornado 'null', o que é esperado.
    res.status(200).json({ 
      foto_perfil_url: result.rows[0].foto_perfil_url || null
    });

  } catch (error) {
    console.error(`Erro ao buscar foto de perfil para o ID ${id}:`, error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};