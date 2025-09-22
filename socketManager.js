const pool = require('./db').pool;

function configureSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Novo cliente conectado: ${socket.id}`);

    // Evento para o usuário entrar em uma sala de conversa específica (VERSÃO COM DEBUG)
    socket.on('joinRoom', (conversationId) => {
      try {
        // Log para ver o que estamos recebendo
        console.log(`Tentando entrar na sala. Tipo recebido: ${typeof conversationId}, Valor: ${conversationId}`);

        // A função .join() espera uma string. Vamos garantir que seja uma.
        const roomName = String(conversationId);

        socket.join(roomName);

        console.log(`✅ SUCESSO: Usuário ${socket.id} entrou na sala '${roomName}'`);

      } catch (error) {
        // Se qualquer erro ocorrer, ele será capturado e exibido aqui!
        console.error(`❌ ERRO FATAL no evento 'joinRoom':`, error);
      }
    });

    socket.on('sendMessage', async (data) => {
      const { conversationId, senderId, content } = data;

      try {
        const query = `
          INSERT INTO mensagens (conversa_id, remetente_id, conteudo)
          VALUES ($1, $2, $3)
          RETURNING *;
        `;
        const result = await pool.query(query, [conversationId, senderId, content]);
        const newMessage = result.rows[0];

        io.to(String(conversationId)).emit('receiveMessage', newMessage); // Adicionado String() por segurança
      } catch (error) {
        console.error('Erro ao salvar ou emitir mensagem:', error);
        socket.emit('messageError', { error: 'Não foi possível enviar a mensagem.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = configureSocket;