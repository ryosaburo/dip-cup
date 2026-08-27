"use client";

import { useMemo, useState } from "react";
import {
  CARD_CONFIG,
  SUPPORT_CARD_CONFIG,
  tierOfCardId,
  type CardTier,
  type HandPublicState,
  type PlayerSelection,
  type PublicRoundOutcome,
  type SupportCardType,
} from "@battle/shared";
import { EmptyCardSlot, PromptCardFace, RevealPromptCard, SupportCardFace } from "./PlayingCard";

const TIER_LABEL: Record<CardTier, string> = { small: "小", medium: "中", large: "大" };
const TIERS: CardTier[] = ["small", "medium", "large"];

export function PlayerHandPanel({
  name,
  matchWins,
  hand,
  supportOptions,
  disabled,
  onSubmit,
  outcome,
  revealed,
}: {
  name: string | null;
  matchWins: number;
  hand: HandPublicState;
  supportOptions: SupportCardType[];
  disabled: boolean;
  onSubmit: (selection: PlayerSelection) => void;
  outcome: PublicRoundOutcome | null;
  revealed: boolean;
}) {
  const [counts, setCounts] = useState<Record<CardTier, number>>({
    small: 0,
    medium: 0,
    large: 0,
  });
  const [supportCard, setSupportCard] = useState<SupportCardType | undefined>(undefined);

  const preview = useMemo(() => {
    let overlearn = 0;
    let score = 0;
    for (const tier of TIERS) {
      overlearn += CARD_CONFIG[tier].overlearnChance * counts[tier];
      score += CARD_CONFIG[tier].score * counts[tier];
    }
    if (supportCard === "mitigate") overlearn -= 10;
    if (supportCard === "boost") score += 20;
    if (!supportCard) score += 15;
    return { overlearn: Math.max(0, overlearn), score };
  }, [counts, supportCard]);

  function playCard(tier: CardTier) {
    if (disabled) return;
    setCounts((c) => {
      if (c[tier] >= hand.remaining[tier]) return c;
      return { ...c, [tier]: c[tier] + 1 };
    });
  }

  function returnCard(tier: CardTier) {
    if (disabled) return;
    setCounts((c) => {
      if (c[tier] <= 0) return c;
      return { ...c, [tier]: c[tier] - 1 };
    });
  }

  function handleSubmit() {
    const promptCardIds: string[] = [];
    for (const tier of TIERS) {
      for (let i = 0; i < counts[tier]; i++) promptCardIds.push(`${tier}-${i + 1}`);
    }
    onSubmit({ promptCardIds, supportCard });
  }

  const totalSelected = TIERS.reduce((sum, t) => sum + counts[t], 0);

  if (outcome) {
    return (
      <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold text-sm">
            {name ?? "あなた"} <span className="text-white/50 font-normal">(あなた)</span>
          </span>
          <span className="text-white/80 text-xs font-bold bg-white/10 rounded-full px-2 py-0.5">
            勝ち {matchWins}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex gap-1.5 flex-wrap items-center">
            {outcome.selection.promptCardIds.length === 0 ? (
              <span className="text-white/50 text-xs py-2">カードを使用しませんでした</span>
            ) : (
              outcome.selection.promptCardIds.map((id, i) => (
                <div
                  key={id}
                  className={outcome.voidedCardIds.includes(id) ? "opacity-30 grayscale" : ""}
                >
                  <RevealPromptCard tier={tierOfCardId(id)} size="sm" revealed={revealed} delayMs={i * 180} />
                </div>
              ))
            )}
            {outcome.selection.supportCard && (
              <SupportCardFace
                type={outcome.selection.supportCard}
                label={SUPPORT_CARD_CONFIG[outcome.selection.supportCard].label}
                size="sm"
              />
            )}
          </div>
          {outcome.voidedCardIds.length > 0 && (
            <p className="text-[0.65rem] text-red-300">相手の効果でカードが無効化されました</p>
          )}
          <div
            className={`text-xs font-bold ${revealed ? "card-pop-in" : "opacity-0"} ${
              outcome.busted ? "text-red-400" : "text-white"
            }`}
            style={{ animationDelay: `${outcome.selection.promptCardIds.length * 180 + 150}ms` }}
          >
            {outcome.busted ? "暴走！" : `スコア ${outcome.score}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold text-sm">
          {name ?? "あなた"} <span className="text-white/50 font-normal">(あなた)</span>
        </span>
        <span className="text-white/80 text-xs font-bold bg-white/10 rounded-full px-2 py-0.5">
          勝ち {matchWins}
        </span>
      </div>

      {/* Staging tray: cards you've "cut" from your hand for this round */}
      <div className="min-h-[46px] rounded-md border border-dashed border-white/20 bg-white/5 px-2 py-2 flex items-center gap-1.5 flex-wrap">
        {totalSelected === 0 && (
          <span className="text-white/40 text-xs px-1">使うカードをタップしてここに出す</span>
        )}
        {TIERS.flatMap((tier) =>
          Array.from({ length: counts[tier] }).map((_, i) => (
            <button
              key={`${tier}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => returnCard(tier)}
              className="card-pop-in transition-transform hover:-translate-y-1 disabled:pointer-events-none"
              title="戻す"
            >
              <PromptCardFace tier={tier} size="sm" />
            </button>
          )),
        )}
      </div>

      {/* Hand: remaining cards fanned by tier, click to play */}
      <div className="flex justify-center gap-4">
        {TIERS.map((tier) => {
          const remaining = hand.remaining[tier] - counts[tier];
          return (
            <div key={tier} className="flex flex-col items-center gap-1">
              <div className="relative h-[68px] flex items-end" style={{ width: 48 }}>
                {remaining === 0 ? (
                  <EmptyCardSlot size="sm" />
                ) : (
                  Array.from({ length: remaining }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => playCard(tier)}
                      className="absolute left-0 transition-transform hover:-translate-y-2 disabled:pointer-events-none"
                      style={{ bottom: i * 3, zIndex: i }}
                      title={`${TIER_LABEL[tier]}カードを出す`}
                    >
                      <PromptCardFace tier={tier} size="sm" />
                    </button>
                  ))
                )}
              </div>
              <span className="text-white/60 text-[0.65rem] leading-tight text-center">
                {TIER_LABEL[tier]} 過学習{CARD_CONFIG[tier].overlearnChance}%
                <br />
                スコア+{CARD_CONFIG[tier].score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Support cards */}
      <div className="space-y-1.5">
        <p className="text-white/60 text-[0.65rem]">
          サポートカード（このラウンドはランダムで3枚配布／使わないとボーナス+15）
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSupportCard(undefined)}
            className={`rounded-md border text-[0.65rem] px-2 py-1 ${
              !supportCard
                ? "bg-white text-black border-white"
                : "bg-white/10 text-white/80 border-white/20"
            }`}
          >
            使わない
          </button>
          {supportOptions.map((type) => (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => setSupportCard(type)}
              className={`transition-transform ${
                supportCard === type ? "-translate-y-1 ring-2 ring-white rounded-lg" : ""
              } disabled:pointer-events-none`}
              title={SUPPORT_CARD_CONFIG[type].description}
            >
              <SupportCardFace type={type} label={SUPPORT_CARD_CONFIG[type].label} size="sm" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-white/10 px-3 py-2 text-[0.7rem] text-white/80 flex justify-between">
        <span>参考：過学習 約{preview.overlearn}%</span>
        <span>参考スコア {preview.score}</span>
      </div>

      <button
        disabled={disabled}
        onClick={handleSubmit}
        className="w-full rounded-md bg-white text-black py-2.5 font-semibold text-sm disabled:opacity-40 transition-transform active:scale-95"
      >
        {disabled ? "相手の選択を待っています…" : "この内容で決定"}
      </button>
    </div>
  );
}
