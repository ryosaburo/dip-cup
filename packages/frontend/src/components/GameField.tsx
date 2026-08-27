"use client";

import { useEffect, useState } from "react";
import {
  REALITY_CARD_CONFIG,
  type AttackSelection,
  type CardType,
  type DefenseSelection,
  type RealityCardId,
  type TurnResult,
} from "@battle/shared";
import type { GamePhase } from "@/context/GameSocketProvider";
import { OpponentPanel } from "./OpponentPanel";
import { PlayerChoicePanel } from "./PlayerChoicePanel";

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };

function cardLabel(attack: TurnResult["attack"]): string {
  if (attack.cardType === "reality" && attack.realityCardId) {
    return REALITY_CARD_CONFIG[attack.realityCardId].label;
  }
  return CARD_TYPE_LABEL[attack.cardType];
}

/** そのターンの数値効果（ダメージ・回復・ゲージ増減）を箇条書き文字列にまとめる */
function describeAttackEffect(result: TurnResult): string {
  const parts: string[] = [];
  if (result.wasCaught) {
    if (result.selfDamage > 0) parts.push(`自分に${result.selfDamage}の反動ダメージ`);
  } else {
    if (result.damageDealt > 0) parts.push(`相手に${result.damageDealt}ダメージ`);
  }
  if (result.selfHeal > 0) parts.push(`自分のライフが${result.selfHeal}回復`);
  if (result.gaugeDelta > 0) parts.push(`妄想ゲージ+${result.gaugeDelta}%`);
  if (result.gaugeDelta < 0) parts.push(`妄想ゲージ${result.gaugeDelta}%`);
  if (result.wasCaught && result.instantDefeat) parts.push("現実に引き戻された！");
  return parts.join("・");
}

function describeForViewer(result: TurnResult, viewerWasAttacker: boolean): string {
  const label = cardLabel(result.attack);
  const effect = describeAttackEffect(result);
  const suffix = effect ? `：${effect}` : "";
  if (viewerWasAttacker) {
    return result.wasCaught
      ? `😱 自分の「${label}」を見破られた${suffix}`
      : `🎉 自分の「${label}」は見破られなかった${suffix}`;
  }
  return result.wasCaught
    ? `🎯 相手の「${label}」を見破った${suffix}`
    : `😱 相手の「${label}」を見破れなかった${suffix}`;
}

/** 継続ダメージ／継続回復（符号付きdotDamage）を1行で表示する。0の場合は何も出さない */
function DotLine({ amount, target }: { amount: number; target: "self" | "opponent" }) {
  if (amount === 0) return null;
  const who = target === "self" ? "自分" : "相手";
  if (amount > 0) {
    return (
      <p className="text-red-300 text-[0.65rem] mt-0.5">
        🩸継続ダメージで{who}に{amount}
      </p>
    );
  }
  return (
    <p className="text-emerald-300 text-[0.65rem] mt-0.5">
      💚継続回復で{who}に{-amount}回復
    </p>
  );
}

export function GameField({
  playerId,
  playerName,
  opponentName,
  lifeTotals,
  delusionGauges,
  turnNumber,
  phase,
  dealtRealityCards,
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
  /** 自分が攻撃側の時に選べる、ランダムに配られた現実カード */
  dealtRealityCards: RealityCardId[];
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
                  <DotLine amount={lastTurnResult!.dotDamage[playerId] ?? 0} target="self" />
                  {opponentId && (
                    <DotLine amount={lastTurnResult!.dotDamage[opponentId] ?? 0} target="opponent" />
                  )}
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
              dealtRealityCards={dealtRealityCards}
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
