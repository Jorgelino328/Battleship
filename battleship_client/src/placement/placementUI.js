import {
    placementGridDiv,
    shipDock,
    rotateButton,
    findOpponentButton,
    placementStatusDiv,
    playerGridDiv 
} from '../core/domElements.js';
import { BOARD_SIZE, SHIPS_CONFIG } from '../core/constants.js';
import { 
    placedShips, 
    currentOrientation 
} from '../core/state.js';
import { toggleOrientation } from './placementLogic.js';
import { socket } from '../core/socket.js';

export function createPlacementBoardGrid() {
    console.log('Executando createPlacementBoardGrid...');
    if (!placementGridDiv) {
        console.error('Não foi possível criar o tabuleiro: placementGridDiv não encontrado.');
        return;
    }
    placementGridDiv.innerHTML = '';

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            placementGridDiv.appendChild(cell);
        }
    }
    console.log('Tabuleiro de posicionamento criado.');
}

export function createShipRepresentationsInDock() {
    console.log('Criando representações de navios no dock...');
    // Get the shipContainer directly rather than from domElements.js
    const shipContainer = document.querySelector('#ship-dock .ship-container');
    
    if (!shipContainer) {
        console.error('shipContainer não encontrado.');
        return;
    }
    
    shipContainer.innerHTML = '';

    SHIPS_CONFIG.forEach(shipConfig => {
        const shipRep = document.createElement('div');
        shipRep.classList.add('ship-representation');
        if (placedShips.has(shipConfig.id)) {
             shipRep.classList.add('placed');
             shipRep.draggable = false;
        } else {
            shipRep.draggable = true;
        }

        shipRep.dataset.shipName = shipConfig.name;
        shipRep.dataset.size = shipConfig.size;
        shipRep.dataset.shipId = shipConfig.id;

        for (let i = 0; i < shipConfig.size; i++) {
            const segment = document.createElement('div');
            segment.classList.add('ship-segment');
            shipRep.appendChild(segment);
        }
        shipContainer.appendChild(shipRep);
    });
    applyOrientationToDockShips(currentOrientation); 
    console.log('Representações de navios criadas no dock.');
}

export function applyOrientationToDockShips(orientation) {
    // Query directly instead of using the potentially null shipDock
    const shipsInDock = document.querySelectorAll('#ship-dock .ship-representation:not(.placed)');
    
    shipsInDock.forEach(ship => {
        if (orientation === 'vertical') {
            ship.classList.add('vertical');
        } else {
            ship.classList.remove('vertical');
        }
    });
    if (rotateButton) {
        rotateButton.textContent = `Rotate Pieces`;
    }
}

export function updatePlacementStatus() {
    const placedCount = placedShips.size;
    const totalShips = SHIPS_CONFIG.length;
    if (placementStatusDiv) {
        placementStatusDiv.textContent = `Ships positioned: ${placedCount} / ${totalShips}`;
    }
    if (findOpponentButton) {
        findOpponentButton.disabled = (placedCount !== totalShips);
    }
    console.log(`Status de posicionamento atualizado: ${placedCount}/${totalShips}`);
}

export function clearDragPreview() {
    if (!placementGridDiv) return;
    placementGridDiv.querySelectorAll('.cell.drag-over, .cell.invalid-placement').forEach(cell => {
        cell.classList.remove('drag-over', 'invalid-placement');
    });
}

export function renderFinalPlayerGrid() {
    if (!playerGridDiv) {
        console.error('playerGridDiv não encontrado para renderizar o tabuleiro final.');
        return;
    }
    playerGridDiv.innerHTML = ''; 
    playerGridDiv.style.display = 'grid'; 

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            playerGridDiv.appendChild(cell);
        }
    }

    placedShips.forEach(ship => {
        ship.coordinates.forEach(coord => {
            const cell = playerGridDiv.querySelector(`.cell[data-x='${coord.x}'][data-y='${coord.y}']`);
            if (cell) {
                cell.classList.add('placed-ship');
                cell.style.cursor = 'default'; 
            }
        });
    });
    console.log("Tabuleiro final do jogador renderizado.");
}