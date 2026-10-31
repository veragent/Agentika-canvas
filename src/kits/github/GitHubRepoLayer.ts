/**
 * agentika-canvas: Realistic GitHub Repository UI Layer
 * Prevents "AI slop" by accurately rendering real GitHub UI elements:
 * - Precise repository header, public badge, and tabs
 * - Animated Stars Counter that smoothly ticks up across frames
 * - File list with commit header and clean markdown README viewer
 */

import { CanvasLayer, RenderContext } from '../../core/SceneGraph';
import { interpolate, Easing } from '../../core/Timeline';

export interface GitHubRepoConfig {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  owner?: string;
  repoName?: string;
  starStartFrame?: number;
  starEndFrame?: number;
  startStars?: number;
  targetStars?: number;
}

export class GitHubRepoLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  public owner: string;
  public repoName: string;

  public starStartFrame: number;
  public starEndFrame: number;
  public startStars: number;
  public targetStars: number;

  private currentStars = 0;

  constructor(config: GitHubRepoConfig) {
    this.id = config.id ?? 'github-repo-window';
    this.zIndex = config.zIndex ?? 10;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;

    this.owner = config.owner ?? 'agentika-ai';
    this.repoName = config.repoName ?? 'agentika-canvas';

    this.starStartFrame = config.starStartFrame ?? 20;
    this.starEndFrame = config.starEndFrame ?? 160;
    this.startStars = config.startStars ?? 48200;
    this.targetStars = config.targetStars ?? 354890;
    this.currentStars = this.startStars;
  }

  public update(rc: RenderContext): void {
    // Interpolate stars counter dynamically across timeline
    this.currentStars = Math.round(
      interpolate(
        rc.frame,
        [this.starStartFrame, this.starEndFrame],
        [this.startStars, this.targetStars],
        Easing.easeOutExpo
      )
    );
  }

  public draw(rc: RenderContext): void {
    const { ctx } = rc;
    ctx.save();

    // 1. Window Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 18;

    // 2. Window Frame Background
    const radius = 12;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fillStyle = '#0d1117'; // Official GitHub Dark background
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#30363d'; // GitHub border color
    ctx.stroke();

    // 3. Browser Window Title Bar
    const titleBarH = 40;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, titleBarH, [radius, radius, 0, 0]);
    ctx.fillStyle = '#161b22';
    ctx.fill();

    // Traffic Lights
    this.drawTrafficLights(ctx, this.x + 18, this.y + titleBarH / 2);

    // URL address pill in titlebar
    const urlPillW = 440;
    const urlPillH = 26;
    const urlPillX = this.x + (this.width - urlPillW) / 2;
    const urlPillY = this.y + (titleBarH - urlPillH) / 2;
    ctx.beginPath();
    ctx.roundRect(urlPillX, urlPillY, urlPillW, urlPillH, 6);
    ctx.fillStyle = '#0d1117';
    ctx.fill();
    ctx.strokeStyle = '#30363d';
    ctx.stroke();

    ctx.fillStyle = '#8b949e';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`github.com/${this.owner}/${this.repoName}`, urlPillX + urlPillW / 2, urlPillY + urlPillH / 2);

    // 4. GitHub Repo Header Section
    const contentY = this.y + titleBarH + 20;
    const contentX = this.x + 24;

    // Breadcrumb: owner / repoName + Public badge
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.fillStyle = '#58a6ff'; // GitHub link blue
    ctx.fillText(this.owner, contentX, contentY);

    const ownerW = ctx.measureText(this.owner).width;
    ctx.fillStyle = '#8b949e';
    ctx.fillText(' / ', contentX + ownerW, contentY);

    const slashW = ctx.measureText(' / ').width;
    ctx.fillStyle = '#58a6ff';
    ctx.fillText(this.repoName, contentX + ownerW + slashW, contentY);

    const repoW = ctx.measureText(this.repoName).width;
    const badgeX = contentX + ownerW + slashW + repoW + 12;

    // "Public" badge pill
    ctx.beginPath();
    ctx.roundRect(badgeX, contentY - 14, 52, 20, 10);
    ctx.strokeStyle = '#30363d';
    ctx.stroke();
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('Public', badgeX + 10, contentY - 1);

    // 5. Star & Fork Button group on top right
    this.drawStarButtonGroup(ctx, this.x + this.width - 24, contentY);

    // 6. Navigation Tabs (Code, Issues, Pull Requests, Actions)
    const tabsY = contentY + 28;
    this.drawRepoTabs(ctx, contentX, tabsY);

    // 7. Commit Header & File Table
    const tableY = tabsY + 36;
    this.drawRepoTable(ctx, contentX, tableY, this.width - 48);

    // 8. README Preview Box
    const readmeY = tableY + 140;
    const readmeH = this.height - (readmeY - this.y) - 20;
    if (readmeH > 80) {
      this.drawReadmeBox(ctx, contentX, readmeY, this.width - 48, readmeH);
    }

    ctx.restore();
  }

  private drawTrafficLights(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    const r = 5.5;
    // Red
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5f56';
    ctx.fill();
    // Yellow
    ctx.beginPath();
    ctx.arc(x + 18, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffbd2e';
    ctx.fill();
    // Green
    ctx.beginPath();
    ctx.arc(x + 36, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#27c93f';
    ctx.fill();
  }

  private drawStarButtonGroup(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rightX: number,
    y: number
  ): void {
    // Star button pill
    const starBtnW = 120;
    const starBtnH = 28;
    const starBtnX = rightX - starBtnW;
    const starBtnY = y - 16;

    ctx.beginPath();
    ctx.roundRect(starBtnX, starBtnY, starBtnW, starBtnH, 6);
    ctx.fillStyle = '#21262d';
    ctx.fill();
    ctx.strokeStyle = '#30363d';
    ctx.stroke();

    // Star Icon (Yellow)
    ctx.fillStyle = '#e3b341';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', starBtnX + 10, starBtnY + starBtnH / 2);

    ctx.fillStyle = '#c9d1d9';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('Star', starBtnX + 26, starBtnY + starBtnH / 2);

    // Counter badge inside button
    const formattedStars = this.currentStars >= 1000
      ? `${(this.currentStars / 1000).toFixed(1)}k`
      : `${this.currentStars}`;

    ctx.fillStyle = '#30363d';
    ctx.fillRect(starBtnX + 62, starBtnY + 4, 1, starBtnH - 8);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#f0f6fc';
    ctx.fillText(formattedStars, starBtnX + 72, starBtnY + starBtnH / 2);
  }

  private drawRepoTabs(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    ctx.font = '13px system-ui';
    ctx.textBaseline = 'top';

    // Active "Code" tab with orange underline
    ctx.fillStyle = '#f0f6fc';
    ctx.fillText('⟨/⟩  Code', x, y);
    const codeW = ctx.measureText('⟨/⟩  Code').width;
    ctx.fillStyle = '#f78166';
    ctx.fillRect(x - 2, y + 20, codeW + 4, 2);

    // Inactive tabs
    ctx.fillStyle = '#8b949e';
    let tabX = x + codeW + 28;
    const otherTabs = ['Issues  12', 'Pull requests  3', 'Actions', 'Security'];
    for (const tab of otherTabs) {
      ctx.fillText(tab, tabX, y);
      tabX += ctx.measureText(tab).width + 24;
    }

    // Separator line under tabs
    ctx.fillStyle = '#21262d';
    ctx.fillRect(x, y + 21, this.width - 48, 1);
  }

  private drawRepoTable(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    // Commit Header Box
    ctx.beginPath();
    ctx.roundRect(x, y, width, 36, [6, 6, 0, 0]);
    ctx.fillStyle = '#161b22';
    ctx.fill();
    ctx.strokeStyle = '#30363d';
    ctx.stroke();

    // Commit Message
    ctx.fillStyle = '#c9d1d9';
    ctx.font = '12px system-ui';
    ctx.textBaseline = 'middle';
    ctx.fillText('feat(core): implement dynamic z-index SceneGraph & WebCodecs pipeline', x + 14, y + 18);

    // Commit Hash & Time
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('9f4b1e2 · 2 hours ago', x + width - 14, y + 18);

    // File rows
    const files = [
      { name: '📁 public/wasm-files', desc: 'web-demuxer.wasm binary for multi-format demuxing', time: '1 day ago' },
      { name: '📁 src/core', desc: 'SceneGraph, Timeline interpolator & WebCodecs Engine', time: '2 hours ago' },
      { name: '📄 package.json', desc: 'deps: mediabunny, web-demuxer, react 19, vite 6', time: '3 hours ago' },
      { name: '📄 PRD.md', desc: 'product requirements: $0 server canvas video engine', time: '5 hours ago' },
    ];

    let rowY = y + 36;
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isLast = i === files.length - 1;

      ctx.beginPath();
      if (isLast) {
        ctx.roundRect(x, rowY, width, 26, [0, 0, 6, 6]);
      } else {
        ctx.rect(x, rowY, width, 26);
      }
      ctx.fillStyle = i % 2 === 0 ? '#0d1117' : '#161b22';
      ctx.fill();
      ctx.strokeStyle = '#30363d';
      ctx.stroke();

      ctx.fillStyle = '#58a6ff';
      ctx.fillText(file.name, x + 14, rowY + 13);

      ctx.fillStyle = '#8b949e';
      ctx.fillText(file.desc, x + 200, rowY + 13);

      ctx.textAlign = 'right';
      ctx.fillText(file.time, x + width - 14, rowY + 13);
      ctx.textAlign = 'left';

      rowY += 26;
    }
  }

  private drawReadmeBox(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // README Container Box
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fillStyle = '#0d1117';
    ctx.fill();
    ctx.strokeStyle = '#30363d';
    ctx.stroke();

    // Header bar
    ctx.fillStyle = '#161b22';
    ctx.fillRect(x, y, width, 32);
    ctx.fillStyle = '#f0f6fc';
    ctx.font = 'bold 12px system-ui';
    ctx.textBaseline = 'middle';
    ctx.fillText('📖 README.md', x + 14, y + 16);

    // Markdown content inside
    ctx.fillStyle = '#f0f6fc';
    ctx.font = 'bold 18px system-ui';
    ctx.fillText('# agentika-canvas', x + 20, y + 56);

    ctx.font = '13px system-ui';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('High-performance in-browser programmatic video generator with $0 server cost.', x + 20, y + 84);

    // Code block badge
    ctx.fillStyle = '#161b22';
    ctx.fillRect(x + 20, y + 104, width - 40, 34);
    ctx.strokeStyle = '#30363d';
    ctx.strokeRect(x + 20, y + 104, width - 40, 34);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px monospace';
    ctx.fillText('$ npm install mediabunny web-demuxer', x + 34, y + 121);
  }
}
