'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import GameScreen from './GameScreen';
import CoopTouchControls from './CoopTouchControls';
import { CYAN, ORANGE, MAGENTA, LIME } from '@/lib/game-types';

export default function LocalCoopScreen() {
  const setGameMode = useGameStore(s => s.setGameMode);
  const startLevel = useGameStore(s => s.startLevel);
  const saveData = useGameStore(s => s.saveData);
  const gamePhase = useGameStore(s => s.gamePhase);
  const backToMenu = useGameStore(s => s.backToMenu);
  const [showLobby, setShowLobby] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const initRef = useRef(false);

  const handleStart = useCallback(() => {
    if (!initRef.current) {
      initRef.current = true;
      setGameMode('coop');
      startLevel(saveData.highestLevel);
      setShowLobby(false);
      setShowControls(true);
    }
  }, [setGameMode, startLevel, saveData.highestLevel]);

  const handleBack = useCallback(() => {
    backToMenu();
  }, [backToMenu]);

  // Auto-hide controls overlay after 6 seconds
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  // Once the game transitions to playing, hide lobby
  const isPlaying = gamePhase === 'playing' || gamePhase === 'cutscene';

  if (showLobby && !isPlaying) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-[#050510] flex items-center justify-center">
        {/* Background grid */}
        <div className="absolute inset-0" style={{ opacity: 0.05 }}>
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(${CYAN} 1px, transparent 1px), linear-gradient(90deg, ${CYAN} 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div
          className="relative p-8 rounded-lg max-w-lg w-full mx-4"
          style={{
            backgroundColor: 'rgba(5,5,20,0.95)',
            border: '2px solid #ff00ff',
            boxShadow: '0 0 40px #ff00ff20, inset 0 0 30px rgba(255,0,255,0.03)',
          }}
        >
          <h2
            className="text-3xl font-bold text-center tracking-wider mb-2 font-mono"
            style={{ color: MAGENTA, textShadow: '0 0 15px #ff00ff, 0 0 30px #ff00ff' }}
          >
            LOCAL CO-OP
          </h2>
          <p
            className="text-center text-sm font-mono mb-6"
            style={{ color: '#888' }}
          >
            Two players, one screen. Fight together!
          </p>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Player 1 */}
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)' }}>
              <div
                className="text-xl font-bold font-mono mb-3"
                style={{ color: CYAN, textShadow: '0 0 10px #00ffff' }}
              >
                PLAYER 1
              </div>
              <div className="space-y-1.5 text-xs font-mono" style={{ color: '#aaa' }}>
                <p><span style={{ color: CYAN }}>W/A/S/D</span> Move</p>
                <p><span style={{ color: CYAN }}>Space</span> Shoot</p>
                <p><span style={{ color: CYAN }}>Shift</span> Dash</p>
                <p><span style={{ color: CYAN }}>E</span> Shield</p>
                <p><span style={{ color: CYAN }}>F</span> Special</p>
              </div>
            </div>

            {/* Player 2 */}
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.2)' }}>
              <div
                className="text-xl font-bold font-mono mb-3"
                style={{ color: ORANGE, textShadow: '0 0 10px #ff6600' }}
              >
                PLAYER 2
              </div>
              <div className="space-y-1.5 text-xs font-mono" style={{ color: '#aaa' }}>
                <p><span style={{ color: ORANGE }}>Arrows</span> Move</p>
                <p><span style={{ color: ORANGE }}>Enter</span> Shoot</p>
                <p><span style={{ color: ORANGE }}>/</span> Dash</p>
                <p><span style={{ color: ORANGE }}>.</span> Shield</p>
                <p><span style={{ color: ORANGE }}>,</span> Special</p>
              </div>
            </div>
          </div>

          {/* Mobile note */}
          <div className="text-center mb-5 p-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-mono" style={{ color: '#666' }}>
              Mobile: P1 uses left joystick + buttons, P2 uses right joystick + buttons
            </p>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={handleStart}
              className="neon-btn w-56 py-4 px-8 text-xl font-bold font-mono tracking-wider"
              style={{
                borderColor: LIME,
                color: LIME,
                textShadow: '0 0 15px #00ff66, 0 0 30px #00ff66',
                boxShadow: '0 0 20px rgba(0,255,102,0.3), inset 0 0 20px rgba(0,255,102,0.05)',
                background: 'linear-gradient(135deg, rgba(0,255,102,0.1), rgba(0,255,102,0.03))',
              }}
            >
              START CO-OP
            </button>

            <button
              onClick={handleBack}
              className="neon-btn w-40 py-2 px-4 text-sm font-bold font-mono tracking-wider"
              style={{ borderColor: '#666', color: '#888' }}
            >
              BACK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isPlaying && !showLobby) {
    return <GameScreen />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050510]">
      <GameScreen />
      <CoopTouchControls />

      {/* Controls overlay - fades out after 6s */}
      {showControls && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          style={{ animation: 'fadeOut 1s ease-in 5s forwards' }}
        >
          <div
            className="p-5 rounded-lg max-w-md w-full mx-4"
            style={{
              backgroundColor: 'rgba(5,5,20,0.92)',
              border: '2px solid #ff6600',
              boxShadow: '0 0 30px #ff660020',
            }}
          >
            <h2
              className="text-xl font-bold text-center tracking-wider mb-3 font-mono"
              style={{ color: MAGENTA, textShadow: '0 0 10px #ff00ff' }}
            >
              CO-OP CONTROLS
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm font-bold font-mono mb-1" style={{ color: CYAN, textShadow: '0 0 5px #00ffff' }}>P1</div>
                <div className="text-[10px] font-mono" style={{ color: '#888' }}>WASD + Space + Shift + E + F</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold font-mono mb-1" style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}>P2</div>
                <div className="text-[10px] font-mono" style={{ color: '#888' }}>Arrows + Enter + / + . + ,</div>
              </div>
            </div>

            <p className="text-center text-[10px] font-mono mt-2" style={{ color: '#555' }}>
              Mobile: Left side = P1, Right side = P2
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
