"use client";

import { STARTING_LIFE, type CardType } from "@battle/shared";

export type CardSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<CardSize, string> = {
  sm: "w-12 h-[68px]",
  md: "w-16 h-[90px]",
  lg: "w-24 h-[136px]",
};

/** 現在ライフ / 開始時ライフ の割合バー */
export function LifeBar({ life, className = "" }: { life: number; className?: string }) {
  const ratio = Math.max(0, Math.min(1, life / STARTING_LIFE));
  return (
    <div className={`h-1.5 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          ratio > 0.5 ? "bg-emerald-400" : ratio > 0.2 ? "bg-amber-400" : "bg-red-500"
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
    <div className={`h-1.5 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          ratio < 0.5 ? "bg-violet-400" : ratio < 0.8 ? "bg-fuchsia-500" : "bg-red-500"
        }`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

export function CardBack({
  size = "md",
  className = "",
  style,
}: {
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`${SIZE_CLASS[size]} rounded-lg border-2 border-white/70 shadow-md bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 flex items-center justify-center relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-1 rounded-md border border-white/25" />
      <span className="text-white/90 font-black text-[0.6em] tracking-widest rotate-[-20deg] select-none">
        AI
      </span>
    </div>
  );
}

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };
const CARD_TYPE_ICON: Record<CardType, string> = { reality: "🪨", delusion: "🌀" };
const CARD_TYPE_GRADIENT: Record<CardType, string> = {
  reality: "from-sky-400 to-slate-600",
  delusion: "from-fuchsia-500 to-purple-800",
};

export function CardTypeFace({
  type,
  damage,
  size = "md",
  className = "",
}: {
  type: CardType;
  /** 妄想カードのみ、申告ダメージ量を表示する */
  damage?: number;
  size?: CardSize;
  className?: string;
}) {
  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-lg border-2 border-white shadow-md bg-gradient-to-br ${CARD_TYPE_GRADIENT[type]} text-white flex flex-col items-center justify-center gap-0.5 select-none ${className}`}
    >
      <span className="text-[1.3em] leading-none">{CARD_TYPE_ICON[type]}</span>
      <span className="font-bold text-[0.8em] leading-none">{CARD_TYPE_LABEL[type]}</span>
      {damage !== undefined && (
        <span className="text-[0.65em] leading-none opacity-90">{damage}</span>
      )}
    </div>
  );
}

/** 現実/妄想カードが伏せ状態から表向きに反転するアニメーション */
export function RevealCard({
  type,
  damage,
  size = "md",
  revealed,
  delayMs = 0,
  className = "",
}: {
  type: CardType;
  damage?: number;
  size?: CardSize;
  revealed: boolean;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={`card-3d-scene card-deal-in ${SIZE_CLASS[size]} ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={`card-3d-inner ${revealed ? "is-flipped" : ""}`}>
        <div className="card-3d-face">
          <CardBack size={size} />
        </div>
        <div className="card-3d-face card-3d-face-back">
          <CardTypeFace type={type} damage={damage} size={size} />
        </div>
      </div>
    </div>
  );
}
