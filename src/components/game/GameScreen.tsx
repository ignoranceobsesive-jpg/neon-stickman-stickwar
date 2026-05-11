'use client';

import React, { useRef } from 'react';
import GameCanvas, { type GameEngineControls } from './GameCanvas';
import TouchControls from './TouchControls';
import { useGameStore } from '@/stores/game-store';

export default function GameScreen() {
  const engineRef = useRef<GameEngineControls>(null);
  const gamePhase = useGameStore(s => s.gamePhase);
  const waitingForTap = useGameStore(s => s.waitingForTap);
  const introTimer = useGameStore(s => s.introTimer);
  const tapToStart = useGameStore(s => s.tapToStart);

  const showTouchControls = gamePhase === 'playing' && !waitingForTap;

  // Show "TAP TO START" overlay when waiting for tap AND intro text has finished
  const showTapOverlay = gamePhase === 'playing' && waitingForTap && introTimer <= 0;

  const handleTap = () => {
    if (showTapOverlay) {
      tapToStart();
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050510]" style={{ width: '100vw', height: '100dvh' }}>
      <GameCanvas ref={engineRef} />
      {showTouchControls && <TouchControls />}
      {showTapOverlay && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer select-none"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleTap}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTap();
          }}
          role="button"
          aria-label="Tap to start the game"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTap();
            }
          }}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Pulsing neon TAP TO START text */}
            <div
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-widest"
              style={{
                color: '#00ffff',
                animation: 'tap-start-pulse 1.5s ease-in-out infinite',
              }}
            >
              TAP TO START
            </div>
            {/* Subtle hint line */}
            <div
              className="text-sm sm:text-base tracking-wide"
              style={{
                color: 'rgba(0, 255, 255, 0.5)',
                animation: 'tap-start-pulse 1.5s ease-in-out infinite 0.5s',
              }}
            >
              ⚡ Tap anywhere to begin ⚡
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
