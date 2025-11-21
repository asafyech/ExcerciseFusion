import { WebSocket } from 'ws';
import { GameState } from '../shared/constants';

// Player information
export interface Player {
  id: string;
  name: string;
  symbol: 'X' | 'O';
  socket: WebSocket;
  serverId: string; // Which server this player is connected to
}

// Game instance
export interface Game {
  id: string;
  state: GameState;
  board: string[][];
  players: {
    X?: Player;
    O?: Player;
  };
  currentTurn: 'X' | 'O';
  winner?: 'X' | 'O' | 'DRAW';
  winningLine?: { row: number; col: number }[];
  createdAt: number;
  updatedAt: number;
}

// Move result
export interface MoveResult {
  valid: boolean;
  reason?: string;
  gameOver?: boolean;
  winner?: 'X' | 'O' | 'DRAW';
  winningLine?: { row: number; col: number }[];
}

// Client connection metadata
export interface ClientConnection {
  socket: WebSocket;
  playerId?: string;
  gameId?: string;
  connectedAt: number;
}