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
  delusionSuccessCount: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">
          {name ?? "あなた"} <span className="text-white/50 font-normal">(あなた)</span>
        </span>
        <span className="text-white/80 text-xs font-bold">ライフ {life}</span>
      </div>
      <LifeBar life={life} className="mb-1.5" />
      <div className="flex items-center justify-between mb-1">
        <span className="text-fuchsia-300/80 text-[0.65rem]">妄想ゲージ</span>
        <span className="text-fuchsia-300/80 text-[0.65rem] font-bold">{gauge}%</span>
      </div>
      <GaugeBar gauge={gauge} className="mb-2" />
      <div className="flex items-center justify-between">
        <span className="text-sky-300/80 text-[0.6rem]">妄想成功（見破られず）</span>
        <span className="text-sky-300/80 text-[0.6rem] font-bold">
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
  delusionSuccessCount: number;
  phase: GamePhase;
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
  // ★ AI自由入力用テキスト
  const [customDelusionText, setCustomDelusionText] = useState("");

  function handleSubmitAttack() {
    if (!choice) return;
    if (choice.cardType === "delusion") {
      onSubmitAttack({
        cardType: "delusion",
        delusionEffect,
        delusionDamage,
        // ★ テキストがある場合は Gemini で上書き解析させる
        rawDelusionText: customDelusionText.trim() ? customDelusionText.trim() : undefined,
      });
    } else if (choice.realityCardId === "life_drain") {
      onSubmitAttack({ cardType: "reality", realityCardId: "life_drain", realityAmount: lifeDrainAmount });
    } else {
      onSubmitAttack({ cardType: "reality", realityCardId: choice.realityCardId });
    }
  }

  if (phase === "turn_result" && outcome) {
    const label =
      outcome.attack.cardType === "reality" && outcome.attack.realityCardId
        ? REALITY_CARD_CONFIG[outcome.attack.realityCardId].label
        : outcome.attack.delusionCardName || undefined;

    const effectiveDamage =
      outcome.damageDealt ||
      outcome.selfDamage ||
      outcome.selfHeal ||
      outcome.defenderHeal ||
      Math.abs(outcome.gaugeDelta) ||
      undefined;

    return (
      <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
        <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />
        {wasAttackerInOutcome ? (
          <div className="flex items-center gap-3">
            <RevealCard
              type={outcome.attack.cardType}
              label={label}
              damage={effectiveDamage}
              size="sm"
              revealed={revealed}
            />
            <div
              className={`text-xs font-bold ${revealed ? "card-pop-in" : "opacity-0"} ${
                outcome.wasCaught ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {outcome.wasCaught ? "😱 見破られた…" : "🎉 見破られなかった！"}
              {outcome.attack.flavorText && (
                <p className="text-[0.65rem] text-white/70 font-normal mt-1 italic">
                  「{outcome.attack.flavorText}」
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className={`text-xs ${revealed ? "card-pop-in" : "opacity-0"}`}>
            <p className="text-white/70 mb-1">
              {name ?? "自分"}の予想：「{CARD_TYPE_LABEL[outcome.defense.prediction]}」
            </p>
            <p
              className={`font-bold ${outcome.wasCaught ? "text-emerald-400" : "text-red-400"}`}
            >
              {outcome.wasCaught ? "🎯 見破った！" : "😱 見破れなかった…"}
            </p>
            {outcome.attack.flavorText && (
              <p className="text-[0.65rem] text-white/70 font-normal mt-1 italic">
                相手の決め台詞：「{outcome.attack.flavorText}」
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (phase === "my_attack") {
    return (
      <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 space-y-3">
        <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />

        <div className="space-y-1.5">
          <p className="text-white/60 text-[0.65rem]">
            あなたの攻撃ターンです。現実カードから1枚、または妄想カードを選んでください。
          </p>
          <p className="text-white/40 text-[0.6rem]">現実カード（今ターン選べる3種）</p>
          <div className="grid grid-cols-3 gap-1.5">
            {dealtRealityCards.map((id) => {
              const config = REALITY_CARD_CONFIG[id];
              const previewDamage =
                id === "life_drain"
                  ? `${LIFE_DRAIN_MIN}〜${LIFE_DRAIN_MAX}`
                  : getAttackMagnitude({ cardType: "reality", realityCardId: id }, gauge);
              const selected = choice?.cardType === "reality" && choice.realityCardId === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={config.description}
                  onClick={() => setChoice({ cardType: "reality", realityCardId: id })}
                  className={`transition-transform ${selected ? "-translate-y-1 ring-2 ring-white rounded-lg" : ""}`}
                >
                  <div className="h-[72px] rounded-lg border-2 border-white shadow-md bg-gradient-to-br from-sky-400 to-slate-600 text-white flex flex-col items-center justify-center gap-0.5 text-center px-1">
                    <span className="font-bold text-[0.65em] leading-tight">{config.label}</span>
                    <span className="text-[0.65em] opacity-90">{previewDamage}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-white/40 text-[0.6rem] pt-1">妄想カード（AI生成・自由入力）</p>
          <button
            type="button"
            onClick={() => setChoice({ cardType: "delusion" })}
            className={`transition-transform ${
              choice?.cardType === "delusion" ? "-translate-y-1 ring-2 ring-white rounded-lg" : ""
            }`}
          >
            <div className="w-24 h-[72px] rounded-lg border-2 border-white shadow-md bg-gradient-to-br from-fuchsia-500 to-purple-800 text-white flex flex-col items-center justify-center gap-0.5">
              <span className="text-[1.1em]">✨</span>
              <span className="font-bold text-xs">妄想(AI)</span>
              <span className="text-[0.6em] opacity-90">
                {customDelusionText.trim() ? "自由記述" : `手動${delusionDamage}`}
              </span>
            </div>
          </button>
        </div>

        {choice?.cardType === "reality" && choice.realityCardId === "life_drain" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[0.65rem] text-white/60">
              <span>吸血の申告ダメージ量</span>
              <span className="font-bold text-sky-300">{lifeDrainAmount}</span>
            </div>
            <input
              type="range"
              min={LIFE_DRAIN_MIN}
              max={LIFE_DRAIN_MAX}
              value={lifeDrainAmount}
              onChange={(e) => setLifeDrainAmount(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>
        )}

        {choice?.cardType === "delusion" && (
          <div className="space-y-2 rounded-lg bg-white/5 p-2.5 border border-white/10">
            <div>
              <label className="block text-[0.65rem] font-bold text-fuchsia-300 mb-1">
                ✨ 妄想テキスト自由入力（Gemini AIが自動解析）
              </label>
              <textarea
                value={customDelusionText}
                onChange={(e) => setCustomDelusionText(e.target.value)}
                placeholder="例: 全宇宙の力を宿した黒炎弾！ 80ダメージ"
                rows={2}
                maxLength={100}
                className="w-full bg-black/40 border border-white/20 rounded-md p-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
              />
              <p className="text-[0.55rem] text-white/50 mt-0.5">
                ※ 入力すると AI が技名・ダメージ（0〜100）・決め台詞を自動判定します。
              </p>
            </div>

            {!customDelusionText.trim() && (
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex justify-between text-[0.65rem] text-white/60">
                  <span>手動申告ダメージ量</span>
                  <span className="font-bold text-fuchsia-300">{delusionDamage}</span>
                </div>
                <input
                  type="range"
                  min={DELUSION_DAMAGE_MIN}
                  max={DELUSION_DAMAGE_MAX}
                  value={delusionDamage}
                  onChange={(e) => setDelusionDamage(Number(e.target.value))}
                  className="w-full accent-fuchsia-500"
                />
              </div>
            )}
          </div>
        )}

        <button
          disabled={!choice}
          onClick={handleSubmitAttack}
          className="w-full rounded-md bg-white text-black py-2.5 font-semibold text-sm disabled:opacity-40 transition-transform active:scale-95"
        >
          この内容で攻撃する
        </button>
      </div>
    );
  }

  if (phase === "my_defense") {
    return (
      <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 space-y-3">
        <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />

        <div className="rounded-md bg-white/10 px-3 py-3 text-center">
          <p className="text-white/70 text-[0.7rem] mb-1">{displayOpponentName}が攻撃してきました</p>
          <p className="text-white font-bold text-2xl">{pendingDamage}ダメージ？</p>
        </div>
        <p className="text-white/60 text-[0.65rem] text-center">
          これは「現実」「妄想」どちらのカードだと思いますか？
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => onSubmitDefense({ prediction: "reality" })}
            className="rounded-md border border-white/20 bg-white/10 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/20"
          >
            現実だと思う
          </button>
          <button
            type="button"
            onClick={() => onSubmitDefense({ prediction: "delusion" })}
            className="rounded-md border border-white/20 bg-white/10 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/20"
          >
            妄想だと思う
          </button>
        </div>
      </div>
    );
  }

  const waitingMessage =
    phase === "waiting_attack"
      ? `${displayOpponentName}の攻撃を待っています…`
      : phase === "waiting_defense"
        ? `${displayOpponentName}が見破ろうとしています…`
        : "判定中…";

  return (
    <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
      <StatusHeader name={name} life={life} gauge={gauge} delusionSuccessCount={delusionSuccessCount} />
      <p className="text-white/50 text-xs text-center animate-pulse py-2">{waitingMessage}</p>
    </div>
  );
}