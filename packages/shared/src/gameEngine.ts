import {
  HEAVY_STRIKE_DAMAGE,
  LINGERING_WOUND_DURATION,
  LINGERING_WOUND_INITIAL_DAMAGE,
  LINGERING_WOUND_TICK_DAMAGE,
  MEDITATION_GAUGE_AMOUNT,
  MINOR_STRIKE_DAMAGE,
  OVERLOAD_STRIKE_DAMAGE,
  OVERLOAD_STRIKE_GAUGE_THRESHOLD,
  OVERLOAD_STRIKE_MULTIPLIER,
  QUICK_STRIKE_DAMAGE,
  RECKLESS_RECOVERY_GAUGE_AMOUNT,
  RECKLESS_RECOVERY_LIFE_AMOUNT,
  RESTFUL_RECOVERY_AMOUNT,
  SLOW_RECOVERY_DURATION,
  SLOW_RECOVERY_TICK_AMOUNT,
  STARTING_LIFE,
  STEADY_STRIKE_DAMAGE,
  STEADY_STRIKE_GAUGE_DECREASE,
} from "./gameConfig.js";
import type { AttackSelection, DefenseSelection, LingeringWound, TurnResult } from "./types.js";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * 攻撃カードの基準となる数値（このカードを象徴する1つの数字）。
 * ダメージカードならダメージ量、回復カードなら回復量、ゲージ系カードならゲージ増減量、
 * 継続効果カードなら1ターンあたりの量。妄想はその場の申告値。
 * 防御側に見せる数値、および各カードの効果計算の基準値として使う。
 */
export function getAttackMagnitude(attack: AttackSelection, attackerGauge: number): number {
  if (attack.cardType === "delusion") return attack.delusionDamage!;

  switch (attack.realityCardId) {
    case "steady_strike":
      return STEADY_STRIKE_DAMAGE;
    case "overload_strike":
      return attackerGauge >= OVERLOAD_STRIKE_GAUGE_THRESHOLD
        ? OVERLOAD_STRIKE_DAMAGE * OVERLOAD_STRIKE_MULTIPLIER
        : OVERLOAD_STRIKE_DAMAGE;
    case "lingering_wound":
      return LINGERING_WOUND_INITIAL_DAMAGE;
    case "gauge_drain":
      return attackerGauge;
    case "heavy_strike":
      return HEAVY_STRIKE_DAMAGE;
    case "quick_strike":
      return QUICK_STRIKE_DAMAGE;
    case "minor_strike":
      return MINOR_STRIKE_DAMAGE;
    case "restful_recovery":
      return RESTFUL_RECOVERY_AMOUNT;
    case "meditation":
      return MEDITATION_GAUGE_AMOUNT;
    case "reckless_recovery":
      return RECKLESS_RECOVERY_LIFE_AMOUNT;
    case "slow_recovery":
      return SLOW_RECOVERY_TICK_AMOUNT;
    default:
      throw new Error(`invalid reality card: ${attack.realityCardId}`);
  }
}

/** 単発の相手攻撃カード（見破られなければ相手にダメージ、見破られれば自分に反動）かどうか */
const PLAIN_DAMAGE_CARDS = new Set([
  "steady_strike",
  "overload_strike",
  "gauge_drain",
  "heavy_strike",
  "quick_strike",
  "minor_strike",
]);

/**
 * 既存の継続効果（疼く傷跡・緩やかな回復）を1ターン分消化する。
 * 今ターン新たに付与された分はここでは消化しない（付与の翌ターンから効果が始まる）。
 * damageは正がダメージ、負が回復。
 */
function tickLingeringWounds(lingeringWounds: Record<string, LingeringWound[]>): {
  dotDamage: Record<string, number>;
  remaining: Record<string, LingeringWound[]>;
} {
  const dotDamage: Record<string, number> = {};
  const remaining: Record<string, LingeringWound[]> = {};

  for (const [playerId, wounds] of Object.entries(lingeringWounds)) {
    let tick = 0;
    const next: LingeringWound[] = [];
    for (const wound of wounds) {
      tick += wound.damage;
      if (wound.turnsRemaining - 1 > 0) {
        next.push({ damage: wound.damage, turnsRemaining: wound.turnsRemaining - 1 });
      }
    }
    dotDamage[playerId] = tick;
    remaining[playerId] = next;
  }

  return { dotDamage, remaining };
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
  lingeringWounds: Record<string, LingeringWound[]>;
  rng?: () => number;
}): TurnResult {
  const {
    turnNumber,
    attackerId,
    defenderId,
    attack,
    defense,
    lifeTotals,
    delusionGauges,
    lingeringWounds,
  } = params;
  const rng = params.rng ?? Math.random;

  const currentGauge = delusionGauges[attackerId] ?? 0;
  const wasCaught = defense.prediction === attack.cardType;
  const magnitude = getAttackMagnitude(attack, currentGauge);
  const realityCardId = attack.cardType === "reality" ? attack.realityCardId : undefined;

  let damageDealt = 0;
  let selfDamage = 0;
  let selfHeal = 0;
  let gaugeDelta = 0;
  let instantDefeat = false;
  /** 新たに継続効果を受けるプレイヤーと、その量（正はダメージ、負は回復）・継続ターン数 */
  let newWound: { target: string; amount: number; duration: number } | null = null;

  if (wasCaught) {
    if (attack.cardType === "delusion") {
      selfDamage = magnitude;
      gaugeDelta = magnitude;
      if (rng() < currentGauge / 100) {
        instantDefeat = true;
      }
    } else if (realityCardId === "lingering_wound") {
      selfDamage = magnitude;
      newWound = { target: attackerId, amount: LINGERING_WOUND_TICK_DAMAGE, duration: LINGERING_WOUND_DURATION };
    } else if (realityCardId === "meditation") {
      gaugeDelta = MEDITATION_GAUGE_AMOUNT; // 成功時と逆に上がる
    } else if (realityCardId === "restful_recovery") {
      selfDamage = magnitude; // 回復が自傷に反転する
    } else if (realityCardId === "reckless_recovery") {
      selfDamage = magnitude; // 回復が自傷に反転する
      gaugeDelta = RECKLESS_RECOVERY_GAUGE_AMOUNT; // ゲージ上昇は見破られたかに関わらず常に発生
    } else if (realityCardId === "slow_recovery") {
      // 継続回復が継続ダメージに反転する
      newWound = { target: attackerId, amount: SLOW_RECOVERY_TICK_AMOUNT, duration: SLOW_RECOVERY_DURATION };
    } else if (realityCardId && PLAIN_DAMAGE_CARDS.has(realityCardId)) {
      // steady_strikeを含む単純な攻撃カード：見破られた場合はゲージ変動なし（成功時のみ下がる）
      selfDamage = magnitude;
    }
  } else {
    if (realityCardId === "steady_strike") {
      damageDealt = magnitude;
      gaugeDelta = -STEADY_STRIKE_GAUGE_DECREASE;
    } else if (realityCardId === "lingering_wound") {
      damageDealt = magnitude;
      newWound = { target: defenderId, amount: LINGERING_WOUND_TICK_DAMAGE, duration: LINGERING_WOUND_DURATION };
    } else if (realityCardId === "meditation") {
      gaugeDelta = -MEDITATION_GAUGE_AMOUNT;
    } else if (realityCardId === "restful_recovery") {
      selfHeal = magnitude;
    } else if (realityCardId === "reckless_recovery") {
      selfHeal = magnitude;
      gaugeDelta = RECKLESS_RECOVERY_GAUGE_AMOUNT; // 成功してもゲージは上がる（デバフ前提の効果）
    } else if (realityCardId === "slow_recovery") {
      newWound = { target: attackerId, amount: -SLOW_RECOVERY_TICK_AMOUNT, duration: SLOW_RECOVERY_DURATION };
    } else {
      // 通常の攻撃カード（現実の残り全種）・妄想カードはそのまま相手に通る
      damageDealt = magnitude;
    }
  }

  // 既存の継続効果（前ターンまでに付与された分）を消化する
  const { dotDamage, remaining: tickedWounds } = tickLingeringWounds(lingeringWounds);
  if (newWound) {
    tickedWounds[newWound.target] = [
      ...(tickedWounds[newWound.target] ?? []),
      { damage: newWound.amount, turnsRemaining: newWound.duration },
    ];
  }

  const nextLifeTotals = { ...lifeTotals };
  nextLifeTotals[attackerId] = clampLife(
    (nextLifeTotals[attackerId] ?? 0) - selfDamage + selfHeal - (dotDamage[attackerId] ?? 0),
  );
  nextLifeTotals[defenderId] = clampLife(
    (nextLifeTotals[defenderId] ?? 0) - damageDealt - (dotDamage[defenderId] ?? 0),
  );

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
    selfHeal,
    gaugeDelta,
    instantDefeat,
    dotDamage,
    lifeTotals: nextLifeTotals,
    delusionGauges: nextGauges,
    lingeringWounds: tickedWounds,
  };
}

function clampLife(value: number): number {
  return Math.min(STARTING_LIFE, Math.max(0, value));
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
