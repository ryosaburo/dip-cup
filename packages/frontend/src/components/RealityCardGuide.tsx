"use client";

import { useState } from "react";
import { REALITY_CARD_CONFIG, REALITY_CARD_IDS } from "@battle/shared";

/** ログイン画面に置く、現実カード全種の効果一覧。折りたたみ式にして初見の情報量を抑える */
export function RealityCardGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="pop-panel p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pop-bounce w-full flex items-center justify-between text-left"
      >
        <h2 className="font-bold text-[var(--pop-ink)]">現実カード一覧</h2>
        <span className="text-[var(--pop-ink-soft)] text-sm">{open ? "閉じる ▲" : "見る ▼"}</span>
      </button>

      {open && (
        <ul className="space-y-2">
          {REALITY_CARD_IDS.map((id) => {
            const config = REALITY_CARD_CONFIG[id];
            return (
              <li
                key={id}
                className="rounded-2xl bg-sky-50 border-2 border-sky-100 px-3 py-2.5 space-y-0.5"
              >
                <p className="font-bold text-sky-600 text-sm">{config.label}</p>
                <p className="text-[var(--pop-ink-soft)] text-xs leading-relaxed">{config.description}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
