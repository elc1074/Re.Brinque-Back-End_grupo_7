const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/', async (req, res) => {
  const { texto } = req.body;

  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'Texto inválido ou ausente.' });
  }

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY não está definida.');
    return res.status(500).json({ error: 'Chave da OpenAI não configurada.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/moderations',
      { input: texto },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const resultado = response.data.results[0];
    res.json({
      flagged: resultado.flagged,
      categorias: resultado.categories,
    });
  } catch (error) {
    console.error('Erro na moderação:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao verificar conteúdo' });
  }
});

module.exports = router;
