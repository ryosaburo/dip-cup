import { randomUUID } from "node:crypto";
import {
  buildInitialHand,
  dealSupportOptions,
  WINS_NEEDED,
  type CardTier,
  type PlayerSelection,
  type RoomPhase,
  type RoundsOption,
  type SupportCardType,
} from "@battle/shared";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい0/O/1/Iを除外

export interface ServerPlayer {
  playerId: string;
  socketId: string;
  name: string;
  userId?: string;
  pendingSelection?: PlayerSelection;
  /** そのラウンドでランダムに配られたサポートカードの選択肢（「使わない」以外） */
  dealtSupportOptions: SupportCardType[];
}

export interface Room {
  roomCode: string;
  roundsOption: RoundsOption;
  winsNeeded: number;
  roundNumber: number;
  phase: RoomPhase;
  matchWins: Record<string, number>;
  players: ServerPlayer[];
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();

  private generateRoomCode(): string {
    let code: string;
    do {
      code = Array.from(
        { length: 6 },
        () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)],
      ).join("");
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(
    rounds: RoundsOption,
    hostSocketId: string,
    hostName: string,
    hostUserId?: string,
  ): Room {
    const roomCode = this.generateRoomCode();
    const host: ServerPlayer = {
      playerId: randomUUID(),
      socketId: hostSocketId,
      name: hostName,
      userId: hostUserId,
      dealtSupportOptions: [],
    };
    const room: Room = {
      roomCode,
      roundsOption: rounds,
      winsNeeded: WINS_NEEDED[rounds],
      roundNumber: 0,
      phase: "waiting",
      matchWins: {},
      players: [host],
    };
    this.rooms.set(roomCode, room);
    this.socketToRoom.set(hostSocketId, roomCode);
    return room;
  }

  joinRoom(roomCode: string, socketId: string, name: string, userId?: string): Room {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error("ルームが見つかりません");
    if (room.players.length >= 2) throw new Error("ルームは満員です");

    const guest: ServerPlayer = {
      playerId: randomUUID(),
      socketId,
      name,
      userId,
      dealtSupportOptions: [],
    };
    room.players.push(guest);
    room.matchWins[guest.playerId] = 0;
    room.matchWins[room.players[0].playerId] = room.matchWins[room.players[0].playerId] ?? 0;
    room.phase = "selecting";
    room.roundNumber = 1;
    this.dealSupportOptionsForRound(room);
    this.socketToRoom.set(socketId, room.roomCode);
    return room;
  }

  /** そのラウンド用にサポートカードの選択肢をプレイヤーごとにランダムで配り直す */
  dealSupportOptionsForRound(room: Room): void {
    for (const player of room.players) {
      player.dealtSupportOptions = dealSupportOptions();
    }
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  submitSelection(socketId: string, selection: PlayerSelection): Room {
    const room = this.getRoomBySocketId(socketId);
    if (!room) throw new Error("ルームに参加していません");
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) throw new Error("プレイヤーが見つかりません");

    validateSelection(selection, player.dealtSupportOptions);
    player.pendingSelection = selection;
    return room;
  }

  bothSubmitted(room: Room): boolean {
    return room.players.length === 2 && room.players.every((p) => p.pendingSelection);
  }

  resetForNextRound(room: Room): void {
    room.roundNumber += 1;
    for (const player of room.players) {
      player.pendingSelection = undefined;
    }
    this.dealSupportOptionsForRound(room);
  }

  removeBySocketId(socketId: string): { room: Room; opponent?: ServerPlayer } | undefined {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return undefined;

    this.socketToRoom.delete(socketId);
    const opponent = room.players.find((p) => p.socketId !== socketId);
    this.rooms.delete(room.roomCode);
    if (opponent) this.socketToRoom.delete(opponent.socketId);
    return { room, opponent };
  }
}

function validateSelection(selection: PlayerSelection, dealtSupportOptions: SupportCardType[]): void {
  const tierCounts: Record<CardTier, number> = { small: 0, medium: 0, large: 0 };
  for (const id of selection.promptCardIds) {
    const tier = id.split("-")[0] as CardTier;
    if (!(tier in tierCounts)) throw new Error(`不正なカードid: ${id}`);
    tierCounts[tier] += 1;
  }
  const limits = buildInitialHand();
  for (const tier of Object.keys(tierCounts) as CardTier[]) {
    if (tierCounts[tier] > limits[tier]) {
      throw new Error(`${tier}カードの使用枚数が手札を超えています`);
    }
  }
  if (selection.supportCard && !dealtSupportOptions.includes(selection.supportCard)) {
    throw new Error("不正なサポートカードです");
  }
}
