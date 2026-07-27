import { useEffect, useRef } from "react";

export default function ThunderNeonCanvas({ isCritical = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle nodes for grid line web
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      size: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? "#00F0FF" : "#B026FF",
    }));

    let lightningTimer = 0;
    let lightningSegments = [];

    const generateLightning = () => {
      lightningSegments = [];
      let x = Math.random() * width;
      let y = 0;
      const targetY = height * 0.8;

      while (y < targetY) {
        const nextX = x + (Math.random() - 0.5) * 60;
        const nextY = y + Math.random() * 40 + 15;
        lightningSegments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
        x = nextX;
        y = nextY;
      }
    };

    const render = () => {
      ctx.fillStyle = "rgba(5, 8, 17, 0.25)";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle ambient gradient glow
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 3,
        100,
        width / 2,
        height / 3,
        width
      );
      if (isCritical) {
        grad.addColorStop(0, "rgba(255, 46, 85, 0.15)");
        grad.addColorStop(0.5, "rgba(176, 38, 255, 0.1)");
        grad.addColorStop(1, "rgba(5, 8, 17, 0.8)");
      } else {
        grad.addColorStop(0, "rgba(0, 240, 255, 0.08)");
        grad.addColorStop(0.5, "rgba(176, 38, 255, 0.05)");
        grad.addColorStop(1, "rgba(5, 8, 17, 0.8)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw particles & web lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isCritical ? "#FF2E55" : p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = isCritical ? "#FF2E55" : p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby particles with glowing neon lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isCritical
              ? `rgba(255, 46, 85, ${1 - dist / 130})`
              : `rgba(0, 240, 255, ${(1 - dist / 130) * 0.35})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Lightning Thunder Flash effect
      lightningTimer++;
      const strikeInterval = isCritical ? 60 : 180;
      if (lightningTimer % strikeInterval === 0) {
        generateLightning();
      }

      if (lightningSegments.length > 0 && lightningTimer % strikeInterval < 6) {
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = isCritical ? "#FF2E55" : "#00F0FF";
        ctx.strokeStyle = isCritical ? "#FFFFFF" : "#E0FFFF";
        ctx.lineWidth = isCritical ? 3 : 2;

        ctx.beginPath();
        for (const seg of lightningSegments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isCritical]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-75"
    />
  );
}
