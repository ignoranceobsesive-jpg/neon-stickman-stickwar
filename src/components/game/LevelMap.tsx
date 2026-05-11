'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { LEVELS, CYAN, MAGENTA, LIME, GOLD, TOTAL_LEVELS, getSeasonForLevel, getSeasonVisuals } from '@/lib/game-types';
import { soundEngine } from '@/lib/sound-engine';
import { tryAutoFullscreen } from '@/components/game/LandscapeOverlay';

// ─── Chapter Theme System ───────────────────────────────────────────────
interface ChapterTheme {
  color: string;
  glow: string;
  gradient: string;
  icon: string;
  name: string;
}

const CHAPTER_THEMES: Record<number, ChapterTheme> = {
  1:  { color: '#00ffff', glow: '#00ffff', gradient: 'linear-gradient(135deg, #00ffff20, #00446610)', icon: '⚡', name: 'THE AWAKENING' },
  2:  { color: '#aa44ff', glow: '#aa44ff', gradient: 'linear-gradient(135deg, #aa44ff20, #44008810)', icon: '👥', name: 'THE GANG' },
  3:  { color: '#ff4444', glow: '#ff4444', gradient: 'linear-gradient(135deg, #ff444420, #66000010)', icon: '🛡️', name: 'THE RESCUE' },
  4:  { color: '#ff44aa', glow: '#ff44aa', gradient: 'linear-gradient(135deg, #ff44aa20, #66004410)', icon: '🏰', name: 'PROTECT' },
  5:  { color: '#ffd700', glow: '#ffd700', gradient: 'linear-gradient(135deg, #ffd70020, #66440010)', icon: '⚔️', name: 'THE FINAL WAR' },
  6:  { color: '#00ff66', glow: '#00ff66', gradient: 'linear-gradient(135deg, #00ff6620, #00442210)', icon: '🔮', name: 'THE INFINITE GRID' },
  7:  { color: '#ff4400', glow: '#ff4400', gradient: 'linear-gradient(135deg, #ff440020, #44110010)', icon: '🐉', name: "DRAGON'S DOMAIN" },
  8:  { color: '#aaaaaa', glow: '#aaaaaa', gradient: 'linear-gradient(135deg, #aaaaaa20, #44444410)', icon: '🤖', name: 'MECH WARFARE' },
  9:  { color: '#8800ff', glow: '#8800ff', gradient: 'linear-gradient(135deg, #8800ff20, #22006610)', icon: '👁️', name: 'SHADOW REALM' },
  10: { color: '#ff8800', glow: '#ff8800', gradient: 'linear-gradient(135deg, #ff880020, #44220010)', icon: '🔥', name: 'PHOENIX RISING' },
};

function getChapterTheme(ch: number): ChapterTheme {
  if (CHAPTER_THEMES[ch]) return CHAPTER_THEMES[ch];
  const hue = (ch * 37) % 360;
  const color = `hsl(${hue}, 100%, 60%)`;
  return {
    color,
    glow: color,
    gradient: `linear-gradient(135deg, ${color}20, ${color}08)`,
    icon: '🌀',
    name: `ZONE ${ch}`,
  };
}

const VISIBLE_CHAPTERS = 10;
const FOGGY_START_CHAPTER = 11;

// ─── Level Node Component ───────────────────────────────────────────────
function LevelNode({
  levelNum,
  highestLevel,
  completedLevels,
  isFoggy,
  stars,
  onClick,
}: {
  levelNum: number;
  highestLevel: number;
  completedLevels: number[];
  isFoggy: boolean;
  stars: number;
  onClick: () => void;
}) {
  const isLocked = levelNum > highestLevel;
  const isCompleted = completedLevels.includes(levelNum);
  const isCurrent = levelNum === highestLevel;
  const isBossLevel = levelNum > 8
    ? levelNum % (levelNum > 50 ? 3 : 5) === 0
    : [6, 8].includes(levelNum);
  const chapterNum = Math.ceil(levelNum / 10);
  const theme = getChapterTheme(chapterNum);

  const storyLevel = LEVELS.find(l => l.id === levelNum);
  const levelName = storyLevel ? storyLevel.name : (isBossLevel ? 'BOSS' : `LV ${levelNum}`);

  // Node size and style based on state
  const nodeSize = isBossLevel ? 56 : isCurrent ? 52 : 46;
  const fontSize = isBossLevel ? 'text-xs' : isCurrent ? 'text-[11px]' : 'text-[10px]';

  // Background glow animation for current level
  const [pulsePhase, setPulsePhase] = useState(0);
  useEffect(() => {
    if (!isCurrent || isFoggy) return;
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 60);
    }, 50);
    return () => clearInterval(interval);
  }, [isCurrent, isFoggy]);

  const pulseScale = isCurrent ? 1 + Math.sin(pulsePhase / 60 * Math.PI * 2) * 0.06 : 1;

  // Determine node visual style
  let bgStyle: React.CSSProperties = {};
  let borderStyle = '1px solid #1a1a2e';
  let textStyle: React.CSSProperties = { color: '#333' };
  let iconContent: React.ReactNode = null;

  if (isFoggy) {
    bgStyle = { background: 'radial-gradient(circle, rgba(20,10,40,0.4), rgba(5,5,16,0.6))' };
    borderStyle = '1px dashed #1a1a2e';
    textStyle = { color: '#1a1a2e' };
    iconContent = <span style={{ fontSize: 10, opacity: 0.3 }}>?</span>;
  } else if (isCompleted) {
    bgStyle = {
      background: `radial-gradient(circle, ${theme.color}25, ${theme.color}08)`,
      boxShadow: `0 0 12px ${theme.color}30, inset 0 0 8px ${theme.color}10`,
    };
    borderStyle = `2px solid ${theme.color}`;
    textStyle = { color: theme.color, textShadow: `0 0 8px ${theme.color}80` };
    // Show stars for completed levels
    iconContent = (
      <div className="flex gap-px">
        {[1, 2, 3].map(s => (
          <span key={s} style={{ fontSize: 7, color: s <= stars ? '#ffd700' : '#333', textShadow: s <= stars ? '0 0 4px #ffd700' : 'none' }}>★</span>
        ))}
      </div>
    );
  } else if (isCurrent) {
    bgStyle = {
      background: `radial-gradient(circle, ${GOLD}35, ${GOLD}10)`,
      boxShadow: `0 0 20px ${GOLD}60, 0 0 40px ${GOLD}25, inset 0 0 15px ${GOLD}15`,
      transform: `scale(${pulseScale})`,
    };
    borderStyle = `2px solid ${GOLD}`;
    textStyle = { color: GOLD, textShadow: `0 0 10px ${GOLD}` };
    iconContent = <span style={{ fontSize: 10 }}>▶</span>;
  } else if (isLocked) {
    bgStyle = { background: 'radial-gradient(circle, rgba(15,15,30,0.5), rgba(5,5,16,0.7))' };
    borderStyle = '1px solid #1a1a2e';
    textStyle = { color: '#2a2a3e' };
    iconContent = <span style={{ fontSize: 9, opacity: 0.5 }}>🔒</span>;
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
      style={{
        width: nodeSize,
        height: nodeSize,
        ...bgStyle,
        border: borderStyle,
        cursor: isFoggy || isLocked ? 'not-allowed' : 'pointer',
        opacity: isFoggy ? 0.3 : 1,
      }}
    >
      {/* Boss crown */}
      {isBossLevel && !isFoggy && !isLocked && (
        <span style={{ fontSize: 9, lineHeight: 1, marginBottom: -2, filter: isCompleted ? `drop-shadow(0 0 3px ${theme.color})` : 'none' }}>
          👑
        </span>
      )}
      <span className={`font-bold font-mono ${fontSize} leading-none`} style={textStyle}>
        {levelNum}
      </span>
      {iconContent}
    </button>
  );
}

// ─── Chapter Banner ─────────────────────────────────────────────────────
function ChapterBanner({
  chapterNum,
  theme,
  completedInChapter,
  totalInChapter,
  isFoggy,
  chapterRef,
}: {
  chapterNum: number;
  theme: ChapterTheme;
  completedInChapter: number;
  totalInChapter: number;
  isFoggy: boolean;
  chapterRef: (el: HTMLDivElement | null) => void;
}) {
  const progressPct = totalInChapter > 0 ? (completedInChapter / totalInChapter) * 100 : 0;
  const isComplete = completedInChapter === totalInChapter;

  return (
    <div ref={chapterRef} className="w-full mb-3">
      {/* Chapter Header */}
      <div
        className="relative rounded-lg overflow-hidden px-4 py-2.5 mb-2"
        style={{
          background: isFoggy
            ? 'linear-gradient(135deg, rgba(20,10,40,0.2), rgba(10,5,20,0.3))'
            : theme.gradient,
          border: isFoggy
            ? '1px dashed #1a1a2e'
            : `1px solid ${theme.color}40`,
          boxShadow: isFoggy ? 'none' : `0 0 15px ${theme.glow}15`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Chapter icon */}
          <span className="text-lg" style={{ opacity: isFoggy ? 0.2 : 1 }}>
            {theme.icon}
          </span>

          {/* Chapter info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span
                className="font-bold font-mono text-xs tracking-widest"
                style={{
                  color: isFoggy ? '#1a1a2e' : theme.color,
                  textShadow: isFoggy ? 'none' : `0 0 8px ${theme.glow}60`,
                }}
              >
                CH.{chapterNum}
              </span>
              <span
                className="font-mono text-[10px] truncate"
                style={{ color: isFoggy ? '#1a1a2e' : '#888' }}
              >
                {isFoggy ? '???' : theme.name}
              </span>
            </div>

            {/* Progress bar */}
            {!isFoggy && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: isComplete ? LIME : theme.color,
                      boxShadow: `0 0 6px ${isComplete ? LIME : theme.color}50`,
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[8px] flex-shrink-0"
                  style={{
                    color: isComplete ? LIME : '#555',
                    textShadow: isComplete ? '0 0 5px #00ff66' : 'none',
                  }}
                >
                  {completedInChapter}/{totalInChapter}
                </span>
              </div>
            )}
          </div>

          {/* Complete badge */}
          {isComplete && !isFoggy && (
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: LIME,
                backgroundColor: '#00ff6615',
                border: '1px solid #00ff6640',
                textShadow: '0 0 5px #00ff66',
              }}
            >
              DONE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Floating Particles for Current Level ───────────────────────────────
function FloatingParticles({ color }: { color: string }) {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    delay: i * 0.5,
    x: 20 + Math.random() * 60,
    size: 2 + Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            left: `${p.x}%`,
            bottom: '0%',
            animation: `float-up 2s ease-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated Canvas Background ─────────────────────────────────────────

/** Map each chapter number (1-based) to season for background theming */
function getChapterSeason(ch: number) {
  const level = ((ch - 1) % 10) * 10 + 1; // first level of that chapter cycle
  return getSeasonForLevel(level);
}

interface Star {
  x: number; y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  baseOpacity: number;
}

interface NeonParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  opacityDir: number;
  color: string;
  life: number;
  maxLife: number;
}

interface GeoShape {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
  type: 'triangle' | 'diamond' | 'hexagon' | 'circle';
  color: string;
}

function LevelMapBackground({ highestLevel }: { highestLevel: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<NeonParticle[]>([]);
  const shapesRef = useRef<GeoShape[]>([]);
  const timeRef = useRef(0);
  const gridOffsetRef = useRef(0);

  // Determine current chapter's season theme
  const currentChapter = Math.ceil(Math.max(highestLevel, 1) / 10);
  const season = getChapterSeason(currentChapter);
  const visuals = getSeasonVisuals(season);
  const themeColor = visuals.particleColor;
  const themeGlow = visuals.platformGlow;

  // Parse hex to rgb
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 255, b: 255 };
  }, []);

  // Initialize particles
  useEffect(() => {
    // Stars
    starsRef.current = Array.from({ length: 65 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 1.5,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
      baseOpacity: 0.3 + Math.random() * 0.5,
    }));

    // Neon particles
    particlesRef.current = Array.from({ length: 25 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -0.0002 - Math.random() * 0.0005,
      size: 1.5 + Math.random() * 3,
      opacity: Math.random(),
      opacityDir: (Math.random() > 0.5 ? 1 : -1) * (0.005 + Math.random() * 0.01),
      color: Math.random() > 0.3 ? themeColor : '#ffffff',
      life: Math.random() * 300,
      maxLife: 300 + Math.random() * 200,
    }));

    // Geometric shapes
    const shapeTypes: GeoShape['type'][] = ['triangle', 'diamond', 'hexagon', 'circle'];
    shapesRef.current = Array.from({ length: 7 }, () => ({
      x: 0.05 + Math.random() * 0.9,
      y: 0.05 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.0001,
      vy: (Math.random() - 0.5) * 0.0001,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.005,
      size: 8 + Math.random() * 16,
      opacity: 0.06 + Math.random() * 0.1,
      type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
      color: Math.random() > 0.4 ? themeColor : themeGlow,
    }));
  }, [themeColor, themeGlow]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rgb = hexToRgb(themeColor);

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      timeRef.current += 1;
      gridOffsetRef.current = (gridOffsetRef.current + 0.15) % 50;
      const t = timeRef.current;

      // Clear
      ctx.fillStyle = 'rgba(5, 5, 16, 1)';
      ctx.fillRect(0, 0, w, h);

      // ── Aurora ──
      const auroraColors = [
        { r: rgb.r, g: rgb.g, b: rgb.b },
        { r: Math.min(255, rgb.r + 60), g: Math.max(0, rgb.g - 40), b: Math.min(255, rgb.b + 80) },
        { r: Math.max(0, rgb.r - 40), g: Math.min(255, rgb.g + 60), b: Math.max(0, rgb.b - 40) },
      ];

      for (let band = 0; band < 3; band++) {
        const c = auroraColors[band];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const bandHeight = h * (0.08 + band * 0.05);
        for (let x = 0; x <= w; x += 4) {
          const normalX = x / w;
          const y = bandHeight +
            Math.sin(normalX * 3 + t * 0.008 + band * 1.2) * (h * 0.04) +
            Math.sin(normalX * 5 + t * 0.012 + band * 0.7) * (h * 0.02);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0);
        ctx.closePath();
        const auroraAlpha = 0.04 + Math.sin(t * 0.01 + band) * 0.015;
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${auroraAlpha})`;
        ctx.fill();
      }

      // ── Grid ──
      const gridSpacing = 50;
      const gridAlpha = 0.04;
      const offset = gridOffsetRef.current;
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridAlpha})`;
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = offset; x < w; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // Horizontal lines
      for (let y = offset; y < h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ── Stars ──
      for (const star of starsRef.current) {
        const twinkle = Math.sin(t * 0.02 * star.twinkleSpeed + star.twinkleOffset);
        const opacity = star.baseOpacity + twinkle * 0.25;
        if (opacity <= 0) continue;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, Math.max(0, opacity))})`;
        ctx.fill();
      }

      // ── Neon particles ──
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDir;
        p.life += 1;

        // Reset particle if out of bounds or expired
        if (p.y < -0.05 || p.x < -0.05 || p.x > 1.05 || p.opacity <= 0 || p.life > p.maxLife) {
          p.x = Math.random();
          p.y = 0.9 + Math.random() * 0.15;
          p.vx = (Math.random() - 0.5) * 0.0003;
          p.vy = -0.0002 - Math.random() * 0.0005;
          p.opacity = 0;
          p.opacityDir = Math.abs(p.opacityDir);
          p.life = 0;
          p.color = Math.random() > 0.3 ? themeColor : '#ffffff';
        }

        if (p.opacity >= 0.8) p.opacityDir = -Math.abs(p.opacityDir);
        if (p.opacity <= 0) p.opacityDir = Math.abs(p.opacityDir);

        const prgb = hexToRgb(p.color);
        const px = p.x * w;
        const py = p.y * h;
        const alpha = Math.max(0, Math.min(1, p.opacity)) * 0.7;

        // Glow
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
        gradient.addColorStop(0, `rgba(${prgb.r}, ${prgb.g}, ${prgb.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${prgb.r}, ${prgb.g}, ${prgb.b}, 0)`);
        ctx.beginPath();
        ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${prgb.r}, ${prgb.g}, ${prgb.b}, ${alpha})`;
        ctx.fill();
      }

      // ── Geometric shapes ──
      for (const shape of shapesRef.current) {
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotationSpeed;

        // Bounce at edges
        if (shape.x < 0.02 || shape.x > 0.98) shape.vx *= -1;
        if (shape.y < 0.02 || shape.y > 0.98) shape.vy *= -1;

        const sx = shape.x * w;
        const sy = shape.y * h;
        const srgb = hexToRgb(shape.color);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(shape.rotation);
        ctx.strokeStyle = `rgba(${srgb.r}, ${srgb.g}, ${srgb.b}, ${shape.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();

        const s = shape.size;
        switch (shape.type) {
          case 'triangle':
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.866, s * 0.5);
            ctx.lineTo(-s * 0.866, s * 0.5);
            ctx.closePath();
            break;
          case 'diamond':
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.6, 0);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.6, 0);
            ctx.closePath();
            break;
          case 'hexagon':
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 6;
              const hx = Math.cos(angle) * s * 0.7;
              const hy = Math.sin(angle) * s * 0.7;
              if (i === 0) ctx.moveTo(hx, hy);
              else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            break;
          case 'circle':
            ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
            break;
        }

        ctx.stroke();

        // Subtle glow for shapes
        ctx.strokeStyle = `rgba(${srgb.r}, ${srgb.g}, ${srgb.b}, ${shape.opacity * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      }

      // ── Subtle vignette ──
      const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
      vignetteGrad.addColorStop(0, 'rgba(5, 5, 16, 0)');
      vignetteGrad.addColorStop(1, 'rgba(5, 5, 16, 0.5)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, w, h);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [themeColor, hexToRgb]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);

    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

// ─── Main Level Map Component ───────────────────────────────────────────
export default function LevelMap() {
  const saveData = useGameStore(s => s.saveData);
  const startLevel = useGameStore(s => s.startLevel);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const chapterRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const highestLevel = saveData.highestLevel;
  const completedLevels = saveData.missionsCompleted.map(Number);
  const hasCompletedLevel100 = highestLevel > 100;

  const maxVisibleChapter = hasCompletedLevel100
    ? Math.min(Math.ceil(highestLevel / 10) + 1, Math.ceil(TOTAL_LEVELS / 100))
    : VISIBLE_CHAPTERS;

  const handleClick = useCallback((action: () => void) => {
    soundEngine.init();
    soundEngine.playMenuClick();
    action();
  }, []);

  // Auto-scroll to current chapter on mount
  useEffect(() => {
    const currentChapter = Math.ceil(highestLevel / 10);
    const targetChapter = Math.min(currentChapter, maxVisibleChapter);
    setTimeout(() => {
      const el = chapterRefs.current[targetChapter];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, [highestLevel, maxVisibleChapter]);

  const handleLevelClick = (levelNum: number) => {
    const isLocked = levelNum > highestLevel;
    const isFoggy = levelNum > 100 && !hasCompletedLevel100;
    if (isLocked || isFoggy) {
      soundEngine.init();
      soundEngine.playMenuClick();
      return;
    }
    handleClick(() => {
      setSelectedLevel(levelNum);
      tryAutoFullscreen();
      startLevel(levelNum);
    });
  };

  // Get stars for a level — read from persisted levelStars data
  const getStarsForLevel = (levelNum: number): number => {
    return saveData.levelStars?.[String(levelNum)] ?? (completedLevels.includes(levelNum) ? 1 : 0);
  };

  // Build a row of level nodes with connecting lines
  const buildLevelRow = (
    levels: number[],
    direction: 'ltr' | 'rtl',
    chapterNum: number,
  ) => {
    const theme = getChapterTheme(chapterNum);
    const orderedLevels = direction === 'ltr' ? levels : [...levels].reverse();

    return (
      <div className="flex items-center justify-center gap-0">
        {orderedLevels.map((lv, idx) => {
          const isFoggy = lv > 100 && !hasCompletedLevel100;
          const isCurrent = lv === highestLevel;
          const isCompleted = completedLevels.includes(lv);
          const prevLv = idx > 0 ? orderedLevels[idx - 1] : null;

          return (
            <React.Fragment key={lv}>
              {/* Path connector line */}
              {idx > 0 && prevLv && (
                <div
                  className="flex-shrink-0"
                  style={{
                    width: 12,
                    height: 2,
                    backgroundColor: (isCompleted && completedLevels.includes(prevLv))
                      ? theme.color
                      : '#1a1a2e',
                    boxShadow: (isCompleted && completedLevels.includes(prevLv))
                      ? `0 0 4px ${theme.color}50`
                      : 'none',
                    opacity: (isCompleted && completedLevels.includes(prevLv)) ? 0.7 : 0.3,
                    borderRadius: 1,
                  }}
                />
              )}
              {/* Level node */}
              <div className="relative flex-shrink-0">
                <LevelNode
                  levelNum={lv}
                  highestLevel={highestLevel}
                  completedLevels={completedLevels}
                  isFoggy={isFoggy}
                  stars={getStarsForLevel(lv)}
                  onClick={() => handleLevelClick(lv)}
                />
                {isCurrent && !isFoggy && <FloatingParticles color={GOLD} />}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Build vertical connector between rows
  const buildVerticalConnector = (fromLv: number, toLv: number, chapterNum: number) => {
    const theme = getChapterTheme(chapterNum);
    const isCompleted = completedLevels.includes(fromLv) && completedLevels.includes(toLv);
    const isFoggy = fromLv > 100 && !hasCompletedLevel100;

    return (
      <div className="flex justify-end pr-4" style={{ padding: '2px 0' }}>
        <div
          style={{
            width: 2,
            height: 14,
            backgroundColor: isFoggy ? '#0a0a15' : isCompleted ? theme.color : '#1a1a2e',
            boxShadow: isCompleted ? `0 0 4px ${theme.color}50` : 'none',
            opacity: isFoggy ? 0.1 : isCompleted ? 0.7 : 0.3,
            borderRadius: 1,
          }}
        />
      </div>
    );
  };

  // Build chapters
  const chapters = [];
  for (let ch = 1; ch <= maxVisibleChapter; ch++) {
    const startLv = (ch - 1) * 10 + 1;
    const endLv = Math.min(ch * 10, TOTAL_LEVELS);
    const isFoggyChapter = ch > VISIBLE_CHAPTERS && !hasCompletedLevel100;
    const chapterOpacity = isFoggyChapter ? 0.15 : 1;
    const theme = getChapterTheme(ch);

    const completedInChapter = Array.from({ length: endLv - startLv + 1 }, (_, i) => startLv + i)
      .filter(lv => completedLevels.includes(lv)).length;
    const totalInChapter = endLv - startLv + 1;

    // Split 10 levels into two rows: row1 = 1-5 (left→right), row2 = 6-10 (right→left)
    const row1Levels = Array.from({ length: 5 }, (_, i) => startLv + i);
    const row2Levels = Array.from({ length: Math.min(5, endLv - startLv - 4) }, (_, i) => startLv + 5 + i);

    chapters.push(
      <div key={ch} style={{ opacity: chapterOpacity }} className="mb-2">
        {/* Chapter Banner */}
        <ChapterBanner
          chapterNum={ch}
          theme={theme}
          completedInChapter={completedInChapter}
          totalInChapter={totalInChapter}
          isFoggy={isFoggyChapter}
          chapterRef={(el) => { chapterRefs.current[ch] = el; }}
        />

        {/* Level Path — Winding serpentine: row 1 left→right, row 2 right→left */}
        <div className="flex flex-col items-center px-2 mb-1">
          {/* Row 1: levels 1-5 left to right */}
          {buildLevelRow(row1Levels, 'ltr', ch)}

          {/* Vertical connector on right side (row 1 last → row 2 first) */}
          {row2Levels.length > 0 && buildVerticalConnector(row1Levels[4], row2Levels[0], ch)}

          {/* Row 2: levels 6-10 right to left (serpentine) */}
          {row2Levels.length > 0 && buildLevelRow(row2Levels, 'rtl', ch)}
        </div>

        {/* Chapter connector to next chapter */}
        {ch < maxVisibleChapter && (
          <div className="flex items-center justify-center py-2">
            <div className="flex flex-col items-center gap-0.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: completedInChapter === totalInChapter ? theme.color : '#1a1a2e',
                    boxShadow: completedInChapter === totalInChapter ? `0 0 4px ${theme.color}50` : 'none',
                    opacity: 0.5 + i * 0.1,
                  }}
                />
              ))}
              <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.4 }}>
                <path
                  d="M4 0 L8 4 L4 8 L0 4 Z"
                  fill={completedInChapter === totalInChapter ? theme.color : '#1a1a2e'}
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Foggy zone indicator
  const renderFoggyZone = () => {
    if (hasCompletedLevel100) return null;
    return (
      <div className="w-full mt-6 mb-8">
        <div
          className="relative rounded-xl p-5 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(20,10,40,0.3) 0%, rgba(10,5,25,0.5) 100%)',
            border: '1px dashed #2a1a4e',
          }}
        >
          {/* Fog effect overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(60,20,100,0.15), transparent 70%)',
              animation: 'fog-drift 8s ease-in-out infinite alternate',
            }}
          />
          <div className="relative z-10">
            <div className="text-2xl mb-2">🌫️</div>
            <div
              className="font-bold font-mono text-sm tracking-wider mb-1"
              style={{ color: '#6a3abe', textShadow: '0 0 10px #6a3abe60' }}
            >
              ??? MYSTERY ZONE ???
            </div>
            <div className="text-[10px] font-mono" style={{ color: '#4a3a8e' }}>
              Complete Level 100 to unlock the path beyond...
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: '#4a2a8e',
                    animation: `neon-pulse ${1.5 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Total progress calculation
  const totalCompleted = completedLevels.length;
  const totalProgressPct = Math.min((totalCompleted / Math.min(TOTAL_LEVELS, 100)) * 100, 100);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ backgroundColor: 'transparent' }}>
      {/* ─── Animated Canvas Background ─── */}
      <LevelMapBackground highestLevel={highestLevel} />

      {/* ─── Header ─── */}
      <div
        className="relative z-10 flex-shrink-0 px-4 py-3"
        style={{
          borderBottom: `1px solid rgba(0, 255, 255, 0.15)`,
          background: 'linear-gradient(180deg, rgba(5,5,16,0.98) 0%, rgba(5,5,16,0.92) 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => handleClick(() => setGamePhase('menu'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ border: '1px solid #333', color: '#888' }}
          >
            <span style={{ fontSize: 12 }}>←</span>
            <span className="font-mono text-xs font-bold tracking-wider">BACK</span>
          </button>
          <h2
            className="text-lg font-bold tracking-widest font-mono"
            style={{ color: CYAN, textShadow: '0 0 15px #00ffff80, 0 0 30px #00ffff30' }}
          >
            LEVEL MAP
          </h2>
          <div className="font-mono text-xs font-bold" style={{ color: GOLD, textShadow: '0 0 8px #ffd70040' }}>
            LV {highestLevel}
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${totalProgressPct}%`,
                background: `linear-gradient(90deg, #00ffff, #00ff66, #ffd700)`,
                boxShadow: '0 0 8px rgba(0,255,102,0.4)',
              }}
            />
          </div>
          <span className="font-mono text-[9px] flex-shrink-0" style={{ color: '#666' }}>
            {totalCompleted}/{Math.min(TOTAL_LEVELS, 100)}
          </span>
        </div>
      </div>

      {/* ─── Chapter Quick Nav ─── */}
      <div
        className="relative z-10 flex-shrink-0 flex gap-1.5 px-3 py-2 overflow-x-auto"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          scrollbarWidth: 'none',
        }}
      >
        {Array.from({ length: maxVisibleChapter }, (_, i) => i + 1).map(ch => {
          const isActive = Math.ceil(highestLevel / 10) === ch;
          const theme = getChapterTheme(ch);
          const isFoggy = ch > VISIBLE_CHAPTERS && !hasCompletedLevel100;

          return (
            <button
              key={ch}
              onClick={() => {
                const el = chapterRefs.current[ch];
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                soundEngine.init();
                soundEngine.playMenuClick();
              }}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: isActive ? `${theme.color}18` : 'rgba(0,0,0,0.2)',
                border: isActive ? `1px solid ${theme.color}60` : '1px solid #1a1a2e',
                color: isFoggy ? '#1a1a2e' : isActive ? theme.color : '#555',
                textShadow: isActive ? `0 0 8px ${theme.color}60` : 'none',
                boxShadow: isActive ? `0 0 10px ${theme.color}20` : 'none',
              }}
            >
              <span className="font-mono text-[9px] font-bold tracking-wider">{theme.icon} {ch}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Scrollable Level Map ─── */}
      <div
        ref={containerRef}
        className="relative z-10 flex-1 overflow-y-auto px-2 py-4"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)',
        }}
      >
        <div className="max-w-md mx-auto">
          {chapters}
          {renderFoggyZone()}

          {/* Extended zone */}
          {hasCompletedLevel100 && (
            <div className="mt-6 mb-8 text-center">
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(170,0,255,0.1), rgba(255,0,102,0.1))',
                  border: '1px solid #aa00ff30',
                }}
              >
                <div className="text-xl mb-1">🌌</div>
                <div
                  className="font-bold font-mono text-xs tracking-wider mb-1"
                  style={{ color: MAGENTA, textShadow: '0 0 15px #ff00ff60' }}
                >
                  THE INFINITE FRONTIER
                </div>
                <div className="text-[10px] font-mono" style={{ color: '#888' }}>
                  {TOTAL_LEVELS.toLocaleString()} levels await beyond...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Legend ─── */}
      <div
        className="relative z-10 flex-shrink-0 px-4 py-2.5"
        style={{
          borderTop: '1px solid rgba(0, 255, 255, 0.1)',
          background: 'linear-gradient(0deg, rgba(5,5,16,0.98) 0%, rgba(5,5,16,0.92) 100%)',
        }}
      >
        <div className="flex items-center justify-center gap-5 text-[9px] font-mono">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: LIME, boxShadow: '0 0 4px #00ff66' }} />
            <span style={{ color: '#666' }}>Cleared</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: GOLD, boxShadow: '0 0 4px #ffd700' }} />
            <span style={{ color: '#666' }}>Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm border border-[#333]" style={{ backgroundColor: '#0a0a15' }} />
            <span style={{ color: '#666' }}>Locked</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 10 }}>👑</span>
            <span style={{ color: '#666' }}>Boss</span>
          </div>
        </div>
      </div>

      {/* ─── Animations ─── */}
      <style jsx global>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-40px) scale(0.3); opacity: 0; }
        }
        @keyframes fog-drift {
          0% { transform: translateX(-5%) scaleY(1); }
          100% { transform: translateX(5%) scaleY(1.1); }
        }
      `}</style>
    </div>
  );
}
