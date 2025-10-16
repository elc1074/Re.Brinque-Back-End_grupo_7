const express = require('express');
const axios = require('axios');
const router = express.Router();

const HF_API_KEY = process.env.HF_API_KEY;

const SAFE_LABELS = ['safe', '0']; 

router.post('/', async (req, res) => {
  const { texto } = req.body;

  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'Texto inválido ou ausente.' });
  }

  if (!HF_API_KEY) {
    console.error('HF_API_KEY não está definida no .env');
    return res.status(500).json({ error: 'Chave da HuggingFace não configurada.' });
  }

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/text-moderation-latest',
      { inputs: texto },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    const result = response.data;

    const flagged = result?.[0]?.label?.toLowerCase() !== 'safe';

    return res.json({
      flagged,
      metodo: 'huggingface'
    });

  } catch (error) {
    console.error('Erro na HuggingFace Inference API:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Erro ao verificar conteúdo via HuggingFace.',
      detalhes: error.response?.data?.error || error.message
    });
  }
});

module.exports = router;
