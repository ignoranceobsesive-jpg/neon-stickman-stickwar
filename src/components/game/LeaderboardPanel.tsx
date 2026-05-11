'use client';

import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/game-store';
import { soundEngine } from '@/lib/sound-engine';
import { GOLD, CYAN, ORANGE, getRankForElo, type RankingData } from '@/lib/game-types';

// Seeded random for consistent fake players
function seededRandom(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const FAKE_NAMES = [
  'NeonBlade99', 'PixelStorm', 'VoidRunner', 'CyberWolf', 'GridMaster',
  'DarkFlare', 'CrimsonX', 'GhostHack', 'StormPilot', 'ZeroGravity',
  'NightShade', 'IronPulse', 'FrostByte', 'ThunderCore', 'ShadowRift',
  'BlazeFury', 'OmegaZ', 'NovaStar', 'RogueAgent', 'ApexHunter',
];

function generateFakeLeaderboard(playerElo: number, playerName: string): { name: string; elo: number; wins: number; losses: number; isPlayer: boolean }[] {
  const rng = seededRandom(42);
  const entries: { name: string; elo: number; wins: number; losses: number; isPlayer: boolean }[] = [];

  for (let i = 0; i < 19; i++) {
    const baseElo = 800 + Math.floor(rng() * 1200);
    entries.push({
      name: FAKE_NAMES[i],
      elo: baseElo,
      wins: Math.floor(rng() * 100) + 5,
      losses: Math.floor(rng() * 60) + 2,
      isPlayer: false,
    });
  }

  // Add player
  entries.push({
    name: playerName,
    elo: playerElo,
    wins: 0,
    losses: 0,
    isPlayer: true,
  });

  // Sort by ELO descending
  entries.sort((a, b) => b.elo - a.elo);

  return entries;
}

export default function LeaderboardPanel() {
  const saveData = useGameStore(s => s.saveData);
  const setGamePhase = useGameStore(s => s.setGamePhase);

  const entries = useMemo(() => generateFakeLeaderboard(saveData.rankingData.elo, saveData.username), [saveData.rankingData.elo, saveData.username]);

  const handleBack = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    setGamePhase('menu');
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="w-full max-w-md p-6 rounded-lg mx-4 pointer-events-auto max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'rgba(5,5,20,0.95)',
          border: '2px solid #ffd700',
          boxShadow: '0 0 30px #ffd70020',
        }}
      >
        <h2
          className="text-2xl font-bold text-center tracking-wider mb-4 font-mono"
          style={{ color: GOLD, textShadow: '0 0 10px #ffd700' }}
        >
          🏆 LEADERBOARD
        </h2>

        <div className="flex flex-col gap-1.5">
          {entries.map((entry, i) => {
            const rankInfo = getRankForElo(entry.elo);
            return (
              <div
                key={entry.name}
                className="flex items-center gap-2 p-2 rounded"
                style={{
                  backgroundColor: entry.isPlayer ? 'rgba(255,215,0,0.1)' : 'rgba(0,0,0,0.2)',
                  border: entry.isPlayer ? '1px solid #ffd70060' : '1px solid #222',
                }}
              >
                {/* Rank */}
                <span
                  className="font-bold font-mono text-sm w-8 text-center"
                  style={{ color: i < 3 ? GOLD : '#666' }}
                >
                  {i + 1}
                </span>

                {/* Rank icon */}
                <span className="text-lg">{rankInfo.icon}</span>

                {/* Name */}
                <span
                  className="flex-1 font-mono text-sm truncate"
                  style={{ color: entry.isPlayer ? GOLD : CYAN }}
                >
                  {entry.name}
                </span>

                {/* ELO */}
                <span className="font-mono text-xs" style={{ color: ORANGE }}>
                  {entry.elo}
                </span>

                {/* W/L */}
                <span className="font-mono text-[10px]" style={{ color: '#555' }}>
                  {!entry.isPlayer ? `${entry.wins}W` : `${saveData.rankingData.wins}W`}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleBack}
          className="neon-btn w-full py-2 px-4 text-sm tracking-wider mt-4"
          style={{ borderColor: '#666', color: '#888' }}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
