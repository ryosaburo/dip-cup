"use client";

import { REALITY_CARD_CONFIG, type CardType, type TurnResult } from "@battle/shared";
import { CardBack, GaugeBar, LifeBar, RevealCard } from "./PlayingCard";

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };

export function OpponentPanel({
  name,
  life,
  gauge,
  isAttackerNow,
  pendingDamage,
  outcome,
  wasAttackerInOutcome,
  revealed,
}: {
  name: string | null;
  life: number;
  gauge: number;
  /** このターン相手が攻撃側かどうか（結果表示中はnull） */
  isAttackerNow: boolean | null;
  /** 相手が攻撃側で、自分が防御側として確認済みのダメージ量 */
  pendingDamage: number | null;
  outcome: TurnResult | null;
  wasAttackerInOutcome: boolean;
  revealed: boolean;
}) {
  return (
    <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">{name ?? "相手"}</span>
        <span className="text-white/80 text-xs font-bold">ライフ {life}</span>
      </div>
      <LifeBar life={life} className="mb-1.5" />
      <div className="flex items-center justify-between mb-1">
        <span className="text-fuchsia-300/80 text-[0.65rem]">妄想ゲージ</span>
        <span className="text-fuchsia-300/80 text-[0.65rem] font-bold">{gauge}%</span>
      </div>
      <GaugeBar gauge={gauge} className="mb-2" />

      {outcome ? (
        wasAttackerInOutcome ? (
          <div className="flex items-center gap-3">
            <RevealCard
              type={outcome.attack.cardType}
              label={
                outcome.attack.cardType === "reality" && outcome.attack.realityCardId
                  ? REALITY_CARD_CONFIG[outcome.attack.realityCardId].label
                  : undefined
              }
              damage={
                outcome.damageDealt ||
                outcome.selfDamage ||
                outcome.selfHeal ||
                outcome.defenderHeal ||
                Math.abs(outcome.gaugeDelta) ||
                undefined
              }
              size="sm"
              revealed={revealed}
            />
            <div
              className={`text-xs font-bold ${revealed ? "card-pop-in" : "opacity-0"} ${
                outcome.wasCaught ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {outcome.wasCaught ? "🎯 見破った！" : "😱 見破れなかった…"}
            </div>
          </div>
        ) : (
          <div className={`text-xs ${revealed ? "card-pop-in" : "opacity-0"}`}>
            <p className="text-white/70 mb-1">
              相手の予想：「{CARD_TYPE_LABEL[outcome.defense.prediction]}」
            </p>
            <p
              className={`font-bold ${outcome.wasCaught ? "text-red-400" : "text-emerald-400"}`}
            >
              {outcome.wasCaught ? "😱 見破られた…" : "🎉 見破られなかった！"}
            </p>
          </div>
        )
      ) : isAttackerNow && pendingDamage !== null ? (
        <div className="flex items-center gap-3">
          <div className="relative">
            <CardBack size="sm" />
            <span className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[0.6rem] font-bold rounded px-1">
              {pendingDamage}
            </span>
          </div>
          <span className="text-white/60 text-xs">攻撃してきた…正体不明</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <CardBack size="sm" className="card-back-idle shadow-lg" />
          <span className="text-white/60 text-xs animate-pulse whitespace-nowrap">
            {isAttackerNow ? "攻撃を選んでいます…" : "見破る準備をしています…"}
          </span>
        </div>
      )}
    </div>
  );
}
