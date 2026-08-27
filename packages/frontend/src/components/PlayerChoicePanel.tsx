"use client";

import { useState } from "react";
import {
  DELUSION_DAMAGE_MAX,
  DELUSION_DAMAGE_MIN,
  REALITY_DAMAGE,
  type AttackSelection,
  type CardType,
  type DefenseSelection,
  type TurnResult,
} from "@battle/shared";
import type { GamePhase } from "@/context/GameSocketProvider";
import { GaugeBar, LifeBar, RevealCard } from "./PlayingCard";

const CARD_TYPE_LABEL: Record<CardType, string> = { reality: "現実", delusion: "妄想" };

function StatusHeader({
  name,
  life,
  gauge,
}: {
  name: string | null;
  life: number;
  gauge: number;
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
    </>
  );
}

export function PlayerChoicePanel({
  name,
  life,
  gauge,
  phase,
  pendingDamage,
  onSubmitAttack,
  onSubmitDefense,
  outcome,
  wasAttackerInOutcome,
  revealed,
}: {
  name: string | null;
  life: number;
  gauge: number;
  phase: GamePhase;
  pendingDamage: number | null;
  onSubmitAttack: (attack: AttackSelection) => void;
  onSubmitDefense: (defense: DefenseSelection) => void;
  outcome: TurnResult | null;
  wasAttackerInOutcome: boolean;
  revealed: boolean;
}) {
  const [cardType, setCardType] = useState<CardType | null>(null);
  const [delusionDamage, setDelusionDamage] = useState(
    Math.round((DELUSION_DAMAGE_MIN + DELUSION_DAMAGE_MAX) / 2),
  );

  function handleSubmitAttack() {
    if (!cardType) return;
    onSubmitAttack({
      cardType,
      delusionDamage: cardType === "delusion" ? delusionDamage : undefined,
    });
  }

  if (phase === "turn_result" && outcome) {
    return (
      <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
        <StatusHeader name={name} life={life} gauge={gauge} />
        {wasAttackerInOutcome ? (
          <div className="flex items-center gap-3">
            <RevealCard
              type={outcome.attack.cardType}
              damage={outcome.attack.delusionDamage}
              size="sm"
              revealed={revealed}
            />
            <div
              className={`text-xs font-bold ${revealed ? "card-pop-in" : "opacity-0"} ${
                outcome.wasCaught ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {outcome.wasCaught ? "😱 見破られた…" : "🎉 見破られなかった！"}
            </div>
          </div>
        ) : (
          <div className={`text-xs ${revealed ? "card-pop-in" : "opacity-0"}`}>
            <p className="text-white/70 mb-1">
              自分の予想：「{CARD_TYPE_LABEL[outcome.defense.prediction]}」
            </p>
            <p
              className={`font-bold ${outcome.wasCaught ? "text-emerald-400" : "text-red-400"}`}
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
      <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 space-y-3">
        <StatusHeader name={name} life={life} gauge={gauge} />

        <div className="space-y-1.5">
          <p className="text-white/60 text-[0.65rem]">
            あなたの攻撃ターンです。どちらのカードを出しますか？（見破られると効果は自分に跳ね返ります）
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setCardType("reality")}
              className={`transition-transform ${
                cardType === "reality" ? "-translate-y-1 ring-2 ring-white rounded-lg" : ""
              }`}
            >
              <div className="w-16 h-[90px] rounded-lg border-2 border-white shadow-md bg-gradient-to-br from-sky-400 to-slate-600 text-white flex flex-col items-center justify-center gap-0.5">
                <span className="text-[1.3em]">🪨</span>
                <span className="font-bold text-sm">現実</span>
                <span className="text-[0.6em] opacity-90">固定{REALITY_DAMAGE}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCardType("delusion")}
              className={`transition-transform ${
                cardType === "delusion" ? "-translate-y-1 ring-2 ring-white rounded-lg" : ""
              }`}
            >
              <div className="w-16 h-[90px] rounded-lg border-2 border-white shadow-md bg-gradient-to-br from-fuchsia-500 to-purple-800 text-white flex flex-col items-center justify-center gap-0.5">
                <span className="text-[1.3em]">🌀</span>
                <span className="font-bold text-sm">妄想</span>
                <span className="text-[0.6em] opacity-90">自由{delusionDamage}</span>
              </div>
            </button>
          </div>
        </div>

        {cardType === "delusion" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[0.65rem] text-white/60">
              <span>申告ダメージ量</span>
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
            <p className="text-[0.6rem] text-white/40">
              見破られなければこの量がそのまま通る／見破られると自分に反動＋この量だけ妄想ゲージが上がる
            </p>
          </div>
        )}

        <button
          disabled={!cardType}
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
        <StatusHeader name={name} life={life} gauge={gauge} />

        <div className="rounded-md bg-white/10 px-3 py-3 text-center">
          <p className="text-white/70 text-[0.7rem] mb-1">相手が攻撃してきました</p>
          <p className="text-white font-bold text-2xl">{pendingDamage}ダメージ</p>
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

  // waiting_attack / waiting_defense / waiting_for_result
  const waitingMessage =
    phase === "waiting_attack"
      ? "相手の攻撃を待っています…"
      : phase === "waiting_defense"
        ? "相手が見破ろうとしています…"
        : "判定中…";

  return (
    <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
      <StatusHeader name={name} life={life} gauge={gauge} />
      <p className="text-white/50 text-xs text-center animate-pulse py-2">{waitingMessage}</p>
    </div>
  );
}
