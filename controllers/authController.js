const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const sql = require('mssql');
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- CALLBACK DO GOOGLE ---
exports.googleCallback = async (req, res) => {
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

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 8,
    });

    res.status(200).json({
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
  try {
    const { code, redirect_uri, nome: nomeParam, login: loginParam, google_id: googleIdParam } = req.body;

    let nome = nomeParam;
    let login = loginParam;
    let google_id = googleIdParam;

    if (code) {
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirect_uri || 'https://front-re-brinque.vercel.app',
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        return res.status(400).json({ error: 'Falha na autenticação Google' });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Falha ao buscar dados do usuário');
      }

      const googleUser = await userInfoResponse.json();

      nome = googleUser.name;
      login = googleUser.email;
      google_id = googleUser.sub;
    }

    const userCheck = await pool.request()
      .input('email', sql.VarChar(255), login)
      .query('SELECT * FROM usuarios WHERE email = @email');

    let usuario;

    if (userCheck.recordset.length > 0) {
      usuario = userCheck.recordset[0];

      if (google_id && !usuario.google_id) {
        await pool.request()
          .input('id', sql.Int, usuario.id)
          .input('google_id', sql.VarChar(255), google_id)
          .query('UPDATE usuarios SET google_id = @google_id WHERE id = @id');
        
        usuario.google_id = google_id;
      }

    } else {
      const result = await pool.request()
        .input('nome_completo', sql.VarChar(255), nome)
        .input('email', sql.VarChar(255), login)
        .input('google_id', sql.VarChar(255), google_id || null)
        .input('telefone', sql.VarChar(20), '')
        .query(`
          INSERT INTO usuarios (nome_completo, email, senha_hash, telefone, google_id)
          OUTPUT INSERTED.id, INSERTED.nome_completo, INSERTED.email, INSERTED.telefone, INSERTED.google_id
          VALUES (@nome_completo, @email, NULL, @telefone, @google_id)
        `);

      usuario = result.recordset[0];
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email,
        auth_type: 'google'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,           
      sameSite: "none",         
      path: "/",               
      maxAge: 1000 * 60 * 60 * 8, 
    });

    res.status(200).json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome_completo,
        email: usuario.email,
        telefone: usuario.telefone,
        google_id: usuario.google_id
      },
      auth_type: 'google',
      message: 'Usuário Google sincronizado com sucesso'
    });

  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: 'Este e-mail já está em uso.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
  }
};

// --- LISTAR USUÁRIOS ---
exports.getUsuarios = async (req, res) => {
  try {
    const result = await pool.request()
      .query('SELECT id, nome_completo, email, telefone, google_id, data_cadastro FROM usuarios ORDER BY nome_completo');
    
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};