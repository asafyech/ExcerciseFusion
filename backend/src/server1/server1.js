const WebSocket = require('ws');

const wss1 = new WebSocket.Server({ port: 8080 });

wss1.on('connection', ws => {
  console.log('Client connected to Server 1');
  ws.on('message', message => {
    console.log(`Received from Server 1 client: ${message}`);
    ws.send(`Hello from Server 1! You sent: ${message}`);
  });
  ws.on('close', () => {
    console.log('Client disconnected from Server 1');
  });
});

console.log('WebSocket Server 1 listening on port 8080');