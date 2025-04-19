const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../battleship_client/index.html'));
});

server.listen(8080, () => {
  console.log('server running at http://localhost:8080');
});
