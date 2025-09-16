exports.getCloudinaryConfig = (req, res) => {
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