'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  type JoystickInput, CYAN, LIME, MAGENTA, SKILL_DEFS, type SkillElement,
  DASH_COOLDOWN, SHIELD_COOLDOWN, SPECIAL_COOLDOWN,
} from '@/lib/game-types';
import { useGameStore } from '@/stores/game-store';

interface Controls {
  moveLeft: () => void;
  moveRight: () => void;
  stopMove: () => void;
  jump: () => void;
  shoot: () => void;
  stopShoot: () => void;
  dash: () => void;
  shield: () => void;
  special: () => void;
  setJoystick: (input: JoystickInput) => void;
  executeSkill: (skillId: string) => void;
  pause: () => void;
}

function getControls(): Controls | null {
  return (window as unknown as Record<string, unknown>).__neonWarriorControls as Controls | null;
}

function haptic(ms: number = 10) {
  try { navigator.vibrate?.(ms); } catch {}
}

// Element → emoji icon mapping for skill buttons
const ELEMENT_ICONS: Record<SkillElement, string> = {
  fire: '🔥',
  frost: '❄️',
  shadow: '👤',
  summon: '👻',
  death: '💀',
  lightning: '⚡',
  void: '🌀',
  blood: '🩸',
};

// Element → glow color mapping for skill button borders
const ELEMENT_GLOW_COLORS: Record<SkillElement, string> = {
  fire: '#ff4400',
  frost: '#88eeff',
  shadow: '#8800ff',
  summon: '#aa00ff',
  death: '#660066',
  lightning: '#ffff00',
  void: '#ff00ff',
  blood: '#cc0000',
};

// Default ability names and colors for unequipped slots
const DEFAULT_ABILITIES = [
  { name: 'DASH', icon: '⚡', color: CYAN, glowColor: CYAN },
  { name: 'SHIELD', icon: '🛡', color: LIME, glowColor: LIME },
  { name: 'SPECIAL', icon: '✦', color: MAGENTA, glowColor: MAGENTA },
] as const;

// Cooldown multiplier per skill level (level 1=1.0, level 5=0.6)
const CD_MULTIPLIERS = [1.0, 0.9, 0.8, 0.7, 0.6];

// ==========================================
// SVG Arc Generator for Mobile Legends Sweep
// ==========================================

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

// ==========================================
// Cooldown Overlay Component (ML-style)
// ==========================================

function CooldownOverlay({
  remainingFrames,
  maxFrames,
  color,
  size,
}: {
  remainingFrames: number;
  maxFrames: number;
  color: string;
  size: number;
}) {
  const isOnCooldown = remainingFrames > 0;
  const progress = isOnCooldown ? 1 - remainingFrames / maxFrames : 1; // 0=just used, 1=ready
  const remainingSec = remainingFrames / 60;

  // SVG arc for the sweep — covers the "remaining cooldown" area
  // The remainingRatio goes from 1 (just used) to 0 (ready)
  const remainingRatio = 1 - progress;

  // Generate the pie-slice arc path for remaining cooldown
  // Sweeps clockwise from 12 o'clock, covering remainingRatio of the circle
  let arcPath = '';
  if (isOnCooldown && remainingRatio > 0.001) {
    const sweepAngle = remainingRatio * 360;
    arcPath = describeArc(size / 2, size / 2, size / 2 - 2, 0, sweepAngle);
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden">
      {/* Dark overlay for the remaining cooldown area (pie-slice) */}
      {isOnCooldown && remainingRatio > 0.001 && (
        <svg
          className="absolute"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(0deg)' }}
        >
          <path
            d={arcPath}
            fill="rgba(0,0,0,0.65)"
          />
        </svg>
      )}

      {/* Subtle dark tint over the entire button when on cooldown */}
      {isOnCooldown && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        />
      )}

      {/* Cooldown timer text */}
      {isOnCooldown && (
        <span
          className="relative z-20 font-mono font-bold"
          style={{
            color: '#ffffff',
            textShadow: '0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)',
            fontSize: remainingSec >= 10 ? '10px' : '13px',
            lineHeight: 1,
          }}
        >
          {remainingSec.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ==========================================
// Skill Level Dots
// ==========================================

function SkillLevelDots({ level, color }: { level: number; color: string }) {
  if (level <= 1) return null;
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-20">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            backgroundColor: i <= level ? color : 'rgba(255,255,255,0.15)',
            boxShadow: i <= level ? `0 0 3px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ==========================================
// Skill Button Component
// ==========================================

function SkillButton({
  icon,
  color,
  label,
  ready,
  remainingFrames,
  maxFrames,
  skillLevel,
  onActionStart,
  onActionEnd,
  buttonSize,
}: {
  icon: string;
  color: string;
  label: string;
  ready: boolean;
  remainingFrames: number;
  maxFrames: number;
  skillLevel: number;
  onActionStart: () => void;
  onActionEnd: () => void;
  buttonSize: number;
}) {
  // Flash effect is handled purely via CSS animation on the button element
  // When `ready` becomes true, the animation plays once via the `skill-ready-flash` class

  const isRound = buttonSize <= 48;

  return (
    <button
      className={`action-btn flex items-center justify-center ${isRound ? 'rounded-full' : 'rounded-2xl'} select-none font-bold relative overflow-hidden ${ready ? 'skill-ready-flash' : ''}`}
      style={{
        width: buttonSize,
        height: buttonSize,
        background: ready
          ? `radial-gradient(circle at 40% 35%, ${color}18, ${color}06)`
          : `radial-gradient(circle at 40% 35%, ${color}0a, ${color}03)`,
        border: `${isRound ? 2 : 2.5}px solid ${ready ? `${color}55` : `${color}20`}`,
        color: ready ? color : `${color}44`,
        textShadow: ready ? `0 0 6px ${color}` : 'none',
        boxShadow: ready ? `0 0 10px ${color}18, inset 0 0 8px ${color}08` : 'none',
        opacity: ready ? 1 : 0.55,
        fontSize: buttonSize <= 48 ? '18px' : '24px',
      }}
      onTouchStart={(e) => { e.preventDefault(); onActionStart(); }}
      onTouchEnd={(e) => { e.preventDefault(); onActionEnd(); }}
      onMouseDown={(e) => { e.preventDefault(); onActionStart(); }}
      onMouseUp={(e) => { e.preventDefault(); onActionEnd(); }}
    >
      {/* Mobile Legends cooldown overlay */}
      {!ready && (
        <CooldownOverlay
          remainingFrames={remainingFrames}
          maxFrames={maxFrames}
          color={color}
          size={buttonSize}
        />
      )}

      {/* Ready glow pulse */}
      {ready && (
        <div className="absolute inset-0 rounded-full" style={{
          boxShadow: `0 0 12px ${color}44, inset 0 0 8px ${color}18`,
          animation: 'pulse-glow 2.5s ease-in-out infinite',
        }} />
      )}

      {/* Skill icon (hidden when on cooldown and timer is shown) */}
      <span className="relative z-10" style={{ opacity: ready ? 1 : 0.3 }}>{icon}</span>

      {/* Skill name label */}
      <div
        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
        style={{
          fontSize: '5px',
          fontFamily: 'monospace',
          fontWeight: 700,
          color: ready ? color : `${color}44`,
          textShadow: ready ? `0 0 3px ${color}88` : 'none',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>

      {/* Skill level dots */}
      <SkillLevelDots level={skillLevel} color={color} />
    </button>
  );
}

// ==========================================
// Main TouchControls Component
// ==========================================

export default function TouchControls() {
  const joystickTouchId = useRef<number | null>(null);
  const mouseJoystickActive = useRef(false);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const activeActions = useRef<Set<string>>(new Set());
  const shootIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track pressed state for glow ring effect
  const [firePressed, setFirePressed] = useState(false);

  // Read cooldowns from store for button feedback
  const dashCooldown = useGameStore(s => s.dashCooldown);
  const shieldCooldown = useGameStore(s => s.shieldCooldown);
  const specialCooldown = useGameStore(s => s.specialCooldown);
  const equippedSkills = useGameStore(s => s.saveData.equippedSkills);
  const skillUpgrades = useGameStore(s => s.saveData.skillUpgrades);
  const gamePhase = useGameStore(s => s.gamePhase);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const backToMenu = useGameStore(s => s.backToMenu);
  const saveGame = useGameStore(s => s.saveGame);
  const currentLevel = useGameStore(s => s.currentLevel);

  const maxDist = 35;

  // Compute skill info based on equipped skills
  const skill0 = equippedSkills[0] ? SKILL_DEFS.find(s => s.id === equippedSkills[0]) : null;
  const skill1 = equippedSkills[1] ? SKILL_DEFS.find(s => s.id === equippedSkills[1]) : null;
  const skill2 = equippedSkills[2] ? SKILL_DEFS.find(s => s.id === equippedSkills[2]) : null;

  // Use element icon and glow color for equipped skills, default icons/colors otherwise
  const dashIcon = skill0 ? ELEMENT_ICONS[skill0.element] : DEFAULT_ABILITIES[0].icon;
  const dashColor = skill0 ? ELEMENT_GLOW_COLORS[skill0.element] : DEFAULT_ABILITIES[0].glowColor;
  const dashLabel = skill0 ? skill0.name : DEFAULT_ABILITIES[0].name;
  const shldIcon = skill1 ? ELEMENT_ICONS[skill1.element] : DEFAULT_ABILITIES[1].icon;
  const shldColor = skill1 ? ELEMENT_GLOW_COLORS[skill1.element] : DEFAULT_ABILITIES[1].glowColor;
  const shldLabel = skill1 ? skill1.name : DEFAULT_ABILITIES[1].name;
  const spclIcon = skill2 ? ELEMENT_ICONS[skill2.element] : DEFAULT_ABILITIES[2].icon;
  const spclColor = skill2 ? ELEMENT_GLOW_COLORS[skill2.element] : DEFAULT_ABILITIES[2].glowColor;
  const spclLabel = skill2 ? skill2.name : DEFAULT_ABILITIES[2].name;

  // Compute max cooldowns (accounting for skill level multipliers)
  const dashMaxCd = useMemo(() => {
    if (skill0) {
      const level = skillUpgrades[skill0.id] || 1;
      const mult = CD_MULTIPLIERS[Math.min(level, 5) - 1] || 1.0;
      return Math.round(skill0.cooldown * mult);
    }
    return DASH_COOLDOWN;
  }, [skill0, skillUpgrades]);

  const shldMaxCd = useMemo(() => {
    if (skill1) {
      const level = skillUpgrades[skill1.id] || 1;
      const mult = CD_MULTIPLIERS[Math.min(level, 5) - 1] || 1.0;
      return Math.round(skill1.cooldown * mult);
    }
    return SHIELD_COOLDOWN;
  }, [skill1, skillUpgrades]);

  const spclMaxCd = useMemo(() => {
    if (skill2) {
      const level = skillUpgrades[skill2.id] || 1;
      const mult = CD_MULTIPLIERS[Math.min(level, 5) - 1] || 1.0;
      return Math.round(skill2.cooldown * mult);
    }
    return SPECIAL_COOLDOWN;
  }, [skill2, skillUpgrades]);

  // Skill levels
  const dashLevel = skill0 ? (skillUpgrades[skill0.id] || 1) : 0;
  const shldLevel = skill1 ? (skillUpgrades[skill1.id] || 1) : 0;
  const spclLevel = skill2 ? (skillUpgrades[skill2.id] || 1) : 0;

  // Check cooldowns for visual feedback
  const dashReady = !dashCooldown;
  const shldReady = !shieldCooldown;
  const spclReady = !specialCooldown;

  const updateJoystick = useCallback((touchX: number, touchY: number) => {
    const dx = touchX - joystickCenter.current.x;
    const dy = touchY - joystickCenter.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    const normX = dist > 0 ? (clampedDist / maxDist) * Math.cos(angle) : 0;
    const normY = dist > 0 ? (clampedDist / maxDist) * Math.sin(angle) : 0;

    const thumbOffsetX = dist > 0 ? (clampedDist) * Math.cos(angle) : 0;
    const thumbOffsetY = dist > 0 ? (clampedDist) * Math.sin(angle) : 0;
    setThumbPos({ x: thumbOffsetX, y: thumbOffsetY });

    const ctrl = getControls();
    ctrl?.setJoystick({ active: true, dx: normX, dy: normY });

    if (normX < -0.3) {
      ctrl?.moveLeft();
    } else if (normX > 0.3) {
      ctrl?.moveRight();
    } else {
      ctrl?.stopMove();
    }
  }, [maxDist]);

  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (joystickTouchId.current !== null) return;

    joystickTouchId.current = touch.identifier;
    setIsJoystickActive(true);
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    if (rect) {
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    haptic(8);
    updateJoystick(touch.clientX, touch.clientY);
  }, [updateJoystick]);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [updateJoystick]);

  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setThumbPos({ x: 0, y: 0 });
        setIsJoystickActive(false);
        const ctrl = getControls();
        ctrl?.setJoystick({ active: false, dx: 0, dy: 0 });
        ctrl?.stopMove();
        break;
      }
    }
  }, []);

  // Mouse joystick handlers — mouseDown on base, move/up on window
  const handleJoystickMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mouseJoystickActive.current) return;

    mouseJoystickActive.current = true;
    setIsJoystickActive(true);
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    if (rect) {
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    updateJoystick(e.clientX, e.clientY);
  }, [updateJoystick]);

  // Window-level mouse move/up for joystick dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseJoystickActive.current) return;
      e.preventDefault();
      updateJoystick(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseJoystickActive.current) return;
      e.preventDefault();
      mouseJoystickActive.current = false;
      setThumbPos({ x: 0, y: 0 });
      setIsJoystickActive(false);
      const ctrl = getControls();
      ctrl?.setJoystick({ active: false, dx: 0, dy: 0 });
      ctrl?.stopMove();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateJoystick]);

  const handleActionStart = useCallback((action: string) => {
    if (activeActions.current.has(action)) return;
    activeActions.current.add(action);
    const ctrl = getControls();
    if (!ctrl) return;

    haptic(12);

    switch (action) {
      case 'jump':
        ctrl.jump();
        break;
      case 'shoot':
        ctrl.shoot();
        setFirePressed(true);
        shootIntervalRef.current = setInterval(() => {
          const c = getControls();
          c?.shoot();
        }, 150);
        break;
      case 'dash': {
        const skillId = equippedSkills[0];
        if (skillId) {
          ctrl.executeSkill(skillId);
        } else {
          ctrl.dash();
        }
        break;
      }
      case 'shield': {
        const skillId = equippedSkills[1];
        if (skillId) {
          ctrl.executeSkill(skillId);
        } else {
          ctrl.shield();
        }
        break;
      }
      case 'special': {
        const skillId = equippedSkills[2];
        if (skillId) {
          ctrl.executeSkill(skillId);
        } else {
          ctrl.special();
        }
        break;
      }
    }
  }, [equippedSkills]);

  const handleActionEnd = useCallback((action: string) => {
    activeActions.current.delete(action);
    const ctrl = getControls();
    if (!ctrl) return;

    switch (action) {
      case 'shoot':
        ctrl.stopShoot();
        setFirePressed(false);
        if (shootIntervalRef.current) {
          clearInterval(shootIntervalRef.current);
          shootIntervalRef.current = null;
        }
        break;
    }
  }, []);

  const handlePause = useCallback(() => {
    const ctrl = getControls();
    ctrl?.pause();
    haptic(15);
  }, []);

  const handleResume = useCallback(() => {
    setGamePhase('playing');
  }, [setGamePhase]);

  const handleQuit = useCallback(() => {
    backToMenu();
  }, [backToMenu]);

  const handleSaveAndQuit = useCallback(() => {
    saveGame();
    backToMenu();
  }, [saveGame, backToMenu]);

  // Simple pause overlay — show when gamePhase is 'settings' and we were playing
  const showPauseOverlay = gamePhase === 'settings' && currentLevel > 0;

  // ====== PAUSE OVERLAY ======
  if (showPauseOverlay) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <div
          className="flex flex-col items-center gap-5 p-8 rounded-2xl"
          style={{
            backgroundColor: 'rgba(5,5,20,0.95)',
            border: '2px solid rgba(0,255,255,0.4)',
            boxShadow: '0 0 40px rgba(0,255,255,0.1)',
            minWidth: 220,
          }}
        >
          <h2
            className="text-2xl font-bold font-mono tracking-widest"
            style={{ color: CYAN, textShadow: '0 0 12px #00ffff' }}
          >
            PAUSED
          </h2>

          <button
            className="w-full py-3 px-6 text-lg font-bold font-mono tracking-wider rounded-xl"
            style={{
              backgroundColor: 'rgba(0,255,102,0.1)',
              border: '2px solid rgba(0,255,102,0.5)',
              color: LIME,
              textShadow: '0 0 8px #00ff66',
              boxShadow: '0 0 15px rgba(0,255,102,0.15)',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleResume(); }}
            onClick={handleResume}
          >
            ▶ RESUME
          </button>

          <button
            className="w-full py-3 px-6 text-sm font-bold font-mono tracking-wider rounded-xl"
            style={{
              backgroundColor: 'rgba(255,0,0,0.06)',
              border: '2px solid rgba(255,50,50,0.4)',
              color: '#ff4444',
              boxShadow: '0 0 10px rgba(255,0,0,0.08)',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleQuit(); }}
            onClick={handleQuit}
          >
            ✕ QUIT
          </button>

          <button
            className="w-full py-3 px-6 text-sm font-bold font-mono tracking-wider rounded-xl"
            style={{
              backgroundColor: 'rgba(255,215,0,0.08)',
              border: '2px solid rgba(255,215,0,0.5)',
              color: '#ffd700',
              textShadow: '0 0 8px #ffd700',
              boxShadow: '0 0 15px rgba(255,215,0,0.12)',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleSaveAndQuit(); }}
            onClick={handleSaveAndQuit}
          >
            💾 SAVE &amp; QUIT
          </button>
        </div>
      </div>
    );
  }

  // Don't show controls when not playing
  if (gamePhase !== 'playing') return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none" style={{ touchAction: 'none' }}>
      {/* CSS animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        @keyframes fire-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(255,0,255,0.2), inset 0 0 12px rgba(255,0,255,0.08); }
          50% { box-shadow: 0 0 30px rgba(255,0,255,0.4), inset 0 0 20px rgba(255,0,255,0.15); }
        }
        @keyframes fire-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes ready-flash {
          0% { opacity: 1; transform: scale(1.05); }
          50% { opacity: 0.7; }
          100% { opacity: 0; transform: scale(1); }
        }
        .action-btn {
          transition: transform 0.1s ease-out;
        }
        .action-btn:active {
          transform: scale(0.92) !important;
        }
        .fire-btn {
          animation: fire-pulse 2s ease-in-out infinite;
          transition: transform 0.1s ease-out;
        }
        .fire-btn:active {
          transform: scale(0.92) !important;
          animation: none;
        }
        .fire-ring {
          animation: fire-ring 0.4s ease-out forwards;
        }
        .skill-ready-flash {
          animation: ready-flash 0.4s ease-out;
        }
        @keyframes pause-btn-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0,255,255,0.15); }
          50% { box-shadow: 0 0 14px rgba(0,255,255,0.35); }
        }
      `}</style>

      {/* Floating Pause Button — top-right corner */}
      <button
        className="absolute pointer-events-auto flex items-center justify-center"
        style={{
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          zIndex: 25,
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1.5px solid rgba(0, 255, 255, 0.3)',
          color: '#ffffff',
          fontSize: '18px',
          lineHeight: 1,
          animation: 'pause-btn-pulse 2.5s ease-in-out infinite',
          touchAction: 'manipulation',
        }}
        onTouchStart={(e) => { e.preventDefault(); handlePause(); }}
        onClick={handlePause}
        aria-label="Pause game"
      >
        ⏸
      </button>

      {/* LEFT SIDE — Virtual Joystick (110px) */}
      <div className="absolute bottom-5 left-4 pointer-events-auto" style={{ touchAction: 'none' }}>
        <div
          ref={joystickBaseRef}
          className="relative rounded-full"
          style={{
            width: 110,
            height: 110,
            backgroundColor: 'rgba(0,255,255,0.03)',
            border: '2px solid rgba(0,255,255,0.15)',
            boxShadow: '0 0 12px rgba(0,255,255,0.03), inset 0 0 10px rgba(0,255,255,0.02)',
          }}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          onMouseDown={handleJoystickMouseDown}
        >
          {/* Direction indicators */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold" style={{ color: 'rgba(0,255,255,0.15)' }}>▲</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold" style={{ color: 'rgba(0,255,255,0.15)' }}>▼</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold" style={{ color: 'rgba(0,255,255,0.15)' }}>◀</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold" style={{ color: 'rgba(0,255,255,0.15)' }}>▶</div>

          {/* Joystick thumb */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 44,
              height: 44,
              backgroundColor: 'rgba(0,255,255,0.1)',
              border: '2px solid rgba(0,255,255,0.4)',
              boxShadow: '0 0 8px rgba(0,255,255,0.2), inset 0 0 6px rgba(0,255,255,0.08)',
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${thumbPos.x}px), calc(-50% + ${thumbPos.y}px))`,
              transition: !isJoystickActive ? 'transform 0.15s ease-out' : 'none',
            }}
          />
        </div>
      </div>

      {/* RIGHT SIDE — Action Buttons (Landscape-optimized layout) */}
      <div className="absolute bottom-4 right-3 flex flex-col items-end gap-3 pointer-events-auto" style={{ touchAction: 'none' }}>

        {/* TOP: 3 Ability/Skill Buttons in HORIZONTAL ROW */}
        <div className="flex gap-3 items-center">
          {/* Dash / Skill Slot 0 */}
          <SkillButton
            icon={dashIcon}
            color={dashColor}
            label={dashLabel}
            ready={dashReady}
            remainingFrames={dashCooldown}
            maxFrames={dashMaxCd}
            skillLevel={dashLevel}
            onActionStart={() => handleActionStart('dash')}
            onActionEnd={() => handleActionEnd('dash')}
            buttonSize={48}
          />

          {/* Shield / Skill Slot 1 */}
          <SkillButton
            icon={shldIcon}
            color={shldColor}
            label={shldLabel}
            ready={shldReady}
            remainingFrames={shieldCooldown}
            maxFrames={shldMaxCd}
            skillLevel={shldLevel}
            onActionStart={() => handleActionStart('shield')}
            onActionEnd={() => handleActionEnd('shield')}
            buttonSize={48}
          />

          {/* Special / Skill Slot 2 */}
          <SkillButton
            icon={spclIcon}
            color={spclColor}
            label={spclLabel}
            ready={spclReady}
            remainingFrames={specialCooldown}
            maxFrames={spclMaxCd}
            skillLevel={spclLevel}
            onActionStart={() => handleActionStart('special')}
            onActionEnd={() => handleActionEnd('special')}
            buttonSize={48}
          />
        </div>

        {/* BOTTOM ROW: Jump (left) + Fire (right, biggest) */}
        <div className="flex gap-3 items-end">
          {/* Jump — icon only */}
          <button
            className="action-btn flex items-center justify-center rounded-2xl select-none font-bold relative overflow-hidden"
            style={{
              width: 60, height: 60,
              background: 'radial-gradient(circle at 40% 35%, rgba(0,255,102,0.12), rgba(0,255,102,0.04))',
              border: '2px solid rgba(0,255,102,0.4)',
              color: LIME,
              textShadow: '0 0 8px rgba(0,255,102,0.5)',
              boxShadow: '0 0 12px rgba(0,255,102,0.1), inset 0 0 8px rgba(0,255,102,0.05)',
              fontSize: '24px',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleActionStart('jump'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleActionEnd('jump'); }}
            onMouseDown={(e) => { e.preventDefault(); handleActionStart('jump'); }}
            onMouseUp={(e) => { e.preventDefault(); handleActionEnd('jump'); }}
          >
            ⬆
          </button>

          {/* FIRE — big premium button (80px) */}
          <button
            className="fire-btn flex items-center justify-center rounded-2xl select-none font-bold relative overflow-hidden"
            style={{
              width: 80, height: 80,
              background: firePressed
                ? 'radial-gradient(circle at 45% 40%, rgba(255,0,255,0.25), rgba(255,0,255,0.08))'
                : 'radial-gradient(circle at 40% 35%, rgba(255,0,255,0.18), rgba(255,0,255,0.04))',
              border: firePressed
                ? '3px solid rgba(255,100,255,0.8)'
                : '2.5px solid rgba(255,0,255,0.45)',
              color: '#ff66ff',
              textShadow: '0 0 10px rgba(255,0,255,0.7), 0 0 20px rgba(255,0,255,0.3)',
              fontSize: '32px',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleActionStart('shoot'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleActionEnd('shoot'); }}
            onTouchCancel={(e) => { e.preventDefault(); handleActionEnd('shoot'); }}
            onMouseDown={(e) => { e.preventDefault(); handleActionStart('shoot'); }}
            onMouseUp={(e) => { e.preventDefault(); handleActionEnd('shoot'); }}
          >
            {/* Fire ring burst when pressed */}
            {firePressed && (
              <div
                className="absolute inset-0 rounded-2xl fire-ring"
                style={{
                  border: '2px solid rgba(255,0,255,0.5)',
                }}
              />
            )}
            {/* Inner glow */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'radial-gradient(circle at 45% 40%, rgba(255,0,255,0.08), transparent 70%)',
              }}
            />
            {/* Crosshair icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-15" style={{ fontSize: '50px', color: MAGENTA }}>
              ◎
            </div>
            <span className="relative z-10">🔥</span>
          </button>
        </div>
      </div>
    </div>
  );
}
