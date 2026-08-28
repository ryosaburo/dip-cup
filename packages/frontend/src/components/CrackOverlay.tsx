// packages/frontend/src/components/CrackOverlay.tsx
"use client";

import { useEffect, useRef } from "react";

interface Shard {
  points: [number, number][];
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  opacity: number;
  color: string;
}

// とある風アイキャッチ破砕音（Web Audio API・高周波ノイズ＋金属共鳴）
function playIndexShatterSE() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    // 1. ガラス粉砕の衝撃ホワイトノイズ
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(4500, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // 2. 金属的なキーンという共鳴余韻
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(3200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.45);

    oscGain.gain.setValueAtTime(0.35, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // ユーザー操作前の自動再生ブロック時はスキップ
  }
}

interface CrackOverlayProps {
  active: boolean;
  onFinished?: () => void;
}

export function CrackOverlay({ active, onFinished }: CrackOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    playIndexShatterSE();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const centerX = width / 2;
    const centerY = height / 2;

    // 中心から放射状に広がる鋭角な破片（とある風）を生成
    const shards: Shard[] = [];
    const rings = 4;
    const sectors = 20;

    for (let r = 0; r < rings; r++) {
      const innerRadius = (r / rings) * (Math.max(width, height) * 0.7);
      const outerRadius = ((r + 1) / rings) * (Math.max(width, height) * 0.7);

      for (let s = 0; s < sectors; s++) {
        const a1 = (s / sectors) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
        const a2 = ((s + 1) / sectors) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;

        const p1: [number, number] = [
          centerX + Math.cos(a1) * innerRadius,
          centerY + Math.sin(a1) * innerRadius,
        ];
        const p2: [number, number] = [
          centerX + Math.cos(a2) * innerRadius,
          centerY + Math.sin(a2) * innerRadius,
        ];
        const p3: [number, number] = [
          centerX + Math.cos(a2) * outerRadius,
          centerY + Math.sin(a2) * outerRadius,
        ];
        const p4: [number, number] = [
          centerX + Math.cos(a1) * outerRadius,
          centerY + Math.sin(a1) * outerRadius,
        ];

        [
          [p1, p2, p3],
          [p1, p3, p4],
        ].forEach((tri) => {
          const triCenterX = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
          const triCenterY = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;

          const angle = Math.atan2(triCenterY - centerY, triCenterX - centerX);
          const speed = Math.random() * 18 + 12;

          const relPoints: [number, number][] = tri.map(([px, py]) => [
            px - triCenterX,
            py - triCenterY,
          ]);

          const alpha = (Math.random() * 0.35 + 0.5).toFixed(2);
          const colors = [
            `rgba(255, 255, 255, ${alpha})`,
            `rgba(224, 242, 254, ${alpha})`,
            `rgba(199, 210, 254, ${alpha})`,
            `rgba(15, 23, 42, ${alpha})`,
          ];

          shards.push({
            points: relPoints,
            x: triCenterX,
            y: triCenterY,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
            vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 4 - 3,
            rotation: 0,
            vRot: (Math.random() - 0.5) * 0.3,
            opacity: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        });
      }
    }

    let animationId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // 開始直後の一瞬（約0.06秒）の白フラッシュ
      if (elapsed < 0.06) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(0, 0, width, height);
      }

      let alive = 0;

      for (const s of shards) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.4; // 重力加速度
        s.vx *= 0.98;
        s.rotation += s.vRot;

        if (elapsed > 0.35) {
          s.opacity -= 0.025;
        }

        if (s.opacity > 0) {
          alive++;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rotation);
          ctx.globalAlpha = Math.max(0, s.opacity);

          ctx.beginPath();
          ctx.moveTo(s.points[0][0], s.points[0][1]);
          ctx.lineTo(s.points[1][0], s.points[1][1]);
          ctx.lineTo(s.points[2][0], s.points[2][1]);
          ctx.closePath();

          ctx.fillStyle = s.color;
          ctx.fill();

          // ガラスエッジの発光ライン
          ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.restore();
        }
      }

      if (alive > 0 && elapsed < 2.2) {
        animationId = requestAnimationFrame(animate);
      } else if (onFinished) {
        onFinished();
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [active, onFinished]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
    />
  );
}