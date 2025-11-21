# Distributed Tic-Tac-Toe with WebSocket Federation

A production-ready distributed Tic-Tac-Toe system with federated WebSocket servers and a CLI client. Players can connect to different servers and play against each other in real-time.

## 🏗️ Architecture

### Key Features
- **Paired distributed servers** - Players must connect to different servers (A and B) to play together
- **Real-time synchronization** - Each move is computed on both servers and synchronized via Redis pub/sub
- **Server-side move computation** - Both servers independently validate and compute game state
- **Move validation** - Server-side validation for turns, occupied cells, and game rules
- **CLI client** - Terminal-based client with ASCII board visualization
- **Federation protocol** - Custom protocol for server-to-server communication

### The Distributed Flow

```
Player 1 (Server A)          Server A          Redis          Server B          Player 2 (Server B)
       |                         |                |                |                         |
       |--- JOIN_GAME ---------->|                |                |                         |
       |                         |--- PLAYER_WAITING ------------>|                         |
       |<-- GAME_JOINED ---------|                |                |                         |
       |  (waiting...)           |                |                |<--- JOIN_GAME ----------|
       |                         |<-- PLAYER_JOINED -------------|                         |
       |<-- GAME_STATE ----------|                |                |--- GAME_STATE --------->|
       |                         |                |                |                         |
       |--- MAKE_MOVE ---------->|                |                |                         |
       |  (row=1, col=1)         |                |                |                         |
       |                         |- Validate Move |                |                         |
       |                         |- Update Board  |                |                         |
       |<-- MOVE_ACCEPTED -------|                |                |                         |
       |                         |--- MOVE_MADE ----------------->|                         |
       |                         |                |                |- Update Board           |
       |                         |                |                |--- OPPONENT_MOVE ------>|
       |                         |                |                |                         |
```

**Key Points:**
1. Server A and Server B work as a pair
2. Player 1 connects to Server A → Server A notifies Server B
3. Player 2 connects to Server B → Server B notifies Server A → Game starts
4. Each move is validated and computed by the server that received it
5. The move is then sent to the partner server, which also computes and updates its state
6. Both servers maintain synchronized game state

### Technology Stack
- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment
- **ws** - WebSocket implementation
- **Redis** - Pub/sub for server federation
- **readline** - CLI input handling

## 📁 Project Structure

```
tic-tac-toe-distributed/
├── src/
│   ├── server/
│   │   ├── index.ts              # Server entry point
│   │   ├── GameServer.ts         # WebSocket server + client handling
│   │   ├── FederationManager.ts  # Redis pub/sub for synchronization
│   │   ├── GameEngine.ts         # Core game logic (stateless)
│   │   └── types.ts              # Type definitions
│   ├── client/
│   │   ├── index.ts              # Client entry point
│   │   ├── GameClient.ts         # WebSocket client logic
│   │   └── Display.ts            # Terminal UI rendering
│   └── shared/
│       ├── protocol.ts           # Message protocol definitions
│       └── constants.ts          # Shared constants
├── package.json
├── tsconfig.json
└── README.md
```

### Directory Organization

**`src/server/`** - Backend components
- `GameServer.ts` - Manages WebSocket connections, routes messages, coordinates game flow
- `FederationManager.ts` - Handles Redis pub/sub for server-to-server sync
- `GameEngine.ts` - Pure game logic (no I/O), stateless move validation and win detection
- `types.ts` - Server-specific type definitions

**`src/client/`** - Frontend components
- `GameClient.ts` - WebSocket client, handles server communication
- `Display.ts` - Terminal UI with ASCII board rendering
- `index.ts` - Interactive server selection and connection setup

**`src/shared/`** - Common code
- `protocol.ts` - WebSocket message types (client ↔ server)
- `constants.ts` - Game configuration and enums

## 🔧 Setup

### Prerequisites
- Node.js 18+ 
- Redis server running on localhost:6379
- npm or yarn

### Installation

1. **Install Redis** (if not already installed)
   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis

   # Windows (WSL recommended)
   sudo apt-get install redis-server
   ```

2. **Clone and install dependencies**
   ```bash
   npm install
   ```

3. **Build TypeScript**
   ```bash
   npm run build
   ```

## 📚 Additional Documentation

- **[FLOW_DIAGRAM.md](FLOW_DIAGRAM.md)** - Complete visual flow of the distributed system
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

## 🚀 Running the System

### Start Servers

Open **two separate terminals** and run:

**Terminal 1 - Server A:**
```bash
npm run server:a
```

**Terminal 2 - Server B:**
```bash
npm run server:b
```

You should see:
```
===========================================
  Tic-Tac-Toe Server A
  Port: 3001
  Status: Running
===========================================
[Federation A] Connected to Redis and subscribed to tictactoe:federation
```

### Start Clients

Open **two more terminals** for players:

**Terminal 3 - Player 1 (MUST connect to Server A):**
```bash
npm run client
# Select option 1 (Server A)
```

**Terminal 4 - Player 2 (MUST connect to Server B):**
```bash
npm run client
# Select option 2 (Server B)
```

**CRITICAL:** Player 1 must connect to Server A and Player 2 must connect to Server B (or vice versa). Both players connecting to the same server will result in waiting forever!

Follow the prompts to:
1. Select a server (Player 1 → Server A, Player 2 → Server B)
2. Enter your name
3. Wait for the match to be made

## 🎮 How to Play

### Game Flow

1. **Player 1 connects to Server A**
   - Server A creates a game and waits
   - Server A sends `PLAYER_WAITING` to Server B via Redis

2. **Player 2 connects to Server B**
   - Server B receives the waiting game info
   - Server B sends `PLAYER_JOINED` to Server A
   - Both servers start the game simultaneously

3. **Player 1 makes a move on Server A**
   - Server A validates the move
   - Server A computes the new board state
   - Server A sends move confirmation to Player 1
   - Server A sends `MOVE_MADE` to Server B

4. **Server B processes the move**
   - Server B receives the move data
   - Server B updates its game state
   - Server B notifies Player 2 with the updated board

5. **Game continues** until win or draw
   - Each server independently computes game state
   - Both servers stay synchronized via Redis

**Important:** Players MUST connect to different servers. If both players try to connect to the same server, they will wait forever for an opponent!

### Making Moves

Enter moves in format: `row,col`
- `0,0` = top-left
- `1,1` = center
- `2,2` = bottom-right

Example session:
```
   ╔═══╦═══╦═══╗
 0 ║   │   │   ║
   ╠═══╬═══╬═══╣
 1 ║   │   │   ║
   ╠═══╬═══╬═══╣
 2 ║   │   │   ║
   ╚═══╩═══╩═══╝
     0   1   2  

🎯 Your turn (X)

Enter your move:
Format: row,col (e.g., 0,1 for top-middle)
Or type "quit" to exit

> 1,1
```

## 🏛️ Architecture Details

### Server Pairing Protocol

The system implements a **mandatory pairing** protocol:

1. **Server A** and **Server B** are paired partners
2. When a player connects to Server A:
   - Server A creates a game with that player as 'X'
   - Server A broadcasts `PLAYER_WAITING` to Server B
   - Server A waits for a player on Server B
3. When a player connects to Server B:
   - Server B receives the waiting game from Server A
   - Server B assigns that player as 'O'
   - Server B broadcasts `PLAYER_JOINED` to Server A
   - Both servers start the game

**Why this design?**
- Ensures true distributed gameplay across servers
- Both servers compute and validate moves independently
- Demonstrates real server-to-server synchronization
- More realistic distributed system architecture

### Move Synchronization Flow

When a player makes a move:

1. **Client sends move** to its connected server
2. **Server validates** the move (turn, coordinates, occupied cells)
3. **Server computes** new board state and win conditions
4. **Server confirms** to the client
5. **Server broadcasts** move to partner server via Redis
6. **Partner server receives** move data
7. **Partner server updates** its game state (no validation needed - trusts partner)
8. **Partner server notifies** its connected client

**Both servers maintain identical game state** through this protocol.

### Move Validation

Server-side validation ensures:
- ✅ It's the player's turn
- ✅ Coordinates are valid (0-2)
- ✅ Cell is not occupied
- ✅ Game is in progress

Invalid moves are rejected with clear error messages.

### Win Detection

The `GameEngine` checks for winners after each move:
- **Rows** - Three in a row horizontally
- **Columns** - Three in a row vertically  
- **Diagonals** - Both diagonal directions
- **Draw** - Board full with no winner

Winning lines are highlighted in green on the client.

## 🔒 Important Design Decisions

### 1. **Paired Server Architecture**
- Servers A and B work as mandatory pairs
- Players MUST connect to different servers
- Enforces true distributed gameplay
- Each server validates and computes independently

### 2. **Separation of Concerns**
- `GameEngine` - Pure logic, no I/O or side effects
- `GameServer` - Network handling and orchestration
- `FederationManager` - Server synchronization only
- Each component has a single, clear responsibility

### 2. **Event-Driven Architecture**
- `FederationManager` extends EventEmitter
- Loose coupling between federation and game logic
- Easy to add new federation event handlers

### 3. **Type Safety**
- Comprehensive TypeScript types for all messages
- Union types for message discrimination
- Compile-time guarantees for protocol correctness

### 4. **Directed Messages (Not Broadcast)**
- Federation messages are sent from one specific server to its pair
- Each message has `fromServerId` and `toServerId`
- Prevents message loops and ensures clear communication path
- More efficient than broadcasting to all servers

### 5. **Stateless Game Logic**
- `GameEngine` methods are pure functions
- Board state passed explicitly, never mutated
- Easy to test and reason about

### 6. **Protocol Design**
- Clear message types for every interaction
- Timestamps for debugging and ordering
- Extensible for future features

## 🧪 Testing the Federation

### Test Cross-Server Gameplay

1. **Start both servers** (A on 3001, B on 3002)
2. **Connect Player 1 to Server A** (port 3001)
   - You'll see: "Waiting for opponent to join..."
3. **Connect Player 2 to Server B** (port 3002)
   - Game starts immediately!
4. **Play the game** - moves synchronize instantly

**Server A logs:**
```
[Server A] ✓ Player Alice (X) created game game_abc123
[Server A] ⏳ Waiting for player on Server B...
[Federation A] → Sent PLAYER_WAITING to B for game game_abc123
[Federation A] ← Received PLAYER_JOINED from B for game game_abc123
[Server A] ✓ Game game_abc123 is now PLAYING
[Server A]   Player X: Alice (Server A)
[Server A]   Player O: Bob (Server B)
[Server A] 🎯 Processing move from local player: (1,1)
[Server A] ✓ Move accepted: (1,1)
[Federation A] → Sent MOVE_MADE to B for game game_abc123
```

**Server B logs:**
```
[Federation B] ← Received PLAYER_WAITING from A for game game_abc123
[Server B] ✓ Player Bob (O) joined game game_abc123
[Federation B] → Sent PLAYER_JOINED to A for game game_abc123
[Server B] ✓ Game game_abc123 is now PLAYING
[Server B]   Player X: Alice (Server A)
[Server B]   Player O: Bob (Server B)
[Federation B] ← Received MOVE_MADE from A for game game_abc123
[Server B] 📨 Received move from partner: (1,1) in game game_abc123
```

### What NOT to Test

❌ **Don't connect both players to the same server**
- Player 1 → Server A, Player 2 → Server A = Both wait forever
- Player 1 → Server B, Player 2 → Server B = Both wait forever

✅ **Always use different servers**
- Player 1 → Server A, Player 2 → Server B = Game works!
- Player 1 → Server B, Player 2 → Server A = Game works!

## 🐛 Troubleshooting

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution:** Ensure Redis is running: `redis-cli ping` should return `PONG`

### Port Already in Use
```
Error: listen EADDRINUSE :::3001
```
**Solution:** Kill the process using the port or choose a different port

### Client Can't Connect
**Check:**
1. Server is running
2. Port matches (3001 or 3002)
3. No firewall blocking localhost

## 🚀 Production Considerations

### For Production Deployment:

1. **Add authentication** - Verify player identity
2. **Add rate limiting** - Prevent spam/abuse
3. **Add monitoring** - Track game metrics, errors
4. **Use Redis Cluster** - For high availability
5. **Add WebSocket heartbeats** - Detect disconnections
6. **Implement reconnection** - Handle network issues
7. **Add game persistence** - Store completed games
8. **Add matchmaking** - Smart player pairing
9. **Add ELO ratings** - Track player skill
10. **Use environment variables** - Config management

## 📝 License

MIT

## 👥 Contributing

Feel free to submit issues and enhancement requests!

---

**Built with ❤️ using TypeScript, WebSockets, and Redis**

## AI used:
I used only one prompt using Claude Sonnet 4.5.

The prompt:
as an expert JavaScript TypeScript backend developer, please Implement two independent WebSocket servers (e.g., Server A on port 3001, Server B on port 3002).
* Clients may connect to either server.
* The two servers must:
Synchronize game state in real-time (via WebSocket federation, shared memory layer like Redis pub/sub, or any protocol of your choice).
Handle move validation, win/draw detection, and game state updates.
Reject invalid moves (e.g., wrong turn, occupied cell).
 Client:
You must build a CLI-based WebSocket client (no browser required).
Client responsibilities:
Connect to either backend server via WebSocket.
Display the game board (e.g., ASCII grid).
Accept input from the user (row, col) via terminal.
Show opponent’s move when it happens (real-time).
use best practices, readable code, and explain the directory order and the reasons behind important decisions

The prompt produced the whole project, and except for some imports the models got confused (e.g. where each type got declared) - it worked perfectly.

almost.

Claude thought that each server should host a different game, so I had to correct it with the following prompt:

Please change the code so that the players play each from a different server. the flow should be like this:
1. player 1 connects to server 1
2. server 1 notify server 2 that someone entered, and they wait for the next player to join from server 2
3. player 2 connects to server 2
4. server 2 notify server 1 and they start the game
5. player 1 sends his turn to server 1, server 1 computes the turn and notify server 2, server 2 computes it too, shows player 2 the state now and asks player 2 to do his turn

With this prompt 