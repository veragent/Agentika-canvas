/**
 * agentika-canvas: Scene Pack loader for Vite/browser (Studio)
 *
 * Discovers every scene-pack directory under src/scenes at build time via
 * import.meta.glob (lazy, so scenes are code-split) and registers them into
 * the shared scenePackRegistry. IDENTITY.md files are imported as raw text.
 * In dev mode Vite hot-updates the glob when packs are added or removed.
 */

import {
  parseIdentityMd,
  scenePackRegistry,
  ScenePackEntry,
  ScenePackModule,
} from './ScenePack';

const sceneModules = import.meta.glob('../scenes/*/scene.ts') as Record<
  string,
  () => Promise<ScenePackModule>
>;

const identityFiles = import.meta.glob('../scenes/*/IDENTITY.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const dirOf = (modulePath: string): string => {
  const slash = modulePath.lastIndexOf('/');
  return slash >= 0 ? modulePath.slice(0, slash) : '';
};

export interface DiscoveredPack {
  manifest: { id: string; name: string; tags: string[]; kits: string[]; fps: number; resolution: string; version: string };
  skipped?: string;
}

/**
 * Discover all packs, register them into the registry, and return their
 * manifests for UI listing. Packs without IDENTITY.md are skipped with a
 * reason (a pack is not a pack without an identity).
 */
export async function loadScenePacks(): Promise<DiscoveredPack[]> {
  const found: DiscoveredPack[] = [];

  for (const [scenePath, loadModule] of Object.entries(sceneModules)) {
    const dir = dirOf(scenePath);
    const identityLoader = identityFiles[`${dir}/IDENTITY.md`];

    if (!identityLoader) {
      found.push({
        manifest: {
          id: dir.split('/').pop() || 'unknown',
          name: dir.split('/').pop() || 'unknown',
          tags: [],
          kits: [],
          fps: 60,
          resolution: '1920x1080',
          version: '0.0.0',
        },
        skipped: 'IDENTITY.md tidak ditemukan — bukan scene pack yang valid',
      });
      continue;
    }

    const raw = await identityLoader();
    const manifest = parseIdentityMd(raw);

    if (scenePackRegistry.has(manifest.id)) continue; // already registered

    const entry: ScenePackEntry = {
      manifest,
      loadModule,
      loadScene: async (fps?: number) => (await loadModule()).createScene(fps),
    };
    scenePackRegistry.register(entry);
    found.push({ manifest });
  }

  return found;
}
