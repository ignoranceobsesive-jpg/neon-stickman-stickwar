# Task 3+4+5 Work Record — Neon Stickman: Stick War

## Agent: Main Agent
## Task IDs: 3, 4, 5

### Task 3: Weapon Upgrade Button with Unlimited Upgrades (coin + ad)

**3A. `/src/lib/game-types.ts`**
- Added `WEAPON_UPGRADES` constant object with 5 upgrade paths:
  - `damage`: baseCost 500, x1.5 multiplier, +15% per level, maxLevel 999
  - `fireRate`: baseCost 800, x1.6 multiplier, +10% per level, maxLevel 999
  - `bulletSpeed`: baseCost 600, x1.4 multiplier, +12% per level, maxLevel 999
  - `bulletSize`: baseCost 400, x1.3 multiplier, +10% per level, maxLevel 999
  - `criticalChance`: baseCost 1500, x2.0 multiplier, +2% per level, maxLevel 50
- Added `WeaponUpgradeType` type alias
- Added `getWeaponUpgradeCost(type, currentLevel)` helper function with exponential cost scaling
- Added `'weapon-shop'` to `GamePhase` type union
- Added `weaponUpgrades: Record<string, number>` to `SaveData` interface
- Added `weaponUpgrades: {}` to `DEFAULT_SAVE`

**3B. `/src/stores/game-store.ts`**
- Added imports for `WEAPON_UPGRADES`, `getWeaponUpgradeCost`, `WeaponUpgradeType`
- Added `upgradeWeapon(type)` action: deducts coins, increments level, saves
- Added `upgradeWeaponByAd(type)` action: increments level without cost (watched ad), saves

**3C. `/src/lib/save-manager.ts`**
- Added `weaponUpgrades` field to `loadSave()` merge logic with fallback to default

**3D. `/src/components/game/MainMenu.tsx`**
- Added "🔫 UPGRADE" button in main menu grid (between OFFLINE and LEVEL MAP)
- Button sets `gamePhase` to `'weapon-shop'`

**3E. `/src/components/game/WeaponUpgradePanel.tsx`** (NEW FILE)
- Created full weapon upgrade panel component with:
  - 5 upgrade categories with icons, colors, descriptions
  - Current level, current effect, next level effect display
  - Progress bar for each upgrade
  - Two buttons per upgrade: "🪙 COST" (coin) and "🎬 AD (FREE)"
  - Simulated ad overlay with progress bar
  - Ad completion grants 200 coins + free upgrade
  - Exponential cost display
  - Back button to return to menu
  - Dark neon theme consistent with game

**3F. `/src/app/page.tsx`**
- Added `WeaponUpgradePanel` import
- Added `weapon-shop` game phase handler with GameScreen + WeaponUpgradePanel overlay

**3G. `/src/components/game/GameCanvas.tsx`**
- Added `WEAPON_UPGRADES` and `WeaponUpgradeType` imports
- Modified player shoot logic to apply weapon upgrade multipliers:
  - Damage: `10 * (1 + dmgLevel * 0.15) * (isCrit ? 2 : 1)`
  - Fire Rate: `SHOOT_COOLDOWN * (1 - min(frLevel * 0.1, 0.8))`
  - Bullet Speed: `BULLET_SPEED * (1 + bsLevel * 0.12)`
  - Bullet Size: `4 * (1 + bszLevel * 0.1)`
  - Critical Hit: `critLevel * 0.02` chance for 2x damage, golden bullet + particles on crit

### Task 4: High Item Prices for Coin Inflation

**`/src/lib/game-types.ts`** — All prices multiplied 3-5x:

- **Skin prices (rare)**: 1200→3000, 1600→5000 (3x)
- **Skin prices (epic)**: 2400→10000, 4000→18000, 5000→15000 (3-4x)
- **Skin prices (legendary)**: 6000→30000, 7000→30000, 8000→30000/40000, 10000→40000/50000, 12000→50000 (3-5x)
- **Skill upgrade costs**: [0, 500, 1000, 1800, 3500] → [0, 1500, 3000, 5400, 10500] (3x)
- **Pet prices**: 600→2000, 1000→3500, 1600→5500, 6000→25000, 800→3000, 1200→4500, 2000→7500, 4000→15000, 10000→40000 (3-5x)
- **Pet skin prices**: All increased 3-5x (e.g., 800→2400, 1200→4000, 1600→5500, 2000→7000, 3000→12000, 4000→15000, 5000→20000, 6000→25000, 8000→35000)

### Task 5: Skill Buttons Change When Equipping New Skin/Skill

**`/src/components/game/TouchControls.tsx`**
- Added `ELEMENT_GLOW_COLORS` mapping for element-specific button glow colors:
  - Fire: #ff4400, Frost: #88eeff, Shadow: #8800ff, Summon: #aa00ff, Death: #660066, Lightning: #ffff00, Void: #ff00ff, Blood: #cc0000
- Added `DEFAULT_ABILITIES` array with name, icon, color, glowColor for each default slot
- Updated skill button computations to use `ELEMENT_GLOW_COLORS` for border/glow color
- Added `label` prop to `SkillButton` component showing the skill name
- Added skill name label rendering below the icon in each button (5px font, neon glow)
- Skill button appearance now dynamically changes based on equipped skill:
  - Fire skills → red/orange glow
  - Frost skills → cyan/blue glow
  - Shadow skills → purple glow
  - Lightning skills → yellow glow
  - Void/Blood → magenta/red glow
  - Unequipped slots show default ability name (DASH/SHIELD/SPECIAL)

### Lint Check
- `npx eslint src/` passes with 0 errors
- Dev server running successfully on port 3000
