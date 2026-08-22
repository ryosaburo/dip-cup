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
 * 各ラウンド最大1回・3種類から選択可能という前提で仮実装している。
 */
export const SUPPORT_CARD_CONFIG: Record<
  SupportCardType,
  { label: string; description: string }
> = {
  mitigate: { label: "軽減", description: "自分の過学習確率を10pt下げる" },
  sabotage: { label: "妨害", description: "相手の過学習確率を10pt上げる" },
  boost: { label: "ブースト", description: "自分の学習スコアに20加算する" },
};

export const SUPPORT_MITIGATE_AMOUNT = 10;
export const SUPPORT_SABOTAGE_AMOUNT = 10;
export const SUPPORT_BOOST_AMOUNT = 20;

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
