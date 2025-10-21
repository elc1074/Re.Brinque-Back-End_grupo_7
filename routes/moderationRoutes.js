const express = require('express');
const axios = require('axios');
const router = express.Router();

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;

router.post('/', async (req, res) => {
  const { texto } = req.body;

  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'Texto inválido ou ausente.' });
  }

  if (!HUGGINGFACE_TOKEN) {
    console.error('❌ Token da Hugging Face não está definido.');
    return res.status(500).json({ error: 'Token da Hugging Face não configurado.' });
  }

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/unitary/toxic-bert',
      { inputs: texto },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ resultado: response.data });
  } catch (error) {
    const status = error.response?.status;
    const mensagem = error.response?.data?.error || error.message;

    console.error('Erro na moderação:', { status, mensagem });
    res.status(500).json({ error: 'Erro ao verificar conteúdo.', detalhes: mensagem });
  }
});

module.exports = router;
