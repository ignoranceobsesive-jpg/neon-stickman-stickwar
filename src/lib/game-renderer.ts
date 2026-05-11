// ====== NEON STICKMAN: THE GRID AWAKENS — RENDERER ======
// All canvas drawing functions — Spark has PERSONALITY now

import {
  CYAN, MAGENTA, LIME, ORANGE, YELLOW, PURPLE, RED, DARK_BG,
  type SparkExpression, type PetType, type SeasonVisuals,
} from './game-types';

// ====== SPARK — THE MAIN CHARACTER ======
export function drawNeonStickman(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number, color: string,
  animFrame: number, isShooting: boolean, isGrounded: boolean,
  scale: number = 1,
  expression: SparkExpression = 'neutral',
  isMoving: boolean = false,
  isDying: boolean = false,
  velocityX: number = 0,
) {
  const s = scale;
  const isRunning = Math.abs(velocityX) > 6; // Running = fast movement
  const speedFactor = Math.min(Math.abs(velocityX) / 10, 1.5); // 0 to 1.5 based on speed
  const walkCycleSpeed = isRunning ? 0.45 : 0.3; // Faster cycle when running

  if (isDying) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.3 + Math.sin(animFrame * 0.1) * 0.2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * s;
    const scatter = animFrame * 0.5;
    ctx.beginPath();
    ctx.arc(Math.sin(animFrame * 0.3) * scatter, -38 * s + Math.cos(animFrame * 0.2) * scatter, 8 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.sin(animFrame * 0.4) * scatter * 0.5, -30 * s);
    ctx.lineTo(Math.cos(animFrame * 0.3) * scatter * 0.5, -10 * s);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;

  // ---- HEAD BOB — follows walking rhythm ----
  const headBob = isMoving && isGrounded
    ? Math.abs(Math.sin(animFrame * walkCycleSpeed)) * 3 * s * speedFactor
    : Math.sin(animFrame * 0.06) * 1 * s; // subtle idle bob

  // ---- HEAD ----
  ctx.beginPath();
  ctx.arc(0, -38 * s - headBob, 9 * s, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * s;
  ctx.globalAlpha = 1;
  ctx.stroke();

  // ---- EXPRESSIONS (the personality!) ----
  drawExpression(ctx, facing, s, color, expression, animFrame);

  // ---- BODY LEAN — more lean when running, subtle when walking ----
  const bodyLean = isMoving
    ? facing * (isRunning ? 5 * s : 2 * s) * Math.min(speedFactor + 0.5, 1.2)
    : 0;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(bodyLean, -29 * s - headBob * 0.5);
  ctx.lineTo(0, -10 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(bodyLean, -29 * s - headBob * 0.5);
  ctx.lineTo(0, -10 * s);
  ctx.stroke();

  // ---- CHEST GLOW (energy core) ----
  ctx.globalAlpha = 0.4 + Math.sin(animFrame * 0.08) * 0.2;
  ctx.fillStyle = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(bodyLean * 0.5, -22 * s - headBob * 0.3, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ---- ARMS ----
  const armY = -25 * s - headBob * 0.5;

  if (isShooting) {
    // ---- SHOOTING ANIMATION ----
    // Recoil: slight push back effect
    const recoilOffset = Math.sin(animFrame * 0.8) * 3 * s; // Quick recoil bounce

    // Back arm pulled back (recoil feel)
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(bodyLean - recoilOffset * 0.3, armY);
    ctx.lineTo(-facing * (15 * s), armY + 5 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(bodyLean - recoilOffset * 0.3, armY);
    ctx.lineTo(-facing * (15 * s), armY + 5 * s);
    ctx.stroke();

    // Front arm extended toward facing direction with recoil
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(bodyLean - recoilOffset * 0.3, armY);
    ctx.lineTo(facing * (25 * s) - recoilOffset * facing * 0.5, armY - 3 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(bodyLean - recoilOffset * 0.3, armY);
    ctx.lineTo(facing * (25 * s) - recoilOffset * facing * 0.5, armY - 3 * s);
    ctx.stroke();

    // Muzzle flash — bright white core
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(facing * 28 * s, armY - 3 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle flash — color glow
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(facing * 28 * s, armY - 3 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle flash particles — small sparks
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const sparkAngle = (facing > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.2;
      const sparkDist = 10 + Math.random() * 10;
      ctx.beginPath();
      ctx.arc(
        facing * 28 * s + Math.cos(sparkAngle) * sparkDist * s,
        armY - 3 * s + Math.sin(sparkAngle) * sparkDist * s,
        (1 + Math.random() * 1.5) * s,
        0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // ---- WALKING / RUNNING / IDLE ARM SWING ----
    // Opposite arm to leg for natural walking
    const armSwingAmount = isRunning ? 22 * s : (isMoving ? 16 * s : 3 * s);
    const armSwing = isGrounded
      ? Math.sin(animFrame * walkCycleSpeed) * armSwingAmount * speedFactor
      : -8 * s; // Air pose

    const armExtend = isRunning ? 15 * s : 12 * s; // Wider arm swing when running

    // Back arm — swings OPPOSITE to front arm (natural walk cycle)
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(bodyLean, armY);
    ctx.lineTo(-facing * armExtend, armY + armSwing);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(bodyLean, armY);
    ctx.lineTo(-facing * armExtend, armY + armSwing);
    ctx.stroke();

    // Front arm — cool idle pose (hand near hip when idle)
    if (!isMoving && isGrounded) {
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(bodyLean, armY);
      ctx.lineTo(facing * (8 * s), armY + 12 * s + Math.sin(animFrame * 0.05) * 2 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(bodyLean, armY);
      ctx.lineTo(facing * (8 * s), armY + 12 * s + Math.sin(animFrame * 0.05) * 2 * s);
      ctx.stroke();
    } else {
      // Front arm swings opposite to back arm (natural walk)
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(bodyLean, armY);
      ctx.lineTo(facing * armExtend, armY - armSwing);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(bodyLean, armY);
      ctx.lineTo(facing * armExtend, armY - armSwing);
      ctx.stroke();
    }
  }

  // ---- LEGS ----
  if (!isGrounded) {
    // Jump pose — legs tucked and spread
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(-10 * s, -10 * s + 14 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(10 * s, -10 * s + 14 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(-10 * s, -10 * s + 14 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(10 * s, -10 * s + 14 * s);
    ctx.stroke();
  } else if (isMoving) {
    // ---- WALKING / RUNNING ANIMATION ----
    // More realistic leg stride with knee bend
    const legSwingAmount = isRunning ? 20 * s : 14 * s;
    const legSwing = Math.sin(animFrame * walkCycleSpeed) * legSwingAmount * Math.max(speedFactor, 0.6);
    const strideWidth = isRunning ? 12 * s : 8 * s;

    // Left leg
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(-strideWidth * 0.5 + legSwing * 0.3, -10 * s + 12 * s); // knee
    ctx.lineTo(-strideWidth + legSwing * 0.5, -10 * s + 22 * s + legSwing * 0.6); // foot
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(strideWidth * 0.5 - legSwing * 0.3, -10 * s + 12 * s); // knee
    ctx.lineTo(strideWidth - legSwing * 0.5, -10 * s + 22 * s - legSwing * 0.6); // foot
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * s;
    // Left leg (solid)
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(-strideWidth * 0.5 + legSwing * 0.3, -10 * s + 12 * s);
    ctx.lineTo(-strideWidth + legSwing * 0.5, -10 * s + 22 * s + legSwing * 0.6);
    ctx.stroke();
    // Right leg (solid)
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(strideWidth * 0.5 - legSwing * 0.3, -10 * s + 12 * s);
    ctx.lineTo(strideWidth - legSwing * 0.5, -10 * s + 22 * s - legSwing * 0.6);
    ctx.stroke();
  } else {
    // Idle — cool stance, slight bounce
    const idleBounce = Math.sin(animFrame * 0.06) * 1.5 * s;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(-9 * s, -10 * s + 20 * s + idleBounce);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(9 * s, -10 * s + 20 * s + idleBounce);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(-9 * s, -10 * s + 20 * s + idleBounce);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.lineTo(9 * s, -10 * s + 20 * s + idleBounce);
    ctx.stroke();
  }

  // ---- TRAIL EFFECT when moving ----
  if (isMoving && isGrounded) {
    const trailCount = isRunning ? 5 : 3;
    const trailSpacing = isRunning ? 10 * s : 8 * s;
    ctx.strokeStyle = color;
    ctx.lineWidth = isRunning ? 2 * s : 1.5 * s;
    for (let i = 1; i <= trailCount; i++) {
      const trailX = -facing * i * trailSpacing;
      ctx.globalAlpha = Math.max(0.15 - i * 0.03, 0.02);
      ctx.beginPath();
      ctx.moveTo(trailX, -38 * s - headBob);
      ctx.lineTo(trailX + bodyLean, -29 * s - headBob * 0.5);
      ctx.lineTo(trailX, -10 * s);
      ctx.stroke();
    }
    // Running speed lines
    if (isRunning) {
      ctx.lineWidth = 1 * s;
      for (let i = 0; i < 3; i++) {
        const lineY = -32 * s + i * 10 * s;
        const lineLen = (8 + Math.random() * 12) * s;
        ctx.globalAlpha = 0.1 + Math.random() * 0.1;
        ctx.beginPath();
        ctx.moveTo(-facing * (15 + i * 5) * s, lineY);
        ctx.lineTo(-facing * (15 + i * 5 + lineLen / s) * s, lineY);
        ctx.stroke();
      }
    }
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ====== EXPRESSION SYSTEM ======
function drawExpression(
  ctx: CanvasRenderingContext2D,
  facing: number,
  s: number,
  color: string,
  expression: SparkExpression,
  animFrame: number,
) {
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.lineWidth = 1.5 * s;

  switch (expression) {
    case 'angry': {
      // Angry eyebrows (angled down toward center)
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(facing * -5 * s, -43 * s);
      ctx.lineTo(facing * 1 * s, -41 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(facing * 5 * s, -43 * s);
      ctx.lineTo(facing * 1 * s, -41 * s);
      ctx.stroke();
      // Angry eyes (narrower, intense)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -39 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -39 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'smirk': {
      // One eyebrow raised, one lowered
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(facing * -5 * s, -42 * s);
      ctx.lineTo(facing * 1 * s, -43 * s);
      ctx.stroke();
      // Confident eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -39 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(facing * 3.5 * s, -39 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      // Smirk line
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(facing * -2 * s, -35 * s);
      ctx.lineTo(facing * 4 * s, -35.5 * s);
      ctx.lineTo(facing * 5 * s, -36.5 * s);
      ctx.stroke();
      break;
    }
    case 'determined': {
      // Straight focused eyebrows
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(facing * -4 * s, -42 * s);
      ctx.lineTo(facing * 5 * s, -42 * s);
      ctx.stroke();
      // Determined eyes (slightly squinted)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -39 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -39 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();
      // Tight mouth
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(facing * -2 * s, -35 * s);
      ctx.lineTo(facing * 3 * s, -35 * s);
      ctx.stroke();
      break;
    }
    case 'hurt': {
      // Pain expression — X eye, wavy mouth
      ctx.strokeStyle = color;
      const ex = facing * 3 * s;
      const ey = -39 * s;
      ctx.beginPath();
      ctx.moveTo(ex - 2 * s, ey - 2 * s);
      ctx.lineTo(ex + 2 * s, ey + 2 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex + 2 * s, ey - 2 * s);
      ctx.lineTo(ex - 2 * s, ey + 2 * s);
      ctx.stroke();
      // Wavy mouth
      ctx.beginPath();
      ctx.moveTo(facing * -2 * s, -35 * s);
      ctx.lineTo(facing * 0 * s, -34 * s);
      ctx.lineTo(facing * 3 * s, -35.5 * s);
      ctx.stroke();
      break;
    }
    case 'victory': {
      // Big grin, happy eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(facing * 1 * s, -39 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(facing * 5 * s, -39 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      // Big smile
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -37 * s, 5 * s, 0.1, Math.PI - 0.1);
      ctx.stroke();
      break;
    }
    default: { // 'neutral'
      // Default cool eye
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(facing * 3 * s, -39.5 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      // Slight neutral mouth
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(facing * 0 * s, -35 * s);
      ctx.lineTo(facing * 3 * s, -35.2 * s);
      ctx.stroke();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

// ====== DRAW SPARK FOR MENU (big, animated, cool) ======
export function drawMenuSpark(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  frame: number,
) {
  ctx.save();
  ctx.translate(x, y);

  // Subtle floating animation
  const floatY = Math.sin(frame * 0.03) * 5;

  // Energy aura behind Spark
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = CYAN;
  ctx.beginPath();
  ctx.arc(0, -20 + floatY, 60 + Math.sin(frame * 0.04) * 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(0, -20 + floatY, 35 + Math.sin(frame * 0.06) * 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw the stickman with smirk expression
  drawNeonStickman(ctx, 0, floatY, 1, CYAN, frame, false, true, 2.5, 'smirk', false);

  // Rotating energy particles around Spark
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + frame * 0.02;
    const dist = 55 + Math.sin(frame * 0.04 + i) * 10;
    const px = Math.cos(angle) * dist;
    const py = -20 + floatY + Math.sin(angle) * dist * 0.5;
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
}

// ====== BOSS DRAWING ======
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number, color: string,
  animFrame: number, health: number, maxHealth: number,
) {
  const s = 2.5;
  ctx.save();
  ctx.translate(x, y);

  // Aura
  ctx.shadowBlur = 30;
  ctx.shadowColor = color;
  ctx.globalAlpha = 0.15 + Math.sin(animFrame * 0.05) * 0.1;
  ctx.beginPath();
  ctx.arc(0, -30 * s, 40 * s, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;

  // Head
  ctx.beginPath();
  ctx.arc(0, -38 * s, 12 * s, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Menacing eyes
  ctx.fillStyle = '#ff0000';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(-5 * s, -40 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5 * s, -40 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = color;
  ctx.shadowBlur = 15;

  // Body
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -26 * s);
  ctx.lineTo(0, -5 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -26 * s);
  ctx.lineTo(0, -5 * s);
  ctx.stroke();

  // Arms
  const armY = -20 * s;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, armY);
  ctx.lineTo(-facing * 25 * s, armY + 10 * s + Math.sin(animFrame * 0.05) * 5 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, armY);
  ctx.lineTo(facing * 25 * s, armY - 5 * s + Math.sin(animFrame * 0.05 + 1) * 5 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, armY);
  ctx.lineTo(-facing * 25 * s, armY + 10 * s + Math.sin(animFrame * 0.05) * 5 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, armY);
  ctx.lineTo(facing * 25 * s, armY - 5 * s + Math.sin(animFrame * 0.05 + 1) * 5 * s);
  ctx.stroke();

  // Legs
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(-10 * s, -5 * s + 18 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(10 * s, -5 * s + 18 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(-10 * s, -5 * s + 18 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(10 * s, -5 * s + 18 * s);
  ctx.stroke();

  // Health bar
  const barW = 80;
  const barH = 6;
  const barX = -barW / 2;
  const barY = -55 * s;
  ctx.globalAlpha = 0.8;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#330000';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = RED;
  ctx.shadowColor = RED;
  ctx.shadowBlur = 8;
  ctx.fillRect(barX, barY, barW * (health / maxHealth), barH);

  ctx.restore();
}

// ====== ENEMY DRAWING ======
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  type: string, facing: number, animFrame: number, grounded: boolean,
) {
  if (type === 'boss') return;
  const color = type === 'drone' ? RED : type === 'glitchWalker' ? PURPLE : type === 'eliteDrone' ? '#ff4466' : type === 'heavyWalker' ? '#884400' : ORANGE;

  if (type === 'eliteDrone') {
    // Elite drone — bigger, glowing, has horns
    const glowOffset = Math.sin(animFrame * 0.15) * 2;
    drawNeonStickman(ctx, x, y + glowOffset, facing, '#ff4466', animFrame, false, grounded, 1.1, 'angry', true);
    // Extra glow aura
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(animFrame * 0.1) * 0.1;
    ctx.shadowBlur = 20; ctx.shadowColor = '#ff4466';
    ctx.fillStyle = '#ff4466';
    ctx.beginPath(); ctx.arc(x, y - 25, 30, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  if (type === 'heavyWalker') {
    // Heavy walker — bigger, chunky, slow
    const s = 1.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#884400';
    ctx.strokeStyle = '#884400';
    ctx.lineWidth = 3 * s;
    // Head
    ctx.beginPath(); ctx.arc(0, -38 * s, 9 * s, 0, Math.PI * 2); ctx.stroke();
    // Eye
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(facing * 3 * s, -39 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.beginPath(); ctx.moveTo(0, -29 * s); ctx.lineTo(0, -10 * s); ctx.stroke();
    // Arms (heavy, thick)
    ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(0, -25 * s); ctx.lineTo(-facing * 15 * s, -15 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -25 * s); ctx.lineTo(facing * 15 * s, -15 * s); ctx.stroke();
    // Legs
    ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(0, -10 * s); ctx.lineTo(-10 * s, 8 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10 * s); ctx.lineTo(10 * s, 8 * s); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (type === 'voidGuardian') {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = ORANGE;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = ORANGE;
    ctx.fillRect(-15, -25, 30, 25);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(-15, -25, 30, 25);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(facing * 20, -18);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (type === 'dragon') {
    // Dragon: large winged creature
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = ORANGE;
    ctx.strokeStyle = ORANGE;
    ctx.fillStyle = ORANGE;
    ctx.lineWidth = 2;
    const bob = Math.sin(animFrame * 0.08) * 3;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -15 + bob, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(facing * 16, -20 + bob, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(facing * 18, -21 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.15) * 10;
    ctx.strokeStyle = ORANGE;
    ctx.beginPath();
    ctx.moveTo(-6, -18 + bob);
    ctx.lineTo(-20, -30 + bob + wingFlap);
    ctx.lineTo(-12, -8 + bob);
    ctx.moveTo(6, -18 + bob);
    ctx.lineTo(20, -30 + bob + wingFlap);
    ctx.lineTo(12, -8 + bob);
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(-facing * 14, -12 + bob);
    ctx.quadraticCurveTo(-facing * 22, -6 + bob + Math.sin(animFrame * 0.1) * 4, -facing * 26, -12 + bob);
    ctx.stroke();
    // Fire breath (occasional)
    if (animFrame % 60 < 15) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.moveTo(facing * 22, -20 + bob);
      ctx.lineTo(facing * 35, -18 + bob);
      ctx.lineTo(facing * 35, -22 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (type === 'phoenix') {
    // Phoenix: bird-like with flame trail
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = YELLOW;
    ctx.strokeStyle = YELLOW;
    ctx.fillStyle = YELLOW;
    ctx.lineWidth = 2;
    const bob = Math.sin(animFrame * 0.1) * 4;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -14 + bob, 10, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(facing * 12, -18 + bob, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.2) * 8;
    ctx.strokeStyle = ORANGE;
    ctx.beginPath();
    ctx.moveTo(-5, -16 + bob);
    ctx.lineTo(-18, -26 + bob + wingFlap);
    ctx.lineTo(-8, -6 + bob);
    ctx.moveTo(5, -16 + bob);
    ctx.lineTo(18, -26 + bob + wingFlap);
    ctx.lineTo(8, -6 + bob);
    ctx.stroke();
    // Flame trail
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ORANGE;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(-facing * (8 + i * 6), -10 + bob + Math.sin(animFrame * 0.15 + i) * 3, 3 - i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (type === 'mechGolem') {
    // Mech Golem: angular robot shape
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = LIME;
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 2.5;
    const bob = Math.sin(animFrame * 0.06) * 1.5;
    // Head (angular)
    ctx.beginPath();
    ctx.moveTo(-6, -38 + bob);
    ctx.lineTo(6, -38 + bob);
    ctx.lineTo(8, -30 + bob);
    ctx.lineTo(-8, -30 + bob);
    ctx.closePath();
    ctx.stroke();
    // Eyes
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(-3, -34 + bob, 2, 0, Math.PI * 2);
    ctx.arc(3, -34 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Body (thick rectangle)
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 3;
    ctx.strokeRect(-10, -28 + bob, 20, 20);
    // Arms (heavy)
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -24 + bob);
    ctx.lineTo(-18, -16 + bob + Math.sin(animFrame * 0.1) * 2);
    ctx.moveTo(10, -24 + bob);
    ctx.lineTo(18, -16 + bob - Math.sin(animFrame * 0.1) * 2);
    ctx.stroke();
    // Legs
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -8 + bob);
    ctx.lineTo(-8, 2 + bob);
    ctx.moveTo(6, -8 + bob);
    ctx.lineTo(8, 2 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (type === 'shadowAssassin') {
    // Shadow Assassin: nearly invisible stickman with afterimage
    ctx.save();
    ctx.translate(x, y);
    // Afterimage
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const ox = -facing * i * 8;
      ctx.beginPath(); ctx.arc(ox, -38, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, -31); ctx.lineTo(ox, -10); ctx.stroke();
    }
    ctx.globalAlpha = 0.7 + Math.sin(animFrame * 0.2) * 0.2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = PURPLE;
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 1.5;
    // Head
    ctx.beginPath(); ctx.arc(0, -38, 7, 0, Math.PI * 2); ctx.stroke();
    // Eye (glowing)
    ctx.fillStyle = MAGENTA;
    ctx.shadowColor = MAGENTA;
    ctx.beginPath(); ctx.arc(facing * 3, -39, 2, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.strokeStyle = PURPLE;
    ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(0, -10); ctx.stroke();
    // Arms (blade-like)
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(facing * 18, -28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-facing * 10, -20);
    ctx.stroke();
    // Legs
    const legSwing = Math.sin(animFrame * 0.3) * 10;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-6 + legSwing * 0.3, legSwing); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6 - legSwing * 0.3, -legSwing); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'voidBat') {
    // Void Bat: small, fast, dark purple bat
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#8800aa';
    ctx.strokeStyle = '#8800aa';
    ctx.fillStyle = MAGENTA;
    ctx.lineWidth = 1.5;
    const bob = Math.sin(animFrame * 0.2) * 4;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -12 + bob, 6, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(facing * 7, -14 + bob, 3.5, 0, Math.PI * 2);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = MAGENTA;
    ctx.beginPath(); ctx.arc(facing * 8, -15 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.3) * 8;
    ctx.beginPath();
    ctx.moveTo(-3, -14 + bob);
    ctx.quadraticCurveTo(-12, -22 + bob + wingFlap, -8, -6 + bob);
    ctx.moveTo(3, -14 + bob);
    ctx.quadraticCurveTo(12, -22 + bob + wingFlap, 8, -6 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'stormEagle') {
    // Storm Eagle: medium bird with lightning
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = YELLOW;
    ctx.strokeStyle = YELLOW;
    ctx.fillStyle = '#ffff44';
    ctx.lineWidth = 2;
    const bob = Math.sin(animFrame * 0.12) * 5;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -16 + bob, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(facing * 14, -20 + bob, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(facing * 16, -21 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.2) * 10;
    ctx.strokeStyle = YELLOW;
    ctx.beginPath();
    ctx.moveTo(-6, -18 + bob);
    ctx.lineTo(-22, -30 + bob + wingFlap);
    ctx.lineTo(-10, -8 + bob);
    ctx.moveTo(6, -18 + bob);
    ctx.lineTo(22, -30 + bob + wingFlap);
    ctx.lineTo(10, -8 + bob);
    ctx.stroke();
    // Lightning sparks
    if (animFrame % 30 < 5) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(facing * 5, -8 + bob);
      ctx.lineTo(facing * 8, -3 + bob);
      ctx.lineTo(facing * 3, -2 + bob);
      ctx.lineTo(facing * 7, 3 + bob);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'emberWisp') {
    // Ember Wisp: small floating fire spirit
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = ORANGE;
    const bob = Math.sin(animFrame * 0.15) * 5;
    // Core
    ctx.globalAlpha = 0.6 + Math.sin(animFrame * 0.1) * 0.2;
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(0, -12 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    // Inner glow
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.arc(0, -12 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Flame wisps
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + animFrame * 0.08;
      const len = 8 + Math.sin(animFrame * 0.15 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(0, -12 + bob);
      ctx.lineTo(Math.cos(angle) * len, -12 + bob + Math.sin(angle) * len);
      ctx.stroke();
    }
    // Eyes
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-2, -13 + bob, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -13 + bob, 1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'frostWraith') {
    // Frost Wraith: floating ice ghost
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#88eeff';
    ctx.strokeStyle = '#88eeff';
    ctx.lineWidth = 1.5;
    const bob = Math.sin(animFrame * 0.1) * 6;
    // Ghostly body
    ctx.globalAlpha = 0.5 + Math.sin(animFrame * 0.08) * 0.15;
    ctx.beginPath();
    ctx.moveTo(-8, -5 + bob);
    ctx.quadraticCurveTo(-10, -30 + bob, 0, -35 + bob);
    ctx.quadraticCurveTo(10, -30 + bob, 8, -5 + bob);
    // Wavy bottom
    for (let i = 0; i < 4; i++) {
      const wx = -8 + i * 4 + 1;
      const wy = -5 + bob + Math.sin(animFrame * 0.15 + i) * 3;
      ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.stroke();
    // Face
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-3, -22 + bob, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -22 + bob, 2, 0, Math.PI * 2); ctx.fill();
    // Ice particles around
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const px = Math.cos(animFrame * 0.05 + i * 1.5) * 12;
      const py = -20 + bob + Math.sin(animFrame * 0.07 + i * 1.3) * 8;
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'shadowDrake') {
    // Shadow Drake: medium shadow dragon
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = PURPLE;
    ctx.strokeStyle = PURPLE;
    ctx.fillStyle = MAGENTA;
    ctx.lineWidth = 2;
    const bob = Math.sin(animFrame * 0.08) * 4;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -16 + bob, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(facing * 17, -22 + bob, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = MAGENTA;
    ctx.beginPath();
    ctx.arc(facing * 19, -23 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Wings (dark and jagged)
    const wingFlap = Math.sin(animFrame * 0.15) * 12;
    ctx.strokeStyle = PURPLE;
    ctx.beginPath();
    ctx.moveTo(-8, -20 + bob);
    ctx.lineTo(-24, -34 + bob + wingFlap);
    ctx.lineTo(-16, -24 + bob);
    ctx.lineTo(-22, -14 + bob + wingFlap * 0.5);
    ctx.lineTo(-10, -12 + bob);
    ctx.moveTo(8, -20 + bob);
    ctx.lineTo(24, -34 + bob + wingFlap);
    ctx.lineTo(16, -24 + bob);
    ctx.lineTo(22, -14 + bob + wingFlap * 0.5);
    ctx.lineTo(10, -12 + bob);
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(-facing * 14, -14 + bob);
    ctx.quadraticCurveTo(-facing * 24, -8 + bob + Math.sin(animFrame * 0.1) * 5, -facing * 28, -16 + bob);
    ctx.stroke();
    // Shadow aura
    ctx.globalAlpha = 0.15 + Math.sin(animFrame * 0.1) * 0.1;
    ctx.fillStyle = PURPLE;
    ctx.beginPath();
    ctx.arc(0, -16 + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'plasmaSerpent') {
    // Plasma Serpent: flying energy serpent
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = MAGENTA;
    ctx.strokeStyle = MAGENTA;
    ctx.lineWidth = 2.5;
    const bob = Math.sin(animFrame * 0.1) * 4;
    // Sinuous body segments
    ctx.globalAlpha = 0.8;
    const segments = 6;
    for (let i = 0; i < segments; i++) {
      const sx = -facing * i * 7;
      const sy = -14 + bob + Math.sin(animFrame * 0.15 + i * 0.8) * 5;
      const radius = 4 - i * 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Head (bigger)
    ctx.beginPath();
    ctx.arc(facing * 5, -16 + bob, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(facing * 7, -17 + bob, 2, 0, Math.PI * 2); ctx.fill();
    // Energy arcs
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ax = facing * (2 + i * 5);
      const ay = -14 + bob + Math.sin(animFrame * 0.2 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.sin(animFrame * 0.3 + i * 2) * 8, ay + Math.cos(animFrame * 0.25 + i) * 5);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'neonWyrm') {
    // Neon Wyrm: large flying wyrm
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 15;
    ctx.shadowColor = CYAN;
    ctx.strokeStyle = CYAN;
    ctx.fillStyle = '#00ffff';
    ctx.lineWidth = 2.5;
    const bob = Math.sin(animFrame * 0.07) * 5;
    // Long sinuous body
    ctx.globalAlpha = 0.9;
    const wSegments = 8;
    for (let i = 0; i < wSegments; i++) {
      const sx = -facing * i * 9;
      const sy = -18 + bob + Math.sin(animFrame * 0.12 + i * 0.7) * 6;
      const radius = 6 - i * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Head
    ctx.beginPath();
    ctx.arc(facing * 8, -22 + bob, 8, 0, Math.PI * 2);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(facing * 11, -24 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = CYAN;
    ctx.beginPath(); ctx.arc(facing * 11, -24 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
    // Wings
    const wingFlap = Math.sin(animFrame * 0.12) * 10;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -22 + bob);
    ctx.lineTo(-25, -38 + bob + wingFlap);
    ctx.lineTo(-15, -16 + bob);
    ctx.moveTo(5, -22 + bob);
    ctx.lineTo(25, -38 + bob + wingFlap);
    ctx.lineTo(15, -16 + bob);
    ctx.stroke();
    // Glow aura
    ctx.globalAlpha = 0.12 + Math.sin(animFrame * 0.08) * 0.06;
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(0, -18 + bob, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'crystalMoth') {
    // Crystal Moth: floating crystal creature
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = LIME;
    ctx.strokeStyle = LIME;
    ctx.fillStyle = '#88ffaa';
    ctx.lineWidth = 1.5;
    const bob = Math.sin(animFrame * 0.13) * 5;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -12 + bob, 4, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(0, -20 + bob, 3, 0, Math.PI * 2);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-1.5, -21 + bob, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1.5, -21 + bob, 1, 0, Math.PI * 2); ctx.fill();
    // Wings (crystalline, geometric)
    const wingFlap = Math.sin(animFrame * 0.25) * 6;
    ctx.fillStyle = LIME;
    ctx.globalAlpha = 0.3;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-4, -16 + bob);
    ctx.lineTo(-16, -24 + bob + wingFlap);
    ctx.lineTo(-14, -12 + bob + wingFlap * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(4, -16 + bob);
    ctx.lineTo(16, -24 + bob + wingFlap);
    ctx.lineTo(14, -12 + bob + wingFlap * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Crystal sparkles
    ctx.globalAlpha = 0.5 + Math.sin(animFrame * 0.1) * 0.3;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const sx = Math.cos(animFrame * 0.06 + i * 2) * 12;
      const sy = -16 + bob + Math.sin(animFrame * 0.08 + i * 1.5) * 8;
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'zombie') {
    // Zombie: slow, tanky, green-tinted stickman with shambling animation
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#44aa00';
    ctx.strokeStyle = '#44aa00';
    ctx.lineWidth = 2.5;
    const shamble = Math.sin(animFrame * 0.08) * 3;
    // Head (tilted)
    ctx.beginPath(); ctx.arc(shamble * 0.3, -40, 8, 0, Math.PI * 2); ctx.stroke();
    // Eyes (dim, hollow)
    ctx.fillStyle = '#88ff00';
    ctx.beginPath(); ctx.arc(facing * 2 + shamble * 0.3, -41, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-facing * 1 + shamble * 0.3, -41, 2, 0, Math.PI * 2); ctx.fill();
    // Body (hunched)
    ctx.beginPath(); ctx.moveTo(shamble * 0.3, -32); ctx.lineTo(shamble * 0.2, -12); ctx.stroke();
    // Arms (extended forward, shambling)
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(shamble * 0.2, -26); ctx.lineTo(facing * 16, -22 + shamble); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shamble * 0.2, -26); ctx.lineTo(-facing * 8, -20); ctx.stroke();
    // Legs (slow, dragging)
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(shamble * 0.2, -12); ctx.lineTo(-8 + shamble * 0.5, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shamble * 0.2, -12); ctx.lineTo(8 - shamble * 0.5, 2); ctx.stroke();
    // Rotting particles
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#44aa00';
    for (let i = 0; i < 3; i++) {
      const px = Math.sin(animFrame * 0.05 + i * 2) * 10;
      const py = -20 + Math.cos(animFrame * 0.07 + i) * 8;
      ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'giant') {
    // Giant: huge, boss-like but non-boss, very slow and tanky
    ctx.save();
    ctx.translate(x, y);
    const s = 1.6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#cc4400';
    ctx.strokeStyle = '#cc4400';
    ctx.lineWidth = 4 * s;
    const sway = Math.sin(animFrame * 0.04) * 2;
    // Head (large)
    ctx.beginPath(); ctx.arc(sway, -38 * s, 12 * s, 0, Math.PI * 2); ctx.stroke();
    // Eyes (angry)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(facing * 4 + sway, -39 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-facing * 2 + sway, -39 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    // Body (massive)
    ctx.beginPath(); ctx.moveTo(sway, -26 * s); ctx.lineTo(sway, -8 * s); ctx.stroke();
    // Arms (huge, crushing)
    ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(sway, -22 * s); ctx.lineTo(facing * 22 * s, -14 * s + sway); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sway, -22 * s); ctx.lineTo(-facing * 18 * s, -10 * s); ctx.stroke();
    // Legs (thick pillars)
    ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(sway, -8 * s); ctx.lineTo(-10 * s + sway, 4 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sway, -8 * s); ctx.lineTo(10 * s + sway, 4 * s); ctx.stroke();
    // Ground shake effect
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.ellipse(0, 4, 25, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'necromancer') {
    // Necromancer: floating dark mage that summons smaller enemies
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#6600aa';
    ctx.strokeStyle = '#6600aa';
    ctx.fillStyle = MAGENTA;
    ctx.lineWidth = 2;
    const bob = Math.sin(animFrame * 0.08) * 6;
    // Hooded robe
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-10, -5 + bob);
    ctx.quadraticCurveTo(-12, -30 + bob, 0, -38 + bob);
    ctx.quadraticCurveTo(12, -30 + bob, 10, -5 + bob);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#6600aa';
    ctx.fill();
    ctx.globalAlpha = 1;
    // Face (skull-like)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-3, -28 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -28 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
    // Glowing eyes
    ctx.fillStyle = '#ff44ff';
    ctx.beginPath(); ctx.arc(-3, -28 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -28 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
    // Staff
    ctx.strokeStyle = '#8844cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(facing * 12, -32 + bob);
    ctx.lineTo(facing * 10, 0 + bob);
    ctx.stroke();
    // Staff orb
    ctx.fillStyle = '#ff44ff';
    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(facing * 12, -35 + bob, 4, 0, Math.PI * 2); ctx.fill();
    // Summoning circles (orbiting skulls)
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const angle = animFrame * 0.06 + i * (Math.PI * 2 / 3);
      const sx = Math.cos(angle) * 16;
      const sy = -20 + bob + Math.sin(angle) * 10;
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (type === 'bomber') {
    // Bomber: runs at player and explodes, glowing red
    ctx.save();
    ctx.translate(x, y);
    const pulse = Math.sin(animFrame * 0.2) * 0.3 + 0.7;
    ctx.shadowBlur = 8 + Math.sin(animFrame * 0.15) * 6;
    ctx.shadowColor = RED;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    const runBob = Math.sin(animFrame * 0.4) * 3;
    // Head (ticking bomb-like)
    ctx.beginPath(); ctx.arc(0, -38 + runBob, 7, 0, Math.PI * 2); ctx.stroke();
    // Fuse spark
    ctx.fillStyle = YELLOW;
    ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.arc(0, -46 + runBob, 3 + Math.sin(animFrame * 0.3) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Angry eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-3, -39 + runBob, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -39 + runBob, 1.5, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.strokeStyle = RED;
    ctx.beginPath(); ctx.moveTo(0, -31 + runBob); ctx.lineTo(0, -12 + runBob); ctx.stroke();
    // Arms (reaching forward)
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -26 + runBob); ctx.lineTo(facing * 14, -22 + runBob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -26 + runBob); ctx.lineTo(-facing * 8, -20 + runBob); ctx.stroke();
    // Legs (running fast)
    ctx.lineWidth = 2;
    const legSwing = Math.sin(animFrame * 0.4) * 12;
    ctx.beginPath(); ctx.moveTo(0, -12 + runBob); ctx.lineTo(-6 + legSwing * 0.4, 0 + runBob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12 + runBob); ctx.lineTo(6 - legSwing * 0.4, 0 + runBob); ctx.stroke();
    // Explosion warning aura (grows when close to detonating)
    ctx.globalAlpha = 0.1 + Math.sin(animFrame * 0.25) * 0.08;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(0, -22 + runBob, 20 + Math.sin(animFrame * 0.2) * 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    const glitchOffset = type === 'glitchWalker' ? Math.sin(animFrame * 0.5) * 3 : 0;
    drawNeonStickman(ctx, x + glitchOffset, y, facing, color, animFrame, false, grounded, 0.9, 'angry', true);
  }
}

// ====== BULLET DRAWING ======
export function drawBullet(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number, radius: number, color: string,
) {
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(bx, by, radius * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(bx, by, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(bx, by, radius * 1.2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ====== PARTICLE DRAWING ======
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, size: number, color: string, alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 5;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ====== BACKGROUND DRAWING ======
// ====== LIGHTNING EFFECT ======
// Persistent lightning state so bolts persist across frames
let lightningBolts: { segments: { x: number; y: number }[]; life: number; flashLife: number }[] = [];

export function drawLightning(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  frameCount: number,
) {
  // Random chance to spawn a new lightning bolt (1-2% per frame)
  if (Math.random() < 0.015) {
    const numSegments = 2 + Math.floor(Math.random() * 3); // 2-4 segments
    const segments: { x: number; y: number }[] = [];
    let bx = Math.random() * cw;
    let by = 0;
    segments.push({ x: bx, y: by });
    for (let s = 0; s < numSegments; s++) {
      bx += (Math.random() - 0.5) * 120;
      by += ch / (numSegments + 1) + Math.random() * 40;
      segments.push({ x: bx, y: Math.min(by, ch) });
    }
    lightningBolts.push({ segments, life: 6 + Math.floor(Math.random() * 4), flashLife: 4 });
  }

  // Draw and update active bolts
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const bolt = lightningBolts[i];
    bolt.life--;
    bolt.flashLife--;

    if (bolt.life <= 0) {
      lightningBolts.splice(i, 1);
      continue;
    }

    // Full-screen white flash effect (fades quickly)
    if (bolt.flashLife > 0) {
      ctx.globalAlpha = 0.15 * (bolt.flashLife / 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }

    // Draw the lightning bolt — neon cyan with white glow
    const alpha = Math.min(bolt.life / 6, 1);
    // White glow (thick, faint)
    ctx.save();
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let s = 1; s < bolt.segments.length; s++) {
      ctx.lineTo(bolt.segments[s].x, bolt.segments[s].y);
    }
    ctx.stroke();

    // Neon cyan core (thin, bright)
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let s = 1; s < bolt.segments.length; s++) {
      ctx.lineTo(bolt.segments[s].x, bolt.segments[s].y);
    }
    ctx.stroke();

    // Branch sparks at segment joints
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 8;
    for (let s = 1; s < bolt.segments.length - 1; s++) {
      if (Math.random() < 0.6) {
        const branchLen = 15 + Math.random() * 30;
        const branchAngle = (Math.random() - 0.5) * Math.PI * 0.6;
        ctx.beginPath();
        ctx.moveTo(bolt.segments[s].x, bolt.segments[s].y);
        ctx.lineTo(
          bolt.segments[s].x + Math.cos(branchAngle) * branchLen,
          bolt.segments[s].y + Math.sin(branchAngle + 0.5) * branchLen,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  camX: number, level: { background: string; width: number },
  stars: { x: number; y: number; size: number; speed: number }[],
  frame: number,
  season?: SeasonVisuals,
) {
  // Sky gradient - use season colors when available
  if (season) {
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    const colors = season.skyGradient;
    for (let i = 0; i < colors.length; i++) {
      grad.addColorStop(i / (colors.length - 1), colors[i]);
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = DARK_BG;
  }
  ctx.fillRect(0, 0, cw, ch);

  // Dark overlay to make backgrounds MUCH darker for neon art to pop
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalAlpha = 1;

  // Lightning effect — dramatic bolts when weather is active
  if (season && season.weatherType !== 'none') {
    drawLightning(ctx, cw, ch, frame);
  }

  // Ambient dark particles — slow floating dark purple/blue motes
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 30; i++) {
    const px = ((i * 197.3 - camX * 0.05 + frame * 0.15) % cw + cw) % cw;
    const py = ((i * 127.7 + frame * 0.2 * (0.5 + (i % 3) * 0.3)) % ch);
    const pSize = 1.5 + (i % 4) * 0.8;
    ctx.fillStyle = i % 3 === 0 ? '#220044' : i % 3 === 1 ? '#110022' : '#0a0020';
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stars
  ctx.globalAlpha = 0.4;
  for (const star of stars) {
    const sx = ((star.x - camX * star.speed) % cw + cw) % cw;
    ctx.fillStyle = season ? season.particleColor : '#ffffff';
    ctx.fillRect(sx, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  // Grid lines
  const gridColor = season ? season.platformGlow :
                    level.background === 'firewall' ? ORANGE :
                    level.background === 'void' ? MAGENTA :
                    level.background === 'core' ? PURPLE : CYAN;

  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const gridSpacing = 80;
  const gridOffset = -(camX * 0.15) % gridSpacing;
  for (let x = gridOffset; x < cw; x += gridSpacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
  }
  for (let y = 0; y < ch; y += gridSpacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
  }

  // Near grid
  ctx.globalAlpha = 0.1;
  const nearGridSpacing = 50;
  const nearGridOffset = -(camX * 0.4) % nearGridSpacing;
  for (let x = nearGridOffset; x < cw; x += nearGridSpacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
  }

  // Distant buildings
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = gridColor;
  const buildOffset = -(camX * 0.2);
  const buildingWidths = [60, 40, 80, 50, 70, 45, 90, 55, 65, 75, 35, 85];
  const buildingHeights = [120, 80, 200, 150, 180, 90, 250, 130, 160, 220, 70, 190];
  for (let i = 0; i < buildingWidths.length; i++) {
    const bx = ((buildOffset + i * 250) % (cw + 500)) - 100;
    const bh = buildingHeights[i % buildingHeights.length];
    const bw = buildingWidths[i % buildingWidths.length];
    ctx.fillRect(bx, ch - 100 - bh, bw, bh);
  }

  // Floating particles
  const particleCol = season ? season.particleColor : gridColor;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    const px = ((i * 173.7 - camX * 0.1) % cw + cw) % cw;
    const py = ((i * 91.3 + frame * 0.3) % ch);
    const pSize = 1 + (i % 3);
    ctx.shadowBlur = 5;
    ctx.shadowColor = particleCol;
    ctx.fillStyle = particleCol;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Season-specific weather effects
  if (season) {
    const weatherType = season.weatherType;
    const wColor = season.particleColor;

    if (weatherType === 'rain') {
      // Rain particles for neonCity and cyberForest
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = wColor;
      ctx.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        const rx = ((i * 97.3 - camX * 0.3 + frame * 2) % cw + cw) % cw;
        const ry = ((i * 53.7 + frame * 6) % ch);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 1, ry + 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (weatherType === 'snow') {
      // Snow particles for frozenTundra
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const sx = ((i * 79.1 - camX * 0.1 + Math.sin(frame * 0.01 + i) * 20) % cw + cw) % cw;
        const sy = ((i * 43.7 + frame * 1.5) % ch);
        const size = 1 + (i % 3);
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (weatherType === 'embers') {
      // Rising ember particles for scorchedWasteland, volcanicCore, bloodMoon
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 40; i++) {
        const ex = ((i * 87.3 - camX * 0.15) % cw + cw) % cw;
        const ey = ch - ((i * 67.1 + frame * 2) % ch);
        const size = 1 + (i % 2);
        ctx.shadowBlur = 4;
        ctx.shadowColor = wColor;
        ctx.fillStyle = i % 3 === 0 ? YELLOW : wColor;
        ctx.beginPath();
        ctx.arc(ex, ey, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    } else if (weatherType === 'glitch') {
      // Glitch lines for shadowRealm and stormPlains
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = wColor;
      for (let i = 0; i < 8; i++) {
        const scanY = ((frame * 2 + i * 97) % ch);
        ctx.fillRect(0, scanY, cw, 2 + Math.random() * 6);
      }
      // Occasional full-screen glitch flash for stormPlains
      if (season.platformGlow === YELLOW && frame % 180 < 3) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.globalAlpha = 1;
    } else if (weatherType === 'voidParticles') {
      // Void distortions for voidDimension
      ctx.globalAlpha = 0.08 + Math.sin(frame * 0.02) * 0.04;
      ctx.fillStyle = wColor;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, 200 + Math.sin(frame * 0.03) * 50, 0, Math.PI * 2);
      ctx.fill();
      // Void particle streams
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 20; i++) {
        const vx = ((i * 113.7 - camX * 0.2) % cw + cw) % cw;
        const vy = ((i * 73.1 + frame * 0.8) % ch);
        ctx.fillStyle = i % 2 === 0 ? wColor : '#440044';
        ctx.beginPath();
        ctx.arc(vx, vy, 2 + Math.sin(frame * 0.1 + i) * 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (weatherType === 'none') {
      // Crystal sparkles for crystalCaves
      ctx.globalAlpha = 0.3 + Math.sin(frame * 0.04) * 0.15;
      for (let i = 0; i < 15; i++) {
        const cx = ((i * 131.7 - camX * 0.1) % cw + cw) % cw;
        const cy = ((i * 83.1 + Math.sin(frame * 0.02 + i * 2) * 30) % ch);
        ctx.shadowBlur = 8;
        ctx.shadowColor = wColor;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Diamond shape for crystal sparkle
        const sz = 2 + Math.sin(frame * 0.08 + i) * 1;
        ctx.moveTo(cx, cy - sz);
        ctx.lineTo(cx + sz, cy);
        ctx.lineTo(cx, cy + sz);
        ctx.lineTo(cx - sz, cy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Blood moon special overlay
    if (season.platformGlow === '#cc0033') {
      ctx.globalAlpha = 0.04 + Math.sin(frame * 0.01) * 0.02;
      ctx.fillStyle = '#ff0033';
      ctx.fillRect(0, 0, cw, ch);
      // Blood moon in the sky
      ctx.globalAlpha = 0.2 + Math.sin(frame * 0.02) * 0.05;
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#cc0033';
      ctx.fillStyle = '#cc0033';
      ctx.beginPath();
      ctx.arc(cw * 0.8, 60, 35 + Math.sin(frame * 0.03) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  } else {
    // Default atmospheric effects (no season)
    if (level.background === 'corrupted') {
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = RED;
      for (let i = 0; i < 5; i++) {
        const scanY = ((frame * 2 + i * 137) % ch);
        ctx.fillRect(0, scanY, cw, 2 + Math.random() * 4);
      }
      ctx.globalAlpha = 1;
    } else if (level.background === 'void') {
      ctx.globalAlpha = 0.05 + Math.sin(frame * 0.02) * 0.03;
      ctx.fillStyle = MAGENTA;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, 200 + Math.sin(frame * 0.03) * 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (level.background === 'core') {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = PURPLE;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, 300 + Math.sin(frame * 0.02) * 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = CYAN;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, 150 + Math.sin(frame * 0.04) * 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ====== PLATFORM DRAWING ======
export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  sx: number, py: number, w: number, h: number,
  bgType: string,
) {
  const glowColor = bgType === 'firewall' ? ORANGE :
                    bgType === 'void' ? MAGENTA :
                    bgType === 'core' ? PURPLE : CYAN;

  ctx.shadowBlur = 10;
  ctx.shadowColor = glowColor;
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = glowColor;
  ctx.fillRect(sx, py, w, h);

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = bgType === 'firewall' ? '#1a0d00' :
                  bgType === 'void' ? '#1a0011' :
                  bgType === 'core' ? '#11001a' : '#001a1a';
  ctx.fillRect(sx, py, w, h);

  ctx.globalAlpha = 0.8;
  ctx.shadowBlur = 6;
  ctx.shadowColor = glowColor;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, py);
  ctx.lineTo(sx + w, py);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ====== GATE DRAWING ======
export function drawGate(
  ctx: CanvasRenderingContext2D,
  gx: number, gy: number, frame: number,
) {
  ctx.shadowBlur = 15;
  ctx.shadowColor = YELLOW;
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.05) * 0.2;
  for (let i = 0; i < 5; i++) {
    const bx = gx - 20 + i * 10;
    ctx.beginPath();
    ctx.moveTo(bx, gy - 60);
    ctx.lineTo(bx, gy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(gx - 22, gy - 30);
  ctx.lineTo(gx + 22, gy - 30);
  ctx.stroke();

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(gx, gy - 42, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ====== EXIT PORTAL DRAWING ======
export function drawExitPortal(
  ctx: CanvasRenderingContext2D,
  ex: number, ey: number, frame: number,
) {
  const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
  ctx.shadowBlur = 25;
  ctx.shadowColor = LIME;
  ctx.globalAlpha = pulse * 0.3;
  ctx.beginPath();
  ctx.arc(ex, ey, 35, 0, Math.PI * 2);
  ctx.fillStyle = LIME;
  ctx.fill();

  ctx.globalAlpha = pulse * 0.8;
  ctx.beginPath();
  ctx.arc(ex, ey, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = LIME;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ex, ey, 22 + Math.sin(frame * 0.08) * 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ex, ey, 12 + Math.sin(frame * 0.12) * 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ====== HUD DRAWING ======
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  cw: number, health: number, maxHealth: number,
  score: number, chapter: string, levelName: string,
) {
  ctx.save();
  ctx.globalAlpha = 0.9;

  // Health bar
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

  const pct = Math.max(0, health / maxHealth);
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
  ctx.fillText('HP', hbX, hbY - 4);

  // Level name
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 5;
  ctx.fillStyle = CYAN;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(chapter, cw / 2, hbY + 4);
  ctx.font = 'bold 12px monospace';
  ctx.fillText(levelName, cw / 2, hbY + 18);

  // Score
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = 5;
  ctx.fillStyle = ORANGE;
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SCORE', cw - 16, hbY + 4);
  ctx.font = 'bold 12px monospace';
  ctx.fillText(String(score), cw - 16, hbY + 18);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ====== CONTROLS HINT ======
export function drawControlsHint(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number, frame: number, isMobile: boolean,
) {
  if (frame > 400) return;
  const alpha = Math.max(0, 1 - frame / 400);
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;

  const hintY = ch - 50;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const boxW = isMobile ? 280 : 380;
  ctx.fillRect(cw / 2 - boxW / 2, hintY - 14, boxW, 28);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 5;
  ctx.shadowColor = CYAN;
  ctx.strokeRect(cw / 2 - boxW / 2, hintY - 14, boxW, 28);

  ctx.shadowBlur = 3;
  ctx.fillStyle = CYAN;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  if (isMobile) {
    ctx.fillText('Use buttons: Move | Jump | Shoot | Interact', cw / 2, hintY + 4);
  } else {
    ctx.fillText('A/D: Move | W: Jump | Space: Shoot | E: Interact', cw / 2, hintY + 4);
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ====== INTERACT HINT (for gates) ======
export function drawInteractHint(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, frame: number, isMobile: boolean,
) {
  ctx.shadowBlur = 8;
  ctx.shadowColor = YELLOW;
  ctx.fillStyle = YELLOW;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.8 + Math.sin(frame * 0.1) * 0.2;
  const hintText = isMobile ? 'Tap ► to unlock' : 'Press E to unlock';
  ctx.fillText(hintText, px, py - 65);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ====== DIRECTION ARROW (points toward objective) ======
export function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  playerX: number, objectiveX: number,
  camX: number, frame: number,
) {
  const screenObjX = objectiveX - camX;
  // Only show arrow if objective is off screen
  if (screenObjX > 50 && screenObjX < cw - 50) return;

  const arrowX = screenObjX <= 50 ? 40 : cw - 40;
  const arrowY = ch / 2;
  const bounce = Math.sin(frame * 0.08) * 5;
  const direction = screenObjX <= 50 ? -1 : 1;

  ctx.save();
  ctx.globalAlpha = 0.6 + Math.sin(frame * 0.06) * 0.2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = LIME;
  ctx.fillStyle = LIME;
  ctx.strokeStyle = LIME;
  ctx.lineWidth = 2;

  // Arrow shape
  ctx.beginPath();
  ctx.moveTo(arrowX + direction * 12, arrowY + bounce);
  ctx.lineTo(arrowX - direction * 6, arrowY - 8 + bounce);
  ctx.lineTo(arrowX - direction * 6, arrowY + 8 + bounce);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ====== MENU BACKGROUND ======
export function drawMenuBackground(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  frame: number,
  particles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[],
) {
  // Dark gradient
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#030310');
  grad.addColorStop(0.5, '#050520');
  grad.addColorStop(1, '#030310');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  // Grid
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  const gridOff = (frame * 0.3) % 80;
  for (let x = gridOff; x < cw; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
  }
  for (let y = 0; y < ch; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Floating particles
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < -10) { p.y = ch + 10; p.x = Math.random() * cw; }
    if (p.x < -10) p.x = cw + 10;
    if (p.x > cw + 10) p.x = -10;
    ctx.globalAlpha = 0.5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ====== GAME OVER BACKGROUND ======
export function drawGameOverBackground(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  frame: number,
) {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, cw, ch);

  // Red glitch lines
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = RED;
  for (let i = 0; i < 8; i++) {
    const y = ((frame * 1.5 + i * 97) % ch);
    ctx.fillRect(0, y, cw, 3 + Math.random() * 5);
  }
  ctx.globalAlpha = 1;
}

// ====== VICTORY BACKGROUND ======
export function drawVictoryBackground(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  frame: number,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#000510');
  grad.addColorStop(0.5, '#001020');
  grad.addColorStop(1, '#000510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  // Celebrating particles
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 30; i++) {
    const px = (i * 73.7 + frame * 0.5) % cw;
    const py = ch - ((i * 47.7 + frame * 0.8) % ch);
    const colors = [CYAN, LIME, MAGENTA, YELLOW];
    const col = colors[i % 4];
    ctx.shadowBlur = 5;
    ctx.shadowColor = col;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ====== CUTSCENE VISUAL RENDERING ======
export function drawCutsceneVisual(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  visualType: string,
  frame: number,
  effects: string[],
) {
  ctx.fillStyle = '#030308';
  ctx.fillRect(0, 0, cw, ch);

  if (effects.includes('darken')) {
    ctx.globalAlpha = 0.7;
  }

  switch (visualType) {
    case 'corruptedCity': drawCorruptedCity(ctx, cw, ch, frame); break;
    case 'voidAppears': drawVoidAppears(ctx, cw, ch, frame); break;
    case 'stickmanAwakens': drawStickmanAwakens(ctx, cw, ch, frame); break;
    case 'stickmanStand': drawStickmanStand(ctx, cw, ch, frame); break;
    case 'enemiesApproach': drawEnemiesApproach(ctx, cw, ch, frame); break;
    case 'combat': drawCombat(ctx, cw, ch, frame); break;
    case 'bridgeScene': drawBridgeScene(ctx, cw, ch, frame); break;
    case 'riddleGate': drawRiddleGate(ctx, cw, ch, frame); break;
    case 'coreRoom': drawCoreRoom(ctx, cw, ch, frame); break;
    case 'bossIntro': drawBossIntro(ctx, cw, ch, frame); break;
    case 'walking': drawWalkingScene(ctx, cw, ch, frame); break;
    case 'explosion': drawExplosionScene(ctx, cw, ch, frame); break;
  }

  if (effects.includes('glitch')) {
    applyGlitchEffect(ctx, cw, ch, frame);
  }
  if (effects.includes('lightning') && frame % 120 < 5) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 1;
}

// ====== CUTSCENE SUBTITLE ======
export function drawCutsceneSubtitle(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  text: string, speaker: string, color: string,
  progress: number,
) {
  const displayText = text.slice(0, Math.max(progress, 0));

  // Subtitle box at bottom
  const boxH = 80;
  const boxY = ch - boxH - 30;
  const boxW = Math.min(700, cw - 40);
  const boxX = (cw - boxW) / 2;

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#000000';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Speaker name
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(speaker, boxX + 16, boxY + 24);

  // Text
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#dddddd';
  ctx.font = '14px monospace';
  ctx.fillText(displayText, boxX + 16, boxY + 50);

  // Typing cursor
  if (displayText.length < text.length) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
    ctx.fillText('|', boxX + 16 + ctx.measureText(displayText).width, boxY + 50);
  }

  // Continue hint
  if (displayText.length >= text.length) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
    ctx.fillStyle = color;
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Click / Space to continue', boxX + boxW - 16, boxY + boxH - 12);
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ====== CUTSCENE IMPLEMENTATIONS ======

function drawCorruptedCity(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ch);
  gradient.addColorStop(0, '#0a0010');
  gradient.addColorStop(0.6, '#100020');
  gradient.addColorStop(1, '#050510');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cw, ch);

  const floorY = ch * 0.7;
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  for (let x = (frame * 0.5) % 60 - 60; x < cw; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke();
  }
  for (let y = floorY; y < ch; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const buildings = [
    { x: 50, w: 80, h: 200 }, { x: 160, w: 60, h: 280 },
    { x: 250, w: 100, h: 160 }, { x: 400, w: 70, h: 320 },
    { x: 500, w: 90, h: 240 }, { x: 620, w: 110, h: 190 },
    { x: 770, w: 65, h: 300 }, { x: 870, w: 95, h: 220 },
  ];

  for (const b of buildings) {
    const by = floorY - b.h;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(b.x, by, b.w, b.h);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(b.x, by, b.w, b.h);
    ctx.globalAlpha = 0.6;
    for (let wy = by + 15; wy < floorY - 15; wy += 25) {
      for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 18) {
        const isCorrupted = Math.sin(wx * 0.3 + wy * 0.2 + frame * 0.05) > 0.3;
        ctx.fillStyle = isCorrupted ? RED : YELLOW;
        ctx.shadowBlur = 3;
        ctx.shadowColor = isCorrupted ? RED : YELLOW;
        ctx.fillRect(wx, wy, 8, 10);
      }
    }
  }

  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 30; i++) {
    const px = (i * 97.3 + Math.sin(frame * 0.01 + i) * 20) % cw;
    const py = ch - ((i * 47.7 + frame * 0.5) % ch);
    const pColor = i % 3 === 0 ? RED : i % 3 === 1 ? ORANGE : MAGENTA;
    ctx.shadowBlur = 5; ctx.shadowColor = pColor; ctx.fillStyle = pColor;
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawVoidAppears(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#020005';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch / 2;
  const massSize = 50 + Math.min(frame, 200) * 0.8;
  ctx.globalAlpha = 0.3; ctx.shadowBlur = 40; ctx.shadowColor = MAGENTA;
  ctx.fillStyle = '#0a0010';
  ctx.beginPath(); ctx.arc(cx, cy, massSize, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.15; ctx.fillStyle = MAGENTA;
  ctx.beginPath(); ctx.arc(cx, cy, massSize * 1.5 + Math.sin(frame * 0.03) * 20, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.4; ctx.strokeStyle = MAGENTA; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = MAGENTA;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + frame * 0.01;
    const len = massSize * 1.2 + Math.sin(frame * 0.05 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * massSize * 0.5, cy + Math.sin(angle) * massSize * 0.5);
    ctx.quadraticCurveTo(cx + Math.cos(angle + 0.3) * len * 0.7, cy + Math.sin(angle + 0.3) * len * 0.7, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }
  if (frame > 60) {
    const eyeAlpha = Math.min(1, (frame - 60) / 60);
    ctx.globalAlpha = eyeAlpha; ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx - 20, cy - 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 20, cy - 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = eyeAlpha * 0.3; ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(cx - 20, cy - 10, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 20, cy - 10, 15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawStickmanAwakens(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const floorY = ch * 0.75;
  ctx.globalAlpha = 0.1; ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
  for (let x = (frame * 0.3) % 60; x < cw; x += 60) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const stickX = cw / 2; const stickY = floorY;
  const progress = Math.min(1, frame / 180);
  if (progress < 0.5) {
    const angle = (0.5 - progress) * Math.PI * 0.45;
    ctx.save(); ctx.translate(stickX, stickY); ctx.rotate(-angle);
    drawNeonStickman(ctx, 0, 0, 1, CYAN, frame, false, true, 1.5, 'neutral', false);
    ctx.restore();
  } else {
    const standProgress = (progress - 0.5) * 2;
    const angle = (1 - standProgress) * Math.PI * 0.2;
    ctx.save(); ctx.translate(stickX, stickY); ctx.rotate(-angle);
    drawNeonStickman(ctx, 0, 0, 1, CYAN, frame, false, true, 1.5, standProgress > 0.5 ? 'determined' : 'neutral', false);
    ctx.restore();
  }
  if (frame > 100) {
    const glowAlpha = Math.min(0.3, (frame - 100) / 200);
    ctx.globalAlpha = glowAlpha; ctx.shadowBlur = 50; ctx.shadowColor = CYAN; ctx.fillStyle = CYAN;
    ctx.beginPath(); ctx.arc(stickX, stickY - 25, 30 + Math.sin(frame * 0.05) * 10, 0, Math.PI * 2); ctx.fill();
  }
  if (frame > 60) {
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + frame * 0.03;
      const dist = 40 + (frame * 0.3 + i * 20) % 80;
      ctx.shadowBlur = 5; ctx.shadowColor = CYAN; ctx.fillStyle = CYAN;
      ctx.beginPath(); ctx.arc(stickX + Math.cos(angle) * dist, stickY - 25 + Math.sin(angle) * dist, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawStickmanStand(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const floorY = ch * 0.75;
  const stickX = cw / 2; const stickY = floorY;
  ctx.globalAlpha = 0.12; ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
  for (let x = (frame * 0.5) % 60; x < cw; x += 60) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke(); }
  ctx.globalAlpha = 1;

  // Spark standing with smirk
  drawNeonStickman(ctx, stickX, stickY, 1, CYAN, frame, false, true, 1.5, 'smirk', false);

  const pulseRadius = (frame % 120) * 2;
  const pulseAlpha = Math.max(0, 0.5 - pulseRadius / 300);
  if (pulseAlpha > 0) {
    ctx.globalAlpha = pulseAlpha; ctx.strokeStyle = CYAN; ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = CYAN;
    ctx.beginPath(); ctx.arc(stickX, stickY - 25, pulseRadius, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + frame * 0.02;
    const dist = 50 + Math.sin(frame * 0.05 + i) * 30;
    ctx.shadowBlur = 5; ctx.shadowColor = i % 2 === 0 ? CYAN : LIME; ctx.fillStyle = i % 2 === 0 ? CYAN : LIME;
    ctx.beginPath(); ctx.arc(stickX + Math.cos(angle) * dist, stickY - 25 + Math.sin(angle) * dist * 0.6, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawEnemiesApproach(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const floorY = ch * 0.75;
  ctx.globalAlpha = 0.1; ctx.strokeStyle = RED; ctx.lineWidth = 1;
  for (let x = 0; x < cw; x += 60) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    const enemyX = cw - 100 - i * 80 - Math.min(frame * 1.5, 300) + i * 60;
    const color = i % 2 === 0 ? RED : PURPLE;
    drawNeonStickman(ctx, enemyX, floorY, -1, color, frame + i * 10, false, true, 1.2, 'angry', true);
  }
  if (frame % 60 < 10) { ctx.globalAlpha = 0.1; ctx.fillStyle = RED; ctx.fillRect(0, 0, cw, ch); }
  ctx.globalAlpha = 0.8; ctx.shadowBlur = 15; ctx.shadowColor = RED; ctx.strokeStyle = RED; ctx.lineWidth = 2;
  ctx.font = 'bold 20px monospace'; ctx.textAlign = 'right';
  ctx.strokeText('WARNING', cw - 30, 40);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawCombat(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const floorY = ch * 0.75;
  const playerX = cw * 0.3;
  const isShooting = frame % 30 < 10;
  drawNeonStickman(ctx, playerX, floorY, 1, CYAN, frame, isShooting, true, 1.3, isShooting ? 'determined' : 'smirk', false);
  if (frame % 15 < 10) {
    for (let i = 0; i < 3; i++) {
      drawBullet(ctx, playerX + 30 + ((frame + i * 40) % 300), floorY - 25 + Math.sin(i) * 5, 4, CYAN);
    }
  }
  const enemyX = cw * 0.7;
  const hitFlash = frame % 30 < 5;
  drawNeonStickman(ctx, enemyX, floorY, -1, hitFlash ? '#ffffff' : RED, frame, false, true, 1.3, 'hurt', false);
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const dist = 20 + Math.random() * 30;
    const pColor = i % 3 === 0 ? RED : i % 3 === 1 ? ORANGE : YELLOW;
    ctx.shadowBlur = 5; ctx.shadowColor = pColor; ctx.fillStyle = pColor;
    ctx.beginPath(); ctx.arc(enemyX + Math.cos(angle + frame * 0.1) * dist, floorY - 25 + Math.sin(angle + frame * 0.1) * dist, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBridgeScene(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#020008';
  ctx.fillRect(0, 0, cw, ch);
  const bridgeY = ch * 0.65;
  ctx.globalAlpha = 0.1;
  const voidGrad = ctx.createLinearGradient(0, bridgeY, 0, ch);
  voidGrad.addColorStop(0, '#0a0020'); voidGrad.addColorStop(1, '#000000');
  ctx.fillStyle = voidGrad;
  ctx.fillRect(0, bridgeY, cw, ch - bridgeY);
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.3; ctx.strokeStyle = PURPLE; ctx.lineWidth = 1;
  for (let x = (frame * 0.5) % 40; x < cw; x += 40) { ctx.beginPath(); ctx.moveTo(x, bridgeY); ctx.lineTo(x - 20, ch); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.8; ctx.shadowBlur = 10; ctx.shadowColor = PURPLE; ctx.strokeStyle = PURPLE; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, bridgeY); ctx.lineTo(cw, bridgeY); ctx.stroke();
  ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
  const railY = bridgeY - 60;
  ctx.beginPath(); ctx.moveTo(0, railY); ctx.lineTo(cw, railY); ctx.stroke();
  for (let x = 0; x < cw; x += 50) { ctx.beginPath(); ctx.moveTo(x, railY); ctx.lineTo(x, bridgeY); ctx.stroke(); }
  const walkX = cw * 0.3 + Math.min(frame * 1.5, cw * 0.2);
  drawNeonStickman(ctx, walkX, bridgeY, 1, CYAN, frame, false, true, 1.3, 'determined', true);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawRiddleGate(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const floorY = ch * 0.75;
  const gateX = cw / 2;
  ctx.globalAlpha = 0.1; ctx.strokeStyle = YELLOW; ctx.lineWidth = 1;
  for (let x = 0; x < cw; x += 50) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const gateW = 120; const gateH = 200; const gateTop = floorY - gateH;
  ctx.globalAlpha = 0.2; ctx.shadowBlur = 30; ctx.shadowColor = YELLOW; ctx.fillStyle = YELLOW;
  ctx.fillRect(gateX - gateW / 2 - 10, gateTop - 10, gateW + 20, gateH + 20);
  ctx.globalAlpha = 0.8; ctx.strokeStyle = YELLOW; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = YELLOW;
  ctx.strokeRect(gateX - gateW / 2, gateTop, gateW, gateH);
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const bx = gateX - gateW / 2 + 10 + i * 20;
    ctx.beginPath(); ctx.moveTo(bx, gateTop + 20); ctx.lineTo(bx, floorY); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawCoreRoom(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#030008';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch / 2;
  ctx.globalAlpha = 0.15; ctx.strokeStyle = PURPLE; ctx.lineWidth = 1;
  for (let r = 50; r < 400; r += 30) { ctx.beginPath(); ctx.arc(cx, cy, r + Math.sin(frame * 0.02 + r * 0.01) * 5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 0.4; ctx.shadowBlur = 50; ctx.shadowColor = PURPLE; ctx.fillStyle = PURPLE;
  ctx.beginPath(); ctx.arc(cx, cy, 30 + Math.sin(frame * 0.05) * 5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawBossIntro(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  const darkness = Math.min(1, frame / 120);
  ctx.fillStyle = `rgb(${Math.max(0, 2 - darkness * 2)}, 0, ${Math.max(0, 5 - darkness * 5)})`;
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch * 0.55;
  const bossSize = Math.min(frame, 200) / 200;
  if (bossSize > 0.3) {
    drawBoss(ctx, cx, cy + 80, -1, MAGENTA, frame, 100, 100);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawWalkingScene(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const floorY = ch * 0.75;
  ctx.globalAlpha = 0.1; ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
  for (let x = (frame * 0.5) % 60; x < cw; x += 60) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, ch); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const walkX = (frame * 1.5) % cw;
  drawNeonStickman(ctx, walkX, floorY, 1, CYAN, frame, false, true, 1.3, 'determined', true);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawExplosionScene(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2; const cy = ch / 2;
  const explosionSize = Math.min(frame * 2, 300);
  ctx.globalAlpha = Math.max(0, 0.5 - frame * 0.002);
  ctx.shadowBlur = 40; ctx.shadowColor = ORANGE; ctx.fillStyle = ORANGE;
  ctx.beginPath(); ctx.arc(cx, cy, explosionSize, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = Math.max(0, 0.3 - frame * 0.001);
  ctx.fillStyle = YELLOW;
  ctx.beginPath(); ctx.arc(cx, cy, explosionSize * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function applyGlitchEffect(ctx: CanvasRenderingContext2D, cw: number, ch: number, frame: number) {
  if (frame % 30 < 3) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff0000';
    const y = Math.random() * ch;
    ctx.fillRect(0, y, cw, 2 + Math.random() * 8);
    ctx.globalAlpha = 1;
  }
}
