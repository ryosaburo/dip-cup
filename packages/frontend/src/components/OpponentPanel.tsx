"use client";

import {
  CARD_CONFIG,
  SUPPORT_CARD_CONFIG,
  tierOfCardId,
  type PublicRoundOutcome,
} from "@battle/shared";
import { CardBack, RevealPromptCard, SupportCardFace } from "./PlayingCard";

const TOTAL_HAND_SIZE = CARD_CONFIG.small.count + CARD_CONFIG.medium.count + CARD_CONFIG.large.count;

export function OpponentPanel({
  name,
  matchWins,
  isThinking,
  outcome,
  revealed,
}: {
  name: string | null;
  matchWins: number;
  isThinking: boolean;
  outcome: PublicRoundOutcome | null;
  revealed: boolean;
}) {
  return (
    <div className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-semibold text-sm">{name ?? "相手"}</span>
        <span className="text-white/80 text-xs font-bold bg-white/10 rounded-full px-2 py-0.5">
          勝ち {matchWins}
        </span>
      </div>

      {!outcome ? (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-6">
            {Array.from({ length: TOTAL_HAND_SIZE }).map((_, i) => (
              <CardBack
                key={i}
                size="sm"
                className="card-back-idle shadow-lg"
                style={{
                  animationDelay: `${i * 120}ms`,
                  ["--idle-rot" as string]: `${(i - TOTAL_HAND_SIZE / 2) * 3}deg`,
                  zIndex: i,
                }}
              />
            ))}
          </div>
          {isThinking && (
            <span className="text-white/60 text-xs animate-pulse whitespace-nowrap">
              カードを選択中…
            </span>
          )}
        </div>
      ) : (
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
            {outcome.selection.supportCard ? (
              <SupportCardFace
                type={outcome.selection.supportCard}
                label={SUPPORT_CARD_CONFIG[outcome.selection.supportCard].label}
                size="sm"
              />
            ) : (
              outcome.selection.supportCardUsed && (
                <div
                  className="w-12 h-[68px] rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 text-[0.6em] text-center px-1"
                  title="相手はサポートカードを使用しましたが、種類は非公開です"
                >
                  ？
                </div>
              )
            )}
          </div>
          {outcome.voidedCardIds.length > 0 && (
            <p className="text-[0.65rem] text-red-300">こちらの効果で相手のカードを無効化しました</p>
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
      )}
    </div>
  );
}
