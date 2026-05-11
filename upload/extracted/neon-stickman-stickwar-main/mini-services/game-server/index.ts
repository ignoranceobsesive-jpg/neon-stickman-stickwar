// ====== NEON STICKMAN: GAME SERVER ======
// Socket.io server for matchmaking and real-time game synchronization
// Port: 3030

import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3030;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ====== TYPES ======
interface PlayerQueue {
  socketId: string;
  username: string;
  avatar: string;
  elo: number;
  rank: string;
  rankIcon: string;
  joinedAt: number;
}

interface GameRoom {
  id: string;
  players: [PlayerQueue, PlayerQueue];
  createdAt: number;
  state: 'waiting' | 'playing' | 'finished';
}

// ====== STATE ======
const matchmakingQueue: PlayerQueue[] = [];
const activeRooms: Map<string, GameRoom> = new Map();
const playerRooms: Map<string, string> = new Map(); // socketId -> roomId
const customRooms: Map<string, GameRoom> = new Map(); // roomCode -> room

// ====== MATCHMAKING ======
function findMatch(player: PlayerQueue): PlayerQueue | null {
  // Find opponent within ELO range (±200)
  const eloMin = player.elo - 200;
  const eloMax = player.elo + 200;

  // Sort by closest ELO
  const candidates = matchmakingQueue.filter(
    p => p.socketId !== player.socketId && p.elo >= eloMin && p.elo <= eloMax
  );

  if (candidates.length === 0) return null;

  // Pick closest ELO match
  candidates.sort((a, b) => Math.abs(a.elo - player.elo) - Math.abs(b.elo - player.elo));
  return candidates[0];
}

function createGameRoom(player1: PlayerQueue, player2: PlayerQueue): GameRoom {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const room: GameRoom = {
    id: roomId,
    players: [player1, player2],
    createdAt: Date.now(),
    state: 'waiting',
  };
  activeRooms.set(roomId, room);
  playerRooms.set(player1.socketId, roomId);
  playerRooms.set(player2.socketId, roomId);
  return room;
}

function removeFromQueue(socketId: string): void {
  const index = matchmakingQueue.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
  }
}

// ====== SOCKET HANDLERS ======
io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // Player joins matchmaking queue
  socket.on('find-match', (data: { username: string; avatar: string; elo: number; rank: string; rankIcon: string }) => {
    const player: PlayerQueue = {
      socketId: socket.id,
      username: data.username,
      avatar: data.avatar,
      elo: data.elo,
      rank: data.rank,
      rankIcon: data.rankIcon,
      joinedAt: Date.now(),
    };

    // Remove from queue if already there
    removeFromQueue(socket.id);

    // Try to find a match immediately
    const opponent = findMatch(player);
    if (opponent) {
      removeFromQueue(opponent.socketId);
      const room = createGameRoom(player, opponent);

      // Notify both players
      socket.emit('match-found', {
        roomId: room.id,
        opponent: { username: opponent.username, avatar: opponent.avatar, elo: opponent.elo, rank: opponent.rank, rankIcon: opponent.rankIcon },
      });

      io.to(opponent.socketId).emit('match-found', {
        roomId: room.id,
        opponent: { username: player.username, avatar: player.avatar, elo: player.elo, rank: player.rank, rankIcon: player.rankIcon },
      });

      console.log(`[MATCH] ${player.username} vs ${opponent.username} (Room: ${room.id})`);
    } else {
      // Add to queue
      matchmakingQueue.push(player);
      socket.emit('searching', { queueSize: matchmakingQueue.length });
      console.log(`[QUEUE] ${player.username} added (queue: ${matchmakingQueue.length})`);
    }
  });

  // Cancel matchmaking
  socket.on('cancel-search', () => {
    removeFromQueue(socket.id);
    console.log(`[CANCEL] ${socket.id} left queue`);
  });

  // Create custom room
  socket.on('create-room', (data: { username: string; avatar: string; elo: number; rank: string; rankIcon: string }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const player: PlayerQueue = {
      socketId: socket.id,
      username: data.username,
      avatar: data.avatar,
      elo: data.elo,
      rank: data.rank,
      rankIcon: data.rankIcon,
      joinedAt: Date.now(),
    };

    // Create a room waiting for opponent
    const room: GameRoom = {
      id: `custom_${roomCode}`,
      players: [player, null as unknown as PlayerQueue],
      createdAt: Date.now(),
      state: 'waiting',
    };

    customRooms.set(roomCode, room);
    playerRooms.set(socket.id, room.id);
    socket.join(room.id);

    socket.emit('room-created', { roomCode, roomId: room.id });
    console.log(`[CREATE ROOM] ${data.username} created room ${roomCode}`);
  });

  // Join custom room
  socket.on('join-room', (data: { roomCode: string; username: string; avatar: string; elo: number; rank: string; rankIcon: string }) => {
    const room = customRooms.get(data.roomCode);
    if (!room) {
      socket.emit('room-error', { message: 'Room not found' });
      return;
    }

    if (room.state !== 'waiting') {
      socket.emit('room-error', { message: 'Room is full or already in progress' });
      return;
    }

    const player: PlayerQueue = {
      socketId: socket.id,
      username: data.username,
      avatar: data.avatar,
      elo: data.elo,
      rank: data.rank,
      rankIcon: data.rankIcon,
      joinedAt: Date.now(),
    };

    room.players[1] = player;
    room.state = 'playing';
    playerRooms.set(socket.id, room.id);
    socket.join(room.id);

    // Notify both players
    const p1 = room.players[0];
    io.to(room.id).emit('match-found', {
      roomId: room.id,
      opponent: { username: player.username, avatar: player.avatar, elo: player.elo, rank: player.rank, rankIcon: player.rankIcon },
    });

    io.to(p1.socketId).emit('match-found', {
      roomId: room.id,
      opponent: { username: player.username, avatar: player.avatar, elo: player.elo, rank: player.rank, rankIcon: player.rankIcon },
    });

    console.log(`[JOIN ROOM] ${player.username} joined room ${data.roomCode}`);
  });

  // Game sync events
  socket.on('game-action', (data: { action: string; payload: unknown }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    // Broadcast to the other player in the room
    socket.to(roomId).emit('opponent-action', data);
  });

  // Game result
  socket.on('game-result', (data: { roomId: string; winner: string; eloChange: number }) => {
    const room = activeRooms.get(data.roomId);
    if (room) {
      room.state = 'finished';
      io.to(data.roomId).emit('game-over', data);
      console.log(`[GAME OVER] Room ${data.roomId} - Winner: ${data.winner}`);
    }
  });

  // Rematch request
  socket.on('rematch-request', (data: { roomId: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('rematch-requested', { from: socket.id });
  });

  // Rematch accept
  socket.on('rematch-accept', (data: { roomId: string }) => {
    const room = activeRooms.get(data.roomId);
    if (!room) return;
    room.state = 'playing';
    io.to(data.roomId).emit('rematch-started', { roomId: data.roomId });
  });

  // Rematch decline
  socket.on('rematch-decline', (data: { roomId: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('rematch-declined');
  });

  // Chat message
  socket.on('chat-message', (data: { message: string }) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('chat-message', { from: socket.id, message: data.message });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] ${socket.id}`);
    removeFromQueue(socket.id);

    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      // Notify other player
      socket.to(roomId).emit('opponent-disconnected');
      const room = activeRooms.get(roomId);
      if (room) {
        room.state = 'finished';
      }
      playerRooms.delete(socket.id);
    }

    // Clean up custom rooms
    for (const [code, room] of customRooms.entries()) {
      if (room.players[0]?.socketId === socket.id || room.players[1]?.socketId === socket.id) {
        customRooms.delete(code);
      }
    }
  });
});

// ====== START SERVER ======
httpServer.listen(PORT, () => {
  console.log(`🎮 Neon Stickman Game Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});

// Periodic queue cleanup (remove stale entries older than 60s)
setInterval(() => {
  const now = Date.now();
  const stale = matchmakingQueue.filter(p => now - p.joinedAt > 60000);
  for (const p of stale) {
    removeFromQueue(p.socketId);
    io.to(p.socketId).emit('search-timeout');
  }
  if (stale.length > 0) {
    console.log(`[CLEANUP] Removed ${stale.length} stale queue entries`);
  }
}, 30000);
