const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Delay simples para evitar flood
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function moderarViaChat(texto) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um moderador de conteúdo. Responda APENAS com "SAFE" ou "VIOLATION". Nada mais.' },
        { role: 'user', content: texto },
      ],
      max_tokens: 5 
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
      maxRedirects: 0,
    }
  );

  const resposta = response.data.choices[0].message.content.trim().toUpperCase();
  return {
    flagged: resposta === 'VIOLATION',
    metodo: 'fallback_chat'
  };
}

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
    await delay(500); 

    // 🎯 Tentativa 1 — API de Moderação
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
    return res.json({
      flagged: resultado.flagged,
      categorias: resultado.categories,
      metodo: 'moderation_api'
    });
  } catch (error) {
    const status = error.response?.status;
    console.warn('Falha na moderação direta, tentando fallback...', status);

    if (status === 429 || status === 500 || status === 503) {
      try {
        const resultadoFallback = await moderarViaChat(texto);
        return res.json(resultadoFallback);
      } catch (fallbackError) {
        console.error('Falha também no fallback:', fallbackError.message);
      }
    }

    return res.status(500).json({
      error: 'Erro ao verificar conteúdo, mesmo após fallback.',
    });
  }
});

module.exports = router;
