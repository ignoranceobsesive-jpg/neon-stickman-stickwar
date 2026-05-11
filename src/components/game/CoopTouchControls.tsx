'use client';

import React, { useState, useCallback } from 'react';
import { type JoystickInput, ORANGE, MAGENTA, LIME } from '@/lib/game-types';
import { useGameStore } from '@/stores/game-store';

interface Controls {
  setP2Joystick: (input: JoystickInput) => void;
  executeSkill: (skillId: string) => void;
}

function getControls(): Controls | null {
  return (window as unknown as Record<string, unknown>).__neonWarriorControls as Controls | null;
}

function haptic(ms: number = 10) {
  try { navigator.vibrate?.(ms); } catch {}
}

export default function CoopTouchControls() {
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  });
  const [p2ThumbPos, setP2ThumbPos] = useState({ x: 0, y: 0 });
  const [isP2JoystickActive, setIsP2JoystickActive] = useState(false);
  const gamePhase = useGameStore(s => s.gamePhase);

  // Use refs for touch tracking (not accessed during render)
  const p2JoystickTouchId = React.useRef<number | null>(null);
  const p2JoystickCenter = React.useRef({ x: 0, y: 0 });
  const p2JoystickBaseRef = React.useRef<HTMLDivElement>(null);
  const p2ShootIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const p2MaxDist = 42;

  const updateP2Joystick = useCallback((touchX: number, touchY: number) => {
    const dx = touchX - p2JoystickCenter.current.x;
    const dy = touchY - p2JoystickCenter.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, p2MaxDist);
    const angle = Math.atan2(dy, dx);
    const normX = dist > 0 ? (clampedDist / p2MaxDist) * Math.cos(angle) : 0;
    const normY = dist > 0 ? (clampedDist / p2MaxDist) * Math.sin(angle) : 0;

    const thumbOffsetX = dist > 0 ? clampedDist * Math.cos(angle) : 0;
    const thumbOffsetY = dist > 0 ? clampedDist * Math.sin(angle) : 0;
    setP2ThumbPos({ x: thumbOffsetX, y: thumbOffsetY });

    const ctrl = getControls();
    ctrl?.setP2Joystick({ active: true, dx: normX, dy: normY });
  }, [p2MaxDist]);

  const handleP2JoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (p2JoystickTouchId.current !== null) return;
    p2JoystickTouchId.current = touch.identifier;
    setIsP2JoystickActive(true);
    const rect = p2JoystickBaseRef.current?.getBoundingClientRect();
    if (rect) {
      p2JoystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    haptic(8);
    updateP2Joystick(touch.clientX, touch.clientY);
  }, [updateP2Joystick]);

  const handleP2JoystickMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === p2JoystickTouchId.current) {
        updateP2Joystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [updateP2Joystick]);

  const handleP2JoystickEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === p2JoystickTouchId.current) {
        p2JoystickTouchId.current = null;
        setIsP2JoystickActive(false);
        setP2ThumbPos({ x: 0, y: 0 });
        const ctrl = getControls();
        ctrl?.setP2Joystick({ active: false, dx: 0, dy: 0 });
        break;
      }
    }
  }, []);

  const handleP2Action = useCallback((action: string, isStart: boolean) => {
    if (!isStart) return;

    haptic(12);

    const keyMap: Record<string, string> = {
      jump: 'ArrowUp',
      shoot: 'Enter',
      dash: '/',
      shield: '.',
      special: ',',
    };

    const key = keyMap[action];
    if (!key) return;

    if (action === 'shoot') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      p2ShootIntervalRef.current = setInterval(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      }, 150);
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    }
  }, []);

  const handleP2ActionEnd = useCallback((action: string) => {
    if (action === 'shoot') {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
      if (p2ShootIntervalRef.current) {
        clearInterval(p2ShootIntervalRef.current);
        p2ShootIntervalRef.current = null;
      }
    }
  }, []);

  if (!isMobile || gamePhase !== 'playing') return null;

  const btnBase = "flex items-center justify-center rounded-2xl active:scale-90 transition-transform select-none font-bold relative overflow-hidden";

  return (
    <div className="absolute inset-0 z-20 pointer-events-none" style={{ touchAction: 'none' }}>

      {/* P2 JOYSTICK - Bottom right */}
      <div className="absolute bottom-6 right-5 pointer-events-auto" style={{ touchAction: 'none' }}>
        <div
          ref={p2JoystickBaseRef}
          className="relative rounded-full"
          style={{
            width: 120,
            height: 120,
            backgroundColor: 'rgba(255,102,0,0.04)',
            border: '2.5px solid rgba(255,102,0,0.2)',
            boxShadow: '0 0 20px rgba(255,102,0,0.05), inset 0 0 15px rgba(255,102,0,0.03)',
          }}
          onTouchStart={handleP2JoystickStart}
          onTouchMove={handleP2JoystickMove}
          onTouchEnd={handleP2JoystickEnd}
          onTouchCancel={handleP2JoystickEnd}
        >
          {/* P2 label */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono" style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}>
            P2
          </div>
          {/* Direction indicators */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold" style={{ color: 'rgba(255,102,0,0.2)' }}>▲</div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold" style={{ color: 'rgba(255,102,0,0.2)' }}>▼</div>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: 'rgba(255,102,0,0.2)' }}>◀</div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: 'rgba(255,102,0,0.2)' }}>▶</div>

          {/* Joystick thumb - visually moves */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 46,
              height: 46,
              backgroundColor: 'rgba(255,102,0,0.15)',
              border: '2.5px solid rgba(255,102,0,0.5)',
              boxShadow: '0 0 12px rgba(255,102,0,0.3), inset 0 0 8px rgba(255,102,0,0.1)',
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${p2ThumbPos.x}px), calc(-50% + ${p2ThumbPos.y}px))`,
              transition: !isP2JoystickActive ? 'transform 0.15s ease-out' : 'none',
            }}
          />
        </div>
      </div>

      {/* P2 ACTION BUTTONS - Bottom left area */}
      <div className="absolute bottom-5 left-3 flex flex-col items-start gap-2 pointer-events-auto" style={{ touchAction: 'none' }}>
        {/* P2 label */}
        <div className="text-[9px] font-bold font-mono mb-0.5" style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}>P2</div>

        {/* Top row: Abilities */}
        <div className="flex gap-2">
          <button
            className={btnBase}
            style={{
              width: 50, height: 50,
              backgroundColor: 'rgba(255,102,0,0.1)',
              border: '2px solid rgba(255,102,0,0.45)',
              color: ORANGE,
              textShadow: '0 0 5px #ff6600',
              fontSize: '20px',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleP2Action('dash', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleP2ActionEnd('dash'); }}
          >
            ⚡
          </button>
          <button
            className={btnBase}
            style={{
              width: 50, height: 50,
              backgroundColor: 'rgba(0,255,102,0.1)',
              border: '2px solid rgba(0,255,102,0.45)',
              color: LIME,
              textShadow: '0 0 5px #00ff66',
              fontSize: '20px',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleP2Action('shield', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleP2ActionEnd('shield'); }}
          >
            🛡
          </button>
          <button
            className={btnBase}
            style={{
              width: 50, height: 50,
              backgroundColor: 'rgba(255,0,255,0.1)',
              border: '2px solid rgba(255,0,255,0.45)',
              color: MAGENTA,
              textShadow: '0 0 5px #ff00ff',
              fontSize: '20px',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleP2Action('special', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleP2ActionEnd('special'); }}
          >
            ✦
          </button>
        </div>

        {/* Bottom row: Jump + Shoot */}
        <div className="flex gap-2 items-end">
          <button
            className={btnBase}
            style={{
              width: 56, height: 56,
              backgroundColor: 'rgba(0,255,102,0.1)',
              border: '2.5px solid rgba(0,255,102,0.4)',
              color: LIME,
              textShadow: '0 0 6px #00ff66',
              fontSize: '22px',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleP2Action('jump', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleP2ActionEnd('jump'); }}
          >
            ⬆
          </button>
          <button
            className={btnBase}
            style={{
              width: 70, height: 70,
              backgroundColor: 'rgba(255,0,255,0.1)',
              border: '2.5px solid rgba(255,0,255,0.45)',
              color: MAGENTA,
              textShadow: '0 0 8px #ff00ff',
              fontSize: '26px',
              boxShadow: '0 0 12px rgba(255,0,255,0.12)',
            }}
            onTouchStart={(e) => { e.preventDefault(); handleP2Action('shoot', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleP2ActionEnd('shoot'); }}
            onTouchCancel={(e) => { e.preventDefault(); handleP2ActionEnd('shoot'); }}
          >
            🔥
          </button>
        </div>
      </div>
    </div>
  );
}
