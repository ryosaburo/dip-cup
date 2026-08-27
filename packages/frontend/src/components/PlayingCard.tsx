"use client";

import type { CardTier, SupportCardType } from "@battle/shared";

export type CardSize = "sm" | "md" | "lg" | "custom";

const SIZE_CLASS: Record<CardSize, string> = {
  sm: "w-12 h-[68px]",
  md: "w-16 h-[90px]",
  lg: "w-24 h-[136px]",
  custom: "", // custom指定時は customClass を優先
};

const TIER_LABEL: Record<CardTier, string> = { small: "小", medium: "中", large: "大" };
const TIER_ICON: Record<CardTier, string> = { small: "🌱", medium: "⚙️", large: "🔥" };
const TIER_GRADIENT: Record<CardTier, string> = {
  small: "from-emerald-400 to-emerald-600",
  medium: "from-amber-400 to-amber-600",
  large: "from-rose-500 to-red-700",
};

const SUPPORT_ICON: Record<SupportCardType, string> = {
  mitigate: "🛡️",
  sabotage: "⚡",
  boost: "🚀",
  randomBoost: "🎲",
  removeCard: "💥",
  curse: "☠️",
  peek: "🔍",
};
const SUPPORT_GRADIENT: Record<SupportCardType, string> = {
  mitigate: "from-sky-400 to-sky-600",
  sabotage: "from-fuchsia-500 to-purple-700",
  boost: "from-yellow-300 to-orange-500",
  randomBoost: "from-lime-400 to-green-600",
  removeCard: "from-red-500 to-rose-700",
  curse: "from-violet-600 to-indigo-900",
  peek: "from-cyan-400 to-teal-600",
};

/** カードの基本クラスを生成するヘルパー関数 */
function getCardSizeClass(size: CardSize, customClass?: string): string {
  if (size === "custom" && customClass) {
    return customClass;
  }
  return SIZE_CLASS[size] || SIZE_CLASS.md;
}

export function CardBack({
  size = "md",
  customClass = "",
  className = "",
  style,
}: {
  size?: CardSize;
  customClass?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sizeClass = getCardSizeClass(size, customClass);

  return (
    <div
      style={style}
      className={`${sizeClass} rounded-lg border-2 border-white/70 shadow-md bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 flex items-center justify-center relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-1 rounded-md border border-white/25" />
      <span className="text-white/90 font-black text-[0.6em] tracking-widest rotate-[-20deg] select-none">
        AI
      </span>
    </div>
  );
}

export function PromptCardFace({
  tier,
  size = "md",
  customClass = "",
  className = "",
}: {
  tier: CardTier;
  size?: CardSize;
  customClass?: string;
  className?: string;
}) {
  const sizeClass = getCardSizeClass(size, customClass);

  return (
    <div
      className={`${sizeClass} rounded-lg border-2 border-white shadow-md bg-gradient-to-br ${TIER_GRADIENT[tier]} text-white flex flex-col items-center justify-center gap-0.5 select-none ${className}`}
    >
      <span className="text-[1.4em] leading-none">{TIER_ICON[tier]}</span>
      <span className="font-bold text-[0.85em] leading-none">{TIER_LABEL[tier]}</span>
    </div>
  );
}

export function SupportCardFace({
  type,
  label,
  size = "md",
  customClass = "",
  className = "",
}: {
  type: SupportCardType;
  label: string;
  size?: CardSize;
  customClass?: string;
  className?: string;
}) {
  const sizeClass = getCardSizeClass(size, customClass);

  return (
    <div
      className={`${sizeClass} rounded-lg border-2 border-white shadow-md bg-gradient-to-br ${SUPPORT_GRADIENT[type]} text-white flex flex-col items-center justify-center gap-0.5 text-center px-1 select-none ${className}`}
    >
      <span className="text-[1.2em] leading-none">{SUPPORT_ICON[type]}</span>
      <span className="font-bold text-[0.65em] leading-tight">{label}</span>
    </div>
  );
}

export function EmptyCardSlot({
  size = "md",
  customClass = "",
  className = "",
  label,
}: {
  size?: CardSize;
  customClass?: string;
  className?: string;
  label?: string;
}) {
  const sizeClass = getCardSizeClass(size, customClass);

  return (
    <div
      className={`${sizeClass} rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-[0.6em] ${className}`}
    >
      {label}
    </div>
  );
}

/** Prompt card that flips from a hidden back to its revealed face */
export function RevealPromptCard({
  tier,
  size = "md",
  customClass = "",
  revealed,
  delayMs = 0,
  className = "",
}: {
  tier: CardTier;
  size?: CardSize;
  customClass?: string;
  revealed: boolean;
  delayMs?: number;
  className?: string;
}) {
  const sizeClass = getCardSizeClass(size, customClass);

  return (
    <div
      className={`card-3d-scene card-deal-in ${sizeClass} ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={`card-3d-inner ${revealed ? "is-flipped" : ""}`}>
        <div className="card-3d-face">
          <CardBack size={size} customClass={customClass} />
        </div>
        <div className="card-3d-face card-3d-face-back">
          <PromptCardFace tier={tier} size={size} customClass={customClass} />
        </div>
      </div>
    </div>
  );
}