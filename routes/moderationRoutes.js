const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post('/', async (req, res) => {
  const { texto } = req.body;

  // Validação do campo "texto"
  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'Texto inválido ou ausente.' });
  }

  // Verificação da chave da OpenAI
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY não está definida.');
    return res.status(500).json({ error: 'Chave da OpenAI não configurada.' });
  }

  try {
    await delay(500);

    // Requisição à API de moderação da OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/moderations',
      { input: texto },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,      
        maxRedirects: 0,    
      }
    );

    const resultado = response.data.results[0];

    // Resposta bem-sucedida
    res.json({
      flagged: resultado.flagged,
      categorias: resultado.categories,
    });
  } catch (error) {
    const status = error.response?.status;
    const mensagem = error.response?.data?.error?.message || error.message;

    console.error('Erro na moderação:', {
      status,
      mensagem,
      detalhes: error.response?.data,
    });

    if (status === 429) {
      return res.status(429).json({
        error: 'Limite de requisições excedido. Tente novamente em instantes.',
        detalhes: mensagem,
      });
    }

    res.status(500).json({
      error: 'Erro ao verificar conteúdo.',
      detalhes: mensagem,
    });
  }
});

module.exports = router;
