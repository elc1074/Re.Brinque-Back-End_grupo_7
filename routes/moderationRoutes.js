const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um moderador de conteúdo. Analise o texto do usuário e responda APENAS com "SAFE" ou "VIOLATION". Não explique, não adicione mais nada.'
          },
          { role: 'user', content: texto }
        ],
        max_tokens: 2 // ultra leve
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

    if (resposta !== 'SAFE' && resposta !== 'VIOLATION') {
      return res.status(500).json({ error: 'Falha de moderação. Resposta inesperada.' });
    }

    return res.json({
      flagged: resposta === 'VIOLATION',
      metodo: 'chat_only'
    });
  } catch (error) {
    console.error('Erro na rota de moderação via chat:', error.response?.data || error.message);

    return res.status(500).json({
      error: 'Erro ao verificar conteúdo com chat completions.',
      detalhes: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
