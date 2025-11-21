import { MessageType, FederationMessageType } from './constants';

// Base message structure
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

// Client -> Server messages
export interface JoinGameMessage extends BaseMessage {
  type: MessageType.JOIN_GAME;
  playerName: string;
}

export interface MakeMoveMessage extends BaseMessage {
  type: MessageType.MAKE_MOVE;
  gameId: string;
  row: number;
  col: number;
}

// Server -> Client messages
export interface GameJoinedMessage extends BaseMessage {
  type: MessageType.GAME_JOINED;
  gameId: string;
  playerId: string;
  playerSymbol: 'X' | 'O';
  waitingForOpponent: boolean;
}

export interface GameStateMessage extends BaseMessage {
  type: MessageType.GAME_STATE;
  gameId: string;
  board: string[][];
  currentTurn: 'X' | 'O';
  yourTurn: boolean;
  yourSymbol: 'X' | 'O';
}

export interface MoveAcceptedMessage extends BaseMessage {
  type: MessageType.MOVE_ACCEPTED;
  gameId: string;
  row: number;
  col: number;
  board: string[][];
  nextTurn: 'X' | 'O';
}

export interface MoveRejectedMessage extends BaseMessage {
  type: MessageType.MOVE_REJECTED;
  reason: string;
}

export interface OpponentMoveMessage extends BaseMessage {
  type: MessageType.OPPONENT_MOVE;
  gameId: string;
  row: number;
  col: number;
  board: string[][];
  yourTurn: boolean;
}

export interface GameOverMessage extends BaseMessage {
  type: MessageType.GAME_OVER;
  gameId: string;
  winner: 'X' | 'O' | 'DRAW';
  winningLine?: { row: number; col: number }[];
  board: string[][];
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  message: string;
}

// Union type for all client messages
export type ClientMessage = JoinGameMessage | MakeMoveMessage;

// Union type for all server messages
export type ServerMessage =
  | GameJoinedMessage
  | GameStateMessage
  | MoveAcceptedMessage
  | MoveRejectedMessage
  | OpponentMoveMessage
  | GameOverMessage
  | ErrorMessage;

// Federation messages (Redis pub/sub between servers)
export interface FederationMessage {
  type: FederationMessageType;
  fromServerId: string;
  toServerId: string;
  gameId: string;
  timestamp: number;
  data: any;
}

export interface PlayerWaitingData {
  gameId: string;
  playerId: string;
  playerName: string;
  playerSymbol: 'X' | 'O';
}

export interface PlayerJoinedData {
  gameId: string;
  playerId: string;
  playerName: string;
  playerSymbol: 'X' | 'O';
}

export interface MoveMadeData {
  gameId: string;
  playerId: string;
  row: number;
  col: number;
  board: string[][];
  nextTurn: 'X' | 'O';
}

export interface GameEndedData {
  gameId: string;
  winner: 'X' | 'O' | 'DRAW';
  winningLine?: { row: number; col: number }[];
  board: string[][];
}