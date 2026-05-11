'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';
import { soundEngine } from '@/lib/sound-engine';

export default function VictoryScreen() {
  const totalScore = useGameStore(s => s.totalScore);
  const backToMenu = useGameStore(s => s.backToMenu);
  const nextLevel = useGameStore(s => s.nextLevel);
  const setGamePhase = useGameStore(s => s.setGamePhase);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="text-center pointer-events-auto">
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-wider mb-4"
          style={{
            color: '#00ff66',
            textShadow: '0 0 20px #00ff66, 0 0 40px #00ff66, 0 0 80px #00ff66',
            animation: 'neon-pulse 2s ease-in-out infinite',
          }}
        >
          VICTORY
        </h1>
        <p className="font-mono text-sm mb-2" style={{ color: '#00ffff', textShadow: '0 0 5px #00ffff' }}>
          &quot;Lights back on. Grid&apos;s running. I could use a reboot.&quot;
        </p>
        <p className="font-mono text-xs mb-6" style={{ color: '#aa00ff', textShadow: '0 0 5px #aa00ff' }}>
          — Spark
        </p>
        <p className="font-mono text-2xl mb-8" style={{ color: '#ff6600', textShadow: '0 0 10px #ff6600' }}>
          Final Score: {totalScore}
        </p>

        <div className="flex flex-col gap-3 items-center">
          {/* PLAY NEXT - big green button */}
          <button
            onClick={() => { soundEngine.init(); soundEngine.playMenuClick(); nextLevel(); }}
            className="neon-btn w-64 py-4 px-8 text-2xl font-bold font-mono tracking-wider"
            style={{
              borderColor: '#00ff66',
              color: '#00ff66',
              textShadow: '0 0 10px #00ff66, 0 0 20px #00ff66, 0 0 40px #00ff66',
              boxShadow: '0 0 20px rgba(0,255,102,0.4), 0 0 40px rgba(0,255,102,0.15), inset 0 0 20px rgba(0,255,102,0.1)',
              background: 'linear-gradient(135deg, rgba(0,255,102,0.15), rgba(0,255,102,0.05))',
              animation: 'neon-pulse 2s ease-in-out infinite',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            &#9654; PLAY NEXT
          </button>

          <button
            onClick={backToMenu}
            className="neon-btn w-48 py-3 px-6 text-lg font-bold font-mono tracking-wider"
            style={{
              borderColor: '#666',
              color: '#888',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
