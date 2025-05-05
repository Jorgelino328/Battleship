import {
    opponentGridDiv,
    playerGridDiv,
    opponentLoader,
    gameStatusDiv
} from '../core/domElements.js';
import { socket } from '../core/socket.js';
import { BOARD_SIZE } from '../core/constants.js';
import { stopMenuMusic } from '../index.js';  

const missSound = new Audio('../../assets/sound/miss.wav');
const explosionSound = new Audio('../../assets/sound/explosion.wav');
const backgroundMusic = new Audio('../../assets/sound/Alexander Ehlers - Great mission.mp3');
const winSound = new Audio('../../assets/sound/win_and_lose_melodies_-_basic_win_1.wav');
const loseSound = new Audio('../../assets/sound/win_and_lose_melodies_-_basic_lose.wav');

backgroundMusic.loop = true;
let isMyTurn = false;
let gameActive = false;

const TURN_TIME_LIMIT = 30; // 30 seconds time limit
let timerInterval = null;
let timeRemaining = TURN_TIME_LIMIT;
const turnTimerDiv = document.getElementById('turn-timer');
const timerValueSpan = document.getElementById('timer-value');

function playSound(sound) {
    console.log('Playing sound:', sound.src);
    sound.currentTime = 0;
    sound.play().catch(error => console.error('Error playing sound:', error));
}

function startBackgroundMusic() {
    stopMenuMusic();  
    backgroundMusic.volume = 0.5; 
    backgroundMusic.play().catch(error => console.error('Error playing background music:', error));
}

function stopBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

export function initializeGameBoards() {
    console.log('Initializing game boards...');
    
    if (opponentGridDiv) {
        console.log('Creating opponent grid...');
        createOpponentGrid();
    } else {
        console.error('opponentGridDiv not found!');
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
    console.log('Opponent grid created with', opponentGridDiv.children.length, 'cells');
}

function startTimer() {
    stopTimer(); // Clear any existing timer
    
    timeRemaining = TURN_TIME_LIMIT;
    updateTimerDisplay();
    
    if (turnTimerDiv) {
        turnTimerDiv.classList.remove('d-none');
    }
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            handleTimerExpired();
        }
        
        // Add warning class when time is running out
        if (timerValueSpan) {
            if (timeRemaining <= 10) {
                timerValueSpan.classList.add('text-danger');
            } else {
                timerValueSpan.classList.remove('text-danger');
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (turnTimerDiv) {
        turnTimerDiv.classList.add('d-none');
    }
}

function updateTimerDisplay() {
    if (timerValueSpan) {
        timerValueSpan.textContent = timeRemaining;
    }
}

function handleTimerExpired() {
    stopTimer();
    
    if (isMyTurn && gameActive) {
        // Time's up - make a random shot
        const unplayedCells = Array.from(opponentGridDiv.querySelectorAll('.cell:not(.hit):not(.miss)'));
        
        if (unplayedCells.length > 0) {
            // Pick a random cell to fire at
            const randomCell = unplayedCells[Math.floor(Math.random() * unplayedCells.length)];
            const x = parseInt(randomCell.dataset.x);
            const y = parseInt(randomCell.dataset.y);
            
            if (gameStatusDiv) {
                gameStatusDiv.textContent = 'Time\'s up! Firing randomly...';
            }
            
            handleShot(x, y, randomCell);
        }
    }
}

function handleShot(x, y, cell) {
    isMyTurn = false;
    cell.classList.add('firing');
    
    console.log(`Firing at: ${x}, ${y}`);
    
    socket.emit('fire', { x: parseInt(x), y: parseInt(y) });
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = 'Waiting Results...';
    }
    
    // Stop timer when shot is fired
    stopTimer();
}

export function startGame(data) {
    console.log('Game starting!', data);
    gameActive = true;
    isMyTurn = data.yourTurn;
    
    if (opponentLoader) {
        opponentLoader.classList.remove('active');
    }
    
    initializeGameBoards();
    startBackgroundMusic();
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = isMyTurn ? 'Your Turn! Hit the opponent\'s board' : 'Opponent\'s Turn';
    }
    
    updateCellHoverState();
    
    // Start timer if it's player's turn
    if (isMyTurn) {
        startTimer();
    }
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
    
    playSound(hit ? explosionSound : missSound);
    
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
            gameStatusDiv.textContent = 'Your Turn! Hit the opponent\'s board';
            // Start timer for player's turn
            startTimer();
        } else {
            gameStatusDiv.textContent = isMyShot ? 
                (hit ? 'Hit! Waiting for opponent...' : 'Miss! Waiting for opponent...') :
                (hit ? 'Your ship was hit!' : 'Opponent missed!');
            // Stop timer when it's opponent's turn
            stopTimer();
        }
    }
    
    updateCellHoverState();
}

export function handleGameOver(data) {
    gameActive = false;
    stopTimer(); // Stop timer when game ends
    
    const isWinner = data.winner === socket.id;
    
    stopBackgroundMusic();
    
    if (isWinner) {
        playSound(winSound);
    } else {
        playSound(loseSound);
    }
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = isWinner ? "Victory! You sunk all of your opponent's ships!" : "Defeat! All your ships were sunk!";
        gameStatusDiv.classList.add(isWinner ? 'text-success' : 'text-danger');
    }
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.classList.add('btn', 'btn-primary', 'mt-3');
    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    gameStatusDiv.parentNode.appendChild(playAgainBtn);
}

export function handleOpponentDisconnect() {
    gameActive = false;
    stopTimer(); // Stop timer when opponent disconnects
    
    if (gameStatusDiv) {
        gameStatusDiv.textContent = 'Your opponent disconnected. You win by W.O.!';
        gameStatusDiv.classList.add('text-warning');
    }
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.classList.add('btn', 'btn-primary', 'mt-3');
    playAgainBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    gameStatusDiv.parentNode.appendChild(playAgainBtn);
}