// socketManager.js - VERSÃO COM DEBUG DETALHADO
const pool = require('./db').pool;

// Armazena quais usuários estão em quais salas
const roomUsers = new Map(); // roomName -> Set(userIds)

const configureSocket = (io) => {
  console.log('Configurando Socket.io...');
  
  io.on('connection', (socket) => {
    console.log(`\n=== NOVA CONEXÃO ===`);
    console.log(`Socket conectado: ${socket.id}`);
    console.log(`Total de sockets conectados: ${io.engine.clientsCount}`);
    
    // Evento para entrar em uma sala de conversa
    socket.on('joinRoom', async (data) => {
      try {
        console.log(`\nJOIN_ROOM recebido:`);
        console.log('Dados recebidos:', JSON.stringify(data, null, 2));
        console.log('Socket ID:', socket.id);
        
        if (!data || !data.conversationId || !data.userId) {
          console.log('Dados inválidos recebidos');
          return socket.emit('joinError', { 
            error: 'Dados inválidos. conversationId e userId são obrigatórios',
            received: data
          });
        }

        const { conversationId, userId } = data;
        const roomName = `conversa_${conversationId}`;

        console.log(`Sala: ${roomName}`);
        console.log(`User ID: ${userId}`);
        console.log(`Socket ID: ${socket.id}`);

        // DEBUG: Mostra salas atuais do socket
        const currentRooms = Array.from(socket.rooms);
        console.log(`Salas atuais do socket:`, currentRooms);

        // Sair de outras salas de conversa
        currentRooms.forEach(room => {
          if (room.startsWith('conversa_') && room !== roomName) {
            socket.leave(room);
            console.log(`⬅Saiu da sala: ${room}`);
          }
        });

        // Entrar na nova sala
        socket.join(roomName);
        
        // Atualizar registro de usuários na sala
        if (!roomUsers.has(roomName)) {
          roomUsers.set(roomName, new Set());
        }
        roomUsers.get(roomName).add(userId);
        
        console.log(`Entrou na sala: ${roomName}`);
        console.log(`Usuários na sala ${roomName}:`, Array.from(roomUsers.get(roomName)));

        // DEBUG: Verificar quantos sockets estão na sala
        const roomSockets = await io.in(roomName).fetchSockets();
        console.log(`Sockets na sala ${roomName}:`, roomSockets.length);
        roomSockets.forEach(s => {
          console.log(`   - Socket: ${s.id}, User: ${s.userId || 'Não autenticado'}`);
        });

        // Confirmação
        socket.emit('roomJoined', { 
          room: roomName, 
          conversationId: conversationId,
          userId: userId,
          roomUsers: Array.from(roomUsers.get(roomName)),
          roomSockets: roomSockets.length
        });

        console.log(`Confirmacao enviada para socket ${socket.id}`);

      } catch (error) {
        console.error('Erro no joinRoom:', error);
        socket.emit('joinError', { error: error.message });
      }
    });

    // Evento para enviar mensagem
    socket.on('enviarMensagem', async (data) => {
      try {
        console.log(`\nENVIAR_MENSAGEM recebido:`);
        console.log('Dados:', JSON.stringify(data, null, 2));
        console.log('Socket ID:', socket.id);

        const { conversationId, senderId, content } = data;
        const roomName = `conversa_${conversationId}`;

        console.log(`Sala de destino: ${roomName}`);
        
        // DEBUG: Verificar quem está na sala
        const roomSockets = await io.in(roomName).fetchSockets();
        console.log(`Sockets na sala ${roomName}:`, roomSockets.length);
        
        // Salvar no banco
        const result = await pool.query(
          `INSERT INTO mensagens (conversa_id, remetente_id, conteudo, data_envio) 
           VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [conversationId, senderId, content]
        );

        const newMessage = result.rows[0];
        console.log(`Mensagem salva no banco:`, newMessage.id);

        // Enviar para a sala
        io.to(roomName).emit('novaMensagem', newMessage);
        console.log(`Mensagem broadcast para ${roomSockets.length} sockets na sala ${roomName}`);

      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        socket.emit('messageError', { error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`\nDESCONEXÃO: Socket ${socket.id} desconectado`);
      console.log(`Sockets restantes: ${io.engine.clientsCount - 1}`);
    });

    // Evento de debug para listar salas
    socket.on('debug_rooms', async () => {
      const rooms = Array.from(io.sockets.adapter.rooms);
      console.log('\n=== DEBUG SALAS ===');
      rooms.forEach(([roomName, sockets]) => {
        if (roomName.startsWith('conversa_')) {
          console.log(`${roomName}: ${sockets.size} sockets`);
        }
      });
    });
  });
};

module.exports = configureSocket;