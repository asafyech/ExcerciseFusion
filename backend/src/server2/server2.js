const WebSocket = require('ws');

const wss2 = new WebSocket.Server({ port: 8081 });

wss2.on('connection', ws => {
  console.log('Client connected to Server 2');
  ws.on('message', message => {
    console.log(`Received from Server 2 client: ${message}`);
    ws.send(`Hello from Server 2! You sent: ${message}`);
  });
  ws.on('close', () => {
    console.log('Client disconnected from Server 2');
  });
});

console.log('WebSocket Server 2 listening on port 8081');