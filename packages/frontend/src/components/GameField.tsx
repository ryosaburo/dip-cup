"use client";

import { useEffect, useState } from "react";
import type { HandPublicState, PlayerSelection, RoundResult } from "@battle/shared";
import { OpponentPanel } from "./OpponentPanel";
import { PlayerHandPanel } from "./PlayerHandPanel";

export function GameField({
  playerId,
  playerName,
  opponentName,
  matchWins,
  roundNumber,
  winsNeeded,
  phase,
  hand,
  onSubmit,
  lastRoundResult,
  nextRoundReady,
  onNextRound,
}: {
  playerId: string;
  playerName: string | null;
  opponentName: string | null;
  matchWins: Record<string, number>;
  roundNumber: number;
  winsNeeded: number;
  phase: "selecting" | "waiting_for_result" | "round_result";
  hand: HandPublicState;
  onSubmit: (selection: PlayerSelection) => void;
  lastRoundResult: RoundResult | null;
  nextRoundReady: boolean;
  onNextRound: () => void;
}) {
  const isResult = phase === "round_result" && lastRoundResult !== null;
  const opponentId = isResult
    ? Object.keys(lastRoundResult!.outcomes).find((id) => id !== playerId) ?? null
    : null;
  const opponentOutcome = isResult && opponentId ? lastRoundResult!.outcomes[opponentId] : null;
  const yourOutcome = isResult ? lastRoundResult!.outcomes[playerId] : null;

  const you = matchWins[playerId] ?? 0;
  const opp = Object.entries(matchWins).find(([id]) => id !== playerId)?.[1] ?? 0;

  return (
    <div className="felt-table rounded-2xl border border-white/10 shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-center gap-3 text-white/70 text-xs">
        <span>
          ラウンド {roundNumber}（{winsNeeded}本先取）
        </span>
        <span className="font-bold text-white">
          {you} - {opp}
        </span>
      </div>

      <RevealSequencer active={isResult} roundKey={lastRoundResult?.roundNumber ?? roundNumber}>
        {(revealed) => (
          <>
            <OpponentPanel
              name={opponentName}
              matchWins={opp}
              isThinking={phase === "waiting_for_result"}
              outcome={opponentOutcome}
              revealed={revealed}
            />

            <div className="flex items-center justify-center py-1 min-h-[2.5rem]">
              {phase === "selecting" && (
                <span className="text-white/30 text-[0.65rem] tracking-[0.4em] font-bold">VS</span>
              )}
              {isResult && (
                <div className="banner-pop text-center">
                  {lastRoundResult!.isReplay ? (
                    <p className="text-white font-bold text-sm">引き分け・このラウンドは再戦です</p>
                  ) : (
                    <p className="text-white font-bold text-sm">
                      {lastRoundResult!.winnerId === playerId
                        ? "🎉 このラウンドはあなたの勝ち！"
                        : "😢 このラウンドは相手の勝ち"}
                    </p>
                  )}
                  <button
                    disabled={!nextRoundReady}
                    onClick={onNextRound}
                    className="mt-2 rounded-md bg-white text-black px-4 py-1.5 text-xs font-semibold disabled:opacity-40 transition-transform active:scale-95"
                  >
                    {nextRoundReady ? "次のラウンドへ" : "サーバー処理中…"}
                  </button>
                </div>
              )}
            </div>

            <PlayerHandPanel
              name={playerName}
              matchWins={you}
              hand={hand}
              disabled={phase === "waiting_for_result"}
              onSubmit={onSubmit}
              outcome={yourOutcome}
              revealed={revealed}
            />
          </>
        )}
      </RevealSequencer>
    </div>
  );
}

/** Owns the "revealed" flag for one round's reveal animation; remounts (via roundKey) so it always starts hidden. */
function RevealSequencer({
  active,
  roundKey,
  children,
}: {
  active: boolean;
  roundKey: number;
  children: (revealed: boolean) => React.ReactNode;
}) {
  return (
    <RevealSequencerInner key={`${roundKey}-${active}`} active={active}>
      {children}
    </RevealSequencerInner>
  );
}

function RevealSequencerInner({
  active,
  children,
}: {
  active: boolean;
  children: (revealed: boolean) => React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, [active]);

  return <>{children(revealed)}</>;
}
