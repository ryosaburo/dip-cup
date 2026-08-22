import {
  CARD_CONFIG,
  NO_SUPPORT_BONUS_SCORE,
  SUPPORT_BOOST_AMOUNT,
  SUPPORT_MITIGATE_AMOUNT,
  SUPPORT_SABOTAGE_AMOUNT,
} from "./gameConfig.js";
import type {
  CardTier,
  PlayerSelection,
  RoundOutcome,
  RoundResult,
} from "./types.js";

/** カードidは "{tier}-{連番}" 形式（例: "small-2"）で発行される前提 */
export function tierOfCardId(id: string): CardTier {
  const tier = id.split("-")[0];
  if (tier !== "small" && tier !== "medium" && tier !== "large") {
    throw new Error(`invalid card id: ${id}`);
  }
  return tier;
}

function sumOverlearnChance(tiers: CardTier[]): number {
  return tiers.reduce((sum, tier) => sum + CARD_CONFIG[tier].overlearnChance, 0);
}

function sumScore(tiers: CardTier[]): number {
  return tiers.reduce((sum, tier) => sum + CARD_CONFIG[tier].score, 0);
}

function resolvePlayerOutcome(
  playerId: string,
  selection: PlayerSelection,
  opponentSelection: PlayerSelection,
  rng: () => number,
): RoundOutcome {
  const tiers = selection.promptCardIds.map(tierOfCardId);

  let overlearnChance = sumOverlearnChance(tiers);
  if (selection.supportCard === "mitigate") {
    overlearnChance -= SUPPORT_MITIGATE_AMOUNT;
  }
  if (opponentSelection.supportCard === "sabotage") {
    overlearnChance += SUPPORT_SABOTAGE_AMOUNT;
  }
  overlearnChance = Math.min(100, Math.max(0, overlearnChance));

  const roll = rng() * 100;
  const busted = roll < overlearnChance;

  let score = sumScore(tiers);
  const usedSupportBonus = selection.supportCard === undefined;
  if (selection.supportCard === "boost") {
    score += SUPPORT_BOOST_AMOUNT;
  }
  if (usedSupportBonus) {
    score += NO_SUPPORT_BONUS_SCORE;
  }

  return {
    playerId,
    selection,
    overlearnChance,
    roll,
    busted,
    score,
    usedSupportBonus,
  };
}

/**
 * 1ラウンドをサーバー権威で判定する純粋関数。
 * rngは0以上1未満の乱数を返す関数（テスト時に固定値を注入できるようにするため）。
 * 両者暴走、または非暴走同士の同点は「勝者なし＝そのラウンド再戦」として扱う
 * （hackathon_idea.mdに明記がないため妥当な仮定として採用）。
 */
export function resolveRound(params: {
  roundNumber: number;
  playerA: { playerId: string; selection: PlayerSelection };
  playerB: { playerId: string; selection: PlayerSelection };
  matchWins: Record<string, number>;
  rng?: () => number;
}): RoundResult {
  const { roundNumber, playerA, playerB, matchWins } = params;
  const rng = params.rng ?? Math.random;

  const outcomeA = resolvePlayerOutcome(
    playerA.playerId,
    playerA.selection,
    playerB.selection,
    rng,
  );
  const outcomeB = resolvePlayerOutcome(
    playerB.playerId,
    playerB.selection,
    playerA.selection,
    rng,
  );

  let winnerId: string | null;
  if (outcomeA.busted && outcomeB.busted) {
    winnerId = null;
  } else if (outcomeA.busted) {
    winnerId = playerB.playerId;
  } else if (outcomeB.busted) {
    winnerId = playerA.playerId;
  } else if (outcomeA.score > outcomeB.score) {
    winnerId = playerA.playerId;
  } else if (outcomeB.score > outcomeA.score) {
    winnerId = playerB.playerId;
  } else {
    winnerId = null;
  }

  const nextMatchWins = { ...matchWins };
  if (winnerId) {
    nextMatchWins[winnerId] = (nextMatchWins[winnerId] ?? 0) + 1;
  }

  return {
    roundNumber,
    outcomes: {
      [playerA.playerId]: outcomeA,
      [playerB.playerId]: outcomeB,
    },
    winnerId,
    isReplay: winnerId === null,
    matchWins: nextMatchWins,
  };
}

export function getMatchWinner(
  matchWins: Record<string, number>,
  winsNeeded: number,
): string | null {
  for (const [playerId, wins] of Object.entries(matchWins)) {
    if (wins >= winsNeeded) return playerId;
  }
  return null;
}
