const mainMenu = document.getElementById('main-menu');
const placementArea = document.getElementById('placement-area');
const gameBoardsArea = document.getElementById('game-boards-area');
const placementGridDiv = document.getElementById('placement-grid');
const playerGridDiv = document.getElementById('player-grid');
const opponentGridDiv = document.getElementById('opponent-grid');
const opponentLoader = document.getElementById('opponent-loader');
const shipDock = document.getElementById('ship-dock');
const shipContainer = shipDock.querySelector('.ship-container');
const rotateButton = document.getElementById('rotate-button');
const findOpponentButton = document.getElementById('find-opponent-button');
const resetButton = document.getElementById('reset-placement-button');
const playButton = document.getElementById('play-button');
const gameStatusDiv = document.getElementById('game-status');
const placementStatusDiv = document.getElementById('placement-status');

const BOARD_SIZE = 10;
const SHIPS_CONFIG = [
    { name: 'Carrier', size: 5, id: 'ship-carrier' },
    { name: 'Battleship', size: 4, id: 'ship-battleship' },
    { name: 'Cruiser', size: 3, id: 'ship-cruiser' },
    { name: 'Submarine', size: 3, id: 'ship-submarine' },
    { name: 'Destroyer', size: 2, id: 'ship-destroyer' },
];
let currentOrientation = 'horizontal';
let draggedShipInfo = null;
let placedShips = new Map();

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

function initializePlacementPhase() {
    mainMenu.classList.add('d-none');
    placementArea.classList.remove('d-none');
    gameBoardsArea.classList.add('d-none'); 

    createPlacementBoardGrid();
    createShipRepresentationsInDock();
    addPlacementListeners();
    updatePlacementStatus();
}

function resetPlacementState() {
    placedShips.clear();
    currentOrientation = 'horizontal';
    rotateButton.textContent = `Rotacionar (H)`;
    findOpponentButton.disabled = true;
    const cells = placementGridDiv.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('placed-ship', 'dragging-from-board');
        cell.removeAttribute('draggable');
        delete cell.dataset.shipId;
        cell.style.cursor = 'pointer';
        cell.removeEventListener('dragover', handleDragOver);
        cell.removeEventListener('dragleave', handleDragLeave);
        cell.removeEventListener('drop', handleDrop);
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);
        cell.removeEventListener('dragstart', handlePlacedCellDragStart);
    });
    createShipRepresentationsInDock();
    updatePlacementStatus();
}

function createPlacementBoardGrid() {
    if (!placementGridDiv) {
        console.error('Não foi possível criar a grade: placementGridDiv não encontrado.');
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
}

function createShipRepresentationsInDock() {
    if (!shipContainer) return;
    shipContainer.innerHTML = '';

    SHIPS_CONFIG.forEach(shipConfig => {
        const shipRep = document.createElement('div');
        shipRep.classList.add('ship-representation');
        shipRep.dataset.shipName = shipConfig.name;
        shipRep.dataset.size = shipConfig.size;
        shipRep.dataset.shipId = shipConfig.id;
        shipRep.draggable = true;

        for (let i = 0; i < shipConfig.size; i++) {
            const segment = document.createElement('div');
            segment.classList.add('ship-segment');
            shipRep.appendChild(segment);
        }
        shipContainer.appendChild(shipRep);
    });
    applyOrientationToDockShips(currentOrientation);
    addDockShipListeners();
}

function addDockShipListeners() {
    const ships = shipDock.querySelectorAll('.ship-representation');
    ships.forEach(ship => {
        ship.removeEventListener('dragstart', handleShipDragStart);
        ship.removeEventListener('dragend', handleShipDragEnd);
        ship.addEventListener('dragstart', handleShipDragStart);
        ship.addEventListener('dragend', handleShipDragEnd);
    });
}

function addPlacementListeners() {
    addDockShipListeners();

    const cells = placementGridDiv.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.removeEventListener('dragover', handleDragOver);
        cell.removeEventListener('dragleave', handleDragLeave);
        cell.removeEventListener('drop', handleDrop);
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);
    });

    rotateButton.removeEventListener('click', toggleOrientation);
    findOpponentButton.removeEventListener('click', handleFindOpponent);
    resetButton.removeEventListener('click', resetPlacementState);

    rotateButton.addEventListener('click', toggleOrientation);
    findOpponentButton.addEventListener('click', handleFindOpponent);
    resetButton.addEventListener('click', resetPlacementState);
}

function updatePlacementStatus() {
    const placedCount = placedShips.size;
    const totalShips = SHIPS_CONFIG.length;
    if (placementStatusDiv) {
        placementStatusDiv.textContent = `Navios posicionados: ${placedCount} / ${totalShips}`;
    }
    findOpponentButton.disabled = (placedCount !== totalShips);
}

function applyOrientationToDockShips(orientation) {
    const shipsInDock = shipDock.querySelectorAll('.ship-representation:not(.placed)');
    shipsInDock.forEach(ship => {
        if (orientation === 'vertical') {
            ship.classList.add('vertical');
        } else {
            ship.classList.remove('vertical');
        }
    });
}

function toggleOrientation() {
    currentOrientation = (currentOrientation === 'horizontal') ? 'vertical' : 'horizontal';
    rotateButton.textContent = `Rotacionar (${currentOrientation === 'horizontal' ? 'H' : 'V'})`;
    applyOrientationToDockShips(currentOrientation);
}

function handleShipDragStart(event) {
    const shipElement = event.currentTarget;
    if (shipElement.classList.contains('placed')) {
        event.preventDefault();
        return;
    }

    draggedShipInfo = {
        id: shipElement.dataset.shipId,
        name: shipElement.dataset.shipName,
        size: parseInt(shipElement.dataset.size, 10),
        orientation: currentOrientation,
        element: shipElement,
        fromDock: true
    };

    event.dataTransfer.setData('application/json', JSON.stringify(draggedShipInfo));
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => shipElement.classList.add('dragging'), 0);
}

function handlePlacedCellDragStart(event) {
    const cellElement = event.currentTarget;
    const shipId = cellElement.dataset.shipId;
    if (!shipId || !placedShips.has(shipId)) return;

    const shipData = placedShips.get(shipId);
    draggedShipInfo = {
        id: shipId,
        name: shipData.name,
        size: shipData.size,
        orientation: currentOrientation,
        element: null,
        fromDock: false,
        originalCoordinates: shipData.coordinates
    };

    event.dataTransfer.setData('application/json', JSON.stringify(draggedShipInfo));
    event.dataTransfer.effectAllowed = 'move';

    shipData.coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) setTimeout(() => cell.classList.add('dragging-from-board'), 0);
    });
}

function handleShipDragEnd(event) {
    if (draggedShipInfo?.element) {
        draggedShipInfo.element.classList.remove('dragging');
    } else if (draggedShipInfo?.originalCoordinates) {
         draggedShipInfo.originalCoordinates.forEach(coord => {
            const cell = getCellElement(coord.x, coord.y);
            if (cell) {
                cell.classList.remove('dragging-from-board');
            }
        });
    }

    clearDragPreview();
    draggedShipInfo = null;
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (draggedShipInfo && event.target.classList.contains('cell')) {
        const targetX = parseInt(event.target.dataset.x, 10);
        const targetY = parseInt(event.target.dataset.y, 10);
        const { size, orientation, id: draggedShipId } = draggedShipInfo;

        clearDragPreview();

        const potentialCoords = calculateCoordinates(targetX, targetY, size, orientation);
        const isValid = validatePlacement(potentialCoords, draggedShipInfo.fromDock ? null : draggedShipId);

        potentialCoords.forEach(coord => {
            const cell = getCellElement(coord.x, coord.y);
            if (cell) {
                cell.classList.add(isValid ? 'drag-over' : 'invalid-placement');
            }
        });
    }
}

function handleDragLeave(event) {
    if (event.target.classList.contains('cell')) {
        clearDragPreview();
    }
}

function handleDrop(event) {
    event.preventDefault();
    const currentDraggedInfo = { ...draggedShipInfo };
    clearDragPreview();

    const targetCell = event.target.closest('.cell');
    if (!targetCell || !currentDraggedInfo) {
         return;
    }

    const targetX = parseInt(targetCell.dataset.x, 10);
    const targetY = parseInt(targetCell.dataset.y, 10);

    const { id, name, size, orientation, fromDock, originalCoordinates, element: dockElement } = currentDraggedInfo;

    const finalCoordinates = calculateCoordinates(targetX, targetY, size, orientation);
    const isValid = validatePlacement(finalCoordinates, fromDock ? null : id);

    if (isValid) {
        if (!fromDock && originalCoordinates) {
            removeShipPlacement(id, originalCoordinates);
        }

        placeShipOnGrid(id, name, size, orientation, finalCoordinates);

        placedShips.set(id, { name, size, orientation, coordinates: finalCoordinates });

        if (fromDock && dockElement) {
            dockElement.draggable = false;
            dockElement.classList.add('placed');
        }
        updatePlacementStatus();
    } else {
         if (!fromDock && originalCoordinates) {
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

function placeShipOnGrid(shipId, shipName, shipSize, shipOrientation, coordinates) {
    coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            cell.classList.add('placed-ship');
            cell.style.cursor = 'grab';
            cell.draggable = true;
            cell.dataset.shipId = shipId;
            cell.removeEventListener('dragstart', handlePlacedCellDragStart);
            cell.addEventListener('dragstart', handlePlacedCellDragStart);
            cell.removeEventListener('dragover', handleDragOver);
            cell.removeEventListener('drop', handleDrop);
        }
    });
}

function removeShipPlacement(shipId, coordinates) {
    const dockElement = shipDock.querySelector(`.ship-representation[data-ship-id='${shipId}']`);
    if (dockElement) {
        dockElement.classList.remove('placed');
        dockElement.draggable = true;
    }

    coordinates.forEach(coord => {
        const cell = getCellElement(coord.x, coord.y);
        if (cell) {
            cell.classList.remove('placed-ship', 'dragging-from-board');
            cell.style.cursor = 'pointer';
            cell.draggable = false;
            delete cell.dataset.shipId;
            cell.removeEventListener('dragstart', handlePlacedCellDragStart);
            cell.removeEventListener('dragover', handleDragOver);
            cell.removeEventListener('dragleave', handleDragLeave);
            cell.removeEventListener('drop', handleDrop);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);
        }
    });
    placedShips.delete(shipId);
    updatePlacementStatus();
}

function clearDragPreview() {
    placementGridDiv.querySelectorAll('.cell.drag-over, .cell.invalid-placement').forEach(cell => {
        cell.classList.remove('drag-over', 'invalid-placement');
    });
}

function getCellElement(x, y) {
    if (!placementGridDiv) return null;
    return placementGridDiv.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
}

function handleFindOpponent() {
    if (placedShips.size !== SHIPS_CONFIG.length) {
        alert('Por favor, posicione todos os navios antes de procurar um oponente.');
        return;
    }

    placementArea.classList.add('d-none');
    gameBoardsArea.classList.remove('d-none');
    opponentLoader.classList.add('active');

    renderFinalPlayerGrid();

    gameStatusDiv.textContent = 'Procurando oponente...';

    const placementData = Array.from(placedShips.values());
    socket.emit('submitPlacement', placementData);
}

function renderFinalPlayerGrid() {
    if (!playerGridDiv) return;
    playerGridDiv.innerHTML = '';
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
}

if (playButton) {
    playButton.addEventListener('click', initializePlacementPhase);
} else {
    console.error('Botão Play inicial não encontrado.');
}
