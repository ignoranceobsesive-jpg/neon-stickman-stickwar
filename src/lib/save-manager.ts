// ====== NEON STICKMAN: SAVE MANAGER ======
// Persistent game progress using localStorage + Firebase cloud sync

import { type SaveData, DEFAULT_SAVE, SKINS, PET_SKINS, PET_DEFS, DEFAULT_RANKING, SKILL_DEFS, SKILL_UPGRADE_COSTS, MAX_SKILL_LEVEL, DAILY_REWARDS } from './game-types';

export type { SaveData } from './game-types';

const SAVE_KEY = 'neonStickman_save_v4';

// ====== CLOUD SYNC ======
// Auto-upload save to cloud on every write (if authenticated)
let cloudSyncEnabled = false;

export function enableCloudSync(enabled: boolean) {
  cloudSyncEnabled = enabled;
}

// Called internally after each save write — syncs to cloud in background
async function syncToCloud(data: SaveData) {
  if (!cloudSyncEnabled) return;
  try {
    const { uploadSaveToCloud } = await import('./firebase-firestore');
    const success = await uploadSaveToCloud(data);
    if (success) {
      // Log analytics event for cloud sync
      try {
        const { logAnalyticsEvent } = await import('./firebase');
        logAnalyticsEvent('cloud_sync', { level: data.highestLevel, coins: data.totalCoins });
      } catch {
        // Analytics failure is non-critical
      }
    }
  } catch {
    // Cloud sync failure is non-critical — local save is always primary
  }
}

export function loadSave(): SaveData {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_SAVE, rankingData: { ...DEFAULT_RANKING } };
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, rankingData: { ...DEFAULT_RANKING } };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    // Merge with defaults to handle missing fields from old saves
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      rankingData: { ...DEFAULT_RANKING, ...(parsed.rankingData || {}) },
      unlockedPets: parsed.unlockedPets || ['neonWolf'],
      unlockedPetSkins: parsed.unlockedPetSkins || ['wolf-default'],
      username: parsed.username || DEFAULT_SAVE.username,
      avatar: parsed.avatar || DEFAULT_SAVE.avatar,
      about: parsed.about ?? DEFAULT_SAVE.about,
      nationality: parsed.nationality ?? DEFAULT_SAVE.nationality,
      unlockedSkills: parsed.unlockedSkills ?? DEFAULT_SAVE.unlockedSkills,
      equippedSkills: (parsed.equippedSkills ?? DEFAULT_SAVE.equippedSkills).slice(0, 3),
      skillUpgrades: parsed.skillUpgrades ?? DEFAULT_SAVE.skillUpgrades,
      lastDailyRewardDay: parsed.lastDailyRewardDay ?? DEFAULT_SAVE.lastDailyRewardDay,
      dailyRewardStreak: parsed.dailyRewardStreak ?? DEFAULT_SAVE.dailyRewardStreak,
      levelStars: parsed.levelStars ?? DEFAULT_SAVE.levelStars,
      weaponUpgrades: parsed.weaponUpgrades ?? DEFAULT_SAVE.weaponUpgrades,
    };
  } catch {
    return { ...DEFAULT_SAVE, rankingData: { ...DEFAULT_RANKING } };
  }
}

export function writeSave(data: SaveData): void {
  try {
    if (typeof window === 'undefined') return;
    data.lastSaveTime = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    // Background cloud sync (non-blocking)
    syncToCloud(data);
  } catch {
    // localStorage might be full or disabled
  }
}

export function clearSave(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function resetAllData(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('neonStickman_sound_v1');
  } catch {
    // ignore
  }
}

export function unlockSkin(save: SaveData, skinId: string): SaveData {
  if (!save.unlockedSkins.includes(skinId)) {
    return { ...save, unlockedSkins: [...save.unlockedSkins, skinId] };
  }
  return save;
}

export function purchaseSkin(save: SaveData, skinId: string): SaveData | null {
  const skin = SKINS.find(s => s.id === skinId);
  if (!skin) return null;
  if (save.unlockedSkins.includes(skinId)) return save;
  if (save.totalCoins < skin.price) return null;
  return {
    ...save,
    totalCoins: save.totalCoins - skin.price,
    unlockedSkins: [...save.unlockedSkins, skinId],
  };
}

export function equipSkin(save: SaveData, skinId: string): SaveData {
  if (!save.unlockedSkins.includes(skinId)) return save;
  return { ...save, currentSkin: skinId };
}

export function purchasePetSkin(save: SaveData, skinId: string): SaveData | null {
  const skin = PET_SKINS.find(s => s.id === skinId);
  if (!skin) return null;
  if (save.unlockedPetSkins.includes(skinId)) return save;
  if (save.totalCoins < skin.price) return null;
  return {
    ...save,
    totalCoins: save.totalCoins - skin.price,
    unlockedPetSkins: [...save.unlockedPetSkins, skinId],
  };
}

export function equipPetSkin(save: SaveData, skinId: string): SaveData {
  if (!save.unlockedPetSkins.includes(skinId)) return save;
  const skin = PET_SKINS.find(s => s.id === skinId);
  if (!skin) return save;
  return { ...save, currentPetSkin: skinId, currentPet: skin.petId };
}

export function purchasePet(save: SaveData, petId: string): SaveData | null {
  const pet = PET_DEFS.find(p => p.id === petId);
  if (!pet) return null;
  if (save.unlockedPets.includes(petId as any)) return save;
  if (save.totalCoins < pet.price) return null;
  return {
    ...save,
    totalCoins: save.totalCoins - pet.price,
    unlockedPets: [...save.unlockedPets, petId as any],
  };
}

export function selectPet(save: SaveData, petId: string): SaveData {
  if (!save.unlockedPets.includes(petId as any)) return save;
  return { ...save, currentPet: petId as any };
}

export function checkLevelUnlocks(save: SaveData, levelId: number): SaveData {
  let updated = { ...save };
  for (const skin of SKINS) {
    if (skin.unlockLevel && skin.unlockLevel <= levelId && !updated.unlockedSkins.includes(skin.id)) {
      updated = unlockSkin(updated, skin.id);
    }
  }
  // Unlock skills based on level
  for (const skill of SKILL_DEFS) {
    if (
      skill.unlockMethod === 'level' &&
      skill.unlockLevel &&
      skill.unlockLevel <= levelId &&
      !updated.unlockedSkills.includes(skill.id)
    ) {
      updated.unlockedSkills = [...updated.unlockedSkills, skill.id];
    }
  }
  if (levelId > updated.highestLevel) {
    updated.highestLevel = levelId;
  }
  return updated;
}

export function addCoins(save: SaveData, amount: number): SaveData {
  return { ...save, totalCoins: save.totalCoins + amount };
}

// ====== SKILL UPGRADE ======
export function upgradeSkill(save: SaveData, skillId: string): SaveData | null {
  // Skill must be unlocked
  if (!save.unlockedSkills.includes(skillId)) return null;
  // Get current level (defaults to 1)
  const currentLevel = save.skillUpgrades[skillId] ?? 1;
  // Can't upgrade past max
  if (currentLevel >= MAX_SKILL_LEVEL) return null;
  // Check cost
  const cost = SKILL_UPGRADE_COSTS[currentLevel]; // 0-based index: level 1 upgrade cost is at index 1
  if (cost > 0 && save.totalCoins < cost) return null;
  // Deduct coins and increment level
  const newUpgrades = { ...save.skillUpgrades, [skillId]: currentLevel + 1 };
  return {
    ...save,
    totalCoins: cost > 0 ? save.totalCoins - cost : save.totalCoins,
    skillUpgrades: newUpgrades,
  };
}

// ====== DAILY REWARD ======
export function canClaimDailyReward(save: SaveData): boolean {
  const today = new Date().toISOString().split('T')[0]; // "2026-05-09"
  return save.lastDailyRewardDay !== today;
}

export function claimDailyReward(save: SaveData): { save: SaveData; coins: number; day: number } | null {
  if (!canClaimDailyReward(save)) return null;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Determine streak
  let newStreak: number;
  if (save.lastDailyRewardDay === '' || save.lastDailyRewardDay === yesterday) {
    // Consecutive day or first time
    newStreak = Math.min(save.dailyRewardStreak + 1, 7);
  } else if (save.lastDailyRewardDay === today) {
    // Already claimed today
    return null;
  } else {
    // Gap > 1 day, reset streak
    newStreak = 1;
  }

  // Get reward for current day
  const rewardIdx = Math.min(newStreak - 1, DAILY_REWARDS.length - 1);
  const reward = DAILY_REWARDS[rewardIdx];

  const newSave: SaveData = {
    ...save,
    totalCoins: save.totalCoins + reward.coins,
    lastDailyRewardDay: today,
    dailyRewardStreak: newStreak,
  };

  return { save: newSave, coins: reward.coins, day: newStreak };
}

export function updateProfile(
  save: SaveData,
  updates: Partial<Pick<SaveData, 'username' | 'avatar' | 'about' | 'nationality'>>,
): SaveData {
  return { ...save, ...updates };
}
