
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../db');

// --- CADASTRO DE NOVO USUÁRIO ---
exports.register = async (req, res) => {
  const { nome_completo, email, senha, telefone } = req.body;

  // Validação básica dos campos
  if (!nome_completo || !email || !senha) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
  }

  try {
    // 1. Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    // 2. Inserir o usuário no banco de dados
    const result = await sql.query`
      INSERT INTO usuarios (nome_completo, email, senha_hash, telefone)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.nome_completo
      VALUES (${nome_completo}, ${email}, ${senha_hash}, ${telefone})
    `;

    const novoUsuario = result.recordset[0];

    // 3. Gerar um token JWT para o novo usuário
    const token = jwt.sign(
      { id: novoUsuario.id, email: novoUsuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Token expira em 8 horas
    );

    res.status(201).json({ 
      message: 'Usuário cadastrado com sucesso!', 
      token,
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome_completo,
        email: novoUsuario.email
      }
    });

  } catch (error) {
    // Verifica se o erro é de violação de chave única (e-mail duplicado)
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: 'Este e-mail já está em uso.' });
    }
    console.error('Erro no cadastro:', error);
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
    // 1. Buscar o usuário pelo e-mail
    const result = await sql.query`SELECT * FROM usuarios WHERE email = ${email}`;

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // E-mail não encontrado
    }

    const usuario = result.recordset[0];

    // 2. Comparar a senha fornecida com a senha criptografada no banco
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Senha incorreta
    }

    // 3. Gerar o token JWT
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
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
