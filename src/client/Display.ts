import { BOARD_SIZE } from '../shared/constants';

/**
 * Display - Handles terminal UI rendering
 * Provides clean ASCII-based game board display
 */
export class Display {
  /**
   * Clear the terminal screen
   */
  static clear(): void {
    console.clear();
  }

  /**
   * Display the game board with coordinates
   */
  static showBoard(board: string[][], highlight?: { row: number; col: number }[]): void {
    console.log('\n   ╔═══╦═══╦═══╗');
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      let rowStr = ` ${row} ║`;
      
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row][col];
        const isHighlighted = highlight?.some(h => h.row === row && h.col === col);
        
        // Apply color to winning cells
        const cellDisplay = isHighlighted 
          ? `\x1b[32m${cell}\x1b[0m` // Green for winning line
          : cell;
        
        rowStr += ` ${cellDisplay} `;
        if (col < BOARD_SIZE - 1) {
          rowStr += '│';
        }
      }
      
      rowStr += '║';
      console.log(rowStr);
      
      if (row < BOARD_SIZE - 1) {
        console.log('   ╠═══╬═══╬═══╣');
      }
    }
    
    console.log('   ╚═══╩═══╩═══╝');
    console.log('     0   1   2  ');
  }

  /**
   * Display welcome message
   */
  static showWelcome(): void {
    console.log('\n╔════════════════════════════════════╗');
    console.log('║   Distributed Tic-Tac-Toe Game    ║');
    console.log('╚════════════════════════════════════╝\n');
  }

  /**
   * Display connection information
   */
  static showConnectionInfo(server: string, port: number): void {
    console.log(`🔌 Connecting to ${server}:${port}...`);
  }

  /**
   * Display successful connection
   */
  static showConnected(): void {
    console.log('✅ Connected to server!\n');
  }

  /**
   * Display game joined message
   */
  static showGameJoined(gameId: string, playerSymbol: string, waitingForOpponent: boolean): void {
    console.log(`🎮 Joined game: ${gameId}`);
    console.log(`👤 You are playing as: ${playerSymbol}`);
    
    if (waitingForOpponent) {
      console.log('⏳ Waiting for opponent to join...\n');
    } else {
      console.log('✅ Opponent found! Game starting...\n');
    }
  }

  /**
   * Display game state
   */
  static showGameState(board: string[][], yourTurn: boolean, yourSymbol: string): void {
    this.showBoard(board);
    
    if (yourTurn) {
      console.log(`\n🎯 Your turn (${yourSymbol})`);
    } else {
      console.log(`\n⏳ Waiting for opponent...`);
    }
  }

  /**
   * Display move prompt
   */
  static showMovePrompt(): void {
    console.log('\nEnter your move:');
    console.log('Format: row,col (e.g., 0,1 for top-middle)');
    console.log('Or type "quit" to exit\n');
  }

  /**
   * Display opponent's move
   */
  static showOpponentMove(row: number, col: number): void {
    console.log(`\n🔄 Opponent moved: (${row}, ${col})`);
  }

  /**
   * Display move accepted confirmation
   */
  static showMoveAccepted(row: number, col: number): void {
    console.log(`\n✅ Move accepted: (${row}, ${col})`);
  }

  /**
   * Display move rejected error
   */
  static showMoveRejected(reason: string): void {
    console.log(`\n❌ Move rejected: ${reason}`);
  }

  /**
   * Display game over message
   */
  static showGameOver(
    board: string[][],
    winner: 'X' | 'O' | 'DRAW',
    yourSymbol: string,
    winningLine?: { row: number; col: number }[]
  ): void {
    console.log('\n╔════════════════════════════════════╗');
    console.log('║          GAME OVER                 ║');
    console.log('╚════════════════════════════════════╝');
    
    this.showBoard(board, winningLine);
    
    console.log();
    if (winner === 'DRAW') {
      console.log('🤝 Game ended in a draw!');
    } else if (winner === yourSymbol) {
      console.log('🎉 You won! Congratulations!');
    } else {
      console.log('😢 You lost. Better luck next time!');
    }
    console.log();
  }

  /**
   * Display error message
   */
  static showError(message: string): void {
    console.log(`\n❌ Error: ${message}`);
  }

  /**
   * Display info message
   */
  static showInfo(message: string): void {
    console.log(`\nℹ️  ${message}`);
  }

  /**
   * Display goodbye message
   */
  static showGoodbye(): void {
    console.log('\n👋 Thanks for playing! Goodbye.\n');
  }
}