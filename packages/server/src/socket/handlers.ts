import type { Server, Socket } from "socket.io";
import {
  evaluateMatchOutcome,
  getAttackMagnitude,
  resolveTurn,
  type ClientToServerEvents,
  type DefenseSelection,
  type ServerToClientEvents,
} from "@battle/shared";
import { RoomManager, type Room } from "../rooms/RoomManager.js";
import { supabaseAdmin, verifyAccessToken } from "../lib/supabase.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerHandlers(io: TypedServer, roomManager: RoomManager) {
  io.on("connection", (socket: TypedSocket) => {
    socket.on("create_room", async ({ playerName, accessToken }) => {
      try {
        const userId = await verifyAccessToken(accessToken);
        const room = roomManager.createRoom(socket.id, playerName, userId);
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
            turnNumber: room.turnNumber,
            opponentName: opponent.name,
            lifeTotals: room.lifeTotals,
            delusionGauges: room.delusionGauges,
            attackerId: room.attackerId,
            dealtRealityCards: room.dealtRealityCards,
            delusionSuccessCounts: room.delusionSuccessCounts,
          });
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("submit_attack", (attack) => {
      try {
        const room = roomManager.submitAttack(socket.id, attack);
        const attackerGauge = room.delusionGauges[room.attackerId] ?? 0;
        io.to(room.roomCode).emit("attack_submitted", {
          damage: getAttackMagnitude(attack, attackerGauge),
          attackerId: room.attackerId,
          turnNumber: room.turnNumber,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("submit_defense", (defense) => {
      try {
        const room = roomManager.submitDefense(socket.id, defense);
        resolveAndBroadcastTurn(io, roomManager, room, defense);
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("leave_room", () => handleDisconnect(io, roomManager, socket));
    socket.on("disconnect", () => handleDisconnect(io, roomManager, socket));
  });
}

function resolveAndBroadcastTurn(
  io: TypedServer,
  roomManager: RoomManager,
  room: Room,
  defense: DefenseSelection,
) {
  const attacker = roomManager.getAttacker(room);
  const defender = roomManager.getDefender(room);

  const result = resolveTurn({
    turnNumber: room.turnNumber,
    attackerId: attacker.playerId,
    defenderId: defender.playerId,
    attack: room.pendingAttack!,
    defense,
    lifeTotals: room.lifeTotals,
    delusionGauges: room.delusionGauges,
    lingeringWounds: room.lingeringWounds,
    delusionSuccessCounts: room.delusionSuccessCounts,
  });

  room.lifeTotals = result.lifeTotals;
  room.delusionGauges = result.delusionGauges;
  room.lingeringWounds = result.lingeringWounds;
  room.delusionSuccessCounts = result.delusionSuccessCounts;

  const { gameOver, winnerId } = evaluateMatchOutcome(
    room.lifeTotals,
    room.delusionGauges,
    room.delusionSuccessCounts,
  );

  if (gameOver) {
    room.phase = "gameover";
    io.to(room.roomCode).emit("turn_result", {
      result,
      nextAttackerId: room.attackerId,
      nextDealtRealityCards: room.dealtRealityCards,
    });
    io.to(room.roomCode).emit("game_over", {
      winnerId,
      lifeTotals: room.lifeTotals,
      delusionGauges: room.delusionGauges,
      delusionSuccessCounts: room.delusionSuccessCounts,
    });
    void saveMatchHistory(room, winnerId);
    return;
  }

  roomManager.advanceTurn(room);
  io.to(room.roomCode).emit("turn_result", {
    result,
    nextAttackerId: room.attackerId,
    nextDealtRealityCards: room.dealtRealityCards,
  });
}

/** ログイン済みプレイヤーが1人以上いる試合のみ対戦履歴を保存する */
async function saveMatchHistory(room: Room, winnerId: string | null) {
  if (!supabaseAdmin) return;

  const [player1, player2] = room.players;
  if (!player1.userId && !player2.userId) return;

  const winner = winnerId ? room.players.find((p) => p.playerId === winnerId) : undefined;

  const { error } = await supabaseAdmin.from("match_history").insert({
    room_code: room.roomCode,
    player1_user_id: player1.userId ?? null,
    player1_name: player1.name,
    player1_final_life: room.lifeTotals[player1.playerId] ?? 0,
    player2_user_id: player2.userId ?? null,
    player2_name: player2.name,
    player2_final_life: room.lifeTotals[player2.playerId] ?? 0,
    winner_user_id: winner?.userId ?? null,
  });

  if (error) console.error("[supabase] match_history insert failed:", error.message);
}

function handleDisconnect(io: TypedServer, roomManager: RoomManager, socket: TypedSocket) {
  const removed = roomManager.removeBySocketId(socket.id);
  if (!removed?.opponent) return;
  io.to(removed.opponent.socketId).emit("opponent_left");
}
