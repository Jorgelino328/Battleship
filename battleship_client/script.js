console.log('Tentando conectar com Socket.IO...');
const socket = io();

socket.on('connect', () => {
    console.log(`Conectado com sucesso ao servidor com o client ID: ${socket.id}`);
});

socket.on('connect_error', (error) => {
    console.error('Erro de conexão:', error);
});

socket.on('disconnect', (reason) => {
    console.warn(`Disconectado do servidor. Motivo: ${reason}`);
});

const playButton = document.getElementById('play-button');
if (playButton) {
    playButton.addEventListener('click', () => {
        console.log('Botão clicado!');
        alert('Connectando com jogo...');
    });
} else {
    console.error('Botão Play não encontrado!');
}