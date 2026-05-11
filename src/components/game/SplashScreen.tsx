'use client';

import React, { useEffect, useRef } from 'react';
import { CYAN, MAGENTA, DARK_BG } from '@/lib/game-types';
import { soundEngine } from '@/lib/sound-engine';

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface LightningBolt {
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
  color: string;
}

export default function SplashScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const frameRef = useRef(0);
  const soundPlayedRef = useRef({ titleAppear: false, subtitleAppear: false, tapReady: false });
  const particlesRef = useRef<SplashParticle[]>([]);
  const lightningRef = useRef<LightningBolt[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    startTimeRef.current = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Helper: generate lightning bolt between two points
    const generateLightning = (x1: number, y1: number, x2: number, y2: number, color: string): LightningBolt => {
      const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
      const segments = 8 + Math.floor(Math.random() * 6);
      const dx = (x2 - x1) / segments;
      const dy = (y2 - y1) / segments;
      for (let i = 1; i < segments; i++) {
        points.push({
          x: x1 + dx * i + (Math.random() - 0.5) * 40,
          y: y1 + dy * i + (Math.random() - 0.5) * 40,
        });
      }
      points.push({ x: x2, y: y2 });
      return { points, life: 12, maxLife: 12, color };
    };

    // Helper: spawn splash particles
    const spawnSplashParticles = (x: number, y: number, count: number, color: string, spread: number = 3) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * spread,
          vy: (Math.random() - 0.5) * spread - 1,
          life: 30 + Math.random() * 40,
          maxLife: 70,
          color,
          size: 1 + Math.random() * 3,
        });
      }
    };

    const render = () => {
      animRef.current = requestAnimationFrame(render);
      frameRef.current++;
      const cw = canvas.width;
      const ch = canvas.height;
      const elapsed = (performance.now() - startTimeRef.current) / 1000; // seconds

      // ====== BACKGROUND ======
      ctx.fillStyle = DARK_BG;
      ctx.fillRect(0, 0, cw, ch);

      // Pulsing neon grid background
      const gridPulse = 0.03 + Math.sin(elapsed * 2) * 0.015;
      ctx.globalAlpha = gridPulse;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1;
      const gridOff = (frameRef.current * 0.3) % 80;
      for (let x = gridOff; x < cw; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
      }
      for (let y = 0; y < ch; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Horizontal glow line at center
      const glowAlpha = Math.min(0.15, elapsed * 0.05);
      const gradient = ctx.createLinearGradient(0, ch * 0.55, cw, ch * 0.55);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.3, `rgba(0, 255, 255, ${glowAlpha})`);
      gradient.addColorStop(0.7, `rgba(0, 255, 255, ${glowAlpha})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, ch * 0.54, cw, ch * 0.04);

      // ====== PHASE 1 (0-1s): STICKMAN WALKS IN ======
      if (elapsed < 1) {
        const progress = Math.min(elapsed / 0.8, 1); // 0.8s to walk in
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const stickmanTargetX = cw * 0.5;
        const stickmanStartX = -50;
        const sx = stickmanStartX + (stickmanTargetX - stickmanStartX) * eased;
        const sy = ch * 0.55;
        const animFrame = frameRef.current;

        // Neon trail behind stickman
        const trailLength = Math.min(12, Math.floor(eased * 15));
        for (let i = 1; i <= trailLength; i++) {
          const tx = sx - i * 8;
          const alpha = 0.4 - i * 0.03;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = CYAN;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tx, sy - 28 + Math.sin(animFrame * 0.1 + i) * 2, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(tx, sy - 21); ctx.lineTo(tx, sy - 5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Walking stickman
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = CYAN;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2.5;
        // Head
        ctx.beginPath(); ctx.arc(sx, sy - 38, 9, 0, Math.PI * 2); ctx.stroke();
        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx + 3, sy - 39, 2, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.strokeStyle = CYAN;
        ctx.beginPath(); ctx.moveTo(sx, sy - 29); ctx.lineTo(sx, sy - 10); ctx.stroke();
        // Arms (swinging)
        const armSwing = Math.sin(animFrame * 0.35) * 12;
        ctx.beginPath(); ctx.moveTo(sx, sy - 25); ctx.lineTo(sx - 12, sy - 18 + armSwing); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 25); ctx.lineTo(sx + 12, sy - 18 - armSwing); ctx.stroke();
        // Legs (walking)
        const legSwing = Math.sin(animFrame * 0.35) * 14;
        ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx - 8 + legSwing * 0.3, sy + legSwing); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx + 8 - legSwing * 0.3, sy - legSwing); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ====== PHASE 2 (1-2s): TITLE APPEARS LETTER BY LETTER ======
      if (elapsed >= 1) {
        const titleText = 'NEON STICKMAN';
        const lettersToShow = Math.min(titleText.length, Math.floor((elapsed - 1) / (1 / titleText.length) * 1.2));
        const visibleTitle = titleText.slice(0, lettersToShow);

        // Sound effect when title starts appearing
        if (!soundPlayedRef.current.titleAppear && lettersToShow > 0) {
          soundPlayedRef.current.titleAppear = true;
          soundEngine.init();
          soundEngine.playDramaticMoment();
        }

        // Draw title with neon glow
        const titleY = ch * 0.32;
        const titleSize = Math.min(cw * 0.08, 56);
        ctx.save();
        ctx.font = `bold ${titleSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = CYAN;
        ctx.fillStyle = CYAN;
        ctx.fillText(visibleTitle, cw / 2, titleY);
        // Inner bright
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fillText(visibleTitle, cw / 2, titleY);
        // White core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fillText(visibleTitle, cw / 2, titleY);
        ctx.globalAlpha = 1;
        ctx.restore();

        // Lightning around title (random intervals)
        if (elapsed >= 1.3 && Math.random() < 0.06) {
          const side = Math.random() > 0.5 ? 1 : -1;
          const titleWidth = ctx.measureText ? titleText.length * titleSize * 0.6 : cw * 0.5;
          const boltX = cw / 2 + side * (titleWidth * 0.4 + Math.random() * 60);
          lightningRef.current.push(
            generateLightning(boltX, titleY - titleSize * 0.6, boltX + (Math.random() - 0.5) * 80, titleY + titleSize * 0.6, CYAN)
          );
        }
      }

      // ====== PHASE 3 (2-3s): SUBTITLE SLIDES IN ======
      if (elapsed >= 2) {
        const subtitleText = 'STICK WAR';
        const slideProgress = Math.min((elapsed - 2) / 0.6, 1);
        const eased = 1 - Math.pow(1 - slideProgress, 3);
        const subtitleY = ch * 0.42 + (1 - eased) * 40; // slides up from below
        const subtitleAlpha = eased;
        const subtitleSize = Math.min(cw * 0.06, 40);

        // Sound when subtitle appears
        if (!soundPlayedRef.current.subtitleAppear && slideProgress > 0) {
          soundPlayedRef.current.subtitleAppear = true;
          soundEngine.init();
          soundEngine.playReinforcement();
        }

        ctx.save();
        ctx.globalAlpha = subtitleAlpha;
        ctx.font = `bold ${subtitleSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Magenta glow
        ctx.shadowBlur = 25;
        ctx.shadowColor = MAGENTA;
        ctx.fillStyle = MAGENTA;
        ctx.fillText(subtitleText, cw / 2, subtitleY);
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff00ff';
        ctx.fillText(subtitleText, cw / 2, subtitleY);
        // White core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6 * subtitleAlpha;
        ctx.fillText(subtitleText, cw / 2, subtitleY);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // ====== STICKMAN IDLE ANIMATION (after walking in) ======
      if (elapsed >= 1) {
        const sx = cw * 0.5;
        const sy = ch * 0.55;
        const animFrame = frameRef.current;
        const idleTime = elapsed - 1;

        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = CYAN;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2.5;

        // Combat stance idle: slight bob, looking around
        const combatBob = Math.sin(animFrame * 0.08) * 2;
        const lookDir = Math.sin(animFrame * 0.02) > 0 ? 1 : -1; // looking left/right slowly
        const headTilt = Math.sin(animFrame * 0.03) * 0.1;

        // Head
        ctx.beginPath(); ctx.arc(sx + lookDir * 2, sy - 38 + combatBob, 9, 0, Math.PI * 2); ctx.stroke();
        // Eye (looks around)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx + lookDir * 5, sy - 39 + combatBob, 2, 0, Math.PI * 2); ctx.fill();
        // Body (slight lean)
        ctx.strokeStyle = CYAN;
        ctx.beginPath();
        ctx.moveTo(sx + lookDir * 1, sy - 29 + combatBob);
        ctx.lineTo(sx - lookDir * 2, sy - 10 + combatBob);
        ctx.stroke();
        // Arms: combat stance (one up, one ready)
        const armAnim = Math.sin(animFrame * 0.06) * 3;
        // Left arm - raised guard
        ctx.beginPath();
        ctx.moveTo(sx, sy - 25 + combatBob);
        ctx.lineTo(sx - 14, sy - 30 + combatBob + armAnim);
        ctx.stroke();
        // Right arm - ready to punch
        ctx.beginPath();
        ctx.moveTo(sx, sy - 25 + combatBob);
        ctx.lineTo(sx + 12, sy - 20 + combatBob - armAnim);
        ctx.stroke();
        // Fist on right hand
        ctx.fillStyle = CYAN;
        ctx.beginPath(); ctx.arc(sx + 12, sy - 20 + combatBob - armAnim, 3, 0, Math.PI * 2); ctx.fill();
        // Legs: combat stance (wider, slight bounce)
        ctx.strokeStyle = CYAN;
        const legBounce = Math.sin(animFrame * 0.1) * 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - lookDir * 2, sy - 10 + combatBob);
        ctx.lineTo(sx - 12, sy + legBounce + combatBob);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - lookDir * 2, sy - 10 + combatBob);
        ctx.lineTo(sx + 12, sy - legBounce + combatBob);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Spawn idle particles around stickman occasionally
        if (idleTime > 0.5 && Math.random() < 0.08) {
          spawnSplashParticles(sx + (Math.random() - 0.5) * 30, sy - 20, 1, CYAN, 1);
        }
      }

      // ====== FLOATING PARTICLES (always active after phase 2) ======
      if (elapsed >= 1.2) {
        // Spawn ambient particles near the title
        if (Math.random() < 0.12) {
          const px = cw * 0.3 + Math.random() * cw * 0.4;
          const py = ch * 0.25 + Math.random() * ch * 0.2;
          const color = [CYAN, MAGENTA, '#00ff88', '#8844ff'][Math.floor(Math.random() * 4)];
          spawnSplashParticles(px, py, 1, color, 0.8);
        }
      }

      // Update and draw particles
      const aliveParticles: SplashParticle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // slight gravity
        p.life--;
        if (p.life > 0) {
          const alpha = p.life / p.maxLife;
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          aliveParticles.push(p);
        }
      }
      particlesRef.current = aliveParticles;
      ctx.globalAlpha = 1;

      // Update and draw lightning
      const aliveLightning: LightningBolt[] = [];
      for (const bolt of lightningRef.current) {
        bolt.life--;
        if (bolt.life > 0) {
          const alpha = bolt.life / bolt.maxLife;
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = bolt.color;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = bolt.color;
          ctx.beginPath();
          ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
          for (let i = 1; i < bolt.points.length; i++) {
            ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
          }
          ctx.stroke();
          // Thinner core
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
          for (let i = 1; i < bolt.points.length; i++) {
            ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          aliveLightning.push(bolt);
        }
      }
      lightningRef.current = aliveLightning;
      ctx.globalAlpha = 1;

      // ====== PHASE 4 (3-4s): LOADING BAR ======
      if (elapsed >= 3 && elapsed < 4.5) {
        const loadProgress = Math.min((elapsed - 3) / 1.2, 1);
        const barWidth = Math.min(cw * 0.6, 400);
        const barHeight = 8;
        const barX = (cw - barWidth) / 2;
        const barY = ch * 0.62;

        // Background bar
        ctx.fillStyle = '#ffffff10';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Filled portion with neon cyan gradient
        const barGrad = ctx.createLinearGradient(barX, barY, barX + barWidth * loadProgress, barY);
        barGrad.addColorStop(0, CYAN);
        barGrad.addColorStop(1, '#00aaff');
        ctx.fillStyle = barGrad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = CYAN;
        ctx.fillRect(barX, barY, barWidth * loadProgress, barHeight);
        ctx.shadowBlur = 0;

        // Loading text
        const loadDots = '.'.repeat(Math.floor(elapsed * 3) % 4);
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffff88';
        ctx.fillText(`LOADING${loadDots}`, cw / 2, barY + 28);

        // Percentage
        ctx.fillStyle = CYAN;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${Math.floor(loadProgress * 100)}%`, cw / 2, barY - 10);
      }

      // ====== PHASE 5 (4.5s+): TAP TO START ======
      if (elapsed >= 4.5) {
        const pulseAlpha = 0.6 + Math.sin(elapsed * 4) * 0.35;
        const tapFontSize = Math.min(cw * 0.05, 28);
        ctx.save();
        // Draw a subtle rounded rect behind the text for better visibility on mobile
        const tapText = 'TAP TO START';
        ctx.font = `bold ${tapFontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(tapText).width;
        const tapY = ch * 0.72;
        const padding = 16;
        const rectX = (cw - textWidth) / 2 - padding;
        const rectY = tapY - tapFontSize / 2 - padding / 2;
        const rectW = textWidth + padding * 2;
        const rectH = tapFontSize + padding;

        // Background pill for touch target visibility
        ctx.globalAlpha = pulseAlpha * 0.12;
        ctx.fillStyle = CYAN;
        ctx.beginPath();
        const radius = rectH / 2;
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectW - radius, rectY);
        ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
        ctx.lineTo(rectX + rectW, rectY + rectH - radius);
        ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - radius, rectY + rectH);
        ctx.lineTo(rectX + radius, rectY + rectH);
        ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        ctx.fill();

        // Border for the pill
        ctx.globalAlpha = pulseAlpha * 0.3;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Text
        ctx.globalAlpha = pulseAlpha;
        ctx.shadowBlur = 20;
        ctx.shadowColor = CYAN;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(tapText, cw / 2, tapY);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Sound when tap ready appears
        if (!soundPlayedRef.current.tapReady) {
          soundPlayedRef.current.tapReady = true;
          soundEngine.init();
          soundEngine.playAbilityReady();
        }

        // Extra lightning bursts
        if (Math.random() < 0.03) {
          const side = Math.random() > 0.5 ? 1 : -1;
          lightningRef.current.push(
            generateLightning(
              cw / 2 + side * (cw * 0.3),
              ch * 0.15,
              cw / 2 + side * (cw * 0.25) + (Math.random() - 0.5) * 100,
              ch * 0.5,
              side > 0 ? CYAN : MAGENTA
            )
          );
        }
      }

      // ====== DECORATIVE: Small neon dots in corners ======
      if (elapsed >= 1) {
        const dotAlpha = 0.1 + Math.sin(elapsed * 3) * 0.05;
        ctx.globalAlpha = dotAlpha;
        ctx.fillStyle = CYAN;
        for (let i = 0; i < 6; i++) {
          const dx = 20 + i * 15;
          ctx.beginPath(); ctx.arc(dx, 20, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cw - dx, ch - 20, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = MAGENTA;
        for (let i = 0; i < 6; i++) {
          const dx = 25 + i * 15;
          ctx.beginPath(); ctx.arc(dx, ch - 25, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cw - dx, 20, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ====== VERSION TEXT ======
      if (elapsed >= 2) {
        ctx.globalAlpha = 0.2;
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = CYAN;
        ctx.fillText('v1.0', cw - 15, ch - 15);
        ctx.globalAlpha = 1;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ backgroundColor: DARK_BG, touchAction: 'manipulation' }}
      onClick={() => {
        const event = new CustomEvent('splash-end');
        window.dispatchEvent(event);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        const event = new CustomEvent('splash-end');
        window.dispatchEvent(event);
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
