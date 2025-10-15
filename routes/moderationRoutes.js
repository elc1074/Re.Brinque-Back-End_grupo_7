const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/', async (req, res) => {
  const { texto } = req.body;

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
    console.error('Erro na moderação:', error.message);
    res.status(500).json({ error: 'Erro ao verificar conteúdo' });
  }
});

module.exports = router;
