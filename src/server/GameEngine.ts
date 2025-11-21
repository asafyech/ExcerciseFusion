import { Game, MoveResult } from './types';
import { BOARD_SIZE, EMPTY_CELL, GameState } from '../shared/constants';

/**
 * GameEngine - Core game logic with no external dependencies
 * Handles move validation, win detection, and board state
 */
export class GameEngine {
  /**
   * Create a new empty board
   */
  static createEmptyBoard(): string[][] {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY_CELL));
  }

  /**
   * Validate and execute a move
   * Returns result indicating if move was valid and if game is over
   */
  static makeMove(game: Game, row: number, col: number, playerId: string): MoveResult {
    // Validate game state
    if (game.state !== GameState.PLAYING) {
      return { valid: false, reason: 'Game is not in progress' };
    }

    // Validate player turn
    const player = game.players[game.currentTurn];
    if (!player || player.id !== playerId) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Validate coordinates
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return { valid: false, reason: `Invalid coordinates. Must be between 0 and ${BOARD_SIZE - 1}` };
    }

    // Validate cell is empty
    if (game.board[row][col] !== EMPTY_CELL) {
      return { valid: false, reason: 'Cell is already occupied' };
    }

    // Make the move
    game.board[row][col] = game.currentTurn;
    game.updatedAt = Date.now();

    // Check for winner
    const winResult = this.checkWinner(game.board);
    if (winResult.winner) {
      game.state = GameState.FINISHED;
      game.winner = winResult.winner;
      game.winningLine = winResult.winningLine;
      return {
        valid: true,
        gameOver: true,
        winner: winResult.winner,
        winningLine: winResult.winningLine
      };
    }

    // Check for draw
    if (this.isBoardFull(game.board)) {
      game.state = GameState.FINISHED;
      game.winner = 'DRAW';
      return {
        valid: true,
        gameOver: true,
        winner: 'DRAW'
      };
    }

    // Switch turns
    game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';

    return { valid: true, gameOver: false };
  }

  /**
   * Check if there's a winner on the board
   * Returns winner symbol and winning line coordinates
   */
  static checkWinner(board: string[][]): { 
    winner: 'X' | 'O' | null; 
    winningLine?: { row: number; col: number }[] 
  } {
    // Check rows
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][0] !== EMPTY_CELL &&
          board[row][0] === board[row][1] &&
          board[row][1] === board[row][2]) {
        return {
          winner: board[row][0] as 'X' | 'O',
          winningLine: [
            { row, col: 0 },
            { row, col: 1 },
            { row, col: 2 }
          ]
        };
      }
    }

    // Check columns
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[0][col] !== EMPTY_CELL &&
          board[0][col] === board[1][col] &&
          board[1][col] === board[2][col]) {
        return {
          winner: board[0][col] as 'X' | 'O',
          winningLine: [
            { row: 0, col },
            { row: 1, col },
            { row: 2, col }
          ]
        };
      }
    }

    // Check diagonal (top-left to bottom-right)
    if (board[0][0] !== EMPTY_CELL &&
        board[0][0] === board[1][1] &&
        board[1][1] === board[2][2]) {
      return {
        winner: board[0][0] as 'X' | 'O',
        winningLine: [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 }
        ]
      };
    }

    // Check diagonal (top-right to bottom-left)
    if (board[0][2] !== EMPTY_CELL &&
        board[0][2] === board[1][1] &&
        board[1][1] === board[2][0]) {
      return {
        winner: board[0][2] as 'X' | 'O',
        winningLine: [
          { row: 0, col: 2 },
          { row: 1, col: 1 },
          { row: 2, col: 0 }
        ]
      };
    }

    return { winner: null };
  }

  /**
   * Check if the board is completely filled
   */
  static isBoardFull(board: string[][]): boolean {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === EMPTY_CELL) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Create a deep copy of the board
   */
  static cloneBoard(board: string[][]): string[][] {
    return board.map(row => [...row]);
  }
}