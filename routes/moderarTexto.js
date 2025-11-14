const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
  const { texto } = req.body;

  if (!texto || typeof texto !== "string") {
    return res.status(400).json({ error: "Texto inválido" });
  }

  try {
    const response = await axios.post(
      "https://api.thehive.ai/api/v3/hive/text-moderation",
      {
        input: [
          {
            text: texto,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HIVE_SECRET_KEY}`,
        },
      }
    );

    const data = response.data;
    const output = data?.output?.[0];

    const classes = output?.classes || [];
    const stringMatches = output?.string_matches || [];

    const bloqueiosCriticos = [
      "sexual",
      "sexual_description",
      "child_exploitation",
      "self_harm",
      "violence",
      "violent_description",
      "weapons",
      "drugs",
      "hate",
      "bullying",
    ];

    const categoriaSensivel = classes.find(
      (c) => bloqueiosCriticos.includes(c.class) && c.value >= 1
    );

    const contemProfanidade = stringMatches.some(
      (m) => m.type === "profanity"
    );

    const bloqueado = Boolean(categoriaSensivel || contemProfanidade);

    return res.status(200).json({
      bloqueado,
      categorias: classes,
      palavrasDetectadas: stringMatches,
    });
  } catch (error) {
    console.error("Erro na moderação:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro interno ao comunicar com Hive" });
  }
});

module.exports = router;
