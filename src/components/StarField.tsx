"use client";
import { useEffect, useRef } from "react";

interface Star {
  x: number; y: number;
  size: number; opacity: number;
  twinkleSpeed: number; twinklePhase: number;
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let stars: Star[] = [];

    function init() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
      const count = Math.floor((window.innerWidth * window.innerHeight) / 3000);
      stars = Array.from({ length: count }, () => ({
        x:            Math.random() * canvas!.width,
        y:            Math.random() * canvas!.height,
        size:         Math.random() * 1.4 + 0.2,
        opacity:      Math.random() * 0.6 + 0.15,
        twinkleSpeed: Math.random() * 0.8 + 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    }

    let t = 0;
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      t += 0.012;
      for (const s of stars) {
        const twinkle = 0.6 + 0.4 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha   = s.opacity * twinkle;
        // Blue-white star colour
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(180, 215, 255, ${alpha})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #000c1f 0%, #000008 70%)",
      }}
    />
  );
}
