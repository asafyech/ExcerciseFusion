import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID as uuidv4 } from 'crypto';
import { Game, Player, ClientConnection } from './types';
import { GameEngine } from './GameEngine';
import { FederationManager } from './FederationManager';
import {
  ClientMessage,
  ServerMessage,
  GameJoinedMessage,
  GameStateMessage,
  MoveAcceptedMessage,
  MoveRejectedMessage,
  OpponentMoveMessage,
  GameOverMessage,
  ErrorMessage,
  PlayerLeftMessage
} from '../shared/protocol';
import { GameState, SERVER_A_ID } from '../shared/constants';
import { MessageType } from '../shared/constants';

/**
 * GameServer - Distributed WebSocket server
 * Players must connect to different servers (A and B) to play together
 * 
 * Flow:
 * 1. Player 1 connects to Server A → Server A notifies Server B
 * 2. Player 2 connects to Server B → Server B notifies Server A → Game starts
 * 3. Player makes move → Server validates → Notifies partner server → Updates opponent
 */
export class GameServer {
  private wss: WebSocketServer;
  private port: number;
  private serverId: string;
  private games: Map<string, Game> = new Map();
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private pendingGame: string | null = null; // Game waiting for partner server player
  private federation: FederationManager;

  constructor(port: number, serverId: string) {
    this.port = port;
    this.serverId = serverId;
    this.wss = new WebSocketServer({ port });
    this.federation = new FederationManager(serverId);
    
    this.setupWebSocketServer();
    this.setupFederationHandlers();
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.federation.connect();
    console.log(`\n[Server ${this.serverId}] ✓ WebSocket server listening on port ${this.port}`);
    console.log(`[Server ${this.serverId}] ✓ Ready to accept players`);
    console.log(`[Server ${this.serverId}] ✓ Players on Server ${this.serverId} will play against Server ${this.federation.getPartnerServerId()}\n`);
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: WebSocket) => {
      console.log(`[Server ${this.serverId}] 🔌 New client connected`);
      
      const connection: ClientConnection = {
        socket,
        connectedAt: Date.now()
      };
      this.clients.set(socket, connection);

      socket.on('message', (data: Buffer) => {
        this.handleClientMessage(socket, data);
      });

      socket.on('close', () => {
        this.handleClientDisconnect(socket);
      });

      socket.on('error', (error) => {
        console.error(`[Server ${this.serverId}] ❌ WebSocket error:`, error);
      });
    });
  }

  /**
   * Setup federation event handlers for server-to-server communication
   */
  private setupFederationHandlers(): void {
    // Partner server has a player waiting - this server needs to match them
    this.federation.on('player:waiting', (data) => {
      console.log(`[Server ${this.serverId}] 👥 Partner server has waiting player in game ${data.gameId}`);
      
      // Store the waiting game info from partner
      if (!this.games.has(data.gameId)) {
        const game: Game = {
          id: data.gameId,
          state: GameState.WAITING,
          board: GameEngine.createEmptyBoard(),
          players: {},
          currentTurn: 'X',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        game.players[(data.playerSymbol as 'X' || 'O')] = {
          id: data.playerId,
          name: data.playerName,
          symbol: data.playerSymbol,
          socket: null as any, // Partner's socket is on partner server
          serverId: this.federation.getPartnerServerId()
        };
        this.games.set(data.gameId, game);
        this.pendingGame = data.gameId;
      }
    });

    // Partner server player joined - start the game
    this.federation.on('player:joined', (data) => {
      console.log(`[Server ${this.serverId}] 🎮 Partner player joined game ${data.gameId}`);
      
      const game = this.games.get(data.gameId);
      if (game) {
        this.pendingGame = null;
        game.state = GameState.PLAYING;
        // Add partner's player to the game
        const partnerPlayer: Player = {
          id: data.playerId,
          name: data.playerName,
          symbol: data.playerSymbol,
          socket: null as any, // Partner's socket is on partner server
          serverId: this.federation.getPartnerServerId()
        };
        
        game.players[(data.playerSymbol as 'X' || 'O')] = partnerPlayer;
        game.state = GameState.PLAYING;
        
        console.log(`[Server ${this.serverId}] ✓ Game ${data.gameId} is now PLAYING`);
        console.log(`[Server ${this.serverId}]   Player X: ${game.players.X?.name} (Server ${game.players.X?.serverId})`);
        console.log(`[Server ${this.serverId}]   Player O: ${game.players.O?.name} (Server ${game.players.O?.serverId})`);
        
        // Notify our local player that game is starting
        this.notifyLocalPlayerGameStart(game);
      }
    });

    // Partner server made a move
    this.federation.on('move:made', (data) => {
      const game = this.games.get(data.gameId);
      if (!game) {
        console.warn(`[Server ${this.serverId}] ⚠️  Received move for unknown game ${data.gameId}`);
        return;
      }

      console.log(`[Server ${this.serverId}] 📨 Received move from partner: (${data.row},${data.col}) in game ${data.gameId}`);
      
      // Update our local game state
      game.board = data.board;
      game.currentTurn = data.nextTurn;
      game.updatedAt = Date.now();
      
      // Notify our local player about opponent's move
      this.notifyLocalPlayerOpponentMove(game, data.row, data.col);
    });

    // Game ended on partner server
    this.federation.on('game:ended', (data) => {
      const game = this.games.get(data.gameId);
      if (!game) return;

      console.log(`[Server ${this.serverId}] 🏁 Game ${data.gameId} ended - Winner: ${data.winner}`);
      
      game.state = GameState.FINISHED;
      game.winner = data.winner;
      game.winningLine = data.winningLine;
      game.board = data.board;
      
      // Notify our local player
      this.notifyLocalPlayerGameOver(game);
    });
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(socket: WebSocket, data: Buffer): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case MessageType.JOIN_GAME:
          this.handleJoinGame(socket, message.playerName);
          break;
        case MessageType.MAKE_MOVE:
          this.handleMakeMove(socket, message.gameId, message.row, message.col);
          break;
        default:
          this.sendError(socket, 'Unknown message type');
      }
    } catch (error) {
      console.error(`[Server ${this.serverId}] ❌ Error handling message:`, error);
      this.sendError(socket, 'Invalid message format');
    }
  }

  /**
   * Handle client joining a game
   * This server's player will be matched with a player on the partner server
   */
  private handleJoinGame(socket: WebSocket, playerName: string): void {
    const connection = this.clients.get(socket);
    if (!connection) return;

    const playerId = this.generatePlayerId();
    connection.playerId = playerId;

    let game: Game;
    let playerSymbol: 'X' | 'O';
    let gameId: string;

    // Check if partner server has a waiting player
    if (this.pendingGame) {
      // Join the pending game from partner server
      gameId = this.pendingGame;
      game = this.games.get(gameId)!;
      
      // Determine which symbol this player gets
      playerSymbol = game.players.X ? 'O' : 'X';
      
      const player: Player = {
        id: playerId,
        name: playerName,
        symbol: playerSymbol,
        socket,
        serverId: this.serverId
      };

      game.players[playerSymbol] = player;
      game.state = GameState.PLAYING;
      connection.gameId = gameId;

      console.log(`[Server ${this.serverId}] ✓ Player ${playerName} (${playerSymbol}) joined game ${gameId}`);

      // Notify partner server that we have the second player
      this.federation.notifyPlayerJoined(gameId, playerId, playerName, playerSymbol);

      // Send confirmation to our player
      const response: GameJoinedMessage = {
        type: MessageType.GAME_JOINED,
        gameId,
        playerId,
        playerSymbol,
        waitingForOpponent: false,
        timestamp: Date.now()
      };
      this.sendMessage(socket, response);

      // Start the game for our local player
      this.notifyLocalPlayerGameStart(game);
      
      this.pendingGame = null;
      
    } else {
      // Create new game and wait for partner server player
      gameId = this.generateGameId();
      playerSymbol = this.serverId === SERVER_A_ID ? 'X' : 'O'; // Server A gets X, Server B gets O
      
      const player: Player = {
        id: playerId,
        name: playerName,
        symbol: playerSymbol,
        socket,
        serverId: this.serverId
      };

      game = {
        id: gameId,
        state: GameState.WAITING,
        board: GameEngine.createEmptyBoard(),
        players: { [playerSymbol]: player },
        currentTurn: 'X',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.games.set(gameId, game);
      connection.gameId = gameId;
      this.pendingGame = gameId;

      console.log(`[Server ${this.serverId}] ✓ Player ${playerName} (${playerSymbol}) created game ${gameId}`);
      console.log(`[Server ${this.serverId}] ⏳ Waiting for player on Server ${this.federation.getPartnerServerId()}...`);

      // Notify partner server we have a waiting player
      this.federation.notifyPlayerWaiting(gameId, playerId, playerName, playerSymbol);

      // Send confirmation to our player
      const response: GameJoinedMessage = {
        type: MessageType.GAME_JOINED,
        gameId,
        playerId,
        playerSymbol,
        waitingForOpponent: true,
        timestamp: Date.now()
      };
      this.sendMessage(socket, response);
    }
  }

  /**
   * Notify local player that game is starting
   */
  private notifyLocalPlayerGameStart(game: Game): void {
    const localPlayer = this.getLocalPlayer(game);
    if (!localPlayer) return;

    console.log(`[Server ${this.serverId}] 🎮 Notifying local player ${localPlayer.name} that game is starting`);

    const message: GameStateMessage = {
      type: MessageType.GAME_STATE,
      gameId: game.id,
      board: game.board,
      currentTurn: game.currentTurn,
      yourTurn: game.currentTurn === localPlayer.symbol,
      yourSymbol: localPlayer.symbol,
      timestamp: Date.now()
    };
    this.sendMessage(localPlayer.socket, message);
  }

  /**
   * Handle client making a move
   */
  private handleMakeMove(socket: WebSocket, gameId: string, row: number, col: number): void {
    const connection = this.clients.get(socket);
    if (!connection || !connection.playerId) {
      this.sendError(socket, 'Not authenticated');
      return;
    }

    const game = this.games.get(gameId);
    if (!game) {
      this.sendError(socket, 'Game not found');
      return;
    }

    console.log(`[Server ${this.serverId}] 🎯 Processing move from local player: (${row},${col})`);

    // Validate and make move
    const result = GameEngine.makeMove(game, row, col, connection.playerId);

    if (!result.valid) {
      console.log(`[Server ${this.serverId}] ❌ Move rejected: ${result.reason}`);
      const response: MoveRejectedMessage = {
        type: MessageType.MOVE_REJECTED,
        reason: result.reason!,
        timestamp: Date.now()
      };
      this.sendMessage(socket, response);
      return;
    }

    console.log(`[Server ${this.serverId}] ✓ Move accepted: (${row},${col})`);

    // Send confirmation to the player who made the move
    const moveAcceptedMsg: MoveAcceptedMessage = {
      type: MessageType.MOVE_ACCEPTED,
      gameId,
      row,
      col,
      board: game.board,
      nextTurn: game.currentTurn,
      timestamp: Date.now()
    };
    this.sendMessage(socket, moveAcceptedMsg);

    // Notify partner server about the move
    this.federation.notifyMoveMade(gameId, connection.playerId, row, col, game.board, game.currentTurn);

    // Handle game over
    if (result.gameOver) {
      this.handleGameOver(game, result.winner!, result.winningLine);
    }
  }

  /**
   * Notify local player about opponent's move
   */
  private notifyLocalPlayerOpponentMove(game: Game, row: number, col: number): void {
    const localPlayer = this.getLocalPlayer(game);
    if (!localPlayer) return;

    const opponentMoveMsg: OpponentMoveMessage = {
      type: MessageType.OPPONENT_MOVE,
      gameId: game.id,
      row,
      col,
      board: game.board,
      yourTurn: game.currentTurn === localPlayer.symbol,
      timestamp: Date.now()
    };
    this.sendMessage(localPlayer.socket, opponentMoveMsg);
  }

  /**
   * Handle game over scenario
   */
  private handleGameOver(
    game: Game,
    winner: 'X' | 'O' | 'DRAW',
    winningLine?: { row: number; col: number }[],
    technical = false
  ): void {
    if (technical) {
      console.log(`[Server ${this.serverId}] ⚠️  Game ${game.id} ended due to disconnection`);
    } else {
      console.log(`[Server ${this.serverId}] 🏁 Game ${game.id} ended - Winner: ${winner}`);
    }
    game.state = GameState.FINISHED;
    game.winner = winner;
    game.winningLine = winningLine;

    // Notify partner server
    this.federation.notifyGameEnded(game.id, winner, winningLine, game.board);

    // Notify local player
    this.notifyLocalPlayerGameOver(game);
  }

  /**
   * Notify local player about game over
   */
  private notifyLocalPlayerGameOver(game: Game): void {
    const localPlayer = this.getLocalPlayer(game);
    if (!localPlayer) return;

    const gameOverMsg: GameOverMessage = {
      type: MessageType.GAME_OVER,
      gameId: game.id,
      winner: game.winner!,
      winningLine: game.winningLine,
      board: game.board,
      timestamp: Date.now()
    };
    this.sendMessage(localPlayer.socket, gameOverMsg);
  }

  /**
   * Get the player connected to this server
   */
  private getLocalPlayer(game: Game): Player | null {
    if (game.players.X?.serverId === this.serverId) {
      return game.players.X;
    }
    if (game.players.O?.serverId === this.serverId) {
      return game.players.O;
    }
    return null;
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnect(socket: WebSocket): void {
    const connection = this.clients.get(socket);
    if (connection) {
      console.log(`[Server ${this.serverId}] 👋 Client disconnected: ${connection.playerId || 'unknown'}`);
      
      // Clean up pending game if this was the only player waiting
      // Or notify partner server if game was in progress
      if (connection.gameId) {
        const game = this.games.get(connection.gameId);
        if (game && game.state === GameState.WAITING && this.pendingGame === connection.gameId) {
          this.games.delete(connection.gameId);
          this.pendingGame = null;
          console.log(`[Server ${this.serverId}] 🗑️  Removed pending game ${connection.gameId}`);
        }
        if (game && game.state === GameState.PLAYING) {
          this.games.delete(connection.gameId);
          console.log(`[Server ${this.serverId}] 🗑️  Removed concurrent game ${connection.gameId}`);
          // Notify partner server that local player disconnected 
          this.handleGameOver(game, game.players.X?.id === connection.playerId ? 'O' : 'X', [], true);
        }
      }
      
      this.clients.delete(socket);
    }
  }

  /**
   * Send a message to a client
   */
  private sendMessage(socket: WebSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[Server ${this.serverId}] ❌ Error sending message:`, error);
    }
  }

  /**
   * Send an error message to a client
   */
  private sendError(socket: WebSocket, errorMessage: string): void {
    const message: ErrorMessage = {
      type: MessageType.ERROR,
      message: errorMessage,
      timestamp: Date.now()
    };
    this.sendMessage(socket, message);
  }

  /**
   * Generate unique game ID
   */
  private generateGameId(): string {
    return `game_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Generate unique player ID
   */
  private generatePlayerId(): string {
    return `player_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`[Server ${this.serverId}] 🛑 Shutting down...`);
    await this.federation.disconnect();
    this.wss.close();
  }
}