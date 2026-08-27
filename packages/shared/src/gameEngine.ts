import {
  CARD_CONFIG,
  NO_SUPPORT_BONUS_SCORE,
  SUPPORT_BOOST_AMOUNT,
  SUPPORT_CURSE_AMOUNT,
  SUPPORT_CURSE_TRIGGER_CHANCE,
  SUPPORT_LIMIT_MAX_CARDS,
  SUPPORT_MITIGATE_AMOUNT,
  SUPPORT_SABOTAGE_AMOUNT,
} from "./gameConfig.js";
import type {
  CardTier,
  PlayerSelection,
  PublicRoundOutcome,
  PublicRoundResult,
  RoundOutcome,
  RoundResult,
  SupportCardType,
} from "./types.js";

/** カードidは "{tier}-{連番}" 形式（例: "small-2"）で発行される前提 */
export function tierOfCardId(id: string): CardTier {
  const tier = id.split("-")[0];
  if (tier !== "small" && tier !== "medium" && tier !== "large") {
    throw new Error(`invalid card id: ${id}`);
  }
  return tier;
}

function sumOverlearnChance(ids: string[]): number {
  return ids.reduce((sum, id) => sum + CARD_CONFIG[tierOfCardId(id)].overlearnChance, 0);
}

function sumScore(ids: string[]): number {
  return ids.reduce((sum, id) => sum + CARD_CONFIG[tierOfCardId(id)].score, 0);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * 相手のサポートカード（制限・破壊）が自分のカードリストに及ぼす効果を解決する。
 * 1人1ラウンド1枚までなので、相手からの効果は制限か破壊のどちらか一方にしかならない。
 */
function applyOpponentCardEffect(
  cardIds: string[],
  opponentSupportCard: SupportCardType | undefined,
  rng: () => number,
): { effectiveIds: string[]; voidedIds: string[] } {
  if (opponentSupportCard === "limit" && cardIds.length > SUPPORT_LIMIT_MAX_CARDS) {
    return {
      effectiveIds: cardIds.slice(0, SUPPORT_LIMIT_MAX_CARDS),
      voidedIds: cardIds.slice(SUPPORT_LIMIT_MAX_CARDS),
    };
  }
  if (opponentSupportCard === "removeCard" && cardIds.length > 0) {
    const index = Math.floor(rng() * cardIds.length);
    return {
      effectiveIds: cardIds.filter((_, i) => i !== index),
      voidedIds: [cardIds[index]],
    };
  }
  return { effectiveIds: cardIds, voidedIds: [] };
}

/**
 * 1ラウンドをサーバー権威で判定する純粋関数。
 * rngは0以上1未満の乱数を返す関数（テスト時に固定値を注入できるようにするため）。
 * 両者暴走、または非暴走同士の同点は「勝者なし＝そのラウンド再戦」として扱う
 * （hackathon_idea.mdに明記がないため妥当な仮定として採用）。
 *
 * rngの消費順序（新しいサポートカードを追加する際は崩さないこと。既存テストはこの順序に依存する）：
 *   1. 相手からの「破壊」判定（A→Bの順、対象にランダム性がある場合のみ消費）
 *   2. 過学習の判定ロール（A→Bの順）
 *   3. 「道連れ」の発動判定（A→Bの順、条件を満たす場合のみ消費）
 *   4. 「強化」の対象カード抽選（A→Bの順、対象がある場合のみ消費）
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

  const supportA = playerA.selection.supportCard;
  const supportB = playerB.selection.supportCard;

  const { effectiveIds: idsA, voidedIds: voidedA } = applyOpponentCardEffect(
    playerA.selection.promptCardIds,
    supportB,
    rng,
  );
  const { effectiveIds: idsB, voidedIds: voidedB } = applyOpponentCardEffect(
    playerB.selection.promptCardIds,
    supportA,
    rng,
  );

  let overlearnA = clampPercent(
    sumOverlearnChance(idsA) -
      (supportA === "mitigate" ? SUPPORT_MITIGATE_AMOUNT : 0) +
      (supportB === "sabotage" ? SUPPORT_SABOTAGE_AMOUNT : 0),
  );
  let overlearnB = clampPercent(
    sumOverlearnChance(idsB) -
      (supportB === "mitigate" ? SUPPORT_MITIGATE_AMOUNT : 0) +
      (supportA === "sabotage" ? SUPPORT_SABOTAGE_AMOUNT : 0),
  );

  const rollA = rng() * 100;
  const rollB = rng() * 100;
  const preBustedA = rollA < overlearnA;
  const preBustedB = rollB < overlearnB;

  // 道連れ：自分が暴走した場合のみ、確率で相手の過学習確率も上げる
  if (supportA === "curse" && preBustedA && rng() * 100 < SUPPORT_CURSE_TRIGGER_CHANCE) {
    overlearnB = clampPercent(overlearnB + SUPPORT_CURSE_AMOUNT);
  }
  if (supportB === "curse" && preBustedB && rng() * 100 < SUPPORT_CURSE_TRIGGER_CHANCE) {
    overlearnA = clampPercent(overlearnA + SUPPORT_CURSE_AMOUNT);
  }
  const bustedA = rollA < overlearnA;
  const bustedB = rollB < overlearnB;

  let scoreA = sumScore(idsA);
  if (supportA === "boost") scoreA += SUPPORT_BOOST_AMOUNT;
  if (supportA === "randomBoost" && idsA.length > 0) {
    scoreA += CARD_CONFIG[tierOfCardId(idsA[Math.floor(rng() * idsA.length)])].score;
  }
  const usedSupportBonusA = supportA === undefined;
  if (usedSupportBonusA) scoreA += NO_SUPPORT_BONUS_SCORE;

  let scoreB = sumScore(idsB);
  if (supportB === "boost") scoreB += SUPPORT_BOOST_AMOUNT;
  if (supportB === "randomBoost" && idsB.length > 0) {
    scoreB += CARD_CONFIG[tierOfCardId(idsB[Math.floor(rng() * idsB.length)])].score;
  }
  const usedSupportBonusB = supportB === undefined;
  if (usedSupportBonusB) scoreB += NO_SUPPORT_BONUS_SCORE;

  const outcomeA: RoundOutcome = {
    playerId: playerA.playerId,
    selection: playerA.selection,
    voidedCardIds: voidedA,
    overlearnChance: overlearnA,
    roll: rollA,
    busted: bustedA,
    score: scoreA,
    usedSupportBonus: usedSupportBonusA,
  };
  const outcomeB: RoundOutcome = {
    playerId: playerB.playerId,
    selection: playerB.selection,
    voidedCardIds: voidedB,
    overlearnChance: overlearnB,
    roll: rollB,
    busted: bustedB,
    score: scoreB,
    usedSupportBonus: usedSupportBonusB,
  };

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

/** RoundResultをクライアント配信用に変換する。「偵察」を使っていなければ相手のサポートカードの中身を隠す。 */
export function toPublicRoundResult(
  result: RoundResult,
  viewerPlayerId: string,
): PublicRoundResult {
  const viewerOutcome = result.outcomes[viewerPlayerId];
  const viewerPeeked = viewerOutcome?.selection.supportCard === "peek";

  const outcomes: Record<string, PublicRoundOutcome> = {};
  for (const [playerId, outcome] of Object.entries(result.outcomes)) {
    const isViewer = playerId === viewerPlayerId;
    const reveal = isViewer || viewerPeeked;
    outcomes[playerId] = {
      ...outcome,
      selection: {
        promptCardIds: outcome.selection.promptCardIds,
        supportCardUsed: outcome.selection.supportCard !== undefined,
        supportCard: reveal ? outcome.selection.supportCard : undefined,
      },
    };
  }

  return { ...result, outcomes };
}
