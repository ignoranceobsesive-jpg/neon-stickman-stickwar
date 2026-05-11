'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { soundEngine } from '@/lib/sound-engine';
import { CYAN, MAGENTA, ORANGE, RED, PURPLE, LIME, YELLOW, DARK_BG, GOLD, getRankForElo } from '@/lib/game-types';

// ====== ONLINE ARENA TYPES ======
interface ArenaMinion {
  x: number; y: number; vx: number; vy: number;
  team: 'blue' | 'red';
  health: number; maxHealth: number;
  facing: 1 | -1;
  attackCooldown: number;
  animFrame: number;
  active: boolean;
}

interface ArenaBase {
  x: number; y: number;
  health: number; maxHealth: number;
  team: 'blue' | 'red';
}

interface ArenaPlayer {
  x: number; y: number; vx: number; vy: number;
  health: number; maxHealth: number;
  facing: 1 | -1;
  grounded: boolean;
  shootCooldown: number;
  animFrame: number;
  isMoving: boolean;
  isShooting: boolean;
  color: string;
  // Abilities
  dashCooldown: number;
  isDashing: boolean;
  dashTimer: number;
  shieldCooldown: number;
  isShielding: boolean;
  shieldTimer: number;
  specialCooldown: number;
  isUsingSpecial: boolean;
  specialTimer: number;
  invincible: number;
}

interface ArenaBullet {
  x: number; y: number; vx: number; vy: number;
  fromBlue: boolean;
  damage: number;
  active: boolean;
  color: string;
  radius: number;
}

interface ChatMessage {
  text: string;
  timer: number;
  color: string;
}

interface OpponentProfile {
  name: string;
  avatar: string;
  elo: number;
  wins: number;
  losses: number;
  rank: string;
  rankIcon: string;
}

type ArenaPhase = 'lobby' | 'searching' | 'matched' | 'playing' | 'result';

const ARENA_WIDTH = 1600;
const ARENA_HEIGHT = 500;
const GROUND_Y = 460;
const GRAVITY = 0.5;
const MINION_SPAWN_INTERVAL = 300;
const PLAYER_SPEED = 4.5;
const BULLET_SPEED = 9;

const FAKE_PLAYER_NAMES = [
  'xXDarkSlayerXx', 'NeonPhantom', 'PixelKnight', 'GridWalker', 'VoidHunter',
  'CyberSamurai', 'FlameReaper', 'StormBlade', 'GhostRunner', 'IronFist',
  'ShadowPulse', 'NovaStrike', 'RoguePixel', 'ZeroPoint', 'CodeBreaker',
  'NightGrid', 'ApexNeon', 'TurboFlux', 'DarkCircuit', 'QuantumEdge',
];

const FAKE_AVATARS = ['🐉', '💀', '🔥', '⚡', '🗡️', '🛡️', '🎯', '👻', '🤖', '👾', '🦊', '🐺', '🦅', '🐍', '🦂', '🌋', '🌀', '💎', '⭐', '🌙'];

const CHAT_MESSAGES = ['Nice shot!', 'GG!', 'Wow!', 'Too easy!', 'Close one!', 'Lucky!', 'Let\'s go!', 'No way!', 'Haha!', 'Rematch?'];

function seededRandom(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateOpponent(playerElo: number, seed: number): OpponentProfile {
  const rng = seededRandom(seed);
  const name = FAKE_PLAYER_NAMES[Math.floor(rng() * FAKE_PLAYER_NAMES.length)];
  const avatar = FAKE_AVATARS[Math.floor(rng() * FAKE_AVATARS.length)];
  // ELO within ±200 of player for fair matchmaking
  const eloOffset = Math.floor((rng() - 0.5) * 400);
  const elo = Math.max(100, playerElo + eloOffset);
  const wins = Math.floor(rng() * 50) + 5;
  const losses = Math.floor(rng() * 40) + 2;
  const rankInfo = getRankForElo(elo);
  return { name, avatar, elo, wins, losses, rank: rankInfo.rank, rankIcon: rankInfo.icon };
}

export default function OnlineArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const saveData = useGameStore(s => s.saveData);
  const updateRanking = useGameStore(s => s.updateRanking);
  const backToMenu = useGameStore(s => s.backToMenu);

  const [arenaPhase, setArenaPhase] = useState<ArenaPhase>('lobby');
  const [searchTimer, setSearchTimer] = useState(0);
  const [matchResult, setMatchResult] = useState<'win' | 'loss' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [streak, setStreak] = useState(0); // positive = win streak, negative = loss streak
  const [resultTimer, setResultTimer] = useState(0);

  // Game state refs
  const phaseRef = useRef<ArenaPhase>('lobby');
  const playerRef = useRef<ArenaPlayer | null>(null);
  const opponentRef = useRef<ArenaPlayer | null>(null);
  const blueBaseRef = useRef<ArenaBase>({ x: 50, y: GROUND_Y, health: 500, maxHealth: 500, team: 'blue' });
  const redBaseRef = useRef<ArenaBase>({ x: ARENA_WIDTH - 80, y: GROUND_Y, health: 500, maxHealth: 500, team: 'red' });
  const minionsRef = useRef<ArenaMinion[]>([]);
  const bulletsRef = useRef<ArenaBullet[]>([]);
  const minionTimerRef = useRef(0);
  const keysRef = useRef({ left: false, right: false, up: false, shoot: false, dash: false, shield: false, special: false });
  const moodRef = useRef(0.5); // 0 = easy, 1 = hard
  const chatRef = useRef<ChatMessage[]>([]);
  const streakRef = useRef(0);
  const opponentRef_data = useRef<OpponentProfile | null>(null);

  const rankInfo = getRankForElo(saveData.rankingData.elo);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') keysRef.current.left = true;
      if (key === 'd' || key === 'arrowright') keysRef.current.right = true;
      if (key === 'w' || key === 'arrowup') { e.preventDefault(); keysRef.current.up = true; }
      if (key === ' ') { e.preventDefault(); keysRef.current.shoot = true; }
      if (key === 'shift') keysRef.current.dash = true;
      if (key === 'e') keysRef.current.shield = true;
      if (key === 'f') keysRef.current.special = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') keysRef.current.left = false;
      if (key === 'd' || key === 'arrowright') keysRef.current.right = false;
      if (key === 'w' || key === 'arrowup') keysRef.current.up = false;
      if (key === ' ') keysRef.current.shoot = false;
      if (key === 'shift') keysRef.current.dash = false;
      if (key === 'e') keysRef.current.shield = false;
      if (key === 'f') keysRef.current.special = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Matchmaking simulation — 3 phases: searching → matched → playing
  useEffect(() => {
    if (arenaPhase !== 'searching') return;
    const timer = setInterval(() => {
      setSearchTimer(prev => {
        if (prev >= 3) {
          // Found opponent — move to "matched" phase (show opponent profile)
          setArenaPhase('matched');
          phaseRef.current = 'matched';
          clearInterval(timer);
          soundEngine.init();
          soundEngine.playWaveComplete();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [arenaPhase]);

  // Auto-start match after showing opponent profile for 2 seconds
  useEffect(() => {
    if (arenaPhase !== 'matched') return;
    const timer = setTimeout(() => {
      setArenaPhase('playing');
      phaseRef.current = 'playing';
    }, 2000);
    return () => clearTimeout(timer);
  }, [arenaPhase]);

  // Result timer — ref-based to avoid setState in effect
  const resultStartRef = useRef(0);
  useEffect(() => {
    if (arenaPhase !== 'result') return;
    resultStartRef.current = Date.now();
    const interval = setInterval(() => {
      setResultTimer(Math.floor((Date.now() - resultStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [arenaPhase]);

  // Initialize match
  const initMatch = useCallback(() => {
    playerRef.current = {
      x: 150, y: GROUND_Y, vx: 0, vy: 0,
      health: 100, maxHealth: 100,
      facing: 1, grounded: false,
      shootCooldown: 0, animFrame: 0,
      isMoving: false, isShooting: false,
      color: CYAN,
      dashCooldown: 0, isDashing: false, dashTimer: 0,
      shieldCooldown: 0, isShielding: false, shieldTimer: 0,
      specialCooldown: 0, isUsingSpecial: false, specialTimer: 0,
      invincible: 0,
    };
    opponentRef.current = {
      x: ARENA_WIDTH - 150, y: GROUND_Y, vx: 0, vy: 0,
      health: 100, maxHealth: 100,
      facing: -1, grounded: false,
      shootCooldown: 0, animFrame: 0,
      isMoving: false, isShooting: false,
      color: RED,
      dashCooldown: 0, isDashing: false, dashTimer: 0,
      shieldCooldown: 0, isShielding: false, shieldTimer: 0,
      specialCooldown: 0, isUsingSpecial: false, specialTimer: 0,
      invincible: 0,
    };
    blueBaseRef.current = { x: 50, y: GROUND_Y, health: 500, maxHealth: 500, team: 'blue' };
    redBaseRef.current = { x: ARENA_WIDTH - 80, y: GROUND_Y, health: 500, maxHealth: 500, team: 'red' };
    minionsRef.current = [];
    bulletsRef.current = [];
    minionTimerRef.current = 0;
    frameRef.current = 0;
    chatRef.current = [];

    // Adjust mood based on streak
    if (streakRef.current > 0) {
      moodRef.current = Math.min(1, 0.5 + streakRef.current * 0.15);
    } else if (streakRef.current < 0) {
      moodRef.current = Math.max(0.1, 0.5 + streakRef.current * 0.1);
    } else {
      moodRef.current = 0.5;
    }
  }, []);

  // Start match when phase changes to playing
  useEffect(() => {
    if (arenaPhase === 'playing') {
      initMatch();
    }
  }, [arenaPhase, initMatch]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      animRef.current = requestAnimationFrame(render);
      frameRef.current++;
      const cw = canvas.width;
      const ch = canvas.height;

      if (phaseRef.current !== 'playing') {
        ctx.fillStyle = DARK_BG;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1;
        const gridOff = (frameRef.current * 0.3) % 80;
        for (let x = gridOff; x < cw; x += 80) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
        }
        for (let y = 0; y < ch; y += 80) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return;
      }

      // === GAME UPDATE ===
      const player = playerRef.current;
      const opponent = opponentRef.current;
      if (!player || !opponent) return;

      const mood = moodRef.current;

      // Player input
      const keys = keysRef.current;
      let moveX = 0;
      if (keys.left) { moveX = -1; player.facing = -1; }
      if (keys.right) { moveX = 1; player.facing = 1; }

      // Player dash
      if (keys.dash && player.dashCooldown <= 0 && !player.isDashing) {
        player.isDashing = true;
        player.dashTimer = 8;
        player.dashCooldown = 90;
        player.invincible = 8;
        spawnArenaParticles(bulletsRef, player.x, player.y - 25, 5, CYAN);
      }

      if (player.isDashing) {
        player.dashTimer--;
        player.vx = 18 * player.facing;
        if (player.dashTimer <= 0) player.isDashing = false;
      } else {
        player.vx = moveX * PLAYER_SPEED;
      }

      // Player shield
      if (keys.shield && player.shieldCooldown <= 0 && !player.isShielding) {
        player.isShielding = true;
        player.shieldTimer = 120;
        player.shieldCooldown = 300;
      }
      if (player.isShielding) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) player.isShielding = false;
      }

      // Player special
      if (keys.special && player.specialCooldown <= 0 && !player.isUsingSpecial) {
        player.isUsingSpecial = true;
        player.specialTimer = 30;
        player.specialCooldown = 360;
        // Spread shot
        for (let angle = -0.4; angle <= 0.41; angle += 0.13) {
          const baseVx = BULLET_SPEED * player.facing;
          bulletsRef.current.push({
            x: player.x + player.facing * 15, y: player.y - 25,
            vx: baseVx * Math.cos(angle),
            vy: baseVx * Math.sin(angle),
            fromBlue: true, damage: 8, active: true, color: ORANGE, radius: 4,
          });
        }
      }
      if (player.isUsingSpecial) {
        player.specialTimer--;
        if (player.specialTimer <= 0) player.isUsingSpecial = false;
      }

      player.isMoving = Math.abs(moveX) > 0;

      // Jump
      if (keys.up && player.grounded) {
        player.vy = -12;
        player.grounded = false;
        soundEngine.init();
        soundEngine.playJump();
      }

      // Shoot
      if (player.shootCooldown > 0) player.shootCooldown--;
      if (keys.shoot && player.shootCooldown <= 0 && !player.isDashing) {
        bulletsRef.current.push({
          x: player.x + player.facing * 15,
          y: player.y - 25,
          vx: BULLET_SPEED * player.facing,
          vy: 0,
          fromBlue: true,
          damage: 8,
          active: true,
          color: CYAN,
          radius: 4,
        });
        player.shootCooldown = 10;
        player.isShooting = true;
        soundEngine.init();
        soundEngine.playShoot();
      } else {
        player.isShooting = false;
      }

      // Ability cooldowns
      if (player.dashCooldown > 0) player.dashCooldown--;
      if (player.shieldCooldown > 0) player.shieldCooldown--;
      if (player.specialCooldown > 0) player.specialCooldown--;
      if (player.invincible > 0) player.invincible--;

      // Gravity + move
      player.vy += GRAVITY;
      if (player.vy > 10) player.vy = 10;
      player.x += player.vx;
      player.y += player.vy;
      if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.grounded = true; }
      if (player.x < 50) player.x = 50;
      if (player.x > ARENA_WIDTH - 50) player.x = ARENA_WIDTH - 50;

      // === AI Opponent with mood system ===
      const aiDist = Math.abs(opponent.x - player.x);
      const aiReactionSpeed = mood; // Higher mood = faster reactions
      const aiAimAccuracy = 0.7 + mood * 0.3; // Higher mood = better aim
      const aiStandStillChance = (1 - mood) * 0.02; // Lower mood = sometimes stands still

      // AI movement
      if (Math.random() > aiStandStillChance) {
        if (aiDist > 200) {
          opponent.vx = (player.x > opponent.x ? 1 : -1) * (2 + aiReactionSpeed * 2);
          opponent.facing = opponent.vx > 0 ? 1 : -1;
          opponent.isMoving = true;
        } else {
          // Sometimes back away, sometimes advance
          if (Math.random() < mood * 0.3) {
            opponent.vx = (player.x > opponent.x ? -1 : 1) * 2;
          } else {
            opponent.vx = 0;
          }
          opponent.isMoving = Math.abs(opponent.vx) > 0;
          opponent.facing = player.x > opponent.x ? 1 : -1;
        }
      } else {
        opponent.vx = 0;
        opponent.isMoving = false;
        opponent.facing = player.x > opponent.x ? 1 : -1;
      }

      // AI shoot
      if (opponent.shootCooldown > 0) opponent.shootCooldown--;
      if (opponent.shootCooldown <= 0 && aiDist < 400) {
        const dx = player.x - opponent.x;
        const dy = (player.y - 25) - (opponent.y - 25);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          // Add aim inaccuracy based on mood (lower mood = more spread)
          const aimSpread = (1 - aiAimAccuracy) * 0.5;
          const spreadX = (Math.random() - 0.5) * aimSpread;
          const spreadY = (Math.random() - 0.5) * aimSpread;
          bulletsRef.current.push({
            x: opponent.x + opponent.facing * 15,
            y: opponent.y - 25,
            vx: ((dx / dist) + spreadX) * 7,
            vy: ((dy / dist) + spreadY) * 7,
            fromBlue: false,
            damage: 8,
            active: true,
            color: RED,
            radius: 3,
          });
        }
        // Shoot rate varies with mood
        opponent.shootCooldown = Math.floor((30 + Math.random() * 20) / (0.5 + mood * 0.5));
        opponent.isShooting = true;
      } else {
        opponent.isShooting = false;
      }

      // AI abilities based on mood
      if (opponent.dashCooldown > 0) opponent.dashCooldown--;
      if (opponent.shieldCooldown > 0) opponent.shieldCooldown--;
      if (opponent.specialCooldown > 0) opponent.specialCooldown--;
      if (opponent.invincible > 0) opponent.invincible--;

      // AI dash (uses when close and aggressive mood)
      if (mood > 0.6 && opponent.dashCooldown <= 0 && aiDist < 200 && Math.random() < 0.01 * mood) {
        opponent.isDashing = true;
        opponent.dashTimer = 8;
        opponent.dashCooldown = 90;
        opponent.invincible = 8;
      }
      if (opponent.isDashing) {
        opponent.dashTimer--;
        opponent.vx = 18 * opponent.facing;
        if (opponent.dashTimer <= 0) opponent.isDashing = false;
      }

      // AI shield (uses when health is low)
      if (opponent.health < opponent.maxHealth * 0.4 && opponent.shieldCooldown <= 0 && Math.random() < 0.005) {
        opponent.isShielding = true;
        opponent.shieldTimer = 60;
        opponent.shieldCooldown = 200;
      }
      if (opponent.isShielding) {
        opponent.shieldTimer--;
        if (opponent.shieldTimer <= 0) opponent.isShielding = false;
      }

      // AI special (uses when in a good mood and close)
      if (mood > 0.5 && opponent.specialCooldown <= 0 && aiDist < 350 && Math.random() < 0.003 * mood) {
        opponent.isUsingSpecial = true;
        opponent.specialTimer = 30;
        opponent.specialCooldown = 360;
        for (let angle = -0.3; angle <= 0.31; angle += 0.15) {
          const baseVx = 8 * opponent.facing;
          bulletsRef.current.push({
            x: opponent.x + opponent.facing * 15, y: opponent.y - 25,
            vx: baseVx * Math.cos(angle),
            vy: baseVx * Math.sin(angle),
            fromBlue: false, damage: 6, active: true, color: MAGENTA, radius: 3,
          });
        }
      }
      if (opponent.isUsingSpecial) {
        opponent.specialTimer--;
        if (opponent.specialTimer <= 0) opponent.isUsingSpecial = false;
      }

      // Occasionally jump
      if (opponent.grounded && Math.random() < (0.01 + mood * 0.02)) {
        opponent.vy = -11;
        opponent.grounded = false;
      }

      opponent.vy += GRAVITY;
      if (opponent.vy > 10) opponent.vy = 10;
      opponent.x += opponent.vx;
      opponent.y += opponent.vy;
      if (opponent.y >= GROUND_Y) { opponent.y = GROUND_Y; opponent.vy = 0; opponent.grounded = true; }
      if (opponent.x < 50) opponent.x = 50;
      if (opponent.x > ARENA_WIDTH - 50) opponent.x = ARENA_WIDTH - 50;

      // Chat messages
      const oppData = opponentRef_data.current;
      if (Math.random() < 0.003 && oppData) {
        const msg = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
        chatRef.current.push({ text: `${oppData.name}: ${msg}`, timer: 120, color: RED });
      }
      chatRef.current = chatRef.current.filter(c => {
        c.timer--;
        return c.timer > 0;
      });

      // === MINION SPAWNING ===
      minionTimerRef.current++;
      if (minionTimerRef.current >= MINION_SPAWN_INTERVAL) {
        minionTimerRef.current = 0;
        minionsRef.current.push({
          x: 100, y: GROUND_Y, vx: 1.5, vy: 0,
          team: 'blue', health: 40, maxHealth: 40,
          facing: 1, attackCooldown: 0, animFrame: 0, active: true,
        });
        minionsRef.current.push({
          x: ARENA_WIDTH - 100, y: GROUND_Y, vx: -1.5, vy: 0,
          team: 'red', health: 40, maxHealth: 40,
          facing: -1, attackCooldown: 0, animFrame: 0, active: true,
        });
      }

      // === UPDATE MINIONS ===
      for (const minion of minionsRef.current) {
        if (!minion.active) continue;
        minion.animFrame++;
        const enemyMinions = minionsRef.current.filter(m =>
          m.active && m.team !== minion.team && Math.abs(m.x - minion.x) < 100
        );
        if (enemyMinions.length > 0) {
          const target = enemyMinions[0];
          minion.attackCooldown--;
          if (minion.attackCooldown <= 0) {
            target.health -= 5;
            minion.attackCooldown = 30;
            if (target.health <= 0) target.active = false;
          }
          minion.vx = 0;
        } else {
          minion.vx = minion.team === 'blue' ? 1.2 : -1.2;
        }
        if (minion.team === 'blue' && minion.x >= redBaseRef.current.x - 20) {
          redBaseRef.current.health -= 1;
          minion.vx = 0;
          minion.attackCooldown--;
          if (minion.attackCooldown <= 0) {
            redBaseRef.current.health -= 2;
            minion.attackCooldown = 30;
            soundEngine.init();
            soundEngine.playHit();
          }
        }
        if (minion.team === 'red' && minion.x <= blueBaseRef.current.x + 40) {
          blueBaseRef.current.health -= 1;
          minion.vx = 0;
          minion.attackCooldown--;
          if (minion.attackCooldown <= 0) {
            blueBaseRef.current.health -= 2;
            minion.attackCooldown = 30;
          }
        }
        minion.x += minion.vx;
      }
      minionsRef.current = minionsRef.current.filter(m => m.active);

      // === UPDATE BULLETS ===
      for (const bullet of bulletsRef.current) {
        if (!bullet.active) continue;
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        if (bullet.x < -20 || bullet.x > ARENA_WIDTH + 20) { bullet.active = false; continue; }

        if (bullet.fromBlue) {
          // Hit opponent
          const opp = opponentRef.current;
          if (opp && opp.invincible <= 0 && !opp.isShielding && Math.abs(bullet.x - opp.x) < 15 && Math.abs(bullet.y - (opp.y - 25)) < 25) {
            opp.health -= bullet.damage;
            bullet.active = false;
            soundEngine.init();
            soundEngine.playHit();
          }
          // Hit red minions
          for (const minion of minionsRef.current) {
            if (!minion.active || minion.team !== 'red') continue;
            if (Math.abs(bullet.x - minion.x) < 15 && Math.abs(bullet.y - (minion.y - 15)) < 15) {
              minion.health -= bullet.damage;
              bullet.active = false;
              if (minion.health <= 0) {
                minion.active = false;
                soundEngine.init();
                soundEngine.playEnemyDeath();
              }
              break;
            }
          }
        } else {
          // Hit player
          if (player.invincible <= 0 && !player.isShielding && Math.abs(bullet.x - player.x) < 15 && Math.abs(bullet.y - (player.y - 25)) < 25) {
            player.health -= bullet.damage;
            bullet.active = false;
            soundEngine.init();
            soundEngine.playDamage();
          }
          // Hit blue minions
          for (const minion of minionsRef.current) {
            if (!minion.active || minion.team !== 'blue') continue;
            if (Math.abs(bullet.x - minion.x) < 15 && Math.abs(bullet.y - (minion.y - 15)) < 15) {
              minion.health -= bullet.damage;
              bullet.active = false;
              if (minion.health <= 0) minion.active = false;
              break;
            }
          }
        }
      }
      bulletsRef.current = bulletsRef.current.filter(b => b.active);

      // === CHECK WIN/LOSE ===
      const blueBase = blueBaseRef.current;
      const redBase = redBaseRef.current;

      if (redBase.health <= 0 || opponent.health <= 0) {
        phaseRef.current = 'result';
        setMatchResult('win');
        setArenaPhase('result');
        streakRef.current = Math.max(streakRef.current + 1, 1);
        setStreak(streakRef.current);
        updateRanking(true);
        soundEngine.init();
        soundEngine.playLevelComplete();
        return;
      }
      if (blueBase.health <= 0 || player.health <= 0) {
        phaseRef.current = 'result';
        setMatchResult('loss');
        setArenaPhase('result');
        streakRef.current = Math.min(streakRef.current - 1, -1);
        setStreak(streakRef.current);
        updateRanking(false);
        soundEngine.init();
        soundEngine.playGameOver();
        return;
      }

      // === RENDER ===
      ctx.fillStyle = DARK_BG;
      ctx.fillRect(0, 0, cw, ch);

      const scale = Math.min(cw / ARENA_WIDTH, ch / ARENA_HEIGHT);
      const offsetX = (cw - ARENA_WIDTH * scale) / 2;
      const offsetY = (ch - ARENA_HEIGHT * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Grid
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1;
      for (let x = 0; x < ARENA_WIDTH; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < ARENA_HEIGHT; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_WIDTH, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Ground
      ctx.fillStyle = '#0a1a1a';
      ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, ARENA_HEIGHT - GROUND_Y);
      ctx.strokeStyle = LIME;
      ctx.shadowBlur = 8;
      ctx.shadowColor = LIME;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(ARENA_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lane divider
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = YELLOW;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.moveTo(ARENA_WIDTH / 2, GROUND_Y - 100);
      ctx.lineTo(ARENA_WIDTH / 2, GROUND_Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Bases
      ctx.fillStyle = 'rgba(0,255,255,0.08)';
      ctx.fillRect(blueBase.x - 10, GROUND_Y - 80, 50, 80);
      ctx.strokeStyle = CYAN;
      ctx.shadowBlur = 10; ctx.shadowColor = CYAN; ctx.lineWidth = 2;
      ctx.strokeRect(blueBase.x - 10, GROUND_Y - 80, 50, 80);
      const bbPct = Math.max(0, blueBase.health / blueBase.maxHealth);
      ctx.fillStyle = '#001a00';
      ctx.fillRect(blueBase.x - 15, GROUND_Y - 90, 60, 6);
      ctx.fillStyle = CYAN; ctx.shadowColor = CYAN;
      ctx.fillRect(blueBase.x - 15, GROUND_Y - 90, 60 * bbPct, 6);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,51,51,0.08)';
      ctx.fillRect(redBase.x - 10, GROUND_Y - 80, 50, 80);
      ctx.strokeStyle = RED;
      ctx.shadowBlur = 10; ctx.shadowColor = RED; ctx.lineWidth = 2;
      ctx.strokeRect(redBase.x - 10, GROUND_Y - 80, 50, 80);
      const rbPct = Math.max(0, redBase.health / redBase.maxHealth);
      ctx.fillStyle = '#1a0000';
      ctx.fillRect(redBase.x - 15, GROUND_Y - 90, 60, 6);
      ctx.fillStyle = RED; ctx.shadowColor = RED;
      ctx.fillRect(redBase.x - 15, GROUND_Y - 90, 60 * rbPct, 6);
      ctx.shadowBlur = 0;

      // Minions
      for (const minion of minionsRef.current) {
        if (!minion.active) continue;
        const mColor = minion.team === 'blue' ? CYAN : RED;
        ctx.strokeStyle = mColor;
        ctx.shadowBlur = 5; ctx.shadowColor = mColor; ctx.lineWidth = 1.5;
        const mx = minion.x; const my = minion.y;
        ctx.beginPath(); ctx.arc(mx, my - 30, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 25); ctx.lineTo(mx, my - 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 20); ctx.lineTo(mx - 6, my - 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 20); ctx.lineTo(mx + 6, my - 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 8); ctx.lineTo(mx - 5, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 8); ctx.lineTo(mx + 5, my); ctx.stroke();
        const mhpPct = minion.health / minion.maxHealth;
        ctx.fillStyle = '#111'; ctx.fillRect(mx - 10, my - 38, 20, 3);
        ctx.fillStyle = mhpPct > 0.5 ? LIME : mhpPct > 0.25 ? ORANGE : RED;
        ctx.fillRect(mx - 10, my - 38, 20 * mhpPct, 3);
        ctx.shadowBlur = 0;
      }

      // Draw player
      drawArenaStickman(ctx, player.x, player.y, player.facing, player.color, player.animFrame, player.isShooting, player.grounded, player.isMoving, player.isShielding, player.invincible > 0);
      // Player HP bar
      const pPct = Math.max(0, player.health / player.maxHealth);
      ctx.fillStyle = '#111'; ctx.fillRect(player.x - 15, player.y - 55, 30, 4);
      ctx.fillStyle = pPct > 0.5 ? LIME : pPct > 0.25 ? ORANGE : RED;
      ctx.shadowBlur = 3; ctx.shadowColor = ctx.fillStyle;
      ctx.fillRect(player.x - 15, player.y - 55, 30 * pPct, 4);
      ctx.shadowBlur = 0;

      // Draw opponent
      drawArenaStickman(ctx, opponent.x, opponent.y, opponent.facing, opponent.color, opponent.animFrame, opponent.isShooting, opponent.grounded, opponent.isMoving, opponent.isShielding, opponent.invincible > 0);
      const oPct = Math.max(0, opponent.health / opponent.maxHealth);
      ctx.fillStyle = '#111'; ctx.fillRect(opponent.x - 15, opponent.y - 55, 30, 4);
      ctx.fillStyle = RED; ctx.fillRect(opponent.x - 15, opponent.y - 55, 30 * oPct, 4);

      // Bullets
      for (const bullet of bulletsRef.current) {
        if (!bullet.active) continue;
        ctx.shadowBlur = 8; ctx.shadowColor = bullet.color;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.4; ctx.fillStyle = bullet.color;
        ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

      // Chat messages
      ctx.globalAlpha = 0.8;
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      let chatY = 80;
      for (const msg of chatRef.current.slice(-3)) {
        const alpha = Math.min(1, msg.timer / 30);
        ctx.globalAlpha = alpha * 0.8;
        ctx.shadowBlur = 3;
        ctx.shadowColor = msg.color;
        ctx.fillStyle = msg.color;
        ctx.fillText(msg.text, ARENA_WIDTH * 0.3, chatY);
        chatY += 16;
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // HUD with player avatars
      ctx.globalAlpha = 0.9;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';

      // Player name + avatar
      ctx.shadowBlur = 5; ctx.shadowColor = CYAN; ctx.fillStyle = CYAN;
      ctx.font = '16px sans-serif';
      ctx.fillText(saveData.avatar, ARENA_WIDTH * 0.25 - 55, 32);
      ctx.font = 'bold 14px monospace';
      ctx.fillText(saveData.username, ARENA_WIDTH * 0.25, 32);

      // Opponent name + avatar
      ctx.shadowColor = RED; ctx.fillStyle = RED;
      if (oppData) {
        ctx.font = '16px sans-serif';
        ctx.fillText(oppData.avatar, ARENA_WIDTH * 0.75 - 55, 32);
      }
      ctx.font = 'bold 14px monospace';
      ctx.fillText(oppData?.name ?? '???', ARENA_WIDTH * 0.75, 32);

      ctx.shadowColor = YELLOW; ctx.fillStyle = YELLOW;
      ctx.fillText('ONLINE ARENA', ARENA_WIDTH / 2, 32);

      // Streak indicator
      if (Math.abs(streakRef.current) > 1) {
        ctx.font = '10px monospace';
        ctx.fillStyle = streakRef.current > 0 ? LIME : RED;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillText(streakRef.current > 0 ? `${streakRef.current} WIN STREAK` : `${Math.abs(streakRef.current)} LOSS STREAK`, ARENA_WIDTH / 2, 48);
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Ability cooldown indicators for player
      const abY = GROUND_Y + 25;
      const abX = ARENA_WIDTH * 0.15;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      const abilities = [
        { label: 'DASH', cd: player.dashCooldown, max: 90, color: CYAN },
        { label: 'SHLD', cd: player.shieldCooldown, max: 300, color: LIME },
        { label: 'SPCL', cd: player.specialCooldown, max: 360, color: ORANGE },
      ];
      for (let i = 0; i < abilities.length; i++) {
        const ab = abilities[i];
        const x = abX + i * 45;
        const ready = ab.cd <= 0;
        ctx.globalAlpha = ready ? 1 : 0.4;
        ctx.strokeStyle = ab.color;
        ctx.lineWidth = ready ? 2 : 1;
        ctx.shadowBlur = ready ? 5 : 0;
        ctx.shadowColor = ab.color;
        ctx.strokeRect(x - 15, abY - 8, 30, 16);
        ctx.fillStyle = ab.color;
        ctx.fillText(ab.label, x, abY + 3);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [opponent, saveData.username, saveData.avatar, updateRanking]);

  const startSearch = useCallback(() => {
    const opp = generateOpponent(saveData.rankingData.elo, Date.now());
    setOpponent(opp);
    opponentRef_data.current = opp;
    setArenaPhase('searching');
    setSearchTimer(0);
    phaseRef.current = 'searching';
  }, [saveData.rankingData.elo]);

  const handleFindMatch = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    startSearch();
  };

  const handleCreateRoom = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    startSearch();
  };

  const handleJoinRoom = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    if (joinCode.length >= 4) {
      startSearch();
    }
  };

  const handleBack = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    phaseRef.current = 'lobby';
    backToMenu();
  };

  // Rematch with same opponent — but opponent might decline (like real online games)
  const [rematchDeclined, setRematchDeclined] = useState(false);
  const [rematchPending, setRematchPending] = useState(false);

  const handleRematch = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    setRematchPending(true);

    // Simulate opponent deciding — 65% chance they decline (like real online games where most people move on)
    setTimeout(() => {
      setRematchPending(false);
      if (Math.random() < 0.65) {
        // Opponent declined
        setRematchDeclined(true);
        setTimeout(() => {
          setRematchDeclined(false);
          // Auto-search for new opponent
          startSearch();
        }, 2000);
      } else {
        // Opponent accepted rematch
        setArenaPhase('playing');
        phaseRef.current = 'playing';
        initMatch();
      }
    }, 1500);
  };

  // Search for new opponent
  const handleNewGame = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    startSearch();
  };

  // ELO change calculation
  const eloChange = matchResult === 'win' ? 25 : matchResult === 'loss' ? -15 : 0;

  // Render opponent avatar component
  const renderAvatarCircle = (avatar: string, borderColor: string, size: number = 48) => (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        border: `3px solid ${borderColor}`,
        backgroundColor: 'rgba(0,0,0,0.5)',
        boxShadow: `0 0 15px ${borderColor}40`,
        fontSize: size * 0.5,
      }}
    >
      {avatar}
    </div>
  );

  return (
    <div className="absolute inset-0 z-20" style={{ backgroundColor: DARK_BG }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* Lobby overlay */}
      {arenaPhase === 'lobby' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div
            className="w-full max-w-md p-4 sm:p-6 rounded-lg mx-4"
            style={{
              backgroundColor: 'rgba(5,5,20,0.95)',
              border: '2px solid #ff6600',
              boxShadow: '0 0 30px #ff660020',
            }}
          >
            <h1
              className="text-2xl sm:text-3xl font-bold text-center tracking-wider mb-3 font-mono"
              style={{ color: ORANGE, textShadow: '0 0 10px #ff6600' }}
            >
              ONLINE ARENA
            </h1>

            {/* ELO Ranking Display — prominent */}
            <div
              className="text-center mb-4 p-3 rounded-lg"
              style={{
                backgroundColor: 'rgba(255,215,0,0.05)',
                border: '1px solid rgba(255,215,0,0.2)',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {renderAvatarCircle(saveData.avatar, GOLD, 36)}
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{rankInfo.icon}</span>
                    <span className="font-mono font-bold text-base" style={{ color: GOLD, textShadow: '0 0 5px #ffd700' }}>
                      {rankInfo.rank}
                    </span>
                  </div>
                  <span className="font-mono text-sm" style={{ color: '#aaa' }}>
                    ELO: <span style={{ color: GOLD }}>{saveData.rankingData.elo}</span>
                  </span>
                </div>
              </div>
              <div className="font-mono text-xs mt-1" style={{ color: '#666' }}>
                <span style={{ color: LIME }}>W: {saveData.rankingData.wins}</span>
                <span className="mx-2">|</span>
                <span style={{ color: RED }}>L: {saveData.rankingData.losses}</span>
                {streak !== 0 && (
                  <span className="ml-2" style={{ color: streak > 0 ? LIME : RED }}>
                    {streak > 0 ? `🔥${streak}` : `💀${Math.abs(streak)}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleFindMatch}
                className="neon-btn w-full py-3 px-6 text-lg font-bold font-mono tracking-wider"
                style={{ borderColor: ORANGE, color: ORANGE, textShadow: '0 0 10px #ff6600' }}
              >
                ⚔️ FIND MATCH
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCreateRoom}
                  className="neon-btn py-2 px-3 text-xs sm:text-sm font-bold font-mono tracking-wider"
                  style={{ borderColor: CYAN, color: CYAN, textShadow: '0 0 10px #00ffff' }}
                >
                  🏠 CREATE ROOM
                </button>
                <button
                  onClick={() => { soundEngine.init(); soundEngine.playMenuClick(); setShowJoinRoom(!showJoinRoom); }}
                  className="neon-btn py-2 px-3 text-xs sm:text-sm font-bold font-mono tracking-wider"
                  style={{ borderColor: PURPLE, color: PURPLE, textShadow: '0 0 10px #aa00ff' }}
                >
                  🔗 JOIN ROOM
                </button>
              </div>

              {/* Room code display */}
              {roomCode && (
                <div className="text-center font-mono text-sm p-2 rounded" style={{ color: GOLD, backgroundColor: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
                  Room Code: <span className="font-bold text-lg tracking-widest">{roomCode}</span>
                  <div className="text-[9px]" style={{ color: '#666' }}>Share this code with your friend</div>
                </div>
              )}

              {/* Join room input */}
              {showJoinRoom && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="ROOM CODE"
                    maxLength={6}
                    className="flex-1 px-3 py-2 font-mono text-sm rounded"
                    style={{
                      backgroundColor: 'rgba(170,0,255,0.1)',
                      border: '1px solid #aa00ff',
                      color: '#fff',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={joinCode.length < 4}
                    className="px-4 py-2 font-mono text-sm font-bold rounded"
                    style={{
                      backgroundColor: joinCode.length >= 4 ? 'rgba(170,0,255,0.2)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${joinCode.length >= 4 ? PURPLE : '#444'}`,
                      color: joinCode.length >= 4 ? PURPLE : '#555',
                    }}
                  >
                    JOIN
                  </button>
                </div>
              )}

              <button
                onClick={handleBack}
                className="neon-btn w-full py-2 px-4 text-sm tracking-wider"
                style={{ borderColor: '#666', color: '#888' }}
              >
                BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Searching overlay — improved with pulsing animation */}
      {arenaPhase === 'searching' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="text-center">
            {/* Pulsing radar effect */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `2px solid ${ORANGE}40`,
                  animation: 'search-pulse 1.5s ease-out infinite',
                }}
              />
              <div
                className="absolute inset-4 rounded-full"
                style={{
                  border: `2px solid ${ORANGE}60`,
                  animation: 'search-pulse 1.5s ease-out infinite 0.3s',
                }}
              />
              <div
                className="absolute inset-8 rounded-full"
                style={{
                  border: `2px solid ${ORANGE}80`,
                  animation: 'search-pulse 1.5s ease-out infinite 0.6s',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl" style={{ animation: 'search-spin 2s linear infinite' }}>⚔️</span>
              </div>
            </div>

            <div
              className="text-xl sm:text-2xl font-bold font-mono mb-3"
              style={{ color: ORANGE, textShadow: '0 0 15px #ff6600' }}
            >
              FINDING OPPONENT...
            </div>

            {/* Scanning names */}
            {searchTimer > 0 && (
              <div className="font-mono text-xs mb-2" style={{ color: '#555' }}>
                Scanning: {FAKE_PLAYER_NAMES[searchTimer % FAKE_PLAYER_NAMES.length]}
              </div>
            )}

            <div className="w-48 h-2 rounded-full mx-auto overflow-hidden" style={{ backgroundColor: '#222' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(searchTimer / 3) * 100}%`,
                  backgroundColor: ORANGE,
                  boxShadow: '0 0 10px #ff6600',
                }}
              />
            </div>
            <div className="text-xs font-mono mt-2" style={{ color: '#666' }}>
              {searchTimer}/3
            </div>
          </div>
        </div>
      )}

      {/* Matched overlay — show opponent profile */}
      {arenaPhase === 'matched' && opponent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div
            className="text-center p-6 rounded-lg mx-4 w-full max-w-sm"
            style={{
              backgroundColor: 'rgba(5,5,20,0.95)',
              border: '2px solid #ff6600',
              boxShadow: '0 0 40px #ff660030',
            }}
          >
            <div
              className="text-lg font-bold font-mono mb-4"
              style={{ color: ORANGE, textShadow: '0 0 10px #ff6600' }}
            >
              OPPONENT FOUND!
            </div>

            {/* VS display with both player pfps */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {/* Player */}
              <div className="flex flex-col items-center">
                {renderAvatarCircle(saveData.avatar, CYAN, 56)}
                <div className="font-mono font-bold text-sm mt-1.5" style={{ color: CYAN }}>
                  {saveData.username}
                </div>
                <div className="font-mono text-xs" style={{ color: GOLD }}>
                  {rankInfo.icon} {rankInfo.rank}
                </div>
                <div className="font-mono text-xs" style={{ color: '#888' }}>
                  ELO {saveData.rankingData.elo}
                </div>
              </div>

              {/* VS */}
              <div
                className="text-2xl font-bold font-mono"
                style={{ color: ORANGE, textShadow: '0 0 20px #ff6600' }}
              >
                VS
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center">
                {renderAvatarCircle(opponent.avatar, RED, 56)}
                <div className="font-mono font-bold text-sm mt-1.5" style={{ color: RED }}>
                  {opponent.name}
                </div>
                <div className="font-mono text-xs" style={{ color: GOLD }}>
                  {opponent.rankIcon} {opponent.rank}
                </div>
                <div className="font-mono text-xs" style={{ color: '#888' }}>
                  ELO {opponent.elo}
                </div>
              </div>
            </div>

            <div
              className="text-xs font-mono animate-pulse"
              style={{ color: LIME, textShadow: '0 0 8px #00ff66' }}
            >
              MATCH STARTING...
            </div>
          </div>
        </div>
      )}

      {/* Result overlay — with both player profile pictures */}
      {arenaPhase === 'result' && matchResult && opponent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="text-center w-full max-w-sm mx-4">
            {/* Winner / Loser display with avatars */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {/* Player */}
              <div className="flex flex-col items-center">
                {renderAvatarCircle(
                  saveData.avatar,
                  matchResult === 'win' ? GOLD : '#555',
                  matchResult === 'win' ? 64 : 44,
                )}
                {matchResult === 'win' && (
                  <div className="font-mono text-[10px] mt-1 px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,215,0,0.2)', color: GOLD }}>WINNER</div>
                )}
                <div className="font-mono font-bold text-xs mt-1" style={{ color: matchResult === 'win' ? CYAN : '#666' }}>
                  {saveData.username}
                </div>
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center">
                {renderAvatarCircle(
                  opponent.avatar,
                  matchResult === 'loss' ? GOLD : '#555',
                  matchResult === 'loss' ? 64 : 44,
                )}
                {matchResult === 'loss' && (
                  <div className="font-mono text-[10px] mt-1 px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,215,0,0.2)', color: GOLD }}>WINNER</div>
                )}
                <div className="font-mono font-bold text-xs mt-1" style={{ color: matchResult === 'loss' ? RED : '#666' }}>
                  {opponent.name}
                </div>
              </div>
            </div>

            {/* Result title */}
            <h1
              className="text-4xl sm:text-6xl font-bold tracking-wider mb-2"
              style={{
                color: matchResult === 'win' ? LIME : RED,
                textShadow: matchResult === 'win' ? '0 0 20px #00ff66, 0 0 40px #00ff66' : '0 0 20px #ff3333, 0 0 40px #ff3333',
              }}
            >
              {matchResult === 'win' ? 'VICTORY' : 'DEFEATED'}
            </h1>

            {/* ELO change */}
            <div
              className="inline-block font-mono text-sm mb-1 px-3 py-1 rounded"
              style={{
                color: matchResult === 'win' ? LIME : RED,
                backgroundColor: matchResult === 'win' ? 'rgba(0,255,102,0.1)' : 'rgba(255,51,51,0.1)',
                border: `1px solid ${matchResult === 'win' ? LIME : RED}30`,
              }}
            >
              {matchResult === 'win' ? '+' : ''}{eloChange} ELO
            </div>

            <div className="font-mono text-lg mb-1" style={{ color: '#888' }}>
              ELO: <span style={{ color: GOLD }}>{saveData.rankingData.elo}</span>
            </div>

            {/* Opponent info */}
            <div className="font-mono text-xs mb-2" style={{ color: '#555' }}>
              vs {opponent.rankIcon} {opponent.name} (ELO {opponent.elo})
            </div>

            {Math.abs(streak) > 1 && (
              <div className="font-mono text-sm mb-3" style={{ color: streak > 0 ? LIME : RED }}>
                {streak > 0 ? `🔥 ${streak} WIN STREAK!` : `💀 ${Math.abs(streak)} losses in a row`}
              </div>
            )}

            {/* Rematch pending message */}
            {rematchPending && (
              <div className="font-mono text-sm mb-3" style={{ color: ORANGE, textShadow: '0 0 8px #ff6600' }}>
                Waiting for {opponent.name}...
              </div>
            )}

            {/* Rematch declined message */}
            {rematchDeclined && (
              <div className="font-mono text-sm mb-3" style={{ color: RED, textShadow: '0 0 8px #ff3333' }}>
                {opponent.name} declined rematch. Finding new opponent...
              </div>
            )}

            {!rematchPending && !rematchDeclined && (
              <div className="flex flex-col gap-2.5 items-center">
                {/* NEW GAME - Primary button */}
                <button
                  onClick={handleNewGame}
                  className="w-56 py-3 px-6 text-lg font-bold font-mono tracking-wider"
                  style={{
                    border: '2px solid #00ff66',
                    color: '#00ff66',
                    textShadow: '0 0 15px #00ff66, 0 0 30px #00ff66',
                    backgroundColor: 'rgba(0,255,102,0.1)',
                    boxShadow: '0 0 20px rgba(0,255,102,0.3), inset 0 0 20px rgba(0,255,102,0.05)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  NEW GAME ▶
                </button>

                {/* REMATCH - Secondary button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleRematch}
                    className="neon-btn w-48 py-2 px-6 text-base font-bold font-mono tracking-wider"
                    style={{ borderColor: ORANGE, color: ORANGE, textShadow: '0 0 8px #ff6600' }}
                  >
                    REMATCH
                  </button>
                  <span className="text-[10px] font-mono mt-1" style={{ color: '#666' }}>
                    (Same opponent — may decline)
                  </span>
                </div>

                {/* MAIN MENU */}
                <button
                  onClick={handleBack}
                  className="neon-btn w-48 py-2 px-6 text-base font-bold font-mono tracking-wider"
                  style={{ borderColor: '#666', color: '#888' }}
                >
                  MAIN MENU
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search animation keyframes */}
      <style jsx global>{`
        @keyframes search-pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes search-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function spawnArenaParticles(bullets: React.MutableRefObject<ArenaBullet[]>, x: number, y: number, count: number, color: string) {
  // Simplified particle spawn for arena
  void bullets; void x; void y; void count; void color;
}

// ====== ARENA STICKMAN RENDERER ======
function drawArenaStickman(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number, color: string,
  animFrame: number, isShooting: boolean,
  grounded: boolean, isMoving: boolean,
  isShielding: boolean = false,
  isInvincible: boolean = false,
) {
  ctx.save();
  ctx.translate(x, y);

  // Invincibility flicker
  if (isInvincible) {
    ctx.globalAlpha = 0.5 + Math.sin(animFrame * 0.3) * 0.3;
  }

  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Shield effect
  if (isShielding) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = LIME;
    ctx.beginPath();
    ctx.arc(0, -20, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -20, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
  }

  // Head
  ctx.beginPath();
  ctx.arc(0, -38, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(0, -10);
  ctx.stroke();

  // Arms
  if (isShooting) {
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(facing * 22, -25);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(facing * 25, -25, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const swing = isMoving ? Math.sin(animFrame * 0.3) * 10 : 0;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-10, -20 + swing);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(10, -20 - swing);
    ctx.stroke();
  }

  // Legs
  if (isMoving) {
    const legSwing = Math.sin(animFrame * 0.3) * 12;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-7 + legSwing * 0.3, 0 + legSwing);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7 - legSwing * 0.3, 0 - legSwing);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-8, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 0);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}
