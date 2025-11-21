import * as readline from 'readline';
import { GameClient } from './GameClient';
import { Display } from './Display';

/**
 * Client entry point
 * Prompts user for connection details and starts the game
 */

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  Display.clear();
  Display.showWelcome();

  // Prompt for server selection
  console.log('Select server to connect to:');
  console.log('1. Server A (localhost:3001)');
  console.log('2. Server B (localhost:3002)');
  console.log('3. Custom server\n');

  const choice = await new Promise<string>((resolve) => {
    rl.question('Enter choice (1-3): ', resolve);
  });

  let host = 'localhost';
  let port = 3001;

  switch (choice.trim()) {
    case '1':
      port = 3001;
      break;
    case '2':
      port = 3002;
      break;
    case '3':
      host = await new Promise<string>((resolve) => {
        rl.question('Enter host (default: localhost): ', (answer) => {
          resolve(answer.trim() || 'localhost');
        });
      });
      const portStr = await new Promise<string>((resolve) => {
        rl.question('Enter port (default: 3001): ', (answer) => {
          resolve(answer.trim() || '3001');
        });
      });
      port = parseInt(portStr, 10);
      break;
    default:
      console.log('Invalid choice, using default (Server A)');
      port = 3001;
  }

  // Prompt for player name
  const playerName = await new Promise<string>((resolve) => {
    rl.question('\nEnter your name: ', (answer) => {
      resolve(answer.trim() || 'Player');
    });
  });

  rl.close();

  // Create client and connect
  const client = new GameClient();

  try {
    await client.connect(host, port, playerName);
  } catch (error) {
    if (error instanceof Error) {
      Display.showError(`Failed to connect: ${error.message}`);
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  Display.showGoodbye();
  process.exit(0);
});

// Run the client
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});