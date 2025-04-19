import {
    placementArea,
    gameBoardsArea,
    opponentLoader,
    gameStatusDiv
} from '../core/domElements.js';

export function transitionToWaitingForOpponent() {
    console.log('Transicionando para a fase de espera por oponente...');
    if (placementArea) placementArea.classList.add('d-none');
    if (gameBoardsArea) gameBoardsArea.classList.remove('d-none');
    if (opponentLoader) opponentLoader.classList.add('active');
    if (gameStatusDiv) gameStatusDiv.textContent = 'Procurando oponente...';
}
