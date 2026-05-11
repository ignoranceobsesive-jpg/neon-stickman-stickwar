'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '@/stores/game-store';
import { canClaimDailyReward } from '@/lib/save-manager';
import { onAuthChange, autoSignIn, handleRedirectResult } from '@/lib/firebase-auth';
import { downloadSaveFromCloud } from '@/lib/firebase-firestore';
import MainMenu from '@/components/game/MainMenu';
import GameScreen from '@/components/game/GameScreen';
import GameOverScreen from '@/components/game/GameOverScreen';
import LevelCompleteScreen from '@/components/game/LevelCompleteScreen';
import VictoryScreen from '@/components/game/VictoryScreen';
import CutscenePlayer from '@/components/game/CutscenePlayer';
import SkinShop from '@/components/game/SkinShop';
import SkillShop from '@/components/game/SkillShop';
import SettingsPanel from '@/components/game/SettingsPanel';
import OnlineArena from '@/components/game/OnlineArena';
import SplashScreen from '@/components/game/SplashScreen';
import ProfilePanel from '@/components/game/ProfilePanel';
import LeaderboardPanel from '@/components/game/LeaderboardPanel';
import LevelMap from '@/components/game/LevelMap';
import LandscapeOverlay from '@/components/game/LandscapeOverlay';
import DailyRewardPopup from '@/components/game/DailyRewardPopup';
import WeaponUpgradePanel from '@/components/game/WeaponUpgradePanel';

export default function Home() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const saveData = useGameStore(s => s.saveData);
  // Check if returning player on first render — skip splash if they've played before
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('neon-stickwar-save');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.highestLevel > 0) return true;
        }
      } catch {}
    }
    return false;
  });
  const [dailyDismissedDay, setDailyDismissedDay] = useState('');

  // Derive whether daily reward popup should show
  const showDailyReward = useMemo(() => {
    return gamePhase === 'menu'
      && canClaimDailyReward(saveData)
      && saveData.lastDailyRewardDay !== dailyDismissedDay;
  }, [gamePhase, saveData, dailyDismissedDay]);

  // Listen for daily reward dismissal
  useEffect(() => {
    const handleDismiss = () => {
      setDailyDismissedDay(saveData.lastDailyRewardDay);
    };
    window.addEventListener('daily-reward-dismissed', handleDismiss);
    return () => window.removeEventListener('daily-reward-dismissed', handleDismiss);
  }, [saveData.lastDailyRewardDay]);

  // If returning player (splashDone initialized as true), go straight to menu
  useEffect(() => {
    if (splashDone && gamePhase === 'splash') {
      setGamePhase('menu');
    }
  }, [splashDone, gamePhase, setGamePhase]);

  // Splash screen auto-advance after 10 seconds (fallback — tap is primary)
  // Animation shows "TAP TO START" at 4.5s, so give user time to tap
  useEffect(() => {
    if (!splashDone) {
      const timer = setTimeout(() => {
        setSplashDone(true);
        setGamePhase('menu');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [splashDone, setGamePhase]);

  // Enable cloud sync when user is authenticated + auto anonymous sign-in + handle redirect
  const setCloudSync = useGameStore(s => s.setCloudSync);
  const loadCloudSave = useGameStore(s => s.loadCloudSave);
  useEffect(() => {
    // Handle redirect result (for mobile Google sign-in)
    handleRedirectResult();
    // Auto sign in anonymously so cloud sync works immediately
    autoSignIn();
    let cloudFetchDone = false;
    const unsub = onAuthChange(async (state) => {
      setCloudSync(!!state.user);
      // On first successful auth, automatically fetch cloud save and merge with local
      if (state.user && !cloudFetchDone) {
        cloudFetchDone = true;
        try {
          const cloudData = await downloadSaveFromCloud();
          if (cloudData) {
            loadCloudSave(cloudData);
          }
        } catch {
          // Cloud fetch failure is non-critical — local save is primary
        }
      }
    });
    return unsub;
  }, [setCloudSync, loadCloudSave]);

  // Listen for splash end click
  useEffect(() => {
    const handleSplashEnd = () => {
      if (!splashDone) {
        setSplashDone(true);
        setGamePhase('menu');
      }
    };
    window.addEventListener('splash-end', handleSplashEnd);
    return () => window.removeEventListener('splash-end', handleSplashEnd);
  }, [splashDone, setGamePhase]);

  // Start with splash if not already in another phase
  if (!splashDone && gamePhase === 'splash') {
    return (
      <main className="fixed inset-0 w-screen h-[100dvh] bg-[#050510] overflow-hidden">
        <SplashScreen />
      </main>
    );
  }

  return (
    <main className="fixed inset-0 w-screen h-[100dvh] bg-[#050510] overflow-hidden">
      {/* Landscape hint only shows in portrait on mobile — does NOT block gameplay */}
      {/* Removed forced landscape overlay for better mobile portrait support */}
      {/* Daily Reward Popup */}
      {showDailyReward && (
        <DailyRewardPopup />
      )}
      {gamePhase === 'menu' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <MainMenu />
        </div>
      )}
      {gamePhase === 'playing' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
        </div>
      )}
      {gamePhase === 'cutscene' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <CutscenePlayer />
        </div>
      )}
      {gamePhase === 'game-over' && (
        <div className="relative w-full h-[100dvh]">
          <GameScreen />
          <GameOverScreen />
        </div>
      )}
      {gamePhase === 'level-complete' && (
        <div className="relative w-full h-[100dvh]">
          <GameScreen />
          <LevelCompleteScreen />
        </div>
      )}
      {gamePhase === 'victory' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <VictoryScreen />
        </div>
      )}
      {gamePhase === 'skin-shop' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <SkinShop />
        </div>
      )}
      {gamePhase === 'skill-shop' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <SkillShop />
        </div>
      )}
      {gamePhase === 'settings' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <SettingsPanel />
        </div>
      )}
      {gamePhase === 'profile' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <ProfilePanel />
        </div>
      )}
      {gamePhase === 'leaderboard' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <LeaderboardPanel />
        </div>
      )}
      {gamePhase === 'level-map' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <LevelMap />
        </div>
      )}
      {gamePhase === 'weapon-shop' && (
        <div className="relative w-full h-[100dvh] overflow-hidden">
          <GameScreen />
          <WeaponUpgradePanel />
        </div>
      )}
      {gamePhase === 'online-arena' && <OnlineArena />}
      {gamePhase === 'online-lobby' && <OnlineArena />}
    </main>
  );
}
