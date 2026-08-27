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

/**
 * そのターンの数値効果（ダメージ・回復・ゲージ増減）を、見ている側の視点に合わせて
 * プレイヤー名を主語に箇条書き文字列にまとめる。
 * damageDealt・defenderHealは防御側が対象、selfDamage・selfHeal・gaugeDeltaは攻撃側が対象。
 */
function describeAttackEffect(
  result: TurnResult,
  viewerWasAttacker: boolean,
  viewerName: string,
  opponentName: string,
): string {
  const attackerSideLabel = viewerWasAttacker ? viewerName : opponentName;
  const defenderSideLabel = viewerWasAttacker ? opponentName : viewerName;
  const parts: string[] = [];
  if (result.wasCaught) {
    if (result.selfDamage > 0) parts.push(`${attackerSideLabel}に${result.selfDamage}の反動ダメージ`);
    if (result.defenderHeal > 0) parts.push(`${defenderSideLabel}が${result.defenderHeal}回復`);
  } else {
    if (result.damageDealt > 0) parts.push(`${defenderSideLabel}に${result.damageDealt}ダメージ`);
  }
  if (result.selfHeal > 0) parts.push(`${attackerSideLabel}のライフが${result.selfHeal}回復`);
  if (result.gaugeDelta > 0) parts.push(`${attackerSideLabel}の妄想ゲージ+${result.gaugeDelta}%`);
  if (result.gaugeDelta < 0) parts.push(`${attackerSideLabel}の妄想ゲージ${result.gaugeDelta}%`);
  if (result.wasCaught && result.instantDefeat) parts.push("現実に引き戻された！");
  return parts.join("・");
}

function describeForViewer(
  result: TurnResult,
  viewerWasAttacker: boolean,
  viewerName: string,
  opponentName: string,
): string {
  const label = cardLabel(result.attack);
  const effect = describeAttackEffect(result, viewerWasAttacker, viewerName, opponentName);
  const suffix = effect ? `：${effect}` : "";
  if (viewerWasAttacker) {
    return result.wasCaught
      ? `😱 ${viewerName}の「${label}」を見破られた${suffix}`
      : `🎉 ${viewerName}の「${label}」は見破られなかった${suffix}`;
  }
  return result.wasCaught
    ? `🎯 ${opponentName}の「${label}」を見破った${suffix}`
    : `😱 ${opponentName}の「${label}」を見破れなかった${suffix}`;
}

const CARD_TYPE_IMAGE: Record<CardType, string> = {
  reality: "/genjitu.png",
  delusion: "/mousou.png",
};

const DELUSION_SPARKLES = [
  { emoji: "✨", style: { top: "-8%", left: "2%" }, delay: "0s" },
  { emoji: "🌸", style: { top: "2%", right: "-4%" }, delay: "0.3s" },
  { emoji: "💫", style: { bottom: "-6%", left: "10%" }, delay: "0.6s" },
  { emoji: "✨", style: { bottom: "4%", right: "6%" }, delay: "0.9s" },
];

/**
 * 見破り結果（現実／妄想）を画面中央に大きく表示する。中央から徐々に拡大しながら出現し、
 * 妄想はメルヘンチックに華やかへ、現実はどんより重く沈むように演出を分ける。
 * 画面の任意の場所をタップすると閉じられる（「次のターンへ」ボタンと重なるための対策）。
 */
function CardTypeRevealImage({ cardType, active }: { cardType: CardType; active: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!active || dismissed) return null;

  const isDelusion = cardType === "delusion";

  return (
    <button
      type="button"
      onClick={() => setDismissed(true)}
      aria-label="タップして閉じる"
      className="absolute inset-0 z-30 flex cursor-pointer items-center justify-center"
    >
      <span className="relative flex items-center justify-center">
        <span className={isDelusion ? "reveal-delusion-aura" : "reveal-reality-aura"} />
        {isDelusion &&
          DELUSION_SPARKLES.map((sparkle, i) => (
            <span
              key={i}
              className="reveal-sparkle absolute text-xl"
              style={{ ...sparkle.style, animationDelay: sparkle.delay }}
            >
              {sparkle.emoji}
            </span>
          ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CARD_TYPE_IMAGE[cardType]}
          alt={CARD_TYPE_LABEL[cardType]}
          className={`relative w-32 sm:w-40 ${
            isDelusion ? "reveal-image-delusion" : "reveal-image-reality"
          }`}
        />
      </span>
    </button>
  );
}

/** 継続ダメージ／継続回復（符号付きdotDamage）を1行で表示する。0の場合は何も出さない */
function DotLine({ amount, who }: { amount: number; who: string }) {
  if (amount === 0) return null;
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
  delusionSuccessCounts,
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
  /** 各プレイヤーが見破られずに成功させた妄想カードの累計回数 */
  delusionSuccessCounts: Record<string, number>;
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
  const yourDelusionSuccessCount = delusionSuccessCounts[playerId] ?? 0;
  const opponentDelusionSuccessCount = opponentId ? (delusionSuccessCounts[opponentId] ?? 0) : 0;

  const isResult = phase === "turn_result" && lastTurnResult !== null;
  const iWasAttacker = isResult ? lastTurnResult!.attackerId === playerId : null;
  const displayPlayerName = playerName ?? "自分";
  const displayOpponentName = opponentName ?? "相手";

  // 現在進行中のターンでの役割（結果表示中は直前ターンの役割をそのまま使う）
  const iAmAttackerNow =
    phase === "my_attack" || phase === "waiting_defense"
      ? true
      : phase === "waiting_attack" || phase === "my_defense" || phase === "waiting_for_result"
        ? false
        : iWasAttacker;

  return (
    <div className="felt-table relative rounded-2xl border border-white/10 shadow-xl p-4 space-y-3">
      <div className="text-center text-white/70 text-xs">ターン {turnNumber}</div>

      <RevealSequencer active={isResult} roundKey={lastTurnResult?.turnNumber ?? turnNumber}>
        {(revealed) => (
          <>
            <CardTypeRevealImage
              cardType={lastTurnResult?.attack.cardType ?? "reality"}
              active={isResult && revealed}
            />

            <OpponentPanel
              name={opponentName}
              life={opponentLife}
              gauge={opponentGauge}
              delusionSuccessCount={opponentDelusionSuccessCount}
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
                    {describeForViewer(lastTurnResult!, iWasAttacker!, displayPlayerName, displayOpponentName)}
                  </p>
                  <DotLine amount={lastTurnResult!.dotDamage[playerId] ?? 0} who={displayPlayerName} />
                  {opponentId && (
                    <DotLine amount={lastTurnResult!.dotDamage[opponentId] ?? 0} who={displayOpponentName} />
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
              opponentName={opponentName}
              life={yourLife}
              gauge={yourGauge}
              delusionSuccessCount={yourDelusionSuccessCount}
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
