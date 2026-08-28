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
  borderColor: string;
}

function playIndexShatterSE() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

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
    // skip
  }
}

export function CrackOverlay({ active }: { active: boolean; lifeRatio?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    playIndexShatterSE();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 画面サイズを直接取得して Canvas 内部ピクセルを初期化
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const centerX = width / 2;
    const centerY = height / 2;

    const shards: Shard[] = [];
    const rings = 5;
    const sectors = 24;

    for (let r = 0; r < rings; r++) {
      const innerR = (r / rings) * (Math.max(width, height) * 0.75);
      const outerR = ((r + 1) / rings) * (Math.max(width, height) * 0.75);

      for (let s = 0; s < sectors; s++) {
        const a1 = (s / sectors) * Math.PI * 2;
        const a2 = ((s + 1) / sectors) * Math.PI * 2;

        const p1: [number, number] = [centerX + Math.cos(a1) * innerR, centerY + Math.sin(a1) * innerR];
        const p2: [number, number] = [centerX + Math.cos(a2) * innerR, centerY + Math.sin(a2) * innerR];
        const p3: [number, number] = [centerX + Math.cos(a2) * outerR, centerY + Math.sin(a2) * outerR];
        const p4: [number, number] = [centerX + Math.cos(a1) * outerR, centerY + Math.sin(a1) * outerR];

        [
          [p1, p2, p3],
          [p1, p3, p4],
        ].forEach((tri) => {
          const triCenterX = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
          const triCenterY = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;

          const angle = Math.atan2(triCenterY - centerY, triCenterX - centerX);
          const speed = Math.random() * 22 + 14;

          const relPoints: [number, number][] = tri.map(([px, py]) => [
            px - triCenterX,
            py - triCenterY,
          ]);

          // 不透明度を高めて確実に視認できるように設定
          const colors = [
            "rgba(255, 255, 255, 0.85)",
            "rgba(200, 230, 255, 0.8)",
            "rgba(230, 210, 255, 0.75)",
            "rgba(20, 25, 45, 0.9)",
          ];

          shards.push({
            points: relPoints,
            x: triCenterX,
            y: triCenterY,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 6,
            vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 6 - 4,
            rotation: 0,
            vRot: (Math.random() - 0.5) * 0.35,
            opacity: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            borderColor: "rgba(255, 255, 255, 1)",
          });
        });
      }
    }

    let animationId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // とある風：0.1秒間の強力な白フラッシュ
      if (elapsed < 0.1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - elapsed * 5})`;
        ctx.fillRect(0, 0, width, height);
      }

      let alive = 0;

      for (const s of shards) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.5; // 重力落下
        s.vx *= 0.97;
        s.rotation += s.vRot;

        if (elapsed > 0.4) {
          s.opacity -= 0.02;
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

          ctx.strokeStyle = s.borderColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.restore();
        }
      }

      if (alive > 0 && elapsed < 3.0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999, // 最前面を保証
      }}
    />
  );
}