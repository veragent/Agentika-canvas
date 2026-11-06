/**
 * agentika-canvas: Scene Pack (Scene-as-Directory) — core registry
 *
 * Inspired by Nouride's "an agent is a directory of Markdown, not a process":
 * a scene is likewise a *directory*, not a single loose .ts file. Each pack:
 *
 *   src/scenes/<id>/
 *   ├── IDENTITY.md   Human-readable manifest (name, tags, kits, style, fps)
 *   └── scene.ts      Exports createScene(fps?): SceneBundle
 *
 * IDENTITY.md is parseable by humans AND machines (light `- key: value`
 * format — no YAML dependency). The registry is framework-agnostic (works in
 * Node CLI and browser); environment-specific loaders live in
 * `loaders.vite.ts` (browser) and `cli/index.ts` (Node fs scan).
 */

import { SceneBundle } from '../core/SceneBundle';

export interface ScenePackManifest {
  id: string;
  name: string;
  description: string;
  tags: string[];
  kits: string[];
  style: string;
  fps: number;
  resolution: string;
  version: string;
}

/** The module contract every pack scene.ts must satisfy. */
export interface ScenePackModule {
  createScene: (fps?: number) => SceneBundle;
}

export interface ScenePackEntry {
  manifest: ScenePackManifest;
  loadModule: () => Promise<ScenePackModule>;
  /** Convenience: instantiate a fresh SceneBundle (fresh state each call). */
  loadScene: (fps?: number) => Promise<SceneBundle>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'scene';
}

/**
 * Parse an IDENTITY.md manifest body.
 * Format:
 *   # Display Name
 *   - id: my-scene
 *   - description: ...
 *   - tags: a, b
 *   - kits: macos, github
 *   - style: nesi-nowware
 *   - fps: 60
 *   - resolution: 1920x1080
 *   - version: 1.0.0
 * Unknown keys are ignored; missing values fall back to sane defaults.
 */
export function parseIdentityMd(content: string): ScenePackManifest {
  const lines = content.split('\n');
  let name = '';
  const fields: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!name && line.startsWith('# ')) {
      name = line.replace(/^#\s+/, '').trim();
      continue;
    }

    if (line.startsWith('-')) {
      const body = line.replace(/^-\s*/, '');
      const colonIdx = body.indexOf(':');
      if (colonIdx > 0) {
        const key = body.slice(0, colonIdx).trim().toLowerCase();
        const value = body.slice(colonIdx + 1).trim();
        if (key) fields[key] = value;
      }
    }
  }

  const id = fields['id'] || slugify(name || 'untitled-scene');
  const fps = Number.parseInt(fields['fps'] ?? '', 10);

  return {
    id,
    name: fields['name'] || name || id,
    description: fields['description'] || '',
    tags: (fields['tags'] || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    kits: (fields['kits'] || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    style: fields['style'] || 'default',
    fps: Number.isFinite(fps) && fps > 0 ? fps : 60,
    resolution: fields['resolution'] || '1920x1080',
    version: fields['version'] || '0.0.0',
  };
}

/** Render a manifest back into IDENTITY.md content (used by CLI generation). */
export function renderIdentityMd(manifest: ScenePackManifest): string {
  const list = (items: string[]): string => (items.length ? items.join(', ') : '');
  return `# ${manifest.name}

- id: ${manifest.id}
- name: ${manifest.name}
- description: ${manifest.description}
- tags: ${list(manifest.tags)}
- kits: ${list(manifest.kits)}
- style: ${manifest.style}
- fps: ${manifest.fps}
- resolution: ${manifest.resolution}
- version: ${manifest.version}
`;
}

/**
 * Framework-agnostic Scene Pack registry.
 * Loaders (Vite glob / Node fs) register entries here; the Studio and the
 * mission pipeline consume them.
 */
export class ScenePackRegistry {
  private packs = new Map<string, ScenePackEntry>();

  public register(entry: ScenePackEntry): this {
    this.packs.set(entry.manifest.id, entry);
    return this;
  }

  public get(id: string): ScenePackEntry | undefined {
    return this.packs.get(id);
  }

  public has(id: string): boolean {
    return this.packs.has(id);
  }

  public list(): ScenePackManifest[] {
    return Array.from(this.packs.values()).map((e) => e.manifest);
  }

  public size(): number {
    return this.packs.size;
  }

  public clear(): void {
    this.packs.clear();
  }
}

/** Shared singleton registry instance. */
export const scenePackRegistry = new ScenePackRegistry();
