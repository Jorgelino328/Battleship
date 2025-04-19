const mainMenu = document.getElementById('main-menu');
const gameBoardsArea = document.getElementById('game-boards-area');
const playerGridDiv = document.getElementById('player-grid');
const opponentGridDiv = document.getElementById('opponent-grid');
const opponentLoader = document.getElementById('opponent-loader');
const playButton = document.getElementById('play-button');
const gameStatusDiv = document.getElementById('game-status');

const BOARD_SIZE = 10;

function createPlayerBoardGrid() {
    console.log('Executando createPlayerBoardGrid...');
    if (!playerGridDiv) {
        console.error('Não foi possível criar a grade: playerGridDiv não encontrado.');
        return;
    }
    playerGridDiv.innerHTML = '';

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            playerGridDiv.appendChild(cell);

            cell.addEventListener('click', () => {
                handlePlayerCellClick(x, y, cell);
            });
        }
    }
    console.log('Grade do jogador criada.');
}

function handlePlayerCellClick(x, y, cellElement) {
    console.log(`Célula do jogador clicada: x=${x}, y=${y}`);
    if (cellElement) {
         cellElement.classList.toggle('placing-ship');
    }
}

console.log('Tentando conectar via Socket.IO...');
const socket = io();

socket.on('connect', () => {
    console.log(`Conectado com sucesso ao servidor com ID do cliente: ${socket.id}`);
});

socket.on('connect_error', (error) => {
    console.error('Erro de conexão do Socket.IO:', error);
});

socket.on('disconnect', (reason) => {
    console.warn(`Desconectado do servidor. Motivo: ${reason}`);
});

if (playButton && mainMenu && gameBoardsArea && opponentLoader && gameStatusDiv) {
    console.log('Anexando listener de clique ao botão de jogar.');
    playButton.addEventListener('click', () => {
        console.log('Botão de jogar clicado!');

        mainMenu.classList.add('hidden');
        console.log('Menu principal oculto.');

        gameBoardsArea.classList.remove('hidden');
        console.log('Área dos tabuleiros exibida.');

        opponentLoader.classList.add('active');
        console.log('Loader do oponente ativado.');

        createPlayerBoardGrid();

        gameStatusDiv.textContent = 'Aguardando oponente...';
        console.log('Status do jogo atualizado.');

        console.log('Emitindo evento findGame para o servidor...');
        socket.emit('findGame');
    });
} else {
    console.error('Não foi possível anexar o listener do botão de jogar: Um ou mais elementos necessários não foram encontrados.');
    if (!playButton) console.error('Botão de jogar ausente');
    if (!mainMenu) console.error('Menu principal ausente');
    if (!gameBoardsArea) console.error('Área dos tabuleiros ausente');
    if (!opponentLoader) console.error('Loader do oponente ausente');
    if (!gameStatusDiv) console.error('Div de status do jogo ausente');
}