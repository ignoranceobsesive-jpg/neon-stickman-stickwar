'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { CYAN, MAGENTA, ORANGE, RED, PURPLE, LIME, YELLOW, PINK, GOLD, BLUE, DARK_BG } from '@/lib/game-types';
import type { CutsceneSceneType } from '@/lib/game-types';

// Transition type between cutscene frames
type TransitionType = 'fade' | 'slideLeft' | 'slideRight' | 'zoom' | 'flash';
const TRANSITION_DURATION = 20; // frames for transition

export default function CutscenePlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const textProgressRef = useRef(0);
  const store = useGameStore;

  // Transition state
  const transitionRef = useRef<{
    active: boolean;
    type: TransitionType;
    progress: number; // 0-1
    fromScene: CutsceneSceneType | null;
    fromColor: string;
    toScene: CutsceneSceneType | null;
    toColor: string;
  }>({
    active: false,
    type: 'fade',
    progress: 0,
    fromScene: null,
    fromColor: CYAN,
    toScene: null,
    toColor: CYAN,
  });

  // Camera effects
  const cameraRef = useRef<{
    zoom: number;
    targetZoom: number;
    panX: number;
    panY: number;
    targetPanX: number;
    targetPanY: number;
  }>({
    zoom: 1,
    targetZoom: 1,
    panX: 0,
    panY: 0,
    targetPanX: 0,
    targetPanY: 0,
  });

  // Skip button state
  const skipHoverRef = useRef(false);

  // Track whether text is fully displayed for "TAP TO ADVANCE" hint
  const [textFullyDisplayed, setTextFullyDisplayed] = useState(false);

  // Dramatic camera effects per scene type
  const getCameraForScene = (scene: CutsceneSceneType, frame: number): { zoom: number; panX: number; panY: number } => {
    const t = frame / 60; // time in seconds
    switch (scene) {
      case 'bossIntro':
        return { zoom: 1 + Math.min(t * 0.05, 0.15), panX: 0, panY: Math.sin(t * 0.5) * 5 };
      case 'bossDefeated':
        return { zoom: 1.1 - Math.min(t * 0.02, 0.1), panX: 0, panY: 0 };
      case 'kidnapping':
        return { zoom: 1 + Math.sin(t * 0.3) * 0.05, panX: Math.sin(t * 0.4) * 3, panY: 0 };
      case 'explosion':
        return { zoom: 1 + Math.max(0, 0.2 - t * 0.05), panX: 0, panY: 0 };
      case 'voidRift':
        return { zoom: 1 + Math.sin(t * 0.2) * 0.03, panX: 0, panY: Math.sin(t * 0.15) * 3 };
      case 'darkRevelation':
        return { zoom: 1 + Math.sin(t * 0.15) * 0.04, panX: 0, panY: 0 };
      case 'sacrifice':
        return { zoom: 1 + Math.min(t * 0.01, 0.08), panX: 0, panY: -Math.min(t * 0.3, 5) };
      case 'newDawn':
        return { zoom: 1 + Math.min(t * 0.005, 0.05), panX: 0, panY: 0 };
      default:
        return { zoom: 1, panX: 0, panY: 0 };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      animRef.current = requestAnimationFrame(render);
      frameCountRef.current++;
      const state = store.getState();
      const { currentCutscene, cutsceneFrameIndex, cutsceneTextProgress } = state;
      if (!currentCutscene) return;

      const frame = currentCutscene.frames[cutsceneFrameIndex];
      if (!frame) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Advance text
      if (textProgressRef.current < frame.dialogue.length) {
        textProgressRef.current += 0.8;
        if (frameCountRef.current % 2 === 0) {
          store.setState({ cutsceneTextProgress: Math.floor(textProgressRef.current) });
        }
      }

      // Handle transitions
      const trans = transitionRef.current;
      if (trans.active) {
        trans.progress += 1 / TRANSITION_DURATION;
        if (trans.progress >= 1) {
          trans.active = false;
          trans.progress = 1;
        }
      }

      // Apply camera effects
      const camTarget = getCameraForScene(frame.scene, frameCountRef.current);
      cameraRef.current.zoom += (camTarget.zoom - cameraRef.current.zoom) * 0.05;
      cameraRef.current.panX += (camTarget.panX - cameraRef.current.panX) * 0.05;
      cameraRef.current.panY += (camTarget.panY - cameraRef.current.panY) * 0.05;

      const cam = cameraRef.current;

      // Clear with base color
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, cw, ch);

      // Apply camera transform
      ctx.save();
      const camZoom = cam.zoom;
      const camPanX = cam.panX;
      const camPanY = cam.panY;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(camZoom, camZoom);
      ctx.translate(-cw / 2 + camPanX, -ch / 2 + camPanY);

      // Render scene
      if (trans.active && trans.fromScene) {
        // During transition, render outgoing scene with fade
        ctx.globalAlpha = 1 - trans.progress;
        drawScene(ctx, cw, ch, trans.fromScene, frameCountRef.current, trans.fromColor);
      }

      ctx.globalAlpha = trans.active ? trans.progress : 1;
      drawScene(ctx, cw, ch, frame.scene, frameCountRef.current, frame.speakerColor);
      ctx.globalAlpha = 1;

      ctx.restore();

      // Apply transition overlay effects
      if (trans.active) {
        const p = trans.progress;
        switch (trans.type) {
          case 'fade':
            // Already handled by alpha above, add extra darkness at midpoint
            if (p > 0.3 && p < 0.7) {
              ctx.globalAlpha = 1 - Math.abs(p - 0.5) * 5;
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, cw, ch);
            }
            break;
          case 'flash':
            if (p < 0.3) {
              ctx.globalAlpha = p * 3;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, cw, ch);
            } else if (p < 0.6) {
              ctx.globalAlpha = 1 - (p - 0.3) * 3.3;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, cw, ch);
            }
            break;
          case 'slideLeft':
          case 'slideRight':
            // Slide overlay - black bar sweeps across
            const slidePos = trans.type === 'slideLeft' ? (1 - p) : -(1 - p);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cw * slidePos, 0, cw * Math.abs(1 - p), ch);
            break;
          case 'zoom':
            if (p < 0.5) {
              ctx.globalAlpha = p * 2;
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, cw, ch);
            }
            break;
        }
        ctx.globalAlpha = 1;
      }

      // Render speaker portrait
      drawSpeakerPortrait(ctx, cw, ch, frame.speaker, frame.speakerColor, frameCountRef.current);

      // Render subtitle
      drawSubtitle(ctx, cw, ch, frame.dialogue, frame.speaker, frame.speakerColor, textProgressRef.current);

      // Render frame counter
      const totalFrames = currentCutscene.frames.length;
      if (totalFrames > 1) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = CYAN;
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${cutsceneFrameIndex + 1}/${totalFrames}`, cw - 70, ch - 10);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [store]);

  // Click/tap/key to advance
  useEffect(() => {
    const handleAdvance = () => {
      const state = store.getState();
      const { currentCutscene, cutsceneFrameIndex } = state;
      if (!currentCutscene || state.gamePhase !== 'cutscene') return;

      const frame = currentCutscene.frames[cutsceneFrameIndex];
      if (!frame) return;

      // Don't advance during transition
      if (transitionRef.current.active) return;

      if (textProgressRef.current < frame.dialogue.length) {
        textProgressRef.current = frame.dialogue.length;
        store.setState({ cutsceneTextProgress: frame.dialogue.length });
      } else {
        // Start transition before advancing
        const nextIndex = cutsceneFrameIndex + 1;
        const nextFrame = currentCutscene.frames[nextIndex];
        const transitions: TransitionType[] = ['fade', 'slideLeft', 'slideRight', 'flash', 'zoom'];
        const transType = nextFrame
          ? transitions[Math.floor(Math.random() * transitions.length)]
          : 'fade';

        transitionRef.current = {
          active: true,
          type: transType,
          progress: 0,
          fromScene: frame.scene,
          fromColor: frame.speakerColor,
          toScene: nextFrame?.scene || null,
          toColor: nextFrame?.speakerColor || CYAN,
        };

        // Reset camera for new frame
        cameraRef.current.targetZoom = 1;
        cameraRef.current.targetPanX = 0;
        cameraRef.current.targetPanY = 0;

        textProgressRef.current = 0;
        frameCountRef.current = 0;
        store.getState().advanceCutscene();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') {
        e.preventDefault();
        handleAdvance();
      }
      // Skip cutscene with Escape
      if (e.key === 'Escape') {
        skipCutscene();
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('click', handleAdvance);
    // Mobile: touch events don't always generate click events, especially with touchAction: none
    const handleTouch = (e: TouchEvent) => {
      // Don't advance on touches that originate from the skip button
      if ((e.target as HTMLElement).closest('[data-skip-btn]')) return;
      e.preventDefault();
      handleAdvance();
    };
    window.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('click', handleAdvance);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [store]);

  // Skip cutscene function (shared between ESC key and skip button)
  const skipCutscene = useCallback(() => {
    const state = store.getState();
    if (state.currentCutscene && state.gamePhase === 'cutscene') {
      textProgressRef.current = 0;
      frameCountRef.current = 0;
      transitionRef.current.active = false;
      // Skip all remaining frames
      const totalFrames = state.currentCutscene.frames.length;
      for (let i = state.cutsceneFrameIndex; i < totalFrames; i++) {
        store.getState().advanceCutscene();
      }
    }
  }, [store]);

  // Update textFullyDisplayed state based on text progress
  useEffect(() => {
    const interval = setInterval(() => {
      const state = store.getState();
      if (!state.currentCutscene) {
        setTextFullyDisplayed(false);
        return;
      }
      const frame = state.currentCutscene.frames[state.cutsceneFrameIndex];
      if (!frame) {
        setTextFullyDisplayed(false);
        return;
      }
      const isComplete = textProgressRef.current >= frame.dialogue.length;
      setTextFullyDisplayed(isComplete);
    }, 100);
    return () => clearInterval(interval);
  }, [store]);

  return (
    <div className="absolute inset-0 z-30">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
      {/* Skip button overlay — real clickable button on top of canvas */}
      <button
        data-skip-btn
        onClick={(e) => {
          e.stopPropagation();
          skipCutscene();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        className="absolute top-4 right-4 z-40 min-w-[44px] min-h-[44px] px-4 py-2
                   bg-black/60 border border-cyan-500/60 rounded
                   text-cyan-400 font-mono text-sm font-bold tracking-wider
                   hover:bg-cyan-500/20 hover:border-cyan-400 active:bg-cyan-500/30
                   transition-all duration-150 select-none cursor-pointer
                   backdrop-blur-sm"
        style={{
          textShadow: '0 0 8px #00ffff, 0 0 16px #00ffff44',
          boxShadow: '0 0 8px #00ffff33, inset 0 0 8px #00ffff11',
        }}
        aria-label="Skip cutscene"
      >
        SKIP ▶▶
      </button>
      {/* TAP TO ADVANCE hint — shows when text is fully displayed */}
      {textFullyDisplayed && (
        <div
          className="absolute bottom-24 left-0 right-0 flex justify-center z-40 pointer-events-none select-none animate-pulse"
        >
          <span
            className="text-cyan-400/70 font-mono text-xs tracking-[0.3em] uppercase"
            style={{
              textShadow: '0 0 8px #00ffff66',
            }}
          >
            ▾ TAP TO ADVANCE ▾
          </span>
        </div>
      )}
    </div>
  );
}

// ====== SPEAKER PORTRAIT ======
function drawSpeakerPortrait(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  speaker: string, color: string, frame: number,
) {
  const portraitSize = 60;
  const portraitX = 20;
  const boxH = 90;
  const boxY = ch - boxH - 20;
  const portraitY = boxY + (boxH - portraitSize) / 2 - 5;

  // Only draw portrait for known speakers
  const knownSpeakers: Record<string, { color: string; eyeDir: number; pose: string }> = {
    'BLUE': { color: CYAN, eyeDir: 1, pose: 'standing' },
    'SHADOW': { color: PURPLE, eyeDir: 1, pose: 'standing' },
    'BLAZE': { color: ORANGE, eyeDir: 1, pose: 'standing' },
    'VOLT': { color: YELLOW, eyeDir: 1, pose: 'standing' },
    'ICE': { color: '#44ddff', eyeDir: 1, pose: 'standing' },
    'LUNA': { color: PINK, eyeDir: 1, pose: 'standing' },
    'NEON': { color: '#44ddaa', eyeDir: 1, pose: 'standing' },
    'NARRATOR': { color: ORANGE, eyeDir: 0, pose: 'none' },
    '???': { color: '#ff0044', eyeDir: 1, pose: 'standing' },
  };

  const speakerData = knownSpeakers[speaker];
  if (!speakerData || speaker === 'NARRATOR') return;

  const sColor = speakerData.color;

  // Portrait background circle with glow
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = sColor;
  ctx.shadowBlur = 20;
  ctx.shadowColor = sColor;
  ctx.beginPath();
  ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize / 2 + 4, 0, Math.PI * 2);
  ctx.fill();

  // Dark background circle
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#050510';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Neon border ring
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = sColor;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = sColor;
  ctx.beginPath();
  ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Draw stickman silhouette in portrait
  const cx = portraitX + portraitSize / 2;
  const cy = portraitY + portraitSize * 0.75;
  const scale = 0.7;

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = sColor;
  ctx.shadowColor = sColor;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2 * scale;

  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - 30 * scale, 8 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(cx + speakerData.eyeDir * 2, cy - 32 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.strokeStyle = sColor;
  ctx.shadowColor = sColor;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22 * scale);
  ctx.lineTo(cx, cy - 8 * scale);
  ctx.stroke();

  // Arms
  const armWave = Math.sin(frame * 0.08) * 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18 * scale);
  ctx.lineTo(cx - 8 * scale, cy - 12 * scale + armWave);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18 * scale);
  ctx.lineTo(cx + 8 * scale, cy - 12 * scale - armWave);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8 * scale);
  ctx.lineTo(cx - 6 * scale, cy + 4 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8 * scale);
  ctx.lineTo(cx + 6 * scale, cy + 4 * scale);
  ctx.stroke();

  // Name under portrait
  ctx.shadowBlur = 8;
  ctx.shadowColor = sColor;
  ctx.fillStyle = sColor;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(speaker, cx, portraitY + portraitSize + 12);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ====== SCENE RENDERING ======
function drawScene(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  scene: CutsceneSceneType, frame: number, accentColor: string,
) {
  switch (scene) {
    case 'cityPan': drawCityPan(ctx, cw, ch, frame); break;
    case 'kidnapping': drawKidnapping(ctx, cw, ch, frame); break;
    case 'blueWakes': drawBlueWakes(ctx, cw, ch, frame); break;
    case 'blueAngry': drawBlueAngry(ctx, cw, ch, frame); break;
    case 'shadowAppears': drawShadowAppears(ctx, cw, ch, frame); break;
    case 'handshake': drawHandshake(ctx, cw, ch, frame); break;
    case 'gangForming': drawGangForming(ctx, cw, ch, frame); break;
    case 'lunaCaptured': drawLunaCaptured(ctx, cw, ch, frame); break;
    case 'blueSeesLuna': drawBlueSeesLuna(ctx, cw, ch, frame); break;
    case 'motherThreat': drawMotherThreat(ctx, cw, ch, frame); break;
    case 'protectMother': drawProtectMother(ctx, cw, ch, frame); break;
    case 'bossIntro': drawBossIntro(ctx, cw, ch, frame); break;
    case 'bossDefeated': drawBossDefeated(ctx, cw, ch, frame); break;
    case 'reunion': drawReunion(ctx, cw, ch, frame); break;
    case 'victoryCelebration': drawVictoryCelebration(ctx, cw, ch, frame); break;
    case 'revive': drawRevive(ctx, cw, ch, frame); break;
    case 'gangJoin': drawGangJoin(ctx, cw, ch, frame); break;
    case 'walking': drawWalking(ctx, cw, ch, frame); break;
    case 'warScene': drawWarScene(ctx, cw, ch, frame); break;
    // Deep story scenes
    case 'darkRevelation': drawDarkRevelation(ctx, cw, ch, frame); break;
    case 'betrayal': drawBetrayal(ctx, cw, ch, frame); break;
    case 'flashback': drawFlashback(ctx, cw, ch, frame); break;
    case 'lunaVision': drawLunaVision(ctx, cw, ch, frame); break;
    case 'shadowPast': drawShadowPast(ctx, cw, ch, frame); break;
    case 'motherSecret': drawMotherSecret(ctx, cw, ch, frame); break;
    case 'redKingPlan': drawRedKingPlan(ctx, cw, ch, frame); break;
    case 'gangOath': drawGangOath(ctx, cw, ch, frame); break;
    case 'voidRift': drawVoidRiftScene(ctx, cw, ch, frame); break;
    case 'mysteryFigure': drawMysteryFigure(ctx, cw, ch, frame); break;
    case 'sacrifice': drawSacrifice(ctx, cw, ch, frame); break;
    case 'truthRevealed': drawTruthRevealed(ctx, cw, ch, frame); break;
    case 'darkCorridor': drawDarkCorridor(ctx, cw, ch, frame); break;
    case 'explosion': drawExplosion(ctx, cw, ch, frame); break;
    case 'silentPrayer': drawSilentPrayer(ctx, cw, ch, frame); break;
    case 'stormApproaching': drawStormApproaching(ctx, cw, ch, frame); break;
    case 'hiddenBase': drawHiddenBase(ctx, cw, ch, frame); break;
    case 'theDeal': drawTheDeal(ctx, cw, ch, frame); break;
    case 'lastStand': drawLastStand(ctx, cw, ch, frame); break;
    case 'newDawn': drawNewDawn(ctx, cw, ch, frame); break;
  }
}

// ====== SCENE IMPLEMENTATIONS ======

function drawCityPan(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#0a0020');
  grad.addColorStop(1, '#050510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  const floorY = ch * 0.7;
  // Grid
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  for (let x = (frame * 0.3) % 60; x < cw; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke();
  }
  // Buildings
  const buildings = [
    { x: 50, w: 80, h: 200 }, { x: 160, w: 60, h: 280 }, { x: 250, w: 100, h: 160 },
    { x: 400, w: 70, h: 320 }, { x: 500, w: 90, h: 240 }, { x: 620, w: 110, h: 190 },
    { x: 770, w: 65, h: 300 }, { x: 870, w: 95, h: 220 },
  ];
  for (const b of buildings) {
    const by = floorY - b.h;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(b.x, by, b.w, b.h);
    ctx.strokeStyle = CYAN;
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(b.x, by, b.w, b.h);
    // Windows
    ctx.globalAlpha = 0.5;
    for (let wy = by + 15; wy < floorY - 15; wy += 25) {
      for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 18) {
        const corrupted = Math.sin(wx * 0.3 + wy * 0.2 + frame * 0.05) > 0.3;
        ctx.fillStyle = corrupted ? RED : YELLOW;
        ctx.shadowBlur = 3; ctx.shadowColor = corrupted ? RED : YELLOW;
        ctx.fillRect(wx, wy, 8, 10);
      }
    }
  }
  // Rain
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const rx = (i * 97.3 + frame * 2) % cw;
    const ry = (i * 47.7 + frame * 5) % ch;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 15); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawKidnapping(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050010';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch / 2;

  // Red glow (enemy presence)
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.03) * 0.1;
  ctx.shadowBlur = 60;
  ctx.shadowColor = RED;
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(cx + 100, cy, 80 + Math.sin(frame * 0.05) * 20, 0, Math.PI * 2);
  ctx.fill();

  // Luna (pink stickman, tied/captured pose)
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = 15;
  ctx.shadowColor = PINK;
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 2.5;
  // Head
  ctx.beginPath(); ctx.arc(cx + 100, cy - 35, 8, 0, Math.PI * 2); ctx.stroke();
  // Body
  ctx.beginPath(); ctx.moveTo(cx + 100, cy - 27); ctx.lineTo(cx + 100, cy - 5); ctx.stroke();
  // Arms tied behind
  ctx.beginPath(); ctx.moveTo(cx + 100, cy - 22); ctx.lineTo(cx + 85, cy - 15); ctx.lineTo(cx + 100, cy - 10); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(cx + 100, cy - 5); ctx.lineTo(cx + 92, cy + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 100, cy - 5); ctx.lineTo(cx + 108, cy + 12); ctx.stroke();

  // Enemy soldiers silhouettes
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = RED;
  for (let i = 0; i < 3; i++) {
    const ex = cx + 180 + i * 50;
    drawMiniStickman(ctx, ex, cy + 10, RED, 0.8);
  }

  // "LUNA" text
  ctx.globalAlpha = 0.7 + Math.sin(frame * 0.08) * 0.3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = PINK;
  ctx.fillStyle = PINK;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LUNA', cx + 100, cy - 50);

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBlueWakes(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.65;

  // Blue getting up animation
  const standProgress = Math.min(1, frame / 120);
  const leanAngle = (1 - standProgress) * 0.5;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(leanAngle * -1);
  ctx.shadowBlur = 15;
  ctx.shadowColor = CYAN;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2.5;

  // Head
  ctx.beginPath(); ctx.arc(0, -38, 9, 0, Math.PI * 2); ctx.stroke();
  // Eye
  ctx.fillStyle = CYAN;
  ctx.beginPath(); ctx.arc(3, -40, 2, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.beginPath(); ctx.moveTo(0, -29); ctx.lineTo(0, -10); ctx.stroke();
  // Arms
  if (standProgress > 0.5) {
    ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-12, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(12, -20); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-8, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(15, -25); ctx.stroke();
  }
  // Legs
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-9, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(9, 10); ctx.stroke();

  // Energy glow as he stands
  ctx.globalAlpha = standProgress * 0.3;
  ctx.fillStyle = CYAN;
  ctx.beginPath(); ctx.arc(0, -20, 30 + standProgress * 20, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();

  // Ground line
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, cy + 10); ctx.lineTo(cw, cy + 10); ctx.stroke();

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBlueAngry(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // Red aura (anger)
  ctx.globalAlpha = 0.15 + Math.sin(frame * 0.08) * 0.1;
  ctx.fillStyle = RED;
  ctx.shadowBlur = 40;
  ctx.shadowColor = RED;
  ctx.beginPath();
  ctx.arc(cx, cy - 20, 60 + Math.sin(frame * 0.1) * 15, 0, Math.PI * 2);
  ctx.fill();

  // Blue stickman in combat stance
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15;
  ctx.shadowColor = CYAN;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 3;

  // Head
  ctx.beginPath(); ctx.arc(cx, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  // Angry eyes
  ctx.strokeStyle = RED;
  ctx.beginPath(); ctx.moveTo(cx - 4, cy - 43); ctx.lineTo(cx, cy - 41); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 4, cy - 43); ctx.lineTo(cx, cy - 41); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx + 3, cy - 39.5, 2, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = CYAN;
  // Body
  ctx.beginPath(); ctx.moveTo(cx, cy - 29); ctx.lineTo(cx, cy - 10); ctx.stroke();
  // Fists clenched
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 15, cy - 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx + 15, cy - 22); ctx.stroke();
  // Legs wide (combat stance)
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 14, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 14, cy + 10); ctx.stroke();

  // Energy crackling around fists
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + frame * 0.1;
    const fx = cx + 15 + Math.cos(angle) * 5;
    const fy = cy - 22 + Math.sin(angle) * 5;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + (Math.random() - 0.5) * 10, fy + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawShadowAppears(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  // Shadow appearing from darkness
  const cx = cw / 2;
  const cy = ch * 0.55;
  const appearProgress = Math.min(1, frame / 90);

  // Purple smoke
  ctx.globalAlpha = 0.2 * appearProgress;
  ctx.fillStyle = PURPLE;
  ctx.shadowBlur = 30;
  ctx.shadowColor = PURPLE;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + frame * 0.02;
    const dist = 40 + Math.sin(frame * 0.05 + i) * 15;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy - 20 + Math.sin(angle) * dist * 0.5, 15 + Math.random() * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow stickman
  ctx.globalAlpha = appearProgress;
  ctx.shadowBlur = 15;
  ctx.shadowColor = PURPLE;
  ctx.strokeStyle = PURPLE;
  ctx.lineWidth = 2.5;

  // Head
  ctx.beginPath(); ctx.arc(cx, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx + 3, cy - 39.5, 2, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.beginPath(); ctx.moveTo(cx, cy - 29); ctx.lineTo(cx, cy - 10); ctx.stroke();
  // Arms crossed
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 12, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx + 12, cy - 20); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 9, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 9, cy + 10); ctx.stroke();

  // Name label
  if (appearProgress > 0.7) {
    ctx.globalAlpha = (appearProgress - 0.7) / 0.3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = PURPLE;
    ctx.fillStyle = PURPLE;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOW', cx, cy - 55);
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawHandshake(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // Blue on left
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx - 60, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 29); ctx.lineTo(cx - 60, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 25); ctx.lineTo(cx - 30, cy - 25); ctx.stroke(); // hand reaching
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 25); ctx.lineTo(cx - 75, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 10); ctx.lineTo(cx - 69, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 10); ctx.lineTo(cx - 51, cy + 10); ctx.stroke();

  // Shadow on right
  ctx.shadowColor = PURPLE; ctx.strokeStyle = PURPLE;
  ctx.beginPath(); ctx.arc(cx + 60, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 60, cy - 29); ctx.lineTo(cx + 60, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 60, cy - 25); ctx.lineTo(cx + 30, cy - 25); ctx.stroke(); // hand reaching
  ctx.beginPath(); ctx.moveTo(cx + 60, cy - 25); ctx.lineTo(cx + 75, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 60, cy - 10); ctx.lineTo(cx + 51, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 60, cy - 10); ctx.lineTo(cx + 69, cy + 10); ctx.stroke();

  // Handshake glow in middle
  const shakeProgress = Math.min(1, frame / 60);
  ctx.globalAlpha = shakeProgress * 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 20; ctx.shadowColor = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy - 25, 8, 0, Math.PI * 2); ctx.fill();

  // "BLUE GANG" text
  if (shakeProgress > 0.5) {
    ctx.globalAlpha = (shakeProgress - 0.5) * 2;
    ctx.shadowBlur = 15; ctx.shadowColor = GOLD;
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE BLUE GANG', cx, cy - 65);
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawGangForming(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // 5 stickmen in a line
  const members = [
    { x: cx - 120, color: CYAN, name: 'BLUE' },
    { x: cx - 60, color: PURPLE, name: 'SHADOW' },
    { x: cx, color: ORANGE, name: 'BLAZE' },
    { x: cx + 60, color: YELLOW, name: 'VOLT' },
    { x: cx + 120, color: '#44ddff', name: 'ICE' },
  ];

  for (const m of members) {
    ctx.shadowBlur = 12; ctx.shadowColor = m.color; ctx.strokeStyle = m.color; ctx.lineWidth = 2.5;
    drawMiniStickman(ctx, m.x, cy, m.color, 1);
    // Name
    ctx.globalAlpha = 0.8;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(m.name, m.x, cy - 52);
    ctx.globalAlpha = 1;
  }

  // United glow
  ctx.globalAlpha = 0.08 + Math.sin(frame * 0.05) * 0.04;
  ctx.fillStyle = CYAN;
  ctx.shadowBlur = 0;
  ctx.fillRect(cx - 150, cy - 60, 300, 80);

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawLunaCaptured(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0005';
  ctx.fillRect(0, 0, cw, ch);

  // Cage bars
  const cx = cw / 2;
  const cy = ch * 0.45;

  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = RED;
  ctx.shadowBlur = 8; ctx.shadowColor = RED;
  ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 20, cy - 60);
    ctx.lineTo(cx + i * 20, cy + 30);
    ctx.stroke();
  }

  // Luna behind bars
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = PINK;
  ctx.shadowColor = PINK;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - 20, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx, cy + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 10, cy - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 10, cy - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx - 6, cy + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx + 6, cy + 20); ctx.stroke();

  // Tear
  ctx.fillStyle = PINK;
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
  ctx.beginPath(); ctx.arc(cx - 3, cy - 17, 1.5, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBlueSeesLuna(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // Blue reaching out (left)
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx - 80, cy - 35, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = CYAN;
  ctx.beginPath(); ctx.arc(cx - 77, cy - 37, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 80, cy - 27); ctx.lineTo(cx - 80, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 80, cy - 23); ctx.lineTo(cx - 55, cy - 20); ctx.stroke(); // reaching
  ctx.beginPath(); ctx.moveTo(cx - 80, cy - 23); ctx.lineTo(cx - 92, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 80, cy - 8); ctx.lineTo(cx - 88, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 80, cy - 8); ctx.lineTo(cx - 72, cy + 10); ctx.stroke();

  // Luna (right)
  ctx.shadowColor = PINK; ctx.strokeStyle = PINK;
  ctx.beginPath(); ctx.arc(cx + 80, cy - 35, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = PINK;
  ctx.beginPath(); ctx.arc(cx + 77, cy - 37, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 80, cy - 27); ctx.lineTo(cx + 80, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 80, cy - 23); ctx.lineTo(cx + 55, cy - 20); ctx.stroke(); // reaching back
  ctx.beginPath(); ctx.moveTo(cx + 80, cy - 23); ctx.lineTo(cx + 92, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 80, cy - 8); ctx.lineTo(cx + 72, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 80, cy - 8); ctx.lineTo(cx + 88, cy + 10); ctx.stroke();

  // Heart glow between them
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.08) * 0.15;
  ctx.fillStyle = PINK;
  ctx.shadowBlur = 20; ctx.shadowColor = PINK;
  ctx.beginPath(); ctx.arc(cx, cy - 28, 12, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawMotherThreat(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0005';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // Mother (warm green/teal)
  ctx.shadowBlur = 10; ctx.shadowColor = '#44ddaa'; ctx.strokeStyle = '#44ddaa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - 35, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 27); ctx.lineTo(cx, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 23); ctx.lineTo(cx - 12, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 23); ctx.lineTo(cx + 12, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx - 8, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 8, cy + 10); ctx.stroke();

  // Enemy silhouettes closing in
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = RED;
  for (let i = 0; i < 5; i++) {
    const ex = cx - 180 + i * 40;
    drawMiniStickman(ctx, ex, cy, RED, 0.7);
  }
  for (let i = 0; i < 5; i++) {
    const ex = cx + 100 + i * 40;
    drawMiniStickman(ctx, ex, cy, RED, 0.7);
  }

  // "NEON" label
  ctx.globalAlpha = 0.7;
  ctx.shadowBlur = 10; ctx.shadowColor = '#44ddaa';
  ctx.fillStyle = '#44ddaa';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NEON (Mother)', cx, cy - 50);

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawProtectMother(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2;
  const cy = ch * 0.55;

  // Blue standing protectively in front of mother
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 3;
  // Combat pose
  ctx.beginPath(); ctx.arc(cx - 30, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 29); ctx.lineTo(cx - 30, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 25); ctx.lineTo(cx - 45, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 25); ctx.lineTo(cx - 15, cy - 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 10); ctx.lineTo(cx - 42, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 10); ctx.lineTo(cx - 18, cy + 10); ctx.stroke();

  // Mother behind
  ctx.shadowColor = '#44ddaa'; ctx.strokeStyle = '#44ddaa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(cx + 30, cy - 35, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 28); ctx.lineTo(cx + 30, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 10); ctx.lineTo(cx + 22, cy + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 10); ctx.lineTo(cx + 38, cy + 8); ctx.stroke();

  // Shield effect
  ctx.globalAlpha = 0.2 + Math.sin(frame * 0.08) * 0.1;
  ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - 20, 50, 0, Math.PI * 2); ctx.stroke();

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBossIntro(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0000';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.45;
  const appearProgress = Math.min(1, frame / 90);

  // Lightning flashes for dramatic entrance
  if (appearProgress < 0.5 && Math.random() < 0.1) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
  }

  // Massive boss silhouette
  ctx.globalAlpha = appearProgress;
  ctx.shadowBlur = 25; ctx.shadowColor = RED;
  ctx.strokeStyle = RED; ctx.lineWidth = 4;

  // Large head
  ctx.beginPath(); ctx.arc(cx, cy - 60, 16, 0, Math.PI * 2); ctx.stroke();
  // Menacing eyes
  ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.arc(cx - 6, cy - 63, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 6, cy - 63, 3, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.strokeStyle = RED; ctx.shadowColor = RED;
  ctx.beginPath(); ctx.moveTo(cx, cy - 44); ctx.lineTo(cx, cy - 5); ctx.stroke();
  // Arms
  ctx.beginPath(); ctx.moveTo(cx, cy - 35); ctx.lineTo(cx - 40, cy - 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 35); ctx.lineTo(cx + 40, cy - 25); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 18, cy + 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 18, cy + 25); ctx.stroke();

  // Dark aura
  ctx.globalAlpha = appearProgress * 0.2;
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.arc(cx, cy - 30, 80 + Math.sin(frame * 0.05) * 20, 0, Math.PI * 2); ctx.fill();

  // "BOSS" warning text that flashes
  if (appearProgress > 0.6) {
    const warningAlpha = Math.sin(frame * 0.15) * 0.5 + 0.5;
    ctx.globalAlpha = warningAlpha * (appearProgress - 0.6) / 0.4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = RED;
    ctx.fillStyle = RED;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BOSS ⚠', cx, cy - 100);
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBossDefeated(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // Boss on ground (fallen) — fading out
  const bossFade = Math.max(0, 1 - frame / 180);
  ctx.globalAlpha = 0.3 * bossFade;
  ctx.strokeStyle = RED; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx + 60, cy, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 60, cy + 12); ctx.lineTo(cx + 30, cy + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 60, cy + 12); ctx.lineTo(cx + 40, cy + 20); ctx.stroke();

  // Dissolving particles from boss
  if (bossFade > 0.2) {
    ctx.globalAlpha = bossFade * 0.4;
    for (let i = 0; i < 8; i++) {
      const px = cx + 60 + Math.cos(frame * 0.05 + i * 0.8) * (20 + frame * 0.3);
      const py = cy + Math.sin(frame * 0.05 + i * 0.8) * (10 + frame * 0.2);
      ctx.fillStyle = RED;
      ctx.shadowBlur = 5; ctx.shadowColor = RED;
      ctx.beginPath(); ctx.arc(px, py, 2 * bossFade, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Blue standing victorious
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx - 40, cy - 35, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx - 37, cy - 37, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 40, cy - 26); ctx.lineTo(cx - 40, cy - 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 40, cy - 22); ctx.lineTo(cx - 55, cy - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 40, cy - 22); ctx.lineTo(cx - 25, cy - 17); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 40, cy - 7); ctx.lineTo(cx - 50, cy + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 40, cy - 7); ctx.lineTo(cx - 30, cy + 12); ctx.stroke();

  // Victory particles — enhanced with more variety
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 20; i++) {
    const px = (i * 73 + frame * 0.5) % cw;
    const py = ch - ((i * 47 + frame * 0.8) % ch);
    const col = [CYAN, LIME, YELLOW, GOLD, MAGENTA][i % 5];
    ctx.fillStyle = col; ctx.shadowBlur = 5; ctx.shadowColor = col;
    ctx.beginPath(); ctx.arc(px, py, 2 + Math.sin(frame * 0.1 + i) * 1, 0, Math.PI * 2); ctx.fill();
  }

  // "VICTORY" flash text
  const victoryAlpha = Math.max(0, 1 - frame / 120);
  if (victoryAlpha > 0) {
    ctx.globalAlpha = victoryAlpha;
    ctx.shadowBlur = 25;
    ctx.shadowColor = GOLD;
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY', cx, cy - 70);
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawReunion(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  drawBlueSeesLuna(ctx, cw, ch, frame);
  // Extra hearts
  const cx = cw / 2;
  const cy = ch * 0.55;
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.06) * 0.2;
  ctx.fillStyle = PINK;
  for (let i = 0; i < 4; i++) {
    const hx = cx + Math.cos(frame * 0.03 + i * 1.5) * 60;
    const hy = cy - 40 + Math.sin(frame * 0.04 + i) * 20;
    ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVictoryCelebration(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;

  // All gang members
  const members = [
    { x: cx - 120, color: CYAN, name: 'BLUE' },
    { x: cx - 60, color: PURPLE, name: 'SHADOW' },
    { x: cx, color: ORANGE, name: 'BLAZE' },
    { x: cx + 60, color: YELLOW, name: 'VOLT' },
    { x: cx + 120, color: '#44ddff', name: 'ICE' },
  ];

  for (const m of members) {
    ctx.shadowBlur = 12; ctx.shadowColor = m.color; ctx.strokeStyle = m.color; ctx.lineWidth = 2.5;
    drawMiniStickman(ctx, m.x, cy, m.color, 1);
  }

  // Luna next to Blue
  ctx.shadowColor = PINK; ctx.strokeStyle = PINK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx - 140, cy - 35, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 140, cy - 28); ctx.lineTo(cx - 140, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 140, cy - 10); ctx.lineTo(cx - 148, cy + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 140, cy - 10); ctx.lineTo(cx - 132, cy + 8); ctx.stroke();

  // Celebration particles
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 25; i++) {
    const px = (i * 73 + frame * 0.5) % cw;
    const py = ch - ((i * 47 + frame * 0.8) % ch);
    const colors = [CYAN, LIME, MAGENTA, YELLOW, GOLD];
    const col = colors[i % 5];
    ctx.fillStyle = col; ctx.shadowBlur = 5; ctx.shadowColor = col;
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawRevive(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.55;
  const progress = Math.min(1, frame / 90);

  // Blue on ground → standing up
  ctx.globalAlpha = progress;
  ctx.shadowBlur = 15 + progress * 10; ctx.shadowColor = CYAN;
  ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;

  const standY = cy - progress * 20;
  // Head
  ctx.beginPath(); ctx.arc(cx, standY - 38, 9, 0, Math.PI * 2); ctx.stroke();
  // Eye (opens)
  if (progress > 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx + 3, standY - 40, 2 * (progress - 0.5) * 2, 0, Math.PI * 2); ctx.fill();
  }
  // Body
  ctx.beginPath(); ctx.moveTo(cx, standY - 29); ctx.lineTo(cx, standY - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, standY - 25); ctx.lineTo(cx - 12, standY - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, standY - 25); ctx.lineTo(cx + 12, standY - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, standY - 10); ctx.lineTo(cx - 9, standY + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, standY - 10); ctx.lineTo(cx + 9, standY + 10); ctx.stroke();

  // Rebirth energy
  ctx.globalAlpha = progress * 0.3;
  ctx.fillStyle = CYAN;
  ctx.beginPath(); ctx.arc(cx, standY - 20, 40 + Math.sin(frame * 0.1) * 10, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawGangJoin(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  drawHandshake(ctx, cw, ch, frame);
}

function drawWalking(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw / 2;
  const cy = ch * 0.6;

  // Blue walking
  const walkCycle = Math.sin(frame * 0.15) * 8;
  ctx.shadowBlur = 12; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 29); ctx.lineTo(cx, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 10, cy - 20 + Math.sin(frame * 0.15) * 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx + 10, cy - 20 - Math.sin(frame * 0.15) * 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 7 + walkCycle * 0.3, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 7 - walkCycle * 0.3, cy + 10); ctx.stroke();

  // Road
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, cy + 12); ctx.lineTo(cw, cy + 12); ctx.stroke();

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawWarScene(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0005';
  ctx.fillRect(0, 0, cw, ch);

  const cy = ch * 0.55;

  // Multiple stickmen fighting (both sides)
  // Blue gang (left side)
  const blueGang = [CYAN, PURPLE, ORANGE, YELLOW, '#44ddff'];
  for (let i = 0; i < 5; i++) {
    ctx.shadowBlur = 8; ctx.strokeStyle = blueGang[i]; ctx.lineWidth = 2;
    const x = 100 + i * 60 + Math.sin(frame * 0.1 + i) * 15;
    drawMiniStickman(ctx, x, cy, blueGang[i], 0.8);
  }

  // Red enemies (right side)
  for (let i = 0; i < 8; i++) {
    ctx.globalAlpha = 0.5;
    ctx.shadowBlur = 5; ctx.strokeStyle = RED; ctx.lineWidth = 1.5;
    const x = cw - 100 - i * 50 + Math.sin(frame * 0.08 + i) * 10;
    drawMiniStickman(ctx, x, cy, RED, 0.7);
  }

  // Explosions / bullets
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 10; i++) {
    const bx = (i * 137 + frame * 3) % cw;
    const by = cy - 20 + Math.sin(i + frame * 0.1) * 30;
    ctx.fillStyle = [CYAN, RED, ORANGE][i % 3];
    ctx.shadowBlur = 8; ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

// ====== DEEP STORY SCENES ======

function drawDarkRevelation(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#0a0020');
  grad.addColorStop(1, '#050510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Dark pulsing aura
  ctx.globalAlpha = 0.15 + Math.sin(frame * 0.04) * 0.08;
  ctx.fillStyle = PURPLE;
  ctx.shadowBlur = 40; ctx.shadowColor = PURPLE;
  ctx.beginPath(); ctx.arc(cx, cy - 20, 70 + Math.sin(frame * 0.06) * 20, 0, Math.PI * 2); ctx.fill();
  // Blue standing, looking at data streams
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 29); ctx.lineTo(cx, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 15, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx + 15, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 9, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 9, cy + 10); ctx.stroke();
  // Data streams
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = YELLOW; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const sx = cx + (i - 4) * 40;
    const sy = (frame * 2 + i * 50) % ch;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 20); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBetrayal(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0005';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Figure turning away (orange)
  const turnProgress = Math.min(1, frame / 90);
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = 15; ctx.shadowColor = ORANGE; ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.5;
  const bx = cx + 50 - turnProgress * 30;
  ctx.beginPath(); ctx.arc(bx, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, cy - 29); ctx.lineTo(bx, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, cy - 25); ctx.lineTo(bx - 15, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, cy - 25); ctx.lineTo(bx + 15, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, cy - 10); ctx.lineTo(bx - 9, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, cy - 10); ctx.lineTo(bx + 9, cy + 10); ctx.stroke();
  // Blue reaching out (left)
  ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN;
  ctx.beginPath(); ctx.arc(cx - 60, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 29); ctx.lineTo(cx - 60, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 25); ctx.lineTo(cx - 30, cy - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 25); ctx.lineTo(cx - 75, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 10); ctx.lineTo(cx - 68, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 60, cy - 10); ctx.lineTo(cx - 52, cy + 10); ctx.stroke();
  // Cracking symbol between them
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
  ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.shadowColor = RED;
  ctx.beginPath(); ctx.moveTo(cx - 10, cy - 50); ctx.lineTo(cx + 5, cy - 30); ctx.lineTo(cx - 5, cy - 10); ctx.lineTo(cx + 10, cy + 10); ctx.stroke();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawFlashback(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  // Wavy sepia-like effect
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#1a1500');
  grad.addColorStop(1, '#0a0800');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Wavy overlay (flashback effect)
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
  for (let y = 0; y < ch; y += 4) {
    const offset = Math.sin(y * 0.02 + frame * 0.03) * 3;
    ctx.beginPath(); ctx.moveTo(0, y + offset); ctx.lineTo(cw, y + offset); ctx.stroke();
  }
  // Two stickmen in the past
  ctx.globalAlpha = 0.7;
  ctx.shadowBlur = 10; ctx.shadowColor = GOLD; ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
  drawMiniStickman(ctx, cx - 40, cy, GOLD, 1);
  drawMiniStickman(ctx, cx + 40, cy, '#aa8800', 1);
  // "MEMORY" label
  ctx.globalAlpha = 0.4 + Math.sin(frame * 0.06) * 0.2;
  ctx.fillStyle = GOLD; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
  ctx.fillText('[ MEMORY ]', cx, cy - 60);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawLunaVision(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0020';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.5;
  // Swirling code/pattern around Luna
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + frame * 0.02;
    const dist = 50 + Math.sin(frame * 0.05 + i) * 20;
    ctx.strokeStyle = i % 2 === 0 ? PINK : CYAN;
    ctx.shadowBlur = 5; ctx.shadowColor = ctx.strokeStyle; ctx.lineWidth = 1;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy - 20 + Math.sin(angle) * dist * 0.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 10, sy - 5); ctx.stroke();
  }
  // Luna with glowing eyes
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15; ctx.shadowColor = PINK; ctx.strokeStyle = PINK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy - 38, 9, 0, Math.PI * 2); ctx.stroke();
  // Glowing eyes
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 8; ctx.shadowColor = '#ffffff';
  ctx.beginPath(); ctx.arc(cx - 3, cy - 40, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 3, cy - 40, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = PINK;
  ctx.beginPath(); ctx.moveTo(cx, cy - 29); ctx.lineTo(cx, cy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx - 12, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 25); ctx.lineTo(cx + 12, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 8, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 8, cy + 10); ctx.stroke();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawShadowPast(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050010';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Shadow kneeling
  ctx.globalAlpha = 0.8;
  ctx.shadowBlur = 12; ctx.shadowColor = PURPLE; ctx.strokeStyle = PURPLE; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy - 25, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 17); ctx.lineTo(cx, cy - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 12, cy - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 5, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx - 10, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + 8, cy + 10); ctx.stroke();
  // Red King silhouette behind
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = RED; ctx.shadowColor = RED; ctx.lineWidth = 3;
  const bigScale = 2;
  drawMiniStickman(ctx, cx + 120, cy - 10, RED, bigScale * 0.8);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawMotherSecret(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Mother (warm green)
  ctx.shadowBlur = 12; ctx.shadowColor = '#44ddaa'; ctx.strokeStyle = '#44ddaa'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx - 30, cy - 35, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 27); ctx.lineTo(cx - 30, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 23); ctx.lineTo(cx - 42, cy - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 23); ctx.lineTo(cx - 18, cy - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 8); ctx.lineTo(cx - 38, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 8); ctx.lineTo(cx - 22, cy + 10); ctx.stroke();
  // Blue listening (shocked)
  ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN;
  ctx.beginPath(); ctx.arc(cx + 40, cy - 35, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx + 43, cy - 37, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy - 26); ctx.lineTo(cx + 40, cy - 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy - 22); ctx.lineTo(cx + 28, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy - 22); ctx.lineTo(cx + 52, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy - 7); ctx.lineTo(cx + 32, cy + 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 40, cy - 7); ctx.lineTo(cx + 48, cy + 11); ctx.stroke();
  // Warm glow between them
  ctx.globalAlpha = 0.1 + Math.sin(frame * 0.05) * 0.05;
  ctx.fillStyle = '#44ddaa';
  ctx.beginPath(); ctx.arc(cx, cy - 20, 40, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawRedKingPlan(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0000';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.45;
  // Red King sitting on throne
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = 25; ctx.shadowColor = RED; ctx.strokeStyle = RED; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy - 55, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(cx - 5, cy - 58, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 58, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy - 41); ctx.lineTo(cx, cy - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx - 35, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx + 35, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 15, cy + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 15, cy + 20); ctx.stroke();
  // Throne
  ctx.globalAlpha = 0.4; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 75); ctx.lineTo(cx - 30, cy + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 75); ctx.lineTo(cx + 30, cy + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30, cy - 75); ctx.lineTo(cx + 30, cy - 75); ctx.stroke();
  // Dark aura
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.arc(cx, cy - 30, 80 + Math.sin(frame * 0.05) * 15, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawGangOath(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  const members = [
    { x: cx - 100, color: CYAN }, { x: cx - 50, color: PURPLE },
    { x: cx, color: ORANGE }, { x: cx + 50, color: YELLOW }, { x: cx + 100, color: '#44ddff' },
  ];
  for (const m of members) {
    ctx.shadowBlur = 12; ctx.shadowColor = m.color; ctx.strokeStyle = m.color; ctx.lineWidth = 2.5;
    drawMiniStickman(ctx, m.x, cy, m.color, 1);
    // Fists raised
    ctx.beginPath(); ctx.moveTo(m.x, cy - 26); ctx.lineTo(m.x, cy - 42); ctx.stroke();
  }
  // United glow
  ctx.globalAlpha = 0.08 + Math.sin(frame * 0.05) * 0.04;
  ctx.fillStyle = GOLD;
  ctx.shadowBlur = 0;
  ctx.fillRect(cx - 130, cy - 60, 260, 80);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawVoidRiftScene(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050008';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.4;
  // Giant rift in the sky
  ctx.globalAlpha = 0.6;
  const riftWidth = 150 + Math.sin(frame * 0.05) * 30;
  const riftHeight = 8 + Math.sin(frame * 0.08) * 3;
  ctx.shadowBlur = 30; ctx.shadowColor = MAGENTA;
  ctx.strokeStyle = MAGENTA; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, riftWidth, riftHeight, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = MAGENTA; ctx.globalAlpha = 0.15;
  ctx.beginPath(); ctx.ellipse(cx, cy, riftWidth * 0.8, riftHeight * 3, 0, 0, Math.PI * 2); ctx.fill();
  // Energy tendrils
  ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + frame * 0.03;
    const len = 40 + Math.sin(frame * 0.08 + i) * 20;
    ctx.strokeStyle = i % 2 === 0 ? MAGENTA : PURPLE;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * riftWidth * 0.5, cy + Math.sin(angle) * riftHeight);
    ctx.lineTo(cx + Math.cos(angle) * (riftWidth * 0.5 + len), cy + Math.sin(angle) * (riftHeight + len * 0.3));
    ctx.stroke();
  }
  // Small figures looking up
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 3; i++) {
    drawMiniStickman(ctx, cx - 60 + i * 60, ch * 0.7, [CYAN, PURPLE, ORANGE][i], 0.7);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawMysteryFigure(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#030008';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.5;
  const appearProgress = Math.min(1, frame / 100);
  // Shadowy figure
  ctx.globalAlpha = appearProgress * 0.8;
  ctx.shadowBlur = 20; ctx.shadowColor = '#ff0044'; ctx.strokeStyle = '#ff0044'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy - 38, 10, 0, Math.PI * 2); ctx.stroke();
  // Glowing eye
  if (appearProgress > 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx + 3, cy - 40, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowColor = '#ff0044'; ctx.strokeStyle = '#ff0044'; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.moveTo(cx, cy - 28); ctx.lineTo(cx, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx - 15, cy - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx + 15, cy - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx - 10, cy + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 10, cy + 12); ctx.stroke();
  // Smoke effect
  ctx.globalAlpha = appearProgress * 0.2;
  ctx.fillStyle = '#ff0044';
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + frame * 0.02;
    const dist = 30 + Math.sin(frame * 0.04 + i) * 10;
    ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy - 20 + Math.sin(angle) * dist, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawSacrifice(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Luna reaching toward bright light
  ctx.shadowBlur = 12; ctx.shadowColor = PINK; ctx.strokeStyle = PINK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx + 30, cy - 35, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 27); ctx.lineTo(cx + 30, cy - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 23); ctx.lineTo(cx + 50, cy - 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 23); ctx.lineTo(cx + 20, cy - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 8); ctx.lineTo(cx + 22, cy + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 8); ctx.lineTo(cx + 38, cy + 10); ctx.stroke();
  // Bright light
  ctx.globalAlpha = 0.2 + Math.sin(frame * 0.08) * 0.1;
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 40; ctx.shadowColor = '#ffffff';
  ctx.beginPath(); ctx.arc(cx + 100, cy - 25, 30, 0, Math.PI * 2); ctx.fill();
  // Blue reaching from behind
  ctx.globalAlpha = 0.6;
  ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN;
  ctx.beginPath(); ctx.arc(cx - 50, cy - 35, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 50, cy - 26); ctx.lineTo(cx - 50, cy - 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 50, cy - 22); ctx.lineTo(cx - 30, cy - 28); ctx.stroke();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawTruthRevealed(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.5;
  // Central glowing core
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.06) * 0.15;
  const coreGrad = ctx.createRadialGradient(cx, cy - 20, 5, cx, cy - 20, 80);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.5, CYAN);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(cx, cy - 20, 80, 0, Math.PI * 2); ctx.fill();
  // All characters around it
  ctx.globalAlpha = 0.8;
  const chars = [
    { x: cx - 80, color: CYAN }, { x: cx - 40, color: PURPLE },
    { x: cx + 40, color: PINK }, { x: cx + 80, color: YELLOW },
  ];
  for (const c of chars) {
    ctx.shadowBlur = 10; ctx.shadowColor = c.color; ctx.strokeStyle = c.color; ctx.lineWidth = 2;
    drawMiniStickman(ctx, c.x, cy + 30, c.color, 0.7);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawDarkCorridor(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#020005';
  ctx.fillRect(0, 0, cw, ch);
  // Vanishing point corridor
  const cx = cw / 2; const cy = ch * 0.5;
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = PURPLE; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const offset = i * 50;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(-offset, ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cw + offset, ch); ctx.stroke();
  }
  // Blue at the far end
  ctx.globalAlpha = 0.5;
  ctx.shadowBlur = 8; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 1.5;
  drawMiniStickman(ctx, cx, cy - 5, CYAN, 0.5);
  // Flickering lights
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.15) * 0.2;
  ctx.fillStyle = ORANGE;
  ctx.shadowBlur = 5; ctx.shadowColor = ORANGE;
  ctx.beginPath(); ctx.arc(cx - 20, cy - 50, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 25, cy - 45, 2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawExplosion(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0000';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.45;
  const progress = Math.min(1, frame / 60);
  // Explosion burst
  ctx.globalAlpha = progress * 0.5;
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const dist = progress * (60 + i * 5);
    const colors = [ORANGE, RED, YELLOW, '#ffffff'];
    ctx.fillStyle = colors[i % 4];
    ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 4 + progress * 3, 0, Math.PI * 2); ctx.fill();
  }
  // Characters knocked back
  if (progress > 0.3) {
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = 8; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
    drawMiniStickman(ctx, cx - 100 - progress * 30, ch * 0.6, CYAN, 0.8);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawSilentPrayer(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.6;
  // Blue kneeling in prayer
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy - 22, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 10, cy - 6); ctx.lineTo(cx, cy - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 10, cy + 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 8, cy + 12); ctx.stroke();
  // Gentle light from above
  ctx.globalAlpha = 0.15 + Math.sin(frame * 0.04) * 0.08;
  const lightGrad = ctx.createRadialGradient(cx, cy - 100, 5, cx, cy, 120);
  lightGrad.addColorStop(0, '#ffffff');
  lightGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lightGrad;
  ctx.beginPath(); ctx.arc(cx, cy - 50, 120, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawStormApproaching(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0005';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.6;
  // Dark clouds rolling in
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 8; i++) {
    const cloudX = (i * 120 + frame * 0.5) % (cw + 200) - 100;
    const cloudY = 30 + i * 20 + Math.sin(frame * 0.02 + i) * 10;
    ctx.fillStyle = '#1a0020';
    ctx.shadowBlur = 20; ctx.shadowColor = PURPLE;
    ctx.beginPath(); ctx.ellipse(cloudX, cloudY, 60, 20, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Lightning
  if (Math.sin(frame * 0.3) > 0.8) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
    ctx.beginPath(); ctx.moveTo(cw * 0.6, 20); ctx.lineTo(cw * 0.55, 100); ctx.lineTo(cw * 0.65, 120); ctx.lineTo(cw * 0.58, 200); ctx.stroke();
  }
  // Characters looking up
  ctx.globalAlpha = 0.8;
  ctx.shadowBlur = 10; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
  drawMiniStickman(ctx, cx - 40, cy, CYAN, 0.9);
  drawMiniStickman(ctx, cx + 40, cy, PURPLE, 0.8);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawHiddenBase(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050808';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.6;
  // Underground base walls
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = LIME; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 150, cy - 80, 300, 120);
  // Screens with data
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#002200';
    ctx.fillRect(cx - 100 + i * 80, cy - 60, 50, 30);
    ctx.strokeStyle = LIME; ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - 100 + i * 80, cy - 60, 50, 30);
  }
  // Characters in meeting
  ctx.globalAlpha = 0.9;
  const chars = [{ x: cx - 60, color: CYAN }, { x: cx, color: PURPLE }, { x: cx + 60, color: ORANGE }];
  for (const c of chars) {
    ctx.shadowBlur = 10; ctx.shadowColor = c.color; ctx.strokeStyle = c.color; ctx.lineWidth = 2;
    drawMiniStickman(ctx, c.x, cy + 10, c.color, 0.8);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawTheDeal(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  drawHiddenBase(ctx, cw, ch, frame);
  // Add tension with red glow
  const cx = cw / 2; const cy = ch * 0.6;
  ctx.globalAlpha = 0.1 + Math.sin(frame * 0.06) * 0.05;
  ctx.fillStyle = RED;
  ctx.shadowBlur = 20; ctx.shadowColor = RED;
  ctx.beginPath(); ctx.arc(cx + 80, cy, 40, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawLastStand(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#0a0000';
  ctx.fillRect(0, 0, cw, ch);
  const cy = ch * 0.55;
  // Blue Gang in defensive circle
  ctx.globalAlpha = 0.9;
  const gang = [
    { x: cw * 0.3, color: CYAN }, { x: cw * 0.4, color: PURPLE },
    { x: cw * 0.5, color: ORANGE }, { x: cw * 0.6, color: YELLOW },
  ];
  for (const g of gang) {
    ctx.shadowBlur = 12; ctx.shadowColor = g.color; ctx.strokeStyle = g.color; ctx.lineWidth = 2.5;
    drawMiniStickman(ctx, g.x, cy, g.color, 1);
  }
  // Enemies surrounding (many)
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 12; i++) {
    const ex = cw * 0.1 + i * cw * 0.07;
    drawMiniStickman(ctx, ex, cy, RED, 0.6);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawNewDawn(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#1a1000');
  grad.addColorStop(0.5, '#0a0800');
  grad.addColorStop(1, '#050510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  // Rising sun glow
  const dawnProgress = Math.min(1, frame / 120);
  ctx.globalAlpha = dawnProgress * 0.3;
  const sunGrad = ctx.createRadialGradient(cx, ch * 0.3, 5, cx, ch * 0.3, 200);
  sunGrad.addColorStop(0, GOLD);
  sunGrad.addColorStop(0.5, ORANGE);
  sunGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = sunGrad;
  ctx.beginPath(); ctx.arc(cx, ch * 0.3, 200, 0, Math.PI * 2); ctx.fill();
  // Blue and Luna together
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = 15; ctx.shadowColor = CYAN; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5;
  drawMiniStickman(ctx, cx - 20, cy, CYAN, 1);
  ctx.shadowColor = PINK; ctx.strokeStyle = PINK;
  drawMiniStickman(ctx, cx + 20, cy, PINK, 0.9);
  // Hope particles
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 10; i++) {
    const px = (i * 97 + frame * 0.5) % cw;
    const py = ch - ((i * 53 + frame * 0.3) % ch);
    const col = [CYAN, GOLD, LIME, PINK][i % 4];
    ctx.fillStyle = col; ctx.shadowBlur = 5; ctx.shadowColor = col;
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawMiniStickman(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number) {
  const s = scale;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2 * s;
  // Head
  ctx.beginPath(); ctx.arc(x, y - 38 * s, 7 * s, 0, Math.PI * 2); ctx.stroke();
  // Body
  ctx.beginPath(); ctx.moveTo(x, y - 31 * s); ctx.lineTo(x, y - 12 * s); ctx.stroke();
  // Arms
  ctx.beginPath(); ctx.moveTo(x, y - 26 * s); ctx.lineTo(x - 10 * s, y - 20 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 26 * s); ctx.lineTo(x + 10 * s, y - 20 * s); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x - 8 * s, y + 5 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x + 8 * s, y + 5 * s); ctx.stroke();
}

function drawSubtitle(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  text: string, speaker: string, color: string, progress: number,
) {
  const displayText = text.slice(0, Math.max(0, Math.floor(progress)));

  const boxH = 90;
  const boxY = ch - boxH - 20;
  const boxW = Math.min(700, cw - 100);
  const boxX = (cw - boxW) / 2 + 30; // Offset slightly right for portrait

  ctx.save();

  // Semi-transparent dark background with gradient
  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  boxGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  boxGrad.addColorStop(1, 'rgba(5, 5, 16, 0.9)');
  ctx.fillStyle = boxGrad;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Neon border with glow
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 12; ctx.shadowColor = color;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Accent line at top of dialogue box
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = color;
  ctx.shadowBlur = 8; ctx.shadowColor = color;
  ctx.fillRect(boxX + 1, boxY + 1, boxW - 2, 2);

  // Speaker name
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 8; ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(speaker, boxX + 16, boxY + 24);

  // Text with typewriter effect
  ctx.shadowBlur = 2;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle = '#dddddd';
  ctx.font = '14px monospace';
  ctx.fillText(displayText, boxX + 16, boxY + 52);

  // Blinking cursor when still typing
  if (displayText.length < text.length) {
    const cursorAlpha = Math.sin(Date.now() * 0.01) > 0 ? 0.8 : 0;
    ctx.globalAlpha = cursorAlpha;
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(displayText).width;
    ctx.fillRect(boxX + 16 + textWidth, boxY + 40, 2, 16);
  }

  // Continue hint - more prominent with pulsing animation
  if (displayText.length >= text.length) {
    const pulseAlpha = 0.4 + Math.sin(Date.now() * 0.006) * 0.4;
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';

    // Pulsing triangle indicator
    const triX = boxX + boxW - 16;
    const triY = boxY + boxH - 18;
    ctx.beginPath();
    ctx.moveTo(triX - 4, triY - 5);
    ctx.lineTo(triX + 4, triY);
    ctx.lineTo(triX - 4, triY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillText('TAP', triX - 16, triY + 4);
  }

  // Skip button (top-right)
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.shadowBlur = 0;
  ctx.fillText('SKIP [ESC]', cw - 15, 20);

  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  ctx.restore();
}
