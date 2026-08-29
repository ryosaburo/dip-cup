"use client";

import { useState } from "react";

/**
 * ステージの背景を二層構造にする演出。
 * 手前＝ふわふわ妄想寄りのパステル背景、奥＝それとは真逆の、冷たく沈んだ「現実」の背景。
 * 自分のライフが減るほど手前の背景にヒビが増え、隙間から奥の「現実」がのぞくようになる。
 * ライフ0で手前のヒビが最大まで達し、そのまま CrackOverlay の全画面粉砕演出へとつながる。
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

let maskIdSeq = 0;

export function LifeCrackBackground({ lifeRatio }: { lifeRatio: number }) {
  const ratio = Math.max(0, Math.min(1, lifeRatio));
  const [maskId] = useState(() => `life-crack-mask-${++maskIdSeq}`);

  return (
    <>
      {/* 奥＝真逆の雰囲気の「現実」背景 */}
      <div className="pop-stage-reality-bg" aria-hidden="true" />

      {/* 手前のパステル背景を、ヒビの形にくり抜くマスク */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          {/* maskContentUnits を objectBoundingBox にし、0〜1の座標系でヒビを描く
              （外側svgのviewportに依存する%指定は幅0高さ0では解決できないため使わない） */}
          <mask
            id={maskId}
            maskUnits="objectBoundingBox"
            maskContentUnits="objectBoundingBox"
            x="0"
            y="0"
            width="1"
            height="1"
          >
            <rect x="0" y="0" width="1" height="1" fill="white" />
            <g transform="scale(0.01)">
              {CRACKS.map((crack, i) => {
                const visible = ratio <= crack.threshold;
                const depth = visible ? Math.min(1, (crack.threshold - ratio) / crack.threshold) : 0;
                return (
                  <polyline
                    key={i}
                    points={crack.points}
                    fill="none"
                    stroke="black"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={visible ? 1.6 + depth * 3.4 : 0}
                    opacity={visible ? 0.9 : 0}
                    style={{ transition: "stroke-width 0.6s ease, opacity 0.6s ease" }}
                  />
                );
              })}
            </g>
          </mask>
        </defs>
      </svg>

      {/* 手前＝ふわふわ妄想寄りの背景（ライフが減るほどヒビ状に透けていく） */}
      <div
        className="pop-stage-front-bg"
        aria-hidden="true"
        style={{
          WebkitMaskImage: `url(#${maskId})`,
          maskImage: `url(#${maskId})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      />
    </>
  );
}
