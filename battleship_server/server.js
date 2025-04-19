const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const clientPath = join(__dirname, '../battleship_client');
app.use(express.static(clientPath));

io.on('connection', (socket) => {
  console.log(`Usuario com o ID: ${socket.id} conectado!`);

  socket.on('disconnect', () => {
    console.log(`Usuario com o ID: ${socket.id} desconectado!`);
  });

});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});