/**
 * agentika-canvas: Core SceneGraph & Dynamic z-index Layer Management
 * Solves Remotion's DOM z-index ordering limitation by maintaining a programmatic
 * canvas layer tree sorted ascendingly before each frame render.
 */

export interface RenderContext {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  frame: number;
  fps: number;
  timestampUs: number; // (frame * 1e6) / fps
  width: number;
  height: number;
}

export interface CanvasLayer {
  id: string;
  name?: string;
  zIndex: number;
  visible: boolean;
  opacity?: number;
  update(rc: RenderContext): void;
  draw(rc: RenderContext): void;
}

export class SceneGraph {
  private layers: Map<string, CanvasLayer> = new Map();

  constructor(initialLayers: CanvasLayer[] = []) {
    for (const layer of initialLayers) {
      this.addLayer(layer);
    }
  }

  /**
   * Register a new layer to the scene graph.
   */
  public addLayer(layer: CanvasLayer): this {
    this.layers.set(layer.id, layer);
    return this;
  }

  /**
   * Remove a layer by id.
   */
  public removeLayer(id: string): boolean {
    return this.layers.delete(id);
  }

  /**
   * Retrieve a layer by id.
   */
  public getLayer<T extends CanvasLayer = CanvasLayer>(id: string): T | undefined {
    return this.layers.get(id) as T | undefined;
  }

  /**
   * Get all registered layers.
   */
  public getAllLayers(): CanvasLayer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Return only currently visible layers, sorted ascending by zIndex.
   */
  public getSortedVisibleLayers(): CanvasLayer[] {
    return Array.from(this.layers.values())
      .filter((layer) => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Dynamic z-index management:
   * Bring target window/layer directly to top by setting zIndex = max(allZIndex) + 1.
   * Completely eliminates the need to re-order DOM nodes or JSX arrays.
   */
  public focusWindow(layerId: string, maxZCap = 900000): number {
    const target = this.layers.get(layerId);
    if (!target) {
      console.warn(`[SceneGraph] focusWindow: Layer '${layerId}' not found.`);
      return -1;
    }

    if (this.layers.size <= 1) {
      target.zIndex = 1;
      return target.zIndex;
    }

    let maxZ = -Infinity;
    for (const layer of this.layers.values()) {
      // Exclude system overlays (e.g. mouse cursor zIndex >= 900000) so windows never eclipse the cursor
      if (layer.zIndex < maxZCap && layer.zIndex > maxZ) {
        maxZ = layer.zIndex;
      }
    }

    if (maxZ === -Infinity) {
      maxZ = 0;
    }

    if (target.zIndex <= maxZ) {
      target.zIndex = maxZ + 1;
    }

    return target.zIndex;
  }

  /**
   * Alias for focusWindow
   */
  public bringToFront(layerId: string): number {
    return this.focusWindow(layerId);
  }

  /**
   * Send layer to the deepest background
   */
  public sendToBack(layerId: string): number {
    const target = this.layers.get(layerId);
    if (!target) return -1;

    let minZ = Infinity;
    for (const layer of this.layers.values()) {
      if (layer.zIndex < minZ) {
        minZ = layer.zIndex;
      }
    }

    target.zIndex = minZ - 1;
    return target.zIndex;
  }

  /**
   * Render single frame:
   * 1. Sort all visible layers by zIndex ascending.
   * 2. Call layer.update(rc)
   * 3. Call layer.draw(rc) inside save/restore state container.
   */
  public renderFrame(rc: RenderContext): void {
    const sorted = this.getSortedVisibleLayers();

    for (const layer of sorted) {
      layer.update(rc);

      rc.ctx.save();
      if (typeof layer.opacity === 'number' && layer.opacity < 1.0) {
        rc.ctx.globalAlpha *= Math.max(0, Math.min(1, layer.opacity));
      }
      layer.draw(rc);
      rc.ctx.restore();
    }
  }

  /**
   * Clear all layers
   */
  public clear(): void {
    this.layers.clear();
  }
}
