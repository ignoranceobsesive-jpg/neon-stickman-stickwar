'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { SKINS, PET_SKINS, PET_DEFS, CYAN, GOLD, MAGENTA, LIME } from '@/lib/game-types';
import { soundEngine } from '@/lib/sound-engine';

// Simulated ad watch overlay
function AdOverlay({ onComplete }: { onComplete: () => void }) {
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
          {progress < 100 ? 'Please wait...' : '✅ Reward unlocked!'}
        </div>
      </div>
    </div>
  );
}

export default function SkinShop() {
  const saveData = useGameStore(s => s.saveData);
  const buySkin = useGameStore(s => s.buySkin);
  const selectSkin = useGameStore(s => s.selectSkin);
  const buyPetSkin = useGameStore(s => s.buyPetSkin);
  const selectPetSkin = useGameStore(s => s.selectPetSkin);
  const backToMenu = useGameStore(s => s.backToMenu);
  const addCoinsReward = useGameStore(s => s.addCoinsReward);
  const [selectedSkin, setSelectedSkin] = useState(saveData.currentSkin);
  const [activeTab, setActiveTab] = useState<'character' | 'pet'>('character');
  const [showAd, setShowAd] = useState(false);
  const [adCallback, setAdCallback] = useState<(() => void) | null>(null);

  const rarityColors: Record<string, string> = {
    common: '#888888',
    rare: CYAN,
    epic: MAGENTA,
    legendary: GOLD,
  };

  const handleBuySkin = (skinId: string) => {
    const success = buySkin(skinId);
    if (success) {
      selectSkin(skinId);
      setSelectedSkin(skinId);
      soundEngine.init();
      soundEngine.playCoinCollect();
    }
  };

  const handleEquipSkin = (skinId: string) => {
    selectSkin(skinId);
    setSelectedSkin(skinId);
    soundEngine.init();
    soundEngine.playMenuClick();
  };

  const handleBuyPetSkin = (skinId: string) => {
    const success = buyPetSkin(skinId);
    if (success) {
      selectPetSkin(skinId);
      soundEngine.init();
      soundEngine.playCoinCollect();
    }
  };

  const handleEquipPetSkin = (skinId: string) => {
    selectPetSkin(skinId);
    soundEngine.init();
    soundEngine.playMenuClick();
  };

  const handleWatchAd = useCallback((callback: () => void) => {
    setShowAd(true);
    setAdCallback(() => callback);
  }, []);

  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    // Reward coins for watching the ad before executing the pending purchase
    addCoinsReward(200);
    if (adCallback) {
      adCallback();
      setAdCallback(null);
    }
  }, [adCallback, addCoinsReward]);

  // Get skins for the current pet
  const currentPetId = saveData.currentPet;
  const allPetSkins = PET_SKINS;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      {/* Ad overlay */}
      {showAd && <AdOverlay onComplete={handleAdComplete} />}

      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-6 pointer-events-auto mx-4"
        style={{
          backgroundColor: 'rgba(5, 5, 20, 0.97)',
          border: '2px solid #00ffff',
          boxShadow: '0 0 30px #00ffff20',
        }}
      >
        <h1
          className="text-3xl font-bold text-center tracking-wider mb-2 font-mono"
          style={{ color: CYAN, textShadow: '0 0 10px #00ffff' }}
        >
          SHOP
        </h1>

        {/* Coins */}
        <div className="text-center mb-4 font-mono">
          <span style={{ color: GOLD, textShadow: '0 0 8px #ffd700' }}>
            🪙 COINS: {saveData.totalCoins}
          </span>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('character')}
            className="flex-1 py-2 text-sm font-bold font-mono tracking-wider rounded"
            style={{
              backgroundColor: activeTab === 'character' ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${activeTab === 'character' ? CYAN : '#333'}`,
              color: activeTab === 'character' ? CYAN : '#666',
              textShadow: activeTab === 'character' ? '0 0 5px #00ffff' : 'none',
            }}
          >
            CHARACTER SKINS
          </button>
          <button
            onClick={() => setActiveTab('pet')}
            className="flex-1 py-2 text-sm font-bold font-mono tracking-wider rounded"
            style={{
              backgroundColor: activeTab === 'pet' ? 'rgba(0,255,102,0.15)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${activeTab === 'pet' ? LIME : '#333'}`,
              color: activeTab === 'pet' ? LIME : '#666',
              textShadow: activeTab === 'pet' ? '0 0 5px #00ff66' : 'none',
            }}
          >
            PET SKINS
          </button>
        </div>

        {activeTab === 'character' ? (
          /* Character Skins Grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {SKINS.map((skin) => {
              const owned = saveData.unlockedSkins.includes(skin.id);
              const equipped = saveData.currentSkin === skin.id;
              const canAfford = saveData.totalCoins >= skin.price;
              const isHighTier = skin.price >= 2000;

              return (
                <div
                  key={skin.id}
                  className="rounded-lg p-3 text-center transition-all"
                  style={{
                    backgroundColor: equipped ? `${skin.color}15` : 'rgba(0,0,0,0.3)',
                    border: `2px solid ${equipped ? skin.color : owned ? `${skin.color}60` : '#333'}`,
                    boxShadow: equipped ? `0 0 15px ${skin.color}30` : 'none',
                  }}
                >
                  {/* Character preview */}
                  <div className="relative mx-auto mb-2" style={{ width: 40, height: 60 }}>
                    <svg width="40" height="60" viewBox="0 0 40 60">
                      <circle cx="20" cy="10" r="7" fill="none" stroke={skin.color} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                      <line x1="20" y1="17" x2="20" y2="35" stroke={skin.color} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                      <line x1="20" y1="22" x2="10" y2="28" stroke={skin.color} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                      <line x1="20" y1="22" x2="30" y2="28" stroke={skin.color} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                      <line x1="20" y1="35" x2="13" y2="52" stroke={skin.color} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                      <line x1="20" y1="35" x2="27" y2="52" stroke={skin.color} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                    </svg>
                    <div
                      className="absolute top-0 right-0 text-[7px] font-bold px-1 rounded"
                      style={{ backgroundColor: rarityColors[skin.rarity], color: '#000' }}
                    >
                      {skin.rarity.toUpperCase()}
                    </div>
                  </div>

                  <div className="font-bold text-xs font-mono mb-1" style={{ color: skin.color, textShadow: `0 0 5px ${skin.color}` }}>
                    {skin.name}
                  </div>

                  {equipped ? (
                    <div className="text-[9px] font-mono font-bold" style={{ color: LIME }}>EQUIPPED</div>
                  ) : owned ? (
                    <button onClick={() => handleEquipSkin(skin.id)} className="text-[9px] font-mono font-bold px-2 py-1 rounded"
                      style={{ backgroundColor: `${skin.color}20`, border: `1px solid ${skin.color}60`, color: skin.color }}>
                      EQUIP
                    </button>
                  ) : isHighTier ? (
                    <button
                      onClick={() => canAfford ? handleBuySkin(skin.id) : handleWatchAd(() => handleBuySkin(skin.id))}
                      className="text-[9px] font-mono font-bold px-2 py-1 rounded"
                      style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)', border: `1px solid ${canAfford ? '#ffd700' : CYAN}`, color: canAfford ? '#ffd700' : CYAN }}
                    >
                      {canAfford ? `${skin.price} 🪙` : '🎬 WATCH AD'}
                    </button>
                  ) : (
                    <button onClick={() => canAfford && handleBuySkin(skin.id)} className="text-[9px] font-mono font-bold px-2 py-1 rounded"
                      style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${canAfford ? '#ffd700' : '#333'}`, color: canAfford ? '#ffd700' : '#555' }}>
                      {skin.price} 🪙
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Pet Skins Grid */
          <div className="mb-6">
            {/* Current pet info */}
            <div className="text-center mb-3 font-mono text-xs" style={{ color: '#888' }}>
              Skins for: <span style={{ color: LIME }}>{PET_DEFS.find(p => p.id === currentPetId)?.name || 'Unknown Pet'}</span>
              {' '}(Select a pet from the PETS menu first)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allPetSkins.map((skin) => {
                const owned = saveData.unlockedPetSkins.includes(skin.id);
                const equipped = saveData.currentPetSkin === skin.id;
                const canAfford = saveData.totalCoins >= skin.price;
                const isForCurrentPet = skin.petId === currentPetId;
                const isHighTier = skin.price >= 800;

                return (
                  <div
                    key={skin.id}
                    className="rounded-lg p-3 text-center transition-all"
                    style={{
                      backgroundColor: equipped ? `${skin.color}15` : 'rgba(0,0,0,0.3)',
                      border: `2px solid ${equipped ? skin.color : owned ? `${skin.color}60` : '#333'}`,
                      boxShadow: equipped ? `0 0 15px ${skin.color}30` : 'none',
                      opacity: isForCurrentPet ? 1 : 0.4,
                    }}
                  >
                    {/* Pet preview */}
                    <div className="relative mx-auto mb-2" style={{ width: 36, height: 36 }}>
                      <svg width="36" height="36" viewBox="0 0 36 36">
                        <circle cx="18" cy="12" r="7" fill="none" stroke={skin.color} strokeWidth="2"
                          style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                        <circle cx="20" cy="10" r="2" fill={skin.glowColor} />
                        <ellipse cx="18" cy="26" rx="8" ry="5" fill="none" stroke={skin.color} strokeWidth="1.5"
                          style={{ filter: `drop-shadow(0 0 3px ${skin.glowColor})` }} />
                      </svg>
                      <div className="absolute top-0 right-0 text-[6px] font-bold px-1 rounded"
                        style={{ backgroundColor: rarityColors[skin.rarity], color: '#000' }}>
                        {skin.rarity.toUpperCase().slice(0, 3)}
                      </div>
                    </div>

                    <div className="font-bold text-[10px] font-mono mb-1" style={{ color: skin.color, textShadow: `0 0 5px ${skin.color}` }}>
                      {skin.name}
                    </div>

                    <div className="text-[8px] font-mono mb-1" style={{ color: '#666' }}>
                      {PET_DEFS.find(p => p.id === skin.petId)?.name || ''}
                    </div>

                    {equipped ? (
                      <div className="text-[8px] font-mono font-bold" style={{ color: LIME }}>EQUIPPED</div>
                    ) : owned ? (
                      isForCurrentPet ? (
                        <button onClick={() => handleEquipPetSkin(skin.id)} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${skin.color}20`, border: `1px solid ${skin.color}60`, color: skin.color }}>
                          EQUIP
                        </button>
                      ) : (
                        <div className="text-[8px] font-mono" style={{ color: '#555' }}>OWNED</div>
                      )
                    ) : isHighTier ? (
                      <button
                        onClick={() => canAfford ? handleBuyPetSkin(skin.id) : handleWatchAd(() => handleBuyPetSkin(skin.id))}
                        className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)', border: `1px solid ${canAfford ? '#ffd700' : CYAN}`, color: canAfford ? '#ffd700' : CYAN }}
                      >
                        {canAfford ? `${skin.price} 🪙` : '🎬 WATCH AD'}
                      </button>
                    ) : (
                      <button onClick={() => canAfford && handleBuyPetSkin(skin.id)} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${canAfford ? '#ffd700' : '#333'}`, color: canAfford ? '#ffd700' : '#555' }}>
                        {skin.price} 🪙
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ad hint */}
        <div className="text-center mb-4">
          <div className="text-[10px] font-mono" style={{ color: '#ffffff22' }}>
            Watch ads to earn coins • Complete levels to unlock skins
          </div>
        </div>

        <button
          onClick={() => { soundEngine.init(); soundEngine.playMenuClick(); backToMenu(); }}
          className="neon-btn w-full py-3 px-6 text-lg font-bold font-mono tracking-wider"
          style={{ borderColor: CYAN, color: CYAN, textShadow: '0 0 10px #00ffff' }}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
