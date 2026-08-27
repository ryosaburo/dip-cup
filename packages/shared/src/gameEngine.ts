import { REALITY_DAMAGE, REALITY_GAUGE_DECREASE } from "./gameConfig.js";
import type { AttackSelection, DefenseSelection, TurnResult } from "./types.js";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** 攻撃カードの実ダメージ量（現実は固定値、妄想は申告値） */
export function getAttackDamage(attack: AttackSelection): number {
  return attack.cardType === "delusion" ? attack.delusionDamage! : REALITY_DAMAGE;
}

/**
 * 1ターン（攻撃側の1手＋防御側の見破り判定）をサーバー権威で判定する純粋関数。
 * rngは0以上1未満の乱数を返す関数（テスト時に固定値を注入できるようにするため）。
 *
 * rngの消費順序（新しい効果を追加する際は崩さないこと。既存テストはこの順序に依存する）：
 *   1. 攻撃側が見破られ、かつ妄想カードだった場合のみ、即敗北抽選を1回消費
 */
export function resolveTurn(params: {
  turnNumber: number;
  attackerId: string;
  defenderId: string;
  attack: AttackSelection;
  defense: DefenseSelection;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
  rng?: () => number;
}): TurnResult {
  const { turnNumber, attackerId, defenderId, attack, defense, lifeTotals, delusionGauges } = params;
  const rng = params.rng ?? Math.random;

  const wasCaught = defense.prediction === attack.cardType;
  const cardDamage = getAttackDamage(attack);
  const currentGauge = delusionGauges[attackerId] ?? 0;

  let damageDealt = 0;
  let selfDamage = 0;
  let gaugeDelta = 0;
  let instantDefeat = false;

  if (wasCaught) {
    selfDamage = cardDamage;
    if (attack.cardType === "delusion") {
      gaugeDelta = cardDamage;
      if (rng() < currentGauge / 100) {
        instantDefeat = true;
      }
    }
  } else {
    damageDealt = cardDamage;
    if (attack.cardType === "reality") {
      gaugeDelta = -REALITY_GAUGE_DECREASE;
    }
  }

  const nextLifeTotals = { ...lifeTotals };
  nextLifeTotals[attackerId] = Math.max(0, (nextLifeTotals[attackerId] ?? 0) - selfDamage);
  nextLifeTotals[defenderId] = Math.max(0, (nextLifeTotals[defenderId] ?? 0) - damageDealt);

  const nextGauges = { ...delusionGauges };
  nextGauges[attackerId] = instantDefeat ? 100 : clampPercent(currentGauge + gaugeDelta);

  return {
    turnNumber,
    attackerId,
    defenderId,
    attack,
    defense,
    wasCaught,
    damageDealt,
    selfDamage,
    gaugeDelta,
    instantDefeat,
    lifeTotals: nextLifeTotals,
    delusionGauges: nextGauges,
  };
}

/**
 * ライフが0以下、または妄想ゲージが100%以上になったプレイヤーがいれば試合終了。
 * 両者同時に敗北条件を満たした場合は引き分け（winnerId: null）。
 */
export function evaluateMatchOutcome(
  lifeTotals: Record<string, number>,
  delusionGauges: Record<string, number>,
): { gameOver: boolean; winnerId: string | null } {
  const ids = Object.keys(lifeTotals);
  const defeated = ids.filter((id) => (lifeTotals[id] ?? 0) <= 0 || (delusionGauges[id] ?? 0) >= 100);

  if (defeated.length === 0) return { gameOver: false, winnerId: null };
  if (defeated.length >= ids.length) return { gameOver: true, winnerId: null };

  const winnerId = ids.find((id) => !defeated.includes(id)) ?? null;
  return { gameOver: true, winnerId };
}
