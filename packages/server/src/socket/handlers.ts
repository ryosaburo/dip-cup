import type { Server, Socket } from "socket.io";
import {
  getMatchWinner,
  resolveRound,
  toPublicRoundResult,
  buildInitialHand,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@battle/shared";
import { RoomManager, type Room } from "../rooms/RoomManager.js";
import { supabaseAdmin, verifyAccessToken } from "../lib/supabase.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerHandlers(io: TypedServer, roomManager: RoomManager) {
  io.on("connection", (socket: TypedSocket) => {
    socket.on("create_room", async ({ rounds, playerName, accessToken }) => {
      try {
        const userId = await verifyAccessToken(accessToken);
        const room = roomManager.createRoom(rounds, socket.id, playerName, userId);
        socket.join(room.roomCode);
        socket.emit("room_created", {
          roomCode: room.roomCode,
          playerId: room.players[0].playerId,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("join_room", async ({ roomCode, playerName, accessToken }) => {
      try {
        const userId = await verifyAccessToken(accessToken);
        const room = roomManager.joinRoom(roomCode, socket.id, playerName, userId);
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
            supportOptions: player.dealtSupportOptions,
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

  for (const player of room.players) {
    io.to(player.socketId).emit("round_result", {
      result: toPublicRoundResult(result, player.playerId),
      yourHand: hand,
    });
  }

  if (winnerId) {
    room.phase = "gameover";
    io.to(room.roomCode).emit("game_over", { winnerId, matchWins: room.matchWins });
    void saveMatchHistory(room, winnerId);
    return;
  }

  roomManager.resetForNextRound(room);
  room.phase = "selecting";
  for (const player of room.players) {
    io.to(player.socketId).emit("phase_changed", {
      phase: "selecting",
      supportOptions: player.dealtSupportOptions,
    });
  }
}

/** ログイン済みプレイヤーが1人以上いる試合のみ対戦履歴を保存する */
async function saveMatchHistory(room: Room, winnerId: string) {
  if (!supabaseAdmin) return;

  const [player1, player2] = room.players;
  if (!player1.userId && !player2.userId) return;

  const winner = room.players.find((p) => p.playerId === winnerId);

  const { error } = await supabaseAdmin.from("match_history").insert({
    room_code: room.roomCode,
    rounds_option: room.roundsOption,
    player1_user_id: player1.userId ?? null,
    player1_name: player1.name,
    player1_wins: room.matchWins[player1.playerId] ?? 0,
    player2_user_id: player2.userId ?? null,
    player2_name: player2.name,
    player2_wins: room.matchWins[player2.playerId] ?? 0,
    winner_user_id: winner?.userId ?? null,
  });

  if (error) console.error("[supabase] match_history insert failed:", error.message);
}

function handleDisconnect(io: TypedServer, roomManager: RoomManager, socket: TypedSocket) {
  const removed = roomManager.removeBySocketId(socket.id);
  if (!removed?.opponent) return;
  io.to(removed.opponent.socketId).emit("opponent_left");
}
