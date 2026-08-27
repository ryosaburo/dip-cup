import { randomUUID } from "node:crypto";
import {
  DELUSION_DAMAGE_MAX,
  DELUSION_DAMAGE_MIN,
  dealRealityCards,
  LIFE_DRAIN_MAX,
  LIFE_DRAIN_MIN,
  STARTING_LIFE,
  type AttackSelection,
  type DefenseSelection,
  type LingeringWound,
  type RealityCardId,
  type RoomPhase,
} from "@battle/shared";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい0/O/1/Iを除外

export interface ServerPlayer {
  playerId: string;
  socketId: string;
  name: string;
  userId?: string;
}

export interface Room {
  roomCode: string;
  turnNumber: number;
  phase: RoomPhase;
  /** 現在の攻撃側のplayerId */
  attackerId: string;
  /** 攻撃側が確定させた、防御側の判定待ちの攻撃内容 */
  pendingAttack?: AttackSelection;
  /** 現在の攻撃側にランダムで配られている現実カード（この中からしか選べない） */
  dealtRealityCards: RealityCardId[];
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
  /** 「疼く傷跡」による継続ダメージ（受けているプレイヤーのplayerId → 効果リスト） */
  lingeringWounds: Record<string, LingeringWound[]>;
  /** 各プレイヤーが見破られずに成功させた妄想カードの累計回数 */
  delusionSuccessCounts: Record<string, number>;
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

  createRoom(hostSocketId: string, hostName: string, hostUserId?: string): Room {
    const roomCode = this.generateRoomCode();
    const host: ServerPlayer = {
      playerId: randomUUID(),
      socketId: hostSocketId,
      name: hostName,
      userId: hostUserId,
    };
    const room: Room = {
      roomCode,
      turnNumber: 0,
      phase: "waiting",
      attackerId: host.playerId,
      dealtRealityCards: [],
      lifeTotals: { [host.playerId]: STARTING_LIFE },
      delusionGauges: { [host.playerId]: 0 },
      lingeringWounds: {},
      delusionSuccessCounts: { [host.playerId]: 0 },
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
    };
    room.players.push(guest);
    room.lifeTotals[guest.playerId] = STARTING_LIFE;
    room.delusionGauges[guest.playerId] = 0;
    room.delusionSuccessCounts[guest.playerId] = 0;
    room.phase = "attacking";
    room.turnNumber = 1;
    // ホスト（先に部屋を作った側）が先攻
    room.attackerId = room.players[0].playerId;
    room.dealtRealityCards = dealRealityCards();
    this.socketToRoom.set(socketId, room.roomCode);
    return room;
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  getDefender(room: Room): ServerPlayer {
    return room.players.find((p) => p.playerId !== room.attackerId)!;
  }

  getAttacker(room: Room): ServerPlayer {
    return room.players.find((p) => p.playerId === room.attackerId)!;
  }

  submitAttack(socketId: string, attack: AttackSelection): Room {
    const room = this.getRoomBySocketId(socketId);
    if (!room) throw new Error("ルームに参加していません");
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) throw new Error("プレイヤーが見つかりません");
    if (player.playerId !== room.attackerId) throw new Error("あなたの攻撃ターンではありません");
    if (room.pendingAttack) throw new Error("すでに攻撃を選択済みです");

    validateAttack(attack, room.dealtRealityCards);
    room.pendingAttack = attack;
    room.phase = "defending";
    return room;
  }

  submitDefense(socketId: string, defense: DefenseSelection): Room {
    const room = this.getRoomBySocketId(socketId);
    if (!room) throw new Error("ルームに参加していません");
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) throw new Error("プレイヤーが見つかりません");
    if (player.playerId === room.attackerId) throw new Error("あなたの防御ターンではありません");
    if (!room.pendingAttack) throw new Error("相手はまだ攻撃を選択していません");

    validateDefense(defense);
    return room;
  }

  /** ターン解決後、攻撃側と防御側を入れ替えて次のターンへ進める */
  advanceTurn(room: Room): void {
    const [a, b] = room.players;
    room.attackerId = room.attackerId === a.playerId ? b.playerId : a.playerId;
    room.pendingAttack = undefined;
    room.dealtRealityCards = dealRealityCards();
    room.turnNumber += 1;
    room.phase = "attacking";
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

function validateAttack(attack: AttackSelection, dealtRealityCards: RealityCardId[]): void {
  if (attack.cardType !== "reality" && attack.cardType !== "delusion") {
    throw new Error("不正なカード種別です");
  }
  if (attack.cardType === "reality") {
    if (!attack.realityCardId || !dealtRealityCards.includes(attack.realityCardId)) {
      throw new Error("そのターンに配られていない現実カードです");
    }
    if (attack.realityCardId === "life_drain") {
      const amount = attack.realityAmount;
      if (
        typeof amount !== "number" ||
        !Number.isInteger(amount) ||
        amount < LIFE_DRAIN_MIN ||
        amount > LIFE_DRAIN_MAX
      ) {
        throw new Error(`吸血の申告ダメージ量は${LIFE_DRAIN_MIN}〜${LIFE_DRAIN_MAX}の整数で指定してください`);
      }
    }
  }
  if (attack.cardType === "delusion") {
    if (attack.delusionEffect !== "damage" && attack.delusionEffect !== "heal") {
      throw new Error("妄想カードの効果種別（ダメージ／回復）を指定してください");
    }
    const damage = attack.delusionDamage;
    if (
      typeof damage !== "number" ||
      !Number.isInteger(damage) ||
      damage < DELUSION_DAMAGE_MIN ||
      damage > DELUSION_DAMAGE_MAX
    ) {
      throw new Error(
        `妄想カードの申告量は${DELUSION_DAMAGE_MIN}〜${DELUSION_DAMAGE_MAX}の整数で指定してください`,
      );
    }
  }
}

function validateDefense(defense: DefenseSelection): void {
  if (defense.prediction !== "reality" && defense.prediction !== "delusion") {
    throw new Error("不正な予想です");
  }
}
