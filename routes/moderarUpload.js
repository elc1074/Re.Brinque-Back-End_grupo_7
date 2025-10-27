// routes/moderarUpload.js
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

  const filePath = path.resolve(req.file.path);
  const data = new FormData();

  data.append('media', fs.createReadStream(filePath));
  data.append('models', 'nudity-2.1,weapon,alcohol,recreational_drug,medical,offensive-2.0,text-content,gore-2.0,tobacco,genai,violence,self-harm');
  data.append('api_user', process.env.SIGHTENGINE_USER);
  data.append('api_secret', process.env.SIGHTENGINE_SECRET);

  try {
    const response = await axios.post('https://api.sightengine.com/1.0/check.json', data, {
      headers: data.getHeaders(),
    });

    fs.unlinkSync(filePath); // remove imagem após análise

    const resultado = response.data;

    const bloqueado =
      resultado.offensive?.middle_finger > 0.8 ||
      resultado.nudity?.none < 0.5 ||
      resultado.violence?.prob > 0.7 ||
      resultado.weapon?.classes?.firearm > 0.7 ||
      resultado.gore?.prob > 0.7 ||
      resultado['self-harm']?.prob > 0.7;

    res.json({ bloqueado, resultado });
  } catch (error) {
    fs.unlinkSync(filePath);
    console.error('Erro na moderação:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao analisar imagem.' });
  }
});

module.exports = router;
