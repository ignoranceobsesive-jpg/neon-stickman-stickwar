'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { DAILY_REWARDS, GOLD, CYAN, LIME, MAGENTA } from '@/lib/game-types';
import { addCoins, writeSave } from '@/lib/save-manager';
import { soundEngine } from '@/lib/sound-engine';

// Simulated ad watch overlay for 2x daily reward
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
          {progress < 100 ? 'Please wait...' : '✅ 2x Reward unlocked!'}
        </div>
      </div>
    </div>
  );
}

export default function DailyRewardPopup() {
  const saveData = useGameStore(s => s.saveData);
  const claimDailyReward = useGameStore(s => s.claimDailyReward);
  const [claimed, setClaimed] = useState(false);
  const [claimedCoins, setClaimedCoins] = useState(0);
  const [claimedDay, setClaimedDay] = useState(0);
  const [doubled, setDoubled] = useState(false);
  const [animateClaim, setAnimateClaim] = useState(false);
  const [showAd, setShowAd] = useState(false);

  const streak = saveData.dailyRewardStreak || 0;
  const currentDay = claimedDay || Math.min(streak, 7);

  const handleClaim = useCallback(() => {
    soundEngine.init();
    soundEngine.playCoinCollect();
    const result = claimDailyReward();
    if (result) {
      setClaimed(true);
      setClaimedCoins(result.coins);
      setClaimedDay(result.day);
      setAnimateClaim(true);
      setTimeout(() => setAnimateClaim(false), 1000);
    }
  }, [claimDailyReward]);

  const handleWatchAd2x = useCallback(() => {
    setShowAd(true);
  }, []);

  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    // Double the coins
    const store = useGameStore.getState();
    const bonusCoins = claimedCoins;
    const newSave = addCoins(store.saveData, bonusCoins);
    useGameStore.setState({ saveData: newSave });
    writeSave(newSave);
    setDoubled(true);
    soundEngine.playCoinCollect();
  }, [claimedCoins]);

  const handleDismiss = useCallback(() => {
    soundEngine.init();
    soundEngine.playMenuClick();
    window.dispatchEvent(new Event('daily-reward-dismissed'));
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      {showAd && <AdOverlay onComplete={handleAdComplete} />}

      <div
        className="text-center p-6 rounded-xl max-w-sm w-full mx-4"
        style={{
          backgroundColor: '#0a0a20',
          border: '2px solid #ffd70060',
          boxShadow: '0 0 40px rgba(255,215,0,0.2), inset 0 0 40px rgba(255,215,0,0.05)',
        }}
      >
        {/* Title */}
        <h2
          className="text-2xl font-bold font-mono tracking-wider mb-1"
          style={{ color: GOLD, textShadow: '0 0 15px #ffd700' }}
        >
          📅 DAILY REWARD
        </h2>
        <p className="text-xs font-mono mb-4" style={{ color: '#888' }}>
          Login every day for bigger rewards!
        </p>

        {/* Weekly Calendar */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {DAILY_REWARDS.map((reward, i) => {
            const dayNum = i + 1;
            const isToday = dayNum === (claimed ? currentDay : Math.min(streak + 1, 7));
            const isPast = dayNum <= streak || (claimed && dayNum < currentDay);
            const isClaimed = claimed && dayNum === currentDay;

            return (
              <div
                key={dayNum}
                className="flex flex-col items-center p-1.5 rounded"
                style={{
                  backgroundColor: isClaimed ? 'rgba(255,215,0,0.15)' : isToday ? 'rgba(0,255,255,0.1)' : isPast ? 'rgba(0,255,102,0.08)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${isClaimed ? '#ffd700' : isToday ? CYAN : isPast ? '#00ff6640' : '#33333330'}`,
                }}
              >
                <div className="text-[7px] font-mono font-bold" style={{ color: isClaimed ? GOLD : isToday ? CYAN : isPast ? LIME : '#444' }}>
                  D{dayNum}
                </div>
                <div className="text-[9px] font-mono font-bold" style={{ color: isClaimed ? GOLD : isPast ? '#888' : '#555' }}>
                  {isClaimed ? '✓' : `${reward.coins}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's Reward */}
        {!claimed && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,215,0,0.08)', border: '1px solid #ffd70030' }}>
            <div className="text-xs font-mono mb-1" style={{ color: '#888' }}>TODAY&apos;S REWARD</div>
            <div
              className="text-3xl font-bold font-mono"
              style={{ color: GOLD, textShadow: '0 0 15px #ffd700' }}
            >
              🪙 {DAILY_REWARDS[Math.min(streak, 6)]?.coins || 50}
            </div>
          </div>
        )}

        {/* Claimed Animation */}
        {claimed && animateClaim && (
          <div
            className="mb-4 p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(0,255,102,0.1)',
              border: '1px solid rgba(0,255,102,0.3)',
              animation: 'neon-pulse 0.5s ease-out',
            }}
          >
            <div className="text-xl font-bold font-mono" style={{ color: LIME, textShadow: '0 0 15px #00ff66' }}>
              +{claimedCoins} 🪙
            </div>
            {doubled && (
              <div className="text-lg font-bold font-mono mt-1" style={{ color: MAGENTA, textShadow: '0 0 10px #ff00ff' }}>
                +{claimedCoins} BONUS! 🎬
              </div>
            )}
          </div>
        )}

        {/* Claimed static */}
        {claimed && !animateClaim && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(0,255,102,0.1)', border: '1px solid rgba(0,255,102,0.3)' }}>
            <div className="text-xl font-bold font-mono" style={{ color: LIME, textShadow: '0 0 15px #00ff66' }}>
              +{claimedCoins} 🪙 CLAIMED!
            </div>
            {doubled && (
              <div className="text-lg font-bold font-mono mt-1" style={{ color: MAGENTA, textShadow: '0 0 10px #ff00ff' }}>
                +{claimedCoins} BONUS! 🎬
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          {!claimed && (
            <button
              onClick={handleClaim}
              className="neon-btn w-full py-3 px-4 text-lg font-bold font-mono tracking-wider"
              style={{
                borderColor: GOLD,
                color: GOLD,
                textShadow: '0 0 10px #ffd700',
                boxShadow: '0 0 20px rgba(255,215,0,0.3)',
                animation: 'neon-pulse 2s ease-in-out infinite',
              }}
              onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
            >
              🪙 CLAIM
            </button>
          )}

          {claimed && !doubled && (
            <button
              onClick={handleWatchAd2x}
              className="neon-btn w-full py-2 px-4 text-sm font-bold font-mono tracking-wider"
              style={{
                borderColor: CYAN,
                color: CYAN,
                textShadow: '0 0 8px #00ffff',
              }}
              onMouseEnter={() => { soundEngine.init(); soundEngine.playMenuHover(); }}
            >
              🎬 WATCH AD FOR 2X
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="text-xs font-mono px-4 py-1.5 rounded"
            style={{ color: '#666', border: '1px solid #333' }}
          >
            {claimed ? 'CLOSE' : 'SKIP'}
          </button>
        </div>

        {/* Streak info */}
        <div className="mt-3 text-[9px] font-mono" style={{ color: '#555' }}>
          Streak: {claimed ? currentDay : streak} / 7 days
        </div>
      </div>

      <style jsx global>{`
        @keyframes neon-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
