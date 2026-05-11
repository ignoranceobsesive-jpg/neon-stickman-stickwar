'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import GameScreen from './GameScreen';
import CoopTouchControls from './CoopTouchControls';
import { tryAutoFullscreen } from '@/components/game/LandscapeOverlay';
import { CYAN, ORANGE, MAGENTA, LIME, RED, GOLD } from '@/lib/game-types';

export default function LocalVersusScreen() {
  const setGameMode = useGameStore(s => s.setGameMode);
  const startVersus = useGameStore(s => s.startVersus);
  const gamePhase = useGameStore(s => s.gamePhase);
  const backToMenu = useGameStore(s => s.backToMenu);
  const versusP1Wins = useGameStore(s => s.versusP1Wins);
  const versusP2Wins = useGameStore(s => s.versusP2Wins);
  const versusCurrentRound = useGameStore(s => s.versusCurrentRound);
  const versusRoundWinner = useGameStore(s => s.versusRoundWinner);
  const versusMatchWinner = useGameStore(s => s.versusMatchWinner);
  const versusResetRound = useGameStore(s => s.versusResetRound);
  const versusMatchEnd = useGameStore(s => s.versusMatchEnd);

  const [showLobby, setShowLobby] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const initRef = useRef(false);

  const handleStart = useCallback(() => {
    if (!initRef.current) {
      initRef.current = true;
      setGameMode('versus');
      startVersus();
      setShowLobby(false);
      setShowControls(true);
    }
  }, [setGameMode, startVersus]);

  const handleBack = useCallback(() => {
    backToMenu();
  }, [backToMenu]);

  const handleNextRound = useCallback(() => {
    versusResetRound();
  }, [versusResetRound]);

  const handleMatchEnd = useCallback((winner: 1 | 2) => {
    versusMatchEnd(winner);
  }, [versusMatchEnd]);

  // Auto-hide controls overlay after 6 seconds
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const isPlaying = gamePhase === 'playing' || gamePhase === 'cutscene';
  const isRoundOver = versusRoundWinner !== 0 && versusMatchWinner === 0;
  const isMatchOver = versusMatchWinner !== 0;

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

        {/* Animated VS */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <div
            className="text-7xl font-bold font-mono tracking-widest"
            style={{
              color: GOLD,
              textShadow: '0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 80px #ff8800',
              animation: 'neon-pulse 2s ease-in-out infinite',
            }}
          >
            VS
          </div>
        </div>

        <div
          className="relative p-8 rounded-lg max-w-xl w-full mx-4"
          style={{
            backgroundColor: 'rgba(5,5,20,0.95)',
            border: '2px solid #ff00ff',
            boxShadow: '0 0 40px #ff00ff20, inset 0 0 30px rgba(255,0,255,0.03)',
          }}
        >
          <h2
            className="text-3xl font-bold text-center tracking-wider mb-1 font-mono"
            style={{ color: MAGENTA, textShadow: '0 0 15px #ff00ff, 0 0 30px #ff00ff' }}
          >
            LOCAL VERSUS
          </h2>
          <p
            className="text-center text-sm font-mono mb-6"
            style={{ color: '#888' }}
          >
            Two players, one screen. FIGHT each other! Best of 3 rounds.
          </p>

          <div className="grid grid-cols-2 gap-6 mb-4">
            {/* Player 1 - BLUE */}
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(0,255,255,0.05)', border: `2px solid ${CYAN}`, boxShadow: `0 0 15px ${CYAN}20` }}>
              <div
                className="text-2xl font-bold font-mono mb-1"
                style={{ color: CYAN, textShadow: '0 0 10px #00ffff' }}
              >
                PLAYER 1
              </div>
              <div
                className="text-xs font-bold font-mono mb-3"
                style={{ color: CYAN, textShadow: '0 0 5px #00ffff' }}
              >
                BLUE
              </div>
              {/* Stickman preview */}
              <div className="mb-3 flex justify-center">
                <svg width="40" height="60" viewBox="0 0 40 60">
                  <circle cx="20" cy="10" r="7" fill="none" stroke={CYAN} strokeWidth="2" style={{ filter: `drop-shadow(0 0 4px ${CYAN})` }} />
                  <line x1="20" y1="17" x2="20" y2="38" stroke={CYAN} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${CYAN})` }} />
                  <line x1="20" y1="25" x2="10" y2="33" stroke={CYAN} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${CYAN})` }} />
                  <line x1="20" y1="25" x2="30" y2="33" stroke={CYAN} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${CYAN})` }} />
                  <line x1="20" y1="38" x2="12" y2="55" stroke={CYAN} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${CYAN})` }} />
                  <line x1="20" y1="38" x2="28" y2="55" stroke={CYAN} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${CYAN})` }} />
                </svg>
              </div>
              <div className="space-y-1 text-xs font-mono" style={{ color: '#aaa' }}>
                <p><span style={{ color: CYAN }}>W/A/S/D</span> Move</p>
                <p><span style={{ color: CYAN }}>Space</span> Shoot</p>
                <p><span style={{ color: CYAN }}>Shift</span> Dash</p>
                <p><span style={{ color: CYAN }}>E</span> Shield</p>
                <p><span style={{ color: CYAN }}>F</span> Special</p>
              </div>
            </div>

            {/* Player 2 - ORANGE */}
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,102,0,0.05)', border: `2px solid ${ORANGE}`, boxShadow: `0 0 15px ${ORANGE}20` }}>
              <div
                className="text-2xl font-bold font-mono mb-1"
                style={{ color: ORANGE, textShadow: '0 0 10px #ff6600' }}
              >
                PLAYER 2
              </div>
              <div
                className="text-xs font-bold font-mono mb-3"
                style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}
              >
                ORANGE
              </div>
              {/* Stickman preview */}
              <div className="mb-3 flex justify-center">
                <svg width="40" height="60" viewBox="0 0 40 60">
                  <circle cx="20" cy="10" r="7" fill="none" stroke={ORANGE} strokeWidth="2" style={{ filter: `drop-shadow(0 0 4px ${ORANGE})` }} />
                  <line x1="20" y1="17" x2="20" y2="38" stroke={ORANGE} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${ORANGE})` }} />
                  <line x1="20" y1="25" x2="10" y2="33" stroke={ORANGE} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${ORANGE})` }} />
                  <line x1="20" y1="25" x2="30" y2="33" stroke={ORANGE} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${ORANGE})` }} />
                  <line x1="20" y1="38" x2="12" y2="55" stroke={ORANGE} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${ORANGE})` }} />
                  <line x1="20" y1="38" x2="28" y2="55" stroke={ORANGE} strokeWidth="2" style={{ filter: `drop-shadow(0 0 3px ${ORANGE})` }} />
                </svg>
              </div>
              <div className="space-y-1 text-xs font-mono" style={{ color: '#aaa' }}>
                <p><span style={{ color: ORANGE }}>Arrows</span> Move</p>
                <p><span style={{ color: ORANGE }}>Enter</span> Shoot</p>
                <p><span style={{ color: ORANGE }}>/</span> Dash</p>
                <p><span style={{ color: ORANGE }}>.</span> Shield</p>
                <p><span style={{ color: ORANGE }}>,</span> Special</p>
              </div>
            </div>
          </div>

          {/* Best of 3 info */}
          <div className="text-center mb-5 p-2 rounded" style={{ backgroundColor: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <p className="text-xs font-mono font-bold" style={{ color: GOLD }}>
              BEST OF 3 ROUNDS — First to win 2 rounds takes the match!
            </p>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={handleStart}
              className="neon-btn w-56 py-4 px-8 text-xl font-bold font-mono tracking-wider"
              style={{
                borderColor: RED,
                color: RED,
                textShadow: '0 0 15px #ff3333, 0 0 30px #ff3333',
                boxShadow: '0 0 20px rgba(255,51,51,0.3), inset 0 0 20px rgba(255,51,51,0.05)',
                background: 'linear-gradient(135deg, rgba(255,51,51,0.1), rgba(255,51,51,0.03))',
              }}
            >
              FIGHT!
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

  // Round over overlay
  if (isRoundOver && !isMatchOver) {
    const isDraw = versusRoundWinner === 3;
    const winnerName = versusRoundWinner === 1 ? 'BLUE (P1)' : versusRoundWinner === 2 ? 'ORANGE (P2)' : '';
    const winnerColor = versusRoundWinner === 1 ? CYAN : ORANGE;
    return (
      <div className="relative w-full h-screen overflow-hidden bg-[#050510]">
        <GameScreen />
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div
            className="p-8 rounded-lg text-center max-w-md"
            style={{
              backgroundColor: 'rgba(5,5,20,0.95)',
              border: `2px solid ${isDraw ? '#ffd700' : winnerColor}`,
              boxShadow: `0 0 40px ${isDraw ? '#ffd70030' : winnerColor + '30'}`,
            }}
          >
            {isDraw ? (
              <div
                className="text-4xl font-bold font-mono mb-3"
                style={{ color: '#ffd700', textShadow: '0 0 15px #ffd700, 0 0 30px #ffd700' }}
              >
                DRAW!
              </div>
            ) : (
              <div
                className="text-4xl font-bold font-mono mb-3"
                style={{ color: winnerColor, textShadow: `0 0 15px ${winnerColor}, 0 0 30px ${winnerColor}` }}
              >
                VICTORY TO {winnerName}!
              </div>
            )}
            <div className="text-lg font-mono mb-4" style={{ color: GOLD }}>
              ROUND {versusCurrentRound - 1} COMPLETE
            </div>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-xs font-mono" style={{ color: '#888' }}>BLUE (P1)</div>
                <div className="text-3xl font-bold font-mono" style={{ color: CYAN, textShadow: `0 0 10px ${CYAN}` }}>{versusP1Wins}</div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color: '#555' }}>-</div>
              <div className="text-center">
                <div className="text-xs font-mono" style={{ color: '#888' }}>ORANGE (P2)</div>
                <div className="text-3xl font-bold font-mono" style={{ color: ORANGE, textShadow: `0 0 10px ${ORANGE}` }}>{versusP2Wins}</div>
              </div>
            </div>
            <button
              onClick={handleNextRound}
              className="neon-btn py-3 px-8 text-lg font-bold font-mono tracking-wider"
              style={{
                borderColor: GOLD,
                color: GOLD,
                textShadow: '0 0 10px #ffd700',
                boxShadow: '0 0 15px rgba(255,215,0,0.2)',
              }}
            >
              NEXT ROUND
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Match over overlay — simple visual victory, no annoying sounds
  if (isMatchOver) {
    const isDraw = versusMatchWinner === 3;
    const winnerName = versusMatchWinner === 1 ? 'BLUE (P1)' : versusMatchWinner === 2 ? 'ORANGE (P2)' : '';
    const winnerColor = versusMatchWinner === 1 ? CYAN : ORANGE;
    return (
      <div className="relative w-full h-screen overflow-hidden bg-[#050510]">
        <GameScreen />
        {/* Simple visual victory overlay — no noise */}
        <div className="absolute inset-0 flex items-center justify-center z-30">
          {/* Glow ring animation */}
          <div
            className="absolute rounded-full"
            style={{
              width: 300, height: 300,
              border: `2px solid ${isDraw ? '#ffd700' : winnerColor}`,
              boxShadow: `0 0 60px ${isDraw ? '#ffd70040' : winnerColor + '40'}, 0 0 120px ${isDraw ? '#ffd70020' : winnerColor + '20'}, inset 0 0 60px ${isDraw ? '#ffd70010' : winnerColor + '10'}`,
              animation: 'victory-pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 200, height: 200,
              border: `1px solid ${isDraw ? '#ffd700' : winnerColor}`,
              opacity: 0.4,
              animation: 'victory-spin 4s linear infinite',
            }}
          />
          <div
            className="p-8 rounded-lg text-center max-w-md relative z-10"
            style={{
              backgroundColor: 'rgba(5,5,20,0.95)',
              border: `2px solid ${isDraw ? '#ffd700' : winnerColor}`,
              boxShadow: `0 0 60px ${isDraw ? '#ffd70040' : winnerColor + '40'}`,
            }}
          >
            {isDraw ? (
              <>
                <div
                  className="text-5xl font-bold font-mono mb-2"
                  style={{ color: '#ffd700', textShadow: '0 0 20px #ffd700, 0 0 40px #ffd700', animation: 'neon-pulse 2s ease-in-out infinite' }}
                >
                  DRAW!
                </div>
                <div
                  className="text-xl font-bold font-mono mb-4"
                  style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}
                >
                  NO WINNER
                </div>
              </>
            ) : (
              <>
                <div
                  className="text-5xl font-bold font-mono mb-2"
                  style={{ color: GOLD, textShadow: '0 0 20px #ffd700, 0 0 40px #ffd700', animation: 'neon-pulse 2s ease-in-out infinite' }}
                >
                  VICTORY!
                </div>
                <div
                  className="text-3xl font-bold font-mono mb-4"
                  style={{ color: winnerColor, textShadow: `0 0 15px ${winnerColor}, 0 0 30px ${winnerColor}` }}
                >
                  VICTORY TO {winnerName}!
                </div>
              </>
            )}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-xs font-mono" style={{ color: '#888' }}>BLUE (P1)</div>
                <div className="text-3xl font-bold font-mono" style={{ color: CYAN, textShadow: `0 0 10px ${CYAN}` }}>{versusP1Wins}</div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color: '#555' }}>-</div>
              <div className="text-center">
                <div className="text-xs font-mono" style={{ color: '#888' }}>ORANGE (P2)</div>
                <div className="text-3xl font-bold font-mono" style={{ color: ORANGE, textShadow: `0 0 10px ${ORANGE}` }}>{versusP2Wins}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={() => { initRef.current = false; tryAutoFullscreen(); startVersus(); }}
                className="neon-btn py-3 px-8 text-lg font-bold font-mono tracking-wider"
                style={{
                  borderColor: LIME,
                  color: LIME,
                  textShadow: '0 0 10px #00ff66',
                  boxShadow: '0 0 15px rgba(0,255,102,0.2)',
                }}
              >
                REMATCH
              </button>
              <button
                onClick={handleBack}
                className="neon-btn py-2 px-6 text-sm font-bold font-mono tracking-wider"
                style={{ borderColor: '#666', color: '#888' }}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
        <style jsx global>{`
          @keyframes victory-pulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          @keyframes victory-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
              style={{ color: GOLD, textShadow: '0 0 10px #ffd700' }}
            >
              VERSUS CONTROLS
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm font-bold font-mono mb-1" style={{ color: CYAN, textShadow: '0 0 5px #00ffff' }}>P1 (BLUE)</div>
                <div className="text-[10px] font-mono" style={{ color: '#888' }}>WASD + Space + Shift + E + F</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold font-mono mb-1" style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}>P2 (ORANGE)</div>
                <div className="text-[10px] font-mono" style={{ color: '#888' }}>Arrows + Enter + / + . + ,</div>
              </div>
            </div>

            <p className="text-center text-[10px] font-mono mt-2" style={{ color: '#555' }}>
              Shoot the other player! Best of 3 rounds wins!
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
