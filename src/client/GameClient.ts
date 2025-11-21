import WebSocket from 'ws';
import * as readline from 'readline';
import { Display } from './Display';
import {
  ServerMessage,
  ClientMessage,
  JoinGameMessage,
  MakeMoveMessage
} from '../shared/protocol';
import { MessageType } from '../shared/constants';

/**
 * GameClient - CLI WebSocket client for Tic-Tac-Toe
 * Handles server communication and user input
 */
export class GameClient {
  private ws: WebSocket | null = null;
  private rl: readline.Interface;
  private gameId: string | null = null;
  private playerId: string | null = null;
  private playerSymbol: 'X' | 'O' | null = null;
  private isMyTurn: boolean = false;
  private gameActive: boolean = false;
  private currentBoard: string[][] = [];

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Connect to server and start game
   */
  async connect(host: string, port: number, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Display.showConnectionInfo(host, port);

      this.ws = new WebSocket(`ws://${host}:${port}`);

      this.ws.on('open', () => {
        Display.showConnected();
        this.joinGame(playerName);
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleServerMessage(data);
      });

      this.ws.on('error', (error) => {
        Display.showError(`Connection error: ${error.message}`);
        reject(error);
      });

      this.ws.on('close', () => {
        Display.showInfo('Connection closed');
        this.cleanup();
      });
    });
  }

  /**
   * Send join game request to server
   */
  private joinGame(playerName: string): void {
    const message: JoinGameMessage = {
      type: MessageType.JOIN_GAME,
      playerName,
      timestamp: Date.now()
    };
    this.sendMessage(message);
  }

  /**
   * Handle incoming server messages
   */
  private handleServerMessage(data: Buffer): void {
    try {
      const message: ServerMessage = JSON.parse(data.toString());

      switch (message.type) {
        case MessageType.GAME_JOINED:
          this.handleGameJoined(message);
          break;
        case MessageType.GAME_STATE:
          this.handleGameState(message);
          break;
        case MessageType.MOVE_ACCEPTED:
          this.handleMoveAccepted(message);
          break;
        case MessageType.MOVE_REJECTED:
          this.handleMoveRejected(message);
          break;
        case MessageType.OPPONENT_MOVE:
          this.handleOpponentMove(message);
          break;
        case MessageType.GAME_OVER:
          this.handleGameOver(message);
          break;
        case MessageType.ERROR:
          Display.showError(message.message);
          break;
      }
    } catch (error) {
      Display.showError('Failed to parse server message');
    }
  }

  /**
   * Handle game joined confirmation
   */
  private handleGameJoined(message: any): void {
    this.gameId = message.gameId;
    this.playerId = message.playerId;
    this.playerSymbol = message.playerSymbol;

    Display.clear();
    Display.showWelcome();
    Display.showGameJoined(message.gameId, message.playerSymbol, message.waitingForOpponent);

    if (!message.waitingForOpponent) {
      this.gameActive = true;
    }
  }

  /**
   * Handle game state update (when game starts)
   */
  private handleGameState(message: any): void {
    this.currentBoard = message.board;
    this.isMyTurn = message.yourTurn;
    this.gameActive = true;

    Display.clear();
    Display.showWelcome();
    Display.showGameState(message.board, message.yourTurn, this.playerSymbol!);

    if (this.isMyTurn) {
      this.promptForMove();
    }
  }

  /**
   * Handle move accepted by server
   */
  private handleMoveAccepted(message: any): void {
    this.currentBoard = message.board;
    this.isMyTurn = false;

    Display.showMoveAccepted(message.row, message.col);
    Display.showGameState(message.board, false, this.playerSymbol!);
  }

  /**
   * Handle move rejected by server
   */
  private handleMoveRejected(message: any): void {
    Display.showMoveRejected(message.reason);
    Display.showGameState(this.currentBoard, this.isMyTurn, this.playerSymbol!);
    this.promptForMove();
  }

  /**
   * Handle opponent's move
   */
  private handleOpponentMove(message: any): void {
    this.currentBoard = message.board;
    this.isMyTurn = message.yourTurn;

    Display.showOpponentMove(message.row, message.col);
    Display.showGameState(message.board, message.yourTurn, this.playerSymbol!);

    if (this.isMyTurn) {
      this.promptForMove();
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(message: any): void {
    this.gameActive = false;
    this.currentBoard = message.board;

    Display.clear();
    Display.showGameOver(
      message.board,
      message.winner,
      this.playerSymbol!,
      message.winningLine
    );

    // Prompt for new game or quit
    this.rl.question('\nPlay again? (yes/no): ', (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        Display.showInfo('Starting new game...');
        this.joinGame('Player');
      } else {
        this.disconnect();
      }
    });
  }

  /**
   * Prompt user to make a move
   */
  private promptForMove(): void {
    Display.showMovePrompt();

    this.rl.question('> ', (input) => {
      if (!this.gameActive) {
        return;
      }

      const trimmed = input.trim().toLowerCase();

      if (trimmed === 'quit' || trimmed === 'exit') {
        this.disconnect();
        return;
      }

      // Parse move input
      const match = trimmed.match(/^(\d),\s*(\d)$/);
      if (!match) {
        Display.showError('Invalid format. Use: row,col (e.g., 0,1)');
        this.promptForMove();
        return;
      }

      const row = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);

      if (row < 0 || row > 2 || col < 0 || col > 2) {
        Display.showError('Coordinates must be between 0 and 2');
        this.promptForMove();
        return;
      }

      this.makeMove(row, col);
    });
  }

  /**
   * Send move to server
   */
  private makeMove(row: number, col: number): void {
    if (!this.gameId) {
      Display.showError('Not in a game');
      return;
    }

    const message: MakeMoveMessage = {
      type: MessageType.MAKE_MOVE,
      gameId: this.gameId,
      row,
      col,
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  /**
   * Send message to server
   */
  private sendMessage(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      Display.showError('Not connected to server');
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    Display.showGoodbye();
    this.cleanup();
    process.exit(0);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.rl.close();
  }
}