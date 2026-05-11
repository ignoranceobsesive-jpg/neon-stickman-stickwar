// ====== NEON STICKMAN: STICK WAR — GAME STORE ======
// Pet, procedural levels, skins, save/load, sound, ranking, game modes

import { create } from 'zustand';
import { type GamePhase, type GameMode, type CutsceneData, LEVELS, SKINS, GANG_MEMBERS, CUTSCENES, DEFAULT_RANKING, DEFAULT_SAVE, type RankingData, type PetType, generateProceduralLevel, TOTAL_LEVELS, getCutsceneForLevel, VERSUS_ARENA, SKILL_DEFS, WEAPON_UPGRADES, getWeaponUpgradeCost, type WeaponUpgradeType } from '@/lib/game-types';
import { loadSave, writeSave, purchaseSkin, equipSkin, checkLevelUnlocks, addCoins, resetAllData, purchasePetSkin, equipPetSkin, purchasePet, selectPet as selectPetSave, updateProfile, upgradeSkill as upgradeSkillSave, claimDailyReward as claimDailyRewardSave, canClaimDailyReward, enableCloudSync, type SaveData } from '@/lib/save-manager';
import { type SoundSettings, DEFAULT_SOUND_SETTINGS, soundEngine } from '@/lib/sound-engine';

interface VoiceLineState {
  text: string;
  color: string;
  timer: number;
}

interface DramaticMoment {
  text: string;
  color: string;
  timer: number;
}

interface GameStore {
  gamePhase: GamePhase;
  gameMode: GameMode;
  currentLevel: number;
  score: number;
  totalScore: number;
  currentWave: number;
  totalWaves: number;
  isBossLevel: boolean;
  canRevive: boolean;
  hasUsedRevive: boolean;
  revivedWithFullPower: boolean;
  currentStoryChapter: number;

  // Cutscene
  currentCutscene: CutsceneData | null;
  cutsceneFrameIndex: number;
  cutsceneTextProgress: number;

  // Voice line
  voiceLine: VoiceLineState | null;

  // Dramatic moment
  dramaticMoment: DramaticMoment | null;

  // Intro overlay
  introText: string | null;
  introColor: string;
  introTimer: number;

  // Save data
  saveData: SaveData;

  // Sound settings
  soundSettings: SoundSettings;

  // Level completion stats
  lastLevelStars: number;
  lastLevelKills: number;
  lastLevelMaxCombo: number;
  lastLevelCoinsEarned: number;
  lastLevelHealthPct: number;
  lastLevelTotalEnemies: number;

  // Versus mode state
  versusP1Wins: number;
  versusP2Wins: number;
  versusCurrentRound: number;
  versusTotalRounds: number;
  versusRoundWinner: 0 | 1 | 2 | 3; // 0 = in progress, 3 = draw/tie
  versusMatchWinner: 0 | 1 | 2 | 3; // 0 = in progress, 3 = draw/tie

  // Ability cooldowns (frames remaining, 0 = ready) — updated by GameCanvas each frame
  dashCooldown: number;
  shieldCooldown: number;
  specialCooldown: number;

  // Tap to start — game is paused until player taps
  waitingForTap: boolean;

  // Actions
  setGamePhase: (phase: GamePhase) => void;
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
  startLevel: (levelId: number) => void;
  startVersus: () => void;
  versusRoundWin: (player: 1 | 2 | 3) => void; // 3 = draw/tie
  versusResetRound: () => void;
  versusMatchEnd: (winner: 1 | 2 | 3) => void; // 3 = draw/tie
  showVoiceLine: (text: string, color: string, duration?: number) => void;
  triggerDramaticMoment: (text: string, color: string, duration?: number) => void;
  advanceWave: () => void;
  completeLevel: (score: number) => void;
  gameOver: () => void;
  nextLevel: () => void;
  retryLevel: () => void;
  backToMenu: () => void;
  revive: () => void;

  // Cutscene
  startCutscene: (cutsceneId: string) => void;
  advanceCutscene: () => void;

  // Save
  saveGame: () => void;
  loadGame: () => void;

  // Skins
  buySkin: (skinId: string) => boolean;
  selectSkin: (skinId: string) => void;

  // Pet
  buyPet: (petId: string) => boolean;
  selectPet: (petId: string) => void;
  buyPetSkin: (skinId: string) => boolean;
  selectPetSkin: (skinId: string) => void;

  // Coins
  addCoinsFromScore: (score: number) => void;
  addCoinsReward: (amount: number) => void;

  // Sound
  setSoundSettings: (settings: Partial<SoundSettings>) => void;

  // Profile
  updateProfile: (updates: Partial<Pick<SaveData, 'username' | 'avatar' | 'about' | 'nationality'>>) => void;

  // Ranking
  updateRanking: (won: boolean) => void;

  // Skill system
  buySkill: (skillId: string) => boolean;
  equipSkill: (skillId: string, slot: number) => void;
  unequipSkill: (slot: number) => void;
  upgradeSkill: (skillId: string) => boolean;

  // Daily rewards
  claimDailyReward: () => { coins: number; day: number } | null;
  canClaimDaily: () => boolean;

  // Weapon upgrades
  upgradeWeapon: (type: WeaponUpgradeType) => boolean;
  upgradeWeaponByAd: (type: WeaponUpgradeType) => void;

  // Cooldowns (called by GameCanvas each frame)
  updateCooldowns: (dash: number, shield: number, special: number) => void;

  // Tap to start
  tapToStart: () => void;

  // Cloud sync
  setCloudSync: (enabled: boolean) => void;
  loadCloudSave: (cloudData: SaveData) => void;

  // Reset
  resetSave: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialSave = (typeof window !== 'undefined') ? loadSave() : { ...DEFAULT_SAVE, rankingData: { ...DEFAULT_RANKING } };
  const initialSoundSettings = (typeof window !== 'undefined') ? soundEngine.loadSettings() : { ...DEFAULT_SOUND_SETTINGS };

  return {
    gamePhase: 'splash',
    gameMode: 'single',
    currentLevel: 1,
    score: 0,
    totalScore: 0,
    currentWave: 0,
    totalWaves: 0,
    isBossLevel: false,
    canRevive: true,
    hasUsedRevive: false,
    revivedWithFullPower: false,
    currentStoryChapter: 1,

    currentCutscene: null,
    cutsceneFrameIndex: 0,
    cutsceneTextProgress: 0,
    voiceLine: null,
    dramaticMoment: null,
    introText: null,
    introColor: '#00ffff',
    introTimer: 0,

    saveData: initialSave,
    soundSettings: initialSoundSettings,
    lastLevelStars: 0,
    lastLevelKills: 0,
    lastLevelMaxCombo: 0,
    lastLevelCoinsEarned: 0,
    lastLevelHealthPct: 0,
    lastLevelTotalEnemies: 0,

    versusP1Wins: 0,
    versusP2Wins: 0,
    versusCurrentRound: 1,
    versusTotalRounds: 3, // Best of 3
    versusRoundWinner: 0,
    versusMatchWinner: 0,

    dashCooldown: 0,
    shieldCooldown: 0,
    specialCooldown: 0,
    waitingForTap: false,

    setGamePhase: (phase) => set({ gamePhase: phase }),

    setGameMode: (mode) => set({ gameMode: mode }),

    startVersus: () => {
      set({
        gameMode: 'versus',
        gamePhase: 'playing',
        currentLevel: -1,
        score: 0,
        currentWave: 0,
        totalWaves: 0,
        isBossLevel: false,
        canRevive: false,
        hasUsedRevive: false,
        versusP1Wins: 0,
        versusP2Wins: 0,
        versusCurrentRound: 1,
        versusTotalRounds: 3,
        versusRoundWinner: 0,
        versusMatchWinner: 0,
        introText: 'FIGHT!',
        introColor: '#ffd700',
        introTimer: 90,
        voiceLine: null,
        waitingForTap: true,
      });
    },

    versusRoundWin: (player) => {
      const state = get();
      // Draw/tie: no points awarded, just advance the round
      if (player === 3) {
        set({
          versusRoundWinner: 3,
          versusCurrentRound: state.versusCurrentRound + 1,
        });
        return;
      }
      const p1Wins = player === 1 ? state.versusP1Wins + 1 : state.versusP1Wins;
      const p2Wins = player === 2 ? state.versusP2Wins + 1 : state.versusP2Wins;
      const roundsToWin = Math.ceil(state.versusTotalRounds / 2);

      if (p1Wins >= roundsToWin) {
        set({ versusP1Wins: p1Wins, versusP2Wins: p2Wins, versusRoundWinner: player, versusMatchWinner: 1 });
      } else if (p2Wins >= roundsToWin) {
        set({ versusP1Wins: p1Wins, versusP2Wins: p2Wins, versusRoundWinner: player, versusMatchWinner: 2 });
      } else {
        set({
          versusP1Wins: p1Wins,
          versusP2Wins: p2Wins,
          versusRoundWinner: player,
          versusCurrentRound: state.versusCurrentRound + 1,
        });
      }
    },

    versusResetRound: () => {
      set({
        versusRoundWinner: 0,
        gamePhase: 'playing',
        introText: `ROUND ${get().versusCurrentRound} — FIGHT!`,
        introColor: '#ffd700',
        introTimer: 90,
        waitingForTap: true,
      });
    },

    versusMatchEnd: (winner) => {
      set({
        versusMatchWinner: winner,
        gamePhase: 'level-complete',
      });
    },

    startGame: () => {
      const save = get().saveData;
      if (save.highestLevel >= 1) {
        // Returning player — skip intro cutscene, go directly to playing
        get().startLevel(save.highestLevel);
      } else {
        // New player — show the story cutscene
        get().startCutscene('ch1-intro');
      }
    },

    startLevel: (levelId) => {
      // Use procedural generation for levels > 8
      const level = levelId <= LEVELS.length
        ? LEVELS.find(l => l.id === levelId)
        : generateProceduralLevel(levelId);
      if (!level) return;
      const totalWaves = level.waves.length + (level.bossWave ? 1 : 0);

      const cutsceneMap: Record<number, string> = {
        3: 'ch2-intro',
        5: 'ch3-intro',
        7: 'ch4-intro',
        8: 'ch5-intro',
        10: 'ch1-intro',    // Story starts at level 10+
        30: 'ch2-intro',
        60: 'ch3-intro',
        150: 'ch4-intro',
        200: 'ch5-intro',
      };

      // Check for deep story cutscene (every 10 levels)
      const deepCutsceneId = getCutsceneForLevel(levelId);
      const cutsceneId = cutsceneMap[levelId] || deepCutsceneId;
      if (cutsceneId && CUTSCENES[cutsceneId]) {
        set({
          currentLevel: levelId,
          score: 0,
          currentWave: 0,
          totalWaves,
          isBossLevel: false,
          canRevive: true,
          hasUsedRevive: false,
          voiceLine: null,
        });
        get().startCutscene(cutsceneId);
      } else {
        set({
          currentLevel: levelId,
          score: 0,
          currentWave: 0,
          totalWaves,
          isBossLevel: false,
          canRevive: true,
          hasUsedRevive: false,
          gamePhase: 'playing',
          voiceLine: null,
          introText: level.introText,
          introColor: level.introColor,
          introTimer: 90,
          waitingForTap: true,
        });
      }
    },

    showVoiceLine: (text, color, duration = 90) => {
      set({ voiceLine: { text, color, timer: duration } });
    },

    triggerDramaticMoment: (text, color, duration = 150) => {
      set({ dramaticMoment: { text, color, timer: duration } });
    },

    advanceWave: () => {
      const { currentWave, totalWaves, currentLevel } = get();
      const nextWave = currentWave + 1;
      const level = currentLevel <= LEVELS.length
        ? LEVELS.find(l => l.id === currentLevel)
        : generateProceduralLevel(currentLevel);

      if (nextWave >= totalWaves) {
        const score = get().score + 200;
        get().completeLevel(score);
        return;
      }

      const isBossWave = level?.bossWave && nextWave === totalWaves - 1;
      if (isBossWave) {
        set({ isBossLevel: true });
      }

      set({ currentWave: nextWave });
    },

    completeLevel: (score) => {
      const { currentLevel, totalScore, saveData, lastLevelStars, lastLevelKills, lastLevelMaxCombo, lastLevelHealthPct, lastLevelTotalEnemies } = get();
      const newTotal = totalScore + score;
      const coinsEarned = Math.floor(score / 5);

      // Calculate star rating if not already set by GameCanvas
      let stars = lastLevelStars;
      if (stars === 0 && lastLevelTotalEnemies > 0) {
        stars = 1;
        if (lastLevelHealthPct > 40 || lastLevelKills >= lastLevelTotalEnemies * 0.5) stars = 2;
        if (lastLevelHealthPct > 70 && lastLevelKills >= lastLevelTotalEnemies * 0.8) stars = 3;
      } else if (stars === 0) {
        stars = 1; // Minimum 1 star for completing
      }

      let newSave = { ...saveData };
      newSave = checkLevelUnlocks(newSave, currentLevel);
      newSave = addCoins(newSave, coinsEarned);
      newSave.totalScore = newTotal;
      if (!newSave.missionsCompleted.includes(String(currentLevel))) {
        newSave.missionsCompleted = [...newSave.missionsCompleted, String(currentLevel)];
      }

      // Persist star rating — keep the highest star count
      const levelKey = String(currentLevel);
      const prevStars = newSave.levelStars?.[levelKey] ?? 0;
      if (stars > prevStars) {
        newSave.levelStars = { ...newSave.levelStars, [levelKey]: stars };
      }

      // Gang unlocks (saved but not used in gameplay yet)
      const level = currentLevel <= LEVELS.length
        ? LEVELS.find(l => l.id === currentLevel)
        : generateProceduralLevel(currentLevel);
      if (level) {
        for (const memberId of level.gangMembersAvailable) {
          if (!newSave.gangMembersUnlocked.includes(memberId)) {
            const gangDef = GANG_MEMBERS.find(g => g.id === memberId);
            if (gangDef && gangDef.joinChapter <= parseInt(level.chapter.replace('CH.', ''))) {
              newSave.gangMembersUnlocked = [...newSave.gangMembersUnlocked, memberId];
            }
          }
        }
      }

      if (currentLevel <= 2) newSave.currentChapter = 1;
      else if (currentLevel <= 4) newSave.currentChapter = 2;
      else if (currentLevel <= 6) newSave.currentChapter = 3;
      else if (currentLevel <= 7) newSave.currentChapter = 4;
      else newSave.currentChapter = 5;

      // Always update highest level
      if (currentLevel >= newSave.highestLevel) {
        newSave.highestLevel = currentLevel + 1;
      }

      // Update story chapter for procedural levels
      if (currentLevel > 8) {
        const newChapter = Math.min(Math.floor((currentLevel - 1) / 100) + 6, 200);
        const prevChapter = get().currentStoryChapter;
        if (newChapter > prevChapter) {
          set({ currentStoryChapter: newChapter });
        }
      }

      writeSave(newSave);

      if (currentLevel === 6 && CUTSCENES['ch3-rescue']) {
        set({ saveData: newSave, score, totalScore: newTotal });
        get().startCutscene('ch3-rescue');
        return;
      }

      if (currentLevel === 8 && CUTSCENES['victory']) {
        set({ saveData: newSave, score, totalScore: newTotal });
        get().startCutscene('victory');
        return;
      }

      // For procedural levels, just go to level-complete
      set({
        score,
        totalScore: newTotal,
        saveData: newSave,
        gamePhase: 'level-complete',
      });
    },

    gameOver: () => {
      const { saveData, hasUsedRevive } = get();
      const newSave = { ...saveData, totalDeaths: saveData.totalDeaths + 1 };
      writeSave(newSave);
      soundEngine.stopAll();
      set({ gamePhase: 'game-over', saveData: newSave, canRevive: !hasUsedRevive });
    },

    nextLevel: () => {
      const next = get().currentLevel + 1;
      // Allow going to any level up to TOTAL_LEVELS
      if (next <= TOTAL_LEVELS) {
        get().startLevel(next);
      } else {
        set({ gamePhase: 'menu' });
      }
    },

    retryLevel: () => {
      get().startLevel(get().currentLevel);
    },

    backToMenu: () => {
      soundEngine.stopAll();
      set({
        gamePhase: 'menu',
        gameMode: 'single',
        voiceLine: null,
        dramaticMoment: null,
        introText: null,
        introTimer: 0,
        currentCutscene: null,
        versusP1Wins: 0,
        versusP2Wins: 0,
        versusCurrentRound: 1,
        versusRoundWinner: 0,
        versusMatchWinner: 0,
        waitingForTap: false,
      });
    },

    revive: () => {
      const { hasUsedRevive, saveData } = get();
      if (hasUsedRevive) return;
      set({ hasUsedRevive: true, canRevive: false, revivedWithFullPower: true });
      if (CUTSCENES['revive']) {
        get().startCutscene('revive');
      } else {
        set({ gamePhase: 'playing', waitingForTap: true });
      }
    },

    startCutscene: (cutsceneId: string) => {
      const cutscene = CUTSCENES[cutsceneId];
      if (!cutscene) {
        // Cutscene not found — go directly to playing with proper intro state
        const currentLevel = get().currentLevel;
        const level = currentLevel <= LEVELS.length
          ? LEVELS.find(l => l.id === currentLevel)
          : generateProceduralLevel(currentLevel);
        set({
          gamePhase: 'playing',
          waitingForTap: true,
          introText: level?.introText || 'GET READY!',
          introColor: level?.introColor || CYAN,
          introTimer: 60,
        });
        return;
      }
      set({
        currentCutscene: cutscene,
        cutsceneFrameIndex: 0,
        cutsceneTextProgress: 0,
        gamePhase: 'cutscene',
      });
    },

    advanceCutscene: () => {
      const { currentCutscene, cutsceneFrameIndex } = get();
      if (!currentCutscene) return;
      const nextFrame = cutsceneFrameIndex + 1;
      if (nextFrame < currentCutscene.frames.length) {
        set({ cutsceneFrameIndex: nextFrame, cutsceneTextProgress: 0 });
      } else {
        set({
          currentCutscene: null,
          cutsceneFrameIndex: 0,
          cutsceneTextProgress: 0,
        });
        const currentLevel = get().currentLevel;
        const level = currentLevel <= LEVELS.length
          ? LEVELS.find(l => l.id === currentLevel)
          : generateProceduralLevel(currentLevel);
        if (level) {
          set({
            gamePhase: 'playing',
            introText: level.introText,
            introColor: level.introColor,
            introTimer: 60,
            waitingForTap: true,
          });
        } else {
          if (currentLevel >= TOTAL_LEVELS) {
            set({ gamePhase: 'victory' });
          } else {
            set({ gamePhase: 'level-complete' });
          }
        }
      }
    },

    saveGame: () => {
      writeSave(get().saveData);
    },

    loadGame: () => {
      set({ saveData: loadSave() });
    },

    buySkin: (skinId: string) => {
      const { saveData } = get();
      const updated = purchaseSkin(saveData, skinId);
      if (!updated) return false;
      writeSave(updated);
      set({ saveData: updated });
      return true;
    },

    selectSkin: (skinId: string) => {
      const { saveData } = get();
      const updated = equipSkin(saveData, skinId);
      writeSave(updated);
      set({ saveData: updated });
    },

    buyPet: (petId: string) => {
      const { saveData } = get();
      const updated = purchasePet(saveData, petId);
      if (!updated) return false;
      writeSave(updated);
      set({ saveData: updated });
      return true;
    },

    selectPet: (petId: string) => {
      const { saveData } = get();
      const updated = selectPetSave(saveData, petId);
      writeSave(updated);
      set({ saveData: updated });
    },

    buyPetSkin: (skinId: string) => {
      const { saveData } = get();
      const updated = purchasePetSkin(saveData, skinId);
      if (!updated) return false;
      writeSave(updated);
      set({ saveData: updated });
      return true;
    },

    selectPetSkin: (skinId: string) => {
      const { saveData } = get();
      const updated = equipPetSkin(saveData, skinId);
      writeSave(updated);
      set({ saveData: updated });
    },

    addCoinsFromScore: (score: number) => {
      const coins = Math.floor(score / 5);
      const { saveData } = get();
      const updated = addCoins(saveData, coins);
      set({ saveData: updated });
    },

    addCoinsReward: (amount: number) => {
      const { saveData } = get();
      const updated = addCoins(saveData, amount);
      writeSave(updated);
      set({ saveData: updated });
    },

    // Sound settings
    setSoundSettings: (settings: Partial<SoundSettings>) => {
      const current = get().soundSettings;
      const updated = { ...current, ...settings };
      set({ soundSettings: updated });

      if (settings.masterVolume !== undefined) soundEngine.setMasterVolume(settings.masterVolume);
      if (settings.sfxVolume !== undefined) soundEngine.setSfxVolume(settings.sfxVolume);
      if (settings.musicVolume !== undefined) soundEngine.setMusicVolume(settings.musicVolume);
      if (settings.musicEnabled !== undefined) soundEngine.setMusicEnabled(settings.musicEnabled);
      if (settings.sfxEnabled !== undefined) soundEngine.setSfxEnabled(settings.sfxEnabled);
    },

    // Profile
    updateProfile: (updates) => {
      const { saveData } = get();
      const updated = updateProfile(saveData, updates);
      writeSave(updated);
      set({ saveData: updated });
    },

    // Ranking
    updateRanking: (won: boolean) => {
      const { saveData } = get();
      const ranking: RankingData = { ...saveData.rankingData };
      if (won) {
        ranking.wins++;
        ranking.elo += 25;
      } else {
        ranking.losses++;
        ranking.elo = Math.max(0, ranking.elo - 15);
      }
      const newSave = { ...saveData, rankingData: ranking };
      writeSave(newSave);
      set({ saveData: newSave });
    },

    // Skill system
    buySkill: (skillId: string) => {
      const { saveData } = get();
      const skillDef = SKILL_DEFS.find(s => s.id === skillId);
      if (!skillDef) return false;
      if (saveData.unlockedSkills.includes(skillId)) return false;
      // 'ad' unlock method: purchasable with coins (simulates watching ad to earn coins)
      if (skillDef.unlockMethod === 'ad' || skillDef.unlockMethod === 'purchase' || skillDef.unlockMethod === 'chest') {
        if (skillDef.unlockCost > 0 && saveData.totalCoins < skillDef.unlockCost) return false;
        const updated = {
          ...saveData,
          totalCoins: skillDef.unlockCost > 0 ? saveData.totalCoins - skillDef.unlockCost : saveData.totalCoins,
          unlockedSkills: [...saveData.unlockedSkills, skillId],
        };
        writeSave(updated);
        set({ saveData: updated });
        return true;
      }
      // boss/level/story unlocks are not purchasable
      return false;
    },

    equipSkill: (skillId: string, slot: number) => {
      const { saveData } = get();
      if (!saveData.unlockedSkills.includes(skillId)) return;
      if (slot < 0 || slot > 2) return;
      const newEquipped = [...saveData.equippedSkills];
      // If skill already equipped in another slot, remove it first
      const existingIdx = newEquipped.indexOf(skillId);
      if (existingIdx >= 0) newEquipped[existingIdx] = '';
      newEquipped[slot] = skillId;
      // Ensure only 3 slots
      while (newEquipped.length > 3) newEquipped.pop();
      while (newEquipped.length < 3) newEquipped.push('');
      const updated = { ...saveData, equippedSkills: newEquipped };
      writeSave(updated);
      set({ saveData: updated });
    },

    unequipSkill: (slot: number) => {
      const { saveData } = get();
      if (slot < 0 || slot > 2) return;
      const newEquipped = [...saveData.equippedSkills];
      newEquipped[slot] = '';
      while (newEquipped.length > 3) newEquipped.pop();
      while (newEquipped.length < 3) newEquipped.push('');
      const updated = { ...saveData, equippedSkills: newEquipped };
      writeSave(updated);
      set({ saveData: updated });
    },

    // Upgrade skill level
    upgradeSkill: (skillId: string) => {
      const { saveData } = get();
      const updated = upgradeSkillSave(saveData, skillId);
      if (!updated) return false;
      writeSave(updated);
      set({ saveData: updated });
      return true;
    },

    // Daily reward
    claimDailyReward: () => {
      const { saveData } = get();
      const result = claimDailyRewardSave(saveData);
      if (!result) return null;
      writeSave(result.save);
      set({ saveData: result.save });
      return { coins: result.coins, day: result.day };
    },

    canClaimDaily: () => {
      const { saveData } = get();
      return canClaimDailyReward(saveData);
    },

    // Weapon upgrade — pay coins
    upgradeWeapon: (type: WeaponUpgradeType) => {
      const { saveData } = get();
      const currentLevel = saveData.weaponUpgrades[type] ?? 0;
      const upgrade = WEAPON_UPGRADES[type];
      if (currentLevel >= upgrade.maxLevel) return false;
      const cost = getWeaponUpgradeCost(type, currentLevel);
      if (saveData.totalCoins < cost) return false;
      const newUpgrades = { ...saveData.weaponUpgrades, [type]: currentLevel + 1 };
      const updated = { ...saveData, totalCoins: saveData.totalCoins - cost, weaponUpgrades: newUpgrades };
      writeSave(updated);
      set({ saveData: updated });
      return true;
    },

    // Weapon upgrade by ad — free upgrade
    upgradeWeaponByAd: (type: WeaponUpgradeType) => {
      const { saveData } = get();
      const currentLevel = saveData.weaponUpgrades[type] ?? 0;
      const upgrade = WEAPON_UPGRADES[type];
      if (currentLevel >= upgrade.maxLevel) return;
      const newUpgrades = { ...saveData.weaponUpgrades, [type]: currentLevel + 1 };
      const updated = { ...saveData, weaponUpgrades: newUpgrades };
      writeSave(updated);
      set({ saveData: updated });
    },

    // Update cooldowns from GameCanvas
    updateCooldowns: (dash, shield, special) => {
      set({ dashCooldown: dash, shieldCooldown: shield, specialCooldown: special });
    },

    // Tap to start — dismiss the tap overlay and begin gameplay
    tapToStart: () => {
      set({ waitingForTap: false });
      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
    },

    // Cloud sync
    setCloudSync: (enabled: boolean) => {
      enableCloudSync(enabled);
    },

    loadCloudSave: (cloudData: SaveData) => {
      // Use sophisticated merge logic from firebase-firestore
      const local = get().saveData;
      // Inline merge: take the save with more progress, keep higher coins
      const localScore = local.totalScore;
      const cloudScore = cloudData.totalScore;
      const localLevel = local.highestLevel;
      const cloudLevel = cloudData.highestLevel;
      let merged: SaveData;
      if (cloudLevel > localLevel || (cloudLevel === localLevel && cloudScore > localScore)) {
        merged = {
          ...cloudData,
          totalCoins: Math.max(local.totalCoins, cloudData.totalCoins),
        };
      } else {
        merged = local;
      }
      writeSave(merged);
      set({ saveData: merged });
    },

    // Reset all data
    resetSave: () => {
      resetAllData();
      set({
        saveData: { ...DEFAULT_SAVE, rankingData: { ...DEFAULT_RANKING } },
        soundSettings: { ...DEFAULT_SOUND_SETTINGS },
      });
    },
  };
});
