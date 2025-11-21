// Game configuration constants
export const BOARD_SIZE = 3;
export const REDIS_CHANNEL = 'tictactoe:federation';
export const REDIS_HOST = 'localhost';
export const REDIS_PORT = 6379;

// Server IDs - servers must be paired
export const SERVER_A_ID = 'A';
export const SERVER_B_ID = 'B';

// Player symbols
export const PLAYER_X = 'X';
export const PLAYER_O = 'O';
export const EMPTY_CELL = ' ';

// Game states
export enum GameState {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

// Message types for WebSocket protocol
export enum MessageType {
  // Client -> Server
  JOIN_GAME = 'JOIN_GAME',
  MAKE_MOVE = 'MAKE_MOVE',
  
  // Server -> Client
  GAME_JOINED = 'GAME_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  GAME_STATE = 'GAME_STATE',
  MOVE_ACCEPTED = 'MOVE_ACCEPTED',
  MOVE_REJECTED = 'MOVE_REJECTED',
  OPPONENT_MOVE = 'OPPONENT_MOVE',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR'
}

// Federation message types (Redis pub/sub)
export enum FederationMessageType {
  PLAYER_WAITING = 'PLAYER_WAITING',      // Server notifies it has a waiting player
  PLAYER_JOINED = 'PLAYER_JOINED',        // Partner server acknowledges and starts game
  PLAYER_LEFT = 'PLAYER_LEFT',            // Partner server notifies that a local player disconnected
  MOVE_MADE = 'MOVE_MADE',                // Server broadcasts move to partner
  GAME_ENDED = 'GAME_ENDED'               // Game finished notification
}