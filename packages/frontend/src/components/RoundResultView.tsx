"use client";

import {
  SUPPORT_CARD_CONFIG,
  tierOfCardId,
  type CardTier,
  type RoundOutcome,
  type RoundResult,
} from "@battle/shared";

const TIER_LABEL: Record<CardTier, string> = { small: "小", medium: "中", large: "大" };

function summarizeCards(outcome: RoundOutcome): string {
  if (outcome.selection.promptCardIds.length === 0) return "カードなし";
  const counts: Record<string, number> = {};
  for (const id of outcome.selection.promptCardIds) {
    const tier = tierOfCardId(id);
    counts[tier] = (counts[tier] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([tier, n]) => `${TIER_LABEL[tier as CardTier]}×${n}`)
    .join(" ");
}

function PlayerOutcomeCard({
  name,
  outcome,
  isYou,
  isWinner,
}: {
  name: string;
  outcome: RoundOutcome;
  isYou: boolean;
  isWinner: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 space-y-2 ${
        isWinner ? "border-green-500 bg-green-50" : ""
      }`}
    >
      <div className="font-semibold flex justify-between">
        <span>
          {name} {isYou && "(あなた)"}
        </span>
        {isWinner && <span className="text-green-600 text-sm">WIN</span>}
      </div>
      <div className="text-sm text-neutral-600">{summarizeCards(outcome)}</div>
      {outcome.selection.supportCard && (
        <div className="text-sm text-neutral-600">
          サポート: {SUPPORT_CARD_CONFIG[outcome.selection.supportCard].label}
        </div>
      )}
      <div className="text-sm">
        過学習確率 {outcome.overlearnChance}% / 抽選値 {outcome.roll.toFixed(1)}
      </div>
      {outcome.busted ? (
        <div className="text-red-600 font-bold">暴走！</div>
      ) : (
        <div className="font-bold">スコア {outcome.score}</div>
      )}
    </div>
  );
}

export function RoundResultView({
  result,
  playerId,
  playerName,
  opponentName,
}: {
  result: RoundResult;
  playerId: string;
  playerName: string;
  opponentName: string;
}) {
  const opponentId = Object.keys(result.outcomes).find((id) => id !== playerId)!;
  const you = result.outcomes[playerId];
  const opponent = result.outcomes[opponentId];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-center">
        {result.isReplay ? "このラウンドは引き分け・再戦です" : "ラウンド結果"}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <PlayerOutcomeCard
          name={playerName}
          outcome={you}
          isYou
          isWinner={result.winnerId === playerId}
        />
        <PlayerOutcomeCard
          name={opponentName}
          outcome={opponent}
          isYou={false}
          isWinner={result.winnerId === opponentId}
        />
      </div>
    </div>
  );
}
