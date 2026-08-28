"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

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

const emptySubscribe = () => () => {};

export function CrackOverlay({
  active,
  lifeRatio = 1,
}: {
  active: boolean;
  /** 1.0 (満タン: 100) 〜 0.0 (瀕死/敗北: 0) */
  lifeRatio?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // 1. ライフ 100 -> 0 にかけて滑らかにヒビが侵食していく描画
  useEffect(() => {
    if (active || !mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // ダメージ量: 0.0 (満タン) 〜 1.0 (ライフ0直前)
    const damage = Math.max(0, Math.min(1, 1 - lifeRatio));
    if (damage <= 0.02) return; // ほぼ満タンの時はヒビなし

    const maxRadius = Math.max(width, height) * 0.75 * damage;
    const mainBranches = 8;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + damage * 0.55})`;
    ctx.lineWidth = 1.0 + damage * 1.8;
    ctx.shadowColor = "rgba(180, 220, 255, 0.75)";
    ctx.shadowBlur = 3 + damage * 7;

    for (let b = 0; b < mainBranches; b++) {
      let curX = centerX;
      let curY = centerY;
      const baseAngle = (b / mainBranches) * Math.PI * 2 + Math.sin(b * 3) * 0.2;

      ctx.beginPath();
      ctx.moveTo(curX, curY);

      // ダメージが多いほど節点（ギザギザ）が増えて遠くまで伸びる
      const segments = Math.floor(4 + damage * 14);
      for (let i = 1; i <= segments; i++) {
        const segProgress = i / segments;
        const currentR = maxRadius * segProgress;
        const jitterAngle = baseAngle + Math.sin(b * 12 + i * 2.8) * 0.38;

        curX = centerX + Math.cos(jitterAngle) * currentR;
        curY = centerY + Math.sin(jitterAngle) * currentR;
        ctx.lineTo(curX, curY);

        // ダメージが中盤（40%以上）から枝分かれの小ヒビが発生
        if (damage > 0.4 && i % 2 === 0) {
          const subAngle = jitterAngle + (b % 2 === 0 ? 0.65 : -0.65);
          const subLen = (30 + i * 4) * (damage - 0.3);
          ctx.moveTo(curX, curY);
          ctx.lineTo(
            curX + Math.cos(subAngle) * subLen,
            curY + Math.sin(subAngle) * subLen
          );
          ctx.moveTo(curX, curY);
        }

        // ダメージが終盤（70%以上）になると蜘蛛の巣状の横糸（リング状亀裂）が繋がる
        if (damage > 0.7 && i % 3 === 0) {
          const nextAngle = baseAngle + (Math.PI * 2) / mainBranches;
          const nextX = centerX + Math.cos(nextAngle) * currentR * 0.9;
          const nextY = centerY + Math.sin(nextAngle) * currentR * 0.9;
          ctx.moveTo(curX, curY);
          ctx.lineTo(nextX, nextY);
          ctx.moveTo(curX, curY);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }, [active, lifeRatio, mounted]);

  // 2. ライフ0（敗北）時のパリーン粉砕アニメーション（無音）
  useEffect(() => {
    if (!active || !mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const centerX = width / 2;
    const centerY = height / 2;

    const shards: Shard[] = [];
    const rings = 5;
    const sectors = 20;

    for (let r = 0; r < rings; r++) {
      const innerRadius = (r / rings) * (Math.max(width, height) * 0.6);
      const outerRadius = ((r + 1) / rings) * (Math.max(width, height) * 0.6);

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
          const speed = Math.random() * 8 + 4;

          const relPoints: [number, number][] = tri.map(([px, py]) => [
            px - triCenterX,
            py - triCenterY,
          ]);

          const colors = [
            "rgba(255, 255, 255, 0.9)",
            "rgba(200, 230, 255, 0.85)",
            "rgba(220, 200, 255, 0.8)",
            "rgba(70, 50, 100, 0.85)",
          ];

          shards.push({
            points: relPoints,
            x: triCenterX,
            y: triCenterY,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 3,
            vy: Math.sin(angle) * speed - Math.random() * 5 - 2,
            rotation: 0,
            vRot: (Math.random() - 0.5) * 0.15,
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

      if (elapsed < 0.08) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 0.8 - elapsed * 10)})`;
        ctx.fillRect(0, 0, width, height);
      }

      let alive = 0;

      for (const s of shards) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.35;
        s.vx *= 0.98;
        s.rotation += s.vRot;

        if (elapsed > 0.8) {
          s.opacity -= 0.015;
        }

        if (s.opacity > 0 && s.y < height + 100) {
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

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
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
  }, [active, mounted]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483647,
        pointerEvents: "none",
      }}
    />,
    document.body
  );
}