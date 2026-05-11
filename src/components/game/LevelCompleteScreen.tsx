'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { LEVELS, TOTAL_LEVELS, generateProceduralLevel, SKILL_DEFS } from '@/lib/game-types';
import { AdManager } from '@/lib/ad-manager';
import { soundEngine } from '@/lib/sound-engine';

function Star({ filled, delay }: { filled: boolean; delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span
      className="inline-block text-2xl sm:text-4xl transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
        color: filled ? '#ffd700' : '#333333',
        textShadow: filled
          ? '0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 40px #ff8c00'
          : 'none',
        filter: filled ? 'drop-shadow(0 0 6px #ffd700)' : 'none',
        animation: filled && visible ? 'star-pulse 1.5s ease-in-out infinite' : 'none',
      }}
    >
      ★
    </span>
  );
}

export default function LevelCompleteScreen() {
  const currentLevel = useGameStore(s => s.currentLevel);
  const score = useGameStore(s => s.score);
  const totalScore = useGameStore(s => s.totalScore);
  const saveData = useGameStore(s => s.saveData);
  const nextLevel = useGameStore(s => s.nextLevel);
  const retryLevel = useGameStore(s => s.retryLevel);
  const backToMenu = useGameStore(s => s.backToMenu);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const lastLevelStars = useGameStore(s => s.lastLevelStars);
  const lastLevelKills = useGameStore(s => s.lastLevelKills);
  const lastLevelMaxCombo = useGameStore(s => s.lastLevelMaxCombo);
  const lastLevelCoinsEarned = useGameStore(s => s.lastLevelCoinsEarned);
  const lastLevelHealthPct = useGameStore(s => s.lastLevelHealthPct);
  const lastLevelTotalEnemies = useGameStore(s => s.lastLevelTotalEnemies);

  // Find skills that just unlocked at this level
  const newlyUnlockedSkills = SKILL_DEFS.filter(
    skill => skill.unlockMethod === 'level' && skill.unlockLevel === currentLevel
  );

  const [showInterstitial, setShowInterstitial] = useState(() => {
    // Check if interstitial ad should show (every 3 levels) - use lazy initializer
    const shouldShow = AdManager.getInstance().onLevelComplete();
    if (shouldShow) {
      soundEngine.init();
    }
    return shouldShow;
  });
  const [interstitialProgress, setInterstitialProgress] = useState(0);
  const [interstitialSkippable, setInterstitialSkippable] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [watchingBonusAd, setWatchingBonusAd] = useState(false);
  const [bonusAdProgress, setBonusAdProgress] = useState(0);

  const level = currentLevel <= LEVELS.length
    ? LEVELS.find(l => l.id === currentLevel)
    : generateProceduralLevel(currentLevel);
  const isLastLevel = currentLevel >= TOTAL_LEVELS;
  const coinsEarned = lastLevelCoinsEarned || Math.floor(score / 5);

  // Interstitial ad using enhanced AdManager
  useEffect(() => {
    if (!showInterstitial) return;

    const adManager = AdManager.getInstance();
    let cancelled = false;

    adManager.showInterstitialAd((progress) => {
      if (cancelled) return;
      setInterstitialProgress(progress);
      if (progress >= 20) {
        setInterstitialSkippable(true);
      }
    }).then(() => {
      if (!cancelled) {
        setShowInterstitial(false);
        soundEngine.init();
        soundEngine.playCoinCollect();
      }
    });

    return () => { cancelled = true; };
  }, [showInterstitial]);

  // Watch bonus ad (rewarded ad for 2x coins)
  const handleWatchBonusAd = useCallback(() => {
    if (bonusClaimed || watchingBonusAd) return;
    setWatchingBonusAd(true);
    setBonusAdProgress(0);
    soundEngine.init();

    const adManager = AdManager.getInstance();
    adManager.showRewardedAdWithCallbacks(
      // onReward — earned 2x coins
      () => {
        setWatchingBonusAd(false);
        setBonusClaimed(true);
        soundEngine.playCoinCollect();
      },
      // onSkipped — ad was not completed
      (reason) => {
        setWatchingBonusAd(false);
        console.log('Bonus ad skipped:', reason);
      },
      // onProgress
      (progress) => {
        setBonusAdProgress(progress);
      },
    );
  }, [bonusClaimed, watchingBonusAd]);

  const handleSkipInterstitial = () => {
    setShowInterstitial(false);
    soundEngine.init();
    soundEngine.playCoinCollect();
  };

  const handleClaimBonus = () => {
    if (bonusClaimed) return;
    setBonusClaimed(true);
    const store = useGameStore.getState();
    store.addCoinsFromScore(score);
    soundEngine.init();
    soundEngine.playCoinCollect();
  };

  const handleRetry = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    retryLevel();
  };

  const handleNextLevel = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    nextLevel();
  };

  const handleLevelMap = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    setGamePhase('level-map');
  };

  const handleMainMenu = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    backToMenu();
  };

  const interstitialRemaining = Math.max(0, Math.ceil((100 - interstitialProgress) / 20));

  // Show interstitial ad overlay (every 3 levels)
  if (showInterstitial) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <div className="text-center px-4">
          <div className="text-base sm:text-lg font-mono font-bold mb-3" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
            🎬 ADVERTISEMENT
          </div>
          <div className="w-64 sm:w-72 h-32 sm:h-40 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#111', border: '1px solid #333' }}>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono mb-1" style={{ color: '#00ffff', textShadow: '0 0 10px #00ffff' }}>
                NEON STICKMAN
              </div>
              <div className="text-[10px] sm:text-xs font-mono" style={{ color: '#888' }}>
                Stick War — Coming Soon
              </div>
            </div>
          </div>
          <div className="w-64 sm:w-72 h-2 rounded-full overflow-hidden mx-auto mb-2" style={{ backgroundColor: '#222' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${interstitialProgress}%`,
                backgroundColor: '#ffd700',
                boxShadow: '0 0 8px #ffd700',
              }}
            />
          </div>
          {interstitialSkippable ? (
            <button
              onClick={handleSkipInterstitial}
              className="text-xs font-mono px-4 py-1.5 rounded min-h-[44px]"
              style={{ color: '#888', border: '1px solid #444' }}
            >
              SKIP AD ▶
            </button>
          ) : (
            <div className="text-xs font-mono" style={{ color: '#555' }}>
              Ad playing... {interstitialRemaining}s
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show bonus ad overlay
  if (watchingBonusAd) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <div className="text-center px-4">
          <div className="text-base sm:text-lg font-mono font-bold mb-3" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
            🎬 WATCHING AD FOR 2X COINS
          </div>
          <div className="w-64 sm:w-72 h-32 sm:h-40 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#111', border: '1px solid #333' }}>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono mb-1" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
                2X BONUS
              </div>
              <div className="text-[10px] sm:text-xs font-mono" style={{ color: '#888' }}>
                Double your coins!
              </div>
            </div>
          </div>
          <div className="w-64 sm:w-72 h-3 rounded-full mx-auto mb-3" style={{ backgroundColor: '#222', border: '1px solid #444' }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{ width: `${bonusAdProgress}%`, backgroundColor: '#00ffff', boxShadow: '0 0 10px #00ffff' }}
            />
          </div>
          <div className="text-sm font-mono" style={{ color: '#888' }}>
            {bonusAdProgress < 100 ? 'Please wait...' : '✅ 2x Bonus unlocked!'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-20 overflow-y-auto"
      style={{
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        maxHeight: '100dvh',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        className="text-center pointer-events-auto px-3 max-w-md w-full mx-auto flex flex-col items-center"
        style={{ minHeight: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 2.5rem)' }}
      >
        <div className="my-auto w-full py-6">
        {/* Title */}
        <h1
          className="text-2xl sm:text-4xl font-bold tracking-wider mb-1 sm:mb-2"
          style={{
            color: '#00ff66',
            textShadow: '0 0 20px #00ff66, 0 0 40px #00ff66, 0 0 80px #00ff66',
            animation: 'neon-pulse 2s ease-in-out infinite',
          }}
        >
          ZONE CLEARED
        </h1>
        <p className="font-mono text-xs sm:text-sm mb-2" style={{ color: '#00ffff', textShadow: '0 0 5px #00ffff' }}>
          {level?.chapter} — {level?.name}
        </p>

        {/* Star Rating */}
        <div className="flex justify-center gap-1 sm:gap-2 mb-2">
          <Star filled={lastLevelStars >= 1} delay={300} />
          <Star filled={lastLevelStars >= 2} delay={600} />
          <Star filled={lastLevelStars >= 3} delay={900} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-0.5 sm:gap-y-1 mb-2 mx-auto max-w-xs">
          <div className="text-right font-mono text-xs sm:text-sm" style={{ color: '#ff6600', textShadow: '0 0 5px #ff6600' }}>
            Kills: {lastLevelKills}/{lastLevelTotalEnemies}
          </div>
          <div className="text-left font-mono text-xs sm:text-sm" style={{ color: '#00ff66', textShadow: '0 0 5px #00ff66' }}>
            Health: {lastLevelHealthPct}%
          </div>
          <div className="text-right font-mono text-xs sm:text-sm" style={{ color: '#ffff00', textShadow: '0 0 5px #ffff00' }}>
            Combo: {lastLevelMaxCombo}x
          </div>
          <div className="text-left font-mono text-xs sm:text-sm" style={{ color: '#ffd700', textShadow: '0 0 5px #ffd700' }}>
            Coins: +{coinsEarned}
          </div>
        </div>

        {/* Score */}
        <p className="font-mono text-base sm:text-lg mb-0.5" style={{ color: '#ff6600', textShadow: '0 0 10px #ff6600' }}>
          Score: {score}
        </p>

        {/* Coins earned */}
        <p className="font-mono text-xs sm:text-sm mb-0.5" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
          +{coinsEarned} COINS
          {bonusClaimed && <span style={{ color: '#ff6600' }}> +{coinsEarned} BONUS!</span>}
        </p>

        <p className="font-mono text-[10px] sm:text-xs mb-2" style={{ color: '#aa00ff', textShadow: '0 0 5px #aa00ff' }}>
          Total: {totalScore} | Coins: {saveData.totalCoins + (bonusClaimed ? coinsEarned : 0)}
        </p>

        {/* Watch ad for 2x coins bonus — optional, not forced */}
        {!bonusClaimed && !isLastLevel && (
          <button
            onClick={handleWatchBonusAd}
            className="neon-btn w-56 sm:w-64 py-2.5 px-3 text-xs sm:text-sm font-bold font-mono tracking-wider mb-2 min-h-[44px]"
            style={{
              borderColor: '#ffd700',
              color: '#ffd700',
              textShadow: '0 0 8px #ffd700, 0 0 16px #ffd700',
              background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,102,0,0.08))',
              boxShadow: '0 0 12px rgba(255,215,0,0.2)',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            🎬 WATCH AD FOR 2X COINS
          </button>
        )}

        {bonusClaimed && (
          <div className="font-mono text-xs sm:text-sm mb-2" style={{ color: '#00ff66' }}>
            BONUS CLAIMED!
          </div>
        )}

        {/* Skill Unlock Notification */}
        {newlyUnlockedSkills.length > 0 && (
          <div className="mb-2 p-2 sm:p-3 rounded-lg mx-auto max-w-sm" style={{ backgroundColor: 'rgba(255,102,0,0.1)', border: '1px solid rgba(255,102,0,0.4)' }}>
            <div className="text-[10px] sm:text-xs font-mono font-bold mb-1" style={{ color: '#ff6600', textShadow: '0 0 8px #ff6600' }}>
              NEW SKILL UNLOCKED!
            </div>
            {newlyUnlockedSkills.map(skill => (
              <div key={skill.id} className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: skill.color, boxShadow: `0 0 8px ${skill.glowColor}` }}
                />
                <div className="text-left">
                  <span className="font-mono text-[10px] sm:text-xs font-bold" style={{ color: skill.color }}>{skill.name}</span>
                  <span className="font-mono text-[8px] sm:text-[9px] ml-1" style={{ color: '#888' }}>{skill.element.toUpperCase()}</span>
                  <p className="font-mono text-[7px] sm:text-[8px]" style={{ color: '#666' }}>{skill.description}</p>
                </div>
              </div>
            ))}
            <div className="font-mono text-[8px] sm:text-[9px] mt-1" style={{ color: '#aaa' }}>
              Go to SKILLS to equip!
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 sm:gap-2 items-center">
          {/* PLAY NEXT - Primary, biggest button with next symbol */}
          {!isLastLevel && (
            <button
              onClick={handleNextLevel}
              className="neon-btn w-56 sm:w-64 py-3 px-4 text-lg sm:text-2xl font-bold font-mono tracking-wider min-h-[44px]"
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
          )}

          {/* RETRY - Prominent */}
          <button
            onClick={handleRetry}
            className="neon-btn w-40 sm:w-48 py-2.5 px-3 text-sm sm:text-base font-bold font-mono tracking-wider min-h-[44px]"
            style={{
              borderColor: '#ff6600',
              color: '#ff6600',
              textShadow: '0 0 8px #ff6600',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            ↻ RETRY
          </button>

          {/* LEVEL MAP */}
          <button
            onClick={handleLevelMap}
            className="neon-btn w-40 sm:w-48 py-2.5 px-3 text-sm sm:text-base font-bold font-mono tracking-wider min-h-[44px]"
            style={{
              borderColor: '#00ffff',
              color: '#00ffff',
              textShadow: '0 0 8px #00ffff',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            LEVEL MAP
          </button>

          {/* SKILLS - Show only when skills are available to equip */}
          {saveData.unlockedSkills.length > 0 && (
            <button
              onClick={() => { soundEngine.init(); soundEngine.playMenuClick(); setGamePhase('skill-shop'); }}
              className="neon-btn w-40 sm:w-48 py-2.5 px-3 text-sm sm:text-base font-bold font-mono tracking-wider min-h-[44px]"
              style={{
                borderColor: '#ff6600',
                color: '#ff6600',
                textShadow: '0 0 8px #ff6600',
              }}
              onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
            >
              SKILLS
            </button>
          )}

          {/* MAIN MENU - Smaller/secondary */}
          <button
            onClick={handleMainMenu}
            className="neon-btn w-32 sm:w-40 py-2 px-3 text-xs sm:text-sm font-bold font-mono tracking-wider mt-0.5 min-h-[44px]"
            style={{ borderColor: '#666', color: '#888' }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            MAIN MENU
          </button>
        </div>
        </div>{/* end my-auto wrapper */}
      </div>

      {/* Star pulse animation keyframes */}
      <style jsx global>{`
        @keyframes star-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
