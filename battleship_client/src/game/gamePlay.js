import {
    opponentGridDiv,
    playerGridDiv,
    opponentLoader,
    gameStatusDiv
} from '../core/domElements.js';
import { socket } from '../core/socket.js';
import { BOARD_SIZE } from '../core/constants.js';

let isMyTurn = false;
let gameActive = false;

export function initializeGameBoards() {
    if (opponentGridDiv && opponentGridDiv.children.length === 0) {
        createOpponentGrid();
    }
}

function createOpponentGrid() {
    opponentGridDiv.innerHTML = '';
    
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            cell.addEventListener('click', () => {
                if (isMyTurn && gameActive && !cell.classList.contains('hit') && !cell.classList.contains('miss')) {
                    handleShot(x, y, cell);
                }
            });
            
            opponentGridDiv.appendChild(cell);
        }
    }
}

function handleShot(x, y, cell) {
    isMyTurn = false;
    cell.classList.add('firing');
    
    socket.emit('fire', { x: parseInt(x), y: parseInt(y) });
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = 'Aguardando resultado...';
    }
}

export function startGame(data) {
    console.log('Game starting!', data);
    gameActive = true;
    isMyTurn = data.yourTurn;
    
    if (opponentLoader) {
        opponentLoader.classList.remove('active');
    }
    
    initializeGameBoards();
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = isMyTurn ? 'Sua vez! Atire no tabuleiro do oponente' : 'Vez do oponente';
    }
    
    updateCellHoverState();
}

function updateCellHoverState() {
    const opponentCells = opponentGridDiv ? opponentGridDiv.querySelectorAll('.cell:not(.hit):not(.miss)') : [];
    
    opponentCells.forEach(cell => {
        if (isMyTurn && gameActive) {
            cell.classList.add('active-turn');
        } else {
            cell.classList.remove('active-turn');
        }
    });
}

export function handleShotResult(data) {
    const { x, y, hit, shooterId, sunkShip, nextTurn } = data;
    
    const isMyShot = socket.id === shooterId;
    const targetGrid = isMyShot ? opponentGridDiv : playerGridDiv;
    
    const cell = targetGrid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    
    if (cell) {
        cell.classList.remove('firing');
        cell.classList.add(hit ? 'hit' : 'miss');
        
        if (hit && sunkShip) {
            if (isMyShot) {
                gameStatusDiv.textContent = `Você afundou o ${sunkShip.name} deles!`;
            } else {
                gameStatusDiv.textContent = `Oponente afundou seu ${sunkShip.name}!`;
                
                sunkShip.coordinates.forEach(coord => {
                    const shipCell = playerGridDiv.querySelector(`.cell[data-x="${coord.x}"][data-y="${coord.y}"]`);
                    if (shipCell) {
                        shipCell.classList.add('sunk-ship');
                    }
                });
            }
        }
    }
    
    isMyTurn = nextTurn === socket.id;
    
    if (gameStatusDiv) {
        if (isMyTurn) {
            gameStatusDiv.textContent = 'Sua vez! Atire no tabuleiro do oponente';
        } else {
            gameStatusDiv.textContent = isMyShot ? 
                (hit ? 'Acertou! Aguardando oponente...' : 'Errou! Aguardando oponente...') :
                (hit ? 'Seu navio foi atingido!' : 'Oponente errou!');
        }
    }
    
    updateCellHoverState();
}

export function handleGameOver(data) {
    gameActive = false;
    const isWinner = data.winner === socket.id;
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = isWinner ? 'Vitória! Você afundou todos os navios inimigos!' : 'Derrota! Todos seus navios foram afundados!';
        gameStatusDiv.classList.add(isWinner ? 'text-success' : 'text-danger');
    }
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Jogar Novamente';
    playAgainBtn.classList.add('btn', 'btn-primary', 'mt-3');
    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    gameStatusDiv.parentNode.appendChild(playAgainBtn);
}

export function handleOpponentDisconnect() {
    gameActive = false;
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = 'Seu oponente desconectou. Você venceu por W.O.!';
        gameStatusDiv.classList.add('text-warning');
    }
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Jogar Novamente';
    playAgainBtn.classList.add('btn', 'btn-primary', 'mt-3');
    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    gameStatusDiv.parentNode.appendChild(playAgainBtn);
}