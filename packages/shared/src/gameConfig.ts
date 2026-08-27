import type { CardTier, RoundsOption, SupportCardType } from "./types.js";

/**
 * ゲームバランス設定。
 * hackathon_idea.md 時点でカードのスコア値・サポートカード効果は未確定のため、
 * ここに暫定値を集約している。実プレイでの調整はこのファイルの数値のみ変更すればよい。
 */

export const CARD_CONFIG: Record<
  CardTier,
  { count: number; overlearnChance: number; score: number }
> = {
  small: { count: 4, overlearnChance: 4, score: 10 },
  medium: { count: 2, overlearnChance: 15, score: 25 },
  large: { count: 1, overlearnChance: 50, score: 50 },
};

/** サポートカードを使わなかった場合にそのラウンドのスコアへ加算されるボーナス */
export const NO_SUPPORT_BONUS_SCORE = 15;

/**
 * サポートカードの暫定効果。種類・枚数はdoc上「実装しながらチームで検討」とされているため、
 * 各ラウンド、全8種類からランダムで3枚配られ、その中の1枚（または「使わない」）を
 * 選んで使うという前提で仮実装している。
 */
export const SUPPORT_CARD_CONFIG: Record<
  SupportCardType,
  { label: string; description: string }
> = {
  mitigate: { label: "軽減", description: "自分の過学習確率を10pt下げる" },
  sabotage: { label: "妨害", description: "相手の過学習確率を10pt上げる" },
  boost: { label: "ブースト", description: "自分の学習スコアに20加算する" },
  limit: { label: "制限", description: "相手が使えるプロンプトカードを1枚までに制限する" },
  randomBoost: {
    label: "強化",
    description: "自分が出したカードからランダムで1枚選び、そのスコアを2倍にする",
  },
  removeCard: { label: "破壊", description: "相手が出したカードからランダムで1枚を無効化する" },
  curse: {
    label: "道連れ",
    description: "自分が暴走した場合、75%の確率で相手の過学習確率も30pt上げる",
  },
  peek: { label: "偵察", description: "このラウンドの結果で相手のサポートカードの中身がわかる" },
};

/** 各ラウンドでランダムに3枚配られるサポートカードの母集団 */
export const SUPPORT_CARD_POOL: SupportCardType[] = [
  "mitigate",
  "sabotage",
  "boost",
  "limit",
  "randomBoost",
  "removeCard",
  "curse",
  "peek",
];

export const SUPPORT_CARD_DEAL_COUNT = 3;

export const SUPPORT_MITIGATE_AMOUNT = 10;
export const SUPPORT_SABOTAGE_AMOUNT = 10;
export const SUPPORT_BOOST_AMOUNT = 20;
export const SUPPORT_LIMIT_MAX_CARDS = 1;
export const SUPPORT_CURSE_TRIGGER_CHANCE = 75;
export const SUPPORT_CURSE_AMOUNT = 30;

/**
 * サポートカードの母集団からランダムに（重複無しで）SUPPORT_CARD_DEAL_COUNT枚選ぶ。
 * rngは0以上1未満の乱数を返す関数（テスト時に固定値を注入できるようにするため）。
 */
export function dealSupportOptions(rng: () => number = Math.random): SupportCardType[] {
  const pool = [...SUPPORT_CARD_POOL];
  const dealt: SupportCardType[] = [];
  for (let i = 0; i < SUPPORT_CARD_DEAL_COUNT && pool.length > 0; i++) {
    const index = Math.floor(rng() * pool.length);
    dealt.push(...pool.splice(index, 1));
  }
  return dealt;
}

/** ラウンド数選択 → 必要勝利数 */
export const WINS_NEEDED: Record<RoundsOption, number> = {
  1: 1,
  3: 2,
  5: 3,
};

export function buildInitialHand(): Record<CardTier, number> {
  return {
    small: CARD_CONFIG.small.count,
    medium: CARD_CONFIG.medium.count,
    large: CARD_CONFIG.large.count,
  };
}
