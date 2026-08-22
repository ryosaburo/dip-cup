import type { Server, Socket } from "socket.io";
import {
  getMatchWinner,
  resolveRound,
  buildInitialHand,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@battle/shared";
import { RoomManager, type Room } from "../rooms/RoomManager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerHandlers(io: TypedServer, roomManager: RoomManager) {
  io.on("connection", (socket: TypedSocket) => {
    socket.on("create_room", ({ rounds, playerName }) => {
      try {
        const room = roomManager.createRoom(rounds, socket.id, playerName);
        socket.join(room.roomCode);
        socket.emit("room_created", {
          roomCode: room.roomCode,
          playerId: room.players[0].playerId,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("join_room", ({ roomCode, playerName }) => {
      try {
        const room = roomManager.joinRoom(roomCode, socket.id, playerName);
        socket.join(room.roomCode);

        const guest = room.players.find((p) => p.socketId === socket.id)!;
        const host = room.players.find((p) => p.socketId !== socket.id)!;

        socket.emit("room_joined", {
          roomCode: room.roomCode,
          playerId: guest.playerId,
          opponentName: host.name,
        });

        for (const player of room.players) {
          const opponent = room.players.find((p) => p.playerId !== player.playerId)!;
          io.to(player.socketId).emit("game_start", {
            roundsTarget: room.roundsOption,
            winsNeeded: room.winsNeeded,
            roundNumber: room.roundNumber,
            hand: { remaining: buildInitialHand() },
            opponentName: opponent.name,
          });
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("select_cards", (selection) => {
      try {
        const room = roomManager.submitSelection(socket.id, selection);
        if (!roomManager.bothSubmitted(room)) return;

        resolveAndBroadcastRound(io, roomManager, room);
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("leave_room", () => handleDisconnect(io, roomManager, socket));
    socket.on("disconnect", () => handleDisconnect(io, roomManager, socket));
  });
}

function resolveAndBroadcastRound(io: TypedServer, roomManager: RoomManager, room: Room) {
  const [playerA, playerB] = room.players;

  const result = resolveRound({
    roundNumber: room.roundNumber,
    playerA: { playerId: playerA.playerId, selection: playerA.pendingSelection! },
    playerB: { playerId: playerB.playerId, selection: playerB.pendingSelection! },
    matchWins: room.matchWins,
  });

  room.matchWins = result.matchWins;

  const winnerId = getMatchWinner(room.matchWins, room.winsNeeded);
  const hand = { remaining: buildInitialHand() };

  io.to(room.roomCode).emit("round_result", { result, yourHand: hand });

  if (winnerId) {
    room.phase = "gameover";
    io.to(room.roomCode).emit("game_over", { winnerId, matchWins: room.matchWins });
    return;
  }

  roomManager.resetForNextRound(room);
  room.phase = "selecting";
  io.to(room.roomCode).emit("phase_changed", { phase: "selecting" });
}

function handleDisconnect(io: TypedServer, roomManager: RoomManager, socket: TypedSocket) {
  const removed = roomManager.removeBySocketId(socket.id);
  if (!removed?.opponent) return;
  io.to(removed.opponent.socketId).emit("opponent_left");
}
