export let currentOrientation = 'horizontal';
export let draggedShipInfo = null; 
export let placedShips = new Map(); 

export function setCurrentOrientation(orientation) {
    currentOrientation = orientation;
}

export function setDraggedShipInfo(info) {
    draggedShipInfo = info;
}

export function resetDraggedShipInfo() {
    draggedShipInfo = null;
}

export function setPlacedShips(shipsMap) {
    placedShips = shipsMap;
}

export function addPlacedShip(shipId, shipData) {
    placedShips.set(shipId, shipData);
}

export function removePlacedShip(shipId) {
    placedShips.delete(shipId);
}

export function clearPlacedShips() {
    placedShips.clear();
}