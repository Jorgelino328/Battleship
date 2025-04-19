const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const clientPath = join(__dirname, '../battleship_client');
app.use(express.static(clientPath));

let waitingPlayers = [];

const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`Usuario com o ID: ${socket.id} conectado!`);

  socket.on('submitPlacement', (placementData) => {
    console.log(`Player ${socket.id} submitted placement`);
    
    socket.playerData = {
      id: socket.id,
      ships: placementData,
      ready: true,
      hits: [],
      misses: []
    };
    
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.shift();
      
      const gameId = `game_${socket.id}_${opponent.id}`;
      
      activeGames.set(gameId, {
        id: gameId,
        players: [socket.playerData, opponent],
        currentTurn: socket.id, 
        status: 'active'
      });
      
      socket.join(gameId);
      io.sockets.sockets.get(opponent.id).join(gameId);
      
      socket.gameId = gameId;
      io.sockets.sockets.get(opponent.id).gameId = gameId;
      
      io.to(gameId).emit('opponentFound', {
        gameId: gameId,
        firstTurn: socket.id
      });
      
      socket.emit('gameStart', {
        opponentId: opponent.id,
        yourTurn: true
      });
      
      io.to(opponent.id).emit('gameStart', {
        opponentId: socket.id,
        yourTurn: false
      });
      
    } else {
      waitingPlayers.push(socket.playerData);
    }
  });
  
  socket.on('fire', (data) => {
    const { x, y } = data;
    const gameId = socket.gameId;
    
    if (!gameId || !activeGames.has(gameId)) {
      return socket.emit('error', { message: 'Game not found' });
    }
    
    const game = activeGames.get(gameId);
    
    if (game.currentTurn !== socket.id) {
      return socket.emit('error', { message: 'Not your turn' });
    }
    
    const opponent = game.players.find(p => p.id !== socket.id);
    
    let hit = false;
    let sunkShip = null;
    
    for (const ship of opponent.ships) {
      const hitCoordinate = ship.coordinates.find(coord => 
        coord.x === x && coord.y === y
      );
      
      if (hitCoordinate) {
        hit = true;
        
        if (!ship.hits) ship.hits = [];
        ship.hits.push({ x, y });
        
        if (ship.hits.length === ship.coordinates.length) {
          sunkShip = {
            name: ship.name,
            coordinates: ship.coordinates
          };
        }
        
        break;
      }
    }
    
    if (hit) {
      if (!opponent.hits) opponent.hits = [];
      opponent.hits.push({ x, y });
    } else {
      if (!opponent.misses) opponent.misses = [];
      opponent.misses.push({ x, y });
    }
    
    game.currentTurn = opponent.id;
    
    io.to(gameId).emit('shotResult', {
      x, y, 
      hit,
      shooterId: socket.id,
      sunkShip,
      nextTurn: opponent.id
    });
    
    const allShipsSunk = opponent.ships.every(ship => {
      if (!ship.hits) return false;
      return ship.hits.length === ship.coordinates.length;
    });
    
    if (allShipsSunk) {
      io.to(gameId).emit('gameOver', {
        winner: socket.id,
        loser: opponent.id
      });
      
      activeGames.delete(gameId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuario com o ID: ${socket.id} desconectado!`);
    
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
    
    if (socket.gameId && activeGames.has(socket.gameId)) {
      const game = activeGames.get(socket.gameId);
      const opponent = game.players.find(p => p.id !== socket.id);
      
      if (opponent) {
        io.to(opponent.id).emit('opponentDisconnected');
      }
      
      activeGames.delete(socket.gameId);
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});