'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/game-store';
import {
  WEAPON_UPGRADES,
  getWeaponUpgradeCost,
  type WeaponUpgradeType,
  CYAN, GOLD, MAGENTA, RED, ORANGE, LIME, PURPLE, YELLOW,
} from '@/lib/game-types';
import { soundEngine } from '@/lib/sound-engine';

const UPGRADE_ICONS: Record<WeaponUpgradeType, string> = {
  damage: '⚔️',
  fireRate: '🔥',
  bulletSpeed: '💨',
  bulletSize: '⭕',
  criticalChance: '💥',
};

const UPGRADE_COLORS: Record<WeaponUpgradeType, string> = {
  damage: RED,
  fireRate: ORANGE,
  bulletSpeed: CYAN,
  bulletSize: MAGENTA,
  criticalChance: GOLD,
};

const UPGRADE_DESCRIPTIONS: Record<WeaponUpgradeType, string> = {
  damage: '+15% damage per level',
  fireRate: '+10% faster shooting per level',
  bulletSpeed: '+12% bullet speed per level',
  bulletSize: '+10% bullet size per level',
  criticalChance: '+2% crit chance per level (max 50)',
};

// Simulated ad watch overlay
function WeaponAdOverlay({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onComplete, 300);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
      <div className="text-center">
        <div className="text-2xl font-bold font-mono mb-4" style={{ color: GOLD, textShadow: '0 0 15px #ffd700' }}>
          🎬 WATCHING AD
        </div>
        <div className="w-64 h-3 rounded-full mx-auto mb-3" style={{ backgroundColor: '#222', border: '1px solid #444' }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, backgroundColor: CYAN, boxShadow: '0 0 10px #00ffff' }}
          />
        </div>
        <div className="text-sm font-mono" style={{ color: '#888' }}>
          {progress < 100 ? 'Please wait...' : '✅ Free upgrade unlocked!'}
        </div>
      </div>
    </div>
  );
}

export default function WeaponUpgradePanel() {
  const saveData = useGameStore(s => s.saveData);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const upgradeWeapon = useGameStore(s => s.upgradeWeapon);
  const upgradeWeaponByAd = useGameStore(s => s.upgradeWeaponByAd);
  const addCoinsReward = useGameStore(s => s.addCoinsReward);

  const [showAd, setShowAd] = useState(false);
  const [adType, setAdType] = useState<WeaponUpgradeType | null>(null);

  const handleClick = (action: () => void) => {
    soundEngine.init();
    soundEngine.playMenuClick();
    action();
  };

  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    if (adType) {
      addCoinsReward(200);
      upgradeWeaponByAd(adType);
      soundEngine.playCoinCollect();
      setAdType(null);
    }
  }, [adType, addCoinsReward, upgradeWeaponByAd]);

  const handleUpgradeByCoin = (type: WeaponUpgradeType) => {
    const success = upgradeWeapon(type);
    if (success) {
      soundEngine.playCoinCollect();
    }
  };

  const handleUpgradeByAd = (type: WeaponUpgradeType) => {
    setShowAd(true);
    setAdType(type);
  };

  const upgradeTypes: WeaponUpgradeType[] = ['damage', 'fireRate', 'bulletSpeed', 'bulletSize', 'criticalChance'];

  return (
    <div className="absolute inset-0 z-20 flex flex-col pointer-events-auto" style={{ backgroundColor: 'rgba(5,5,16,0.92)' }}>
      {showAd && <WeaponAdOverlay onComplete={handleAdComplete} />}

      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold font-mono tracking-wider" style={{ color: RED, textShadow: '0 0 15px #ff3333, 0 0 30px #ff333366' }}>
              🔫 WEAPON UPGRADES
            </h2>
            <div className="text-xs font-mono mt-1" style={{ color: GOLD }}>
              🪙 {saveData.totalCoins.toLocaleString()} COINS
            </div>
          </div>

          {/* Upgrade Cards */}
          <div className="space-y-2.5">
            {upgradeTypes.map(type => {
              const upgrade = WEAPON_UPGRADES[type];
              const currentLevel = saveData.weaponUpgrades[type] ?? 0;
              const cost = getWeaponUpgradeCost(type, currentLevel);
              const canAfford = saveData.totalCoins >= cost;
              const isMaxed = currentLevel >= upgrade.maxLevel;
              const color = UPGRADE_COLORS[type];
              const icon = UPGRADE_ICONS[type];
              const description = UPGRADE_DESCRIPTIONS[type];

              const currentEffect = currentLevel > 0
                ? `+${(currentLevel * upgrade.effectPerLevel * 100).toFixed(0)}%`
                : 'Base';
              const nextEffect = !isMaxed
                ? `+${((currentLevel + 1) * upgrade.effectPerLevel * 100).toFixed(0)}%`
                : 'MAX';

              return (
                <div
                  key={type}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: `${color}08`,
                    border: `1.5px solid ${color}30`,
                    boxShadow: `0 0 12px ${color}08`,
                  }}
                >
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono" style={{ color }}>{upgrade.name}</span>
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                        >
                          LV {currentLevel}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: '#888' }}>{description}</div>
                    </div>
                  </div>

                  {/* Effect display */}
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-mono">
                    <span style={{ color: '#666' }}>Current:</span>
                    <span style={{ color: currentLevel > 0 ? LIME : '#555' }}>{currentEffect}</span>
                    {!isMaxed && (
                      <>
                        <span style={{ color: '#444' }}>→</span>
                        <span style={{ color }}>{nextEffect}</span>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full mb-2" style={{ backgroundColor: '#1a1a2a' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: isMaxed ? '100%' : `${Math.min(100, (currentLevel / Math.min(upgrade.maxLevel, 50)) * 100)}%`,
                        backgroundColor: isMaxed ? GOLD : color,
                        boxShadow: `0 0 6px ${isMaxed ? GOLD : color}66`,
                      }}
                    />
                  </div>

                  {/* Upgrade buttons */}
                  {!isMaxed && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClick(() => handleUpgradeByCoin(type))}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all"
                        style={{
                          backgroundColor: canAfford ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.3)',
                          border: `1.5px solid ${canAfford ? '#ffd700' : '#333'}`,
                          color: canAfford ? '#ffd700' : '#555',
                          textShadow: canAfford ? '0 0 6px #ffd70066' : 'none',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}
                      >
                        🪙 {cost.toLocaleString()}
                      </button>
                      <button
                        onClick={() => handleClick(() => handleUpgradeByAd(type))}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all"
                        style={{
                          backgroundColor: 'rgba(0,255,255,0.08)',
                          border: '1.5px solid rgba(0,255,255,0.4)',
                          color: CYAN,
                          textShadow: '0 0 6px #00ffff66',
                          cursor: 'pointer',
                        }}
                      >
                        🎬 AD (FREE)
                      </button>
                    </div>
                  )}

                  {isMaxed && (
                    <div className="text-center text-xs font-mono font-bold py-1" style={{ color: GOLD, textShadow: '0 0 8px #ffd700' }}>
                      ★ MAX LEVEL ★
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="text-center mt-4 text-[8px] font-mono" style={{ color: '#ffffff22' }}>
            Watch ads for free upgrades • Prices increase exponentially • No limit on upgrades
          </div>

          {/* Back button */}
          <button
            onClick={() => handleClick(() => setGamePhase('menu'))}
            className="neon-btn w-full py-2 mt-3 text-xs tracking-wider font-mono font-bold"
            style={{ borderColor: '#666', color: '#888' }}
          >
            ← BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
}
