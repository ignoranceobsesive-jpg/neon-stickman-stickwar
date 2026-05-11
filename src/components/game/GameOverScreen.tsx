'use client';

import React, { useState, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { soundEngine } from '@/lib/sound-engine';
import { AdManager } from '@/lib/ad-manager';

export default function GameOverScreen() {
  const score = useGameStore(s => s.score);
  const currentLevel = useGameStore(s => s.currentLevel);
  const lastLevelKills = useGameStore(s => s.lastLevelKills);
  const lastLevelMaxCombo = useGameStore(s => s.lastLevelMaxCombo);
  const lastLevelCoinsEarned = useGameStore(s => s.lastLevelCoinsEarned);
  const retryLevel = useGameStore(s => s.retryLevel);
  const backToMenu = useGameStore(s => s.backToMenu);
  const revive = useGameStore(s => s.revive);
  const canRevive = useGameStore(s => s.canRevive);
  const [watchingAd, setWatchingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0);

  const handleWatchAd = useCallback(() => {
    if (watchingAd) return;
    setWatchingAd(true);
    setAdProgress(0);
    soundEngine.init();
    soundEngine.playMenuClick();

    const adManager = AdManager.getInstance();
    adManager.showRewardedAdWithCallbacks(
      // onReward — user watched the full ad
      () => {
        setWatchingAd(false);
        revive();
        soundEngine.playAbilityReady();
      },
      // onSkipped — ad was not completed
      (reason) => {
        setWatchingAd(false);
        console.log('Rewarded ad skipped:', reason);
      },
      // onProgress — update the progress bar
      (progress) => {
        setAdProgress(progress);
      },
    );
  }, [watchingAd, revive]);

  const remainingSeconds = Math.max(0, Math.ceil((100 - adProgress) / 20));

  if (watchingAd) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <div className="text-center px-4">
          <div className="text-base sm:text-lg font-mono font-bold mb-3" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
            🎬 WATCH AD TO REVIVE
          </div>
          <div className="w-64 sm:w-72 h-32 sm:h-40 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#111', border: '1px solid #333' }}>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono mb-1" style={{ color: '#ff3333', textShadow: '0 0 10px #ff3333' }}>
                REVIVE
              </div>
              <div className="text-[10px] sm:text-xs font-mono" style={{ color: '#888' }}>
                Continue with FULL HP
              </div>
            </div>
          </div>
          <div className="w-64 sm:w-72 h-3 rounded-full overflow-hidden mx-auto mb-2" style={{ backgroundColor: '#222' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${adProgress}%`,
                backgroundColor: '#ffd700',
                boxShadow: '0 0 8px #ffd700',
              }}
            />
          </div>
          <div className="text-xs font-mono" style={{ color: '#555' }}>
            Ad playing... {remainingSeconds}s remaining
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
        <h1
          className="text-3xl sm:text-5xl font-bold tracking-wider mb-2 sm:mb-4"
          style={{
            color: '#ff3333',
            textShadow: '0 0 20px #ff3333, 0 0 40px #ff3333, 0 0 80px #ff0000',
            animation: 'neon-pulse 2s ease-in-out infinite',
          }}
        >
          SYSTEM FAILURE
        </h1>
        <p className="font-mono text-xs sm:text-sm mb-1 sm:mb-2" style={{ color: '#00ffff', textShadow: '0 0 5px #00ffff' }}>
          &quot;That... was a glitch. But I&apos;m not done.&quot;
        </p>
        <p className="font-mono text-xs sm:text-sm mb-2 sm:mb-3" style={{ color: '#00ffff', textShadow: '0 0 8px #00ffff' }}>
          LEVEL {currentLevel}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-0.5 sm:gap-y-1 mb-2 sm:mb-3 mx-auto max-w-xs">
          <div className="text-right font-mono text-xs sm:text-sm" style={{ color: '#ff6600', textShadow: '0 0 5px #ff6600' }}>
            Kills: {lastLevelKills}
          </div>
          <div className="text-left font-mono text-xs sm:text-sm" style={{ color: '#ff00ff', textShadow: '0 0 5px #ff00ff' }}>
            Max Combo: {lastLevelMaxCombo}x
          </div>
          <div className="text-right font-mono text-xs sm:text-sm" style={{ color: '#ffd700', textShadow: '0 0 5px #ffd700' }}>
            Coins: +{lastLevelCoinsEarned}
          </div>
          <div className="text-left font-mono text-xs sm:text-sm" style={{ color: '#00ff66', textShadow: '0 0 5px #00ff66' }}>
            Score: {score}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 items-center">
          {/* REVIVE — continue exactly where you died */}
          {canRevive && (
            <>
              <button
                onClick={handleWatchAd}
                className="neon-btn w-60 sm:w-72 py-3 px-4 text-base sm:text-lg font-bold font-mono tracking-wider min-h-[44px]"
                style={{
                  borderColor: '#ffd700',
                  color: '#ffd700',
                  textShadow: '0 0 10px #ffd700, 0 0 20px #ffd700',
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,100,0,0.1))',
                  boxShadow: '0 0 20px rgba(255,215,0,0.3)',
                  animation: 'neon-pulse 2s ease-in-out infinite',
                }}
              >
                🎬 WATCH AD TO REVIVE
              </button>
              <div className="text-[10px] sm:text-xs font-mono mb-0.5" style={{ color: '#ffd700', textShadow: '0 0 5px #ffd700' }}>
                Continue where you died with FULL HP!
              </div>
            </>
          )}

          {/* RETRY — restart the whole level */}
          <button
            onClick={retryLevel}
            className="neon-btn w-48 sm:w-56 py-3 px-4 text-base sm:text-lg font-bold font-mono tracking-wider min-h-[44px]"
            style={{
              borderColor: '#00ffff',
              color: '#00ffff',
              textShadow: '0 0 10px #00ffff',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            &#8634; RETRY
          </button>

          <button
            onClick={backToMenu}
            className="neon-btn w-36 sm:w-48 py-2.5 px-3 text-xs sm:text-sm font-bold font-mono tracking-wider min-h-[44px]"
            style={{
              borderColor: '#666',
              color: '#888',
            }}
            onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
          >
            MAIN MENU
          </button>
        </div>
        </div>{/* end my-auto wrapper */}
      </div>
    </div>
  );
}
