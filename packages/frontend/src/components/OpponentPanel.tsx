"use client";

import { DELUSION_SUCCESS_WIN_COUNT, REALITY_CARD_CONFIG, type CardType, type TurnResult } from "@battle/shared";
import { CardBack, GaugeBar, LifeBar, RevealCard } from "./PlayingCard";

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };

export function OpponentPanel({
  name,
  life,
  gauge,
  delusionSuccessCount,
  isAttackerNow,
  pendingDamage,
  outcome,
  wasAttackerInOutcome,
  revealed,
}: {
  name: string | null;
  life: number;
  gauge: number;
  /** 相手が見破られずに成功させた妄想カードの累計回数 */
  delusionSuccessCount: number;
  /** このターン相手が攻撃側かどうか（結果表示中はnull） */
  isAttackerNow: boolean | null;
  /** 相手が攻撃側で、自分が防御側として確認済みのダメージ量 */
  pendingDamage: number | null;
  outcome: TurnResult | null;
  wasAttackerInOutcome: boolean;
  revealed: boolean;
}) {
  return (
    <div className="pop-panel w-full px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm sm:text-base">{name ?? "相手"}</span>
        <span className="text-[var(--pop-ink-soft)] text-xs sm:text-sm font-bold">ライフ {life}</span>
      </div>
      <LifeBar life={life} className="mb-1.5" />
      <div className="flex items-center justify-between mb-1">
        <span className="text-fuchsia-500 text-xs sm:text-sm font-semibold">妄想ゲージ</span>
        <span className="text-fuchsia-500 text-xs sm:text-sm font-bold">{gauge}%</span>
      </div>
      <GaugeBar gauge={gauge} className="mb-2" />
      <div className="flex items-center justify-between mb-2">
        <span className="text-sky-500 text-xs sm:text-sm font-semibold">妄想成功（見破られず）</span>
        <span className="text-sky-500 text-xs sm:text-sm font-bold">
          {delusionSuccessCount}/{DELUSION_SUCCESS_WIN_COUNT}
        </span>
      </div>

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
              size="md"
              revealed={revealed}
            />
            <div
              className={`text-xs sm:text-sm font-bold ${revealed ? "card-pop-in" : "opacity-0"} ${
                outcome.wasCaught ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {outcome.wasCaught ? "🎯 見破った！" : "😱 見破れなかった…"}
            </div>
          </div>
        ) : (
          <div className={`text-xs sm:text-sm ${revealed ? "card-pop-in" : "opacity-0"}`}>
            <p className="text-[var(--pop-ink-soft)] mb-1">
              {name ?? "相手"}の予想：「{CARD_TYPE_LABEL[outcome.defense.prediction]}」
            </p>
            <p
              className={`font-bold ${outcome.wasCaught ? "text-rose-500" : "text-emerald-500"}`}
            >
              {outcome.wasCaught ? "😱 見破られた…" : "🎉 見破られなかった！"}
            </p>
          </div>
        )
      ) : isAttackerNow && pendingDamage !== null ? (
        <div className="flex items-center gap-3">
          <div className="relative">
            <CardBack size="md" />
            <span className="absolute -bottom-1 -right-1 bg-[var(--pop-ink)] text-white text-xs font-bold rounded-full px-2 py-0.5 shadow">
              {pendingDamage}
            </span>
          </div>
          <span className="text-[var(--pop-ink-soft)] text-xs sm:text-sm">攻撃してきた…正体不明</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <CardBack size="md" className="card-back-idle" />
          <span className="text-[var(--pop-ink-soft)] text-xs sm:text-sm animate-pulse whitespace-nowrap">
            {isAttackerNow ? "攻撃を選んでいます…" : "見破る準備をしています…"}
          </span>
        </div>
      )}
    </div>
  );
}
