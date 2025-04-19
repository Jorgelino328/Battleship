import {
    placementGridDiv,
    shipDock,
    rotateButton,
    findOpponentButton,
    resetButton
} from '../core/domElements.js';
import {
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleShipDragStart,
    handlePlacedCellDragStart,
    handleShipDragEnd,
    toggleOrientation,
    handleFindOpponent,
    resetPlacementState
} from './placementLogic.js';
import { createShipRepresentationsInDock } from './placementUI.js';

export function addDockShipListeners() {
    const ships = shipDock ? shipDock.querySelectorAll('.ship-representation') : [];
    ships.forEach(ship => {
        ship.removeEventListener('dragstart', handleShipDragStart);
        ship.removeEventListener('dragend', handleShipDragEnd);
        if (!ship.classList.contains('placed')) {
             ship.addEventListener('dragstart', handleShipDragStart);
        }
        ship.addEventListener('dragend', handleShipDragEnd);
    });
    console.log('Listeners de navios do dock adicionados.');
}

export function addPlacementListeners() {
    addDockShipListeners();

    const cells = placementGridDiv ? placementGridDiv.querySelectorAll('.cell') : [];
    cells.forEach(cell => {
        cell.removeEventListener('dragover', handleDragOver);
        cell.removeEventListener('dragleave', handleDragLeave);
        cell.removeEventListener('drop', handleDrop);
        cell.removeEventListener('dragstart', handlePlacedCellDragStart);

        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);

        if (cell.classList.contains('placed-ship')) {
             cell.draggable = true;
             cell.style.cursor = 'grab';
             cell.addEventListener('dragstart', handlePlacedCellDragStart);
         } else {
              cell.draggable = false;
              cell.style.cursor = 'pointer';
         }
    });
    console.log('Listeners das células da grade de posicionamento adicionados.');

    if (rotateButton) rotateButton.removeEventListener('click', toggleOrientation);
    if (findOpponentButton) findOpponentButton.removeEventListener('click', handleFindOpponent);
    if (resetButton) resetButton.removeEventListener('click', resetPlacementState);

    if (rotateButton) rotateButton.addEventListener('click', toggleOrientation);
    if (findOpponentButton) findOpponentButton.addEventListener('click', handleFindOpponent);
    if (resetButton) resetButton.addEventListener('click', resetPlacementState);

    console.log('Listeners de botões de posicionamento adicionados/atualizados.');
}
