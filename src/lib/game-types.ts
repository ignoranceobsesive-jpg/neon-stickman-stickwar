// ====== NEON STICKMAN: STICK WAR — FULL GAME TYPES ======
// Pet system, procedural levels, skins, cutscenes, save data, endless mode

export type GamePhase = 'splash' | 'menu' | 'playing' | 'cutscene' | 'game-over' | 'level-complete' | 'victory' | 'skin-shop' | 'skill-shop' | 'settings' | 'online-arena' | 'online-lobby' | 'profile' | 'leaderboard' | 'level-map' | 'weapon-shop';

export type GameMode = 'single' | 'coop' | 'versus' | 'online';

export type SparkExpression = 'neutral' | 'angry' | 'smirk' | 'determined' | 'hurt' | 'victory' | 'sad' | 'loved';

// ====== NEON COLORS ======
export const CYAN = '#00ffff';
export const MAGENTA = '#ff00ff';
export const LIME = '#00ff66';
export const ORANGE = '#ff6600';
export const YELLOW = '#ffff00';
export const PURPLE = '#aa00ff';
export const RED = '#ff3333';
export const DARK_BG = '#050510';
export const GOLD = '#ffd700';
export const PINK = '#ff69b4';
export const BLUE = '#4488ff';
export const WHITE = '#ffffff';

// ====== PHYSICS CONSTANTS ======
export const GRAVITY = 0.5;
export const PLAYER_SPEED = 5;
export const JUMP_VELOCITY = -12;
export const BULLET_SPEED = 10;
export const MAX_FALL_SPEED = 10;
export const SHOOT_COOLDOWN = 8;
export const INVINCIBLE_FRAMES = 40;

// ====== ABILITY CONSTANTS ======
export const DASH_SPEED = 18;
export const DASH_DURATION = 8;
export const DASH_COOLDOWN = 90;
export const SHIELD_DURATION = 120;
export const SHIELD_COOLDOWN = 300;
export const SPECIAL_COOLDOWN = 360;
export const SPECIAL_DAMAGE = 30;

// ====== WEAPON UPGRADE SYSTEM ======
export const WEAPON_UPGRADES = {
  damage: {
    name: 'Damage',
    baseCost: 500,
    costMultiplier: 1.5,
    effectPerLevel: 0.15,
    maxLevel: 999,
  },
  fireRate: {
    name: 'Fire Rate',
    baseCost: 800,
    costMultiplier: 1.6,
    effectPerLevel: 0.1,
    maxLevel: 999,
  },
  bulletSpeed: {
    name: 'Bullet Speed',
    baseCost: 600,
    costMultiplier: 1.4,
    effectPerLevel: 0.12,
    maxLevel: 999,
  },
  bulletSize: {
    name: 'Bullet Size',
    baseCost: 400,
    costMultiplier: 1.3,
    effectPerLevel: 0.1,
    maxLevel: 999,
  },
  criticalChance: {
    name: 'Critical Hit',
    baseCost: 1500,
    costMultiplier: 2.0,
    effectPerLevel: 0.02,
    maxLevel: 50,
  },
} as const;

export type WeaponUpgradeType = keyof typeof WEAPON_UPGRADES;

export function getWeaponUpgradeCost(type: WeaponUpgradeType, currentLevel: number): number {
  const upgrade = WEAPON_UPGRADES[type];
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

// ====== PET SYSTEM ======
export type PetType = 'neonWolf' | 'plasmaFalcon' | 'shadowSpider' | 'crystalGolem' | 'voidDrake' | 'neonCat' | 'thunderBird' | 'iceFox' | 'magmaSnail' | 'cosmicOwl';

export interface PetDef {
  id: PetType;
  name: string;
  color: string;
  glowColor: string;
  shootColor: string;
  damage: number;
  shootRate: number; // frames between shots
  description: string;
  price: number; // 0 = free, >0 = coin cost
}

export const PET_DEFS: PetDef[] = [
  { id: 'neonWolf', name: 'NEON WOLF', color: CYAN, glowColor: CYAN, shootColor: CYAN, damage: 6, shootRate: 45, description: 'Loyal companion. Balanced fighter.', price: 0 },
  { id: 'plasmaFalcon', name: 'PLASMA FALCON', color: ORANGE, glowColor: YELLOW, shootColor: ORANGE, damage: 4, shootRate: 30, description: 'Fast attacks. Quick and agile.', price: 2000 },
  { id: 'shadowSpider', name: 'SHADOW SPIDER', color: PURPLE, glowColor: MAGENTA, shootColor: PURPLE, damage: 8, shootRate: 60, description: 'Slow but devastating hits.', price: 3500 },
  { id: 'crystalGolem', name: 'CRYSTAL GOLEM', color: LIME, glowColor: LIME, shootColor: LIME, damage: 5, shootRate: 50, description: 'Tanky. Absorbs damage for you.', price: 5500 },
  { id: 'voidDrake', name: 'VOID DRAKE', color: MAGENTA, glowColor: RED, shootColor: MAGENTA, damage: 10, shootRate: 55, description: 'Legendary power. Devastating attacks.', price: 25000 },
  // ====== NEW PETS ======
  { id: 'neonCat', name: 'NEON CAT', color: '#ff44aa', glowColor: '#ff88cc', shootColor: '#ff44aa', damage: 5, shootRate: 40, description: 'Agile and quick. Lands critical hits.', price: 3000 },
  { id: 'thunderBird', name: 'THUNDER BIRD', color: '#ffff00', glowColor: '#ffffff', shootColor: '#ffff00', damage: 7, shootRate: 50, description: 'Strikes with lightning bolts.', price: 4500 },
  { id: 'iceFox', name: 'ICE FOX', color: '#88eeff', glowColor: '#ffffff', shootColor: '#88eeff', damage: 6, shootRate: 42, description: 'Freezing attacks slow enemies.', price: 7500 },
  { id: 'magmaSnail', name: 'MAGMA SNAIL', color: '#ff4400', glowColor: '#ff8844', shootColor: '#ff4400', damage: 9, shootRate: 70, description: 'Slow but devastating fireballs.', price: 15000 },
  { id: 'cosmicOwl', name: 'COSMIC OWL', color: '#aa44ff', glowColor: '#dd88ff', shootColor: '#aa44ff', damage: 11, shootRate: 58, description: 'Legendary wisdom. Devastating cosmic blasts.', price: 40000 },
];

export interface PetSkinDef {
  id: string;
  name: string;
  petId: PetType;
  color: string;
  glowColor: string;
  trailColor: string;
  price: number; // 0 = free, >0 = coin cost
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  effect?: string;
}

export const PET_SKINS: PetSkinDef[] = [
  // Neon Wolf skins
  { id: 'wolf-default', name: 'CYAN', petId: 'neonWolf', color: CYAN, glowColor: CYAN, trailColor: CYAN, price: 0, rarity: 'common' },
  { id: 'wolf-crimson', name: 'CRIMSON', petId: 'neonWolf', color: RED, glowColor: ORANGE, trailColor: RED, price: 2400, rarity: 'rare' },
  { id: 'wolf-golden', name: 'GOLDEN', petId: 'neonWolf', color: GOLD, glowColor: YELLOW, trailColor: GOLD, price: 15000, rarity: 'legendary' },
  // Plasma Falcon skins
  { id: 'falcon-default', name: 'FLAME', petId: 'plasmaFalcon', color: ORANGE, glowColor: YELLOW, trailColor: ORANGE, price: 0, rarity: 'common' },
  { id: 'falcon-ice', name: 'ICE', petId: 'plasmaFalcon', color: '#88eeff', glowColor: WHITE, trailColor: '#88eeff', price: 2400, rarity: 'rare' },
  // Shadow Spider skins
  { id: 'spider-default', name: 'VOID', petId: 'shadowSpider', color: PURPLE, glowColor: MAGENTA, trailColor: PURPLE, price: 0, rarity: 'common' },
  { id: 'spider-toxic', name: 'TOXIC', petId: 'shadowSpider', color: LIME, glowColor: LIME, trailColor: LIME, price: 4000, rarity: 'rare' },
  // Crystal Golem skins
  { id: 'golem-default', name: 'CRYSTAL', petId: 'crystalGolem', color: LIME, glowColor: LIME, trailColor: LIME, price: 0, rarity: 'common' },
  { id: 'golem-magma', name: 'MAGMA', petId: 'crystalGolem', color: RED, glowColor: ORANGE, trailColor: ORANGE, price: 5500, rarity: 'epic' },
  // Void Drake skins
  { id: 'drake-default', name: 'ABYSS', petId: 'voidDrake', color: MAGENTA, glowColor: RED, trailColor: MAGENTA, price: 0, rarity: 'common' },
  { id: 'drake-prism', name: 'PRISM', petId: 'voidDrake', color: WHITE, glowColor: CYAN, trailColor: MAGENTA, price: 25000, rarity: 'legendary', effect: 'rainbow' },
  // ====== NEON CAT SKINS ======
  { id: 'cat-default', name: 'PINK', petId: 'neonCat', color: '#ff44aa', glowColor: '#ff88cc', trailColor: '#ff44aa', price: 0, rarity: 'common' },
  { id: 'cat-shadow', name: 'SHADOW', petId: 'neonCat', color: '#442244', glowColor: '#664466', trailColor: '#442244', price: 2400, rarity: 'rare' },
  { id: 'cat-cosmic', name: 'COSMIC', petId: 'neonCat', color: '#aa44ff', glowColor: '#dd88ff', trailColor: '#aa44ff', price: 8000, rarity: 'epic' },
  // ====== THUNDER BIRD SKINS ======
  { id: 'bird-default', name: 'STORM', petId: 'thunderBird', color: '#ffff00', glowColor: '#ffffff', trailColor: '#ffff00', price: 0, rarity: 'common' },
  { id: 'bird-plasma', name: 'PLASMA', petId: 'thunderBird', color: ORANGE, glowColor: YELLOW, trailColor: ORANGE, price: 2400, rarity: 'rare' },
  { id: 'bird-void', name: 'VOID STORM', petId: 'thunderBird', color: '#8800ff', glowColor: MAGENTA, trailColor: '#8800ff', price: 9000, rarity: 'epic' },
  // ====== ICE FOX SKINS ======
  { id: 'fox-default', name: 'FROST', petId: 'iceFox', color: '#88eeff', glowColor: '#ffffff', trailColor: '#88eeff', price: 0, rarity: 'common' },
  { id: 'fox-arctic', name: 'ARCTIC', petId: 'iceFox', color: '#ffffff', glowColor: '#ccffff', trailColor: '#ffffff', price: 4000, rarity: 'rare' },
  { id: 'fox-aurora', name: 'AURORA', petId: 'iceFox', color: '#44ff88', glowColor: '#88ffcc', trailColor: '#44ff88', price: 12000, rarity: 'legendary', effect: 'rainbow' },
  // ====== MAGMA SNAIL SKINS ======
  { id: 'snail-default', name: 'LAVA', petId: 'magmaSnail', color: '#ff4400', glowColor: '#ff8844', trailColor: '#ff4400', price: 0, rarity: 'common' },
  { id: 'snail-obsidian', name: 'OBSIDIAN', petId: 'magmaSnail', color: '#333344', glowColor: '#666688', trailColor: '#333344', price: 7000, rarity: 'rare' },
  { id: 'snail-infernal', name: 'INFERNAL', petId: 'magmaSnail', color: '#ff0000', glowColor: '#ffaa00', trailColor: '#ff0000', price: 20000, rarity: 'legendary', effect: 'fire' },
  // ====== COSMIC OWL SKINS ======
  { id: 'owl-default', name: 'NEBULA', petId: 'cosmicOwl', color: '#aa44ff', glowColor: '#dd88ff', trailColor: '#aa44ff', price: 0, rarity: 'common' },
  { id: 'owl-stellar', name: 'STELLAR', petId: 'cosmicOwl', color: '#ffdd44', glowColor: '#ffffff', trailColor: '#ffdd44', price: 12000, rarity: 'rare' },
  { id: 'owl-eternity', name: 'ETERNITY', petId: 'cosmicOwl', color: '#ffffff', glowColor: '#ff44ff', trailColor: '#ffffff', price: 35000, rarity: 'legendary', effect: 'rainbow' },
];

export interface PetState {
  x: number; y: number;
  vx: number; vy: number;
  health: number; maxHealth: number;
  type: PetType;
  skinColor: string; skinGlow: string;
  shootCooldown: number;
  animFrame: number;
  grounded: boolean;
  facing: 1 | -1;
  invincible: number;
  expression: SparkExpression;
  active: boolean;
  respawnTimer: number;
}

// ====== GANG MEMBER DEFINITIONS ======
export interface GangMember {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  ability: string;
  joinChapter: number;
  active: boolean;
  health: number;
  maxHealth: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  animFrame: number;
  shootCooldown: number;
  grounded: boolean;
  invincible: number;
  expression: SparkExpression;
}

export const GANG_MEMBERS: Omit<GangMember, 'x' | 'y' | 'vx' | 'vy' | 'facing' | 'animFrame' | 'shootCooldown' | 'grounded' | 'invincible' | 'expression'>[] = [
  { id: 'shadow', name: 'SHADOW', color: '#8800ff', glowColor: '#aa44ff', ability: 'Stealth Dash', joinChapter: 2, active: false, health: 80, maxHealth: 80 },
  { id: 'blaze', name: 'BLAZE', color: '#ff4400', glowColor: '#ff8844', ability: 'Fire Burst', joinChapter: 3, active: false, health: 100, maxHealth: 100 },
  { id: 'volt', name: 'VOLT', color: '#ffff00', glowColor: '#ffff88', ability: 'Lightning Strike', joinChapter: 4, active: false, health: 70, maxHealth: 70 },
  { id: 'ice', name: 'ICE', color: '#44ddff', glowColor: '#88eeff', ability: 'Freeze Blast', joinChapter: 5, active: false, health: 90, maxHealth: 90 },
];

// ====== SKIN DEFINITIONS ======
export interface SkinDef {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  trailColor: string;
  price: number; // 0 = free, >0 = coin cost
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockLevel?: number;
  effect?: string;
}

export const SKINS: SkinDef[] = [
  // ====== COMMON SKINS ======
  { id: 'default', name: 'BLUE', color: CYAN, glowColor: CYAN, trailColor: CYAN, price: 0, rarity: 'common' },
  { id: 'neon-green', name: 'TOXIC', color: LIME, glowColor: LIME, trailColor: LIME, price: 0, rarity: 'common', unlockLevel: 3 },
  // ====== RARE SKINS (2x original prices) ======
  { id: 'fire-red', name: 'BLAZE', color: RED, glowColor: ORANGE, trailColor: ORANGE, price: 5000, rarity: 'rare' },
  { id: 'royal-purple', name: 'ROYAL', color: PURPLE, glowColor: MAGENTA, trailColor: MAGENTA, price: 5000, rarity: 'rare', unlockLevel: 6 },
  { id: 'crimson', name: 'CRIMSON', color: '#ff2222', glowColor: '#ff6644', trailColor: '#ff2222', price: 3000, rarity: 'rare' },
  { id: 'emerald', name: 'EMERALD', color: '#00cc66', glowColor: '#44ff88', trailColor: '#00cc66', price: 3000, rarity: 'rare' },
  { id: 'sapphire', name: 'SAPPHIRE', color: '#2266ff', glowColor: '#4488ff', trailColor: '#2266ff', price: 3000, rarity: 'rare' },
  // ====== EPIC SKINS (2x original prices) ======
  { id: 'gold', name: 'GOLDEN', color: GOLD, glowColor: YELLOW, trailColor: YELLOW, price: 15000, rarity: 'epic' },
  { id: 'shadow', name: 'PHANTOM', color: '#4444ff', glowColor: '#8888ff', trailColor: PURPLE, price: 15000, rarity: 'epic', unlockLevel: 10 },
  { id: 'sunset', name: 'SUNSET', color: '#ff8800', glowColor: '#ffaa44', trailColor: '#ff8800', price: 10000, rarity: 'epic' },
  { id: 'arctic', name: 'ARCTIC', color: '#88ddff', glowColor: '#ffffff', trailColor: '#88ddff', price: 10000, rarity: 'epic' },
  { id: 'venom', name: 'VENOM', color: '#88ff00', glowColor: '#aaff44', trailColor: '#88ff00', price: 10000, rarity: 'epic' },
  { id: 'neon-pink', name: 'NEON PINK', color: '#ff44aa', glowColor: '#ff88cc', trailColor: '#ff44aa', price: 18000, rarity: 'epic' },
  // ====== LEGENDARY SKINS (2x original prices) ======
  { id: 'rainbow', name: 'PRISM', color: WHITE, glowColor: MAGENTA, trailColor: CYAN, price: 30000, rarity: 'legendary', effect: 'rainbow' },
  { id: 'diamond', name: 'DIAMOND', color: '#88ffff', glowColor: WHITE, trailColor: CYAN, price: 40000, rarity: 'legendary', effect: 'sparkle' },
  { id: 'obsidian', name: 'OBSIDIAN', color: '#333344', glowColor: '#666688', trailColor: '#333344', price: 30000, rarity: 'legendary', effect: 'shadow' },
  { id: 'plasma', name: 'PLASMA', color: '#ff44ff', glowColor: '#ff88ff', trailColor: '#ff44ff', price: 30000, rarity: 'legendary', effect: 'plasma' },
  { id: 'celestial', name: 'CELESTIAL', color: '#ffdd44', glowColor: '#ffffff', trailColor: '#ffdd44', price: 40000, rarity: 'legendary', effect: 'holy' },
  { id: 'abyssal', name: 'ABYSSAL', color: '#220044', glowColor: '#440088', trailColor: '#220044', price: 50000, rarity: 'legendary', effect: 'abyss' },
  { id: 'cyber', name: 'CYBER', color: '#00ffaa', glowColor: '#44ffcc', trailColor: '#00ffaa', price: 50000, rarity: 'legendary', effect: 'glitch' },
];

// ====== SKILL SYSTEM ======
export type SkillElement = 'fire' | 'frost' | 'shadow' | 'summon' | 'death' | 'lightning' | 'void' | 'blood';

export type SkillUnlockMethod = 'boss' | 'chest' | 'purchase' | 'ad' | 'level' | 'story';

// ====== SKILL UPGRADE SYSTEM ======
export interface SkillUpgrade {
  skillId: string;
  level: number; // 1-5, starts at 1
  damageMultiplier: number; // 1.0, 1.2, 1.5, 1.8, 2.2
  cooldownMultiplier: number; // 1.0, 0.9, 0.8, 0.7, 0.6
}

export const SKILL_UPGRADE_DAMAGE = [1.0, 1.2, 1.5, 1.8, 2.2];
export const SKILL_UPGRADE_COOLDOWN = [1.0, 0.9, 0.8, 0.7, 0.6];
export const SKILL_UPGRADE_COSTS = [0, 1500, 3000, 5400, 10500]; // Level 1=free, 2=1500, 3=3000, 4=5400, 5=10500
export const SKILL_UPGRADE_AD = [false, false, true, true, true]; // Level 3+ requires watching an ad
export const MAX_SKILL_LEVEL = 5;

// ====== DAILY REWARD SYSTEM ======
export interface DailyReward {
  day: number; // 1-7 (resets weekly)
  coins: number;
  item?: string; // skinId, petId, or skillId
  type: 'coins' | 'skin' | 'pet' | 'skill';
}

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 50, type: 'coins' },
  { day: 2, coins: 100, type: 'coins' },
  { day: 3, coins: 150, type: 'coins' },
  { day: 4, coins: 200, type: 'coins' },
  { day: 5, coins: 300, type: 'coins' },
  { day: 6, coins: 500, type: 'coins' },
  { day: 7, coins: 1000, type: 'coins' },
];

export interface SkillDef {
  id: string;
  name: string;
  element: SkillElement;
  description: string;
  damage: number;
  cooldown: number; // frames
  duration: number; // frames the effect lasts
  color: string;
  glowColor: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockMethod: SkillUnlockMethod;
  unlockCost: number; // coins, or 0 for free/unlock-based
  unlockLevel?: number; // level requirement
  unlockBoss?: string; // which boss must be killed
  effectType: 'projectile' | 'aoe' | 'buff' | 'summon' | 'beam' | 'wave';
  effectRadius?: number; // for aoe/wave
  projectileCount?: number; // for projectile types
  summonCount?: number; // for summon types
}

export const SKILL_DEFS: SkillDef[] = [
  // ====== FIRE SKILLS ======
  { id: 'fireball', name: 'FIREBALL', element: 'fire', description: 'Launch a devastating fireball that explodes on impact, dealing area damage to all nearby enemies.', damage: 25, cooldown: 180, duration: 30, color: '#ff4400', glowColor: '#ff8844', rarity: 'common', unlockMethod: 'level', unlockCost: 0, unlockLevel: 2, effectType: 'projectile', projectileCount: 1 },
  { id: 'fireStorm', name: 'FIRE STORM', element: 'fire', description: 'Rain fire from above! Multiple fireballs cascade across the battlefield, creating a devastating inferno.', damage: 40, cooldown: 360, duration: 60, color: '#ff2200', glowColor: '#ff6600', rarity: 'rare', unlockMethod: 'boss', unlockCost: 0, unlockBoss: 'bossRedKing', effectType: 'aoe', effectRadius: 200 },
  { id: 'inferno', name: 'INFERNO', element: 'fire', description: 'Unleash the ultimate fire technique. A massive pillar of flame erupts from the ground, incinerating everything.', damage: 60, cooldown: 480, duration: 90, color: '#ff0000', glowColor: '#ffaa00', rarity: 'legendary', unlockMethod: 'ad', unlockCost: 4000, effectType: 'beam', effectRadius: 150 },

  // ====== FROST SKILLS ======
  { id: 'iceShard', name: 'ICE SHARD', element: 'frost', description: 'Fire razor-sharp ice shards that pierce through enemies and slow their movement.', damage: 20, cooldown: 150, duration: 60, color: '#88eeff', glowColor: '#ffffff', rarity: 'common', unlockMethod: 'level', unlockCost: 0, unlockLevel: 5, effectType: 'projectile', projectileCount: 3 },
  { id: 'blizzard', name: 'BLIZZARD', element: 'frost', description: 'Summon a raging blizzard that freezes all enemies in a wide area.', damage: 35, cooldown: 300, duration: 90, color: '#44ddff', glowColor: '#ffffff', rarity: 'rare', unlockMethod: 'chest', unlockCost: 1800, effectType: 'aoe', effectRadius: 250 },
  { id: 'absoluteZero', name: 'ABSOLUTE ZERO', element: 'frost', description: 'Flash-freeze the entire battlefield, stopping ALL enemies in their tracks.', damage: 50, cooldown: 600, duration: 120, color: '#ffffff', glowColor: '#88eeff', rarity: 'legendary', unlockMethod: 'ad', unlockCost: 5000, effectType: 'aoe', effectRadius: 500 },

  // ====== SHADOW SKILLS ======
  { id: 'shadowStep', name: 'SHADOW STEP', element: 'shadow', description: 'Teleport behind the nearest enemy and strike from the shadows. Grants brief invincibility.', damage: 30, cooldown: 200, duration: 20, color: '#8800ff', glowColor: '#aa44ff', rarity: 'common', unlockMethod: 'level', unlockCost: 0, unlockLevel: 8, effectType: 'buff' },
  { id: 'shadowClone', name: 'SHADOW CLONE', element: 'shadow', description: 'Create shadow clones that fight alongside you and draw enemy fire.', damage: 15, cooldown: 360, duration: 180, color: '#6600cc', glowColor: '#9933ff', rarity: 'epic', unlockMethod: 'boss', unlockCost: 0, unlockBoss: 'bossCorrupted', effectType: 'summon', summonCount: 2 },
  { id: 'voidWalk', name: 'VOID WALK', element: 'shadow', description: 'Enter the void dimension, becoming invisible and invincible. Next attack deals 3x damage.', damage: 45, cooldown: 480, duration: 60, color: '#4400aa', glowColor: '#8800ff', rarity: 'legendary', unlockMethod: 'ad', unlockCost: 4000, effectType: 'buff' },

  // ====== SUMMONING SKILLS ======
  { id: 'summonWraith', name: 'SUMMON WRAITH', element: 'summon', description: 'Summon a spectral wraith that hunts down enemies and drains their life force.', damage: 12, cooldown: 240, duration: 200, color: '#aa00ff', glowColor: '#ff00ff', rarity: 'common', unlockMethod: 'purchase', unlockCost: 1200, effectType: 'summon', summonCount: 1 },
  { id: 'summonLegion', name: 'SUMMON LEGION', element: 'summon', description: 'Raise an army of shadow soldiers that charge forward, overwhelming enemies with numbers.', damage: 20, cooldown: 420, duration: 180, color: '#8800cc', glowColor: '#cc44ff', rarity: 'epic', unlockMethod: 'boss', unlockCost: 0, unlockBoss: 'bossMechGolem', effectType: 'summon', summonCount: 5 },
  { id: 'summonDeathKnight', name: 'DEATH KNIGHT', element: 'summon', description: 'Summon the legendary Death Knight, an unstoppable warrior that cleaves through enemies.', damage: 35, cooldown: 600, duration: 240, color: '#440066', glowColor: '#8800aa', rarity: 'legendary', unlockMethod: 'ad', unlockCost: 6000, effectType: 'summon', summonCount: 1 },

  // ====== DEATH SKILLS ======
  { id: 'deathTouch', name: 'DEATH TOUCH', element: 'death', description: 'Channel the power of death. A close-range touch that instantly kills weaker enemies.', damage: 50, cooldown: 300, duration: 15, color: '#330033', glowColor: '#660066', rarity: 'rare', unlockMethod: 'chest', unlockCost: 2400, effectType: 'beam' },
  { id: 'soulHarvest', name: 'SOUL HARVEST', element: 'death', description: 'Reap the souls of nearby enemies, dealing damage and healing yourself for each hit.', damage: 30, cooldown: 360, duration: 45, color: '#220022', glowColor: '#550055', rarity: 'epic', unlockMethod: 'boss', unlockCost: 0, unlockBoss: 'bossFather', effectType: 'aoe', effectRadius: 200 },
  { id: 'annihilation', name: 'ANNIHILATION', element: 'death', description: 'Obliterate everything in a massive radius. Non-boss enemies are instantly killed.', damage: 999, cooldown: 900, duration: 30, color: '#110011', glowColor: '#330033', rarity: 'legendary', unlockMethod: 'ad', unlockCost: 10000, effectType: 'aoe', effectRadius: 400 },

  // ====== LIGHTNING SKILLS ======
  { id: 'lightningBolt', name: 'LIGHTNING BOLT', element: 'lightning', description: 'Strike enemies with a bolt of lightning that chains between nearby targets.', damage: 22, cooldown: 160, duration: 20, color: '#ffff00', glowColor: '#ffffff', rarity: 'common', unlockMethod: 'level', unlockCost: 0, unlockLevel: 12, effectType: 'projectile', projectileCount: 1 },
  { id: 'thunderStorm', name: 'THUNDER STORM', element: 'lightning', description: 'Call down a devastating thunder storm that repeatedly strikes the battlefield.', damage: 38, cooldown: 350, duration: 90, color: '#ffff44', glowColor: '#ffffff', rarity: 'epic', unlockMethod: 'purchase', unlockCost: 3600, effectType: 'aoe', effectRadius: 300 },

  // ====== VOID SKILLS ======
  { id: 'voidBlast', name: 'VOID BLAST', element: 'void', description: 'Fire a concentrated blast of void energy that tears through enemies and distorts reality.', damage: 28, cooldown: 200, duration: 40, color: '#ff00ff', glowColor: '#ff44ff', rarity: 'rare', unlockMethod: 'level', unlockCost: 0, unlockLevel: 20, effectType: 'projectile', projectileCount: 1 },
  { id: 'voidRift', name: 'VOID RIFT', element: 'void', description: 'Tear open a rift in reality that continuously damages and slows all enemies within.', damage: 20, cooldown: 400, duration: 150, color: '#cc00cc', glowColor: '#ff44ff', rarity: 'epic', unlockMethod: 'boss', unlockCost: 0, unlockBoss: 'bossDragon', effectType: 'aoe', effectRadius: 180 },

  // ====== BLOOD SKILLS ======
  { id: 'bloodStrike', name: 'BLOOD STRIKE', element: 'blood', description: 'Sacrifice health to deal massive damage. The lower your health, the more damage this deals.', damage: 35, cooldown: 180, duration: 15, color: '#cc0000', glowColor: '#ff3333', rarity: 'rare', unlockMethod: 'purchase', unlockCost: 1500, effectType: 'projectile', projectileCount: 1 },
  { id: 'bloodFury', name: 'BLOOD FURY', element: 'blood', description: 'Enter a blood rage that massively increases attack speed and damage, but drains health.', damage: 0, cooldown: 420, duration: 180, color: '#990000', glowColor: '#ff0000', rarity: 'epic', unlockMethod: 'boss', unlockCost: 0, unlockBoss: 'bossPhoenix', effectType: 'buff' },
];

export interface SkillState {
  id: string;
  cooldownTimer: number;
  activeTimer: number;
  isActive: boolean;
}

// ====== STORY / MISSION DEFINITIONS ======
export interface StoryMission {
  id: string;
  chapter: number;
  chapterName: string;
  missionName: string;
  description: string;
  type: 'fight' | 'rescue' | 'protect' | 'boss' | 'escape';
  cutsceneBefore?: CutsceneData;
  cutsceneAfter?: CutsceneData;
  levelData: LevelDef;
  reward: { coins: number; skinId?: string; gangMemberId?: string };
}

// ====== CUTSCENE TYPES ======
export type CutsceneSceneType =
  | 'cityPan' | 'kidnapping' | 'blueWakes' | 'blueAngry'
  | 'shadowAppears' | 'handshake' | 'gangForming'
  | 'lunaCaptured' | 'blueSeesLuna'
  | 'motherThreat' | 'protectMother'
  | 'bossIntro' | 'bossDefeated'
  | 'reunion' | 'victoryCelebration'
  | 'revive' | 'gangJoin'
  | 'walking' | 'warScene'
  // Deep story scenes (every 10 levels)
  | 'darkRevelation' | 'betrayal' | 'flashback' | 'lunaVision'
  | 'shadowPast' | 'motherSecret' | 'redKingPlan' | 'gangOath'
  | 'voidRift' | 'mysteryFigure' | 'sacrifice' | 'truthRevealed'
  | 'darkCorridor' | 'explosion' | 'silentPrayer' | 'stormApproaching'
  | 'hiddenBase' | 'theDeal' | 'lastStand' | 'newDawn';

export interface CutsceneFrame {
  scene: CutsceneSceneType;
  dialogue: string;
  speaker: string;
  speakerColor: string;
  duration: number;
}

export interface CutsceneData {
  id: string;
  frames: CutsceneFrame[];
}

// ====== VECTOR / ENTITY TYPES ======
export interface Vector2 { x: number; y: number; }

export interface PlayerState {
  x: number; y: number; width: number; height: number;
  vx: number; vy: number;
  health: number; maxHealth: number;
  facing: 1 | -1;
  grounded: boolean;
  shootCooldown: number;
  animFrame: number;
  animTimer: number;
  invincible: number;
  expression: SparkExpression;
  isMoving: boolean;
  isShooting: boolean;
  shootTimer: number;
  dashCooldown: number; dashTimer: number; isDashing: boolean;
  shieldCooldown: number; shieldTimer: number; isShielding: boolean;
  specialCooldown: number; specialTimer: number; isUsingSpecial: boolean;
  jumpCount: number; maxJumps: number;
  kills: number; combo: number; comboTimer: number;
  skinColor: string; skinGlow: string; skinTrail: string; skinEffect?: string;
  equippedSkills: string[]; // up to 3 skill slots: [1,2,3] mapped to keys 1,2,3
  skillStates: SkillState[];
}

export type EnemyType = 'drone' | 'glitchWalker' | 'voidGuardian' | 'boss' | 'bossRedKing' | 'bossShadow' | 'bossTitan' | 'eliteDrone' | 'heavyWalker' | 'bossCorrupted' | 'dragon' | 'bossDragon' | 'phoenix' | 'bossPhoenix' | 'mechGolem' | 'bossMechGolem' | 'shadowAssassin' | 'bossFather' | 'bossTwin' | 'voidBat' | 'stormEagle' | 'emberWisp' | 'frostWraith' | 'shadowDrake' | 'plasmaSerpent' | 'neonWyrm' | 'crystalMoth' | 'zombie' | 'giant' | 'necromancer' | 'bomber';

export interface EnemyState {
  x: number; y: number; width: number; height: number;
  vx: number; vy: number;
  type: EnemyType;
  health: number; maxHealth: number;
  facing: 1 | -1;
  shootCooldown: number;
  animFrame: number; animTimer: number;
  active: boolean;
  grounded: boolean;
  patternTimer: number;
  invincible: number;
  isHit: boolean;
  hitTimer: number;
  bossName?: string;
  bossColor?: string;
  enraged?: boolean;
  isAmbient?: boolean; // Ambient/patrol enemy spawned between waves
}

export interface Bullet {
  x: number; y: number; vx: number; vy: number;
  fromPlayer: boolean;
  damage: number;
  active: boolean;
  color: string;
  radius: number;
  isSpecial?: boolean;
  fromGangMember?: string;
  fromPet?: boolean;
  fromPlayerId?: 1 | 2; // For versus mode: which player shot this
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

export interface Platform {
  x: number; y: number; width: number; height: number;
  type: 'static' | 'moving';
  moveRange?: number; moveSpeed?: number; moveAxis?: 'x' | 'y'; moveOffset?: number;
}

export interface VoiceLine { text: string; color: string; duration: number; }

export interface WaveDef {
  enemies: { x: number; y: number; type: EnemyType; bossName?: string; bossColor?: string }[];
  voiceLine?: string;
}

export interface EnvironmentalObject {
  x: number; y: number;
  type: 'neonSign' | 'brokenPillar' | 'glitchCrystal' | 'voidRift' | 'dataStream';
}

export type WeatherType = 'none' | 'rain' | 'snow' | 'glitch' | 'embers' | 'voidParticles';

// ====== SEASON / ENVIRONMENT SYSTEM ======
export type SeasonType = 'neonCity' | 'scorchedWasteland' | 'frozenTundra' | 'shadowRealm' | 'volcanicCore' | 'crystalCaves' | 'voidDimension' | 'cyberForest' | 'stormPlains' | 'bloodMoon';

export function getSeasonForLevel(level: number): SeasonType {
  if (level <= 10) return 'neonCity';
  if (level <= 20) return 'scorchedWasteland';
  if (level <= 30) return 'frozenTundra';
  if (level <= 40) return 'shadowRealm';
  if (level <= 50) return 'volcanicCore';
  if (level <= 60) return 'crystalCaves';
  if (level <= 70) return 'voidDimension';
  if (level <= 80) return 'cyberForest';
  if (level <= 90) return 'stormPlains';
  if (level <= 100) return 'bloodMoon';
  // After level 100, cycle through with variations
  const cycle = (level - 101) % 10;
  const seasons: SeasonType[] = ['neonCity', 'scorchedWasteland', 'frozenTundra', 'shadowRealm', 'volcanicCore', 'crystalCaves', 'voidDimension', 'cyberForest', 'stormPlains', 'bloodMoon'];
  return seasons[cycle];
}

export interface SeasonVisuals {
  skyColor: string;
  skyGradient: string[];
  groundColor: string;
  platformColor: string;
  platformGlow: string;
  particleColor: string;
  weatherType: WeatherType;
  ambientDescription: string;
}

export function getSeasonVisuals(season: SeasonType): SeasonVisuals {
  switch (season) {
    case 'neonCity':
      return { skyColor: '#020210', skyGradient: ['#020210', '#040418', '#020212'], groundColor: '#000a0a', platformColor: '#000a0a', platformGlow: CYAN, particleColor: CYAN, weatherType: 'rain', ambientDescription: 'The neon city pulses with digital energy' };
    case 'scorchedWasteland':
      return { skyColor: '#080300', skyGradient: ['#080300', '#0c0500', '#060200'], groundColor: '#0a0500', platformColor: '#0a0500', platformGlow: ORANGE, particleColor: ORANGE, weatherType: 'embers', ambientDescription: 'The wasteland burns under a dying sun' };
    case 'frozenTundra':
      return { skyColor: '#010408', skyGradient: ['#010408', '#030810', '#02060a'], groundColor: '#000810', platformColor: '#000810', platformGlow: '#88eeff', particleColor: '#88eeff', weatherType: 'snow', ambientDescription: 'Ice covers everything in this frozen digital tundra' };
    case 'shadowRealm':
      return { skyColor: '#050008', skyGradient: ['#050008', '#080012', '#040006'], groundColor: '#050008', platformColor: '#080010', platformGlow: PURPLE, particleColor: PURPLE, weatherType: 'glitch', ambientDescription: 'Shadows twist and writhe in this corrupted realm' };
    case 'volcanicCore':
      return { skyColor: '#080000', skyGradient: ['#080000', '#0c0200', '#060000'], groundColor: '#0a0200', platformColor: '#0a0200', platformGlow: RED, particleColor: RED, weatherType: 'embers', ambientDescription: 'Molten data flows through the volcanic core' };
    case 'crystalCaves':
      return { skyColor: '#000a08', skyGradient: ['#000a08', '#000c0a', '#000605'], groundColor: '#000a08', platformColor: '#000a08', platformGlow: LIME, particleColor: LIME, weatherType: 'none', ambientDescription: 'Crystals hum with ancient power' };
    case 'voidDimension':
      return { skyColor: '#060006', skyGradient: ['#060006', '#0a000a', '#030003'], groundColor: '#050008', platformColor: '#050008', platformGlow: MAGENTA, particleColor: MAGENTA, weatherType: 'voidParticles', ambientDescription: 'Reality fractures in the void dimension' };
    case 'cyberForest':
      return { skyColor: '#000805', skyGradient: ['#000805', '#000c08', '#000403'], groundColor: '#000c08', platformColor: '#000c08', platformGlow: '#00ff66', particleColor: '#00ff66', weatherType: 'rain', ambientDescription: 'Digital trees pulse with living code' };
    case 'stormPlains':
      return { skyColor: '#080800', skyGradient: ['#080800', '#0a0a04', '#060600'], groundColor: '#080800', platformColor: '#080800', platformGlow: YELLOW, particleColor: YELLOW, weatherType: 'glitch', ambientDescription: 'Lightning tears across the storm plains' };
    case 'bloodMoon':
      return { skyColor: '#080002', skyGradient: ['#080002', '#0c0004', '#060001'], groundColor: '#080002', platformColor: '#080002', platformGlow: '#cc0033', particleColor: '#cc0033', weatherType: 'embers', ambientDescription: 'The blood moon watches. Everything ends here.' };
  }
}

// Flying enemy types for quick lookup
export const FLYING_ENEMY_TYPES: EnemyType[] = ['voidBat', 'stormEagle', 'emberWisp', 'frostWraith', 'shadowDrake', 'plasmaSerpent', 'neonWyrm', 'crystalMoth', 'dragon', 'phoenix'];

export function isFlyingEnemy(type: EnemyType): boolean {
  return FLYING_ENEMY_TYPES.includes(type);
}

export interface LevelDef {
  id: number; name: string; chapter: string;
  width: number; height: number;
  playerSpawn: Vector2;
  platforms: Platform[];
  waves: WaveDef[];
  bossWave?: WaveDef;
  background: 'grid' | 'corrupted' | 'firewall' | 'void' | 'core' | 'city' | 'warehouse' | 'rooftop';
  introText: string;
  introColor: string;
  missionType: 'fight' | 'rescue' | 'protect' | 'boss' | 'escape';
  gangMembersAvailable: string[];
  isProcedural?: boolean;
  environmentalObjects?: EnvironmentalObject[];
  weatherType?: WeatherType;
}

export interface JoystickInput { active: boolean; dx: number; dy: number; }

// ====== VERSUS MODE ARENA ======
export const VERSUS_ARENA: LevelDef = {
  id: -1,
  name: 'VERSUS ARENA',
  chapter: 'VS',
  width: 1200,
  height: 600,
  playerSpawn: { x: 100, y: 460 },
  platforms: [
    // Main ground
    { x: 0, y: 520, width: 1200, height: 40, type: 'static' },
    // Left platform
    { x: 80, y: 380, width: 150, height: 16, type: 'static' },
    // Center-left platform
    { x: 320, y: 320, width: 130, height: 16, type: 'static' },
    // Center platform (moving)
    { x: 500, y: 260, width: 120, height: 16, type: 'moving', moveRange: 80, moveSpeed: 1, moveAxis: 'x', moveOffset: 0 },
    // Center-right platform
    { x: 700, y: 320, width: 130, height: 16, type: 'static' },
    // Right platform
    { x: 920, y: 380, width: 150, height: 16, type: 'static' },
    // Small upper platforms
    { x: 200, y: 220, width: 80, height: 16, type: 'static' },
    { x: 880, y: 220, width: 80, height: 16, type: 'static' },
    // Top center
    { x: 520, y: 160, width: 100, height: 16, type: 'static' },
  ],
  waves: [], // No enemies in versus
  background: 'core',
  introText: 'FIGHT!',
  introColor: GOLD,
  missionType: 'fight',
  gangMembersAvailable: [],
};

// ====== RANKING SYSTEM ======
export interface RankingData {
  elo: number;
  wins: number;
  losses: number;
}

export const DEFAULT_RANKING: RankingData = {
  elo: 1000,
  wins: 0,
  losses: 0,
};

export const RANK_THRESHOLDS = [
  { rank: 'Bronze', min: 0, icon: '\u{1F949}' },
  { rank: 'Silver', min: 1000, icon: '\u{1F948}' },
  { rank: 'Gold', min: 1200, icon: '\u{1F947}' },
  { rank: 'Platinum', min: 1400, icon: '\u{1F48E}' },
  { rank: 'Diamond', min: 1600, icon: '\u{1F4A0}' },
  { rank: 'Master', min: 2000, icon: '\u{1F451}' },
] as const;

export function getRankForElo(elo: number): { rank: string; icon: string } {
  let result = RANK_THRESHOLDS[0];
  for (const t of RANK_THRESHOLDS) {
    if (elo >= t.min) result = t;
  }
  return { rank: result.rank, icon: result.icon };
}

// ====== SAVE DATA ======
export interface SaveData {
  currentChapter: number;
  highestLevel: number;
  totalCoins: number;
  totalScore: number;
  unlockedSkins: string[];
  currentSkin: string;
  currentPet: PetType;
  unlockedPets: PetType[];
  currentPetSkin: string;
  unlockedPetSkins: string[];
  gangMembersUnlocked: string[];
  missionsCompleted: string[];
  endlessHighScore: number;
  endlessHighestWave: number;
  totalKills: number;
  totalDeaths: number;
  lastSaveTime: number;
  rankingData: RankingData;
  username: string;
  avatar: string;
  about: string;
  nationality: string;
  unlockedSkills: string[];
  equippedSkills: string[];
  skillUpgrades: Record<string, number>; // skillId -> level (1-5)
  lastDailyRewardDay: string; // ISO date string "2026-05-09"
  dailyRewardStreak: number; // 1-7
  levelStars: Record<string, number>; // levelId -> star count (1-3)
  weaponUpgrades: Record<string, number>; // weapon upgrade type -> level
}

export const DEFAULT_SAVE: SaveData = {
  currentChapter: 1,
  highestLevel: 1,
  totalCoins: 0,
  totalScore: 0,
  unlockedSkins: ['default'],
  currentSkin: 'default',
  currentPet: 'neonWolf',
  unlockedPets: ['neonWolf'],
  currentPetSkin: 'wolf-default',
  unlockedPetSkins: ['wolf-default'],
  gangMembersUnlocked: [],
  missionsCompleted: [],
  endlessHighScore: 0,
  endlessHighestWave: 0,
  totalKills: 0,
  totalDeaths: 0,
  lastSaveTime: 0,
  rankingData: { ...DEFAULT_RANKING },
  username: 'NeonWarrior',
  avatar: '⚔️',
  about: '',
  nationality: '',
  unlockedSkills: [],
  equippedSkills: ['', '', ''],
  skillUpgrades: {},
  lastDailyRewardDay: '',
  dailyRewardStreak: 0,
  levelStars: {},
  weaponUpgrades: {},
};

// ====== ALL STORY MISSIONS / LEVELS ======
export const LEVELS: LevelDef[] = [
  // ====== CHAPTER 1: THE AWAKENING ======
  {
    id: 1, name: 'THE AWAKENING', chapter: 'CH.1',
    width: 2500, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 2500, height: 40, type: 'static' },
      { x: 300, y: 400, width: 120, height: 16, type: 'static' },
      { x: 550, y: 340, width: 100, height: 16, type: 'static' },
      { x: 850, y: 380, width: 150, height: 16, type: 'static' },
      { x: 1200, y: 350, width: 120, height: 16, type: 'static' },
      { x: 1600, y: 400, width: 130, height: 16, type: 'static' },
      { x: 1900, y: 340, width: 100, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 400, y: 480, type: 'drone' }, { x: 600, y: 480, type: 'drone' }], voiceLine: 'Who took her... I\'ll find out.' },
      { enemies: [{ x: 800, y: 480, type: 'drone' }, { x: 950, y: 480, type: 'glitchWalker' }, { x: 1050, y: 480, type: 'drone' }], voiceLine: 'More of them. Good. I\'m angry.' },
      { enemies: [{ x: 1400, y: 480, type: 'glitchWalker' }, { x: 1550, y: 480, type: 'glitchWalker' }, { x: 1700, y: 480, type: 'drone' }], voiceLine: 'Luna... I\'m coming.' },
      { enemies: [{ x: 2000, y: 480, type: 'glitchWalker' }, { x: 2100, y: 480, type: 'glitchWalker' }, { x: 2200, y: 480, type: 'drone' }, { x: 2300, y: 480, type: 'drone' }], voiceLine: 'This city will remember my name.' },
    ],
    background: 'city',
    introText: 'They took LUNA. Blue wakes up alone in the neon city. The hunt begins.',
    introColor: CYAN,
    missionType: 'fight',
    gangMembersAvailable: [],
  },
  {
    id: 2, name: 'THE STREETS', chapter: 'CH.1',
    width: 2800, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 2800, height: 40, type: 'static' },
      { x: 400, y: 380, width: 120, height: 16, type: 'static' },
      { x: 700, y: 320, width: 100, height: 16, type: 'static' },
      { x: 1100, y: 400, width: 130, height: 16, type: 'static' },
      { x: 1500, y: 350, width: 100, height: 16, type: 'static' },
      { x: 1800, y: 380, width: 120, height: 16, type: 'moving', moveRange: 100, moveSpeed: 1, moveAxis: 'x', moveOffset: 0 },
      { x: 2200, y: 340, width: 100, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 500, y: 480, type: 'drone' }, { x: 700, y: 480, type: 'glitchWalker' }], voiceLine: 'Red King\'s soldiers. Everywhere.' },
      { enemies: [{ x: 1000, y: 480, type: 'glitchWalker' }, { x: 1150, y: 480, type: 'drone' }, { x: 1300, y: 480, type: 'voidGuardian' }], voiceLine: 'A turret. Take it out fast.' },
      { enemies: [{ x: 1700, y: 480, type: 'glitchWalker' }, { x: 1850, y: 480, type: 'glitchWalker' }, { x: 2000, y: 480, type: 'drone' }, { x: 2100, y: 480, type: 'drone' }], voiceLine: 'I need backup...' },
      { enemies: [{ x: 2400, y: 480, type: 'voidGuardian' }, { x: 2550, y: 480, type: 'glitchWalker' }, { x: 2650, y: 480, type: 'drone' }], voiceLine: 'Almost through. Keep pushing.' },
    ],
    background: 'corrupted',
    introText: 'The streets are crawling with Red King\'s men. Fight through.',
    introColor: ORANGE,
    missionType: 'fight',
    gangMembersAvailable: [],
  },
  // ====== CHAPTER 2: THE GANG ======
  {
    id: 3, name: 'MEET SHADOW', chapter: 'CH.2',
    width: 2500, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 2500, height: 40, type: 'static' },
      { x: 300, y: 400, width: 120, height: 16, type: 'static' },
      { x: 600, y: 330, width: 100, height: 16, type: 'static' },
      { x: 900, y: 380, width: 150, height: 16, type: 'static' },
      { x: 1300, y: 350, width: 120, height: 16, type: 'static' },
      { x: 1700, y: 400, width: 130, height: 16, type: 'static' },
      { x: 2100, y: 340, width: 100, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 400, y: 480, type: 'drone' }, { x: 600, y: 480, type: 'drone' }, { x: 750, y: 480, type: 'glitchWalker' }], voiceLine: 'Someone\'s fighting ahead...' },
      { enemies: [{ x: 1100, y: 480, type: 'glitchWalker' }, { x: 1250, y: 480, type: 'voidGuardian' }, { x: 1400, y: 480, type: 'drone' }], voiceLine: 'That fighter... he\'s good.' },
      { enemies: [{ x: 1800, y: 480, type: 'glitchWalker' }, { x: 1900, y: 480, type: 'glitchWalker' }, { x: 2000, y: 480, type: 'drone' }, { x: 2200, y: 480, type: 'voidGuardian' }], voiceLine: 'Together we\'re unstoppable.' },
    ],
    background: 'warehouse',
    introText: 'A lone fighter stands against Red King\'s army. His name is SHADOW.',
    introColor: PURPLE,
    missionType: 'fight',
    gangMembersAvailable: [],
  },
  {
    id: 4, name: 'THE WAREHOUSE', chapter: 'CH.2',
    width: 3000, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 3000, height: 40, type: 'static' },
      { x: 350, y: 380, width: 130, height: 16, type: 'static' },
      { x: 650, y: 320, width: 110, height: 16, type: 'static' },
      { x: 1000, y: 400, width: 120, height: 16, type: 'static' },
      { x: 1400, y: 350, width: 100, height: 16, type: 'moving', moveRange: 100, moveSpeed: 1.5, moveAxis: 'x', moveOffset: 0 },
      { x: 1800, y: 380, width: 130, height: 16, type: 'static' },
      { x: 2200, y: 340, width: 110, height: 16, type: 'static' },
      { x: 2600, y: 390, width: 120, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 500, y: 480, type: 'drone' }, { x: 650, y: 480, type: 'glitchWalker' }], voiceLine: 'Shadow, cover the left!' },
      { enemies: [{ x: 900, y: 480, type: 'glitchWalker' }, { x: 1050, y: 480, type: 'voidGuardian' }, { x: 1200, y: 480, type: 'drone' }], voiceLine: 'Turret up ahead!' },
      { enemies: [{ x: 1600, y: 480, type: 'glitchWalker' }, { x: 1750, y: 480, type: 'glitchWalker' }, { x: 1900, y: 480, type: 'drone' }, { x: 2000, y: 480, type: 'drone' }], voiceLine: 'The Blue Gang doesn\'t quit.' },
      { enemies: [{ x: 2400, y: 480, type: 'voidGuardian' }, { x: 2500, y: 480, type: 'glitchWalker' }, { x: 2600, y: 480, type: 'glitchWalker' }, { x: 2750, y: 480, type: 'drone' }], voiceLine: 'Warehouse is ours.' },
    ],
    background: 'warehouse',
    introText: 'Blue and Shadow raid Red King\'s weapons warehouse.',
    introColor: PURPLE,
    missionType: 'fight',
    gangMembersAvailable: [],
  },
  // ====== CHAPTER 3: THE RESCUE ======
  {
    id: 5, name: 'RESCUE MISSION', chapter: 'CH.3',
    width: 2800, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 2800, height: 40, type: 'static' },
      { x: 400, y: 380, width: 120, height: 16, type: 'static' },
      { x: 700, y: 310, width: 110, height: 16, type: 'static' },
      { x: 1050, y: 390, width: 130, height: 16, type: 'static' },
      { x: 1500, y: 350, width: 100, height: 16, type: 'static' },
      { x: 1800, y: 300, width: 120, height: 16, type: 'moving', moveRange: 120, moveSpeed: 1.5, moveAxis: 'x', moveOffset: 0 },
      { x: 2200, y: 380, width: 100, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 500, y: 480, type: 'glitchWalker' }, { x: 650, y: 480, type: 'glitchWalker' }, { x: 800, y: 480, type: 'voidGuardian' }], voiceLine: 'Luna is close. I can feel it.' },
      { enemies: [{ x: 1100, y: 480, type: 'voidGuardian' }, { x: 1250, y: 480, type: 'glitchWalker' }, { x: 1400, y: 480, type: 'drone' }, { x: 1500, y: 480, type: 'drone' }], voiceLine: 'Nothing stops me now.' },
      { enemies: [{ x: 1900, y: 480, type: 'glitchWalker' }, { x: 2000, y: 480, type: 'glitchWalker' }, { x: 2100, y: 480, type: 'voidGuardian' }], voiceLine: 'Shadow, BLAZE — cover me!' },
    ],
    background: 'firewall',
    introText: 'Luna is held in the Red King\'s fortress. The Blue Gang breaches the walls.',
    introColor: RED,
    missionType: 'rescue',
    gangMembersAvailable: [],
  },
  {
    id: 6, name: 'RED KING\'S THRONE', chapter: 'CH.3',
    width: 2000, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 800, height: 40, type: 'static' },
      { x: 900, y: 520, width: 1100, height: 40, type: 'static' },
      { x: 350, y: 380, width: 120, height: 16, type: 'static' },
      { x: 600, y: 310, width: 100, height: 16, type: 'static' },
      { x: 1200, y: 380, width: 130, height: 16, type: 'static' },
      { x: 1600, y: 330, width: 110, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 500, y: 480, type: 'glitchWalker' }, { x: 650, y: 480, type: 'drone' }], voiceLine: 'The throne room. This is it.' },
    ],
    bossWave: {
      enemies: [{ x: 1500, y: 480, type: 'bossRedKing', bossName: 'RED KING', bossColor: RED }],
      voiceLine: 'RED KING. Let her go. NOW.',
    },
    background: 'core',
    introText: 'The Red King himself. Luna is behind him. This ends now.',
    introColor: MAGENTA,
    missionType: 'boss',
    gangMembersAvailable: [],
  },
  // ====== CHAPTER 4: PROTECT ======
  {
    id: 7, name: 'PROTECT NEON', chapter: 'CH.4',
    width: 2500, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 2500, height: 40, type: 'static' },
      { x: 300, y: 400, width: 120, height: 16, type: 'static' },
      { x: 600, y: 340, width: 100, height: 16, type: 'static' },
      { x: 900, y: 380, width: 130, height: 16, type: 'static' },
      { x: 1200, y: 350, width: 100, height: 16, type: 'static' },
      { x: 1600, y: 400, width: 120, height: 16, type: 'moving', moveRange: 80, moveSpeed: 1.5, moveAxis: 'x', moveOffset: 0 },
      { x: 2000, y: 340, width: 110, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 400, y: 480, type: 'glitchWalker' }, { x: 550, y: 480, type: 'drone' }, { x: 700, y: 480, type: 'drone' }], voiceLine: 'They\'re coming for Mom. NOT happening.' },
      { enemies: [{ x: 1000, y: 480, type: 'voidGuardian' }, { x: 1150, y: 480, type: 'glitchWalker' }, { x: 1300, y: 480, type: 'drone' }, { x: 1400, y: 480, type: 'glitchWalker' }], voiceLine: 'Gang, protect the left flank!' },
      { enemies: [{ x: 1800, y: 480, type: 'glitchWalker' }, { x: 1900, y: 480, type: 'glitchWalker' }, { x: 2000, y: 480, type: 'voidGuardian' }, { x: 2100, y: 480, type: 'drone' }, { x: 2200, y: 480, type: 'drone' }], voiceLine: 'She\'s safe. The Gang protects its own.' },
    ],
    background: 'city',
    introText: 'Red King\'s army attacks Blue\'s mother NEON. Protect her at all costs.',
    introColor: PINK,
    missionType: 'protect',
    gangMembersAvailable: [],
  },
  // ====== CHAPTER 5: THE FINAL WAR ======
  {
    id: 8, name: 'THE FINAL WAR', chapter: 'CH.5',
    width: 3500, height: 600,
    playerSpawn: { x: 80, y: 460 },
    platforms: [
      { x: 0, y: 520, width: 3500, height: 40, type: 'static' },
      { x: 300, y: 380, width: 120, height: 16, type: 'static' },
      { x: 600, y: 310, width: 100, height: 16, type: 'static' },
      { x: 900, y: 380, width: 130, height: 16, type: 'static' },
      { x: 1300, y: 340, width: 110, height: 16, type: 'moving', moveRange: 100, moveSpeed: 2, moveAxis: 'x', moveOffset: 0 },
      { x: 1700, y: 370, width: 120, height: 16, type: 'static' },
      { x: 2100, y: 330, width: 100, height: 16, type: 'static' },
      { x: 2400, y: 380, width: 130, height: 16, type: 'static' },
      { x: 2800, y: 340, width: 110, height: 16, type: 'static' },
    ],
    waves: [
      { enemies: [{ x: 500, y: 480, type: 'glitchWalker' }, { x: 600, y: 480, type: 'drone' }, { x: 700, y: 480, type: 'drone' }, { x: 800, y: 480, type: 'voidGuardian' }], voiceLine: 'The final war. EVERYONE fights!' },
      { enemies: [{ x: 1200, y: 480, type: 'voidGuardian' }, { x: 1350, y: 480, type: 'glitchWalker' }, { x: 1500, y: 480, type: 'glitchWalker' }, { x: 1600, y: 480, type: 'drone' }, { x: 1700, y: 480, type: 'drone' }], voiceLine: 'Blue Gang, UNLEASH!' },
      { enemies: [{ x: 2200, y: 480, type: 'glitchWalker' }, { x: 2300, y: 480, type: 'voidGuardian' }, { x: 2400, y: 480, type: 'glitchWalker' }, { x: 2500, y: 480, type: 'drone' }], voiceLine: 'Push them back!' },
    ],
    bossWave: {
      enemies: [{ x: 3000, y: 480, type: 'bossTitan', bossName: 'THE TITAN', bossColor: '#ff0000' }],
      voiceLine: 'This is for EVERYONE you hurt. OVERLOAD!',
    },
    background: 'core',
    introText: 'THE FINAL WAR. The Blue Gang vs Red King\'s entire army. No retreat.',
    introColor: GOLD,
    missionType: 'boss',
    gangMembersAvailable: [],
  },
];

// ====== PROCEDURAL LEVEL GENERATION ======
export const TOTAL_LEVELS = 22000;

// Chapter-specific story data
const CHAPTER_NAMES: Record<number, string> = {
  6: 'THE INFINITE GRID',
  7: 'DRAGON\'S DOMAIN',
  8: 'MECH WARFARE',
  9: 'SHADOW REALM',
  10: 'PHOENIX RISING',
  11: 'THE VOID AWAKENS',
  12: 'CORRUPTED KINGDOM',
  13: 'NEON APOCALYPSE',
  14: 'THE FINAL FRONTIER',
  15: 'ETERNAL WAR',
};
function getChapterName(ch: number): string {
  if (CHAPTER_NAMES[ch]) return CHAPTER_NAMES[ch];
  return `ZONE ${ch}`;
}

// Story milestone events
const STORY_MILESTONES: Record<number, { text: string; color: string }> = {
  50: { text: '⚔️ MILESTONE: Level 50 — You\'ve proven your worth, warrior!', color: GOLD },
  100: { text: '👑 MILESTONE: Level 100 — The legend grows!', color: GOLD },
  250: { text: '🔥 MILESTONE: Level 250 — Few dare go this far!', color: ORANGE },
  500: { text: '⚡ MILESTONE: Level 500 — You are the Neon Champion!', color: CYAN },
  1000: { text: '💎 MILESTONE: Level 1000 — IMMORTAL status achieved!', color: MAGENTA },
  5000: { text: '🐉 MILESTONE: Level 5000 — The Dragons bow to you!', color: RED },
  10000: { text: '🌟 MILESTONE: Level 10000 — BEYOND LEGENDARY!', color: GOLD },
  22000: { text: '🌠 MILESTONE: Level 22000 — THE END... or is it?', color: '#ffffff' },
};
export function getStoryMilestone(level: number): { text: string; color: string } | null {
  return STORY_MILESTONES[level] || null;
}

// ====== CUTSCENE EVERY 10 LEVELS ======
// Maps level numbers to cutscene IDs for deep story moments
// Story shifted to start at level 10+ (levels 1-9 are tutorial/intro)
const LEVEL_CUTSCENES: Record<number, string> = {
  10: 'ch1-intro',     // Story begins at level 10
  20: 'lv20-luna',
  30: 'ch2-intro',     // Shadow appears
  40: 'lv40-mother',
  50: 'lv50-void',
  60: 'ch3-intro',     // Rescue mission
  70: 'lv70-betrayal',
  80: 'lv80-truth',
  90: 'lv90-final',
  100: 'lv100-turning',
  150: 'ch4-intro',    // Protect Neon
  200: 'ch5-intro',    // Final War
  250: 'lv250-father', // Father appears
};

// Generate cutscenes for levels beyond 100 (procedural story)
export function getCutsceneForLevel(level: number): string | null {
  if (LEVEL_CUTSCENES[level]) return LEVEL_CUTSCENES[level];
  // Beyond level 100, cutscenes every 10 levels with procedural IDs
  if (level > 100 && level % 10 === 1) {
    // Generate a cutscene ID based on chapter
    const chapterNum = Math.floor((level - 1) / 100) + 6;
    return `ch${chapterNum}-zone`;
  }
  // Also show cutscenes at level X0 (every 10th) for levels > 100
  if (level > 100 && level % 10 === 0) {
    return `milestone-lv${level}`;
  }
  return null;
}

// ====== MID-LEVEL SURPRISE EVENTS ======
export type SurpriseType =
  | 'ambush'        // Enemies suddenly spawn behind you
  | 'thugsAppear'   // A gang of thugs blocks your path
  | 'bossSurprise'  // Mini-boss appears unexpectedly
  | 'allyArrives'   // A gang member shows up to help
  | 'trapTriggered' // The ground collapses or walls close in
  | 'voidRift'      // A void rift opens, spawning void creatures
  | 'betrayal'      // An ally turns against you temporarily
  | 'rescue'        // Someone needs saving mid-level
  | 'treasure'      // Unexpected reward appears
  | 'warning'       // Ominous warning about what's coming
  | 'flashback'     // Sudden memory/vision
  | 'earthquake';   // The ground shakes, platforms shift

export interface MidLevelSurprise {
  type: SurpriseType;
  text: string;
  color: string;
  spawnEnemies?: EnemyType[];
  enemyCount?: number;
  duration: number; // frames the surprise lasts
}

// Surprise events at specific levels (shocking moments)
const SURPRISE_EVENTS: Record<number, MidLevelSurprise> = {
  5:  { type: 'ambush', text: 'BEHIND YOU!', color: RED, spawnEnemies: ['glitchWalker', 'drone'], enemyCount: 4, duration: 120 },
  15: { type: 'thugsAppear', text: 'THUGS BLOCKING THE PATH!', color: ORANGE, spawnEnemies: ['glitchWalker'], enemyCount: 5, duration: 120 },
  25: { type: 'allyArrives', text: 'SHADOW: "Need a hand?"', color: PURPLE, spawnEnemies: [], duration: 150 },
  35: { type: 'trapTriggered', text: 'THE FLOOR IS COLLAPSING!', color: RED, spawnEnemies: [], duration: 90 },
  45: { type: 'voidRift', text: 'A VOID RIFT! SOMETHING IS COMING THROUGH!', color: MAGENTA, spawnEnemies: ['voidGuardian'], enemyCount: 3, duration: 120 },
  55: { type: 'betrayal', text: 'WAIT... WHOSE SIDE ARE YOU ON?!', color: ORANGE, spawnEnemies: ['eliteDrone'], enemyCount: 3, duration: 150 },
  65: { type: 'rescue', text: 'SOMEONE IS TRAPPED AHEAD! SAVE THEM!', color: PINK, spawnEnemies: [], duration: 150 },
  75: { type: 'bossSurprise', text: 'A HIDDEN BOSS AWAKENS!', color: RED, spawnEnemies: ['bossCorrupted'], enemyCount: 1, duration: 180 },
  85: { type: 'flashback', text: 'Blue sees his father\'s memory...', color: CYAN, spawnEnemies: [], duration: 120 },
  95: { type: 'earthquake', text: 'THE GRID IS SHAKING! PLATFORMS SHIFTING!', color: GOLD, spawnEnemies: [], duration: 90 },
};

// Get surprise event for a level (also generates for procedural levels)
export function getSurpriseForLevel(level: number): MidLevelSurprise | null {
  // Exact match for predefined surprises
  if (SURPRISE_EVENTS[level]) return SURPRISE_EVENTS[level];

  // For levels 9-100 not covered above, generate based on level number
  if (level >= 9 && level <= 100) {
    // Every level ending in 3, 6, or 9 gets a surprise
    const mod = level % 10;
    if (mod === 3 || mod === 6 || mod === 9) {
      const rng = seedRandom(level + 3333);
      const types: SurpriseType[] = ['ambush', 'thugsAppear', 'trapTriggered', 'allyArrives', 'warning'];
      const type = types[Math.floor(rng() * types.length)];
      const enemyPool: EnemyType[] = level > 20 ? ['voidGuardian', 'glitchWalker'] : ['drone', 'glitchWalker'];
      const texts: Record<SurpriseType, string> = {
        ambush: 'AMBUSH! WATCH YOUR BACK!',
        thugsAppear: 'THUGS BLOCKING THE PATH!',
        bossSurprise: 'A HIDDEN BOSS AWAKENS!',
        allyArrives: 'REINFORCEMENTS ARRIVED!',
        trapTriggered: 'TRAP SPRUNG! BE CAREFUL!',
        voidRift: 'A VOID RIFT TEARS OPEN!',
        betrayal: 'WAIT... WHOSE SIDE ARE YOU ON?!',
        rescue: 'SOMEONE NEEDS SAVING!',
        treasure: 'RARE LOOT AHEAD!',
        warning: 'DANGER APPROACHES...',
        flashback: 'A MEMORY SURFACES...',
        earthquake: 'THE GROUND SHAKES!',
      };
      return {
        type,
        text: texts[type],
        color: type === 'ambush' ? RED : type === 'thugsAppear' ? ORANGE : YELLOW,
        spawnEnemies: type === 'ambush' || type === 'thugsAppear' ? enemyPool : [],
        enemyCount: type === 'ambush' || type === 'thugsAppear' ? 2 + Math.floor(rng() * 3) : 0,
        duration: 120,
      };
    }
  }

  // Procedural surprises for levels > 100: more frequent — every X3, X5, X7 levels
  if (level > 100) {
    const mod = level % 10;
    if (mod === 3 || mod === 5 || mod === 7) {
      const rng = seedRandom(level + 7777);
      const types: SurpriseType[] = ['ambush', 'thugsAppear', 'voidRift', 'trapTriggered', 'bossSurprise', 'betrayal'];
      const type = types[Math.floor(rng() * types.length)];
      const enemyPool: EnemyType[] = level > 150
        ? ['eliteDrone', 'heavyWalker', 'shadowAssassin']
        : level > 50
        ? ['voidGuardian', 'eliteDrone']
        : ['glitchWalker', 'drone'];
      const texts: Record<SurpriseType, string> = {
        ambush: 'AMBUSH! ENEMIES FROM THE SHADOWS!',
        thugsAppear: 'THUGS AHEAD! FIGHT THROUGH!',
        bossSurprise: 'SURPRISE BOSS! PREPARE YOURSELF!',
        allyArrives: 'REINFORCEMENTS HAVE ARRIVED!',
        trapTriggered: 'TRAP TRIGGERED! WATCH YOUR STEP!',
        voidRift: 'A VOID RIFT TEARS OPEN!',
        betrayal: 'SOMEONE IS TURNING AGAINST YOU!',
        rescue: 'A PRISONER NEEDS SAVING!',
        treasure: 'RARE LOOT DETECTED!',
        warning: 'DANGER APPROACHES...',
        flashback: 'A MEMORY SURFACES...',
        earthquake: 'THE GROUND SHAKES!',
      };
      return {
        type,
        text: texts[type],
        color: type === 'bossSurprise' ? RED : type === 'voidRift' ? MAGENTA : type === 'ambush' ? ORANGE : YELLOW,
        spawnEnemies: type === 'bossSurprise' ? ['bossCorrupted'] : enemyPool,
        enemyCount: type === 'bossSurprise' ? 1 : 2 + Math.floor(rng() * 4),
        duration: type === 'bossSurprise' ? 180 : 120,
      };
    }
  }
  return null;
}

export function generateProceduralLevel(levelNum: number): LevelDef {
  const rng = seedRandom(levelNum);
  const chapterNum = Math.min(Math.floor((levelNum - 1) / 100) + 6, 200); // chapters 6+
  const chapterName = getChapterName(chapterNum);

  // ====== DIFFICULTY SCALING ======
  // Width scales 2x wider for longer levels (more ground to cover = more gameplay)
  // Level 1: ~6300, Level 50: ~16500, Level 100: ~31500 capped at 30000
  const width = Math.min(Math.floor((3000 + levelNum * 150) * 2), 30000);
  const height = 600;

  // Generate platforms
  const platforms: Platform[] = [];
  // Ground with potential gaps (pits)
  const groundSegments: Platform[] = [];
  let gx = 0;
  const hasPit = levelNum > 20 && rng() > 0.5;
  while (gx < width) {
    const segWidth = 200 + Math.floor(rng() * 400);
    groundSegments.push({ x: gx, y: 520, width: segWidth, height: 40, type: 'static' });
    gx += segWidth;
    if (hasPit && rng() > 0.6 && gx > 300 && gx < width - 300) {
      gx += 80 + Math.floor(rng() * 60); // gap
    }
  }
  platforms.push(...groundSegments);

  // Floating platforms — more platforms for wider levels
  const platCount = 4 + Math.floor(Math.min(levelNum / 20, 10));
  for (let i = 0; i < platCount; i++) {
    const px = 200 + Math.floor(rng() * (width - 400));
    const py = 280 + Math.floor(rng() * 180);
    const pw = 80 + Math.floor(rng() * 80);
    const isMoving = rng() > 0.7;
    platforms.push({
      x: px, y: py, width: pw, height: 16,
      type: isMoving ? 'moving' : 'static',
      ...(isMoving ? { moveRange: 60 + Math.floor(rng() * 60), moveSpeed: 0.8 + rng() * 1.5, moveAxis: 'x' as const, moveOffset: 0 } : {}),
    });
  }

  // ====== WAVE COUNT SCALING ======
  let waveCount: number;
  if (levelNum <= 5) waveCount = 3 + Math.floor(rng() * 2);        // 3-4 waves
  else if (levelNum <= 10) waveCount = 4 + Math.floor(rng() * 2);  // 4-5 waves
  else if (levelNum <= 30) waveCount = 5 + Math.floor(rng() * 3);  // 5-7 waves
  else if (levelNum <= 60) waveCount = 7 + Math.floor(rng() * 3);  // 7-9 waves
  else if (levelNum <= 100) waveCount = 8 + Math.floor(rng() * 4); // 8-11 waves
  else waveCount = 10 + Math.floor(rng() * 5);                      // 10-14 waves

  const waves: WaveDef[] = [];

  // ====== ENEMY TYPE UNLOCK SCHEDULE ======
  // Base enemies always available
  const enemyTypes: EnemyType[] = ['drone', 'glitchWalker'];
  if (levelNum > 3) enemyTypes.push('voidGuardian');

  // Levels 10+: shadowAssassin, eliteDrone
  if (levelNum >= 10) enemyTypes.push('shadowAssassin', 'eliteDrone');

  // Levels 15+: dragon (earlier access to flying threats)
  if (levelNum >= 15) enemyTypes.push('dragon');

  // Levels 20+: voidBat, stormEagle, emberWisp, zombie
  if (levelNum >= 20) enemyTypes.push('voidBat', 'stormEagle', 'emberWisp', 'zombie');

  // Levels 30+: frostWraith, shadowDrake, plasmaSerpent, giant
  if (levelNum >= 30) enemyTypes.push('frostWraith', 'shadowDrake', 'plasmaSerpent', 'giant');

  // Levels 40+: neonWyrm, crystalMoth, necromancer
  if (levelNum >= 40) enemyTypes.push('neonWyrm', 'crystalMoth', 'necromancer');

  // Levels 50+: mechGolem
  if (levelNum >= 50) enemyTypes.push('mechGolem');

  // Levels 60+: phoenix
  if (levelNum >= 60) enemyTypes.push('phoenix');

  // Levels 70+: bomber
  if (levelNum >= 70) enemyTypes.push('bomber');

  // Higher levels: heavyWalker
  if (levelNum >= 80) enemyTypes.push('heavyWalker');

  const dramaticLines = [
    'Stay focused. They\'re coming.',
    'Another wave... bring it.',
    'We\'ve come too far to stop now.',
    'This zone is crawling with them.',
    'Keep pushing. Don\'t look back.',
    'They think they can stop us?',
    'For Luna. For everyone.',
    'This is getting intense...',
    'We will beat the Red King!',
    'I can do this all day.',
    'The Grid trembles before us.',
    'No retreat. No surrender.',
    'I am the Neon Stickman. I don\'t go dark.',
    'Every battle makes me stronger.',
    'This realm will know my name.',
  ];

  // Chapter-specific intro text
  let introText = `Level ${levelNum} — ${chapterName}`;
  if (levelNum % 100 === 1) {
    // First level of a new chapter
    introText = `CHAPTER ${chapterNum}: ${chapterName} — A new frontier awaits!`;
  }

  // ====== ENEMIES PER WAVE SCALING ======
  for (let w = 0; w < waveCount; w++) {
    let enemyCount: number;
    if (levelNum <= 5) enemyCount = 3 + Math.floor(rng() * 2);         // 3-4
    else if (levelNum <= 10) enemyCount = 4 + Math.floor(rng() * 3);   // 4-6
    else if (levelNum <= 30) enemyCount = 5 + Math.floor(rng() * 4);   // 5-8
    else if (levelNum <= 60) enemyCount = 7 + Math.floor(rng() * 5);   // 7-11
    else if (levelNum <= 100) enemyCount = 9 + Math.floor(rng() * 6);  // 9-14
    else enemyCount = 12 + Math.floor(rng() * 8);                      // 12-19

    // Spread enemies across the level width, each wave in a different zone
    const waveZoneStart = 300 + Math.floor((w / waveCount) * (width - 800));
    const waveZoneEnd = waveZoneStart + Math.floor((width - 800) / waveCount);

    const waveEnemies: { x: number; y: number; type: EnemyType }[] = [];
    for (let e = 0; e < enemyCount; e++) {
      const eType = enemyTypes[Math.floor(rng() * enemyTypes.length)];
      const isFlying = isFlyingEnemy(eType);
      waveEnemies.push({
        x: waveZoneStart + Math.floor(rng() * (waveZoneEnd - waveZoneStart)),
        y: isFlying ? 150 + Math.floor(rng() * 200) : 480,
        type: eType,
      });
    }
    waves.push({
      enemies: waveEnemies,
      voiceLine: w === 0 ? dramaticLines[Math.floor(rng() * dramaticLines.length)] : undefined,
    });
  }

  // ====== BOSS WAVE ======
  // Boss waves every 5 levels (more frequent boss encounters)
  // Major boss every 10 levels still for the biggest challenges
  let bossWave: WaveDef | undefined;
  const isBossLevel = levelNum > 5 && levelNum % 5 === 0;
  const isMajorBossLevel = levelNum >= 10 && levelNum % 10 === 0;
  if (isBossLevel || isMajorBossLevel) {
    // Boss health scales: baseBossHealth * (1 + level * 0.1)
    const baseBossHP = 400;
    const bossHP = Math.floor(baseBossHP * (1 + levelNum * 0.1));
    // Special bossTwin at level 100
    if (levelNum === 100) {
      bossWave = {
        enemies: [{
          x: width - 400, y: 480, type: 'bossTwin' as EnemyType,
          bossName: 'YOUR TWIN BROTHER',
          bossColor: BLUE,
        }],
        voiceLine: 'You... you look just like me!',
      };
    } else {
      const bossTypes: EnemyType[] = ['bossRedKing', 'bossTitan', 'bossCorrupted', 'bossDragon', 'bossPhoenix', 'bossMechGolem', 'bossFather', 'bossTwin'];
      const bossType = bossTypes[Math.floor(rng() * bossTypes.length)];
      const bossNames = [
        'CORRUPTED KING', 'THE ABYSS', 'VOID EMPEROR', 'DARK TITAN', 'SHADOW LORD',
        'PLASMA REAPER', 'NEON DEVOURER', 'THE INFINITE', 'DRAGON KING', 'PHOENIX LORD',
        'MECH OVERLORD', 'VOID SERPENT', 'CHROME REAPER', 'THE HUNGRY DARK', 'IRON JUGGERNAUT',
        'PHANTOM WYRM', 'CRYSTAL TYRANT', 'THE NAMELESS', 'STORM BRINGER', 'DOOM WEAVER',
        'FATHER', 'THE PATRIARCH', 'BLUE\'S FATHER', 'YOUR TWIN',
      ];
      const bossColors = [RED, PURPLE, MAGENTA, ORANGE, '#ff0044', '#8800ff', GOLD, CYAN, BLUE];
      bossWave = {
        enemies: [{
          x: width - 400, y: 480, type: bossType,
          bossName: bossNames[Math.floor(rng() * bossNames.length)],
          bossColor: bossColors[Math.floor(rng() * bossColors.length)],
        }],
        voiceLine: 'This ends NOW!',
      };
    }
  }

  // Background type
  const bgTypes: LevelDef['background'][] = ['city', 'corrupted', 'firewall', 'warehouse', 'rooftop', 'void', 'core', 'grid'];
  const bg = bgTypes[Math.floor(rng() * bgTypes.length)];

  const missionTypes: LevelDef['missionType'][] = ['fight', 'fight', 'fight', 'rescue', 'protect', 'escape'];
  const missionType = (isBossLevel || isMajorBossLevel) ? 'boss' : missionTypes[Math.floor(rng() * missionTypes.length)];

  const areaNames = [
    'NEON ALLEY', 'DARK CORRIDOR', 'FIRE ZONE', 'VOID SECTOR', 'CORRUPTED PATH',
    'GRID MAZE', 'SHADOW TUNNEL', 'CRYSTAL CAVE', 'PLASMA BRIDGE', 'DEATH ROW',
    'BURNING HALL', 'FROZEN GATE', 'THE ABYSS', 'CHASM WALK', 'IRON GAUNTLET',
    'TOXIC DRAIN', 'DATA STREAM', 'GLITCH HIGHWAY', 'RENDER ZONE', 'DEEP CORE',
    'DRAGON\'S LAIR', 'MECH FACTORY', 'PHOENIX NEST', 'SHADOW CITADEL', 'CHROME WASTES',
    'EMBER FIELDS', 'FROST SPIRE', 'VOLT ARENA', 'SILENT RUINS', 'WARP TUNNEL',
    'PHANTOM GATE', 'NEON CATHEDRAL', 'BLOOD GRID', 'SOUL REEF', 'NULL ZONE',
  ];
  const name = areaNames[Math.floor(rng() * areaNames.length)];

  // Generate environmental objects
  const envTypes: EnvironmentalObject['type'][] = ['neonSign', 'brokenPillar', 'glitchCrystal', 'voidRift', 'dataStream'];
  const envCount = 3 + Math.floor(rng() * 6); // 3-8 objects
  const environmentalObjects: EnvironmentalObject[] = [];
  for (let i = 0; i < envCount; i++) {
    environmentalObjects.push({
      x: 100 + Math.floor(rng() * (width - 200)),
      y: 350 + Math.floor(rng() * 150),
      type: envTypes[Math.floor(rng() * envTypes.length)],
    });
  }

  // Weather type based on level seed
  const weatherTypes: WeatherType[] = ['none', 'none', 'rain', 'snow', 'glitch', 'embers', 'voidParticles'];
  const weatherType = weatherTypes[Math.floor(rng() * weatherTypes.length)];

  return {
    id: levelNum,
    name,
    chapter: `CH.${chapterNum}`,
    width,
    height,
    playerSpawn: { x: 80, y: 460 },
    platforms,
    waves,
    bossWave,
    background: bg,
    introText,
    introColor: [CYAN, ORANGE, MAGENTA, PURPLE, LIME, GOLD][Math.floor(rng() * 6)],
    missionType,
    gangMembersAvailable: [],
    isProcedural: true,
    environmentalObjects,
    weatherType,
  };
}

// Simple seeded random for reproducible levels
function seedRandom(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ====== CUTSCENES ======
export const CUTSCENES: Record<string, CutsceneData> = {
  'ch1-intro': {
    id: 'ch1-intro',
    frames: [
      { scene: 'cityPan', dialogue: 'Neon City. Once alive with light. Now ruled by the Red King.', speaker: 'NARRATOR', speakerColor: ORANGE, duration: 180 },
      { scene: 'kidnapping', dialogue: 'They took her. LUNA. The only light left in my world.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
      { scene: 'blueWakes', dialogue: 'I\'m getting her back. Even if I have to burn this city down.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
    ],
  },
  'ch2-intro': {
    id: 'ch2-intro',
    frames: [
      { scene: 'warScene', dialogue: 'I can\'t do this alone. I need a crew.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
      { scene: 'shadowAppears', dialogue: 'You fight well. Name\'s Shadow. I hate the Red King too.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
      { scene: 'handshake', dialogue: 'Together, we\'re the Blue Gang. Let\'s tear them down.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
    ],
  },
  'ch2-blaze': {
    id: 'ch2-blaze',
    frames: [
      { scene: 'warScene', dialogue: 'Need more firepower? I\'m BLAZE. I burn things.', speaker: 'BLAZE', speakerColor: ORANGE, duration: 180 },
      { scene: 'gangJoin', dialogue: 'Welcome to the Gang, hotshot.', speaker: 'BLUE', speakerColor: CYAN, duration: 120 },
    ],
  },
  'ch3-intro': {
    id: 'ch3-intro',
    frames: [
      { scene: 'lunaCaptured', dialogue: 'I found where they\'re keeping her. Red King\'s fortress.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 150 },
      { scene: 'blueAngry', dialogue: 'Luna. I\'m coming. Nothing stops the Blue Gang.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
    ],
  },
  'ch3-rescue': {
    id: 'ch3-rescue',
    frames: [
      { scene: 'reunion', dialogue: 'BLUE... I knew you\'d come.', speaker: 'LUNA', speakerColor: PINK, duration: 150 },
      { scene: 'blueSeesLuna', dialogue: 'Always. No one takes you from me. Not again.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
    ],
  },
  'ch4-intro': {
    id: 'ch4-intro',
    frames: [
      { scene: 'motherThreat', dialogue: 'They\'re going after your mother, Blue. Red King wants revenge.', speaker: 'VOLT', speakerColor: YELLOW, duration: 180 },
      { scene: 'protectMother', dialogue: 'Not my mother. NOT MY MOTHER. GANG, MOVE!', speaker: 'BLUE', speakerColor: RED, duration: 150 },
    ],
  },
  'ch5-intro': {
    id: 'ch5-intro',
    frames: [
      { scene: 'warScene', dialogue: 'This is it. The final war. The Blue Gang vs the Red King\'s empire.', speaker: 'BLUE', speakerColor: GOLD, duration: 180 },
      { scene: 'gangForming', dialogue: 'For Luna. For Neon. For the city. BLUE GANG, CHARGE!', speaker: 'BLUE', speakerColor: GOLD, duration: 180 },
    ],
  },
  'victory': {
    id: 'victory',
    frames: [
      { scene: 'bossDefeated', dialogue: 'It\'s over. The Red King is gone.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 150 },
      { scene: 'victoryCelebration', dialogue: 'The city is free. The Blue Gang protects it. Always.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
      { scene: 'reunion', dialogue: 'We did it, Blue. Together.', speaker: 'LUNA', speakerColor: PINK, duration: 120 },
    ],
  },
  'revive': {
    id: 'revive',
    frames: [
      { scene: 'blueWakes', dialogue: 'Not yet... I\'m not done fighting.', speaker: 'BLUE', speakerColor: CYAN, duration: 120 },
    ],
  },

  // ====== DEEP STORY CUTSCENES — Every 10 Levels ======
  // Level 10: The truth about the Red King
  'lv10-revelation': {
    id: 'lv10-revelation',
    frames: [
      { scene: 'darkRevelation', dialogue: 'I found something in the data streams... The Red King wasn\'t always like this.', speaker: 'VOLT', speakerColor: YELLOW, duration: 200 },
      { scene: 'flashback', dialogue: 'He was once a guardian. The Grid\'s protector. Something broke him.', speaker: 'VOLT', speakerColor: YELLOW, duration: 200 },
      { scene: 'darkCorridor', dialogue: 'What could turn a guardian into a tyrant?', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
      { scene: 'redKingPlan', dialogue: 'Doesn\'t matter. Whatever he was, he\'s a monster now. And monsters fall.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
    ],
  },

  // Level 20: Luna's secret
  'lv20-luna': {
    id: 'lv20-luna',
    frames: [
      { scene: 'lunaVision', dialogue: 'Blue... there\'s something I never told you. About why they took me.', speaker: 'LUNA', speakerColor: PINK, duration: 200 },
      { scene: 'lunaVision', dialogue: 'I can see the code. I can see the Grid\'s heart. That\'s why they want me.', speaker: 'LUNA', speakerColor: PINK, duration: 200 },
      { scene: 'mysteryFigure', dialogue: 'Your gift makes you a target. But it also makes you our greatest weapon.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
    ],
  },

  // Level 30: Shadow's past
  'lv30-shadow': {
    id: 'lv30-shadow',
    frames: [
      { scene: 'shadowPast', dialogue: 'I used to work for him. The Red King. I was his top soldier.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 200 },
      { scene: 'betrayal', dialogue: 'He ordered me to delete an entire district. Women. Children. Innocent code.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 200 },
      { scene: 'darkRevelation', dialogue: 'I refused. He killed my team. I\'ve been running ever since. Until I found you.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
      { scene: 'gangOath', dialogue: 'We don\'t run anymore, Shadow. We fight. Together.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
    ],
  },

  // Level 40: Mother's secret
  'lv40-mother': {
    id: 'lv40-mother',
    frames: [
      { scene: 'motherSecret', dialogue: 'Blue, my son... there is something I must tell you about your father.', speaker: 'NEON', speakerColor: '#44ddaa', duration: 200 },
      { scene: 'flashback', dialogue: 'Your father was the First Guardian. He built the Grid. And the Red King... was his partner.', speaker: 'NEON', speakerColor: '#44ddaa', duration: 220 },
      { scene: 'darkRevelation', dialogue: 'The Red King MURDERED him. Stole the Grid. I\'ve been hiding you ever since.', speaker: 'NEON', speakerColor: '#44ddaa', duration: 200 },
      { scene: 'blueAngry', dialogue: 'My father... Then this isn\'t just a rescue mission. This is JUSTICE.', speaker: 'BLUE', speakerColor: RED, duration: 180 },
    ],
  },

  // Level 50: The Void Rift opens
  'lv50-void': {
    id: 'lv50-void',
    frames: [
      { scene: 'voidRift', dialogue: 'What... what IS that?! The sky is TEARING OPEN!', speaker: 'BLAZE', speakerColor: ORANGE, duration: 180 },
      { scene: 'explosion', dialogue: 'The Void... it\'s bleeding into our world. The Red King tore the fabric of the Grid!', speaker: 'VOLT', speakerColor: YELLOW, duration: 200 },
      { scene: 'mysteryFigure', dialogue: 'From the rift... something is watching us. Something OLDER than the Grid.', speaker: 'ICE', speakerColor: '#44ddff', duration: 180 },
      { scene: 'stormApproaching', dialogue: 'Forget the Red King. If we don\'t seal that rift, NOTHING will survive.', speaker: 'BLUE', speakerColor: GOLD, duration: 200 },
    ],
  },

  // Level 60: The deal
  'lv60-deal': {
    id: 'lv60-deal',
    frames: [
      { scene: 'hiddenBase', dialogue: 'I found the Red King\'s weakness. But accessing it requires a sacrifice.', speaker: 'LUNA', speakerColor: PINK, duration: 200 },
      { scene: 'theDeal', dialogue: 'I can enter the Void Rift. Merge with the Grid\'s core. But I might not come back.', speaker: 'LUNA', speakerColor: PINK, duration: 200 },
      { scene: 'silentPrayer', dialogue: 'No. NO. There has to be another way. I won\'t lose you again.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
      { scene: 'sacrifice', dialogue: 'If it saves everyone... including you... I\'ll do it. With or without your permission.', speaker: 'LUNA', speakerColor: PINK, duration: 200 },
    ],
  },

  // Level 70: Betrayal from within
  'lv70-betrayal': {
    id: 'lv70-betrayal',
    frames: [
      { scene: 'darkCorridor', dialogue: 'Someone has been feeding the Red King our positions. We have a TRAITOR.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 200 },
      { scene: 'betrayal', dialogue: 'I... I had no choice. He has my family in the Deep Grid.', speaker: '???', speakerColor: ORANGE, duration: 200 },
      { scene: 'lastStand', dialogue: 'Everyone makes choices. Yours just cost us everything. Get out. NOW.', speaker: 'BLUE', speakerColor: RED, duration: 180 },
      { scene: 'gangOath', dialogue: 'We\'re weaker now. But we\'re purer. The real Blue Gang stays together.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
    ],
  },

  // Level 80: The truth revealed
  'lv80-truth': {
    id: 'lv80-truth',
    frames: [
      { scene: 'truthRevealed', dialogue: 'The Grid is alive. It\'s not code — it\'s a LIVING consciousness. And it\'s DYING.', speaker: 'LUNA', speakerColor: PINK, duration: 220 },
      { scene: 'voidRift', dialogue: 'The Red King didn\'t just take over. He\'s been FEEDING on the Grid. Consuming it.', speaker: 'VOLT', speakerColor: YELLOW, duration: 200 },
      { scene: 'flashback', dialogue: 'My father created the Grid as a sanctuary. For everyone. The Red King turned it into a prison.', speaker: 'BLUE', speakerColor: CYAN, duration: 200 },
      { scene: 'gangOath', dialogue: 'Then we FREE it. No matter the cost. The Grid WILL breathe again.', speaker: 'BLUE', speakerColor: GOLD, duration: 180 },
    ],
  },

  // Level 90: The final preparations
  'lv90-final': {
    id: 'lv90-final',
    frames: [
      { scene: 'hiddenBase', dialogue: 'This is it. The Red King\'s fortress. One shot. No retreat.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
      { scene: 'gangForming', dialogue: 'Blue Gang. We\'ve bled together. Lost together. Now we END this together.', speaker: 'BLUE', speakerColor: GOLD, duration: 200 },
      { scene: 'silentPrayer', dialogue: 'Mom... if I don\'t make it back... know that I fought for what Dad believed in.', speaker: 'BLUE', speakerColor: CYAN, duration: 200 },
      { scene: 'newDawn', dialogue: 'You WILL make it back. Because I\'m coming with you. Always.', speaker: 'LUNA', speakerColor: PINK, duration: 180 },
    ],
  },

  // Level 100: The turning point
  'lv100-turning': {
    id: 'lv100-turning',
    frames: [
      { scene: 'bossDefeated', dialogue: 'The Red King is wounded. But the Void... it\'s still growing.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 200 },
      { scene: 'voidRift', dialogue: 'Something is coming THROUGH the rift. Something that makes the Red King look like nothing.', speaker: 'VOLT', speakerColor: YELLOW, duration: 200 },
      { scene: 'mysteryFigure', dialogue: 'I am the VOID KING. And this Grid... is NOW MINE.', speaker: '???', speakerColor: '#ff0044', duration: 220 },
      { scene: 'stormApproaching', dialogue: 'A new enemy. A bigger war. But the Blue Gang doesn\'t surrender. We just fight HARDER.', speaker: 'BLUE', speakerColor: GOLD, duration: 200 },
    ],
  },

  // ====== BOSS INTRO CUTSCENES ======
  // Dramatic boss entrance cutscenes
  'boss-redking-intro': {
    id: 'boss-redking-intro',
    frames: [
      { scene: 'bossIntro', dialogue: 'So... the little blue stickman dares challenge me.', speaker: 'RED KING', speakerColor: RED, duration: 180 },
      { scene: 'bossIntro', dialogue: 'I conquered this Grid before you were BORN. You are NOTHING.', speaker: 'RED KING', speakerColor: RED, duration: 200 },
      { scene: 'blueAngry', dialogue: 'You took everything from me. Now I\'m taking it ALL back.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
    ],
  },
  'boss-dragon-intro': {
    id: 'boss-dragon-intro',
    frames: [
      { scene: 'bossIntro', dialogue: 'The sky BURNS. A dragon guards the Red King\'s fortress.', speaker: 'NARRATOR', speakerColor: ORANGE, duration: 180 },
      { scene: 'bossIntro', dialogue: 'Fire can\'t stop me. I\'ve been burning inside since they took Luna.', speaker: 'BLUE', speakerColor: CYAN, duration: 200 },
    ],
  },
  'boss-phoenix-intro': {
    id: 'boss-phoenix-intro',
    frames: [
      { scene: 'bossIntro', dialogue: 'From the ashes it rises. The Phoenix — guardian of the Deep Grid.', speaker: 'NARRATOR', speakerColor: ORANGE, duration: 180 },
      { scene: 'bossIntro', dialogue: 'It can rise all it wants. I\'ll put it down again and again.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
    ],
  },
  'boss-mechgolem-intro': {
    id: 'boss-mechgolem-intro',
    frames: [
      { scene: 'bossIntro', dialogue: 'The Red King\'s war machine awakens. Steel and rage given form.', speaker: 'NARRATOR', speakerColor: ORANGE, duration: 180 },
      { scene: 'bossIntro', dialogue: 'Tin can or not — I\'ll tear it apart with my bare hands.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
    ],
  },
  'boss-corrupted-intro': {
    id: 'boss-corrupted-intro',
    frames: [
      { scene: 'bossIntro', dialogue: 'Something is WRONG. The Grid itself is... corrupted.', speaker: 'VOLT', speakerColor: YELLOW, duration: 200 },
      { scene: 'bossIntro', dialogue: 'The Corrupted. A boss made from the Grid\'s own suffering. Stay sharp.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
    ],
  },
  'boss-father-intro': {
    id: 'boss-father-intro',
    frames: [
      { scene: 'darkCorridor', dialogue: 'I sense something familiar... No. It can\'t be.', speaker: 'BLUE', speakerColor: CYAN, duration: 200 },
      { scene: 'bossIntro', dialogue: 'Son... you\'ve grown strong. But you don\'t understand what\'s at stake.', speaker: 'FATHER', speakerColor: '#44aaff', duration: 220 },
      { scene: 'blueAngry', dialogue: 'You ABANDONED us! Mom and I suffered because of YOU!', speaker: 'BLUE', speakerColor: RED, duration: 200 },
    ],
  },
  'boss-twin-intro': {
    id: 'boss-twin-intro',
    frames: [
      { scene: 'bossIntro', dialogue: 'Twins? TWO of them?! This is gonna be a handful.', speaker: 'BLAZE', speakerColor: ORANGE, duration: 180 },
      { scene: 'bossIntro', dialogue: 'Two targets, twice the satisfaction. Let\'s go, Gang!', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
    ],
  },

  // ====== BOSS DEFEATED CUTSCENES ======
  'boss-generic-defeated': {
    id: 'boss-generic-defeated',
    frames: [
      { scene: 'bossDefeated', dialogue: 'That\'s one less monster in the Grid.', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
      { scene: 'victoryCelebration', dialogue: 'Another victory for the Blue Gang! Keep moving!', speaker: 'SHADOW', speakerColor: PURPLE, duration: 150 },
    ],
  },
  'boss-redking-defeated': {
    id: 'boss-redking-defeated',
    frames: [
      { scene: 'bossDefeated', dialogue: 'This... this can\'t be... I am the KING!', speaker: 'RED KING', speakerColor: RED, duration: 200 },
      { scene: 'bossDefeated', dialogue: 'You were never a king. Just a tyrant. And tyrants ALWAYS fall.', speaker: 'BLUE', speakerColor: CYAN, duration: 200 },
      { scene: 'victoryCelebration', dialogue: 'The city is FREE! The Red King\'s reign is OVER!', speaker: 'BLAZE', speakerColor: ORANGE, duration: 180 },
    ],
  },
  'boss-father-defeated': {
    id: 'boss-father-defeated',
    frames: [
      { scene: 'bossDefeated', dialogue: 'Blue... I wasn\'t trying to hurt you. I was trying to PROTECT you.', speaker: 'FATHER', speakerColor: '#44aaff', duration: 220 },
      { scene: 'silentPrayer', dialogue: 'Protect me? By disappearing? By letting Mom suffer alone?', speaker: 'BLUE', speakerColor: CYAN, duration: 200 },
      { scene: 'bossDefeated', dialogue: 'The Void King possessed me. I\'ve been his puppet. Free me... and seal the rift.', speaker: 'FATHER', speakerColor: '#44aaff', duration: 220 },
    ],
  },

  // ====== RESCUE CUTSCENES ======
  'rescue-luna': {
    id: 'rescue-luna',
    frames: [
      { scene: 'lunaCaptured', dialogue: 'LUNA! I found you! Hold on!', speaker: 'BLUE', speakerColor: CYAN, duration: 150 },
      { scene: 'reunion', dialogue: 'Blue... I knew you\'d come. I never stopped believing.', speaker: 'LUNA', speakerColor: PINK, duration: 180 },
      { scene: 'reunion', dialogue: 'I\'d tear down the entire Grid for you. Let\'s get out of here.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
    ],
  },
  'rescue-mother': {
    id: 'rescue-mother',
    frames: [
      { scene: 'protectMother', dialogue: 'MOM! I\'m here! Nobody touches my family!', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
      { scene: 'protectMother', dialogue: 'My brave boy... you\'re so much like your father.', speaker: 'NEON', speakerColor: '#44ddaa', duration: 200 },
      { scene: 'protectMother', dialogue: 'Let\'s get you somewhere safe. The Gang will protect you.', speaker: 'BLUE', speakerColor: CYAN, duration: 180 },
    ],
  },
  'rescue-villagers': {
    id: 'rescue-villagers',
    frames: [
      { scene: 'walking', dialogue: 'We found survivors in the Red King\'s camp. They need our help.', speaker: 'SHADOW', speakerColor: PURPLE, duration: 180 },
      { scene: 'gangForming', dialogue: 'Everyone deserves freedom. The Blue Gang fights for ALL of them.', speaker: 'BLUE', speakerColor: GOLD, duration: 200 },
    ],
  },
};

// ====== SPARK VOICE LINES ======
export const VOICE_LINES: Record<string, string[]> = {
  kill: ['Deleted.', 'Stay down.', 'One less.', 'Crashed.', 'Lights out.', 'Too slow.', 'Dust.', 'Erased.'],
  damage: ['That all you got?', 'Just a scratch.', 'Not today.', 'I\'ve had worse.', 'Tickles.', 'Keep coming.'],
  waveClear: ['Zone secured.', 'Moving up.', 'Area clear.', 'Next.', 'Too easy.', 'Onward.'],
  dash: ['Too fast.', 'Can\'t touch this.', 'Gone.', 'Blurred.'],
  shield: ['Blocked.', 'Nope.', 'Nice try.', 'Not even close.'],
  special: ['OVERLOAD!', 'BURN IT DOWN!', 'LIGHT \'EM UP!', 'UNLEASH THE GRID!', 'MAXIMUM POWER!'],
  gang: ['Gang, attack!', 'Together!', 'Blue Gang never quits!', 'Crew assemble!'],
  rescue: ['Luna, I\'m coming!', 'Hold on!', 'I\'ll find you!', 'Hang in there!'],
  protect: ['Not touching her!', 'Stay back from Mom!', 'Over my dead body!', 'Shield up!'],
  dramatic: ['Reinforcements have arrived!', 'We will beat the Red King!', 'Stay with me, partner!', 'This ends NOW!', 'They think they can break us?', 'NOT TODAY!', 'I am NOT done yet!', 'For EVERYONE you hurt!', 'The Grid fights with me!', 'I AM the storm!'],
  bossEnrage: ['You\'re only making me ANGRY!', 'Is that ALL you\'ve got?!', 'NOW you\'ll see REAL power!', 'You woke the WRONG stickman!'],
  pet: ['Good boy!', 'Get \'em!', 'Atta boy!', 'Nice shot, partner!'],
  dragon: ['A DRAGON! Bring it down!', 'Fire can\'t stop me!', 'Dragon slayer incoming!'],
  phoenix: ['It rises from the ashes?!', 'Burn again, bird!', 'Phoenix down!'],
  mechGolem: ['Tin can incoming!', 'Dismantle it!', 'Mech detected — engaging!'],
  shadowAssassin: ['I can barely see it!', 'Show yourself!', 'Shadows can\'t hide from me!'],
  voidBat: ['Bats from the void!', 'Fast little nightmares!', 'They come from the dark!'],
  stormEagle: ['Lightning bird incoming!', 'That eagle\'s charged up!', 'Storm wings above!'],
  emberWisp: ['Fire spirits! Watch out!', 'Those wisps burn!', 'Floating flames!'],
  frostWraith: ['Ice ghost detected!', 'It\'s freezing in here!', 'A cold wind rises!'],
  shadowDrake: ['Shadow dragon approaches!', 'The darkness has teeth!', 'That drake is not natural!'],
  plasmaSerpent: ['Energy serpent spotted!', 'It\'s made of pure plasma!', 'That snake electrifies everything!'],
  neonWyrm: ['THE WYRM! Look at the size of it!', 'Neon wyrm! Stay clear!', 'That thing is massive!'],
  crystalMoth: ['Crystal moths? Beautiful but deadly!', 'Those wings are sharp!', 'Don\'t let it shimmer close!'],
};

// ====== ENDLESS MODE CONFIG ======
export const ENDLESS_CONFIG = {
  baseEnemyCount: 3,
  enemyCountIncrease: 1,
  baseEnemyHealth: 15,
  healthIncrease: 5,
  bossEveryWaves: 5,
  coinsPerWave: 50,
  coinMultiplier: 1.1,
};
