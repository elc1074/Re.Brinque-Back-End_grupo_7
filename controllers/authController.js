const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const sql = require('mssql');
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- CALLBACK DO GOOGLE ---
exports.googleCallback = async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Callback de Autenticação Google'
    #swagger.description = 'Processa o token de credencial do Google para login ou registro.'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              credential: { type: 'string', description: 'O token ID JWT fornecido pelo Google Sign-In.' }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Login ou registro com Google realizado com sucesso.',
      schema: { $ref: '#/components/schemas/RespostaAutenticacao' }
    }
    #swagger.responses[500] = { description: 'Erro interno no processamento da autenticação Google.' }
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

    const userCheck = await pool.request()
      .input("email", sql.VarChar(255), googleUser.email)
      .query("SELECT * FROM usuarios WHERE email = @email");

    let usuario;

    if (userCheck.recordset.length > 0) {
      usuario = userCheck.recordset[0];
    } else {
      const result = await pool.request()
        .input("nome_completo", sql.VarChar(255), googleUser.name)
        .input("email", sql.VarChar(255), googleUser.email)
        .input("google_id", sql.VarChar(255), googleUser.id)
        .input("telefone", sql.VarChar(20), "")
        .query(`
          INSERT INTO usuarios (nome_completo, email, senha_hash, telefone, google_id)
          OUTPUT INSERTED.id, INSERTED.nome_completo, INSERTED.email, INSERTED.telefone, INSERTED.google_id
          VALUES (@nome_completo, @email, NULL, @telefone, @google_id)
        `);

      usuario = result.recordset[0];
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
    res.status(500).json({ error: "Erro interno no processamento Google" });
  }
};

// --- CADASTRO DE NOVO USUÁRIO ---
exports.register = async (req, res) => {
  /* #swagger.tags = ['Autenticação']
    #swagger.summary = 'Registrar um novo usuário'
    #swagger.description = 'Cria uma nova conta de usuário com nome, e-mail e senha.'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/CorpoRegistroUsuario" } } }
    }
    #swagger.responses[201] = {
      description: 'Usuário cadastrado com sucesso.',
      schema: { $ref: '#/components/schemas/RespostaAutenticacao' }
    }
    #swagger.responses[400] = { description: 'Campos obrigatórios faltando.' }
    #swagger.responses[409] = { description: 'Este e-mail já está em uso.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { nome_completo, email, senha, telefone } = req.body;

  if (!nome_completo || !email || !senha) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    const result = await pool.request()
      .input('nome_completo', sql.VarChar(255), nome_completo)
      .input('email', sql.VarChar(255), email)
      .input('senha_hash', sql.VarChar(255), senha_hash)
      .input('telefone', sql.VarChar(20), telefone || '')
      .query(`
        INSERT INTO usuarios (nome_completo, email, senha_hash, telefone)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.nome_completo
        VALUES (@nome_completo, @email, @senha_hash, @telefone)
      `);

    const novoUsuario = result.recordset[0];

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
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: 'Este e-mail já está em uso.' });
    }
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// --- LOGIN DE USUÁRIO ---
exports.login = async (req, res) => {
   /* #swagger.tags = ['Autenticação']
    #swagger.summary = 'Login de usuário'
    #swagger.description = 'Autentica um usuário com e-mail e senha e retorna um token JWT.'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/CorpoLoginUsuario" } } }
    }
    #swagger.responses[200] = {
      description: 'Login bem-sucedido.',
      schema: { $ref: '#/components/schemas/RespostaAutenticacao' }
    }
    #swagger.responses[400] = { description: 'E-mail e senha são obrigatórios.' }
    #swagger.responses[401] = { description: 'Credenciais inválidas ou a conta requer login com Google.' }
    #swagger.responses[500] = { description: 'Erro interno do servidor.' }
  */
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const result = await pool.request()
      .input('email', sql.VarChar(255), email)
      .query('SELECT * FROM usuarios WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const usuario = result.recordset[0];

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
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// --- SINCRONIZAÇÃO DE USUÁRIO GOOGLE ---
exports.syncUsuario = async (req, res) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Sincronizar conta de usuário com o Google'
    #swagger.description = 'Endpoint legado para sincronização com o Google via authorization_code, substituído por googleCallback.'
    #swagger.deprecated = true
  */
  // ... (código da função syncUsuario)
};

// --- LISTAR USUÁRIOS ---
exports.getUsuarios = async (req, res) => {
  /*
    #swagger.tags = ['Usuários']
    #swagger.summary = 'Listar todos os usuários'
    #swagger.description = 'Retorna uma lista de todos os usuários cadastrados no sistema (sem dados sensíveis).'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Lista de usuários obtida com sucesso.',
      content: { "application/json": { schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Usuario' }
      }}}
    }
    #swagger.responses[500] = { description: 'Erro ao buscar usuários.' }
  */
  try {
    const result = await pool.request()
      .query('SELECT id, nome_completo, email, telefone, google_id, data_cadastro FROM usuarios ORDER BY nome_completo');
    
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};