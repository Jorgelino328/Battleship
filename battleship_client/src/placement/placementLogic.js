import {
    placementGridDiv,
    shipDock
} from '../core/domElements.js';
import { BOARD_SIZE, SHIPS_CONFIG } from '../core/constants.js';
import {
    currentOrientation,
    draggedShipInfo,
    placedShips,
    setCurrentOrientation,
    setDraggedShipInfo,
    resetDraggedShipInfo,
    clearPlacedShips,
    addPlacedShip,
    removePlacedShip
} from '../core/state.js';
import {
    createPlacementBoardGrid,
    updatePlacementStatus,
    clearDragPreview,
    createShipRepresentationsInDock,
    applyOrientationToDockShips,
    renderFinalPlayerGrid
} from './placementUI.js';
import { socket } from '../core/socket.js';
import { addPlacementListeners, addDockShipListeners } from './placementListeners.js';
import { transitionToWaitingForOpponent } from '../game/gameStart.js';

function getCellElement(x, y) {
    if (!placementGridDiv) return null;
    return placementGridDiv.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
}

export function handleShipDragStart(event) {
    const shipElement = event.currentTarget;
    if (shipElement.classList.contains('placed')) {
        event.preventDefault();
        return;
    }

    setDraggedShipInfo({
        id: shipElement.dataset.shipId,
        name: shipElement.dataset.shipName,
        size: parseInt(shipElement.dataset.size, 10),
        orientation: currentOrientation,
        element: shipElement,
        fromDock: true
    });

    event.dataTransfer.setData('text/plain', draggedShipInfo.id);
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => shipElement.classList.add('dragging'), 0);
}

export function handlePlacedCellDragStart(event) {
    const cellElement = event.currentTarget;
    const shipId = cellElement.dataset.shipId;
    if (!shipId || !placedShips.has(shipId)) {
        event.preventDefault();
        return;
    }

    const shipData = placedShips.get(shipId);

    setDraggedShipInfo({
        id: shipId,
        name: shipData.name,
        size: shipData.size,
        orientation: currentOrientation,
        element: null,
        fromDock: false,
        originalCoordinates: shipData.coordinates
    });

    event.dataTransfer.setData('text/plain', draggedShipInfo.id);
    event.dataTransfer.effectAllowed = 'move';

    shipData.coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            setTimeout(() => cell.classList.add('dragging-from-board'), 0);
        }
    });
}

export function handleShipDragEnd(event) {
    if (draggedShipInfo) {
        if (draggedShipInfo.element) {
            draggedShipInfo.element.classList.remove('dragging');
        } else if (draggedShipInfo.originalCoordinates) {
            draggedShipInfo.originalCoordinates.forEach(coord => {
                const cell = getCellElement(coord.x, coord.y);
                if (cell) {
                    cell.classList.remove('dragging-from-board');
                }
            });
        }
    }

    clearDragPreview();
}

export function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (!draggedShipInfo || !event.target.classList.contains('cell')) {
        return;
    }

    const targetX = parseInt(event.target.dataset.x, 10);
    const targetY = parseInt(event.target.dataset.y, 10);

    const { size, orientation, id: draggedShipId, fromDock, originalCoordinates } = draggedShipInfo;

    const shipIdToIgnoreInValidation = fromDock ? null : draggedShipId;

    const potentialCoords = calculateCoordinates(targetX, targetY, size, orientation);
    const isValid = validatePlacement(potentialCoords, shipIdToIgnoreInValidation);

    clearDragPreview();

    potentialCoords.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            cell.classList.add(isValid ? 'drag-over' : 'invalid-placement');
        }
    });
}

export function handleDragLeave(event) {
    if (event.target.classList.contains('drag-over') || event.target.classList.contains('invalid-placement')) {
        clearDragPreview();
    }
}

export function handleDrop(event) {
    event.preventDefault();
    const currentDraggedInfo = { ...draggedShipInfo };
    resetDraggedShipInfo();

    clearDragPreview();

    const targetCell = event.target.closest('.cell');
    if (!targetCell || !currentDraggedInfo || !currentDraggedInfo.id) {
        return;
    }

    const targetX = parseInt(targetCell.dataset.x, 10);
    const targetY = parseInt(targetCell.dataset.y, 10);

    const { id, name, size, orientation, fromDock, originalCoordinates, element: dockElement } = currentDraggedInfo;

    const finalCoordinates = calculateCoordinates(targetX, targetY, size, orientation);

    const shipIdToIgnoreInValidation = fromDock ? null : id;
    const isValid = validatePlacement(finalCoordinates, shipIdToIgnoreInValidation);

    if (isValid) {
        if (!fromDock && originalCoordinates) {
            removeShipVisuals(originalCoordinates);
        }

        placeShipVisuals(id, finalCoordinates);
        addPlacedShip(id, { name, size, orientation, coordinates: finalCoordinates });

        if (fromDock && dockElement) {
            dockElement.draggable = false;
            dockElement.classList.add('placed');
            if (orientation === 'vertical') {
                dockElement.classList.add('vertical');
            } else {
                dockElement.classList.remove('vertical');
            }
        }

        addListenersToPlacedShipCells(id, finalCoordinates);

        updatePlacementStatus();
    } else {
        if (!fromDock) {
        } else {
            if (dockElement) {
                dockElement.classList.remove('dragging');
            }
        }
    }
}

function calculateCoordinates(startX, startY, size, orientation) {
    const coords = [];
    for (let i = 0; i < size; i++) {
        coords.push({
            x: orientation === 'horizontal' ? startX + i : startX,
            y: orientation === 'horizontal' ? startY : startY + i,
        });
    }
    return coords;
}

function validatePlacement(coordinates, shipIdToIgnore) {
    const occupiedCells = new Set();
    placedShips.forEach((ship, id) => {
        if (id !== shipIdToIgnore) {
            ship.coordinates.forEach(coord => occupiedCells.add(`${coord.x},${coord.y}`));
        }
    });

    for (const coord of coordinates) {
        if (coord.x < 0 || coord.x >= BOARD_SIZE || coord.y < 0 || coord.y >= BOARD_SIZE) {
            return false;
        }
        if (occupiedCells.has(`${coord.x},${coord.y}`)) {
            return false;
        }
    }
    return true;
}

function placeShipVisuals(shipId, coordinates) {
    coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            cell.classList.add('placed-ship');
            cell.dataset.shipId = shipId;
        }
    });
}

function removeShipVisuals(coordinates) {
    coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            cell.classList.remove('placed-ship', 'dragging-from-board');
            delete cell.dataset.shipId;
        }
    });
}

function addListenersToPlacedShipCells(shipId, coordinates) {
    coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            cell.style.cursor = 'grab';
            cell.draggable = true;
            cell.removeEventListener('dragstart', handlePlacedCellDragStart);
            cell.addEventListener('dragstart', handlePlacedCellDragStart);

            cell.removeEventListener('dragover', handleDragOver);
            cell.removeEventListener('dragleave', handleDragLeave);
            cell.removeEventListener('drop', handleDrop);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);
        }
    });
}

export function initializePlacementPhase() {
    createPlacementBoardGrid();
    createShipRepresentationsInDock();
    addPlacementListeners();
    updatePlacementStatus();
}

export function resetPlacementState() {
    const cells = placementGridDiv.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('placed-ship', 'dragging-from-board');
        cell.style.cursor = 'pointer';
        cell.draggable = false;
        delete cell.dataset.shipId;
    });
    addPlacementListeners();

    clearPlacedShips();
    setCurrentOrientation('horizontal');
    applyOrientationToDockShips(currentOrientation);
    createShipRepresentationsInDock();

    updatePlacementStatus();
}

export function toggleOrientation() {
    const newOrientation = (currentOrientation === 'horizontal') ? 'vertical' : 'horizontal';
    setCurrentOrientation(newOrientation);
    applyOrientationToDockShips(currentOrientation);

    if (draggedShipInfo && !draggedShipInfo.fromDock) {
        draggedShipInfo.orientation = currentOrientation;
    }
}

export function handleFindOpponent() {
    if (placedShips.size !== SHIPS_CONFIG.length) {
        alert('Por favor, posicione todos os navios antes de procurar um oponente.');
        return;
    }

    renderFinalPlayerGrid();

    const placementData = Array.from(placedShips.values());
    socket.emit('submitPlacement', placementData);
    
    // Immediately transition to waiting screen instead of waiting for server response
    console.log('Enviando dados de posicionamento e transicionando para tela de espera...');
    transitionToWaitingForOpponent();
}
