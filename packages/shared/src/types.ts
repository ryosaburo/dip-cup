export type CardTier = "small" | "medium" | "large";

export type SupportCardType = "mitigate" | "sabotage" | "boost";

export type RoundsOption = 1 | 3 | 5;

export type RoomPhase =
  | "waiting"
  | "selecting"
  | "revealing"
  | "result"
  | "gameover";

/** 1枚のプロンプトカード（手札内で一意なid、例: "small-2"） */
export interface PromptCardInstance {
  id: string;
  tier: CardTier;
}

/** そのラウンドで実際にプレイヤーが選んだ内容 */
export interface PlayerSelection {
  promptCardIds: string[];
  supportCard?: SupportCardType;
}

export interface PlayerPublicInfo {
  playerId: string;
  name: string;
}

/** 1ラウンドにおける1プレイヤー分の判定結果 */
export interface RoundOutcome {
  playerId: string;
  selection: PlayerSelection;
  overlearnChance: number;
  roll: number;
  busted: boolean;
  score: number;
  usedSupportBonus: boolean;
}

export interface RoundResult {
  roundNumber: number;
  outcomes: Record<string, RoundOutcome>;
  /** 勝者なし＝両者暴走 or 同点で再戦 */
  winnerId: string | null;
  isReplay: boolean;
  matchWins: Record<string, number>;
}

export interface GameOverResult {
  winnerId: string;
  matchWins: Record<string, number>;
}

export interface HandState {
  remaining: Record<CardTier, number>;
}
