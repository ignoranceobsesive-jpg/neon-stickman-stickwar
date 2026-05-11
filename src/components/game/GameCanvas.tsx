'use client';

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useGameStore } from '@/stores/game-store';
import {
  type LevelDef, type PlayerState, type EnemyState, type Bullet, type Particle, type Platform,
  type JoystickInput, LEVELS, VOICE_LINES, VERSUS_ARENA,
  GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, BULLET_SPEED, MAX_FALL_SPEED,
  SHOOT_COOLDOWN, INVINCIBLE_FRAMES,
  DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  SHIELD_DURATION, SHIELD_COOLDOWN,
  SPECIAL_COOLDOWN, SPECIAL_DAMAGE,
  CYAN, MAGENTA, ORANGE, RED, PURPLE, LIME, YELLOW, DARK_BG, GOLD, PINK, BLUE,
  type SparkExpression, type GangMember, GANG_MEMBERS, SKINS,
  PET_DEFS, PET_SKINS, type PetState, type PetType, TOTAL_LEVELS, generateProceduralLevel,
  getSurpriseForLevel, type MidLevelSurprise,
  SKILL_DEFS, type SkillDef, type SkillState,
  SKILL_UPGRADE_DAMAGE, SKILL_UPGRADE_COOLDOWN,
  getSeasonForLevel, getSeasonVisuals, type SeasonVisuals, isFlyingEnemy, type EnemyType,
  WEAPON_UPGRADES, type WeaponUpgradeType,
} from '@/lib/game-types';

const VIRTUAL_HEIGHT = 600;

import {
  drawNeonStickman, drawBoss, drawEnemy, drawBullet, drawParticle,
  drawBackground, drawPlatform, drawExitPortal,
  drawMenuBackground, drawGameOverBackground, drawVictoryBackground,
} from '@/lib/game-renderer';
import { soundEngine } from '@/lib/sound-engine';
import { writeSave } from '@/lib/save-manager';

export interface GameEngineControls {
  moveLeft: () => void;
  moveRight: () => void;
  stopMove: () => void;
  jump: () => void;
  shoot: () => void;
  stopShoot: () => void;
  dash: () => void;
  shield: () => void;
  special: () => void;
  setJoystick: (input: JoystickInput) => void;
  setP2Joystick: (input: JoystickInput) => void;
  executeSkill: (skillId: string) => void;
  pause: () => void;
}

function aabb(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Mobile detection for performance scaling
const _isMobile = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const MOBILE_PARTICLE_FACTOR = _isMobile ? 0.6 : 1;
const MOBILE_MAX_PARTICLES = _isMobile ? 40 : 100;
const MOBILE_TARGET_FPS = _isMobile ? 30 : 60;
const MOBILE_FRAME_MS = 1000 / MOBILE_TARGET_FPS;

function spawnParticles(particles: Particle[], x: number, y: number, count: number, color: string) {
  // Reduce particle count on mobile for performance
  const adjustedCount = Math.ceil(count * MOBILE_PARTICLE_FACTOR);
  for (let i = 0; i < adjustedCount; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 25 + Math.random() * 25,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  // Cap max particles on mobile
  if (particles.length > MOBILE_MAX_PARTICLES) {
    particles.splice(0, particles.length - MOBILE_MAX_PARTICLES);
  }
}

function getPlatPos(plat: Platform): { px: number; py: number } {
  const px = plat.type === 'moving' && plat.moveAxis === 'x' && plat.moveRange && plat.moveSpeed
    ? plat.x + Math.sin(plat.moveOffset || 0) * plat.moveRange
    : plat.x;
  const py = plat.type === 'moving' && plat.moveAxis === 'y' && plat.moveRange && plat.moveSpeed
    ? plat.y + Math.sin(plat.moveOffset || 0) * plat.moveRange
    : plat.y;
  return { px, py };
}

function getEnemyHeight(type: string): number {
  if (type === 'boss' || type === 'bossRedKing' || type === 'bossTitan' || type === 'bossDragon' || type === 'bossPhoenix' || type === 'bossMechGolem' || type === 'bossCorrupted' || type === 'bossFather' || type === 'bossTwin') return 80;
  if (type === 'giant') return 80;
  if (type === 'voidGuardian') return 30;
  if (type === 'dragon' || type === 'phoenix') return 50;
  if (type === 'mechGolem' || type === 'heavyWalker' || type === 'zombie') return 55;
  if (type === 'shadowAssassin' || type === 'eliteDrone' || type === 'necromancer') return 50;
  if (type === 'bomber') return 45;
  // Flying enemy types
  if (type === 'voidBat') return 30;
  if (type === 'stormEagle') return 45;
  if (type === 'emberWisp') return 30;
  if (type === 'frostWraith') return 45;
  if (type === 'shadowDrake') return 55;
  if (type === 'plasmaSerpent') return 50;
  if (type === 'neonWyrm') return 60;
  if (type === 'crystalMoth') return 35;
  return 50;
}

function randomVoiceLine(category: string): string {
  const lines = VOICE_LINES[category];
  if (!lines || lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}

function drawPet(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  type: PetType,
  color: string,
  animFrame: number,
  facing: 1 | -1,
) {
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  const bob = Math.sin(animFrame * 0.08) * 3;

  if (type === 'neonWolf') {
    // Wolf body
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + bob, 8, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + facing * 10, y - 15 + bob, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x + facing * 8, y - 19 + bob);
    ctx.lineTo(x + facing * 6, y - 24 + bob);
    ctx.moveTo(x + facing * 13, y - 19 + bob);
    ctx.lineTo(x + facing * 14, y - 24 + bob);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 12, y - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x - facing * 8, y - 10 + bob);
    ctx.quadraticCurveTo(x - facing * 14, y - 20 + bob + Math.sin(animFrame * 0.15) * 3, x - facing * 16, y - 16 + bob);
    ctx.stroke();
  } else if (type === 'plasmaFalcon') {
    // Falcon body
    ctx.beginPath();
    ctx.ellipse(x, y - 12 + bob, 6, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.2) * 6;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 12 + bob);
    ctx.lineTo(x - 16, y - 18 + bob + wingFlap);
    ctx.lineTo(x - 8, y - 8 + bob);
    ctx.moveTo(x + 5, y - 12 + bob);
    ctx.lineTo(x + 16, y - 18 + bob + wingFlap);
    ctx.lineTo(x + 8, y - 8 + bob);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + facing * 8, y - 16 + bob, 3, 0, Math.PI * 2);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 9, y - 16 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.beginPath();
    ctx.moveTo(x + facing * 11, y - 16 + bob);
    ctx.lineTo(x + facing * 14, y - 15 + bob);
    ctx.stroke();
  } else if (type === 'shadowSpider') {
    // Spider body
    ctx.beginPath();
    ctx.arc(x, y - 10 + bob, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + facing * 6, y - 14 + bob, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Legs
    for (let i = 0; i < 4; i++) {
      const legWiggle = Math.sin(animFrame * 0.15 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 8 + bob);
      ctx.lineTo(x - 12 + legWiggle, y - 2 + i * 2 + bob);
      ctx.moveTo(x + 4, y - 8 + bob);
      ctx.lineTo(x + 12 - legWiggle, y - 2 + i * 2 + bob);
      ctx.stroke();
    }
    // Eyes
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x + facing * 7, y - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.arc(x + facing * 5, y - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'crystalGolem') {
    // Golem body (angular)
    ctx.beginPath();
    ctx.moveTo(x - 7, y + bob);
    ctx.lineTo(x - 9, y - 10 + bob);
    ctx.lineTo(x, y - 18 + bob);
    ctx.lineTo(x + 9, y - 10 + bob);
    ctx.lineTo(x + 7, y + bob);
    ctx.closePath();
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 8 + bob);
    ctx.lineTo(x - 14, y - 14 + bob + Math.sin(animFrame * 0.1) * 2);
    ctx.moveTo(x + 9, y - 8 + bob);
    ctx.lineTo(x + 14, y - 14 + bob - Math.sin(animFrame * 0.1) * 2);
    ctx.stroke();
    // Eye
    ctx.fillStyle = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x + facing * 2, y - 13 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'voidDrake') {
    // Drake body
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + bob, 9, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.15) * 8;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 12 + bob);
    ctx.lineTo(x - 18, y - 22 + bob + wingFlap);
    ctx.lineTo(x - 10, y - 6 + bob);
    ctx.moveTo(x + 6, y - 12 + bob);
    ctx.lineTo(x + 18, y - 22 + bob + wingFlap);
    ctx.lineTo(x + 10, y - 6 + bob);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + facing * 12, y - 14 + bob, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Horns
    ctx.beginPath();
    ctx.moveTo(x + facing * 10, y - 18 + bob);
    ctx.lineTo(x + facing * 8, y - 24 + bob);
    ctx.moveTo(x + facing * 14, y - 17 + bob);
    ctx.lineTo(x + facing * 16, y - 23 + bob);
    ctx.stroke();
    // Eye
    ctx.fillStyle = MAGENTA;
    ctx.beginPath();
    ctx.arc(x + facing * 13, y - 14 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x - facing * 9, y - 10 + bob);
    ctx.quadraticCurveTo(x - facing * 16, y - 6 + bob + Math.sin(animFrame * 0.12) * 4, x - facing * 20, y - 10 + bob);
    ctx.stroke();
  } else if (type === 'neonCat') {
    // Cat body (sleek)
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + bob, 7, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + facing * 8, y - 15 + bob, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Pointed ears
    ctx.beginPath();
    ctx.moveTo(x + facing * 5, y - 19 + bob);
    ctx.lineTo(x + facing * 4, y - 26 + bob);
    ctx.lineTo(x + facing * 8, y - 20 + bob);
    ctx.moveTo(x + facing * 11, y - 19 + bob);
    ctx.lineTo(x + facing * 12, y - 26 + bob);
    ctx.lineTo(x + facing * 14, y - 20 + bob);
    ctx.stroke();
    // Glowing eyes
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 9, y - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + facing * 7, y - 15 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Tail (sinuous)
    ctx.beginPath();
    ctx.moveTo(x - facing * 7, y - 10 + bob);
    ctx.bezierCurveTo(
      x - facing * 12, y - 18 + bob + Math.sin(animFrame * 0.15) * 3,
      x - facing * 18, y - 6 + bob - Math.sin(animFrame * 0.15) * 3,
      x - facing * 20, y - 14 + bob
    );
    ctx.stroke();
  } else if (type === 'thunderBird') {
    // Bird body
    ctx.beginPath();
    ctx.ellipse(x, y - 12 + bob, 7, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Wings with electric arcs
    const wingFlap = Math.sin(animFrame * 0.25) * 7;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 12 + bob);
    ctx.lineTo(x - 14, y - 20 + bob + wingFlap);
    ctx.lineTo(x - 8, y - 10 + bob);
    ctx.moveTo(x + 5, y - 12 + bob);
    ctx.lineTo(x + 14, y - 20 + bob + wingFlap);
    ctx.lineTo(x + 8, y - 10 + bob);
    ctx.stroke();
    // Lightning sparks from wingtips
    ctx.shadowBlur = 14;
    const sparkX1 = x - 14;
    const sparkX2 = x + 14;
    const sparkY = y - 20 + bob + wingFlap;
    ctx.beginPath();
    ctx.moveTo(sparkX1, sparkY);
    ctx.lineTo(sparkX1 - 2, sparkY + 4);
    ctx.lineTo(sparkX1 + 1, sparkY + 3);
    ctx.lineTo(sparkX1 - 1, sparkY + 7);
    ctx.moveTo(sparkX2, sparkY);
    ctx.lineTo(sparkX2 + 2, sparkY + 4);
    ctx.lineTo(sparkX2 - 1, sparkY + 3);
    ctx.lineTo(sparkX2 + 1, sparkY + 7);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + facing * 9, y - 16 + bob, 3, 0, Math.PI * 2);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 10, y - 16 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.beginPath();
    ctx.moveTo(x + facing * 12, y - 16 + bob);
    ctx.lineTo(x + facing * 15, y - 15 + bob);
    ctx.stroke();
  } else if (type === 'iceFox') {
    // Fox body
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + bob, 8, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head (pointed snout)
    ctx.beginPath();
    ctx.moveTo(x + facing * 8, y - 20 + bob);
    ctx.lineTo(x + facing * 14, y - 14 + bob);
    ctx.lineTo(x + facing * 8, y - 10 + bob);
    ctx.closePath();
    ctx.stroke();
    // Pointed ears
    ctx.beginPath();
    ctx.moveTo(x + facing * 6, y - 19 + bob);
    ctx.lineTo(x + facing * 4, y - 26 + bob);
    ctx.lineTo(x + facing * 9, y - 20 + bob);
    ctx.moveTo(x + facing * 11, y - 19 + bob);
    ctx.lineTo(x + facing * 13, y - 26 + bob);
    ctx.lineTo(x + facing * 10, y - 20 + bob);
    ctx.stroke();
    // Eye
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 10, y - 15 + bob, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Fluffy tail
    ctx.beginPath();
    ctx.moveTo(x - facing * 8, y - 10 + bob);
    ctx.quadraticCurveTo(x - facing * 16, y - 18 + bob + Math.sin(animFrame * 0.1) * 4, x - facing * 20, y - 14 + bob);
    ctx.quadraticCurveTo(x - facing * 16, y - 8 + bob - Math.sin(animFrame * 0.1) * 2, x - facing * 8, y - 8 + bob);
    ctx.stroke();
    // Frost particles
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const px = x + Math.sin(animFrame * 0.08 + i * 2.1) * 14;
      const py = y - 14 + Math.cos(animFrame * 0.1 + i * 1.7) * 8 + bob;
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'magmaSnail') {
    // Spiral shell
    ctx.beginPath();
    ctx.arc(x, y - 14 + bob, 9, 0, Math.PI * 2);
    ctx.stroke();
    // Shell spiral
    ctx.beginPath();
    ctx.arc(x - 2, y - 14 + bob, 6, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 1, y - 14 + bob, 3, 0, Math.PI * 1.5);
    ctx.stroke();
    // Body (slug part)
    ctx.beginPath();
    ctx.ellipse(x + facing * 8, y - 6 + bob, 6, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Antennae/eyestalks
    ctx.beginPath();
    ctx.moveTo(x + facing * 10, y - 8 + bob);
    ctx.lineTo(x + facing * 12, y - 16 + bob + Math.sin(animFrame * 0.1) * 2);
    ctx.moveTo(x + facing * 13, y - 8 + bob);
    ctx.lineTo(x + facing * 15, y - 16 + bob - Math.sin(animFrame * 0.1) * 2);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 12, y - 16 + bob + Math.sin(animFrame * 0.1) * 2, 1.2, 0, Math.PI * 2);
    ctx.arc(x + facing * 15, y - 16 + bob - Math.sin(animFrame * 0.1) * 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Fire particles around shell
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff4400';
    for (let i = 0; i < 3; i++) {
      const px = x + Math.cos(animFrame * 0.12 + i * 2.09) * 10;
      const py = y - 14 + Math.sin(animFrame * 0.15 + i * 2.09) * 8 + bob;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 - i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'cosmicOwl') {
    // Owl body (round)
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + bob, 8, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + facing * 4, y - 18 + bob, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Ear tufts
    ctx.beginPath();
    ctx.moveTo(x + facing * 0, y - 23 + bob);
    ctx.lineTo(x - facing * 2, y - 30 + bob);
    ctx.lineTo(x + facing * 3, y - 24 + bob);
    ctx.moveTo(x + facing * 8, y - 23 + bob);
    ctx.lineTo(x + facing * 10, y - 30 + bob);
    ctx.lineTo(x + facing * 6, y - 24 + bob);
    ctx.stroke();
    // Sparkle eyes
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + facing * 6, y - 18 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + facing * 2, y - 18 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Inner sparkle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + facing * 6, y - 18 + bob, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + facing * 2, y - 18 + bob, 1, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.12) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 10 + bob);
    ctx.lineTo(x - 14, y - 14 + bob + wingFlap);
    ctx.lineTo(x - 8, y - 4 + bob);
    ctx.moveTo(x + 6, y - 10 + bob);
    ctx.lineTo(x + 14, y - 14 + bob + wingFlap);
    ctx.lineTo(x + 8, y - 4 + bob);
    ctx.stroke();
    // Star patterns on body
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const sx = x + Math.cos(i * 1.57 + animFrame * 0.02) * 5;
      const sy = y - 10 + Math.sin(i * 1.57 + animFrame * 0.02) * 4 + bob;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

const isGroundAhead = (x: number, y: number, facing: number, platforms: Platform[], level: LevelDef, entityWidth: number = 20): boolean => {
  // Check multiple points ahead to account for entity width and speed
  const checkDist = 35; // further ahead for better detection
  const checkY = y + 5; // just below the entity's feet

  // Check front edge and center-front
  const checkPoints = [
    x + facing * checkDist,                          // front edge
    x + facing * checkDist + (facing > 0 ? entityWidth : -entityWidth) * 0.5, // center-front
    x + (facing > 0 ? entityWidth : 0) + facing * 5, // just past the edge
  ];

  for (const checkX of checkPoints) {
    let foundGround = false;
    for (const plat of platforms) {
      const { px, py } = getPlatPos(plat);
      if (checkX >= px && checkX <= px + plat.width &&
          checkY >= py - 5 && checkY <= py + plat.height + 20) {
        foundGround = true;
        break;
      }
    }
    if (!foundGround) return false; // No ground at this check point = cliff ahead
  }

  // Out of bounds = no ground
  if (x + facing * checkDist < 0 || x + facing * checkDist > level.width - 20) return false;

  return true;
};

// Check if there's ground directly below a position (prevent falling into pits)
const hasGroundBelow = (x: number, y: number, platforms: Platform[]): boolean => {
  for (const plat of platforms) {
    const { px, py } = getPlatPos(plat);
    if (x >= px && x <= px + plat.width && y >= py - 10 && y <= py + plat.height + 20) {
      return true;
    }
  }
  return false;
};

const ENEMY_SHOOT_COOLDOWN = 70;
const TURRET_SHOOT_COOLDOWN = 80;
const BOSS_SHOOT_COOLDOWN = 25;

const GameCanvas = forwardRef<GameEngineControls>(function GameCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const keysRef = useRef({ left: false, right: false, up: false, shoot: false });
  const p2KeysRef = useRef({ left: false, right: false, up: false, shoot: false, dash: false, shield: false, special: false });
  const joystickRef = useRef<JoystickInput>({ active: false, dx: 0, dy: 0 });
  const p2JoystickRef = useRef<JoystickInput>({ active: false, dx: 0, dy: 0 });

  const playerRef = useRef<PlayerState | null>(null);
  const player2Ref = useRef<PlayerState | null>(null);
  const enemiesRef = useRef<EnemyState[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const platformsRef = useRef<Platform[]>([]);
  const levelRef = useRef<LevelDef | null>(null);
  const cameraXRef = useRef(0);
  const frameCountRef = useRef(0);
  const scoreRef = useRef(0);
  const isMobileRef = useRef(false);
  const mobileOptRef = useRef(false);
  const dprRef = useRef(1);
  const bgStarsRef = useRef<{ x: number; y: number; size: number; speed: number }[]>([]);
  const currentSeasonRef = useRef<SeasonVisuals | null>(null);
  const screenShakeRef = useRef(0);
  const menuParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; size: number }[]>([]);
  const waveSpawnedRef = useRef(false);
  const voiceLineTimerRef = useRef(0);
  const voiceLineTextRef = useRef('');
  const voiceLineColorRef = useRef(CYAN);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const gangRef = useRef<GangMember[]>([]);
  const petRef = useRef<PetState | null>(null);
  const prevPhaseRef = useRef<string>('menu');
  const soundInitedRef = useRef(false);
  const dramaticMomentTimerRef = useRef(0);
  // Local refs for per-frame state (avoid store.setState every frame causing React re-renders)
  const dmTextRef = useRef('');
  const dmColorRef = useRef(CYAN);
  const dmTimerRef = useRef(0);
  const introTextRef = useRef('');
  const introColorRef = useRef(CYAN);
  const introTimerRef = useRef(0);
  // Frame rate limiting — mobile uses 30fps, desktop 60fps
  const lastFrameTimeRef = useRef(0);
  const lowEndMobileRef = useRef(false); // detected during runtime
  const TARGET_FRAME_MS = MOBILE_FRAME_MS; // 30fps on mobile, 60fps on desktop

  // Coins system
  const coinsRef = useRef<{ x: number; y: number; collected: boolean; animFrame: number; value: number }[]>([]);
  const coinsCollectedRef = useRef(0);
  // Exit gate
  const exitGateRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  // Max combo tracking for star rating
  const maxComboRef = useRef(0);
  // Total enemies in level for star rating
  const totalEnemiesRef = useRef(0);
  // Mid-level surprise system
  const surpriseRef = useRef<MidLevelSurprise | null>(null);
  const surpriseTimerRef = useRef(0);
  const surpriseTriggeredRef = useRef(false);
  // Difficulty multiplier for level-based scaling (movement, enrage thresholds)
  const difficultyMultiplierRef = useRef(1);
  // Staggered wave spawn queue
  const spawnQueueRef = useRef<EnemyState[]>([]);
  const spawnTimerRef = useRef(0);
  const spawnDelayRef = useRef(0);
  // Ambient/patrol enemy spawning — keeps ground populated between wave zones
  const ambientSpawnTimerRef = useRef(0);
  const ambientSpawnCountRef = useRef(0);
  // Total wave enemies spawned — tracks count for exit gate logic
  const totalWaveEnemiesSpawnedRef = useRef(0);

  const store = useGameStore;

  const ensureSoundInit = () => {
    if (!soundInitedRef.current) {
      soundEngine.init();
      soundInitedRef.current = true;
    }
  };

  const initStars = useCallback((width: number) => {
    const stars: { x: number; y: number; size: number; speed: number }[] = [];
    const count = _isMobile ? 30 : 80; // Fewer stars on mobile
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * 600,
        size: 0.5 + Math.random() * 2,
        speed: 0.1 + Math.random() * 0.3,
      });
    }
    bgStarsRef.current = stars;
  }, []);

  const initMenuParticles = useCallback((cw: number, ch: number) => {
    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[] = [];
    const count = _isMobile ? 15 : 40; // Fewer menu particles on mobile
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * cw,
        y: Math.random() * ch,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.5 - 0.2,
        color: [CYAN, MAGENTA, LIME, PURPLE][Math.floor(Math.random() * 4)],
        size: 1 + Math.random() * 3,
      });
    }
    menuParticlesRef.current = particles;
  }, []);

  const createPlayerState = useCallback((x: number, y: number, skinId: string): PlayerState => {
    const currentSkin = SKINS.find(s => s.id === skinId) || SKINS[0];
    const saveData = store.getState().saveData;
    return {
      x, y,
      width: 20, height: 50,
      vx: 0, vy: 0,
      health: 100, maxHealth: 100,
      facing: 1,
      grounded: false,
      shootCooldown: 0,
      animFrame: 0, animTimer: 0,
      invincible: 0,
      expression: 'determined',
      isMoving: false,
      isShooting: false,
      shootTimer: 0,
      dashCooldown: 0, dashTimer: 0, isDashing: false,
      shieldCooldown: 0, shieldTimer: 0, isShielding: false,
      specialCooldown: 0, specialTimer: 0, isUsingSpecial: false,
      jumpCount: 0, maxJumps: 2,
      kills: 0, combo: 0, comboTimer: 0,
      skinColor: currentSkin.color,
      skinGlow: currentSkin.glowColor,
      skinTrail: currentSkin.trailColor,
      skinEffect: currentSkin.effect,
      equippedSkills: saveData.equippedSkills.slice(0, 3),
      skillStates: saveData.equippedSkills.slice(0, 3).filter(id => id).map(id => ({
        id, cooldownTimer: 0, activeTimer: 0, isActive: false,
      })),
    };
  }, []);

  // Skill states and chests refs + init functions (must be defined before initLevel which calls them)
  const skillStatesRef = useRef<SkillState[]>([]);
  const chestsRef = useRef<{ x: number; y: number; opened: boolean; reward: string; value: number }[]>([]);

  const initSkillStates = (equippedSkills: string[]) => {
    skillStatesRef.current = equippedSkills.filter(id => id).map(id => ({
      id,
      cooldownTimer: 0,
      activeTimer: 0,
      isActive: false,
    }));
  };

  const initChests = (levelId: number, platforms: Platform[]) => {
    const chestRng = (seed: number) => {
      let s = seed * 11 + 37;
      return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    };
    const crng = chestRng(levelId * 5 + 13);
    const chestCount = 2 + Math.floor(crng() * 3);
    const chests: { x: number; y: number; opened: boolean; reward: string; value: number }[] = [];
    for (let i = 0; i < chestCount; i++) {
      const platIdx = Math.floor(crng() * platforms.length);
      const plat = platforms[platIdx];
      chests.push({
        x: plat.x + 20 + Math.floor(crng() * (plat.width - 40)),
        y: plat.y - 25,
        opened: false,
        reward: crng() > 0.8 ? 'skill' : 'coins',
        value: crng() > 0.5 ? 25 : 10,
      });
    }
    chestsRef.current = chests;
  };

  const initLevel = useCallback((levelId: number) => {
    const gameMode = store.getState().gameMode;
    const isVersus = gameMode === 'versus';

    // Versus mode uses the special VERSUS_ARENA
    const level = isVersus ? VERSUS_ARENA
      : levelId <= LEVELS.length
      ? LEVELS.find(l => l.id === levelId)
      : generateProceduralLevel(levelId);
    if (!level) return;

    levelRef.current = level;

    // Set season visuals based on current level
    const seasonType = getSeasonForLevel(levelId);
    currentSeasonRef.current = getSeasonVisuals(seasonType);

    const saveData = store.getState().saveData;

    if (isVersus) {
      // Versus mode: P1 on left (BLUE), P2 on right (ORANGE)
      playerRef.current = createPlayerState(100, 460, saveData.currentSkin);
      player2Ref.current = createPlayerState(level.width - 120, 460, 'default');
      // P1 stays BLUE
      player2Ref.current.skinColor = ORANGE;
      player2Ref.current.skinGlow = RED;
      player2Ref.current.skinTrail = ORANGE;
      player2Ref.current.facing = -1; // Face left
      // Reset pet and gang for versus
      petRef.current = null;
      gangRef.current = [];
    } else {
      playerRef.current = createPlayerState(level.playerSpawn.x, level.playerSpawn.y, saveData.currentSkin);

      // Initialize player 2 in co-op mode
      if (gameMode === 'coop') {
        player2Ref.current = createPlayerState(level.playerSpawn.x + 40, level.playerSpawn.y, 'default');
        // Override P2 skin to ORANGE (RED/ORANGE theme for Player 2)
        player2Ref.current.skinColor = ORANGE;
        player2Ref.current.skinGlow = RED;
        player2Ref.current.skinTrail = ORANGE;
        player2Ref.current.facing = 1;
      } else {
        player2Ref.current = null;
      }
    }

    // Initialize gang members for this level
    const unlockedGang = saveData.gangMembersUnlocked;
    const availableMembers = level.gangMembersAvailable.filter(id => unlockedGang.includes(id));
    gangRef.current = availableMembers.map(id => {
      const def = GANG_MEMBERS.find(g => g.id === id)!;
      return {
        ...def,
        active: true,
        x: level.playerSpawn.x - 40 - Math.random() * 30,
        y: level.playerSpawn.y,
        vx: 0, vy: 0,
        facing: 1 as const,
        animFrame: 0,
        shootCooldown: 60 + Math.floor(Math.random() * 40),
        grounded: false,
        invincible: 0,
        expression: 'determined' as SparkExpression,
      };
    });

    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    platformsRef.current = level.platforms.map(p => ({ ...p, moveOffset: p.moveOffset || 0 }));
    cameraXRef.current = 0;
    frameCountRef.current = 0;
    scoreRef.current = 0;
    waveSpawnedRef.current = false;
    screenShakeRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    voiceLineTimerRef.current = 0;
    dramaticMomentTimerRef.current = 0;
    dmTextRef.current = '';
    dmColorRef.current = CYAN;
    dmTimerRef.current = 0;
    introTextRef.current = '';
    introColorRef.current = CYAN;
    introTimerRef.current = 0;

    // Initialize pet
    const petDef = PET_DEFS.find(p => p.id === saveData.currentPet) || PET_DEFS[0];
    const petSkin = PET_SKINS.find(s => s.id === saveData.currentPetSkin) || PET_SKINS[0];
    petRef.current = {
      x: level.playerSpawn.x + 30,
      y: level.playerSpawn.y - 20,
      vx: 0, vy: 0,
      health: 50, maxHealth: 50,
      type: petDef.id,
      skinColor: petSkin.color,
      skinGlow: petSkin.glowColor,
      shootCooldown: petDef.shootRate,
      animFrame: 0,
      grounded: false,
      facing: 1,
      invincible: 0,
      expression: 'neutral',
      active: true,
      respawnTimer: 0,
    };

    // Initialize coins — densely populate entire path, no empty ground
    const coinRng = (seed: number) => {
      let s = seed * 7 + 13;
      return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    };
    const crng = coinRng(levelId * 3 + 7);
    // Scale coin count with level: min 15, max 40 (more coins to fill wider levels)
    const coinCount = Math.min(15 + Math.floor(levelId * 0.6), 40);
    const generatedCoins: { x: number; y: number; collected: boolean; animFrame: number; value: number }[] = [];

    // Coin value scales with level: early 3-8, mid 5-12, late 8-15
    const getCoinValue = (): number => {
      if (levelId <= 20) return 3 + Math.floor(crng() * 6);     // 3-8
      if (levelId <= 60) return 5 + Math.floor(crng() * 8);     // 5-12
      return 8 + Math.floor(crng() * 8);                         // 8-15
    };

    // 1) Place coins along the entire ground path every 200-300 pixels
    for (let gx = 150; gx < level.width - 150; gx += 200 + Math.floor(crng() * 100)) {
      generatedCoins.push({
        x: gx, y: 490, collected: false,
        animFrame: Math.floor(crng() * 100), value: getCoinValue(),
      });
    }

    // 2) Place coins on/above platforms
    for (let i = 0; i < coinCount; i++) {
      let coinX: number;
      let coinY: number;
      const placement = crng();

      if (placement < 0.4) {
        // On/above platforms
        const platIdx = Math.floor(crng() * level.platforms.length);
        const plat = level.platforms[platIdx];
        coinX = plat.x + 20 + Math.floor(crng() * (plat.width - 40));
        coinY = plat.y - 30 - Math.floor(crng() * 60);
      } else if (placement < 0.75) {
        // On the ground level, spread across the level
        coinX = 100 + Math.floor(crng() * (level.width - 200));
        coinY = 490; // Ground level
      } else {
        // Floating in the air between platforms — coin arcs
        coinX = 100 + Math.floor(crng() * (level.width - 200));
        coinY = 200 + Math.floor(crng() * 200); // Mid-air
      }

      const coinValue = getCoinValue();
      generatedCoins.push({ x: coinX, y: coinY, collected: false, animFrame: Math.floor(crng() * 100), value: coinValue });
    }

    // 3) Add floating coin arcs in the air between platform groups
    const arcCount = 2 + Math.floor(crng() * 3);
    for (let a = 0; a < arcCount; a++) {
      const arcStartX = 200 + Math.floor(crng() * (level.width - 600));
      const arcBaseY = 250 + Math.floor(crng() * 150);
      const arcCoins = 4 + Math.floor(crng() * 4); // 4-7 coins in an arc
      for (let c = 0; c < arcCoins; c++) {
        const t = c / (arcCoins - 1); // 0 to 1
        const arcX = arcStartX + c * 50;
        const arcY = arcBaseY - Math.sin(t * Math.PI) * 60; // Parabolic arc
        generatedCoins.push({
          x: arcX, y: arcY, collected: false,
          animFrame: Math.floor(crng() * 100), value: getCoinValue(),
        });
      }
    }

    // 4) Add coins between enemy wave zones — ensures there's always something to collect
    const initWaveCount = level.waves.length;
    for (let w = 0; w < initWaveCount - 1; w++) {
      // Add 3-4 coins between each wave zone
      const betweenCount = 3 + Math.floor(crng() * 2);
      for (let i = 0; i < betweenCount; i++) {
        const coinX = 200 + Math.floor(crng() * (level.width - 400));
        const coinY = crng() > 0.5 ? 490 : 250 + Math.floor(crng() * 180);
        const coinValue = getCoinValue();
        generatedCoins.push({ x: coinX, y: coinY, collected: false, animFrame: Math.floor(crng() * 100), value: coinValue });
      }
    }

    coinsRef.current = generatedCoins;
    coinsCollectedRef.current = 0;

    // Initialize exit gate — place at far end of level
    // Portal distance scales with level: further away for higher levels
    let portalPct: number;
    if (levelId <= 5) portalPct = 0.80 + levelId * 0.01;        // Level 1-5: 80-85%
    else if (levelId <= 20) portalPct = 0.85 + (levelId - 5) * 0.00333; // Level 6-20: 85-90%
    else if (levelId <= 50) portalPct = 0.90 + (levelId - 20) * 0.00167; // Level 21-50: 90-95%
    else portalPct = 0.93 + Math.min((levelId - 50) * 0.001, 0.04);     // Level 51+: 93-97%
    exitGateRef.current = { x: Math.floor(level.width * portalPct), y: 480, active: false };
    maxComboRef.current = 0;
    // Reset mid-level surprise state
    surpriseRef.current = null;
    surpriseTimerRef.current = 0;
    surpriseTriggeredRef.current = false;
    // Set difficulty multiplier for this level
    difficultyMultiplierRef.current = 1 + levelId * 0.01; // 1% per level, so level 50 = 1.5x, level 100 = 2x
    // Reset staggered spawn queue
    spawnQueueRef.current = [];
    spawnTimerRef.current = 0;
    spawnDelayRef.current = 0;
    // Reset ambient/patrol enemy spawn tracking
    ambientSpawnTimerRef.current = 0;
    ambientSpawnCountRef.current = 0;
    // Reset total wave enemies spawned counter
    totalWaveEnemiesSpawnedRef.current = 0;

    // Initialize skill states
    initSkillStates(saveData.equippedSkills);

    // Initialize chests
    initChests(levelId, level.platforms);

    // Calculate total enemies in level for star rating
    let totalEnemies = 0;
    for (const wave of level.waves) {
      totalEnemies += wave.enemies.length;
    }
    if (level.bossWave) {
      totalEnemies += level.bossWave.enemies.length;
    }
    totalEnemiesRef.current = totalEnemies;

    initStars(level.width);
  }, [initStars, createPlayerState, store, initChests]);

  useImperativeHandle(ref, () => ({
    moveLeft: () => { keysRef.current.left = true; },
    moveRight: () => { keysRef.current.right = true; },
    stopMove: () => { keysRef.current.left = false; keysRef.current.right = false; },
    jump: () => {
      const player = playerRef.current;
      if (!player) return;
      if (player.jumpCount < player.maxJumps) {
        player.vy = JUMP_VELOCITY;
        player.grounded = false;
        player.jumpCount++;
        spawnParticles(particlesRef.current, player.x + player.width / 2, player.y, 5, CYAN);
        ensureSoundInit();
        soundEngine.playJump();
      }
    },
    shoot: () => { keysRef.current.shoot = true; },
    stopShoot: () => { keysRef.current.shoot = false; },
    dash: () => {
      const player = playerRef.current;
      if (!player || player.dashCooldown > 0 || player.isDashing) return;
      player.isDashing = true;
      player.dashTimer = DASH_DURATION;
      player.dashCooldown = DASH_COOLDOWN;
      player.invincible = Math.max(player.invincible, DASH_DURATION);
      showVoiceLine(randomVoiceLine('dash'), CYAN);
      spawnParticles(particlesRef.current, player.x + player.width / 2, player.y - 25, 8, CYAN);
      ensureSoundInit();
      soundEngine.playDash();
    },
    shield: () => {
      const player = playerRef.current;
      if (!player || player.shieldCooldown > 0 || player.isShielding) return;
      player.isShielding = true;
      player.shieldTimer = SHIELD_DURATION;
      player.shieldCooldown = SHIELD_COOLDOWN;
      showVoiceLine(randomVoiceLine('shield'), LIME);
      ensureSoundInit();
      soundEngine.playShield();
    },
    special: () => {
      const player = playerRef.current;
      if (!player || player.specialCooldown > 0 || player.isUsingSpecial) return;
      player.isUsingSpecial = true;
      player.specialTimer = 30;
      player.specialCooldown = SPECIAL_COOLDOWN;
      screenShakeRef.current = 10;
      showVoiceLine(randomVoiceLine('special'), ORANGE);
      const cx = player.x + player.width / 2;
      const cy = player.y - 25;
      for (let angle = -0.5; angle <= 0.51; angle += 0.1) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const baseVx = BULLET_SPEED * player.facing;
        bulletsRef.current.push({
          x: cx, y: cy,
          vx: baseVx * cos - 0 * sin,
          vy: baseVx * sin + 0 * cos,
          fromPlayer: true,
          damage: SPECIAL_DAMAGE,
          active: true,
          color: ORANGE,
          radius: 5,
          isSpecial: true,
        });
      }
      spawnParticles(particlesRef.current, cx, cy, 20, ORANGE);
      ensureSoundInit();
      soundEngine.playSpecial();
    },
    setJoystick: (input: JoystickInput) => { joystickRef.current = input; },
    setP2Joystick: (input: JoystickInput) => { p2JoystickRef.current = input; },
    executeSkill: (skillId: string) => { executeSkillFromKey(skillId); },
    pause: () => {
      const state = store.getState();
      if (state.gamePhase === 'playing') {
        store.getState().setGamePhase('settings');
      }
    },
  }));

  const showVoiceLine = (text: string, color: string) => {
    voiceLineTextRef.current = text;
    voiceLineColorRef.current = color;
    voiceLineTimerRef.current = 90;
  };

  const showDramaticMoment = (text: string, color: string) => {
    dmTextRef.current = text;
    dmColorRef.current = color;
    dmTimerRef.current = 120;
  };

  // ====== SKILL EXECUTION ======
  const executeSkillFromKey = (skillId: string) => {
    const player = playerRef.current;
    if (!player || player.health <= 0) return;

    const skillDef = SKILL_DEFS.find(s => s.id === skillId);
    if (!skillDef) return;

    // Find or create skill state
    let ss = skillStatesRef.current.find(s => s.id === skillId);
    if (!ss) {
      ss = { id: skillId, cooldownTimer: 0, activeTimer: 0, isActive: false };
      skillStatesRef.current.push(ss);
    }
    if (ss.cooldownTimer > 0) return;
    if (ss.isActive) return;

    // Blood skills cost health
    if (skillDef.element === 'blood' && skillDef.id === 'bloodStrike') {
      const hpCost = 10;
      if (player.health <= hpCost) return;
      player.health -= hpCost;
    }

    // Execute skill effect
    const enemies = enemiesRef.current;
    const bullets = bulletsRef.current;
    const particles = particlesRef.current;
    const cx = player.x + player.width / 2;
    const cy = player.y - 25;

    // Apply skill upgrade multipliers
    const skillLevel = store.getState().saveData.skillUpgrades[skillId] ?? 1;
    const dmgMult = SKILL_UPGRADE_DAMAGE[Math.min(skillLevel - 1, SKILL_UPGRADE_DAMAGE.length - 1)];
    const cdMult = SKILL_UPGRADE_COOLDOWN[Math.min(skillLevel - 1, SKILL_UPGRADE_COOLDOWN.length - 1)];

    switch (skillDef.effectType) {
      case 'projectile': {
        const count = skillDef.projectileCount || 1;
        for (let i = 0; i < count; i++) {
          const angle = count > 1 ? (i / (count - 1) - 0.5) * 0.6 : 0;
          bullets.push({
            x: cx, y: cy,
            vx: BULLET_SPEED * 1.5 * player.facing * Math.cos(angle),
            vy: BULLET_SPEED * 1.5 * Math.sin(angle),
            fromPlayer: true,
            damage: Math.round(skillDef.damage * dmgMult),
            active: true,
            color: skillDef.color,
            radius: 6,
            isSpecial: true,
          });
        }
        spawnParticles(particles, cx, cy, 15, skillDef.color);
        screenShakeRef.current = 5;
        break;
      }
      case 'aoe': {
        const radius = skillDef.effectRadius || 200;
        for (const enemy of enemies) {
          if (!enemy.active) continue;
          const dx = enemy.x + enemy.width / 2 - cx;
          const dy = enemy.y - 25 - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius) {
            const isBoss = enemy.type.startsWith('boss');
            const baseDmg = skillDef.damage === 999 && !isBoss ? enemy.health : skillDef.damage;
            const dmg = skillDef.damage === 999 && !isBoss ? baseDmg : Math.round(baseDmg * dmgMult);
            enemy.health -= dmg;
            enemy.isHit = true;
            enemy.hitTimer = 10;
          }
        }
        // Visual: expanding ring particles
        for (let a = 0; a < Math.PI * 2; a += 0.15) {
          for (let r = 30; r < radius; r += 60) {
            particles.push({
              x: cx + Math.cos(a) * r,
              y: cy + Math.sin(a) * r * 0.5,
              vx: Math.cos(a) * 2,
              vy: Math.sin(a) * 2 - 1,
              life: 30, maxLife: 30,
              color: skillDef.glowColor,
              size: 3,
            });
          }
        }
        screenShakeRef.current = 15;
        // Heal for soul harvest
        if (skillDef.id === 'soulHarvest') {
          const hitCount = enemies.filter(e => e.active && Math.sqrt((e.x + e.width / 2 - cx) ** 2 + (e.y - 25 - cy) ** 2) < radius).length;
          player.health = Math.min(player.maxHealth, player.health + hitCount * 5);
        }
        break;
      }
      case 'buff': {
        if (skillDef.id === 'shadowStep') {
          // Teleport behind nearest enemy
          const nearest = enemies.filter(e => e.active).sort((a, b) =>
            Math.abs(a.x - player.x) - Math.abs(b.x - player.x)
          )[0];
          if (nearest) {
            player.x = nearest.x + (nearest.x > player.x ? -40 : 40);
            player.facing = nearest.x > player.x ? 1 : -1;
            player.invincible = Math.max(player.invincible, skillDef.duration);
            // Damage the nearest enemy
            nearest.health -= Math.round(skillDef.damage * dmgMult);
            nearest.isHit = true;
            nearest.hitTimer = 10;
          }
          spawnParticles(particles, cx, cy, 20, skillDef.color);
        } else if (skillDef.id === 'voidWalk') {
          player.invincible = Math.max(player.invincible, skillDef.duration);
          spawnParticles(particles, cx, cy, 25, skillDef.color);
        } else if (skillDef.id === 'bloodFury') {
          // Blood fury buff - handled via active skill state
          spawnParticles(particles, cx, cy, 20, skillDef.color);
        }
        break;
      }
      case 'summon': {
        const summonCount = skillDef.summonCount || 1;
        // Summon = fire extra bullets from player position in a spread
        for (let s = 0; s < summonCount; s++) {
          const angle = (s / summonCount) * Math.PI * 0.6 - Math.PI * 0.3;
          for (let b = 0; b < 3; b++) {
            bullets.push({
              x: cx, y: cy,
              vx: BULLET_SPEED * player.facing * Math.cos(angle) + (Math.random() - 0.5) * 2,
              vy: Math.sin(angle) * BULLET_SPEED * 0.5 - 2 + b * 0.5,
              fromPlayer: true,
              damage: Math.round(skillDef.damage * dmgMult),
              active: true,
              color: skillDef.glowColor,
              radius: 5,
              isSpecial: true,
            });
          }
        }
        spawnParticles(particles, cx, cy, 20, skillDef.color);
        screenShakeRef.current = 8;
        break;
      }
      case 'beam': {
        // Beam = powerful line of projectiles
        for (let i = 0; i < 8; i++) {
          bullets.push({
            x: cx + player.facing * i * 15,
            y: cy + (Math.random() - 0.5) * 10,
            vx: BULLET_SPEED * 2 * player.facing,
            vy: (Math.random() - 0.5) * 1,
            fromPlayer: true,
            damage: Math.round(skillDef.damage / 4 * dmgMult),
            active: true,
            color: skillDef.glowColor,
            radius: 7,
            isSpecial: true,
          });
        }
        spawnParticles(particles, cx, cy, 25, skillDef.color);
        screenShakeRef.current = 12;
        break;
      }
      case 'wave': {
        // Wave = expanding ring of projectiles
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          bullets.push({
            x: cx, y: cy,
            vx: Math.cos(a) * BULLET_SPEED,
            vy: Math.sin(a) * BULLET_SPEED * 0.6,
            fromPlayer: true,
            damage: Math.round(skillDef.damage * dmgMult),
            active: true,
            color: skillDef.color,
            radius: 5,
            isSpecial: true,
          });
        }
        spawnParticles(particles, cx, cy, 30, skillDef.glowColor);
        screenShakeRef.current = 10;
        break;
      }
    }

    // Set cooldown (apply cooldown multiplier from upgrades)
    ss.cooldownTimer = Math.round(skillDef.cooldown * cdMult);
    ss.activeTimer = skillDef.duration;
    ss.isActive = true;

    showVoiceLine(skillDef.name + '!', skillDef.color);
    ensureSoundInit();
    soundEngine.playSpecial();
  };

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCoop = store.getState().gameMode === 'coop';
      const isVersus = store.getState().gameMode === 'versus';
      const useP2Controls = isCoop || isVersus;
      const p2Color = ORANGE; // P2 color for particles

      // Escape = Pause
      if (key === 'escape') {
        const phase = store.getState().gamePhase;
        if (phase === 'playing') {
          store.getState().setGamePhase('settings');
          return;
        } else if (phase === 'settings') {
          store.getState().setGamePhase('playing');
          return;
        }
      }

      // ====== PLAYER 1 controls ======
      // In coop/versus mode, P1 only uses WASD. In single player, both WASD and Arrows work.
      if (!useP2Controls && key === 'arrowleft') keysRef.current.left = true;
      if (!useP2Controls && key === 'arrowright') keysRef.current.right = true;
      if (!useP2Controls && key === 'arrowup') {
        e.preventDefault();
        const ctrl = (window as unknown as Record<string, unknown>).__neonWarriorControls as GameEngineControls | null;
        ctrl?.jump();
      }
      if (key === 'a') keysRef.current.left = true;
      if (key === 'd') keysRef.current.right = true;
      if (key === 'w') {
        e.preventDefault();
        const ctrl = (window as unknown as Record<string, unknown>).__neonWarriorControls as GameEngineControls | null;
        ctrl?.jump();
      }
      if (key === ' ') {
        e.preventDefault();
        keysRef.current.shoot = true;
      }
      // ====== ABILITY/SKILL KEYS — Shift, E, F ======
      // Slot 1 = Shift, Slot 2 = E, Slot 3 = F
      // If a skill is equipped in that slot, it activates the skill instead of the default ability
      const saveData = store.getState().saveData;
      const slotKeyMap: Record<number, string> = { 0: 'shift', 1: 'e', 2: 'f' };

      if (key === 'shift' || key === 'q') {
        const skillId = saveData.equippedSkills[0];
        if (skillId) {
          executeSkillFromKey(skillId);
        } else {
          const ctrl = (window as unknown as Record<string, unknown>).__neonWarriorControls as GameEngineControls | null;
          ctrl?.dash();
        }
      }
      if (key === 'e') {
        const skillId = saveData.equippedSkills[1];
        if (skillId) {
          executeSkillFromKey(skillId);
        } else {
          const ctrl = (window as unknown as Record<string, unknown>).__neonWarriorControls as GameEngineControls | null;
          ctrl?.shield();
        }
      }
      if (key === 'f' || key === 'r') {
        const skillId = saveData.equippedSkills[2];
        if (skillId) {
          executeSkillFromKey(skillId);
        } else {
          const ctrl = (window as unknown as Record<string, unknown>).__neonWarriorControls as GameEngineControls | null;
          ctrl?.special();
        }
      }

      // ====== PLAYER 2 controls ======
      // In coop/versus mode: Arrow keys + Enter + / . ,
      // In single player: IJKL + U/I/O/P (still works as fallback)
      if (useP2Controls) {
        if (key === 'arrowleft') p2KeysRef.current.left = true;
        if (key === 'arrowright') p2KeysRef.current.right = true;
        if (key === 'arrowup') {
          e.preventDefault();
          const p2 = player2Ref.current;
          if (p2 && p2.jumpCount < p2.maxJumps) {
            p2.vy = JUMP_VELOCITY;
            p2.grounded = false;
            p2.jumpCount++;
            spawnParticles(particlesRef.current, p2.x + p2.width / 2, p2.y, 5, p2Color);
            ensureSoundInit();
            soundEngine.playJump();
          }
        }
        if (key === 'enter') {
          e.preventDefault();
          p2KeysRef.current.shoot = true;
        }
        // e.key for / is '/' (not lowercase)
        if (e.key === '/') {
          e.preventDefault();
          // P2 dash
          const p2 = player2Ref.current;
          if (p2 && p2.dashCooldown <= 0 && !p2.isDashing) {
            p2.isDashing = true;
            p2.dashTimer = DASH_DURATION;
            p2.dashCooldown = DASH_COOLDOWN;
            p2.invincible = Math.max(p2.invincible, DASH_DURATION);
            spawnParticles(particlesRef.current, p2.x + p2.width / 2, p2.y - 25, 8, p2Color);
            ensureSoundInit();
            soundEngine.playDash();
          }
        }
        if (e.key === '.') {
          // P2 shield
          const p2 = player2Ref.current;
          if (p2 && p2.shieldCooldown <= 0 && !p2.isShielding) {
            p2.isShielding = true;
            p2.shieldTimer = SHIELD_DURATION;
            p2.shieldCooldown = SHIELD_COOLDOWN;
            ensureSoundInit();
            soundEngine.playShield();
          }
        }
        if (e.key === ',') {
          // P2 special
          const p2 = player2Ref.current;
          if (p2 && p2.specialCooldown <= 0 && !p2.isUsingSpecial) {
            p2.isUsingSpecial = true;
            p2.specialTimer = 30;
            p2.specialCooldown = SPECIAL_COOLDOWN;
            screenShakeRef.current = 10;
            const cx = p2.x + p2.width / 2;
            const cy = p2.y - 25;
            for (let angle = -0.5; angle <= 0.51; angle += 0.1) {
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              const baseVx = BULLET_SPEED * p2.facing;
              bulletsRef.current.push({
                x: cx, y: cy,
                vx: baseVx * cos, vy: baseVx * sin,
                fromPlayer: true, damage: SPECIAL_DAMAGE,
                active: true, color: p2Color, radius: 5, isSpecial: true,
              });
            }
            spawnParticles(particlesRef.current, cx, cy, 20, p2Color);
            ensureSoundInit();
            soundEngine.playSpecial();
          }
        }
      } else {
        // Single player / fallback P2 controls: IJKL + U/I/O/P
        if (key === 'j') p2KeysRef.current.left = true;
        if (key === 'l') p2KeysRef.current.right = true;
        if (key === 'u') {
          e.preventDefault();
          const p2 = player2Ref.current;
          if (p2 && p2.jumpCount < p2.maxJumps) {
            p2.vy = JUMP_VELOCITY;
            p2.grounded = false;
            p2.jumpCount++;
            spawnParticles(particlesRef.current, p2.x + p2.width / 2, p2.y, 5, MAGENTA);
            ensureSoundInit();
            soundEngine.playJump();
          }
        }
        if (key === 'i') p2KeysRef.current.shoot = true;
        if (key === 'o') {
          const p2 = player2Ref.current;
          if (p2 && p2.dashCooldown <= 0 && !p2.isDashing) {
            p2.isDashing = true;
            p2.dashTimer = DASH_DURATION;
            p2.dashCooldown = DASH_COOLDOWN;
            p2.invincible = Math.max(p2.invincible, DASH_DURATION);
            spawnParticles(particlesRef.current, p2.x + p2.width / 2, p2.y - 25, 8, MAGENTA);
            ensureSoundInit();
            soundEngine.playDash();
          }
        }
        if (key === 'k') {
          const p2 = player2Ref.current;
          if (p2 && p2.shieldCooldown <= 0 && !p2.isShielding) {
            p2.isShielding = true;
            p2.shieldTimer = SHIELD_DURATION;
            p2.shieldCooldown = SHIELD_COOLDOWN;
            ensureSoundInit();
            soundEngine.playShield();
          }
        }
        if (key === 'p') {
          const p2 = player2Ref.current;
          if (p2 && p2.specialCooldown <= 0 && !p2.isUsingSpecial) {
            p2.isUsingSpecial = true;
            p2.specialTimer = 30;
            p2.specialCooldown = SPECIAL_COOLDOWN;
            screenShakeRef.current = 10;
            const cx = p2.x + p2.width / 2;
            const cy = p2.y - 25;
            for (let angle = -0.5; angle <= 0.51; angle += 0.1) {
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              const baseVx = BULLET_SPEED * p2.facing;
              bulletsRef.current.push({
                x: cx, y: cy,
                vx: baseVx * cos, vy: baseVx * sin,
                fromPlayer: true, damage: SPECIAL_DAMAGE,
                active: true, color: MAGENTA, radius: 5, isSpecial: true,
              });
            }
            spawnParticles(particlesRef.current, cx, cy, 20, MAGENTA);
            ensureSoundInit();
            soundEngine.playSpecial();
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCoop = store.getState().gameMode === 'coop';
      const isVersus = store.getState().gameMode === 'versus';
      const useP2Controls = isCoop || isVersus;

      // P1 key up
      if (!useP2Controls && key === 'arrowleft') keysRef.current.left = false;
      if (!useP2Controls && key === 'arrowright') keysRef.current.right = false;
      if (key === 'a') keysRef.current.left = false;
      if (key === 'd') keysRef.current.right = false;
      if (key === ' ') { keysRef.current.shoot = false; }

      // P2 key up
      if (useP2Controls) {
        if (key === 'arrowleft') p2KeysRef.current.left = false;
        if (key === 'arrowright') p2KeysRef.current.right = false;
        if (key === 'enter') p2KeysRef.current.shoot = false;
      } else {
        if (key === 'j') p2KeysRef.current.left = false;
        if (key === 'l') p2KeysRef.current.right = false;
        if (key === 'i') p2KeysRef.current.shoot = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Expose controls on window for mobile
  useEffect(() => {
    const controls: GameEngineControls = {
      moveLeft: () => { keysRef.current.left = true; },
      moveRight: () => { keysRef.current.right = true; },
      stopMove: () => { keysRef.current.left = false; keysRef.current.right = false; },
      jump: () => {
        const player = playerRef.current;
        if (!player) return;
        if (player.jumpCount < player.maxJumps) {
          player.vy = JUMP_VELOCITY;
          player.grounded = false;
          player.jumpCount++;
          spawnParticles(particlesRef.current, player.x + player.width / 2, player.y, 5, CYAN);
          ensureSoundInit();
          soundEngine.playJump();
        }
      },
      shoot: () => { keysRef.current.shoot = true; },
      stopShoot: () => { keysRef.current.shoot = false; },
      dash: () => {
        const player = playerRef.current;
        if (!player || player.dashCooldown > 0 || player.isDashing) return;
        player.isDashing = true;
        player.dashTimer = DASH_DURATION;
        player.dashCooldown = DASH_COOLDOWN;
        player.invincible = Math.max(player.invincible, DASH_DURATION);
        showVoiceLine(randomVoiceLine('dash'), CYAN);
        spawnParticles(particlesRef.current, player.x + player.width / 2, player.y - 25, 8, CYAN);
        ensureSoundInit();
        soundEngine.playDash();
      },
      shield: () => {
        const player = playerRef.current;
        if (!player || player.shieldCooldown > 0 || player.isShielding) return;
        player.isShielding = true;
        player.shieldTimer = SHIELD_DURATION;
        player.shieldCooldown = SHIELD_COOLDOWN;
        showVoiceLine(randomVoiceLine('shield'), LIME);
        ensureSoundInit();
        soundEngine.playShield();
      },
      special: () => {
        const player = playerRef.current;
        if (!player || player.specialCooldown > 0 || player.isUsingSpecial) return;
        player.isUsingSpecial = true;
        player.specialTimer = 30;
        player.specialCooldown = SPECIAL_COOLDOWN;
        screenShakeRef.current = 10;
        showVoiceLine(randomVoiceLine('special'), ORANGE);
        const cx = player.x + player.width / 2;
        const cy = player.y - 25;
        for (let angle = -0.5; angle <= 0.51; angle += 0.1) {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const baseVx = BULLET_SPEED * player.facing;
          bulletsRef.current.push({
            x: cx, y: cy,
            vx: baseVx * cos - 0 * sin,
            vy: baseVx * sin + 0 * cos,
            fromPlayer: true,
            damage: SPECIAL_DAMAGE,
            active: true,
            color: ORANGE,
            radius: 5,
            isSpecial: true,
          });
        }
        spawnParticles(particlesRef.current, cx, cy, 20, ORANGE);
        ensureSoundInit();
        soundEngine.playSpecial();
      },
      setJoystick: (input: JoystickInput) => { joystickRef.current = input; },
      setP2Joystick: (input: JoystickInput) => { p2JoystickRef.current = input; },
      executeSkill: (skillId: string) => { executeSkillFromKey(skillId); },
      pause: () => {
        const state = store.getState();
        if (state.gamePhase === 'playing') {
          store.getState().setGamePhase('settings');
        }
      },
    };
    (window as unknown as Record<string, unknown>).__neonWarriorControls = controls;

    return () => {
      delete (window as unknown as Record<string, unknown>).__neonWarriorControls;
    };
  }, []);

  // Helper to update a player entity (used for both P1 and P2)
  const updatePlayerEntity = (
    player: PlayerState,
    keys: { left: boolean; right: boolean; up?: boolean; shoot: boolean },
    joystick: JoystickInput | null,
    enemies: EnemyState[],
    bullets: Bullet[],
    particles: Particle[],
    platforms: Platform[],
    level: LevelDef,
    playerId?: 1 | 2, // For versus mode bullet tagging
  ) => {
    let moveX = 0;
    if (joystick?.active) {
      moveX = joystick.dx;
      player.facing = moveX > 0.1 ? 1 : moveX < -0.1 ? -1 : player.facing;
    } else {
      if (keys.left) { moveX = -1; player.facing = -1; }
      if (keys.right) { moveX = 1; player.facing = 1; }
    }

    if (player.isDashing) {
      player.dashTimer--;
      player.vx = DASH_SPEED * player.facing;
      if (player.dashTimer <= 0) player.isDashing = false;
      if (frameCountRef.current % 2 === 0) {
        spawnParticles(particles, player.x + player.width / 2, player.y - 25, 2, player.skinColor);
      }
    } else {
      player.vx = moveX * PLAYER_SPEED;
    }

    player.isMoving = Math.abs(moveX) > 0.1 || player.isDashing;

    if (player.isShielding) {
      player.shieldTimer--;
      if (player.shieldTimer <= 0) player.isShielding = false;
    }

    if (player.isUsingSpecial) {
      player.specialTimer--;
      if (player.specialTimer <= 0) player.isUsingSpecial = false;
    }

    // Shoot
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.isShooting) player.shootTimer--;
    if (keys.shoot && player.shootCooldown <= 0 && !player.isDashing) {
      // Apply weapon upgrade multipliers
      const wUp = store.getState().saveData.weaponUpgrades;
      const dmgLevel = wUp.damage ?? 0;
      const frLevel = wUp.fireRate ?? 0;
      const bsLevel = wUp.bulletSpeed ?? 0;
      const bszLevel = wUp.bulletSize ?? 0;
      const critLevel = wUp.criticalChance ?? 0;
      const dmgMult = 1 + dmgLevel * WEAPON_UPGRADES.damage.effectPerLevel;
      const frMult = 1 - Math.min(frLevel * WEAPON_UPGRADES.fireRate.effectPerLevel, 0.8);
      const bsMult = 1 + bsLevel * WEAPON_UPGRADES.bulletSpeed.effectPerLevel;
      const bszMult = 1 + bszLevel * WEAPON_UPGRADES.bulletSize.effectPerLevel;
      const critChance = critLevel * WEAPON_UPGRADES.criticalChance.effectPerLevel;
      const isCrit = Math.random() < critChance;
      const baseDamage = 10 * dmgMult * (isCrit ? 2 : 1);

      bullets.push({
        x: player.x + player.width / 2 + player.facing * 15,
        y: player.y - 25,
        vx: BULLET_SPEED * player.facing * bsMult,
        vy: 0,
        fromPlayer: true,
        damage: Math.round(baseDamage),
        active: true,
        color: isCrit ? GOLD : player.skinColor,
        radius: Math.round(4 * bszMult),
        fromPlayerId: playerId,
      });
      player.shootCooldown = Math.max(2, Math.round(SHOOT_COOLDOWN * frMult));
      player.isShooting = true;
      player.shootTimer = 6;
      spawnParticles(particles, player.x + player.width / 2 + player.facing * 20, player.y - 25, isCrit ? 8 : 3, isCrit ? GOLD : player.skinColor);
      ensureSoundInit();
      soundEngine.playShoot();
    }
    if (player.shootTimer <= 0) player.isShooting = false;

    // Ability cooldowns
    if (player.dashCooldown > 0) player.dashCooldown--;
    if (player.shieldCooldown > 0) player.shieldCooldown--;
    if (player.specialCooldown > 0) player.specialCooldown--;

    // Push cooldowns to store for mobile button feedback (throttled)
    if (frameCountRef.current % 6 === 0) {
      store.getState().updateCooldowns(player.dashCooldown, player.shieldCooldown, player.specialCooldown);
    }

    // Expression
    if (player.isDashing) player.expression = 'determined';
    else if (player.isUsingSpecial) player.expression = 'angry';
    else if (player.isShielding) player.expression = 'smirk';
    else if (player.invincible > 0 && player.health < 30) player.expression = 'hurt';
    else if (player.isShooting) player.expression = 'determined';
    else if (player.isMoving) {
      const nearEnemy = enemies.some(e => e.active && Math.abs(e.x - player.x) < 300);
      player.expression = nearEnemy ? 'angry' : 'determined';
    } else {
      player.expression = 'smirk';
    }

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

    // Move
    player.x += player.vx;
    player.y += player.vy;

    // Platform collision
    player.grounded = false;
    for (const plat of platforms) {
      const { px, py } = getPlatPos(plat);
      if (
        player.x + player.width > px + 4 &&
        player.x < px + plat.width - 4 &&
        player.y >= py &&
        player.y - player.vy <= py + 4
      ) {
        player.y = py;
        player.vy = 0;
        player.grounded = true;
        player.jumpCount = 0;
      }
    }

    // Bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > level.width) player.x = level.width - player.width;
    if (player.y > level.height + 100) {
      player.health = 0;
    }

    // Animation
    if (player.vx !== 0 || !player.grounded) {
      player.animTimer++;
      if (player.animTimer >= 3) {
        player.animTimer = 0;
        player.animFrame++;
      }
    }

    if (player.invincible > 0) player.invincible--;
  };

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) return;

    const resize = () => {
      // Use visual viewport for proper mobile landscape support (avoids URL bar issues)
      const vv = window.visualViewport || { width: window.innerWidth, height: window.innerHeight };
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      dprRef.current = dpr;
      canvas.width = Math.floor(vv.width * dpr);
      canvas.height = Math.floor(vv.height * dpr);
      canvas.style.width = vv.width + 'px';
      canvas.style.height = vv.height + 'px';
      isMobileRef.current = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      mobileOptRef.current = isMobileRef.current;
    };
    resize();
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
    }
    // Handle orientation changes for mobile landscape
    window.addEventListener('orientationchange', () => {
      setTimeout(resize, 100); // Delay to allow viewport to settle after rotation
    });

    let currentLevelId = 0;
    let prevPhase = store.getState().gamePhase;
    let prevVersusRoundWinner = 0;
    const unsub = store.subscribe((state) => {
      if (state.gamePhase === 'playing' && state.currentLevel !== currentLevelId) {
        currentLevelId = state.currentLevel;
        initLevel(state.currentLevel);
        waveSpawnedRef.current = false;
        // Start gameplay music when playing (stop menu music first)
        ensureSoundInit();
        soundEngine.stopMenuMusic();
        soundEngine.startMusic();
        // Populate local intro refs from store state
        if (state.introText) {
          introTextRef.current = state.introText;
          introColorRef.current = state.introColor;
          introTimerRef.current = state.introTimer;
        }
      }
      // CRITICAL: When transitioning TO playing (e.g., from cutscene → playing),
      // the currentLevel hasn't changed but the intro state needs to be synced.
      // Without this, introTimerRef stays at 0 and TAP TO START never appears.
      if (state.gamePhase === 'playing' && prevPhase !== 'playing' && state.currentLevel === currentLevelId && state.waitingForTap) {
        // Transitioned to playing without a level change (e.g., cutscene ended)
        // Sync intro refs from store
        if (state.introText) {
          introTextRef.current = state.introText;
          introColorRef.current = state.introColor;
          introTimerRef.current = state.introTimer;
        }
        // Also ensure the game canvas knows about this level
        if (!levelRef.current || levelRef.current.id !== state.currentLevel) {
          initLevel(state.currentLevel);
          waveSpawnedRef.current = false;
          ensureSoundInit();
          soundEngine.stopMenuMusic();
          soundEngine.startMusic();
        }
      }
      // Handle versus round reset (new round after previous winner)
      if (state.gameMode === 'versus' && state.gamePhase === 'playing' && state.versusRoundWinner === 0 && prevVersusRoundWinner !== 0) {
        // Reset both players for new round
        const level = levelRef.current || VERSUS_ARENA;
        const saveData = store.getState().saveData;
        playerRef.current = createPlayerState(100, 460, saveData.currentSkin);
        player2Ref.current = createPlayerState(level.width - 120, 460, 'default');
        player2Ref.current.skinColor = ORANGE;
        player2Ref.current.skinGlow = RED;
        player2Ref.current.skinTrail = ORANGE;
        player2Ref.current.facing = -1;
        bulletsRef.current = [];
        particlesRef.current = [];
        coinsRef.current = [];
        enemiesRef.current = [];
        // Update intro text for new round
        if (state.introText) {
          introTextRef.current = state.introText;
          introColorRef.current = state.introColor;
          introTimerRef.current = state.introTimer;
        }
      }
      prevVersusRoundWinner = state.versusRoundWinner;
      // Handle revive with full power
      if (state.gamePhase === 'playing' && prevPhase === 'game-over' && state.revivedWithFullPower) {
        const player = playerRef.current;
        if (player) {
          player.health = player.maxHealth;
          player.dashCooldown = 0;
          player.shieldCooldown = 0;
          player.specialCooldown = 0;
          player.invincible = 120;
        }
      }
      // Stop music when leaving playing
      if (prevPhase === 'playing' && state.gamePhase !== 'playing') {
        soundEngine.stopMusic();
        soundEngine.stopBossMusic();
        // Play victory fanfare on level complete
        if (state.gamePhase === 'level-complete' || state.gamePhase === 'victory') {
          soundEngine.playVictoryFanfare();
        }
        // Start menu music when returning to menu from gameplay
        if (state.gamePhase === 'menu') {
          soundEngine.startMenuMusic();
        }
      }
      // Start menu music when entering menu from non-playing states
      if (prevPhase !== 'menu' && state.gamePhase === 'menu' && prevPhase !== 'playing') {
        soundEngine.stopMenuMusic();
        soundEngine.startMenuMusic();
      }
      // Sync dramatic moment to local ref when store changes
      if (state.dramaticMoment) {
        dmTextRef.current = state.dramaticMoment.text;
        dmColorRef.current = state.dramaticMoment.color;
        dmTimerRef.current = state.dramaticMoment.timer;
      }
      if (state.gamePhase === 'menu' || state.gamePhase === 'game-over' || state.gamePhase === 'level-complete' || state.gamePhase === 'victory') {
        currentLevelId = 0;
      }
      prevPhase = state.gamePhase;
    });

    const initialState = store.getState();
    if (initialState.gamePhase === 'playing' && initialState.currentLevel !== currentLevelId) {
      currentLevelId = initialState.currentLevel;
      initLevel(initialState.currentLevel);
    }

    const initDpr = dprRef.current || 1;
    initMenuParticles(canvas.width / initDpr, canvas.height / initDpr);

    const gameLoop = (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(gameLoop);

      // Frame rate limiting — mobile 30fps, desktop 60fps
      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = timestamp;
      const elapsed = timestamp - lastFrameTimeRef.current;
      const targetMs = isMobileRef.current ? MOBILE_FRAME_MS : (1000 / 60);
      if (elapsed < targetMs) return;
      lastFrameTimeRef.current = timestamp - (elapsed % targetMs);

      // Low-end mobile detection: if frame took >50ms, we're on a slow device
      if (isMobileRef.current && elapsed > 50 && !lowEndMobileRef.current) {
        lowEndMobileRef.current = true;
      }

      frameCountRef.current++;

      const state = store.getState();
      const phase = state.gamePhase;
      const dpr = dprRef.current;
      const cw = canvas.width / dpr; // CSS pixels
      const ch = canvas.height / dpr; // CSS pixels
      const scale = ch / VIRTUAL_HEIGHT;
      const virtualWidth = Math.ceil(cw / scale);

      // Mobile performance: cap particles and clean up aggressively
      if (isMobileRef.current) {
        if (particlesRef.current.length > MOBILE_MAX_PARTICLES) {
          particlesRef.current.splice(0, particlesRef.current.length - MOBILE_MAX_PARTICLES);
        }
        // Clean up inactive bullets more aggressively on mobile
        if (bulletsRef.current.length > 30) {
          bulletsRef.current = bulletsRef.current.filter(b => b.active);
        }
      }

      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset to DPR scaling
      ctx.translate(shakeX, shakeY);
      ctx.imageSmoothingEnabled = false; // Pixel-art style, faster rendering

      switch (phase) {
        case 'menu': {
          drawMenuBackground(ctx, cw, ch, frameCountRef.current, menuParticlesRef.current);
          ctx.save();
          const menuFloat = Math.sin(frameCountRef.current * 0.03) * 5;
          // Subtle glow behind stickman — very faint
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = CYAN;
          ctx.beginPath();
          ctx.arc(cw / 2, ch / 2 + 40 + menuFloat, 40 + Math.sin(frameCountRef.current * 0.04) * 8, 0, Math.PI * 2);
          ctx.fill();
          // Small semi-transparent stickman — does NOT overlap front UI
          ctx.globalAlpha = 0.12;
          drawNeonStickman(ctx, cw / 2, ch / 2 + 40 + menuFloat, 1, CYAN, frameCountRef.current, false, true, 1.2, 'smirk', false);
          // Orbiting particles
          ctx.globalAlpha = 0.35;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + frameCountRef.current * 0.02;
            const dist = 55 + Math.sin(frameCountRef.current * 0.04 + i) * 10;
            const px = cw / 2 + Math.cos(angle) * dist;
            const py = ch / 2 + 40 + menuFloat + Math.sin(angle) * dist * 0.5;
            ctx.shadowBlur = 5;
            ctx.shadowColor = i % 2 === 0 ? CYAN : LIME;
            ctx.fillStyle = i % 2 === 0 ? CYAN : LIME;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.restore();
          // Start menu music on first frame
          if (prevPhaseRef.current !== 'menu') {
            prevPhaseRef.current = 'menu';
            ensureSoundInit();
            soundEngine.stopMusic();
            soundEngine.stopBossMusic();
            soundEngine.startMenuMusic();
          }
          break;
        }
        case 'playing': {
          const isWaitingForTap = store.getState().waitingForTap;
          // Only update game logic when NOT waiting for tap — render always
          if (!isWaitingForTap) {
            if (store.getState().gameMode !== 'versus') {
              spawnWave();
            }
            updateGame(virtualWidth, VIRTUAL_HEIGHT);
          }
          // When waiting for tap, intro timer is still decremented by renderIntro() below
          // Apply virtual viewport scaling for game world rendering
          ctx.save();
          ctx.scale(scale, scale);
          renderGameWorld(ctx, virtualWidth, VIRTUAL_HEIGHT);
          ctx.restore();
          // HUD renders at real pixel coordinates (no scaling)
          renderGameHUD(ctx, cw, ch);
          renderVoiceLine(ctx, cw, ch);
          renderDramaticMoment(ctx, cw, ch);
          renderSurprise(ctx, cw, ch);
          renderIntro(ctx, cw, ch);
          // Only show canvas HUD on desktop — mobile has real touch buttons
          if (!isMobileRef.current) {
            renderAbilityHUD(ctx, cw, ch);
          }
          renderControlsHint(ctx, cw, ch);
          break;
        }
        case 'game-over':
        case 'cutscene':
        case 'skin-shop':
        case 'settings': {
          drawGameOverBackground(ctx, cw, ch, frameCountRef.current);
          break;
        }
        case 'level-complete':
        case 'victory': {
          drawVictoryBackground(ctx, cw, ch, frameCountRef.current);
          break;
        }
        default: {
          // For new phases like local-coop, online-arena, etc. just draw background
          drawMenuBackground(ctx, cw, ch, frameCountRef.current, menuParticlesRef.current);
          break;
        }
      }

      ctx.restore();
    };

    // ====== WAVE SPAWNING (staggered) ======
    const spawnWave = () => {
      // If already spawned or still processing a spawn queue, skip
      if (waveSpawnedRef.current && spawnQueueRef.current.length === 0) return;
      const level = levelRef.current;
      const player = playerRef.current;
      if (!level || !player) return;

      // Process staggered spawn queue — spawn 1-2 enemies at a time with delays
      if (spawnQueueRef.current.length > 0) {
        spawnTimerRef.current--;
        if (spawnTimerRef.current <= 0) {
          // Spawn 1-2 enemies from the queue
          const spawnCount = Math.min(spawnQueueRef.current.length, 2);
          for (let i = 0; i < spawnCount; i++) {
            const enemy = spawnQueueRef.current.shift()!;
            // Only activate if enemy is near the player's view or ahead of them
            enemy.active = true;
            enemiesRef.current.push(enemy);
            totalWaveEnemiesSpawnedRef.current++;
          }
          // Set delay before next spawn: 20-40 frames (faster for boss waves)
          spawnTimerRef.current = spawnDelayRef.current;
          // If queue is now empty, mark wave as fully spawned
          if (spawnQueueRef.current.length === 0) {
            waveSpawnedRef.current = true;
          }
        }
        return; // Don't start a new wave while queue is processing
      }

      if (waveSpawnedRef.current) return;

      const state = store.getState();
      const waveIndex = state.currentWave;
      const totalWaves = state.totalWaves;
      const isBossWave = level.bossWave && waveIndex === totalWaves - 1;

      const wave = isBossWave ? level.bossWave! : level.waves[waveIndex];
      if (!wave) {
        scoreRef.current += 200;
        store.getState().completeLevel(scoreRef.current);
        return;
      }

      const newEnemies: EnemyState[] = wave.enemies.map((e, i) => {
        const isBoss = e.type === 'boss' || e.type === 'bossRedKing' || e.type === 'bossTitan' || e.type === 'bossDragon' || e.type === 'bossPhoenix' || e.type === 'bossMechGolem' || e.type === 'bossCorrupted' || e.type === 'bossFather' || e.type === 'bossTwin';
        const isGuardian = e.type === 'voidGuardian';
        const isEliteDrone = e.type === 'eliteDrone';
        const isHeavyWalker = e.type === 'heavyWalker';
        const isDragon = e.type === 'dragon';
        const isPhoenix = e.type === 'phoenix';
        const isMechGolem = e.type === 'mechGolem';
        const isShadowAssassin = e.type === 'shadowAssassin';
        const bossHP = e.type === 'bossTitan' ? 500 : e.type === 'bossRedKing' ? 400 : e.type === 'boss' ? 300 : e.type === 'bossDragon' ? 600 : e.type === 'bossPhoenix' ? 450 : e.type === 'bossMechGolem' ? 550 : e.type === 'bossCorrupted' ? 480 : e.type === 'bossFather' ? 550 : e.type === 'bossTwin' ? 700 : 150;
        let enemyWidth = 20;
        let enemyHeight = 50;
        let enemyHP = 20; // Default enemy HP increased from 15
        if (isBoss) { enemyWidth = 60; enemyHeight = 80; enemyHP = bossHP; }
        else if (isGuardian) { enemyWidth = 30; enemyHeight = 30; enemyHP = 25; }
        else if (isEliteDrone) { enemyWidth = 20; enemyHeight = 50; enemyHP = 30; }
        else if (isHeavyWalker) { enemyWidth = 25; enemyHeight = 55; enemyHP = 40; }
        else if (isDragon) { enemyWidth = 35; enemyHeight = 40; enemyHP = 45; }
        else if (isPhoenix) { enemyWidth = 25; enemyHeight = 40; enemyHP = 35; }
        else if (isMechGolem) { enemyWidth = 30; enemyHeight = 55; enemyHP = 60; }
        else if (isShadowAssassin) { enemyWidth = 18; enemyHeight = 50; enemyHP = 25; }
        else if (e.type === 'drone') { enemyHP = 20; }
        else if (e.type === 'glitchWalker') { enemyHP = 25; }
        // New flying enemy type HP
        else if (e.type === 'voidBat') { enemyWidth = 16; enemyHeight = 30; enemyHP = 15; }
        else if (e.type === 'stormEagle') { enemyWidth = 24; enemyHeight = 45; enemyHP = 30; }
        else if (e.type === 'emberWisp') { enemyWidth = 16; enemyHeight = 30; enemyHP = 18; }
        else if (e.type === 'frostWraith') { enemyWidth = 22; enemyHeight = 45; enemyHP = 35; }
        else if (e.type === 'shadowDrake') { enemyWidth = 30; enemyHeight = 55; enemyHP = 40; }
        else if (e.type === 'plasmaSerpent') { enemyWidth = 26; enemyHeight = 50; enemyHP = 35; }
        else if (e.type === 'neonWyrm') { enemyWidth = 32; enemyHeight = 60; enemyHP = 50; }
        else if (e.type === 'crystalMoth') { enemyWidth = 18; enemyHeight = 35; enemyHP = 20; }
        // New difficulty-scaling enemy types
        else if (e.type === 'zombie') { enemyWidth = 22; enemyHeight = 55; enemyHP = 55; }
        else if (e.type === 'giant') { enemyWidth = 55; enemyHeight = 80; enemyHP = 150; }
        else if (e.type === 'necromancer') { enemyWidth = 20; enemyHeight = 50; enemyHP = 40; }
        else if (e.type === 'bomber') { enemyWidth = 18; enemyHeight = 45; enemyHP = 25; }

        // Difficulty scaling: scale enemy HP and speed based on current level
        const currentLevel = store.getState().currentLevel;
        // Enemy health scales: baseHealth * (1 + level * 0.1) — steeper curve than before
        const hpMultiplier = 1 + currentLevel * 0.1;
        // Enemies move and shoot faster at higher levels
        const speedMultiplier = Math.min(1 + currentLevel / 250, 2.5); // cap at 2.5x speed
        // Boss HP scales at half rate so they don't become impossible
        const bossHpMultiplier = 1 + currentLevel * 0.05;
        if (isBoss) {
          enemyHP = Math.floor(enemyHP * bossHpMultiplier);
        } else {
          enemyHP = Math.floor(enemyHP * hpMultiplier);
        }

        return {
          x: e.x, y: e.y,
          width: enemyWidth,
          height: enemyHeight,
          vx: 0, vy: 0,
          type: e.type,
          health: enemyHP,
          maxHealth: enemyHP,
          facing: -1 as const,
          shootCooldown: Math.floor((ENEMY_SHOOT_COOLDOWN + Math.floor(Math.random() * 30)) / speedMultiplier),
          animFrame: i * 10,
          animTimer: 0,
          active: false, // Start inactive — will be activated by staggered spawn
          grounded: !isFlyingEnemy(e.type),
          patternTimer: 0,
          invincible: 0,
          isHit: false,
          hitTimer: 0,
          bossName: e.bossName,
          bossColor: e.bossColor,
        };
      });

      // For boss waves, spawn all at once (dramatic entrance)
      // For regular waves, use staggered spawning
      if (isBossWave || newEnemies.length <= 2) {
        // Spawn all immediately for bosses and small waves
        for (const enemy of newEnemies) {
          enemy.active = true;
        }
        enemiesRef.current = [...enemiesRef.current, ...newEnemies];
        waveSpawnedRef.current = true;
        // Track total wave enemies spawned for exit gate logic
        totalWaveEnemiesSpawnedRef.current += newEnemies.length;
      } else {
        // Stagger: put enemies in the spawn queue
        spawnQueueRef.current = newEnemies;
        // Spawn delay: 25-45 frames between groups (faster = more action)
        spawnDelayRef.current = 25 + Math.floor(Math.random() * 20);
        spawnTimerRef.current = 0; // Spawn first group immediately
        // Spawn first 1-2 enemies right away
        const initialCount = Math.min(newEnemies.length, 2);
        for (let i = 0; i < initialCount; i++) {
          const enemy = spawnQueueRef.current.shift()!;
          enemy.active = true;
          enemiesRef.current.push(enemy);
          totalWaveEnemiesSpawnedRef.current++;
        }
      }

      // Boss music transition + dramatic boss entrance
      if (isBossWave) {
        ensureSoundInit();
        soundEngine.stopMusic();
        soundEngine.startBossMusic();
        // Show boss name dramatically
        const bossEnemy = wave.enemies.find(e => e.bossName);
        if (bossEnemy) {
          showDramaticMoment(`⚠ ${bossEnemy.bossName} ⚠`, bossEnemy.bossColor || RED);
          screenShakeRef.current = 10;
        }
      }

      // Voice lines for new enemy types
      if (wave.voiceLine) {
        showVoiceLine(wave.voiceLine, isBossWave ? MAGENTA : CYAN);
      } else {
        // Auto voice line for first encounter with new enemy types
        const newTypes = wave.enemies.filter(e => ['dragon', 'phoenix', 'mechGolem', 'shadowAssassin'].includes(e.type));
        if (newTypes.length > 0 && !isBossWave) {
          const vCategory = newTypes[0].type === 'dragon' ? 'dragon' : newTypes[0].type === 'phoenix' ? 'phoenix' : newTypes[0].type === 'mechGolem' ? 'mechGolem' : 'shadowAssassin';
          showVoiceLine(randomVoiceLine(vCategory), ORANGE);
        }
      }
    };

    // ====== DRAMATIC MOMENT OVERLAY ======
    const renderDramaticMoment = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      if (dmTimerRef.current <= 0) return;

      // Decrease timer using local ref (no store.setState!)
      dmTimerRef.current--;
      const newTimer = dmTimerRef.current;
      if (newTimer <= 0) {
        dmTextRef.current = '';
        return;
      }

      const alpha = newTimer > 100 ? 1 : newTimer / 100;
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;

      // Background strip
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, ch / 2 - 35, cw, 70);

      // Text
      ctx.shadowBlur = 20;
      ctx.shadowColor = dmColorRef.current;
      ctx.fillStyle = dmColorRef.current;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dmTextRef.current, cw / 2, ch / 2 + 8);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ====== VOICE LINE OVERLAY ======
    const renderVoiceLine = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      if (voiceLineTimerRef.current <= 0) return;
      voiceLineTimerRef.current--;
      const alpha = voiceLineTimerRef.current > 60 ? 1 : voiceLineTimerRef.current / 60;
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.shadowBlur = 10;
      ctx.shadowColor = voiceLineColorRef.current;
      ctx.fillStyle = voiceLineColorRef.current;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(voiceLineTextRef.current, cw / 2, ch - 100);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ====== INTRO TEXT OVERLAY ======
    const renderIntro = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      // Safety sync: if the store says we have an intro timer but our local ref is 0,
      // it means the ref wasn't synced (e.g., cutscene → playing transition).
      // Pull the value from the store to ensure the countdown works.
      if (introTimerRef.current <= 0 && store.getState().introTimer > 0 && store.getState().introText) {
        introTextRef.current = store.getState().introText || '';
        introColorRef.current = store.getState().introColor;
        introTimerRef.current = store.getState().introTimer;
      }

      if (!introTextRef.current || introTimerRef.current <= 0) return;

      // Decrease timer using local ref
      introTimerRef.current--;
      const timer = introTimerRef.current;

      // Sync to store when intro timer hits 0 so the TAP TO START overlay knows intro is done
      if (introTimerRef.current <= 0) {
        store.setState({ introTimer: 0 });
      }

      const alpha = timer > 120 ? Math.min(1, (180 - timer + 1) / 60) :
                    timer < 40 ? timer / 40 : 1;

      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, ch / 2 - 50, cw, 100);

      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 15;
      ctx.shadowColor = introColorRef.current;
      ctx.fillStyle = introColorRef.current;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(introTextRef.current, cw / 2, ch / 2 + 5);

      const gameMode = store.getState().gameMode;
      ctx.globalAlpha = alpha * 0.7;
      ctx.font = '13px monospace';
      ctx.fillStyle = '#ffffff';
      if (gameMode === 'coop') {
        ctx.fillText('P1: WASD + Space + Shift + E + F | P2: Arrows + Enter + / . ,', cw / 2, ch / 2 + 30);
      } else {
        ctx.fillText('WASD: Move | Space: Shoot | Shift: Dash | E: Shield | F: Special', cw / 2, ch / 2 + 30);
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ====== MID-LEVEL SURPRISE OVERLAY ======
    const renderSurprise = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      if (!surpriseRef.current || surpriseTimerRef.current <= 0) return;

      surpriseTimerRef.current--;
      const s = surpriseRef.current;
      const alpha = Math.min(1, surpriseTimerRef.current / 30); // fade out in last 30 frames
      const flashScale = 1 + Math.sin(surpriseTimerRef.current * 0.15) * 0.05;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Background flash for impact
      if (surpriseTimerRef.current > s.duration - 10) {
        const flashAlpha = (s.duration - surpriseTimerRef.current + 1) / 10 * 0.3;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = flashAlpha;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = alpha;
      }

      ctx.textAlign = 'center';

      // Big dramatic text
      ctx.font = `bold ${Math.floor(24 * flashScale)}px monospace`;
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = s.color;
      ctx.fillText(s.text, cw / 2, ch * 0.3);

      // Type label
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#ffffff';
      ctx.fillText(`[ ${s.type.toUpperCase()} ]`, cw / 2, ch * 0.35);

      ctx.restore();

      if (surpriseTimerRef.current <= 0) {
        surpriseRef.current = null;
      }
    };

    // ====== ABILITY + SKILL HUD (3 Buttons: Shift, E, F) ======
    const renderAbilityHUD = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      const player = playerRef.current;
      if (!player) return;

      ctx.save();

      // Combo counter (top-right area)
      if (comboRef.current > 1) {
        ctx.globalAlpha = Math.min(1, comboTimerRef.current / 30);
        ctx.shadowBlur = 10;
        ctx.shadowColor = YELLOW;
        ctx.fillStyle = YELLOW;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${comboRef.current}x COMBO`, cw - 20, ch - 50);
        ctx.shadowBlur = 0;
      }

      // 3 slots: Shift, E, F — skill overrides ability if equipped
      const equippedSkills = store.getState().saveData.equippedSkills;
      const slots = [
        {
          key: 'SHIFT',
          defaultLabel: 'DASH',
          defaultColor: CYAN,
          defaultCooldown: player.dashCooldown,
          defaultMaxCd: DASH_COOLDOWN,
          skillId: equippedSkills[0],
        },
        {
          key: 'E',
          defaultLabel: 'SHLD',
          defaultColor: LIME,
          defaultCooldown: player.shieldCooldown,
          defaultMaxCd: SHIELD_COOLDOWN,
          skillId: equippedSkills[1],
        },
        {
          key: 'F',
          defaultLabel: 'SPCL',
          defaultColor: ORANGE,
          defaultCooldown: player.specialCooldown,
          defaultMaxCd: SPECIAL_COOLDOWN,
          skillId: equippedSkills[2],
        },
      ];

      const boxSize = 48;
      const gap = 14;
      const totalWidth = 3 * boxSize + 2 * gap;
      const startX = cw / 2 - totalWidth / 2;
      const hudY = ch - 42;

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const x = startX + i * (boxSize + gap);
        const skillDef = slot.skillId ? SKILL_DEFS.find(s => s.id === slot.skillId) : null;
        const ss = slot.skillId ? skillStatesRef.current.find(s => s.id === slot.skillId) : null;

        // If skill is equipped, use skill data; otherwise use default ability
        const label = skillDef ? (skillDef.name.length > 6 ? skillDef.name.slice(0, 6) : skillDef.name) : slot.defaultLabel;
        const color = skillDef ? skillDef.color : slot.defaultColor;
        const cooldown = skillDef ? (ss ? ss.cooldownTimer : 0) : slot.defaultCooldown;
        const maxCooldown = skillDef ? skillDef.cooldown : slot.defaultMaxCd;
        const ready = cooldown <= 0;

        // Background
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, hudY, boxSize, boxSize);

        // Cooldown fill
        if (!ready) {
          const cdPct = cooldown / maxCooldown;
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#111111';
          ctx.fillRect(x, hudY, boxSize, boxSize * cdPct);
        }

        // Border glow
        ctx.globalAlpha = ready ? 1 : 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = ready ? 2 : 1;
        ctx.shadowBlur = ready ? 10 : 0;
        ctx.shadowColor = color;
        ctx.strokeRect(x, hudY, boxSize, boxSize);

        // Name
        ctx.globalAlpha = ready ? 1 : 0.5;
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = ready ? 5 : 0;
        ctx.fillText(label, x + boxSize / 2, hudY + 18);

        ctx.shadowBlur = 0;

        // Key label box at bottom
        ctx.globalAlpha = ready ? 0.9 : 0.4;
        const keyText = slot.key;
        ctx.font = 'bold 9px monospace';
        const keyW = ctx.measureText(keyText).width + 10;
        const keyH = 15;
        const keyX = x + boxSize / 2 - keyW / 2;
        const keyY = hudY + boxSize - keyH - 4;
        // Key background pill
        ctx.fillStyle = ready ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(keyX, keyY, keyW, keyH, 3);
        ctx.fill();
        ctx.strokeStyle = ready ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(keyX, keyY, keyW, keyH, 3);
        ctx.stroke();
        // Key text
        ctx.fillStyle = ready ? '#ffffff' : '#666666';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(keyText, x + boxSize / 2, keyY + 11);

        // Cooldown seconds
        if (!ready) {
          const secs = Math.ceil(cooldown / 60);
          ctx.globalAlpha = 0.85;
          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = '#ff4444';
          ctx.fillText(`${secs}s`, x + boxSize / 2, hudY + 32);
        }

        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ====== CONTROLS HINT ======
    const renderControlsHint = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      if (introTimerRef.current > 0) return;
      const level = levelRef.current;
      if (!level) return;
      const elapsed = frameCountRef.current;
      if (elapsed > 300) return;
      const alpha = Math.max(0, 1 - elapsed / 300) * 0.7;

      ctx.save();
      ctx.globalAlpha = alpha;
      const hintY = ch - 80;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cw / 2 - 180, hintY - 10, 360, 30);
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1;
      ctx.strokeRect(cw / 2 - 180, hintY - 10, 360, 30);
      ctx.fillStyle = CYAN;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      if (isMobileRef.current) {
        ctx.fillText('Joystick: Move | Buttons: Jump, Shoot, Dash, Shield, Special', cw / 2, hintY + 10);
      } else {
        const gameMode = store.getState().gameMode;
        if (gameMode === 'coop') {
          ctx.fillText('P1: WASD+Space | P2: Arrows+Enter', cw / 2, hintY + 10);
        } else {
          ctx.fillText('WASD: Move | Space: Shoot | Shift/E/F: Skills', cw / 2, hintY + 10);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ====== GAME UPDATE ======
    const updateGame = (cw: number, ch: number) => {
      const player = playerRef.current;
      const level = levelRef.current;
      if (!player || !level) return;

      const keys = keysRef.current;
      const p2Keys = p2KeysRef.current;
      const joystick = joystickRef.current;
      const enemies = enemiesRef.current;
      const bullets = bulletsRef.current;
      const particles = particlesRef.current;
      const platforms = platformsRef.current;

      // Update moving platforms
      for (const plat of platforms) {
        if (plat.type === 'moving' && plat.moveSpeed) {
          plat.moveOffset = (plat.moveOffset || 0) + plat.moveSpeed * 0.02;
        }
      }

      // ====== PLAYER 1 UPDATE ======
      const gameMode = store.getState().gameMode;
      const isVersus = gameMode === 'versus';
      updatePlayerEntity(player, keys, joystick, enemies, bullets, particles, platforms, level, isVersus ? 1 : undefined);

      // Combo timer
      if (comboTimerRef.current > 0) {
        comboTimerRef.current--;
        if (comboTimerRef.current <= 0) comboRef.current = 0;
      }

      // ====== PLAYER 2 UPDATE (Co-op / Versus) ======
      const player2 = player2Ref.current;
      const p2Joystick = p2JoystickRef.current;
      if (player2 && player2.health > 0) {
        updatePlayerEntity(player2, p2Keys, p2Joystick.active ? p2Joystick : null, enemies, bullets, particles, platforms, level, isVersus ? 2 : undefined);
      }

      // ====== UPDATE ENEMIES ======
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const distToPlayer = Math.abs(enemy.x - player.x);

        // Decrement invincibility frames
        if (enemy.invincible > 0) enemy.invincible--;

        if (enemy.isHit) {
          enemy.hitTimer--;
          if (enemy.hitTimer <= 0) enemy.isHit = false;
        }

        switch (enemy.type) {
          case 'drone': {
            if (distToPlayer < 500) {
              enemy.vx = enemy.x > player.x ? -1.5 : 1.5;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
            } else {
              enemy.vx = enemy.facing * 1;
            }
            // Cliff detection - don't walk off edges
            if (enemy.grounded && !isGroundAhead(enemy.x, enemy.y, enemy.vx > 0 ? 1 : -1, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            enemy.animFrame++;
            break;
          }
          case 'glitchWalker': {
            if (distToPlayer < 600) {
              const speed = 2.5 + Math.sin(enemy.animFrame * 0.1) * 0.5;
              enemy.vx = enemy.x > player.x ? -speed : speed;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
            } else {
              enemy.vx = enemy.facing * 1.5;
            }
            // Cliff detection - don't walk off edges
            if (enemy.grounded && !isGroundAhead(enemy.x, enemy.y, enemy.vx > 0 ? 1 : -1, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 500) {
              const dx = player.x - enemy.x;
              const dy = (player.y - 25) - (enemy.y - 25);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 25,
                  vx: (dx / dist) * 5.5, vy: (dy / dist) * 5.5,
                  fromPlayer: false, damage: 10, active: true, color: PURPLE, radius: 3,
                });
              }
              enemy.shootCooldown = ENEMY_SHOOT_COOLDOWN * 0.7;
            }
            enemy.animFrame++;
            break;
          }
          case 'voidGuardian': {
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 500) {
              const dx = player.x - enemy.x;
              const dy = (player.y - 25) - (enemy.y - 15);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                for (let a = -0.2; a <= 0.21; a += 0.2) {
                  const cos = Math.cos(a);
                  const sin = Math.sin(a);
                  bullets.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y - 15,
                    vx: ((dx / dist) * cos - (dy / dist) * sin) * 4.5,
                    vy: ((dx / dist) * sin + (dy / dist) * cos) * 4.5,
                    fromPlayer: false, damage: 10, active: true, color: ORANGE, radius: 3,
                  });
                }
              }
              enemy.shootCooldown = TURRET_SHOOT_COOLDOWN;
            }
            enemy.animFrame++;
            break;
          }
          case 'boss':
          case 'bossRedKing':
          case 'bossTitan':
          case 'bossDragon':
          case 'bossPhoenix':
          case 'bossMechGolem': {
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.patternTimer++;

            // Enrage check — higher levels cause bosses to enrage sooner (at higher health %)
            const enrageThreshold = Math.min(0.5 + (difficultyMultiplierRef.current - 1) * 0.15, 0.75);
            if (enemy.health < enemy.maxHealth * enrageThreshold && !enemy.enraged) {
              enemy.enraged = true;
              screenShakeRef.current = 15;
              spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 40, 30, RED);
              ensureSoundInit();
              soundEngine.playBossEnrage();
              showVoiceLine(randomVoiceLine('bossEnrage'), RED);
            }

            const enrageMultiplier = enemy.enraged ? 1.5 : 1;

            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            const patternPhase = enemy.patternTimer % 360;
            let bossMoveDir = 0; // track intended movement direction for cliff check
            if (patternPhase < 120) {
              bossMoveDir = player.x > enemy.x ? 1 : -1;
              enemy.vx = bossMoveDir * 2.5 * enrageMultiplier;
            } else {
              enemy.vx = 0;
            }
            // Cliff detection - check BEFORE applying movement, and block movement if no ground ahead
            if (enemy.grounded && bossMoveDir !== 0 && !isGroundAhead(enemy.x, enemy.y, bossMoveDir, platforms, level, enemy.width)) {
              enemy.vx = 0; // Block movement toward cliff
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.x += enemy.vx;
            if (patternPhase >= 120 && patternPhase < 240) {
              enemy.shootCooldown--;
              if (enemy.shootCooldown <= 0) {
                const dx = player.x - enemy.x;
                const dy = (player.y - 25) - (enemy.y - 40);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                  for (let a = -0.3; a <= 0.31; a += 0.15) {
                    const cos = Math.cos(a);
                    const sin = Math.sin(a);
                    const bulletColor = enemy.type === 'bossDragon' ? ORANGE : enemy.type === 'bossPhoenix' ? YELLOW : enemy.type === 'bossMechGolem' ? LIME : MAGENTA;
                    bullets.push({
                      x: enemy.x + enemy.width / 2, y: enemy.y - 40,
                      vx: ((dx / dist) * cos - (dy / dist) * sin) * 5.5,
                      vy: ((dx / dist) * sin + (dy / dist) * cos) * 5.5,
                      fromPlayer: false, damage: 10, active: true, color: bulletColor, radius: 4,
                    });
                  }
                }
                enemy.shootCooldown = BOSS_SHOOT_COOLDOWN / enrageMultiplier;
              }
            } else if (patternPhase >= 240) {
              if (patternPhase === 240 && enemy.grounded) enemy.vy = -14;
              if (patternPhase === 300 && enemy.grounded && distToPlayer < 130) {
                if (player.invincible <= 0 && !player.isShielding) {
                  player.health -= 15;
                  player.invincible = INVINCIBLE_FRAMES;
                  player.expression = 'hurt';
                  spawnParticles(particles, player.x + player.width / 2, player.y - 25, 10, RED);
                  screenShakeRef.current = 12; // Stronger shake when boss hits player
                  ensureSoundInit();
                  soundEngine.playHit();
                }
                for (let i = 0; i < 20; i++) {
                  particles.push({
                    x: enemy.x + enemy.width / 2 + (Math.random() - 0.5) * 150,
                    y: enemy.y, vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 5,
                    life: 30, maxLife: 30, color: ORANGE, size: 3,
                  });
                }
              }
            }
            enemy.y += enemy.vy;
            enemy.animFrame++;
            break;
          }
          case 'dragon': {
            // Dragon: flies, breathes fire
            enemy.vy += GRAVITY * 0.3; // light gravity for flying
            if (enemy.vy > 3) enemy.vy = 3;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
              // Fly towards player height
              if (enemy.y - 25 > player.y - 40) enemy.vy -= 0.5;
              if (enemy.y - 25 < player.y - 60) enemy.vy += 0.3;
            } else {
              enemy.vx = enemy.facing * 1;
              enemy.vy += Math.sin(enemy.animFrame * 0.05) * 0.3;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            // Fire breath
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 400) {
              for (let a = -0.15; a <= 0.16; a += 0.15) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 20,
                  vx: enemy.facing * 5.5 * Math.cos(a),
                  vy: 2 * Math.sin(a) - 1,
                  fromPlayer: false, damage: 10, active: true, color: ORANGE, radius: 4,
                });
              }
              enemy.shootCooldown = 50;
            }
            enemy.animFrame++;
            break;
          }
          case 'phoenix': {
            // Phoenix: flies, revives once
            enemy.vy += GRAVITY * 0.25;
            if (enemy.vy > 3) enemy.vy = 3;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2.5;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
              if (enemy.y - 25 > player.y - 30) enemy.vy -= 0.6;
              if (enemy.y - 25 < player.y - 70) enemy.vy += 0.4;
            } else {
              enemy.vx = enemy.facing * 1.5;
              enemy.vy += Math.sin(enemy.animFrame * 0.06) * 0.4;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 450) {
              bullets.push({
                x: enemy.x + enemy.width / 2, y: enemy.y - 15,
                vx: enemy.facing * 6.5, vy: 1,
                fromPlayer: false, damage: 8, active: true, color: YELLOW, radius: 3,
              });
              enemy.shootCooldown = 35;
            }
            // Revive once on death (handled in damage section)
            enemy.animFrame++;
            break;
          }
          case 'mechGolem': {
            // Mech Golem: slow, tanky, shoots
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 1.2;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
            } else {
              enemy.vx = enemy.facing * 0.8;
            }
            if (enemy.grounded && !isGroundAhead(enemy.x, enemy.y, enemy.vx > 0 ? 1 : -1, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 450) {
              for (let a = -0.1; a <= 0.11; a += 0.2) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 30,
                  vx: enemy.facing * 5.5 * Math.cos(a),
                  vy: -2 * Math.sin(a),
                  fromPlayer: false, damage: 12, active: true, color: LIME, radius: 4,
                });
              }
              enemy.shootCooldown = 60;
            }
            enemy.animFrame++;
            break;
          }
          case 'shadowAssassin': {
            // Shadow Assassin: fast, stealthy, teleports
            if (distToPlayer < 500) {
              const speed = 3.5 + Math.sin(enemy.animFrame * 0.15) * 1;
              enemy.vx = (player.x > enemy.x ? 1 : -1) * speed;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
            } else {
              enemy.vx = enemy.facing * 2;
            }
            if (enemy.grounded && !isGroundAhead(enemy.x, enemy.y, enemy.vx > 0 ? 1 : -1, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            // Quick slash attack
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 200) {
              bullets.push({
                x: enemy.x + enemy.width / 2, y: enemy.y - 25,
                vx: enemy.facing * 8.5, vy: 0,
                fromPlayer: false, damage: 14, active: true, color: PURPLE, radius: 3,
              });
              enemy.shootCooldown = 25;
            }
            enemy.animFrame++;
            break;
          }
          case 'eliteDrone': {
            // Elite Drone: faster, tougher drone
            if (distToPlayer < 600) {
              enemy.vx = enemy.x > player.x ? -2 : 2;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
            } else {
              enemy.vx = enemy.facing * 1.2;
            }
            // Cliff detection
            if (enemy.grounded && !isGroundAhead(enemy.x, enemy.y, enemy.vx > 0 ? 1 : -1, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            // Shoot faster than regular drone
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 500) {
              const dx = player.x - enemy.x;
              const dy = (player.y - 25) - (enemy.y - 25);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 25,
                  vx: (dx / dist) * 6, vy: (dy / dist) * 6,
                  fromPlayer: false, damage: 12, active: true, color: RED, radius: 3,
                });
              }
              enemy.shootCooldown = ENEMY_SHOOT_COOLDOWN * 0.5;
            }
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            enemy.animFrame++;
            break;
          }
          case 'heavyWalker': {
            // Heavy Walker: slow, tanky, shoots
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 1;
              enemy.facing = enemy.vx > 0 ? 1 : -1;
            } else {
              enemy.vx = enemy.facing * 0.6;
            }
            // Cliff detection
            if (enemy.grounded && !isGroundAhead(enemy.x, enemy.y, enemy.vx > 0 ? 1 : -1, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            // Heavy shot
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 450) {
              for (let a = -0.15; a <= 0.16; a += 0.15) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 30,
                  vx: enemy.facing * 4.5 * Math.cos(a),
                  vy: -1.5 * Math.sin(a),
                  fromPlayer: false, damage: 14, active: true, color: ORANGE, radius: 4,
                });
              }
              enemy.shootCooldown = 70;
            }
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            enemy.animFrame++;
            break;
          }
          case 'bossCorrupted': {
            // Corrupted Boss: similar to other bosses but with unique attacks
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.patternTimer++;
            // Enrage check — scales with level
            const corruptedEnrageThreshold = Math.min(0.5 + (difficultyMultiplierRef.current - 1) * 0.15, 0.75);
            if (enemy.health < enemy.maxHealth * corruptedEnrageThreshold && !enemy.enraged) {
              enemy.enraged = true;
              screenShakeRef.current = 15;
              spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 40, 30, PURPLE);
              ensureSoundInit();
              soundEngine.playBossEnrage();
            }
            const enrageMultiplier = enemy.enraged ? 1.5 : 1;
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            const patternPhase = enemy.patternTimer % 300;
            let bossMoveDir = 0;
            if (patternPhase < 100) {
              bossMoveDir = player.x > enemy.x ? 1 : -1;
              enemy.vx = bossMoveDir * 2 * enrageMultiplier;
            } else {
              enemy.vx = 0;
            }
            // Cliff detection
            if (enemy.grounded && bossMoveDir !== 0 && !isGroundAhead(enemy.x, enemy.y, bossMoveDir, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.x += enemy.vx;
            if (patternPhase >= 100 && patternPhase < 200) {
              enemy.shootCooldown--;
              if (enemy.shootCooldown <= 0) {
                for (let a = -0.4; a <= 0.41; a += 0.2) {
                  bullets.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y - 40,
                    vx: enemy.facing * 5 * Math.cos(a),
                    vy: 3 * Math.sin(a),
                    fromPlayer: false, damage: 10, active: true, color: PURPLE, radius: 4,
                  });
                }
                enemy.shootCooldown = BOSS_SHOOT_COOLDOWN / enrageMultiplier;
              }
            } else if (patternPhase >= 200) {
              if (patternPhase === 200 && enemy.grounded) enemy.vy = -13;
            }
            enemy.y += enemy.vy;
            enemy.animFrame++;
            break;
          }
          case 'bossFather': {
            // FATHER BOSS: Blue's father — uses player-like abilities (dash, shield, special)
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.patternTimer++;
            // Enrage check — scales with level (base 40%, higher levels enrage sooner)
            const fatherEnrageThreshold = Math.min(0.4 + (difficultyMultiplierRef.current - 1) * 0.15, 0.7);
            if (enemy.health < enemy.maxHealth * fatherEnrageThreshold && !enemy.enraged) {
              enemy.enraged = true;
              screenShakeRef.current = 15;
              spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 40, 30, CYAN);
              ensureSoundInit();
              soundEngine.playBossEnrage();
            }
            const enrageMultiplier = enemy.enraged ? 1.6 : 1;
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            const patternPhase = enemy.patternTimer % 360;
            let bossMoveDir = 0;
            // Phase 1: Walk toward player
            if (patternPhase < 80) {
              bossMoveDir = player.x > enemy.x ? 1 : -1;
              enemy.vx = bossMoveDir * 2.5 * enrageMultiplier;
            // Phase 2: Dash toward player
            } else if (patternPhase >= 80 && patternPhase < 120) {
              if (patternPhase === 80) {
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 10, CYAN);
              }
              bossMoveDir = player.x > enemy.x ? 1 : -1;
              enemy.vx = bossMoveDir * 8 * enrageMultiplier;
              if (frameCountRef.current % 3 === 0) {
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 2, CYAN);
              }
            // Phase 3: Shoot spread pattern
            } else if (patternPhase >= 120 && patternPhase < 220) {
              enemy.vx = 0;
              enemy.shootCooldown--;
              if (enemy.shootCooldown <= 0) {
                // Father shoots a fan of bullets like player's special
                for (let a = -0.6; a <= 0.61; a += 0.15) {
                  bullets.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y - 30,
                    vx: enemy.facing * 6 * Math.cos(a) * enrageMultiplier,
                    vy: 4 * Math.sin(a),
                    fromPlayer: false, damage: 8, active: true, color: CYAN, radius: 4,
                  });
                }
                enemy.shootCooldown = (BOSS_SHOOT_COOLDOWN * 2) / enrageMultiplier;
              }
            // Phase 4: Jump + slam
            } else {
              if (patternPhase === 220 && enemy.grounded) {
                enemy.vy = -14;
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y, 15, CYAN);
              }
              if (patternPhase > 240 && enemy.grounded) {
                // Ground slam - shockwave
                screenShakeRef.current = 12; // Stronger shake for boss ground slam
                for (let i = -3; i <= 3; i++) {
                  bullets.push({
                    x: enemy.x + enemy.width / 2 + i * 20, y: enemy.y - 5,
                    vx: i * 2.5, vy: -2,
                    fromPlayer: false, damage: 12, active: true, color: CYAN, radius: 5,
                  });
                }
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y, 20, CYAN);
              }
              enemy.vx = player.x > enemy.x ? 1.5 : -1.5;
            }
            // Cliff detection
            if (enemy.grounded && bossMoveDir !== 0 && !isGroundAhead(enemy.x, enemy.y, bossMoveDir, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.x < 10) enemy.x = 10;
            if (enemy.x + enemy.width > level.width) enemy.x = level.width - enemy.width;
            enemy.animFrame++;
            break;
          }
          case 'bossTwin': {
            // TWIN BROTHER: Fights like the player — dashes, shields, shoots fan, mirror pattern
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.patternTimer++;
            // Enrage check — scales with level (base 40%, higher levels enrage sooner)
            const twinEnrageThreshold = Math.min(0.4 + (difficultyMultiplierRef.current - 1) * 0.15, 0.7);
            if (enemy.health < enemy.maxHealth * twinEnrageThreshold && !enemy.enraged) {
              enemy.enraged = true;
              screenShakeRef.current = 15;
              spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 40, 30, BLUE);
              ensureSoundInit();
              soundEngine.playBossEnrage();
            }
            const enrageMultiplier = enemy.enraged ? 1.8 : 1;
            enemy.vy += GRAVITY;
            if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;
            enemy.grounded = false;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              if (enemy.x + enemy.width > px && enemy.x < px + plat.width &&
                  enemy.y >= py && enemy.y - enemy.vy <= py + 4) {
                enemy.y = py; enemy.vy = 0; enemy.grounded = true;
              }
            }
            const patternPhase = enemy.patternTimer % 400;
            let bossMoveDir = 0;
            // Phase 1: Dash toward player (like player's dash)
            if (patternPhase < 60) {
              bossMoveDir = player.x > enemy.x ? 1 : -1;
              enemy.vx = bossMoveDir * 10 * enrageMultiplier;
              if (frameCountRef.current % 2 === 0) {
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 2, BLUE);
              }
            // Phase 2: Shoot fan pattern (like player's special)
            } else if (patternPhase >= 60 && patternPhase < 180) {
              enemy.vx = 0;
              enemy.shootCooldown--;
              if (enemy.shootCooldown <= 0) {
                for (let a = -0.5; a <= 0.51; a += 0.12) {
                  bullets.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y - 30,
                    vx: enemy.facing * 7 * Math.cos(a) * enrageMultiplier,
                    vy: 3 * Math.sin(a),
                    fromPlayer: false, damage: 7, active: true, color: BLUE, radius: 4,
                  });
                }
                enemy.shootCooldown = Math.floor((BOSS_SHOOT_COOLDOWN * 2.5) / enrageMultiplier);
              }
            // Phase 3: Shield (brief pause, then jump)
            } else if (patternPhase >= 180 && patternPhase < 260) {
              enemy.vx = 0;
              if (patternPhase === 180) {
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 15, '#4488ff');
              }
              // Shield visual - spawn shield particles
              if (frameCountRef.current % 4 === 0) {
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 1, '#88bbff');
              }
            // Phase 4: Jump + shoot while airborne
            } else {
              if (patternPhase === 260 && enemy.grounded) {
                enemy.vy = -15;
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y, 15, BLUE);
              }
              enemy.vx = player.x > enemy.x ? 2 : -2;
              // Shoot while jumping
              if (!enemy.grounded && frameCountRef.current % 12 === 0) {
                for (let a = -0.3; a <= 0.31; a += 0.15) {
                  bullets.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y - 30,
                    vx: enemy.facing * 6 * Math.cos(a),
                    vy: 4 * Math.sin(a),
                    fromPlayer: false, damage: 6, active: true, color: '#88bbff', radius: 3,
                  });
                }
              }
              if (patternPhase > 300 && enemy.grounded) {
                // Ground slam
                screenShakeRef.current = 10;
                for (let i = -4; i <= 4; i++) {
                  bullets.push({
                    x: enemy.x + enemy.width / 2 + i * 15, y: enemy.y - 5,
                    vx: i * 2, vy: -3,
                    fromPlayer: false, damage: 10, active: true, color: BLUE, radius: 4,
                  });
                }
                spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y, 25, BLUE);
              }
            }
            // Cliff detection
            if (enemy.grounded && bossMoveDir !== 0 && !isGroundAhead(enemy.x, enemy.y, bossMoveDir, platforms, level, enemy.width)) {
              enemy.vx = 0;
              enemy.facing = (enemy.facing * -1) as 1 | -1;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.x < 10) enemy.x = 10;
            if (enemy.x + enemy.width > level.width) enemy.x = level.width - enemy.width;
            enemy.animFrame++;
            break;
          }
          // ====== NEW FLYING ENEMY TYPES ======
          case 'voidBat': {
            // Void Bat: small, fast flying enemy
            enemy.facing = enemy.x > player.x ? -1 : 1;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 3;
              // Fly towards player with sine wave
              const targetY = player.y - 60;
              enemy.vy += (targetY - enemy.y) * 0.02;
            } else {
              enemy.vx = enemy.facing * 2;
              enemy.vy = Math.sin(enemy.animFrame * 0.08) * 1.5;
            }
            enemy.vy += Math.sin(enemy.animFrame * 0.12) * 0.3;
            if (enemy.vy > 4) enemy.vy = 4;
            if (enemy.vy < -4) enemy.vy = -4;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            // Keep in bounds
            if (enemy.y < 40) enemy.y = 40;
            if (enemy.y > level.height - 50) enemy.y = level.height - 50;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Shoot
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 400) {
              bullets.push({
                x: enemy.x + enemy.width / 2, y: enemy.y - 10,
                vx: enemy.facing * 5, vy: 0.5,
                fromPlayer: false, damage: 5, active: true, color: MAGENTA, radius: 2,
              });
              enemy.shootCooldown = 40;
            }
            enemy.animFrame++;
            break;
          }
          case 'stormEagle': {
            // Storm Eagle: medium flying enemy with lightning
            enemy.facing = enemy.x > player.x ? -1 : 1;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2;
              const targetY = player.y - 80;
              enemy.vy += (targetY - enemy.y) * 0.015;
            } else {
              enemy.vx = enemy.facing * 1.5;
              enemy.vy = Math.sin(enemy.animFrame * 0.06) * 1.2;
            }
            enemy.vy += Math.sin(enemy.animFrame * 0.1) * 0.2;
            if (enemy.vy > 3) enemy.vy = 3;
            if (enemy.vy < -3) enemy.vy = -3;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 50) enemy.y = 50;
            if (enemy.y > level.height - 60) enemy.y = level.height - 60;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Lightning attack
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 450) {
              // Lightning bolt (fast, straight)
              const dx = player.x - enemy.x;
              const dy = (player.y - 25) - (enemy.y - 20);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 20,
                  vx: (dx / dist) * 8, vy: (dy / dist) * 8,
                  fromPlayer: false, damage: 10, active: true, color: YELLOW, radius: 4,
                });
              }
              enemy.shootCooldown = 60;
            }
            enemy.animFrame++;
            break;
          }
          case 'emberWisp': {
            // Ember Wisp: small floating fire spirit, erratic movement
            enemy.facing = enemy.x > player.x ? -1 : 1;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2.5;
              const targetY = player.y - 50 + Math.sin(enemy.animFrame * 0.1) * 30;
              enemy.vy += (targetY - enemy.y) * 0.02;
            } else {
              enemy.vx = enemy.facing * 1.5;
              enemy.vy = Math.sin(enemy.animFrame * 0.1) * 1.5;
            }
            enemy.vy += Math.sin(enemy.animFrame * 0.15) * 0.4;
            if (enemy.vy > 4) enemy.vy = 4;
            if (enemy.vy < -4) enemy.vy = -4;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 30) enemy.y = 30;
            if (enemy.y > level.height - 50) enemy.y = level.height - 50;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Fire projectile
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 400) {
              bullets.push({
                x: enemy.x + enemy.width / 2, y: enemy.y - 8,
                vx: enemy.facing * 5, vy: 1,
                fromPlayer: false, damage: 7, active: true, color: ORANGE, radius: 3,
              });
              enemy.shootCooldown = 35;
            }
            enemy.animFrame++;
            break;
          }
          case 'frostWraith': {
            // Frost Wraith: floating ice ghost, slow and eerie
            enemy.facing = enemy.x > player.x ? -1 : 1;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 1.8;
              const targetY = player.y - 70;
              enemy.vy += (targetY - enemy.y) * 0.012;
            } else {
              enemy.vx = enemy.facing * 1;
              enemy.vy = Math.sin(enemy.animFrame * 0.07) * 1;
            }
            enemy.vy += Math.sin(enemy.animFrame * 0.09) * 0.3;
            if (enemy.vy > 3) enemy.vy = 3;
            if (enemy.vy < -3) enemy.vy = -3;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 40) enemy.y = 40;
            if (enemy.y > level.height - 60) enemy.y = level.height - 60;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Ice shard attack
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 450) {
              for (let a = -0.2; a <= 0.21; a += 0.2) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 20,
                  vx: enemy.facing * 4 * Math.cos(a),
                  vy: 2 * Math.sin(a),
                  fromPlayer: false, damage: 8, active: true, color: '#88eeff', radius: 3,
                });
              }
              enemy.shootCooldown = 65;
            }
            enemy.animFrame++;
            break;
          }
          case 'shadowDrake': {
            // Shadow Drake: medium shadow dragon, aggressive flyer
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.vy += GRAVITY * 0.2; // light gravity
            if (enemy.vy > 3) enemy.vy = 3;
            if (distToPlayer < 600) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2.5;
              const targetY = player.y - 80;
              enemy.vy += (targetY - enemy.y) * 0.015;
            } else {
              enemy.vx = enemy.facing * 1.5;
              enemy.vy += Math.sin(enemy.animFrame * 0.07) * 0.4;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 30) enemy.y = 30;
            if (enemy.y > level.height - 60) enemy.y = level.height - 60;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Shadow breath
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 400) {
              for (let a = -0.15; a <= 0.16; a += 0.15) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 20,
                  vx: enemy.facing * 5 * Math.cos(a),
                  vy: 1.5 * Math.sin(a),
                  fromPlayer: false, damage: 9, active: true, color: PURPLE, radius: 3,
                });
              }
              enemy.shootCooldown = 50;
            }
            enemy.animFrame++;
            break;
          }
          case 'plasmaSerpent': {
            // Plasma Serpent: flying energy serpent, sinuous movement
            enemy.facing = enemy.x > player.x ? -1 : 1;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2.2;
              const targetY = player.y - 65;
              enemy.vy += (targetY - enemy.y) * 0.018;
            } else {
              enemy.vx = enemy.facing * 1.5;
              enemy.vy = Math.sin(enemy.animFrame * 0.08) * 1.5;
            }
            // Strong sine wave movement
            enemy.vy += Math.sin(enemy.animFrame * 0.12) * 0.5;
            if (enemy.vy > 4) enemy.vy = 4;
            if (enemy.vy < -4) enemy.vy = -4;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 30) enemy.y = 30;
            if (enemy.y > level.height - 60) enemy.y = level.height - 60;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Plasma bolt
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 450) {
              const dx = player.x - enemy.x;
              const dy = (player.y - 25) - (enemy.y - 20);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 15,
                  vx: (dx / dist) * 6, vy: (dy / dist) * 6,
                  fromPlayer: false, damage: 10, active: true, color: MAGENTA, radius: 4,
                });
              }
              enemy.shootCooldown = 55;
            }
            enemy.animFrame++;
            break;
          }
          case 'neonWyrm': {
            // Neon Wyrm: large flying wyrm, powerful
            enemy.facing = enemy.x > player.x ? -1 : 1;
            enemy.vy += GRAVITY * 0.15;
            if (enemy.vy > 3) enemy.vy = 3;
            if (distToPlayer < 600) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2;
              const targetY = player.y - 90;
              enemy.vy += (targetY - enemy.y) * 0.01;
            } else {
              enemy.vx = enemy.facing * 1;
              enemy.vy += Math.sin(enemy.animFrame * 0.06) * 0.5;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 40) enemy.y = 40;
            if (enemy.y > level.height - 70) enemy.y = level.height - 70;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Multi-projectile attack
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 500) {
              for (let a = -0.3; a <= 0.31; a += 0.15) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 25,
                  vx: enemy.facing * 5 * Math.cos(a),
                  vy: 2 * Math.sin(a),
                  fromPlayer: false, damage: 12, active: true, color: CYAN, radius: 4,
                });
              }
              enemy.shootCooldown = 70;
            }
            enemy.animFrame++;
            break;
          }
          case 'crystalMoth': {
            // Crystal Moth: floating crystal creature, gentle but deadly
            enemy.facing = enemy.x > player.x ? -1 : 1;
            if (distToPlayer < 500) {
              enemy.vx = (player.x > enemy.x ? 1 : -1) * 2;
              const targetY = player.y - 55 + Math.sin(enemy.animFrame * 0.08) * 25;
              enemy.vy += (targetY - enemy.y) * 0.02;
            } else {
              enemy.vx = enemy.facing * 1;
              enemy.vy = Math.sin(enemy.animFrame * 0.1) * 1;
            }
            enemy.vy += Math.sin(enemy.animFrame * 0.13) * 0.3;
            if (enemy.vy > 3) enemy.vy = 3;
            if (enemy.vy < -3) enemy.vy = -3;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            if (enemy.y < 30) enemy.y = 30;
            if (enemy.y > level.height - 50) enemy.y = level.height - 50;
            if (enemy.x < 10 || enemy.x > level.width - 30) enemy.facing = (enemy.facing * -1) as 1 | -1;
            // Crystal shard attack
            enemy.shootCooldown--;
            if (enemy.shootCooldown <= 0 && distToPlayer < 400) {
              // Shoots 3 crystal shards in a spread
              for (let a = -0.25; a <= 0.26; a += 0.25) {
                bullets.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y - 12,
                  vx: enemy.facing * 4.5 * Math.cos(a),
                  vy: 1.5 * Math.sin(a),
                  fromPlayer: false, damage: 6, active: true, color: LIME, radius: 3,
                });
              }
              enemy.shootCooldown = 50;
            }
            enemy.animFrame++;
            break;
          }
        }

        // SAFETY NET: If any enemy falls below the level, deactivate or reposition
        if (enemy.y > level.height + 100) {
          // For bosses, reposition them on the nearest platform
          if (enemy.type === 'boss' || enemy.type === 'bossRedKing' || enemy.type === 'bossTitan' ||
              enemy.type === 'bossDragon' || enemy.type === 'bossPhoenix' || enemy.type === 'bossMechGolem' || enemy.type === 'bossCorrupted' || enemy.type === 'bossFather' || enemy.type === 'bossTwin') {
            // Find nearest platform to player and put boss there
            let bestPlat = platforms[0];
            let bestDist = Infinity;
            for (const plat of platforms) {
              const { px, py } = getPlatPos(plat);
              const dist = Math.abs(px + plat.width / 2 - player.x);
              if (dist < bestDist && py < 530) {
                bestDist = dist;
                bestPlat = plat;
              }
            }
            const { px, py } = getPlatPos(bestPlat);
            enemy.x = px + bestPlat.width / 2 - enemy.width / 2;
            enemy.y = py;
            enemy.vy = 0;
            enemy.grounded = false;
            enemy.invincible = 60;
          } else {
            // Regular enemies just deactivate (they fell into a pit)
            enemy.active = false;
          }
        }

        // Contact damage to Player 1
        if (player.invincible <= 0 && !player.isShielding && enemy.active) {
          const eH = getEnemyHeight(enemy.type);
          if (aabb(player.x, player.y - player.height, player.width, player.height, enemy.x, enemy.y - eH, enemy.width, eH)) {
            player.health -= enemy.type === 'boss' ? 15 : 10;
            player.invincible = INVINCIBLE_FRAMES;
            player.expression = 'hurt';
            spawnParticles(particles, player.x + player.width / 2, player.y - 25, 8, RED);
            screenShakeRef.current = 5;
            player.x += (player.x < enemy.x ? -8 : 8);
            ensureSoundInit();
            soundEngine.playDamage();
          }
        }

        // Contact damage to Player 2
        if (player2 && player2.health > 0 && player2.invincible <= 0 && !player2.isShielding && enemy.active) {
          const eH = getEnemyHeight(enemy.type);
          if (aabb(player2.x, player2.y - player2.height, player2.width, player2.height, enemy.x, enemy.y - eH, enemy.width, eH)) {
            player2.health -= enemy.type === 'boss' ? 15 : 10;
            player2.invincible = INVINCIBLE_FRAMES;
            player2.expression = 'hurt';
            spawnParticles(particles, player2.x + player2.width / 2, player2.y - 25, 8, RED);
            screenShakeRef.current = 5;
            player2.x += (player2.x < enemy.x ? -8 : 8);
            ensureSoundInit();
            soundEngine.playDamage();
          }
        }
      }

      // ====== UPDATE GANG AI ======
      for (const gang of gangRef.current) {
        if (!gang.active) continue;
        const distToPlayer = Math.abs(gang.x - player.x);

        if (distToPlayer > 60) {
          gang.vx = (player.x > gang.x ? 1 : -1) * (PLAYER_SPEED * 0.8);
          gang.facing = gang.vx > 0 ? 1 : -1;
        } else {
          gang.vx = 0;
          gang.facing = player.facing;
        }

        // Cliff detection for gang
        if (gang.grounded && gang.vx !== 0 && !isGroundAhead(gang.x, gang.y, gang.vx > 0 ? 1 : -1, platforms, level, 30)) {
          gang.vx = 0;
          gang.facing = (gang.facing * -1) as 1 | -1;
        }

        gang.vy += GRAVITY;
        if (gang.vy > MAX_FALL_SPEED) gang.vy = MAX_FALL_SPEED;
        gang.x += gang.vx;
        gang.y += gang.vy;

        gang.grounded = false;
        for (const plat of platforms) {
          const { px: ppx, py: ppy } = getPlatPos(plat);
          if (gang.x + 15 > ppx && gang.x - 15 < ppx + plat.width &&
              gang.y >= ppy && gang.y - gang.vy <= ppy + 4) {
            gang.y = ppy; gang.vy = 0; gang.grounded = true;
          }
        }

        // SAFETY: If gang member falls below level, teleport back to player
        if (gang.y > level.height + 50) {
          gang.x = player.x - 40;
          gang.y = player.y;
          gang.vy = 0;
          gang.grounded = false;
          gang.invincible = 30;
        }

        if (gang.grounded && (!player.grounded || gang.x < 10 || gang.x > level.width - 30)) {
          // Only jump if there's ground ahead or player is above
          const jumpDir = player.x > gang.x ? 1 : -1;
          if (!isGroundAhead(gang.x, gang.y, jumpDir, platforms, level, 30)) {
            // No ground ahead, only jump to follow player who's above
            if (player.y < gang.y - 60) {
              gang.vy = JUMP_VELOCITY * 0.85;
              gang.grounded = false;
            }
          } else {
            gang.vy = JUMP_VELOCITY * 0.85;
            gang.grounded = false;
          }
        }

        gang.shootCooldown--;
        if (gang.shootCooldown <= 0) {
          const nearestEnemy = enemies.find(e => e.active && Math.abs(e.x - gang.x) < 400);
          if (nearestEnemy) {
            const dx = nearestEnemy.x - gang.x;
            const dy = (nearestEnemy.y - 25) - (gang.y - 25);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              bullets.push({
                x: gang.x, y: gang.y - 25,
                vx: (dx / dist) * 7, vy: (dy / dist) * 7,
                fromPlayer: true, damage: 8, active: true, color: gang.color, radius: 3,
                fromGangMember: gang.id,
              });
              spawnParticles(particles, gang.x + gang.facing * 15, gang.y - 25, 2, gang.color);
            }
            gang.shootCooldown = 50 + Math.floor(Math.random() * 30);
          }
        }

        gang.animFrame++;
        if (gang.invincible > 0) gang.invincible--;

        for (const enemy of enemies) {
          if (!enemy.active) continue;
          if (gang.invincible <= 0 && aabb(gang.x - 10, gang.y - 45, 20, 45, enemy.x, enemy.y - getEnemyHeight(enemy.type), enemy.width, getEnemyHeight(enemy.type))) {
            gang.health -= 10;
            gang.invincible = INVINCIBLE_FRAMES;
            gang.expression = 'hurt';
            spawnParticles(particles, gang.x, gang.y - 25, 5, gang.color);
          }
        }

        if (gang.health <= 0) {
          gang.active = false;
          spawnParticles(particles, gang.x, gang.y - 25, 15, gang.color);
        }

        gang.expression = gang.shootCooldown < 20 ? 'angry' : distToPlayer < 200 ? 'determined' : 'neutral';
      }

      // ====== UPDATE PET AI ======
      const pet = petRef.current;
      if (pet && pet.active) {
        // Follow player closely with lerp
        const distToPlayer = Math.abs(pet.x - player.x);
        const verticalDiff = player.y - pet.y;

        // Determine intended movement direction BEFORE applying lerp
        const targetX = player.x - player.facing * 30; // Stay slightly behind player
        const petMoveDir = targetX > pet.x ? 1 : targetX < pet.x ? -1 : 0;

        // CLIFF DETECTION for pet - check BEFORE any movement
        let cliffAhead = false;
        if (pet.grounded && petMoveDir !== 0) {
          cliffAhead = !isGroundAhead(pet.x, pet.y, petMoveDir, platforms, level, 20);
        }

        // Apply lerp movement, but STOP if cliff ahead
        if (!cliffAhead) {
          const lerpFactor = distToPlayer > 80 ? 0.12 : 0.06;
          pet.x += (targetX - pet.x) * lerpFactor;
          if (distToPlayer > 80) {
            pet.x += (targetX - pet.x) * 0.08;
          }
        } else {
          // Cliff ahead! Try jumping over the gap to reach the player
          if (pet.grounded && distToPlayer > 60) {
            pet.vy = JUMP_VELOCITY * 0.9;
            pet.grounded = false;
          }
        }

        // Update facing
        if (distToPlayer > 30) {
          pet.facing = player.x > pet.x ? 1 : -1;
        } else {
          pet.facing = player.facing;
        }

        // Float near player (slight hover)
        pet.vy += GRAVITY * 0.5; // lighter gravity
        if (pet.vy > MAX_FALL_SPEED * 0.6) pet.vy = MAX_FALL_SPEED * 0.6;

        // Follow player vertically - jump when player is above
        if (verticalDiff < -60 && pet.grounded) {
          pet.vy = JUMP_VELOCITY * 0.85;
          pet.grounded = false;
        }

        pet.y += pet.vy;

        // Platform collision for pet
        pet.grounded = false;
        for (const plat of platforms) {
          const { px, py } = getPlatPos(plat);
          if (pet.x + 10 > px && pet.x - 10 < px + plat.width &&
              pet.y >= py && pet.y - pet.vy <= py + 4) {
            pet.y = py; pet.vy = 0; pet.grounded = true;
          }
        }

        // SAFETY: If pet is falling below the level, teleport back to player
        if (pet.y > level.height + 50) {
          pet.x = player.x + 30;
          pet.y = player.y - 20;
          pet.vy = 0;
          pet.grounded = false;
          pet.invincible = 30;
        }

        // Bounds
        if (pet.x < 0) pet.x = 0;
        if (pet.x > level.width) pet.x = level.width;

        // Shoot at nearest enemy
        pet.shootCooldown--;
        if (pet.shootCooldown <= 0) {
          const nearestEnemy = enemies.find(e => e.active && Math.abs(e.x - pet.x) < 350);
          if (nearestEnemy) {
            const dx = nearestEnemy.x - pet.x;
            const dy = (nearestEnemy.y - 20) - (pet.y - 15);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const currentPetDef = PET_DEFS.find(p => p.id === pet.type) || PET_DEFS[0];
              bullets.push({
                x: pet.x, y: pet.y - 15,
                vx: (dx / dist) * 6, vy: (dy / dist) * 6,
                fromPlayer: true, damage: currentPetDef.damage, active: true,
                color: pet.skinColor, radius: 3, fromPet: true,
              });
              spawnParticles(particles, pet.x + pet.facing * 10, pet.y - 15, 2, pet.skinColor);
              ensureSoundInit();
              soundEngine.playPetShoot();
            }
            pet.shootCooldown = (PET_DEFS.find(p => p.id === pet.type))?.shootRate || 45;
          }
        }

        pet.animFrame++;
        if (pet.invincible > 0) pet.invincible--;

        // Pet takes damage from enemies
        for (const enemy of enemies) {
          if (!enemy.active) continue;
          if (pet.invincible <= 0 && aabb(pet.x - 8, pet.y - 20, 16, 20, enemy.x, enemy.y - getEnemyHeight(enemy.type), enemy.width, getEnemyHeight(enemy.type))) {
            pet.health -= 8;
            pet.invincible = INVINCIBLE_FRAMES;
            spawnParticles(particles, pet.x, pet.y - 10, 5, pet.skinColor);
            ensureSoundInit();
            soundEngine.playDamage();
          }
        }

        // Pet death and respawn
        if (pet.health <= 0) {
          pet.active = false;
          pet.respawnTimer = 600; // 10 seconds at 60fps
          spawnParticles(particles, pet.x, pet.y - 15, 15, pet.skinColor);
          ensureSoundInit();
          soundEngine.playPetDeath();
          showVoiceLine('No! Hang on, partner!', CYAN);
        }
      } else if (pet && !pet.active) {
        // Respawn timer
        pet.respawnTimer--;
        if (pet.respawnTimer <= 0) {
          pet.active = true;
          pet.health = pet.maxHealth;
          pet.x = player.x + 30;
          pet.y = player.y - 20;
          pet.invincible = 60;
          ensureSoundInit();
          soundEngine.playPetRespawn();
          showVoiceLine('You\'re back!', LIME);
        }
      }

      // ====== DRAMATIC MOMENTS ======
      dramaticMomentTimerRef.current--;
      if (dramaticMomentTimerRef.current <= 0) {
        dramaticMomentTimerRef.current = 600; // Check every 600 frames
        // Player low health dramatic moment
        if (player.health > 0 && player.health < player.maxHealth * 0.25) {
          store.getState().triggerDramaticMoment('Stay with me! We\'re not done!', RED);
        }
        // Boss low health dramatic moment
        const activeBoss = enemies.find(e => e.active && (e.type === 'boss' || e.type === 'bossRedKing' || e.type === 'bossTitan' || e.type === 'bossDragon' || e.type === 'bossPhoenix' || e.type === 'bossMechGolem' || e.type === 'bossCorrupted' || e.type === 'bossFather' || e.type === 'bossTwin') && e.health < e.maxHealth * 0.25);
        if (activeBoss) {
          store.getState().triggerDramaticMoment('FINISH HIM!', GOLD);
        }
      }

      // ====== UPDATE BULLETS ======
      for (const bullet of bullets) {
        if (!bullet.active) continue;
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        if (bullet.x < cameraXRef.current - 50 || bullet.x > cameraXRef.current + cw + 50 ||
            bullet.y < -50 || bullet.y > level.height + 50) {
          bullet.active = false;
          continue;
        }

        let hitPlatform = false;
        for (const plat of platforms) {
          const { px, py } = getPlatPos(plat);
          if (bullet.x + bullet.radius > px && bullet.x - bullet.radius < px + plat.width &&
              bullet.y + bullet.radius > py && bullet.y - bullet.radius < py + plat.height) {
            hitPlatform = true;
            break;
          }
        }
        if (hitPlatform) {
          bullet.active = false;
          spawnParticles(particles, bullet.x, bullet.y, 5, bullet.color);
          continue;
        }

        if (bullet.fromPlayer) {
          for (const enemy of enemies) {
            if (!enemy.active) continue;
            const eH = getEnemyHeight(enemy.type);
            if (aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                     bullet.radius * 2, bullet.radius * 2,
                     enemy.x, enemy.y - eH, enemy.width, eH)) {
              enemy.health -= bullet.damage;
              enemy.isHit = true;
              enemy.hitTimer = 5;
              bullet.active = false;
              spawnParticles(particles, bullet.x, bullet.y, 8, bullet.color);
              screenShakeRef.current = 3;
              const isBoss = enemy.type === 'boss' || enemy.type === 'bossRedKing' || enemy.type === 'bossTitan' || enemy.type === 'bossDragon' || enemy.type === 'bossPhoenix' || enemy.type === 'bossMechGolem' || enemy.type === 'bossCorrupted' || enemy.type === 'bossFather' || enemy.type === 'bossTwin';
              ensureSoundInit();
              soundEngine.playHit();
              if (enemy.health <= 0) {
                enemy.active = false;
                const killScore = enemy.type === 'boss' ? 500 : enemy.type === 'voidGuardian' ? 150 : 100;
                scoreRef.current += killScore;
                comboRef.current++;
                comboTimerRef.current = 120;
                if (comboRef.current > 2) scoreRef.current += comboRef.current * 10;
                // Boss death animation: massive particles, screen shake, and flash
                if (isBoss) {
                  spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 60, MAGENTA);
                  spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 40, RED);
                  spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 30, ORANGE);
                  spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 20, YELLOW);
                  screenShakeRef.current = 20; // Stronger shake for boss death
                  // Dramatic moment — show boss name
                  const bossName = enemy.bossName || 'BOSS';
                  showDramaticMoment(`${bossName} DEFEATED!`, GOLD);
                } else {
                  spawnParticles(particles, enemy.x + enemy.width / 2, enemy.y - 25, 15, ORANGE);
                  screenShakeRef.current = 5;
                }
                player.expression = 'victory';
                if (isBoss) {
                  soundEngine.stopBossMusic();
                  soundEngine.startMusic();
                  soundEngine.playExplosion();
                } else {
                  soundEngine.playEnemyDeath();
                }
                if (Math.random() < 0.25) {
                  showVoiceLine(randomVoiceLine('kill'), CYAN);
                }
              }
              break;
            }
          }
        } else {
          // Enemy bullet hits Player 1
          if (player.isShielding) {
            if (aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                 bullet.radius * 2, bullet.radius * 2,
                 player.x - 10, player.y - player.height - 10, player.width + 20, player.height + 20)) {
              bullet.active = false;
              spawnParticles(particles, bullet.x, bullet.y, 5, LIME);
            }
          } else if (player.invincible <= 0 &&
            aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                 bullet.radius * 2, bullet.radius * 2,
                 player.x, player.y - player.height, player.width, player.height)) {
            player.health -= Math.min(bullet.damage, 10); // Cap enemy bullet damage to player at 10
            player.invincible = INVINCIBLE_FRAMES;
            player.expression = 'hurt';
            bullet.active = false;
            spawnParticles(particles, bullet.x, bullet.y, 8, RED);
            screenShakeRef.current = 4;
            ensureSoundInit();
            soundEngine.playDamage();
            if (Math.random() < 0.3) {
              showVoiceLine(randomVoiceLine('damage'), RED);
            }
          }

          // Enemy bullet hits Player 2
          if (player2 && player2.health > 0 && bullet.active) {
            if (player2.isShielding) {
              if (aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                   bullet.radius * 2, bullet.radius * 2,
                   player2.x - 10, player2.y - player2.height - 10, player2.width + 20, player2.height + 20)) {
                bullet.active = false;
                spawnParticles(particles, bullet.x, bullet.y, 5, LIME);
              }
            } else if (player2.invincible <= 0 &&
              aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                   bullet.radius * 2, bullet.radius * 2,
                   player2.x, player2.y - player2.height, player2.width, player2.height)) {
              player2.health -= bullet.damage;
              player2.invincible = INVINCIBLE_FRAMES;
              player2.expression = 'hurt';
              bullet.active = false;
              spawnParticles(particles, bullet.x, bullet.y, 8, RED);
              screenShakeRef.current = 4;
              ensureSoundInit();
              soundEngine.playDamage();
            }
          }
        }

        // ====== VERSUS MODE: P1 vs P2 bullet collision ======
        if (isVersus && bullet.active && bullet.fromPlayer && bullet.fromPlayerId) {
          if (bullet.fromPlayerId === 1 && player2 && player2.health > 0) {
            // P1 bullet hits P2
            if (player2.isShielding) {
              if (aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                   bullet.radius * 2, bullet.radius * 2,
                   player2.x - 10, player2.y - player2.height - 10, player2.width + 20, player2.height + 20)) {
                bullet.active = false;
                spawnParticles(particles, bullet.x, bullet.y, 5, LIME);
                // Reflect damage back to P1
                if (player.invincible <= 0) {
                  player.health -= 3;
                  player.invincible = 20;
                }
              }
            } else if (player2.invincible <= 0 &&
              aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                   bullet.radius * 2, bullet.radius * 2,
                   player2.x, player2.y - player2.height, player2.width, player2.height)) {
              player2.health -= bullet.damage;
              player2.invincible = INVINCIBLE_FRAMES;
              player2.expression = 'hurt';
              bullet.active = false;
              spawnParticles(particles, bullet.x, bullet.y, 10, ORANGE);
              screenShakeRef.current = 5;
              ensureSoundInit();
              soundEngine.playDamage();
            }
          } else if (bullet.fromPlayerId === 2 && player.health > 0) {
            // P2 bullet hits P1
            if (player.isShielding) {
              if (aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                   bullet.radius * 2, bullet.radius * 2,
                   player.x - 10, player.y - player.height - 10, player.width + 20, player.height + 20)) {
                bullet.active = false;
                spawnParticles(particles, bullet.x, bullet.y, 5, LIME);
                // Reflect damage back to P2
                if (player2 && player2.invincible <= 0) {
                  player2.health -= 3;
                  player2.invincible = 20;
                }
              }
            } else if (player.invincible <= 0 &&
              aabb(bullet.x - bullet.radius, bullet.y - bullet.radius,
                   bullet.radius * 2, bullet.radius * 2,
                   player.x, player.y - player.height, player.width, player.height)) {
              player.health -= bullet.damage;
              player.invincible = INVINCIBLE_FRAMES;
              player.expression = 'hurt';
              bullet.active = false;
              spawnParticles(particles, bullet.x, bullet.y, 10, CYAN);
              screenShakeRef.current = 5;
              ensureSoundInit();
              soundEngine.playDamage();
            }
          }
        }
      }

      // Cap bullets and clean up dead enemies periodically
      bulletsRef.current = bullets.filter(b => b.active);
      if (bulletsRef.current.length > 100) {
        bulletsRef.current = bulletsRef.current.slice(-100);
      }
      // Clean up dead enemies every 120 frames to prevent array bloat
      // BUT only remove inactive enemies if the exit gate is already active
      // (dead wave enemies must stay in array until level completes for gate logic)
      if (frameCountRef.current % 120 === 0 && exitGateRef.current.active) {
        enemiesRef.current = enemiesRef.current.filter(e => e.active);
      }

      // ====== UPDATE PARTICLES ======
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
      }
      // Cap particles to prevent lag (keep max 200)
      const filteredParticles = particles.filter(p => p.life > 0);
      if (filteredParticles.length > 200) {
        filteredParticles.splice(0, filteredParticles.length - 200);
      }
      particlesRef.current = filteredParticles;

      // ====== UPDATE COINS ======
      for (const coin of coinsRef.current) {
        if (coin.collected) continue;
        coin.animFrame++;
        // Check AABB overlap with player
        const coinRadius = 10;
        if (aabb(player.x, player.y - player.height, player.width, player.height,
                 coin.x - coinRadius, coin.y - coinRadius, coinRadius * 2, coinRadius * 2)) {
          coin.collected = true;
          // Combo coin multiplier: higher combo = more coin value
          const comboMultiplier = 1 + comboRef.current * 0.1;
          const multipliedValue = Math.round(coin.value * comboMultiplier);
          coinsCollectedRef.current += Math.ceil(multipliedValue / 5);
          scoreRef.current += multipliedValue;
          // Gold particles (more particles with higher combo)
          spawnParticles(particles, coin.x, coin.y, 8 + Math.min(comboRef.current, 10), GOLD);
          ensureSoundInit();
          soundEngine.playCoinCollect();
        }
      }

      // ====== UPDATE CHESTS ======
      for (const chest of chestsRef.current) {
        if (chest.opened) continue;
        // Check AABB overlap with player
        if (aabb(player.x, player.y - player.height, player.width, player.height,
                 chest.x - 15, chest.y - 15, 30, 30)) {
          chest.opened = true;
          if (chest.reward === 'coins') {
            // Apply combo multiplier to chest coins too
            const comboMultiplier = 1 + comboRef.current * 0.1;
            const multipliedChestValue = Math.round(chest.value * comboMultiplier);
            scoreRef.current += multipliedChestValue;
            coinsCollectedRef.current += Math.ceil(multipliedChestValue / 5);
            spawnParticles(particles, chest.x, chest.y, 12, GOLD);
          } else if (chest.reward === 'skill') {
            // Chance to unlock a random skill
            const purchasableSkills = SKILL_DEFS.filter(s =>
              s.unlockMethod === 'purchase' && !store.getState().saveData.unlockedSkills.includes(s.id)
            );
            if (purchasableSkills.length > 0) {
              const randomSkill = purchasableSkills[Math.floor(Math.random() * purchasableSkills.length)];
              const saveData = store.getState().saveData;
              const updated = { ...saveData, unlockedSkills: [...saveData.unlockedSkills, randomSkill.id] };
              writeSave(updated);
              store.setState({ saveData: updated });
              showVoiceLine('SKILL UNLOCKED: ' + randomSkill.name + '!', randomSkill.color);
            } else {
              scoreRef.current += 50;
              spawnParticles(particles, chest.x, chest.y, 15, GOLD);
            }
          }
          spawnParticles(particles, chest.x, chest.y, 10, ORANGE);
          ensureSoundInit();
          soundEngine.playCoinCollect();
        }
      }

      // ====== UPDATE SKILL COOLDOWNS ======
      for (const ss of skillStatesRef.current) {
        if (ss.cooldownTimer > 0) ss.cooldownTimer--;
        if (ss.activeTimer > 0) {
          ss.activeTimer--;
          if (ss.activeTimer <= 0) ss.isActive = false;
        }
      }

      // Blood fury active effect: drain health but increase damage (handled via faster shooting)
      const bloodFuryState = skillStatesRef.current.find(s => s.id === 'bloodFury' && s.isActive);
      if (bloodFuryState) {
        player.shootCooldown = Math.max(0, player.shootCooldown - 2);
        if (frameCountRef.current % 30 === 0) {
          player.health = Math.max(1, player.health - 1);
        }
        if (frameCountRef.current % 3 === 0) {
          spawnParticles(particles, player.x + player.width / 2, player.y - 25, 1, '#ff0000');
        }
      }

      // ====== MID-LEVEL SURPRISE CHECK ======
      if (!surpriseTriggeredRef.current && enemiesRef.current.length > 0) {
        const totalEnemies = totalEnemiesRef.current;
        const killedCount = enemiesRef.current.filter(e => !e.active).length;
        // Random trigger between 40-70% kill progress for maximum shock value
        if (totalEnemies > 0) {
          // Use a seeded random based on level ID so it's consistent per level but varied between levels
          const triggerPct = 0.4 + (currentLevelId % 7) * 0.05; // ranges from 0.40 to 0.70
          if (killedCount >= totalEnemies * triggerPct) {
            const surprise = getSurpriseForLevel(currentLevelId);
            if (surprise) {
              surpriseRef.current = surprise;
              surpriseTimerRef.current = surprise.duration;
              surpriseTriggeredRef.current = true;
              // Spawn surprise enemies if any
              if (surprise.spawnEnemies && surprise.spawnEnemies.length > 0 && surprise.enemyCount) {
              for (let i = 0; i < surprise.enemyCount; i++) {
                const eType = surprise.spawnEnemies[i % surprise.spawnEnemies.length];
                const isBoss = eType === 'boss' || eType === 'bossRedKing' || eType === 'bossTitan' || eType === 'bossDragon' || eType === 'bossPhoenix' || eType === 'bossMechGolem' || eType === 'bossCorrupted' || eType === 'bossFather' || eType === 'bossTwin';
                const isGuardian = eType === 'voidGuardian';
                const isEliteDrone = eType === 'eliteDrone';
                const isHeavyWalker = eType === 'heavyWalker';
                const isDragon = eType === 'dragon';
                const isPhoenix = eType === 'phoenix';
                const isMechGolem = eType === 'mechGolem';
                const isShadowAssassin = eType === 'shadowAssassin';
                const bossHP = eType === 'bossTitan' ? 500 : eType === 'bossRedKing' ? 400 : eType === 'boss' ? 300 : eType === 'bossDragon' ? 600 : eType === 'bossPhoenix' ? 450 : eType === 'bossMechGolem' ? 550 : eType === 'bossCorrupted' ? 480 : eType === 'bossTwin' ? 700 : 150;
                let enemyWidth = 20;
                let enemyHeight = 50;
                let enemyHP = 20;
                if (isBoss) { enemyWidth = 60; enemyHeight = 80; enemyHP = bossHP; }
                else if (isGuardian) { enemyWidth = 30; enemyHeight = 30; enemyHP = 25; }
                else if (isEliteDrone) { enemyWidth = 20; enemyHeight = 50; enemyHP = 30; }
                else if (isHeavyWalker) { enemyWidth = 25; enemyHeight = 55; enemyHP = 40; }
                else if (isDragon) { enemyWidth = 35; enemyHeight = 40; enemyHP = 45; }
                else if (isPhoenix) { enemyWidth = 25; enemyHeight = 40; enemyHP = 35; }
                else if (isMechGolem) { enemyWidth = 30; enemyHeight = 55; enemyHP = 60; }
                else if (isShadowAssassin) { enemyWidth = 18; enemyHeight = 50; enemyHP = 25; }
                else if (eType === 'drone') { enemyHP = 20; }
                else if (eType === 'glitchWalker') { enemyHP = 25; }
                // Flying enemy types
                else if (eType === 'voidBat') { enemyWidth = 16; enemyHeight = 30; enemyHP = 15; }
                else if (eType === 'stormEagle') { enemyWidth = 24; enemyHeight = 45; enemyHP = 30; }
                else if (eType === 'emberWisp') { enemyWidth = 16; enemyHeight = 30; enemyHP = 18; }
                else if (eType === 'frostWraith') { enemyWidth = 22; enemyHeight = 45; enemyHP = 35; }
                else if (eType === 'shadowDrake') { enemyWidth = 30; enemyHeight = 55; enemyHP = 40; }
                else if (eType === 'plasmaSerpent') { enemyWidth = 26; enemyHeight = 50; enemyHP = 35; }
                else if (eType === 'neonWyrm') { enemyWidth = 32; enemyHeight = 60; enemyHP = 50; }
                else if (eType === 'crystalMoth') { enemyWidth = 18; enemyHeight = 35; enemyHP = 20; }
                // New difficulty-scaling enemy types
                else if (eType === 'zombie') { enemyWidth = 22; enemyHeight = 55; enemyHP = 55; }
                else if (eType === 'giant') { enemyWidth = 55; enemyHeight = 80; enemyHP = 150; }
                else if (eType === 'necromancer') { enemyWidth = 20; enemyHeight = 50; enemyHP = 40; }
                else if (eType === 'bomber') { enemyWidth = 18; enemyHeight = 45; enemyHP = 25; }
                // Spawn at right edge of camera view (or level end), offset per enemy
                const spawnX = Math.min(
                  player.x + player.facing * (cw * 0.4) + i * 60,
                  level.width - 40
                );
                const spawnIsFlying = isFlyingEnemy(eType) || eType === 'necromancer';
                enemiesRef.current.push({
                  x: Math.max(40, spawnX),
                  y: spawnIsFlying ? 200 + Math.floor(Math.random() * 150) : 480,
                  width: enemyWidth,
                  height: enemyHeight,
                  vx: 0, vy: 0,
                  type: eType,
                  health: enemyHP,
                  maxHealth: enemyHP,
                  facing: -1 as const,
                  shootCooldown: ENEMY_SHOOT_COOLDOWN + Math.floor(Math.random() * 30),
                  animFrame: i * 10,
                  animTimer: 0,
                  active: true,
                  grounded: !spawnIsFlying,
                  patternTimer: 0,
                  invincible: 0,
                  isHit: false,
                  hitTimer: 0,
                  bossName: isBoss ? 'SURPRISE BOSS' : undefined,
                  bossColor: isBoss ? surprise.color : undefined,
                });
              }
              // Update total enemies count to include surprise enemies
              totalEnemiesRef.current += surprise.enemyCount;
              // Add screen shake for dramatic effect
              screenShakeRef.current = 8;
            }
            // Play dramatic sound
            ensureSoundInit();
            soundEngine.playAbilityReady();
          }
        }
      }
      }

      // ====== UPDATE EXIT GATE ======
      const exitGate = exitGateRef.current;
      const currentState = store.getState();
      // Check if all waves have been cleared (all activated wave enemies dead, all waves spawned, spawn queue empty)
      // Ambient/patrol enemies are ignored — they don't block the exit gate
      // Use totalWaveEnemiesSpawnedRef to track if any wave enemies were ever spawned
      // (prevents bug where dead enemies removed from array cause gate to never open)
      const allWavesSpawned = currentState.currentWave >= currentState.totalWaves - 1;
      const totalSpawned = totalWaveEnemiesSpawnedRef.current;
      const aliveWaveEnemies = enemiesRef.current.filter(e => !e.isAmbient && e.active);
      const allWaveEnemiesCleared = totalSpawned > 0 && aliveWaveEnemies.length === 0;
      const spawnQueueEmpty = spawnQueueRef.current.length === 0;
      if (allWavesSpawned && allWaveEnemiesCleared && waveSpawnedRef.current && spawnQueueEmpty && !exitGate.active) {
        exitGate.active = true;
        showVoiceLine('EXIT OPEN! Reach the gate!', LIME);
      }

      // Check player reaching exit gate
      if (exitGate.active) {
        const gateRadius = 25;
        if (aabb(player.x, player.y - player.height, player.width, player.height,
                 exitGate.x - gateRadius, exitGate.y - 60, gateRadius * 2, 60)) {
          // Player reached the exit!
          scoreRef.current += 200;
          // Calculate star rating and store stats
          const healthPct = Math.round(Math.max(0, player.health) / player.maxHealth * 100);
          const kills = player.kills;
          const totalEnemies = totalEnemiesRef.current;
          const maxCombo = maxComboRef.current;
          const coinsEarned = Math.floor(scoreRef.current / 5);
          // Star calculation
          let stars = 1;
          if (healthPct > 40 || kills >= totalEnemies * 0.5) stars = 2;
          if (healthPct > 70 && kills >= totalEnemies * 0.8) stars = 3;
          // Store stats in the store for LevelCompleteScreen
          store.setState({
            lastLevelStars: stars,
            lastLevelKills: kills,
            lastLevelMaxCombo: maxCombo,
            lastLevelCoinsEarned: coinsEarned,
            lastLevelHealthPct: healthPct,
            lastLevelTotalEnemies: totalEnemies,
          });
          store.getState().completeLevel(scoreRef.current);
          return;
        }
      }

      // ====== TRACK MAX COMBO ======
      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current;
      }

      // ====== CHECK WAVE CLEAR ======
      // Only check wave-spawned enemies (ignore ambient/patrol enemies)
      // Use totalWaveEnemiesSpawnedRef to check if wave enemies existed, even if removed
      const aliveWaveEnemiesForClear = enemiesRef.current.filter(e => !e.isAmbient && e.active);
      const waveAllEnemiesDead = totalWaveEnemiesSpawnedRef.current > 0 && aliveWaveEnemiesForClear.length === 0 && spawnQueueRef.current.length === 0;
      if (waveAllEnemiesDead && waveSpawnedRef.current) {
        if (Math.random() < 0.5) {
          showVoiceLine(randomVoiceLine('waveClear'), LIME);
        }
        ensureSoundInit();
        soundEngine.playWaveComplete();
        waveSpawnedRef.current = false;
        // Don't auto-complete level - wait for exit gate or more waves
        const currentState2 = store.getState();
        if (currentState2.currentWave < currentState2.totalWaves - 1) {
          store.getState().advanceWave();
        }
        // If this was the last wave, the exit gate system will handle completion
      }

      // ====== AMBIENT / PATROL ENEMIES ======
      // Spawn weaker enemies on the ground between waves to keep action going
      // These are "patrol" enemies that appear ahead of the player as they travel
      // Only spawn during active gameplay (not after all waves are cleared)
      const allWavesDone = store.getState().currentWave >= store.getState().totalWaves - 1 && waveSpawnedRef.current;
      if (gameMode === 'single' && !allWavesDone) {
        ambientSpawnTimerRef.current--;
        if (ambientSpawnTimerRef.current <= 0) {
          const currentLevel = store.getState().currentLevel;
          const activeEnemyCount = enemiesRef.current.filter(e => e.active).length;
          // Max ambient enemies scales with level: 2 early, up to 6 at high levels
          const maxAmbient = Math.min(2 + Math.floor(currentLevel / 25), 6);
          // Only spawn if below the ambient cap and player is alive and moving
          if (activeEnemyCount < maxAmbient && player.health > 0) {
            // Spawn ahead of the player (in the direction they're facing)
            const spawnAhead = 300 + Math.random() * 400;
            const spawnX = player.x + player.facing * spawnAhead;
            // Only spawn if within level bounds and not too close to exit gate
            const exitGate = exitGateRef.current;
            const nearExit = exitGate.active && Math.abs(spawnX - exitGate.x) < 200;
            const inBounds = spawnX > 100 && spawnX < (levelRef.current?.width || 9999) - 200;
            if (inBounds && !nearExit) {
              // Choose weaker enemy types for ambient patrols
              const ambientTypes: EnemyType[] = ['drone', 'glitchWalker'];
              if (currentLevel >= 10) ambientTypes.push('eliteDrone', 'shadowAssassin');
              if (currentLevel >= 20) ambientTypes.push('zombie', 'voidBat');
              if (currentLevel >= 40) ambientTypes.push('bomber', 'necromancer');
              const ambientType = ambientTypes[Math.floor(Math.random() * ambientTypes.length)];
              const isFlying = isFlyingEnemy(ambientType);
              const ambientHP = Math.floor(
                (ambientType === 'zombie' ? 55 : ambientType === 'bomber' ? 25 : ambientType === 'necromancer' ? 40 : ambientType === 'shadowAssassin' ? 25 : ambientType === 'eliteDrone' ? 30 : 20)
                * (1 + currentLevel * 0.1)
              );
              const speedMult = Math.min(1 + currentLevel / 250, 2.5);
              enemiesRef.current.push({
                x: spawnX,
                y: isFlying ? 150 + Math.random() * 200 : 480,
                width: ambientType === 'zombie' ? 22 : ambientType === 'bomber' ? 18 : 20,
                height: ambientType === 'zombie' ? 55 : ambientType === 'bomber' ? 45 : 50,
                vx: 0, vy: 0,
                type: ambientType,
                health: ambientHP,
                maxHealth: ambientHP,
                facing: (player.facing * -1) as 1 | -1, // Face toward player
                shootCooldown: Math.floor((ENEMY_SHOOT_COOLDOWN + Math.floor(Math.random() * 30)) / speedMult),
                animFrame: 0,
                animTimer: 0,
                active: true,
                grounded: !isFlying,
                patternTimer: 0,
                invincible: 0,
                isHit: false,
                hitTimer: 0,
                isAmbient: true,
              });
              ambientSpawnCountRef.current++;
            }
          }
          // Cooldown between ambient spawns: shorter at higher levels (more action)
          const baseCd = currentLevel <= 10 ? 200 : currentLevel <= 30 ? 150 : currentLevel <= 60 ? 100 : 70;
          ambientSpawnTimerRef.current = baseCd + Math.floor(Math.random() * 60);
        }
      }

      // ====== CHECK PLAYER DEATH ======
      const p1Dead = player.health <= 0;
      const p2Dead = !player2 || player2.health <= 0;

      // Versus mode: whoever kills the other first wins — simultaneous death = draw
      if (isVersus) {
        // Only trigger if at least one player just died
        if (p1Dead || p2Dead) {
          const spawnVictoryParticles = (winnerColor: string) => {
            const p = playerRef.current;
            if (!p) return;
            for (let i = 0; i < 40; i++) {
              const angle = (Math.PI * 2 * i) / 40;
              const speed = 2 + Math.random() * 4;
              particlesRef.current.push({
                x: p.x + p.width / 2,
                y: p.y + p.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 80 + Math.random() * 40,
                maxLife: 120,
                color: winnerColor,
                size: 2 + Math.random() * 3,
                type: 'spark',
              });
            }
            // Big ring particles
            for (let i = 0; i < 20; i++) {
              const angle = (Math.PI * 2 * i) / 20;
              particlesRef.current.push({
                x: p.x + p.width / 2 + Math.cos(angle) * 60,
                y: p.y + p.height / 2 + Math.sin(angle) * 60,
                vx: Math.cos(angle) * 0.5,
                vy: Math.sin(angle) * 0.5 - 1,
                life: 50 + Math.random() * 30,
                maxLife: 80,
                color: '#ffd700',
                size: 4 + Math.random() * 2,
                type: 'spark',
              });
            }
          };

          ensureSoundInit();
          soundEngine.stopAll();

          if (p1Dead && !p2Dead) {
            // P2 killed P1 — VICTORY TO ORANGE!
            spawnVictoryParticles(ORANGE);
            store.getState().versusRoundWin(2);
            return;
          } else if (p2Dead && !p1Dead) {
            // P1 killed P2 — VICTORY TO BLUE!
            spawnVictoryParticles(CYAN);
            store.getState().versusRoundWin(1);
            return;
          } else if (p1Dead && p2Dead) {
            // Both died same frame — extremely rare, it's a DRAW/TIE
            spawnVictoryParticles('#ffd700');
            store.getState().versusRoundWin(3); // 3 = draw
            return;
          }
        }
      } else {
        // In co-op, game over only if both players are dead
        if (p1Dead && p2Dead) {
          ensureSoundInit();
          soundEngine.playGameOver();
          store.getState().gameOver();
          return;
        }
        // In single player, game over if P1 dies
        if (!player2 && p1Dead) {
          ensureSoundInit();
          soundEngine.playGameOver();
          store.getState().gameOver();
          return;
        }
      }

      // ====== UPDATE CAMERA ======
      // Follow midpoint of alive players
      let targetX: number;
      if (player2 && player2.health > 0 && !p1Dead) {
        targetX = (player.x + player2.x) / 2 - cw / 2 + player.width / 2;
      } else if (player2 && player2.health > 0 && p1Dead) {
        targetX = player2.x - cw / 2 + player2.width / 2;
      } else {
        targetX = player.x - cw / 2 + player.width / 2;
      }
      cameraXRef.current += (targetX - cameraXRef.current) * 0.1;
      cameraXRef.current = Math.max(0, Math.min(cameraXRef.current, level.width - cw));
    };

    // ====== GAME RENDERING ======
    const renderGameWorld = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      const level = levelRef.current;
      const player = playerRef.current;
      const player2 = player2Ref.current;
      if (!level || !player) return;

      const camX = cameraXRef.current;

      drawBackground(ctx, cw, ch, camX, level, bgStarsRef.current, frameCountRef.current, currentSeasonRef.current ?? undefined);

      // Platforms
      for (const plat of platformsRef.current) {
        const { px, py } = getPlatPos(plat);
        const sx = px - camX;
        if (sx + plat.width < -50 || sx > cw + 50) continue;
        drawPlatform(ctx, sx, py, plat.width, plat.height, level.background);
      }

      // Enemies
      for (const enemy of enemiesRef.current) {
        if (!enemy.active) continue;
        const esx = enemy.x - camX;
        if (esx < -100 || esx > cw + 100) continue;

        if (enemy.type === 'boss' || enemy.type === 'bossRedKing' || enemy.type === 'bossTitan' || enemy.type === 'bossDragon' || enemy.type === 'bossPhoenix' || enemy.type === 'bossMechGolem' || enemy.type === 'bossCorrupted' || enemy.type === 'bossFather' || enemy.type === 'bossTwin') {
          const bossColor = enemy.bossColor || (enemy.type === 'bossFather' ? CYAN : enemy.type === 'bossTwin' ? BLUE : level.id === 3 ? MAGENTA : PURPLE);
          drawBoss(ctx, esx + enemy.width / 2, enemy.y, enemy.facing, bossColor, enemy.animFrame, enemy.health, enemy.maxHealth);
          if (enemy.bossName) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.shadowBlur = 10; ctx.shadowColor = bossColor;
            ctx.fillStyle = bossColor;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(enemy.bossName, esx + enemy.width / 2, enemy.y - 90);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            ctx.restore();
          }
        } else {
          drawEnemy(ctx, esx + enemy.width / 2, enemy.y, enemy.type, enemy.facing, enemy.animFrame, enemy.grounded);
        }

        if (enemy.isHit) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ffffff';
          const eH = getEnemyHeight(enemy.type);
          ctx.fillRect(esx, enemy.y - eH, enemy.width, eH);
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // Player 1
      const px = player.x - camX + player.width / 2;
      const py = player.y;
      const playerColor = player.skinColor || CYAN;
      const playerVisible = player.invincible <= 0 || frameCountRef.current % 4 < 2;
      if (playerVisible && player.health > 0) {
        drawNeonStickman(ctx, px, py, player.facing, playerColor, player.animFrame,
          player.isShooting, player.grounded, 1, player.expression, player.isMoving, false, player.vx);
      }

      // Player 2 (Co-op)
      if (player2 && player2.health > 0) {
        const p2x = player2.x - camX + player2.width / 2;
        const p2y = player2.y;
        const p2Visible = player2.invincible <= 0 || frameCountRef.current % 4 < 2;
        if (p2Visible) {
          drawNeonStickman(ctx, p2x, p2y, player2.facing, player2.skinColor, player2.animFrame,
            player2.isShooting, player2.grounded, 1, player2.expression, player2.isMoving, false, player2.vx);
        }
        // P2 label
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.shadowBlur = 5; ctx.shadowColor = ORANGE;
        ctx.fillStyle = ORANGE;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('P2', p2x, player2.y - 55);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.restore();

        // P2 HP bar
        const p2Pct = Math.max(0, player2.health / player2.maxHealth);
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#1a0a00';
        ctx.fillRect(p2x - 15, player2.y - 60, 30, 4);
        ctx.fillStyle = ORANGE;
        ctx.shadowBlur = 3; ctx.shadowColor = ORANGE;
        ctx.fillRect(p2x - 15, player2.y - 60, 30 * p2Pct, 4);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Gang members
      for (const gang of gangRef.current) {
        if (!gang.active) continue;
        const gx = gang.x - camX;
        if (gx < -50 || gx > cw + 50) continue;
        drawNeonStickman(ctx, gx, gang.y, gang.facing, gang.color, gang.animFrame,
          gang.shootCooldown > 10, gang.grounded, 0.85, gang.expression, true);
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.shadowBlur = 5; ctx.shadowColor = gang.color;
        ctx.fillStyle = gang.color;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(gang.name, gx, gang.y - 55);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Pet
      const pet = petRef.current;
      if (pet && pet.active) {
        const petX = pet.x - camX;
        if (petX > -50 && petX < cw + 50) {
          drawPet(ctx, petX, pet.y, pet.type, pet.skinColor, pet.animFrame, pet.facing);
          // Pet health bar
          ctx.save();
          ctx.globalAlpha = 0.7;
          const petPct = Math.max(0, pet.health / pet.maxHealth);
          ctx.fillStyle = '#001a00';
          ctx.fillRect(petX - 12, pet.y - 30, 24, 3);
          ctx.fillStyle = petPct > 0.5 ? LIME : petPct > 0.25 ? ORANGE : RED;
          ctx.shadowBlur = 3; ctx.shadowColor = ctx.fillStyle;
          ctx.fillRect(petX - 12, pet.y - 30, 24 * petPct, 3);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // Coins
      for (const coin of coinsRef.current) {
        if (coin.collected) continue;
        const csx = coin.x - camX;
        if (csx < -20 || csx > cw + 20) continue;
        const bob = Math.sin(coin.animFrame * 0.06) * 4;
        const sparkle = Math.sin(coin.animFrame * 0.12) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = sparkle;
        ctx.shadowBlur = 12;
        ctx.shadowColor = GOLD;
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(csx, coin.y + bob, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(csx, coin.y + bob, 5, 0, Math.PI * 2);
        ctx.stroke();
        // Sparkle effect
        ctx.globalAlpha = sparkle * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(csx + 3, coin.y + bob - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Chests
      for (const chest of chestsRef.current) {
        if (chest.opened) continue;
        const csx = chest.x - camX;
        if (csx < -30 || csx > cw + 30) continue;
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = chest.reward === 'skill' ? PURPLE : GOLD;
        ctx.strokeStyle = chest.reward === 'skill' ? PURPLE : GOLD;
        ctx.lineWidth = 2;
        // Draw chest as a box
        ctx.strokeRect(csx - 12, chest.y - 12, 24, 20);
        // Lid
        ctx.beginPath();
        ctx.moveTo(csx - 14, chest.y - 12);
        ctx.lineTo(csx, chest.y - 20);
        ctx.lineTo(csx + 14, chest.y - 12);
        ctx.stroke();
        // Lock
        ctx.fillStyle = chest.reward === 'skill' ? MAGENTA : '#ffd700';
        ctx.beginPath();
        ctx.arc(csx, chest.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Exit gate
      const exitGate = exitGateRef.current;
      if (exitGate.active) {
        const gsx = exitGate.x - camX;
        drawExitPortal(ctx, gsx, exitGate.y - 30, frameCountRef.current);
      } else {
        // Show arrow pointing right with "CLEAR ALL ENEMIES" when gate not active
        const gsx = exitGate.x - camX;
        if (gsx > -100 && gsx < cw + 100) {
          const bounce = Math.sin(frameCountRef.current * 0.06) * 5;
          ctx.save();
          ctx.globalAlpha = 0.4 + Math.sin(frameCountRef.current * 0.04) * 0.2;
          ctx.shadowBlur = 8;
          ctx.shadowColor = RED;
          ctx.fillStyle = RED;
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('CLEAR ALL', gsx, exitGate.y - 65 + bounce);
          ctx.fillText('ENEMIES', gsx, exitGate.y - 53 + bounce);
          // Arrow
          ctx.beginPath();
          ctx.moveTo(gsx + 10, exitGate.y - 40 + bounce);
          ctx.lineTo(gsx - 5, exitGate.y - 46 + bounce);
          ctx.lineTo(gsx - 5, exitGate.y - 34 + bounce);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // Shield visual (P1)
      if (player.isShielding) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(frameCountRef.current * 0.1) * 0.15;
        ctx.shadowBlur = 20;
        ctx.shadowColor = LIME;
        ctx.strokeStyle = LIME;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py - 25, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = LIME;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Shield visual (P2)
      if (player2 && player2.isShielding) {
        const p2sx = player2.x - camX + player2.width / 2;
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(frameCountRef.current * 0.1) * 0.15;
        ctx.shadowBlur = 20;
        ctx.shadowColor = ORANGE;
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p2sx, player2.y - 25, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = ORANGE;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Dash trail (P1)
      if (player.isDashing) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
          const trailX = -player.facing * i * 12;
          ctx.globalAlpha = 0.3 - i * 0.08;
          ctx.beginPath();
          ctx.moveTo(px + trailX, -38);
          ctx.lineTo(px + trailX + player.facing * 2, -29);
          ctx.lineTo(px + trailX, -10);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Dash trail (P2)
      if (player2 && player2.isDashing) {
        const p2dx = player2.x - camX + player2.width / 2;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
          const trailX = -player2.facing * i * 12;
          ctx.globalAlpha = 0.3 - i * 0.08;
          ctx.beginPath();
          ctx.moveTo(p2dx + trailX, -38);
          ctx.lineTo(p2dx + trailX + player2.facing * 2, -29);
          ctx.lineTo(p2dx + trailX, -10);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Bullets
      for (const bullet of bulletsRef.current) {
        if (!bullet.active) continue;
        const bx = bullet.x - camX;
        if (bx < -20 || bx > cw + 20) continue;
        drawBullet(ctx, bx, bullet.y, bullet.radius, bullet.color);
      }

      // Particles
      for (const p of particlesRef.current) {
        const ppx = p.x - camX;
        if (ppx < -20 || ppx > cw + 20) continue;
        drawParticle(ctx, ppx, p.y, p.size * (p.life / p.maxLife), p.color, p.life / p.maxLife);
      }
    };

    // ====== HUD RENDERING (real pixel coordinates) ======
    const renderGameHUD = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      const player = playerRef.current;
      const player2 = player2Ref.current;
      const level = levelRef.current;
      if (!player || !level) return;
      const isVersus = store.getState().gameMode === 'versus';

      // HUD - Health bar (P1)
      ctx.save();
      ctx.globalAlpha = 0.9;
      const hbX = 16;
      const hbY = 16;
      const hbW = Math.min(180, cw * 0.25);
      const hbH = 12;
      ctx.fillStyle = '#001a00';
      ctx.fillRect(hbX, hbY, hbW, hbH);
      ctx.strokeStyle = LIME;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 5;
      ctx.shadowColor = LIME;
      ctx.strokeRect(hbX, hbY, hbW, hbH);
      const pct = Math.max(0, player.health / player.maxHealth);
      const hColor = pct > 0.5 ? LIME : pct > 0.25 ? ORANGE : RED;
      ctx.fillStyle = hColor;
      ctx.shadowColor = hColor;
      ctx.shadowBlur = 8;
      ctx.fillRect(hbX + 1, hbY + 1, (hbW - 2) * pct, hbH - 2);
      ctx.shadowColor = LIME;
      ctx.shadowBlur = 5;
      ctx.fillStyle = LIME;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('P1 HP', hbX, hbY - 4);

      // P2 Health bar
      if (player2) {
        const p2hbY = hbY + hbH + 10;
        ctx.fillStyle = '#1a0a00';
        ctx.fillRect(hbX, p2hbY, hbW, hbH);
        ctx.strokeStyle = ORANGE;
        ctx.shadowColor = ORANGE;
        ctx.strokeRect(hbX, p2hbY, hbW, hbH);
        const p2pct = Math.max(0, player2.health / player2.maxHealth);
        ctx.fillStyle = p2pct > 0.5 ? ORANGE : p2pct > 0.25 ? YELLOW : RED;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(hbX + 1, p2hbY + 1, (hbW - 2) * p2pct, hbH - 2);
        ctx.fillStyle = ORANGE;
        ctx.shadowColor = ORANGE;
        ctx.font = 'bold 10px monospace';
        ctx.fillText('P2 HP', hbX, p2hbY - 4);
      }

      // Level name
      const levelData = LEVELS.find(l => l.id === level.id);
      if (levelData) {
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 5;
        ctx.fillStyle = CYAN;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(levelData.chapter, cw / 2, hbY + 4);
        ctx.font = 'bold 12px monospace';
        ctx.fillText(levelData.name, cw / 2, hbY + 18);

        const state = store.getState();
        ctx.font = '9px monospace';
        ctx.fillStyle = YELLOW;
        ctx.shadowColor = YELLOW;
        ctx.shadowBlur = 3;
        ctx.fillText(`WAVE ${state.currentWave + 1}/${state.totalWaves}`, cw / 2, hbY + 32);
      }

      // Coins collected counter in HUD
      if (coinsCollectedRef.current > 0) {
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 5;
        ctx.fillStyle = GOLD;
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`🪙 ${coinsCollectedRef.current}`, cw - 16, hbY + 46);
      }

      // Score
      ctx.shadowColor = ORANGE;
      ctx.shadowBlur = 5;
      ctx.fillStyle = ORANGE;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('SCORE', cw - 16, hbY + 4);
      ctx.font = 'bold 12px monospace';
      ctx.fillText(String(scoreRef.current), cw - 16, hbY + 18);

      // Co-op / Versus indicator
      if (player2) {
        ctx.font = '9px monospace';
        if (isVersus) {
          ctx.fillStyle = RED;
          ctx.shadowColor = RED;
          const versusState = store.getState();
          ctx.fillText(`VS R${versusState.versusCurrentRound}`, cw - 16, hbY + 32);
          // Show round wins
          ctx.font = '8px monospace';
          ctx.fillStyle = CYAN;
          ctx.fillText(`P1:${versusState.versusP1Wins}`, cw - 46, hbY + 44);
          ctx.fillStyle = ORANGE;
          ctx.fillText(`P2:${versusState.versusP2Wins}`, cw - 16, hbY + 44);
        } else {
          ctx.fillStyle = ORANGE;
          ctx.shadowColor = ORANGE;
          ctx.fillText('CO-OP', cw - 16, hbY + 32);
        }
      }

      // ====== BOSS HEALTH BAR (prominent at top center) ======
      const enemies = enemiesRef.current;
      const activeBoss = enemies.find(e =>
        e.active && (
          e.type === 'boss' || e.type === 'bossRedKing' || e.type === 'bossTitan' ||
          e.type === 'bossDragon' || e.type === 'bossPhoenix' || e.type === 'bossMechGolem' ||
          e.type === 'bossCorrupted' || e.type === 'bossFather' || e.type === 'bossTwin'
        )
      );

      if (activeBoss) {
        const bossBarW = Math.min(300, cw * 0.5);
        const bossBarH = 16;
        const bossBarX = (cw - bossBarW) / 2;
        const bossBarY = ch - bossBarH - 12; // Bottom of screen, above touch controls

        // Boss name label (above health bar)
        const bossName = activeBoss.bossName || 'BOSS';
        const bossColor = activeBoss.bossColor || RED;
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bossColor;
        ctx.fillStyle = bossColor;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bossName, cw / 2, bossBarY - 6);

        // Background
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#1a0000';
        ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);

        // Health fill
        const bossPct = Math.max(0, activeBoss.health / activeBoss.maxHealth);
        const bossHColor = bossPct > 0.5 ? RED : bossPct > 0.25 ? ORANGE : YELLOW;
        const bossBarGrad = ctx.createLinearGradient(bossBarX, bossBarY, bossBarX + bossBarW * bossPct, bossBarY);
        bossBarGrad.addColorStop(0, bossHColor);
        bossBarGrad.addColorStop(1, RED);
        ctx.fillStyle = bossBarGrad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bossHColor;
        ctx.fillRect(bossBarX + 1, bossBarY + 1, (bossBarW - 2) * bossPct, bossBarH - 2);

        // Segmented tick marks
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        for (let i = 1; i < 10; i++) {
          const tickX = bossBarX + (bossBarW / 10) * i;
          ctx.beginPath(); ctx.moveTo(tickX, bossBarY); ctx.lineTo(tickX, bossBarY + bossBarH); ctx.stroke();
        }

        // Neon border
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = bossColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = bossColor;
        ctx.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);

        // Enrage indicator
        if (activeBoss.enraged) {
          const enrageFlash = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
          ctx.globalAlpha = enrageFlash;
          ctx.fillStyle = '#ff0000';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff0000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚠ ENRAGED ⚠', cw / 2, bossBarY + bossBarH + 14);
        }

        // Boss HP percentage text
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.shadowBlur = 0;
        ctx.fillText(`${Math.ceil(bossPct * 100)}%`, bossBarX + bossBarW / 2, bossBarY + bossBarH - 3);
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();

      // Wave progress arrow — also serves as portal direction indicator
      const exitGate = exitGateRef.current;
      const portalDist = exitGate.x - player.x;
      const arrowX = cw - 40;
      const arrowY = ch / 2;
      const bounce = Math.sin(frameCountRef.current * 0.08) * 5;
      ctx.save();
      // If portal is far away, show a stronger directional arrow
      if (portalDist > 400 && !isVersus) {
        ctx.globalAlpha = 0.6 + Math.sin(frameCountRef.current * 0.06) * 0.3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = exitGate.active ? LIME : YELLOW;
        ctx.fillStyle = exitGate.active ? LIME : YELLOW;
        // Arrow pointing right toward portal
        ctx.beginPath();
        ctx.moveTo(arrowX + 15, arrowY + bounce);
        ctx.lineTo(arrowX - 8, arrowY - 10 + bounce);
        ctx.lineTo(arrowX - 8, arrowY + 10 + bounce);
        ctx.closePath();
        ctx.fill();
        // Distance text
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(portalDist / 100)}m`, arrowX + 3, arrowY + 22 + bounce);
      } else {
        ctx.globalAlpha = 0.4 + Math.sin(frameCountRef.current * 0.06) * 0.2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = LIME;
        ctx.fillStyle = LIME;
        ctx.beginPath();
        ctx.moveTo(arrowX + 12, arrowY + bounce);
        ctx.lineTo(arrowX - 6, arrowY - 8 + bounce);
        ctx.lineTo(arrowX - 6, arrowY + 8 + bounce);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', resize);
      }
      unsub();
    };
  }, [store, initLevel, initStars, initMenuParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
});

export default GameCanvas;
