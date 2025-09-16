exports.getCloudinaryConfig = (req, res) => {
  /*
    #swagger.tags = ['Configuração']
    #swagger.summary = 'Obter configuração do Cloudinary'
    #swagger.description = 'Retorna as chaves públicas necessárias para o front-end interagir com a API do Cloudinary para fazer upload de imagens.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Configuração retornada com sucesso.',
      content: { "application/json": { schema: {
        type: 'object',
        properties: {
          cloudName: { type: 'string', example: 'seu-cloud-name' },
          apiKey: { type: 'string', example: '123456789012345' },
          uploadPreset: { type: 'string', example: 'seu-upload-preset' }
        }
      }}}
    }
    #swagger.responses[500] = { description: 'Erro de configuração do servidor ou erro interno.' }
  */
  try {
    const cloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
    };

    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.uploadPreset) {
      console.error('As variáveis de ambiente do Cloudinary não estão definidas corretamente.');
      return res.status(500).json({ message: 'Erro de configuração do servidor.' });
    }

    res.json(cloudinaryConfig);
  } catch (error) {
    console.error('Erro ao obter a configuração do Cloudinary:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};