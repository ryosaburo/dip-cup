"use client";

import { useMemo, useState } from "react";
import {
  CARD_CONFIG,
  SUPPORT_CARD_CONFIG,
  type CardTier,
  type HandPublicState,
  type PlayerSelection,
  type SupportCardType,
} from "@battle/shared";

const TIER_LABEL: Record<CardTier, string> = { small: "小", medium: "中", large: "大" };
const TIERS: CardTier[] = ["small", "medium", "large"];
const SUPPORT_TYPES: SupportCardType[] = ["mitigate", "sabotage", "boost"];

export function CardSelector({
  hand,
  disabled,
  onSubmit,
}: {
  hand: HandPublicState;
  disabled: boolean;
  onSubmit: (selection: PlayerSelection) => void;
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

  function adjust(tier: CardTier, delta: number) {
    setCounts((c) => {
      const next = c[tier] + delta;
      if (next < 0 || next > hand.remaining[tier]) return c;
      return { ...c, [tier]: next };
    });
  }

  function handleSubmit() {
    const promptCardIds: string[] = [];
    for (const tier of TIERS) {
      for (let i = 0; i < counts[tier]; i++) promptCardIds.push(`${tier}-${i + 1}`);
    }
    onSubmit({ promptCardIds, supportCard });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {TIERS.map((tier) => (
          <div key={tier} className="rounded-lg border p-3 text-center space-y-2">
            <div className="font-semibold">
              {TIER_LABEL[tier]}カード
              <span className="block text-xs text-neutral-500 font-normal">
                過学習{CARD_CONFIG[tier].overlearnChance}% / スコア+{CARD_CONFIG[tier].score}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={disabled || counts[tier] === 0}
                onClick={() => adjust(tier, -1)}
                className="w-8 h-8 rounded-full border disabled:opacity-30"
              >
                -
              </button>
              <span className="w-10 tabular-nums">
                {counts[tier]} / {hand.remaining[tier]}
              </span>
              <button
                type="button"
                disabled={disabled || counts[tier] >= hand.remaining[tier]}
                onClick={() => adjust(tier, 1)}
                className="w-8 h-8 rounded-full border disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">サポートカード（1ラウンド1枚まで／使わないとボーナス+15）</h3>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSupportCard(undefined)}
            className={`flex-1 rounded-md border py-2 text-sm ${
              !supportCard ? "bg-black text-white" : "bg-white"
            }`}
          >
            使わない
          </button>
          {SUPPORT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => setSupportCard(type)}
              title={SUPPORT_CARD_CONFIG[type].description}
              className={`flex-1 rounded-md border py-2 text-sm ${
                supportCard === type ? "bg-black text-white" : "bg-white"
              }`}
            >
              {SUPPORT_CARD_CONFIG[type].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-neutral-100 px-4 py-3 text-sm flex justify-between">
        <span>参考：自分の過学習確率 約{preview.overlearn}%（妨害は相手選択後に反映）</span>
        <span>参考スコア {preview.score}</span>
      </div>

      <button
        disabled={disabled}
        onClick={handleSubmit}
        className="w-full rounded-md bg-black text-white py-3 font-semibold disabled:opacity-40"
      >
        {disabled ? "相手の選択を待っています…" : "この内容で決定"}
      </button>
    </div>
  );
}
