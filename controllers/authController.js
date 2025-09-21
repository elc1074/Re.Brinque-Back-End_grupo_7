const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); // A dependência 'mssql' foi removida
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- CALLBACK DO GOOGLE ---
exports.googleCallback = async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Callback de Autenticação Google'
    #swagger.description = 'Processa o token de credencial do Google para login ou registro.'
    #swagger.requestBody = { ... }
    #swagger.responses[200] = { ... }
    #swagger.responses[500] = { ... }
  */
  try {
    const { credential } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleUser = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };

    const userCheck = await pool.query("SELECT * FROM usuarios WHERE email = $1", [googleUser.email]);

    let usuario;

    if (userCheck.rows.length > 0) {
      usuario = userCheck.rows[0];
    } else {
      const query = `
        INSERT INTO usuarios (nome_completo, email, senha_hash, telefone, google_id)
        VALUES ($1, $2, NULL, $3, $4)
        RETURNING id, nome_completo, email, telefone, google_id
      `;
      const values = [googleUser.name, googleUser.email, "", googleUser.id];
      const result = await pool.query(query, values);

      usuario = result.rows[0];
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, auth_type: "google" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome_completo,
        email: usuario.email,
        telefone: usuario.telefone,
        google_id: usuario.google_id,
      },
      auth_type: "google",
      message: "Login Google realizado com sucesso",
    });
  } catch (error) {
    console.error("Erro na autenticação Google:", error);
    res.status(500).json({ error: "Erro interno no processamento Google" });
  }
};

// --- CADASTRO DE NOVO USUÁRIO ---
exports.register = async (req, res) => {
  /* #swagger.tags = ['Autenticação']
    #swagger.summary = 'Registrar um novo usuário'
    #swagger.description = 'Cria uma nova conta de usuário com nome, e-mail e senha.'
    #swagger.requestBody = { ... }
    #swagger.responses[201] = { ... }
    #swagger.responses[400] = { ... }
    #swagger.responses[409] = { ... }
    #swagger.responses[500] = { ... }
  */
  const { nome_completo, email, senha, telefone } = req.body;

  if (!nome_completo || !email || !senha) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    const query = `
      INSERT INTO usuarios (nome_completo, email, senha_hash, telefone)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, nome_completo
    `;
    const values = [nome_completo, email, senha_hash, telefone || ''];
    const result = await pool.query(query, values);

    const novoUsuario = result.rows[0];

    const token = jwt.sign(
      { id: novoUsuario.id, email: novoUsuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      token,
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome_completo,
        email: novoUsuario.email
      },
      auth_type: 'normal'
    });

  } catch (error) {
    // Código '23505' é para violação de constraint de unicidade no PostgreSQL
    if (error.code === '23505') { 
      return res.status(409).json({ message: 'Este e-mail já está em uso.' });
    }
    console.error("Erro no registro:", error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// --- LOGIN DE USUÁRIO ---
exports.login = async (req, res) => {
   /* #swagger.tags = ['Autenticação']
    #swagger.summary = 'Login de usuário'
    #swagger.description = 'Autentica um usuário com e-mail e senha e retorna um token JWT.'
    #swagger.requestBody = { ... }
    #swagger.responses[200] = { ... }
    #swagger.responses[400] = { ... }
    #swagger.responses[401] = { ... }
    #swagger.responses[500] = { ... }
  */
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const usuario = result.rows[0];

    if (usuario.senha_hash === null) {
      return res.status(401).json({
        message: 'Esta conta usa login com Google. Use o botão "Entrar com Google".',
        auth_type: 'google'
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Login bem-sucedido!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome_completo,
        email: usuario.email
      },
      auth_type: 'normal'
    });

  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// --- SINCRONIZAÇÃO DE USUÁRIO GOOGLE ---
exports.syncUsuario = async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Sincronizar conta de usuário com o Google via authorization_code'
    #swagger.description = 'Recebe o código de autorização do Google, troca por token, busca dados do usuário e registra ou autentica.'
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { type: "object", properties: { code: { type: "string" }, redirect_uri: { type: "string" } } } } } }
    #swagger.responses[200] = { description: 'Login Google realizado com sucesso' }
    #swagger.responses[400] = { description: 'Erro na autenticação Google' }
    #swagger.responses[500] = { description: 'Erro interno no servidor' }
  */
  try {
    const { code, redirect_uri } = req.body;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(400).json({ error: 'Falha ao obter token Google', details: errorText });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userInfoResponse.ok) {
      return res.status(400).json({ error: 'Falha ao obter dados do usuário Google' });
    }

    const googleUser = await userInfoResponse.json();

    const userCheck = await pool.query('SELECT * FROM usuarios WHERE email = $1', [googleUser.email]);

    let usuario;

    if (userCheck.rows.length > 0) {
      usuario = userCheck.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO usuarios (nome_completo, email, senha_hash, telefone, google_id)
        VALUES ($1, $2, NULL, '', $3)
        RETURNING id, nome_completo, email, telefone, google_id
      `;
      const values = [googleUser.name, googleUser.email, googleUser.sub];
      const result = await pool.query(insertQuery, values);
      usuario = result.rows[0];
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, auth_type: 'google' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      token,
      usuario,
      auth_type: 'google',
      message: 'Login Google realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no login com código OAuth:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};


// --- LISTAR USUÁRIOS ---
exports.getUsuarios = async (req, res) => {
  /*
    #swagger.tags = ['Usuários']
    #swagger.summary = 'Listar todos os usuários'
    #swagger.description = 'Retorna uma lista de todos os usuários cadastrados no sistema (sem dados sensíveis).'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { ... }
    #swagger.responses[500] = { ... }
  */
  try {
    const result = await pool.query('SELECT id, nome_completo, email, telefone, google_id, data_cadastro FROM usuarios ORDER BY nome_completo');
    
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};