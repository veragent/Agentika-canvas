/**
 * agentika-canvas: Database-Driven Quiz Video Template Layer
 * Automated video generator for educational quiz channels (e.g. Kuis Cerdas ID).
 * Renders category badge, question prompt, multiple choice cards (A, B, C, D),
 * circular countdown timer, and deterministic answer reveal.
 */

import { CanvasLayer, RenderContext } from '../../core/SceneGraph';
import { interpolate, Easing } from '../../core/Timeline';

export interface QuizItem {
  id: string | number;
  category: string;
  question: string;
  options: [string, string, string, string]; // Exactly 4 choices
  correctIndex: 0 | 1 | 2 | 3; // 0=A, 1=B, 2=C, 3=D
  explanation?: string;
  countdownSeconds?: number;
}

export interface QuizLayerConfig {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  quizItem: QuizItem;
  startFrame?: number;
  countdownFrames?: number; // e.g. 5 seconds * 60 fps = 300 frames
  revealDurationFrames?: number; // e.g. 2 seconds * 60 fps = 120 frames
}

export class QuizTemplateLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  public quizItem: QuizItem;
  public startFrame: number;
  public countdownFrames: number;
  public revealDurationFrames: number;

  private currentProgress = 0; // 1.0 down to 0.0 during countdown
  private isRevealed = false;
  private revealProgress = 0; // 0.0 to 1.0 when revealing answer

  constructor(config: QuizLayerConfig) {
    this.id = config.id ?? 'quiz-template-layer';
    this.zIndex = config.zIndex ?? 10;

    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width = config.width ?? 1920;
    this.height = config.height ?? 1080;

    this.quizItem = config.quizItem;
    this.startFrame = config.startFrame ?? 30;
    this.countdownFrames = config.countdownFrames ?? 240; // 4 seconds at 60fps
    this.revealDurationFrames = config.revealDurationFrames ?? 120; // 2 seconds at 60fps
  }

  public update(rc: RenderContext): void {
    const endCountdownFrame = this.startFrame + this.countdownFrames;
    const endRevealFrame = endCountdownFrame + this.revealDurationFrames;

    if (rc.frame < this.startFrame) {
      this.currentProgress = 1.0;
      this.isRevealed = false;
      this.revealProgress = 0;
    } else if (rc.frame <= endCountdownFrame) {
      // Countdown phase: Progress shrinks from 1.0 down to 0.0
      this.currentProgress = interpolate(
        rc.frame,
        [this.startFrame, endCountdownFrame],
        [1.0, 0.0],
        Easing.linear
      );
      this.isRevealed = false;
      this.revealProgress = 0;
    } else if (rc.frame <= endRevealFrame) {
      // Reveal phase: Correct answer glows and reveals explanation
      this.currentProgress = 0;
      this.isRevealed = true;
      this.revealProgress = interpolate(
        rc.frame,
        [endCountdownFrame, endCountdownFrame + 30],
        [0.0, 1.0],
        Easing.easeOutBack
      );
    } else {
      this.currentProgress = 0;
      this.isRevealed = true;
      this.revealProgress = 1.0;
    }
  }

  public draw(rc: RenderContext): void {
    const { ctx } = rc;
    ctx.save();

    // 1. Sleek Gradient Studio Background
    const bgGrad = ctx.createRadialGradient(
      this.x + this.width / 2,
      this.y + this.height * 0.4,
      50,
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width * 0.7
    );
    bgGrad.addColorStop(0, '#1e1b4b'); // Deep indigo
    bgGrad.addColorStop(0.6, '#0f172a'); // Slate 900
    bgGrad.addColorStop(1, '#020617'); // Pitch dark
    ctx.fillStyle = bgGrad;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // 2. Top Category Badge
    const catBadgeW = 260;
    const catBadgeH = 36;
    const catBadgeX = this.x + (this.width - catBadgeW) / 2;
    const catBadgeY = this.y + 60;

    ctx.beginPath();
    ctx.roundRect(catBadgeX, catBadgeY, catBadgeW, catBadgeH, 18);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚡ ${this.quizItem.category.toUpperCase()}`, catBadgeX + catBadgeW / 2, catBadgeY + catBadgeH / 2);

    // 3. Question Card Box
    const qBoxW = 1400;
    const qBoxH = 160;
    const qBoxX = this.x + (this.width - qBoxW) / 2;
    const qBoxY = catBadgeY + 60;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;

    ctx.beginPath();
    ctx.roundRect(qBoxX, qBoxY, qBoxW, qBoxH, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Question Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.quizItem.question, qBoxX + qBoxW / 2, qBoxY + qBoxH / 2);

    // 4. Circular Countdown Timer
    const timerRadius = 42;
    const timerCenterX = this.x + this.width / 2;
    const timerCenterY = qBoxY + qBoxH + 65;

    this.drawTimer(ctx, timerCenterX, timerCenterY, timerRadius);

    // 5. Multiple Choice Option Cards (2x2 Grid)
    const gridStartX = this.x + (this.width - qBoxW) / 2;
    const gridStartY = timerCenterY + 65;
    const cardW = (qBoxW - 32) / 2;
    const cardH = 90;
    const gapX = 32;
    const gapY = 20;

    const labels = ['A', 'B', 'C', 'D'] as const;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardX = gridStartX + col * (cardW + gapX);
      const cardY = gridStartY + row * (cardH + gapY);

      this.drawOptionCard(ctx, cardX, cardY, cardW, cardH, labels[i], this.quizItem.options[i], i);
    }

    // 6. Explanation Banner (Appears during reveal phase)
    if (this.isRevealed && this.quizItem.explanation) {
      const expY = gridStartY + 2 * cardH + gapY + 20;
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, this.revealProgress);
      ctx.fillStyle = '#10b981';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`✓ Jawaban Benar: ${labels[this.quizItem.correctIndex]} — ${this.quizItem.explanation}`, this.x + this.width / 2, expY);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawTimer(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number
  ): void {
    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Progress arc
    if (this.currentProgress > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + this.currentProgress * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = this.currentProgress > 0.3 ? '#38bdf8' : '#ef4444'; // Turns red near end
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // Remaining seconds text inside
    const remainingSec = Math.ceil(this.currentProgress * (this.countdownFrames / 60));
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${remainingSec}`, cx, cy);
  }

  private drawOptionCard(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    text: string,
    index: number
  ): void {
    const isCorrect = index === this.quizItem.correctIndex;
    const isRevealing = this.isRevealed && isCorrect;

    ctx.save();

    // Box Container
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);

    if (isRevealing) {
      ctx.fillStyle = '#065f46'; // Emerald green
      ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
      ctx.shadowBlur = 20 * this.revealProgress;
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
    }
    ctx.fill();

    // Stroke
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = isRevealing ? 2.5 : 1;
    ctx.strokeStyle = isRevealing ? '#34d399' : '#334155';
    ctx.stroke();

    // Label circle (A, B, C, D)
    const circleR = 18;
    const circleX = x + 28;
    const circleY = y + h / 2;

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = isRevealing ? '#10b981' : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = isRevealing ? '#ffffff' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, circleX, circleY);

    // Option text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 62, y + h / 2);

    ctx.restore();
  }
}
