export const socket = io();

socket.on('connect', () => {
    console.log(`Conectado com sucesso ao servidor com ID do cliente: ${socket.id}`);
});

socket.on('connect_error', (error) => {
    console.error('Erro de conexão do Socket.IO:', error);
});

socket.on('disconnect', (reason) => {
    console.warn(`Desconectado do servidor. Motivo: ${reason}`);
});
