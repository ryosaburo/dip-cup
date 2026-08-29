import type { AttackSelection, DefenseSelection, RealityCardId, TurnResult } from "./types.js";

/** Client -> Server */
export interface ClientToServerEvents {
  create_room: (payload: { playerName: string; accessToken?: string }) => void;
  join_room: (payload: {
    roomCode: string;
    playerName: string;
    accessToken?: string;
  }) => void;
  /** 自分の攻撃ターンにカードを出す */
  submit_attack: (payload: AttackSelection) => void;
  /** 自分の防御ターンに予想を出す */
  submit_defense: (payload: DefenseSelection) => void;
  leave_room: () => void;
  /** 自動マッチングの待機列に並ぶ。相手が既に並んでいれば即座にマッチしてルームが作られる */
  find_match: (payload: { playerName: string; accessToken?: string }) => void;
  /** 自動マッチングの待機を取りやめる */
  cancel_match: () => void;
}

/** Server -> Client */
export interface ServerToClientEvents {
  room_created: (payload: { roomCode: string; playerId: string }) => void;
  room_joined: (payload: {
    roomCode: string;
    playerId: string;
    opponentName: string;
  }) => void;
  error: (payload: { message: string }) => void;
  game_start: (payload: {
    turnNumber: number;
    opponentName: string;
    lifeTotals: Record<string, number>;
    delusionGauges: Record<string, number>;
    /** 最初の攻撃側のplayerId */
    attackerId: string;
    /** 最初の攻撃側にランダムで配られた現実カード（この中から1枚を選ぶ） */
    dealtRealityCards: RealityCardId[];
    /** 各プレイヤーが見破られずに成功させた妄想カードの累計回数 */
    delusionSuccessCounts: Record<string, number>;
  }) => void;
  /** 攻撃側が攻撃を確定した合図。防御側はこのダメージ量を見てから予想する（カード種別は伏せる） */
  attack_submitted: (payload: { damage: number; attackerId: string; turnNumber: number }) => void;
  turn_result: (payload: {
    result: TurnResult;
    nextAttackerId: string;
    /** 次の攻撃側にランダムで配られた現実カード（この中から1枚を選ぶ） */
    nextDealtRealityCards: RealityCardId[];
  }) => void;
  game_over: (payload: {
    winnerId: string | null;
    lifeTotals: Record<string, number>;
    delusionGauges: Record<string, number>;
    delusionSuccessCounts: Record<string, number>;
  }) => void;
  opponent_left: () => void;
  /** 自動マッチングの待機列に並んだ（まだ相手が見つかっていない） */
  matchmaking_waiting: () => void;
}
