"use client";

import { STARTING_LIFE, type CardType } from "@battle/shared";

export type CardSize = "sm" | "md" | "lg" | "custom";

const SIZE_CLASS: Record<CardSize, string> = {
  sm: "w-16 h-[92px] text-[13px]",
  md: "w-24 h-[136px] text-base",
  lg: "w-32 h-[180px] text-lg",
  custom: "", // custom指定時は customClass を優先
};

/** 現在ライフ / 開始時ライフ の割合バー */
export function LifeBar({ life, className = "" }: { life: number; className?: string }) {
  const ratio = Math.max(0, Math.min(1, life / STARTING_LIFE));
  return (
    <div className={`h-2.5 sm:h-3 w-full rounded-full bg-black/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          ratio > 0.5 ? "bg-emerald-400" : ratio > 0.2 ? "bg-amber-400" : "bg-rose-500"
        }`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

/** 妄想ゲージ（0〜100%、高いほど危険） */
export function GaugeBar({ gauge, className = "" }: { gauge: number; className?: string }) {
  const ratio = Math.max(0, Math.min(1, gauge / 100));
  return (
    <div className={`h-2.5 sm:h-3 w-full rounded-full bg-black/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          ratio < 0.5 ? "bg-violet-400" : ratio < 0.8 ? "bg-fuchsia-500" : "bg-rose-500"
        }`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

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
      className={`${sizeClass} rounded-2xl border-[3px] border-white shadow-[0_5px_0_rgba(150,120,200,0.35)] bg-gradient-to-br from-indigo-300 via-violet-400 to-fuchsia-400 flex items-center justify-center relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-1.5 rounded-xl border-2 border-white/40" />
      <span className="text-white font-black text-[0.6em] tracking-widest rotate-[-16deg] select-none drop-shadow">
        ？
      </span>
    </div>
  );
}

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };
const CARD_TYPE_ICON: Record<CardType, string> = { reality: "🪨", delusion: "🌀" };
const CARD_TYPE_GRADIENT: Record<CardType, string> = {
  reality: "from-sky-300 via-sky-400 to-blue-400",
  delusion: "from-fuchsia-300 via-pink-400 to-purple-400",
};

export function CardTypeFace({
  type,
  label,
  damage,
  size = "md",
  customClass = "",
  className = "",
}: {
  type: CardType;
  /** 現実カードの場合、具体的なカード名で上書きする */
  label?: string;
  /** 妄想カード、または現実カードの実ダメージ量を表示する */
  damage?: number;
  size?: CardSize;
  customClass?: string;
  className?: string;
}) {
  const sizeClass = getCardSizeClass(size, customClass);

  return (
    <div
      className={`${sizeClass} rounded-2xl border-[3px] border-white shadow-[0_5px_0_rgba(150,120,200,0.35)] bg-gradient-to-br ${CARD_TYPE_GRADIENT[type]} text-white flex flex-col items-center justify-center gap-0.5 text-center px-1 select-none ${className}`}
    >
      <span className="text-[1.3em] leading-none drop-shadow">{CARD_TYPE_ICON[type]}</span>
      <span className="font-bold text-[0.7em] leading-tight drop-shadow">{label ?? CARD_TYPE_LABEL[type]}</span>
      {damage !== undefined && (
        <span className="text-[0.65em] leading-none opacity-95">{damage}</span>
      )}
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
      className={`${sizeClass} rounded-2xl border-[3px] border-dashed border-[var(--pop-ink)]/25 flex items-center justify-center text-[var(--pop-ink)]/50 text-[0.6em] ${className}`}
    >
      {label}
    </div>
  );
}

/** 現実/妄想カードが伏せ状態から表向きに反転するアニメーション */
export function RevealCard({
  type,
  label,
  damage,
  size = "md",
  customClass = "",
  revealed,
  delayMs = 0,
  className = "",
}: {
  type: CardType;
  label?: string;
  damage?: number;
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
          <CardTypeFace
            type={type}
            label={label}
            damage={damage}
            size={size}
            customClass={customClass}
          />
        </div>
      </div>
    </div>
  );
}
