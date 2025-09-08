// controllers/cloudinaryController.js

exports.getCloudinaryConfig = (req, res) => {
  try {
    const cloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    };

    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey) {
      console.error('As variáveis de ambiente do Cloudinary não estão definidas.');
      return res.status(500).json({ message: 'Erro de configuração do servidor.' });
    }

    res.json(cloudinaryConfig);
  } catch (error) {
    console.error('Erro ao obter a configuração do Cloudinary:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};