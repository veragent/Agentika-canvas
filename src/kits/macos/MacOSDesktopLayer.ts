/**
 * agentika-canvas: macOS Desktop Environment Layer
 * Renders high-fidelity macOS wallpaper, top menu bar with Apple logo,
 * status tray (WiFi, Battery, Control Center, Clock), and optional dock.
 */

import { CanvasLayer, RenderContext } from '../../core/SceneGraph';

export interface DesktopConfig {
  wallpaperStyle?: 'ventura' | 'sonoma' | 'sequoia' | 'dark-slate';
  showMenuBar?: boolean;
  activeAppName?: string;
}

export class MacOSDesktopLayer implements CanvasLayer {
  public id = 'macos-desktop-env';
  public zIndex = 0; // Deepest background layer
  public visible = true;

  public wallpaperStyle: DesktopConfig['wallpaperStyle'];
  public showMenuBar: boolean;
  public activeAppName: string;

  constructor(config: DesktopConfig = {}) {
    this.wallpaperStyle = config.wallpaperStyle ?? 'sequoia';
    this.showMenuBar = config.showMenuBar ?? true;
    this.activeAppName = config.activeAppName ?? 'Code';
  }

  public update(_rc: RenderContext): void {}

  public draw(rc: RenderContext): void {
    const { ctx, width, height } = rc;

    // 1. Wallpaper Gradient
    this.drawWallpaper(ctx, width, height);

    // 2. Top Menu Bar
    if (this.showMenuBar) {
      this.drawMenuBar(ctx, width, rc);
    }
  }

  private drawWallpaper(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gradient = ctx.createRadialGradient(
      width * 0.7,
      height * 0.3,
      width * 0.1,
      width * 0.5,
      height * 0.5,
      width * 0.85
    );

    if (this.wallpaperStyle === 'sequoia') {
      gradient.addColorStop(0, '#38bdf8'); // Sky blue
      gradient.addColorStop(0.35, '#1e1b4b'); // Deep indigo
      gradient.addColorStop(0.7, '#0f172a'); // Slate 900
      gradient.addColorStop(1, '#020617'); // Pitch dark slate
    } else {
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(0.5, '#1e293b');
      gradient.addColorStop(1, '#090d16');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle ambient lighting mesh
    ctx.save();
    ctx.globalAlpha = 0.15;
    const glowGrad = ctx.createLinearGradient(0, 0, width, height);
    glowGrad.addColorStop(0, '#f43f5e'); // Rose
    glowGrad.addColorStop(0.5, 'transparent');
    glowGrad.addColorStop(1, '#06b6d4'); // Cyan
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private drawMenuBar(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    rc: RenderContext
  ): void {
    const barHeight = 32;

    // Translucent blurred-look glass bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, width, barHeight);

    // Bottom hairline separator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, barHeight - 1, width, 1);

    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    const textY = barHeight / 2;

    // 1. Apple Logo
    ctx.font = 'bold 15px system-ui';
    ctx.fillText('', 20, textY + 1);

    // 2. Active App Name (Bold)
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(this.activeAppName, 44, textY);

    // 3. Menus (File, Edit, View, Window, Help)
    ctx.font = '400 13px system-ui';
    const menus = ['File', 'Edit', 'Selection', 'View', 'Go', 'Terminal', 'Help'];
    let menuX = 96;
    for (const menu of menus) {
      ctx.fillText(menu, menuX, textY);
      menuX += ctx.measureText(menu).width + 18;
    }

    // 4. Right Status Tray (Battery, WiFi, Control Center, Clock)
    ctx.textAlign = 'right';
    const timeFormatted = 'Sat 16:33';
    ctx.fillText(timeFormatted, width - 20, textY);

    // Control center icon (pill sliders)
    ctx.fillText('􀜊', width - 96, textY);

    // Battery / WiFi
    ctx.font = '12px system-ui';
    ctx.fillText('100% ⚡', width - 136, textY);
    ctx.fillText('Wi-Fi', width - 198, textY);

    // Timestamp microsecond readout
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.fillText(`t: ${rc.timestampUs}µs [f:${rc.frame}]`, width - 260, textY);

    ctx.restore();
  }
}
