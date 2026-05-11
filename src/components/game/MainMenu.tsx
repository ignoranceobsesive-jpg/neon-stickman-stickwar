'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import {
  PET_DEFS, PET_SKINS, SKINS, SKILL_DEFS,
  CYAN, GOLD, MAGENTA, ORANGE, PURPLE, LIME, RED, WHITE,
  getRankForElo, TOTAL_LEVELS,
  type SkillElement, type SkillDef,
} from '@/lib/game-types';
import { soundEngine } from '@/lib/sound-engine';
import { AdManager } from '@/lib/ad-manager';
import { tryAutoFullscreen } from '@/components/game/LandscapeOverlay';

type CustomTab = 'skins' | 'pets' | 'skills';

const ELEMENT_COLORS: Record<SkillElement, string> = {
  fire: '#ff4400',
  frost: '#88eeff',
  shadow: '#8800ff',
  summon: '#aa00ff',
  death: '#330033',
  lightning: '#ffff00',
  void: '#ff00ff',
  blood: '#cc0000',
};

const ELEMENT_NAMES: Record<SkillElement, string> = {
  fire: 'FIRE',
  frost: 'FROST',
  shadow: 'SHADOW',
  summon: 'SUMMON',
  death: 'DEATH',
  lightning: 'LIGHTNING',
  void: 'VOID',
  blood: 'BLOOD',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  rare: '#4488ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

const SKIN_RARITY_COLORS: Record<string, string> = {
  common: '#888888',
  rare: CYAN,
  epic: MAGENTA,
  legendary: GOLD,
};

function getUnlockText(skill: SkillDef): string {
  switch (skill.unlockMethod) {
    case 'level': return `Reach Lv.${skill.unlockLevel}`;
    case 'boss': return `Defeat ${skill.unlockBoss || 'Boss'}`;
    case 'chest': return skill.unlockCost > 0 ? `${skill.unlockCost} Coins` : 'Find in Chest';
    case 'purchase': return `${skill.unlockCost} Coins`;
    case 'ad': return `🎬 Watch Ad — ${skill.unlockCost} Coins`;
    case 'story': return 'Story Unlock';
    default: return '???';
  }
}

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

export default function MainMenu() {
  const startGame = useGameStore(s => s.startGame);
  const saveData = useGameStore(s => s.saveData);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const setGameMode = useGameStore(s => s.setGameMode);
  const selectPet = useGameStore(s => s.selectPet);
  const buyPet = useGameStore(s => s.buyPet);
  const buySkin = useGameStore(s => s.buySkin);
  const selectSkin = useGameStore(s => s.selectSkin);
  const buyPetSkin = useGameStore(s => s.buyPetSkin);
  const selectPetSkin = useGameStore(s => s.selectPetSkin);
  const buySkill = useGameStore(s => s.buySkill);
  const equipSkill = useGameStore(s => s.equipSkill);
  const unequipSkill = useGameStore(s => s.unequipSkill);
  const upgradeSkill = useGameStore(s => s.upgradeSkill);
  const addCoinsReward = useGameStore(s => s.addCoinsReward);

  const [showCustomization, setShowCustomization] = useState(false);
  const [customTab, setCustomTab] = useState<CustomTab>('skins');
  const [showAd, setShowAd] = useState(false);
  const [adCallback, setAdCallback] = useState<(() => void) | null>(null);
  const [selectedElement, setSelectedElement] = useState<SkillElement | 'all'>('all');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const rankInfo = getRankForElo(saveData.rankingData.elo);
  const currentPet = PET_DEFS.find(p => p.id === saveData.currentPet) || PET_DEFS[0];

  const handleClick = (action: () => void) => {
    soundEngine.init();
    soundEngine.playMenuClick();
    action();
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

  // === SKINS TAB ===
  const renderSkinsTab = () => (
    <div className="space-y-3">
      {/* Character Skins */}
      <div className="text-[10px] font-mono font-bold mb-1" style={{ color: CYAN }}>CHARACTER SKINS</div>
      <div className="grid grid-cols-3 gap-1.5">
        {SKINS.map((skin) => {
          const owned = saveData.unlockedSkins.includes(skin.id);
          const equipped = saveData.currentSkin === skin.id;
          const canAfford = saveData.totalCoins >= skin.price;
          const isHighTier = skin.price >= 2000;

          return (
            <div
              key={skin.id}
              className="rounded-lg p-1.5 text-center"
              style={{
                backgroundColor: equipped ? `${skin.color}15` : 'rgba(0,0,0,0.3)',
                border: `1px solid ${equipped ? skin.color : owned ? `${skin.color}60` : '#333'}`,
              }}
            >
              <div className="relative mx-auto mb-0.5" style={{ width: 24, height: 36 }}>
                <svg width="24" height="36" viewBox="0 0 40 60">
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
                <div className="absolute top-0 right-0 text-[5px] font-bold px-0.5 rounded"
                  style={{ backgroundColor: SKIN_RARITY_COLORS[skin.rarity], color: '#000' }}>
                  {skin.rarity.slice(0, 3).toUpperCase()}
                </div>
              </div>
              <div className="font-bold text-[8px] font-mono mb-0.5" style={{ color: skin.color }}>
                {skin.name}
              </div>
              {equipped ? (
                <div className="text-[7px] font-mono font-bold" style={{ color: LIME }}>EQUIPPED</div>
              ) : owned ? (
                <button onClick={() => handleClick(() => { selectSkin(skin.id); })}
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: `${skin.color}20`, border: `1px solid ${skin.color}60`, color: skin.color }}>
                  EQUIP
                </button>
              ) : isHighTier ? (
                <button onClick={() => canAfford ? handleClick(() => { buySkin(skin.id); selectSkin(skin.id); soundEngine.playCoinCollect(); }) : handleWatchAd(() => { handleClick(() => { buySkin(skin.id); selectSkin(skin.id); soundEngine.playCoinCollect(); }); })}
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)', border: `1px solid ${canAfford ? '#ffd700' : CYAN}`, color: canAfford ? '#ffd700' : CYAN }}>
                  {canAfford ? `${skin.price} 🪙` : '🎬 AD'}
                </button>
              ) : (
                <button onClick={() => canAfford && handleClick(() => { buySkin(skin.id); selectSkin(skin.id); soundEngine.playCoinCollect(); })}
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${canAfford ? '#ffd700' : '#333'}`, color: canAfford ? '#ffd700' : '#555' }}>
                  {skin.price} 🪙
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pet Skins */}
      <div className="text-[10px] font-mono font-bold mb-1 mt-2" style={{ color: LIME }}>
        PET SKINS — {currentPet.name}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {PET_SKINS.filter(s => s.petId === saveData.currentPet).map((skin) => {
          const owned = saveData.unlockedPetSkins.includes(skin.id);
          const equipped = saveData.currentPetSkin === skin.id;
          const canAfford = saveData.totalCoins >= skin.price;
          const isHighTier = skin.price >= 800;

          return (
            <div
              key={skin.id}
              className="rounded-lg p-1.5 text-center"
              style={{
                backgroundColor: equipped ? `${skin.color}15` : 'rgba(0,0,0,0.3)',
                border: `1px solid ${equipped ? skin.color : owned ? `${skin.color}60` : '#333'}`,
              }}
            >
              <div className="relative mx-auto mb-0.5" style={{ width: 22, height: 22 }}>
                <svg width="22" height="22" viewBox="0 0 36 36">
                  <circle cx="18" cy="12" r="7" fill="none" stroke={skin.color} strokeWidth="2"
                    style={{ filter: `drop-shadow(0 0 4px ${skin.glowColor})` }} />
                  <ellipse cx="18" cy="26" rx="8" ry="5" fill="none" stroke={skin.color} strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 3px ${skin.glowColor})` }} />
                </svg>
              </div>
              <div className="font-bold text-[8px] font-mono mb-0.5" style={{ color: skin.color }}>
                {skin.name}
              </div>
              {equipped ? (
                <div className="text-[7px] font-mono font-bold" style={{ color: LIME }}>EQUIPPED</div>
              ) : owned ? (
                <button onClick={() => handleClick(() => selectPetSkin(skin.id))}
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: `${skin.color}20`, border: `1px solid ${skin.color}60`, color: skin.color }}>
                  EQUIP
                </button>
              ) : isHighTier ? (
                <button onClick={() => canAfford ? handleClick(() => { buyPetSkin(skin.id); selectPetSkin(skin.id); soundEngine.playCoinCollect(); }) : handleWatchAd(() => { handleClick(() => { buyPetSkin(skin.id); selectPetSkin(skin.id); soundEngine.playCoinCollect(); }); })}
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)', border: `1px solid ${canAfford ? '#ffd700' : CYAN}`, color: canAfford ? '#ffd700' : CYAN }}>
                  {canAfford ? `${skin.price} 🪙` : '🎬 AD'}
                </button>
              ) : (
                <button onClick={() => canAfford && handleClick(() => { buyPetSkin(skin.id); selectPetSkin(skin.id); soundEngine.playCoinCollect(); })}
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${canAfford ? '#ffd700' : '#333'}`, color: canAfford ? '#ffd700' : '#555' }}>
                  {skin.price} 🪙
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // === PETS TAB ===
  const renderPetsTab = () => (
    <div className="space-y-1.5">
      {PET_DEFS.map((pet) => {
        const owned = saveData.unlockedPets.includes(pet.id);
        const isSelected = saveData.currentPet === pet.id;
        const canAfford = saveData.totalCoins >= pet.price;
        const isHighTier = pet.price >= 1500;

        return (
          <div
            key={pet.id}
            className="flex items-center gap-2 p-1.5 rounded-lg"
            style={{
              backgroundColor: isSelected ? `${pet.color}15` : owned ? `${pet.color}08` : 'rgba(0,0,0,0.2)',
              border: `1px solid ${isSelected ? pet.color : owned ? `${pet.color}40` : '#33333340'}`,
            }}
          >
            <div style={{ width: 28, height: 28 }}>
              <svg width="28" height="28" viewBox="0 0 40 40">
                <circle cx="20" cy="15" r="8" fill="none" stroke={pet.color} strokeWidth="2"
                  style={{ filter: `drop-shadow(0 0 4px ${pet.glowColor})` }} />
                <circle cx="22" cy="13" r="2" fill={pet.glowColor} />
                <ellipse cx="20" cy="30" rx="10" ry="6" fill="none" stroke={pet.color} strokeWidth="2"
                  style={{ filter: `drop-shadow(0 0 4px ${pet.glowColor})` }} />
                <line x1="12" y1="34" x2="8" y2="39" stroke={pet.color} strokeWidth="1.5" />
                <line x1="28" y1="34" x2="32" y2="39" stroke={pet.color} strokeWidth="1.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[9px] font-mono" style={{ color: owned ? pet.color : '#555' }}>
                {pet.name}
              </div>
              <div className="text-[8px] font-mono truncate" style={{ color: owned ? '#888' : '#444' }}>
                {pet.description}
              </div>
            </div>
            <div className="flex-shrink-0">
              {isSelected ? (
                <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded" style={{ color: LIME, backgroundColor: 'rgba(0,255,102,0.1)' }}>
                  ACTIVE
                </span>
              ) : owned ? (
                <button
                  onClick={() => handleClick(() => selectPet(pet.id))}
                  className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${pet.color}20`, border: `1px solid ${pet.color}60`, color: pet.color }}
                >
                  SELECT
                </button>
              ) : isHighTier ? (
                <button
                  onClick={() => canAfford ? handleClick(() => { buyPet(pet.id); soundEngine.playCoinCollect(); }) : handleWatchAd(() => { handleClick(() => { buyPet(pet.id); soundEngine.playCoinCollect(); }); })}
                  className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)', border: `1px solid ${canAfford ? '#ffd700' : CYAN}`, color: canAfford ? '#ffd700' : CYAN }}
                >
                  {canAfford ? `${pet.price} 🪙` : '🎬 AD'}
                </button>
              ) : (
                <button
                  onClick={() => canAfford && handleClick(() => { buyPet(pet.id); soundEngine.playCoinCollect(); })}
                  className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${canAfford ? '#ffd700' : '#333'}`, color: canAfford ? '#ffd700' : '#555' }}
                >
                  {pet.price} 🪙
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // === SKILLS TAB ===
  const renderSkillsTab = () => {
    const filteredSkills = selectedElement === 'all'
      ? SKILL_DEFS
      : SKILL_DEFS.filter(s => s.element === selectedElement);

    const equipped = saveData.equippedSkills;

    return (
      <div className="space-y-1.5">
        {/* Equipped Skills */}
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,102,0,0.06)', border: '1px solid #ff660020' }}>
          <div className="text-[8px] font-mono mb-1" style={{ color: ORANGE }}>EQUIPPED SKILLS</div>
          <div className="flex gap-1">
            {[0, 1, 2].map(slot => {
              const skillId = equipped[slot];
              const skillDef = skillId ? SKILL_DEFS.find(s => s.id === skillId) : null;
              const skillLevel = skillId ? (saveData.skillUpgrades[skillId] || 1) : 0;
              return (
                <div
                  key={slot}
                  className="flex-1 p-1 rounded text-center cursor-pointer"
                  style={{
                    backgroundColor: skillDef ? `${skillDef.color}15` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${skillDef ? skillDef.color + '60' : '#33333340'}`,
                  }}
                  onClick={() => handleClick(() => unequipSkill(slot))}
                >
                  {skillDef ? (
                    <>
                      <div className="text-[8px] font-mono font-bold" style={{ color: skillDef.color }}>{skillDef.name}</div>
                      <div className="text-[6px] font-mono" style={{ color: '#666' }}>
                        CD:{(skillDef.cooldown / 60).toFixed(1)}s Lv.{skillLevel}
                      </div>
                      {/* Cooldown bar visual */}
                      <div className="w-full h-1 rounded-full mt-0.5" style={{ backgroundColor: '#222' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (skillDef.cooldown / 600) * 100)}%`,
                            backgroundColor: skillDef.color,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-[8px] font-mono" style={{ color: '#555' }}>
                      {['DASH', 'SHLD', 'SPCL'][slot]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Element Filter */}
        <div className="flex gap-0.5 flex-wrap">
          <button
            onClick={() => handleClick(() => setSelectedElement('all'))}
            className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold"
            style={{
              backgroundColor: selectedElement === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${selectedElement === 'all' ? '#ffffff50' : '#333'}`,
              color: selectedElement === 'all' ? '#fff' : '#666',
            }}
          >
            ALL
          </button>
          {(['fire', 'frost', 'shadow', 'summon', 'death', 'lightning', 'void', 'blood'] as SkillElement[]).map(el => (
            <button
              key={el}
              onClick={() => handleClick(() => setSelectedElement(el))}
              className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold"
              style={{
                backgroundColor: selectedElement === el ? `${ELEMENT_COLORS[el]}25` : 'rgba(0,0,0,0.3)',
                border: `1px solid ${selectedElement === el ? ELEMENT_COLORS[el] + '60' : '#333'}`,
                color: selectedElement === el ? ELEMENT_COLORS[el] : '#666',
              }}
            >
              {ELEMENT_NAMES[el]}
            </button>
          ))}
        </div>

        {/* Skills List */}
        <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {filteredSkills.map(skill => {
            const isUnlocked = saveData.unlockedSkills.includes(skill.id);
            const isEquipped = equipped.includes(skill.id);
            const canAfford = saveData.totalCoins >= skill.unlockCost;
            const isAdUnlock = skill.unlockMethod === 'ad';
            const skillLevel = saveData.skillUpgrades[skill.id] || 1;

            return (
              <div
                key={skill.id}
                className="p-1.5 rounded-lg flex gap-1.5 items-center"
                style={{
                  backgroundColor: isUnlocked ? `${skill.color}08` : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${isEquipped ? skill.color : isUnlocked ? skill.color + '40' : '#33333330'}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${skill.color}15`, border: `1px solid ${skill.color}40` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: skill.color, boxShadow: `0 0 8px ${skill.glowColor}` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[8px] font-mono" style={{ color: isUnlocked ? skill.color : '#555' }}>
                      {skill.name}
                    </span>
                    <span className="text-[6px] font-mono px-0.5 rounded" style={{ backgroundColor: `${RARITY_COLORS[skill.rarity]}20`, color: RARITY_COLORS[skill.rarity] }}>
                      {skill.rarity.slice(0, 3).toUpperCase()}
                    </span>
                    {isUnlocked && skillLevel > 1 && (
                      <span className="text-[6px] font-mono font-bold" style={{ color: GOLD }}>★{skillLevel}</span>
                    )}
                  </div>
                  {/* Cooldown visual bar */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#222' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (skill.cooldown / 600) * 100)}%`,
                          backgroundColor: skill.color,
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <span className="text-[6px] font-mono flex-shrink-0" style={{ color: '#666' }}>
                      {(skill.cooldown / 60).toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isUnlocked ? (
                    isEquipped ? (
                      <span className="text-[7px] font-mono font-bold" style={{ color: LIME }}>✓</span>
                    ) : (
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(slot => (
                          <button
                            key={slot}
                            onClick={() => handleClick(() => equipSkill(skill.id, slot))}
                            className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                            style={{ backgroundColor: `${skill.color}20`, border: `1px solid ${skill.color}50`, color: skill.color }}
                          >
                            {['1', '2', '3'][slot]}
                          </button>
                        ))}
                      </div>
                    )
                  ) : isAdUnlock ? (
                    <button
                      onClick={() => canAfford ? handleClick(() => { buySkill(skill.id); soundEngine.playCoinCollect(); }) : handleWatchAd(() => { handleClick(() => { buySkill(skill.id); soundEngine.playCoinCollect(); }); })}
                      className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)', border: `1px solid ${canAfford ? '#ffd700' : CYAN}`, color: canAfford ? '#ffd700' : CYAN }}
                    >
                      {canAfford ? `${skill.unlockCost} 🪙` : '🎬 AD'}
                    </button>
                  ) : skill.unlockMethod === 'purchase' || skill.unlockMethod === 'chest' ? (
                    <button
                      onClick={() => canAfford && handleClick(() => { buySkill(skill.id); soundEngine.playCoinCollect(); })}
                      className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{ backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${canAfford ? '#ffd700' : '#333'}`, color: canAfford ? '#ffd700' : '#555' }}
                    >
                      {skill.unlockCost} 🪙
                    </button>
                  ) : (
                    <span className="text-[6px] font-mono" style={{ color: '#555' }}>
                      {getUnlockText(skill)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
      {/* Ad overlay */}
      {showAd && <AdOverlay onComplete={handleAdComplete} />}

      {/* Scrollable content area */}
      <div
        className="flex-1 overflow-y-auto pointer-events-auto"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {!showCustomization ? (
          /* === MAIN MENU — LANDSCAPE LAYOUT === */
          <div className="flex flex-col items-center justify-center h-full px-3" style={{ paddingTop: '1vh', paddingBottom: '1vh' }}>
            <div
              className="w-full max-w-lg rounded-xl p-3 relative"
              style={{
                border: '1.5px solid rgba(0,255,255,0.25)',
                boxShadow: '0 0 12px rgba(0,255,255,0.08), inset 0 0 12px rgba(0,255,255,0.03)',
                animation: 'neon-border-pulse 3s ease-in-out infinite',
              }}
            >
              {/* Animated neon border glow */}
              <style>{`
                @keyframes neon-border-pulse {
                  0%, 100% {
                    border-color: rgba(0,255,255,0.25);
                    box-shadow: 0 0 12px rgba(0,255,255,0.08), inset 0 0 12px rgba(0,255,255,0.03);
                  }
                  50% {
                    border-color: rgba(0,255,255,0.5);
                    box-shadow: 0 0 20px rgba(0,255,255,0.15), inset 0 0 20px rgba(0,255,255,0.06), 0 0 40px rgba(0,255,255,0.05);
                  }
                }
              `}</style>

              {/* Title row — compact for landscape */}
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {/* Animated Stickman SVG */}
                <div className="flex-shrink-0" style={{ width: 28, height: 42 }}>
                  <svg width="28" height="42" viewBox="0 0 40 60" className="stickman-idle">
                    <defs>
                      <filter id="neonGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <g filter="url(#neonGlow)">
                      <circle cx="20" cy="10" r="7" fill="none" stroke={CYAN} strokeWidth="2" />
                      <circle cx="22" cy="9" r="1.5" fill={CYAN} />
                      <line x1="20" y1="17" x2="20" y2="35" stroke={CYAN} strokeWidth="2" />
                      <line x1="20" y1="22" x2="10" y2="28" stroke={CYAN} strokeWidth="2" />
                      <line x1="20" y1="22" x2="30" y2="28" stroke={CYAN} strokeWidth="2" />
                      <line x1="20" y1="35" x2="13" y2="52" stroke={CYAN} strokeWidth="2" />
                      <line x1="20" y1="35" x2="27" y2="52" stroke={CYAN} strokeWidth="2" />
                    </g>
                    <style>{`
                      .stickman-idle {
                        animation: stickmanBob 2s ease-in-out infinite;
                      }
                      @keyframes stickmanBob {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-3px); }
                      }
                    `}</style>
                  </svg>
                </div>

                <div className="text-center">
                  <h1
                    className="text-xl sm:text-3xl font-bold tracking-wider leading-tight"
                    style={{
                      color: '#00ffff',
                      textShadow: '0 0 15px #00ffff, 0 0 30px #00ffff',
                      animation: 'neon-pulse 3s ease-in-out infinite',
                    }}
                  >
                    NEON STICKMAN
                  </h1>
                  <p
                    className="text-xs sm:text-base tracking-widest leading-tight"
                    style={{
                      color: '#ff00ff',
                      textShadow: '0 0 8px #ff00ff, 0 0 20px #ff00ff',
                    }}
                  >
                    STICK WAR
                  </p>
                </div>
              </div>

              {/* Coins + Rank display */}
              <div className="flex items-center justify-center gap-2 font-mono text-xs mb-2">
                <span style={{ color: GOLD, textShadow: '0 0 8px #ffd700' }}>
                  🪙 {saveData.totalCoins}
                </span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}>
                  {rankInfo.icon} {rankInfo.rank}
                </span>
                <span style={{ color: '#888' }}>|</span>
                <span style={{ color: '#ffffff44' }}>
                  LV {saveData.highestLevel}/{TOTAL_LEVELS.toLocaleString()}
                </span>
              </div>

              {/* Menu buttons — two-column grid for landscape */}
              <div className="grid grid-cols-2 gap-1.5 max-w-sm mx-auto">
                {/* ▶ CONTINUE / ⚔️ OFFLINE — Primary, spans both columns */}
                <button
                  onClick={() => handleClick(() => { tryAutoFullscreen(); setGameMode('single'); startGame(); })}
                  className="neon-btn col-span-2 py-2.5 px-4 text-base font-bold tracking-wider"
                  style={{
                    borderColor: saveData.highestLevel > 0 ? '#00ff66' : '#00ffff',
                    color: saveData.highestLevel > 0 ? '#00ff66' : '#00ffff',
                    textShadow: saveData.highestLevel > 0 ? '0 0 10px #00ff66' : '0 0 10px #00ffff',
                  }}
                >
                  {saveData.highestLevel > 0 ? '▶ CONTINUE' : '⚔️ OFFLINE'}
                </button>

                {/* 🔫 UPGRADE */}
                <button
                  onClick={() => handleClick(() => setGamePhase('weapon-shop'))}
                  className="neon-btn py-2 px-3 text-xs font-bold tracking-wider"
                  style={{ borderColor: RED, color: RED, textShadow: '0 0 8px #ff3333' }}
                >
                  🔫 UPGRADE
                </button>

                {/* 🗺️ LEVEL MAP */}
                <button
                  onClick={() => handleClick(() => setGamePhase('level-map'))}
                  className="neon-btn py-2 px-3 text-xs font-bold tracking-wider"
                  style={{ borderColor: ORANGE, color: ORANGE, textShadow: '0 0 8px #ff6600' }}
                >
                  🗺️ LEVEL MAP
                </button>

                {/* 🎨 CUSTOMIZE */}
                <button
                  onClick={() => handleClick(() => setShowCustomization(true))}
                  className="neon-btn py-2 px-3 text-xs font-bold tracking-wider"
                  style={{ borderColor: LIME, color: LIME, textShadow: '0 0 8px #00ff66' }}
                >
                  🎨 CUSTOMIZE
                </button>

                {/* 🌐 ONLINE */}
                <button
                  onClick={() => handleClick(() => setGamePhase('online-arena'))}
                  className="neon-btn py-2 px-3 text-xs font-bold tracking-wider relative"
                  style={{ borderColor: GOLD, color: GOLD, textShadow: '0 0 8px #ffd700' }}
                >
                  🌐 ONLINE
                  <span className="absolute top-0.5 right-1.5 text-[8px]" style={{ color: ORANGE }}>
                    {rankInfo.icon}
                  </span>
                </button>

                {/* 👤 PROFILE */}
                <button
                  onClick={() => handleClick(() => setGamePhase('profile'))}
                  className="neon-btn py-2 px-3 text-xs font-bold tracking-wider"
                  style={{ borderColor: PURPLE, color: PURPLE, textShadow: '0 0 8px #aa00ff' }}
                >
                  👤 PROFILE
                </button>

                {/* ⚙️ SETTINGS — spans both columns */}
                <button
                  onClick={() => handleClick(() => setGamePhase('settings'))}
                  className="neon-btn col-span-2 py-1.5 px-3 text-xs font-bold tracking-wider"
                  style={{ borderColor: '#555', color: '#777' }}
                >
                  ⚙️ SETTINGS
                </button>
              </div>
            </div>

            {/* Banner Ad Placeholder — only on main menu, not customization */}
            {!bannerDismissed && !showCustomization && (
              <div
                className="mx-auto mt-1.5 flex items-center justify-center gap-1.5 rounded px-2 py-1 cursor-pointer"
                style={{
                  width: 300,
                  maxWidth: '90vw',
                  height: 50,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  borderRadius: 4,
                }}
                onClick={() => {
                  const adManager = AdManager.getInstance();
                  adManager.showBannerAd();
                }}
              >
                <span className="text-[9px] font-mono tracking-wider" style={{ color: 'rgba(255,215,0,0.4)' }}>
                  AD
                </span>
                <span className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  •
                </span>
                <span className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.12)' }}>
                  Sponsored Content
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBannerDismissed(true);
                    const adManager = AdManager.getInstance();
                    adManager.hideBannerAd();
                  }}
                  className="ml-auto text-[8px] font-mono px-1 py-0.5 rounded"
                  style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}
                  aria-label="Dismiss ad"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          /* === CUSTOMIZATION PANEL === */
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="flex flex-col gap-1.5 w-full max-w-md">
              {/* Header */}
              <h2 className="text-base font-bold text-center tracking-wider" style={{ color: LIME, textShadow: '0 0 10px #00ff66' }}>
                🎨 CUSTOMIZATION
              </h2>

              {/* Coins display */}
              <div className="text-center font-mono text-[10px]" style={{ color: GOLD }}>
                🪙 {saveData.totalCoins} COINS
              </div>

              {/* Tab buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleClick(() => setCustomTab('skins'))}
                  className="flex-1 py-1.5 text-[9px] font-bold font-mono tracking-wider rounded"
                  style={{
                    backgroundColor: customTab === 'skins' ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${customTab === 'skins' ? CYAN : '#333'}`,
                    color: customTab === 'skins' ? CYAN : '#666',
                  }}
                >
                  SKINS
                </button>
                <button
                  onClick={() => handleClick(() => setCustomTab('pets'))}
                  className="flex-1 py-1.5 text-[9px] font-bold font-mono tracking-wider rounded"
                  style={{
                    backgroundColor: customTab === 'pets' ? 'rgba(0,255,102,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${customTab === 'pets' ? LIME : '#333'}`,
                    color: customTab === 'pets' ? LIME : '#666',
                  }}
                >
                  PETS
                </button>
                <button
                  onClick={() => handleClick(() => setCustomTab('skills'))}
                  className="flex-1 py-1.5 text-[9px] font-bold font-mono tracking-wider rounded"
                  style={{
                    backgroundColor: customTab === 'skills' ? 'rgba(255,102,0,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${customTab === 'skills' ? ORANGE : '#333'}`,
                    color: customTab === 'skills' ? ORANGE : '#666',
                  }}
                >
                  SKILLS
                </button>
              </div>

              {/* Tab content */}
              <div className="max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {customTab === 'skins' && renderSkinsTab()}
                {customTab === 'pets' && renderPetsTab()}
                {customTab === 'skills' && renderSkillsTab()}
              </div>

              {/* Ad hint */}
              <div className="text-center text-[7px] font-mono" style={{ color: '#ffffff22' }}>
                Watch ads to earn coins • Complete levels to unlock more
              </div>

              {/* Back button */}
              <button
                onClick={() => handleClick(() => setShowCustomization(false))}
                className="neon-btn w-full py-1.5 px-4 text-xs tracking-wider"
                style={{ borderColor: '#666', color: '#888' }}
              >
                ← BACK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
