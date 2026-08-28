"use client";

import { useState } from "react";
import {
  DELUSION_DAMAGE_MAX,
  DELUSION_DAMAGE_MIN,
  DELUSION_SUCCESS_WIN_COUNT,
  getAttackMagnitude,
  LIFE_DRAIN_MAX,
  LIFE_DRAIN_MIN,
  REALITY_CARD_CONFIG,
  type AttackSelection,
  type CardType,
  type DefenseSelection,
  type DelusionEffect,
  type RealityCardId,
  type TurnResult,
} from "@battle/shared";
import type { GamePhase } from "@/context/GameSocketProvider";
import { GaugeBar, LifeBar, RevealCard } from "./PlayingCard";

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };

type Choice = { cardType: "reality"; realityCardId: RealityCardId } | { cardType: "delusion" } | null;

function StatusHeader({
  name,
  life,
  gauge,
  delusionSuccessCount,
}: {
  name: string | null;
  life: number;
  gauge: number;
  /** 見破られずに成功させた妄想カードの累計回数 */
  delusionSuccessCount: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm sm:text-base">
          {name ?? "あなた"} <span className="text-[var(--pop-ink-soft)] font-normal">(あなた)</span>
        </span>
        <span className="text-[var(--pop-ink-soft)] text-xs sm:text-sm font-bold">ライフ {life}</span>
      </div>
      <LifeBar life={life} className="mb-1.5" />
      <div className="flex items-center justify-between mb-1">
        <span className="text-fuchsia-500 text-xs sm:text-sm font-semibold">妄想ゲージ</span>
        <span className="text-fuchsia-500 text-xs sm:text-sm font-bold">{gauge}%</span>
      </div>
      <GaugeBar gauge={gauge} className="mb-2" />
      <div className="flex items-center justify-between">
        <span className="text-sky-500 text-xs sm:text-sm font-semibold">妄想成功（見破られず）</span>
        <span className="text-sky-500 text-xs sm:text-sm font-bold">
          {delusionSuccessCount}/{DELUSION_SUCCESS_WIN_COUNT}
        </span>
      </div>
    </>
  );
}

export function PlayerChoicePanel({
  name,
  opponentName,
  life,
  gauge,
  delusionSuccessCount,
  phase,
  dealtRealityCards,
  pendingDamage,
  onSubmitAttack,
  onSubmitDefense,
  outcome,
  wasAttackerInOutcome,
  revealed,
}: {
  name: string | null;
  opponentName: string | null;
  life: number;
  gauge: number;
  /** 見破られずに成功させた妄想カードの累計回数 */
  delusionSuccessCount: number;
  phase: GamePhase;
  /** ランダムに配られた、このターンに選べる現実カード */
  dealtRealityCards: RealityCardId[];
  pendingDamage: number | null;
  onSubmitAttack: (attack: AttackSelection) => void;
  onSubmitDefense: (defense: DefenseSelection) => void;
  outcome: TurnResult | null;
  wasAttackerInOutcome: boolean;
  revealed: boolean;
}) {
  const displayOpponentName = opponentName ?? "相手";
  const [choice, setChoice] = useState<Choice>(null);
  const [delusionEffect, setDelusionEffect] = useState<DelusionEffect>("damage");
  const [delusionDamage, setDelusionDamage] = useState(
    Math.round((DELUSION_DAMAGE_MIN + DELUSION_DAMAGE_MAX) / 2),
  );
  const [lifeDrainAmount, setLifeDrainAmount] = useState(
    Math.round((LIFE_DRAIN_MIN + LIFE_DRAIN_MAX) / 2),
  );

  function handleSubmitAttack() {
    if (!choice) return;
    if (choice.cardType === "delusion") {
      const clampedDamage = Math.min(
        DELUSION_DAMAGE_MAX,
        Math.max(DELUSION_DAMAGE_MIN, Math.round(delusionDamage)),
      );
      onSubmitAttack({ cardType: "delusion", delusionEffect, delusionDamage: clampedDamage });
    } else if (choice.realityCardId === "life_drain") {
      const clampedAmount = Math.min(LIFE_DRAIN_MAX, Math.max(LIFE_DRAIN_MIN, Math.round(lifeDrainAmount)));
      onSubmitAttack({ cardType: "reality", realityCardId: "life_drain", realityAmount: clampedAmount });
    } else {
      onSubmitAttack({ cardType: "reality", realityCardId: choice.realityCardId });
    }
  }

  if (phase === "turn_result" && outcome) {
    const label =
      outcome.attack.cardType === "reality" && outcome.attack.realityCardId
        ? REALITY_CARD_CONFIG[outcome.attack.realityCardId].label
        : undefined;
    const effectiveDamage =
      outcome.damageDealt ||
      outcome.selfDamage ||
      outcome.selfHeal ||
      outcome.defenderHeal ||
      Math.abs(outcome.gaugeDelta) ||
      undefined;

    return (
      <div className="pop-panel w-full px-4 py-3 sm:px-6 sm:py-4">
        <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />
        {wasAttackerInOutcome ? (
          <div className="flex items-center gap-3">
            <RevealCard
              type={outcome.attack.cardType}
              label={label}
              damage={effectiveDamage}
              size="md"
              revealed={revealed}
            />
            <div
              className={`text-xs sm:text-sm font-bold ${revealed ? "card-pop-in" : "opacity-0"} ${
                outcome.wasCaught ? "text-rose-500" : "text-emerald-500"
              }`}
            >
              {outcome.wasCaught ? "😱 見破られた…" : "🎉 見破られなかった！"}
            </div>
          </div>
        ) : (
          <div className={`text-xs sm:text-sm ${revealed ? "card-pop-in" : "opacity-0"}`}>
            <p className="text-[var(--pop-ink-soft)] mb-1">
              {name ?? "自分"}の予想：「{CARD_TYPE_LABEL[outcome.defense.prediction]}」
            </p>
            <p
              className={`font-bold ${outcome.wasCaught ? "text-emerald-500" : "text-rose-500"}`}
            >
              {outcome.wasCaught ? "🎯 見破った！" : "😱 見破れなかった…"}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (phase === "my_attack") {
    return (
      <div className="pop-panel w-full px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4">
        <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />

        <div className="space-y-2">
          <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm">
            あなたの攻撃ターンです。ランダムに配られた現実カードから1枚、または妄想カードを選んでください（見破られると効果は自分に跳ね返ります）
          </p>
          <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm">現実カード（今ターンだけ選べる3種）</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {dealtRealityCards.map((id, i) => {
              const config = REALITY_CARD_CONFIG[id];
              const previewDamage =
                id === "life_drain"
                  ? `${LIFE_DRAIN_MIN}〜${LIFE_DRAIN_MAX}`
                  : getAttackMagnitude({ cardType: "reality", realityCardId: id }, gauge);
              const selected = choice?.cardType === "reality" && choice.realityCardId === id;
              const flyOffset = (i - 1) * 24;
              const flyRotate = (i - 1) * 10;
              return (
                <button
                  key={id}
                  type="button"
                  title={config.description}
                  onClick={() => setChoice({ cardType: "reality", realityCardId: id })}
                  className={`pop-bounce card-fly-in w-full ${
                    selected ? "-translate-y-1.5 ring-4 ring-yellow-300 rounded-2xl" : ""
                  }`}
                  style={
                    {
                      animationDelay: `${150 + i * 90}ms`,
                      "--fly-x": `${flyOffset}px`,
                      "--fly-rot": `${flyRotate}deg`,
                    } as React.CSSProperties
                  }
                >
                  <div className="aspect-[5/7] w-full max-w-[110px] sm:max-w-[130px] md:max-w-[150px] mx-auto rounded-2xl border-[3px] border-white shadow-[0_5px_0_rgba(150,120,200,0.35)] bg-gradient-to-br from-sky-300 via-sky-400 to-blue-400 text-white flex flex-col items-center justify-center gap-1 text-center px-1.5">
                    <span className="font-bold text-xs sm:text-sm md:text-base leading-tight drop-shadow">
                      {config.label}
                    </span>
                    <span className="text-xs sm:text-sm opacity-95">{previewDamage}</span>
                  </div>
                </button>
              );
            })}

            <div className="col-start-2 flex flex-col items-center gap-1.5 pt-2">
              <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm">妄想カード</p>
              <button
                type="button"
                onClick={() => setChoice({ cardType: "delusion" })}
                className={`pop-bounce card-fly-in w-full ${
                  choice?.cardType === "delusion" ? "-translate-y-1.5 ring-4 ring-yellow-300 rounded-2xl" : ""
                }`}
                style={{ animationDelay: "420ms" } as React.CSSProperties}
              >
                <div className="aspect-[5/7] w-full max-w-[110px] sm:max-w-[130px] md:max-w-[150px] mx-auto rounded-2xl border-[3px] border-white shadow-[0_5px_0_rgba(150,120,200,0.35)] bg-gradient-to-br from-fuchsia-300 via-pink-400 to-purple-400 text-white flex flex-col items-center justify-center gap-1">
                  <span className="text-xl sm:text-2xl drop-shadow">{delusionEffect === "heal" ? "💚" : "🌀"}</span>
                  <span className="font-bold text-sm sm:text-base drop-shadow">妄想</span>
                  <span className="text-xs sm:text-sm opacity-95">自由{delusionDamage}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {choice?.cardType === "reality" && (
          <div className="rounded-2xl bg-sky-50 border-2 border-sky-100 px-3 py-2.5 sm:px-4 sm:py-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sky-600 text-sm sm:text-base">
                {REALITY_CARD_CONFIG[choice.realityCardId].label}
              </span>
              {choice.realityCardId !== "life_drain" && (
                <span className="font-bold text-sky-600 text-sm sm:text-base">
                  {getAttackMagnitude(
                    { cardType: "reality", realityCardId: choice.realityCardId },
                    gauge,
                  )}
                </span>
              )}
            </div>
            <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm">
              {REALITY_CARD_CONFIG[choice.realityCardId].description}
            </p>
          </div>
        )}

        {choice?.cardType === "reality" && choice.realityCardId === "life_drain" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-[var(--pop-ink-soft)]">
              <span>吸血の申告ダメージ量</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={LIFE_DRAIN_MIN}
                  max={LIFE_DRAIN_MAX}
                  value={lifeDrainAmount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setLifeDrainAmount(LIFE_DRAIN_MIN);
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) return;
                    setLifeDrainAmount(parsed);
                  }}
                  onBlur={() =>
                    setLifeDrainAmount((v) =>
                      Math.min(LIFE_DRAIN_MAX, Math.max(LIFE_DRAIN_MIN, Math.round(v))),
                    )
                  }
                  className="w-16 sm:w-20 rounded-xl border-2 border-sky-200 bg-white px-2 py-1 text-right font-bold text-sky-600 text-sm sm:text-base focus:outline-none focus:border-sky-400"
                />
                <span className="text-[var(--pop-ink-soft)] text-xs whitespace-nowrap">
                  （{LIFE_DRAIN_MIN}〜{LIFE_DRAIN_MAX}）
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[var(--pop-ink-soft)]">
              見破られなければこの量だけ相手にダメージを与え、同じ量だけ自分が回復する／見破られると回復できず、この量の反動ダメージが自分に入る
            </p>
          </div>
        )}

        {choice?.cardType === "delusion" && (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDelusionEffect("damage")}
                className={`flex-1 rounded-full py-1.5 sm:py-2 text-xs sm:text-sm font-bold border-2 pop-bounce ${
                  delusionEffect === "damage"
                    ? "bg-[var(--pop-ink)] text-white border-[var(--pop-ink)]"
                    : "border-[var(--pop-ink)]/20 text-[var(--pop-ink-soft)]"
                }`}
              >
                ダメージ
              </button>
              <button
                type="button"
                onClick={() => setDelusionEffect("heal")}
                className={`flex-1 rounded-full py-1.5 sm:py-2 text-xs sm:text-sm font-bold border-2 pop-bounce ${
                  delusionEffect === "heal"
                    ? "bg-[var(--pop-ink)] text-white border-[var(--pop-ink)]"
                    : "border-[var(--pop-ink)]/20 text-[var(--pop-ink-soft)]"
                }`}
              >
                回復
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-[var(--pop-ink-soft)]">
              <span>{delusionEffect === "heal" ? "申告回復量" : "申告ダメージ量"}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={DELUSION_DAMAGE_MIN}
                  max={DELUSION_DAMAGE_MAX}
                  value={delusionDamage}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setDelusionDamage(DELUSION_DAMAGE_MIN);
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) return;
                    setDelusionDamage(parsed);
                  }}
                  onBlur={() =>
                    setDelusionDamage((v) =>
                      Math.min(DELUSION_DAMAGE_MAX, Math.max(DELUSION_DAMAGE_MIN, Math.round(v))),
                    )
                  }
                  className="w-16 sm:w-20 rounded-xl border-2 border-fuchsia-200 bg-white px-2 py-1 text-right font-bold text-fuchsia-600 text-sm sm:text-base focus:outline-none focus:border-fuchsia-400"
                />
                <span className="text-[var(--pop-ink-soft)] text-xs whitespace-nowrap">
                  （{DELUSION_DAMAGE_MIN}〜{DELUSION_DAMAGE_MAX}）
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[var(--pop-ink-soft)]">
              {delusionEffect === "heal"
                ? "見破られなければ自分がこの量だけ回復する／見破られると自分は回復できず、見破った相手がこの量だけ回復する（自分の妄想ゲージはこの量だけ上がる）"
                : "見破られなければこの量がそのまま通る／見破られると自分に反動＋この量だけ妄想ゲージが上がる"}
            </p>
          </div>
        )}

        <button
          disabled={!choice}
          onClick={handleSubmitAttack}
          className="pop-bounce w-full rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-400 text-white py-3 font-bold text-sm sm:text-base shadow-[0_5px_0_rgba(150,120,200,0.35)] disabled:opacity-40 disabled:shadow-none"
        >
          この内容で攻撃する
        </button>
      </div>
    );
  }

  if (phase === "my_defense") {
    return (
      <div className="pop-panel w-full px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4">
        <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />

        <div className="rounded-2xl bg-violet-50 border-2 border-violet-100 px-3 py-3 sm:py-4 text-center">
          <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm mb-1">{displayOpponentName}が攻撃してきました</p>
          <p className="pop-title text-[var(--pop-ink)] text-3xl sm:text-4xl">{pendingDamage}ダメージ？</p>
        </div>
        <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm text-center">
          これは「現実」「妄想」どちらのカードだと思いますか？
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => onSubmitDefense({ prediction: "reality" })}
            className="pop-bounce rounded-full bg-gradient-to-r from-sky-300 to-blue-400 text-white px-6 py-3 text-sm sm:text-base font-bold shadow-[0_5px_0_rgba(150,120,200,0.35)]"
          >
            現実だと思う
          </button>
          <button
            type="button"
            onClick={() => onSubmitDefense({ prediction: "delusion" })}
            className="pop-bounce rounded-full bg-gradient-to-r from-fuchsia-300 to-purple-400 text-white px-6 py-3 text-sm sm:text-base font-bold shadow-[0_5px_0_rgba(150,120,200,0.35)]"
          >
            妄想だと思う
          </button>
        </div>
      </div>
    );
  }

  // waiting_attack / waiting_defense / waiting_for_result
  const waitingMessage =
    phase === "waiting_attack"
      ? `${displayOpponentName}の攻撃を待っています…`
      : phase === "waiting_defense"
        ? `${displayOpponentName}が見破ろうとしています…`
        : "判定中…";

  return (
    <div className="pop-panel w-full px-4 py-3 sm:px-6 sm:py-4">
      <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />
      <p className="text-[var(--pop-ink-soft)] text-xs sm:text-sm text-center animate-pulse py-2">{waitingMessage}</p>
    </div>
  );
}
