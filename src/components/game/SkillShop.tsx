'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { SKILL_DEFS, SKILL_UPGRADE_COSTS, SKILL_UPGRADE_AD, SKILL_UPGRADE_DAMAGE, SKILL_UPGRADE_COOLDOWN, MAX_SKILL_LEVEL, type SkillElement, type SkillDef, GOLD, PURPLE, MAGENTA, ORANGE, CYAN, RED, LIME } from '@/lib/game-types';
import { soundEngine } from '@/lib/sound-engine';

const ELEMENT_ORDER: SkillElement[] = ['fire', 'frost', 'shadow', 'summon', 'death', 'lightning', 'void', 'blood'];

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

export default function SkillShop() {
  const saveData = useGameStore(s => s.saveData);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const buySkill = useGameStore(s => s.buySkill);
  const equipSkill = useGameStore(s => s.equipSkill);
  const unequipSkill = useGameStore(s => s.unequipSkill);
  const upgradeSkill = useGameStore(s => s.upgradeSkill);
  const addCoinsReward = useGameStore(s => s.addCoinsReward);
  const [selectedElement, setSelectedElement] = useState<SkillElement | 'all'>('all');
  const [showAd, setShowAd] = useState(false);
  const [adCallback, setAdCallback] = useState<(() => void) | null>(null);
  const [upgradeEffect, setUpgradeEffect] = useState<string | null>(null);

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
    // Reward coins for watching the ad before executing the pending purchase/upgrade
    addCoinsReward(200);
    if (adCallback) {
      adCallback();
      setAdCallback(null);
    }
  }, [adCallback, addCoinsReward]);

  const handleUpgrade = (skillId: string) => {
    const skillLevel = saveData.skillUpgrades[skillId] ?? 1;
    const nextLevel = skillLevel + 1;
    const cost = SKILL_UPGRADE_COSTS[nextLevel - 1] ?? 0;
    const needsAd = SKILL_UPGRADE_AD[nextLevel - 1] ?? false;
    const canAfford = saveData.totalCoins >= cost;

    if (needsAd && !canAfford) {
      // Watch ad to upgrade
      handleWatchAd(() => {
        handleClick(() => {
          if (upgradeSkill(skillId)) {
            soundEngine.playCoinCollect();
            setUpgradeEffect(skillId);
            setTimeout(() => setUpgradeEffect(null), 1000);
          }
        });
      });
    } else {
      handleClick(() => {
        if (upgradeSkill(skillId)) {
          soundEngine.playCoinCollect();
          setUpgradeEffect(skillId);
          setTimeout(() => setUpgradeEffect(null), 1000);
        }
      });
    }
  };

  const filteredSkills = selectedElement === 'all'
    ? SKILL_DEFS
    : SKILL_DEFS.filter(s => s.element === selectedElement);

  const equipped = saveData.equippedSkills;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center bg-[#050510ee] overflow-hidden">
      {/* Ad overlay */}
      {showAd && <AdOverlay onComplete={handleAdComplete} />}

      {/* Header */}
      <div className="w-full max-w-2xl px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-3xl font-bold tracking-wider"
            style={{ color: ORANGE, textShadow: '0 0 15px #ff6600, 0 0 30px #ff6600' }}
          >
            SKILLS
          </h2>
          <div className="flex items-center gap-3 font-mono text-sm">
            <span style={{ color: GOLD, textShadow: '0 0 8px #ffd700' }}>
              🪙 COINS: {saveData.totalCoins}
            </span>
          </div>
        </div>

        {/* Equipped Skills */}
        <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,102,0,0.08)', border: '1px solid #ff660030' }}>
          <div className="text-xs font-mono mb-2" style={{ color: ORANGE }}>EQUIPPED SKILLS (Shift / E / F)</div>
          <div className="flex gap-2">
            {[0, 1, 2].map(slot => {
              const skillId = equipped[slot];
              const skillDef = skillId ? SKILL_DEFS.find(s => s.id === skillId) : null;
              const skillLevel = skillId ? (saveData.skillUpgrades[skillId] ?? 1) : 0;
              return (
                <div
                  key={slot}
                  className="flex-1 p-2 rounded text-center cursor-pointer"
                  style={{
                    backgroundColor: skillDef ? `${skillDef.color}15` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${skillDef ? skillDef.color + '60' : '#33333340'}`,
                    minHeight: 60,
                  }}
                  onClick={() => handleClick(() => unequipSkill(slot))}
                >
                  {skillDef ? (
                    <>
                      <div className="text-[10px] font-mono font-bold" style={{ color: skillDef.color }}>
                        {skillDef.name}
                      </div>
                      <div className="text-[9px] font-mono mt-0.5" style={{ color: '#ffaa00' }}>
                        LV {skillLevel}/{MAX_SKILL_LEVEL}
                      </div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: '#888' }}>
                        [{['SHIFT', 'E', 'F'][slot]}] click to unequip
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-mono font-bold" style={{ color: '#666' }}>
                        {['DASH', 'SHLD', 'SPCL'][slot]}
                      </span>
                      <span className="text-[8px] font-mono mt-0.5" style={{ color: '#444' }}>
                        [{['SHIFT', 'E', 'F'][slot]}] default
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Element Filter */}
        <div className="flex gap-1.5 mb-2 flex-wrap">
          <button
            onClick={() => handleClick(() => setSelectedElement('all'))}
            className="px-2.5 py-1 rounded text-[10px] font-mono font-bold"
            style={{
              backgroundColor: selectedElement === 'all' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${selectedElement === 'all' ? '#ffffff60' : '#33333340'}`,
              color: selectedElement === 'all' ? '#ffffff' : '#666',
            }}
          >
            ALL
          </button>
          {ELEMENT_ORDER.map(el => (
            <button
              key={el}
              onClick={() => handleClick(() => setSelectedElement(el))}
              className="px-2.5 py-1 rounded text-[10px] font-mono font-bold"
              style={{
                backgroundColor: selectedElement === el ? `${ELEMENT_COLORS[el]}25` : 'rgba(0,0,0,0.3)',
                border: `1px solid ${selectedElement === el ? ELEMENT_COLORS[el] + '60' : '#33333340'}`,
                color: selectedElement === el ? ELEMENT_COLORS[el] : '#666',
              }}
            >
              {ELEMENT_NAMES[el]}
            </button>
          ))}
        </div>
      </div>

      {/* Skills List */}
      <div className="flex-1 w-full max-w-2xl px-4 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>
        <div className="flex flex-col gap-2">
          {filteredSkills.map(skill => {
            const isUnlocked = saveData.unlockedSkills.includes(skill.id);
            const isEquipped = equipped.includes(skill.id);
            const canAfford = saveData.totalCoins >= skill.unlockCost;
            const isAdUnlock = skill.unlockMethod === 'ad';
            const canBuy = (skill.unlockMethod === 'purchase' || skill.unlockMethod === 'chest') && !isUnlocked && canAfford;

            // Upgrade info
            const skillLevel = isUnlocked ? (saveData.skillUpgrades[skill.id] ?? 1) : 0;
            const isMaxLevel = skillLevel >= MAX_SKILL_LEVEL;
            const nextLevel = skillLevel + 1;
            const upgradeCost = isUnlocked && !isMaxLevel ? (SKILL_UPGRADE_COSTS[nextLevel - 1] ?? 0) : 0;
            const upgradeNeedsAd = isUnlocked && !isMaxLevel ? (SKILL_UPGRADE_AD[nextLevel - 1] ?? false) : false;
            const canAffordUpgrade = saveData.totalCoins >= upgradeCost;
            const dmgMult = isUnlocked ? SKILL_UPGRADE_DAMAGE[skillLevel - 1] : 1;
            const cdMult = isUnlocked ? SKILL_UPGRADE_COOLDOWN[skillLevel - 1] : 1;
            const isUpgradeEffect = upgradeEffect === skill.id;

            return (
              <div
                key={skill.id}
                className="p-3 rounded-lg flex gap-3"
                style={{
                  backgroundColor: isUnlocked ? `${skill.color}08` : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${isEquipped ? skill.color : isUnlocked ? skill.color + '40' : '#33333330'}`,
                }}
              >
                {/* Skill icon area */}
                <div
                  className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 relative"
                  style={{
                    backgroundColor: `${skill.color}15`,
                    border: `1px solid ${skill.color}40`,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{
                      backgroundColor: skill.color,
                      boxShadow: `0 0 10px ${skill.glowColor}`,
                    }}
                  />
                  {/* Level badge */}
                  {isUnlocked && (
                    <div
                      className="absolute -top-1 -right-1 text-[7px] font-mono font-bold px-1 rounded"
                      style={{
                        backgroundColor: skillLevel >= 4 ? '#ffaa00' : '#333',
                        color: skillLevel >= 4 ? '#000' : '#ccc',
                        border: `1px solid ${skillLevel >= 4 ? '#ffaa00' : '#555'}`,
                      }}
                    >
                      LV{skillLevel}
                    </div>
                  )}
                </div>

                {/* Skill info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm font-mono" style={{ color: isUnlocked ? skill.color : '#555' }}>
                      {skill.name}
                    </span>
                    {isUnlocked && (
                      <span
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${RARITY_COLORS[skill.rarity]}20`,
                          border: `1px solid ${RARITY_COLORS[skill.rarity]}40`,
                          color: RARITY_COLORS[skill.rarity],
                        }}
                      >
                        LV {skillLevel}/{MAX_SKILL_LEVEL}
                      </span>
                    )}
                    <span
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${RARITY_COLORS[skill.rarity]}20`,
                        border: `1px solid ${RARITY_COLORS[skill.rarity]}40`,
                        color: RARITY_COLORS[skill.rarity],
                      }}
                    >
                      {skill.rarity.toUpperCase()}
                    </span>
                    <span
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${ELEMENT_COLORS[skill.element]}15`,
                        border: `1px solid ${ELEMENT_COLORS[skill.element]}30`,
                        color: ELEMENT_COLORS[skill.element],
                      }}
                    >
                      {ELEMENT_NAMES[skill.element]}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: isUnlocked ? '#888' : '#444' }}>
                    {skill.description}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[9px] font-mono" style={{ color: '#666' }}>
                    <span>DMG: <span style={{ color: skill.color }}>{isUnlocked ? Math.round(skill.damage * dmgMult) : skill.damage}</span>{isUnlocked && dmgMult > 1 && <span style={{ color: '#ffaa00' }}> (×{dmgMult})</span>}</span>
                    <span>CD: <span style={{ color: '#aaa' }}>{(skill.cooldown * cdMult / 60).toFixed(1)}s</span>{isUnlocked && cdMult < 1 && <span style={{ color: '#00ff66' }}> (×{cdMult})</span>}</span>
                    <span>Type: <span style={{ color: '#aaa' }}>{skill.effectType.toUpperCase()}</span></span>
                  </div>

                  {/* Upgrade bar for unlocked skills */}
                  {isUnlocked && !isMaxLevel && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: MAX_SKILL_LEVEL }).map((_, i) => (
                          <div
                            key={i}
                            className="w-5 h-1.5 rounded-sm"
                            style={{
                              backgroundColor: i < skillLevel ? skill.color : '#222',
                              border: `1px solid ${i < skillLevel ? skill.color : '#444'}`,
                            }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleUpgrade(skill.id)}
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: isUpgradeEffect ? `${skill.color}40` : upgradeNeedsAd && !canAffordUpgrade ? 'rgba(0,255,255,0.1)' : canAffordUpgrade ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${isUpgradeEffect ? skill.color : upgradeNeedsAd && !canAffordUpgrade ? CYAN : canAffordUpgrade ? '#ffd700' : '#333'}`,
                          color: isUpgradeEffect ? '#fff' : upgradeNeedsAd && !canAffordUpgrade ? CYAN : canAffordUpgrade ? '#ffd700' : '#555',
                          transition: 'all 0.3s',
                          transform: isUpgradeEffect ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {isUpgradeEffect ? '✨ UPGRADED!' : upgradeNeedsAd && !canAffordUpgrade ? '🎬 WATCH AD' : `${upgradeCost} 🪙`}
                      </button>
                    </div>
                  )}
                  {isUnlocked && isMaxLevel && (
                    <div className="mt-1.5 text-[9px] font-mono font-bold" style={{ color: '#ffaa00', textShadow: '0 0 5px #ffaa00' }}>
                      ✨ MAX LEVEL — DMG ×{SKILL_UPGRADE_DAMAGE[MAX_SKILL_LEVEL - 1]} | CD ×{SKILL_UPGRADE_COOLDOWN[MAX_SKILL_LEVEL - 1]}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                  {isUnlocked ? (
                    isEquipped ? (
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-1 rounded"
                        style={{ color: LIME, backgroundColor: 'rgba(0,255,102,0.1)', border: '1px solid rgba(0,255,102,0.3)' }}
                      >
                        EQUIPPED
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        {[0, 1, 2].map(slot => (
                          <button
                            key={slot}
                            onClick={() => handleClick(() => equipSkill(skill.id, slot))}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${skill.color}20`,
                              border: `1px solid ${skill.color}50`,
                              color: skill.color,
                            }}
                          >
                            {['SHIFT', 'E', 'F'][slot]}
                          </button>
                        ))}
                      </div>
                    )
                  ) : isAdUnlock ? (
                    <button
                      onClick={() => canAfford ? handleClick(() => { buySkill(skill.id); soundEngine.playCoinCollect(); }) : handleWatchAd(() => handleClick(() => { buySkill(skill.id); soundEngine.playCoinCollect(); }))}
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded"
                      style={{
                        backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,255,0.1)',
                        border: `1px solid ${canAfford ? '#ffd700' : CYAN}`,
                        color: canAfford ? '#ffd700' : CYAN,
                      }}
                    >
                      {canAfford ? `${skill.unlockCost} 🪙` : '🎬 WATCH AD'}
                    </button>
                  ) : skill.unlockMethod === 'purchase' || skill.unlockMethod === 'chest' ? (
                    <button
                      onClick={() => canBuy && handleClick(() => { buySkill(skill.id); soundEngine.playCoinCollect(); })}
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded"
                      style={{
                        backgroundColor: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${canAfford ? '#ffd700' : '#333'}`,
                        color: canAfford ? '#ffd700' : '#555',
                      }}
                    >
                      {skill.unlockCost} 🪙
                    </button>
                  ) : (
                    <span className="text-[9px] font-mono" style={{ color: '#555' }}>
                      {getUnlockText(skill)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <div className="w-full max-w-2xl px-4 pb-4">
        <button
          onClick={() => handleClick(() => {
            const currentLevel = useGameStore.getState().currentLevel;
            if (currentLevel > 0) {
              setGamePhase('level-map');
            } else {
              setGamePhase('menu');
            }
          })}
          className="neon-btn w-full py-2 px-4 text-sm tracking-wider"
          style={{ borderColor: '#666', color: '#888' }}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
