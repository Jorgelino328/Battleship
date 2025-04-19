import { playButton, mainMenu, placementArea, gameBoardsArea } from './core/domElements.js';
import { initializePlacementPhase } from './placement/placementLogic.js';
import { transitionToWaitingForOpponent } from './game/gameStart.js';
import { 
    startGame, 
    handleShotResult, 
    handleGameOver, 
    handleOpponentDisconnect 
} from './game/gamePlay.js';
import { socket } from './core/socket.js';
import { addPlacementListeners } from './placement/placementListeners.js';

console.log('Script principal index.js carregado.');

document.addEventListener('placementReady', function() {
    addPlacementListeners();
});

function handlePlayButtonClick() {
    console.log('Botão Play clicado. Iniciando fase de posicionamento...');
    if (mainMenu) mainMenu.classList.add('d-none');
    if (placementArea) placementArea.classList.remove('d-none');
    if (gameBoardsArea) gameBoardsArea.classList.add('d-none');
    initializePlacementPhase();
}

if (playButton) {
    playButton.addEventListener('click', handlePlayButtonClick);
    console.log('Listener do botão Play adicionado.');
} else {
    console.error('Botão Play inicial não encontrado.');
}

// Socket event listeners for game flow
socket.on('opponentFound', (data) => {
    console.log('index.js received opponentFound');
    transitionToWaitingForOpponent();
});

socket.on('gameStart', (data) => {
    console.log('Game starting', data);
    startGame(data);
});

socket.on('shotResult', (data) => {
    console.log('Shot result received', data);
    handleShotResult(data);
});

socket.on('gameOver', (data) => {
    console.log('Game over', data);
    handleGameOver(data);
});

socket.on('opponentDisconnected', () => {
    console.log('Opponent disconnected');
    handleOpponentDisconnect();
});

socket.on('error', (data) => {
    console.error('Game error:', data.message);
    alert(`Erro: ${data.message}`);
});
