import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';
import { 
  FederationMessage, 
  PlayerWaitingData,
  PlayerJoinedData,
  MoveMadeData,
  GameEndedData
} from '../shared/protocol';
import { FederationMessageType, REDIS_CHANNEL, REDIS_HOST, REDIS_PORT, SERVER_A_ID, SERVER_B_ID } from '../shared/constants';

/**
 * FederationManager - Handles server-to-server communication via Redis pub/sub
 * Manages the pairing protocol where players must connect to different servers
 */
export class FederationManager extends EventEmitter {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private serverId: string;
  private partnerServerId: string;
  private isConnected: boolean = false;

  constructor(serverId: string) {
    super();
    this.serverId = serverId;
    
    // Determine partner server ID
    this.partnerServerId = serverId === SERVER_A_ID ? SERVER_B_ID : SERVER_A_ID;
    
    // Create separate Redis clients for publishing and subscribing
    this.publisher = createClient({
      socket: { host: REDIS_HOST, port: REDIS_PORT }
    }) as RedisClientType;
    
    this.subscriber = createClient({
      socket: { host: REDIS_HOST, port: REDIS_PORT }
    }) as RedisClientType;

    this.setupErrorHandlers();
  }

  /**
   * Setup error handlers for Redis clients
   */
  private setupErrorHandlers(): void {
    this.publisher.on('error', (err) => {
      console.error(`[Federation ${this.serverId}] Publisher error:`, err);
    });

    this.subscriber.on('error', (err) => {
      console.error(`[Federation ${this.serverId}] Subscriber error:`, err);
    });
  }

  /**
   * Connect to Redis and start listening for federation messages
   */
  async connect(): Promise<void> {
    try {
      await this.publisher.connect();
      await this.subscriber.connect();

      // Subscribe to the federation channel
      await this.subscriber.subscribe(REDIS_CHANNEL, (message) => {
        this.handleFederationMessage(message);
      });

      this.isConnected = true;
      console.log(`[Federation ${this.serverId}] Connected to Redis`);
      console.log(`[Federation ${this.serverId}] Partner server: ${this.partnerServerId}`);
      console.log(`[Federation ${this.serverId}] Subscribed to ${REDIS_CHANNEL}`);
    } catch (error) {
      console.error(`[Federation ${this.serverId}] Failed to connect:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming federation messages from partner server
   */
  private handleFederationMessage(rawMessage: string): void {
    try {
      const message: FederationMessage = JSON.parse(rawMessage);

      // Only process messages intended for this server
      if (message.toServerId !== this.serverId) {
        return;
      }

      console.log(`[Federation ${this.serverId}] ← Received ${message.type} from ${message.fromServerId} for game ${message.gameId}`);

      // Emit event based on message type for GameServer to handle
      switch (message.type) {
        case FederationMessageType.PLAYER_WAITING:
          this.emit('player:waiting', message.data as PlayerWaitingData);
          break;
        case FederationMessageType.PLAYER_JOINED:
          this.emit('player:joined', message.data as PlayerJoinedData);
          break;
        case FederationMessageType.MOVE_MADE:
          this.emit('move:made', message.data as MoveMadeData);
          break;
        case FederationMessageType.GAME_ENDED:
          this.emit('game:ended', message.data as GameEndedData);
          break;
      }
    } catch (error) {
      console.error(`[Federation ${this.serverId}] Error handling message:`, error);
    }
  }

  /**
   * Send a message to the partner server
   */
  private async sendToPartner(type: FederationMessageType, gameId: string, data: any): Promise<void> {
    if (!this.isConnected) {
      console.warn(`[Federation ${this.serverId}] Cannot send - not connected`);
      return;
    }

    const message: FederationMessage = {
      type,
      fromServerId: this.serverId,
      toServerId: this.partnerServerId,
      gameId,
      timestamp: Date.now(),
      data
    };

    try {
      await this.publisher.publish(REDIS_CHANNEL, JSON.stringify(message));
      console.log(`[Federation ${this.serverId}] → Sent ${type} to ${this.partnerServerId} for game ${gameId}`);
    } catch (error) {
      console.error(`[Federation ${this.serverId}] Error sending message:`, error);
    }
  }

  /**
   * Notify partner server that a player is waiting
   */
  async notifyPlayerWaiting(
    gameId: string,
    playerId: string,
    playerName: string,
    playerSymbol: 'X' | 'O'
  ): Promise<void> {
    const data: PlayerWaitingData = {
      gameId,
      playerId,
      playerName,
      playerSymbol
    };
    await this.sendToPartner(FederationMessageType.PLAYER_WAITING, gameId, data);
  }

  /**
   * Notify partner server that a player joined (starts the game)
   */
  async notifyPlayerJoined(
    gameId: string,
    playerId: string,
    playerName: string,
    playerSymbol: 'X' | 'O'
  ): Promise<void> {
    const data: PlayerJoinedData = {
      gameId,
      playerId,
      playerName,
      playerSymbol
    };
    await this.sendToPartner(FederationMessageType.PLAYER_JOINED, gameId, data);
  }

  /**
   * Notify partner server that a move was made
   */
  async notifyMoveMade(
    gameId: string,
    playerId: string,
    row: number,
    col: number,
    board: string[][],
    nextTurn: 'X' | 'O'
  ): Promise<void> {
    const data: MoveMadeData = {
      gameId,
      playerId,
      row,
      col,
      board,
      nextTurn
    };
    await this.sendToPartner(FederationMessageType.MOVE_MADE, gameId, data);
  }

  /**
   * Notify partner server that a game ended
   */
  async notifyGameEnded(
    gameId: string,
    winner: 'X' | 'O' | 'DRAW',
    winningLine?: { row: number; col: number }[],
    board?: string[][]
  ): Promise<void> {
    const data: GameEndedData = {
      gameId,
      winner,
      winningLine,
      board: board || []
    };
    await this.sendToPartner(FederationMessageType.GAME_ENDED, gameId, data);
  }

  /**
   * Get partner server ID
   */
  getPartnerServerId(): string {
    return this.partnerServerId;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(REDIS_CHANNEL);
      await this.subscriber.quit();
      await this.publisher.quit();
      this.isConnected = false;
      console.log(`[Federation ${this.serverId}] Disconnected from Redis`);
    } catch (error) {
      console.error(`[Federation ${this.serverId}] Error disconnecting:`, error);
    }
  }
}