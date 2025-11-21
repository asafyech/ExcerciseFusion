import { GameServer } from './GameServer';

/**
 * Server entry point
 * Usage: ts-node src/server/index.ts <port> <serverId>
 * Example: ts-node src/server/index.ts 3001 A
 */

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: ts-node src/server/index.ts <port> <serverId>');
  console.error('Example: ts-node src/server/index.ts 3001 A');
  process.exit(1);
}

const port = parseInt(args[0], 10);
const serverId = args[1];

if (isNaN(port) || port < 1024 || port > 65535) {
  console.error('Invalid port number. Must be between 1024 and 65535');
  process.exit(1);
}

// Create and start server
const server = new GameServer(port, serverId);

server.start().then(() => {
  console.log(`===========================================`);
  console.log(`  Tic-Tac-Toe Server ${serverId}`);
  console.log(`  Port: ${port}`);
  console.log(`  Status: Running`);
  console.log(`===========================================`);
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});