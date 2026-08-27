"use client";

import { useEffect, useState } from "react";
import type {
  AttackSelection,
  CardType,
  DefenseSelection,
  TurnResult,
} from "@battle/shared";
import type { GamePhase } from "@/context/GameSocketProvider";
import { OpponentPanel } from "./OpponentPanel";
import { PlayerChoicePanel } from "./PlayerChoicePanel";

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };

function describeForViewer(result: TurnResult, viewerWasAttacker: boolean): string {
  const label = CARD_TYPE_LABEL[result.attack.cardType];
  if (viewerWasAttacker) {
    if (result.wasCaught) {
      return `😱 自分の「${label}」を見破られた！${result.selfDamage}の反動ダメージ${
        result.instantDefeat ? "…現実に引き戻された！" : ""
      }`;
    }
    return `🎉 自分の「${label}」は見破られなかった！相手に${result.damageDealt}ダメージ！`;
  }
  if (result.wasCaught) {
    return `🎯 相手の「${label}」を見破った！${result.selfDamage}の反動ダメージ${
      result.instantDefeat ? "…相手は現実に引き戻された！" : ""
    }`;
  }
  return `😱 相手の「${label}」を見破れなかった…${result.damageDealt}ダメージを受けた`;
}

export function GameField({
  playerId,
  playerName,
  opponentName,
  lifeTotals,
  delusionGauges,
  turnNumber,
  phase,
  pendingDamage,
  onSubmitAttack,
  onSubmitDefense,
  lastTurnResult,
  nextTurnReady,
  onNextTurn,
}: {
  playerId: string;
  playerName: string | null;
  opponentName: string | null;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
  turnNumber: number;
  phase: Exclude<GamePhase, "idle" | "waiting_for_opponent" | "gameover" | "opponent_left">;
  pendingDamage: number | null;
  onSubmitAttack: (attack: AttackSelection) => void;
  onSubmitDefense: (defense: DefenseSelection) => void;
  lastTurnResult: TurnResult | null;
  nextTurnReady: boolean;
  onNextTurn: () => void;
}) {
  const opponentId = Object.keys(lifeTotals).find((id) => id !== playerId) ?? null;
  const yourLife = lifeTotals[playerId] ?? 0;
  const opponentLife = opponentId ? (lifeTotals[opponentId] ?? 0) : 0;
  const yourGauge = delusionGauges[playerId] ?? 0;
  const opponentGauge = opponentId ? (delusionGauges[opponentId] ?? 0) : 0;

  const isResult = phase === "turn_result" && lastTurnResult !== null;
  const iWasAttacker = isResult ? lastTurnResult!.attackerId === playerId : null;

  // 現在進行中のターンでの役割（結果表示中は直前ターンの役割をそのまま使う）
  const iAmAttackerNow =
    phase === "my_attack" || phase === "waiting_defense"
      ? true
      : phase === "waiting_attack" || phase === "my_defense" || phase === "waiting_for_result"
        ? false
        : iWasAttacker;

  return (
    <div className="felt-table rounded-2xl border border-white/10 shadow-xl p-4 space-y-3">
      <div className="text-center text-white/70 text-xs">ターン {turnNumber}</div>

      <RevealSequencer active={isResult} roundKey={lastTurnResult?.turnNumber ?? turnNumber}>
        {(revealed) => (
          <>
            <OpponentPanel
              name={opponentName}
              life={opponentLife}
              gauge={opponentGauge}
              isAttackerNow={iAmAttackerNow === null ? null : !iAmAttackerNow}
              pendingDamage={iAmAttackerNow === false ? pendingDamage : null}
              outcome={isResult ? lastTurnResult : null}
              wasAttackerInOutcome={iWasAttacker === null ? false : !iWasAttacker}
              revealed={revealed}
            />

            <div className="flex items-center justify-center py-1 min-h-[2.5rem]">
              {(phase === "my_attack" || phase === "waiting_attack") && (
                <span className="text-white/30 text-[0.65rem] tracking-[0.4em] font-bold">VS</span>
              )}
              {isResult && (
                <div className="banner-pop text-center">
                  <p className="text-white font-bold text-xs">
                    {describeForViewer(lastTurnResult!, iWasAttacker!)}
                  </p>
                  <button
                    disabled={!nextTurnReady}
                    onClick={onNextTurn}
                    className="mt-2 rounded-md bg-white text-black px-4 py-1.5 text-xs font-semibold disabled:opacity-40 transition-transform active:scale-95"
                  >
                    {nextTurnReady ? "次のターンへ" : "サーバー処理中…"}
                  </button>
                </div>
              )}
            </div>

            <PlayerChoicePanel
              key={turnNumber}
              name={playerName}
              life={yourLife}
              gauge={yourGauge}
              phase={phase}
              pendingDamage={pendingDamage}
              onSubmitAttack={onSubmitAttack}
              onSubmitDefense={onSubmitDefense}
              outcome={isResult ? lastTurnResult : null}
              wasAttackerInOutcome={iWasAttacker ?? false}
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
