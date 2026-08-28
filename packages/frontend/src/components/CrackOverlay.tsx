"use client";

/**
 * 自分のライフが減るほど画面（このふわふわポップなUI）にヒビが増えていく演出。
 * ライフが0になると完全に砕け、現実に引き戻される（敗北）ことを視覚的に示す。
 */

/** ヒビ1本ごとに「このライフ比率を下回ったら見え始める」しきい値を持たせ、段階的に増やしていく */
const CRACKS: { threshold: number; points: string }[] = [
  { threshold: 0.85, points: "50,0 46,15 53,28 48,42" },
  { threshold: 0.7, points: "0,35 14,32 22,40 30,33 38,38" },
  { threshold: 0.7, points: "100,45 86,42 78,50 70,44" },
  { threshold: 0.55, points: "20,100 24,85 18,72 26,60" },
  { threshold: 0.55, points: "80,100 76,88 84,74 74,64" },
  { threshold: 0.4, points: "0,70 10,66 16,74 8,82" },
  { threshold: 0.4, points: "100,20 90,24 94,32 86,36" },
  { threshold: 0.25, points: "50,42 44,52 54,58 46,68 52,76" },
  { threshold: 0.15, points: "30,33 34,44 26,50 32,58" },
  { threshold: 0.15, points: "70,44 66,54 74,60 64,66" },
];

export function CrackOverlay({ lifeRatio }: { lifeRatio: number }) {
  const ratio = Math.max(0, Math.min(1, lifeRatio));
  const shattered = ratio <= 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]">
      {/* ライフが減るほど画面全体をうっすら曇らせて、脆さを感じさせる */}
      <div
        className="absolute inset-0 bg-slate-900 transition-opacity duration-700"
        style={{ opacity: (1 - ratio) * 0.28 }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {CRACKS.map((crack, i) => (
          <polyline
            key={i}
            points={crack.points}
            className={`crack-line ${ratio <= crack.threshold ? "crack-visible" : ""} ${
              shattered ? "crack-shattered" : ""
            }`}
          />
        ))}
      </svg>
      {shattered && (
        <div className="crack-shatter-flash absolute inset-0 bg-white" />
      )}
    </div>
  );
}
