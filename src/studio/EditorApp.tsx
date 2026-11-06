/**
 * agentika-canvas: Main Studio Editor & Timeline Workspace
 * Integrated 1080p Canvas, Frame Scrubber, Layer Inspector, and Export Controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasVideoEngine } from '../core/Engine';
import { Camera } from '../core/Camera';
import { MacOSDesktopLayer } from '../kits/macos/MacOSDesktopLayer';
import { WindowLayer } from '../kits/macos/WindowLayer';
import { WebcamWindowLayer } from '../kits/macos/WebcamWindowLayer';
import { GitHubRepoLayer } from '../kits/github/GitHubRepoLayer';
import { CursorLayer } from '../kits/macos/CursorLayer';
import { ExternalVideoLayer } from '../kits/ExternalVideoLayer';
import { checkWebCodecsSupport, WebCodecsCapabilities } from '../core/Capabilities';
import { FrameInspector, FrameDiagnosticInfo } from './FrameInspector';
import { exportVideo, downloadBlob } from '../media/MediaExporter';
import { SceneBundle } from '../core/SceneBundle';
import { SceneGraph } from '../core/SceneGraph';
import { runMission } from '../missions/MissionRunner';
import { MissionReport } from '../missions/types';
import { assertMissionPassed, estimateExport } from '../missions/exportGate';
import { loadScenePacks, DiscoveredPack } from '../packs/loaders.vite';
import { scenePackRegistry } from '../packs/ScenePack';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Cpu,
  Video,
  CheckCircle2,
  XCircle,
  Download,
  Camera as CameraIcon,
  Eye,
  EyeOff,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

/**
 * Build the Studio's default inline scene (Phase 4 demo layout).
 * Extracted to module level so the Render Mission pipeline can instantiate
 * FRESH copies of the exact scene shown on canvas.
 */
function buildStudioDefaultScene(enableShake: boolean, shakeIntensity: number): SceneBundle {
  const localTotalFrames = 360; // 6 seconds @ 60fps
  const localFps = 60;

  const camera = new Camera({
    enableShake,
    shakeIntensity,
    shakeFrequency: 1.2,
    rotationalShake: 0.0012,
  });

  const sceneGraph = new SceneGraph();

  const engine = new CanvasVideoEngine(
    {
      width: 1920,
      height: 1080,
      fps: localFps,
      durationInFrames: localTotalFrames,
      camera,
      backgroundColor: '#020617',
    },
    sceneGraph
  );

  const desktop = new MacOSDesktopLayer({ wallpaperStyle: 'sequoia', activeAppName: 'GitHub Desktop' });

  const github = new GitHubRepoLayer({
    id: 'win-github',
    x: 80,
    y: 60,
    width: 1180,
    height: 720,
    zIndex: 10,
    owner: 'agentika-ai',
    repoName: 'agentika-canvas',
    starStartFrame: 30,
    starEndFrame: 160,
    startStars: 48200,
    targetStars: 354890,
  });

  const terminal = new WindowLayer({
    id: 'win-terminal',
    title: 'Antigravity CLI — v1.4.12 (ARM64)',
    x: 760,
    y: 380,
    width: 860,
    height: 480,
    zIndex: 20,
    accentColor: '#10b981',
    contentRenderer: (rc, x, y, w, h) => {
      const { ctx } = rc;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = '#10b981';
      ctx.font = '14px monospace';
      ctx.fillText('$ agy run-phase-4 --editor-studio=true', x + 16, y + 28);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('✓ Frame Inspector: frame-by-frame diagnostic readout', x + 16, y + 56);
      ctx.fillText('✓ AI Slop Prompt Logger: copy structured revision prompts', x + 16, y + 80);
      ctx.fillText('✓ Export MP4 Modal: 1-click in-browser export trigger', x + 16, y + 104);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`[Studio Scrubber] Frame: ${rc.frame} | ${rc.timestampUs} µs`, x + 16, y + 140);
    },
  });

  const webcam = new WebcamWindowLayer({
    id: 'win-webcam',
    x: 1420,
    y: 80,
    width: 380,
    height: 380,
    zIndex: 50,
    presenterName: 'Alex Developer',
    resizeStartFrame: 140,
    resizeEndFrame: 220,
    targetScale: 0.68,
    targetX: 1540,
    targetY: 620,
  });

  const externalVideo = new ExternalVideoLayer({
    id: 'win-ext-video',
    title: 'Demo Reel — ScreenCapture.mp4',
    x: 240,
    y: 360,
    width: 700,
    height: 390,
    zIndex: 15,
    timelineStartFrame: 0,
    timelineEndFrame: localTotalFrames,
  });

  const cursor = new CursorLayer([
    { frame: 0, point: { x: 300, y: 200 }, type: 'default' },
    { frame: 30, point: { x: 1140, y: 142 }, type: 'pointer' },
    { frame: 70, point: { x: 1140, y: 142 }, type: 'pointer' },
    { frame: 100, point: { x: 920, y: 440 }, type: 'default' },
    { frame: 135, point: { x: 1420, y: 80 }, type: 'resize' },
    { frame: 220, point: { x: 1540, y: 620 }, type: 'resize' },
    { frame: 240, point: { x: 1480, y: 600 }, type: 'default' },
    { frame: 360, point: { x: 800, y: 500 }, type: 'default' },
  ]);

  sceneGraph.addLayer(desktop);
  sceneGraph.addLayer(github);
  sceneGraph.addLayer(externalVideo);
  sceneGraph.addLayer(terminal);
  sceneGraph.addLayer(webcam);
  sceneGraph.addLayer(cursor);

  return { engine, sceneGraph, camera, totalFrames: localTotalFrames };
}

export const EditorApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CanvasVideoEngine | null>(null);

  const [capabilities, setCapabilities] = useState<WebCodecsCapabilities | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspector' | 'layers' | 'camera'>('inspector');
  const [cameraShake, setCameraShake] = useState(true);
  const [cameraIntensity, setCameraIntensity] = useState(1.8);
  const [layersList, setLayersList] = useState<Array<{ id: string; zIndex: number; visible: boolean; title: string }>>([]);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFps, setExportFps] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  // Scene Pack & Mission State (Render Mission Pipeline)
  const totalFrames = 360; // 6 seconds at 60 fps (Studio default scene)
  const fps = 60;
  const [sceneTotalFrames, setSceneTotalFrames] = useState(totalFrames);
  const [packs, setPacks] = useState<DiscoveredPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('__studio__');
  const [missionReport, setMissionReport] = useState<MissionReport | null>(null);
  const [missionRunning, setMissionRunning] = useState(false);
  const [missionError, setMissionError] = useState<string | null>(null);
  const [exportGateMsg, setExportGateMsg] = useState<string | null>(null);

  // Scene-swap bookkeeping
  const sceneFactoryRef = useRef<(() => SceneBundle) | null>(null);
  const unsubFrameRef = useRef<(() => void) | null>(null);

  // Sync layers list from engine
  const refreshLayers = useCallback(() => {
    if (!engineRef.current) return;
    const all = engineRef.current.sceneGraph.getAllLayers();
    setLayersList(
      all.map((l) => ({
        id: l.id,
        zIndex: l.zIndex,
        visible: l.visible,
        title: (l as any).title || l.id,
      }))
    );
  }, []);

  /**
   * Adopt a SceneBundle: bind it to the live canvas, rewire frame listeners,
   * reset mission state. Used by mount, scene-pack swap, and default rebuild.
   */
  const adoptBundle = useCallback(
    (bundle: SceneBundle, factory: () => SceneBundle) => {
      engineRef.current?.pause();
      unsubFrameRef.current?.();

      engineRef.current = bundle.engine;
      sceneFactoryRef.current = factory;

      if (canvasRef.current) {
        bundle.engine.attachCanvas(canvasRef.current);
      }

      unsubFrameRef.current = bundle.engine.onFrame((frame) => {
        setCurrentFrame(frame);
      });

      setSceneTotalFrames(bundle.totalFrames);
      setCurrentFrame(0);
      setMissionReport(null);
      setMissionError(null);
      setExportGateMsg(null);

      refreshLayers();
      bundle.engine.renderAtFrame(0);
    },
    [refreshLayers]
  );

  /** Load a scene pack (or rebuild the Studio default scene) into the canvas. */
  const handleSelectPack = useCallback(
    async (packId: string) => {
      setSelectedPackId(packId);

      if (packId === '__studio__') {
        const factory = () => buildStudioDefaultScene(cameraShake, cameraIntensity);
        adoptBundle(factory(), factory);
        return;
      }

      const entry = scenePackRegistry.get(packId);
      if (!entry) {
        setMissionError(`Scene pack '${packId}' tidak ditemukan di registry.`);
        return;
      }

      try {
        const mod = await entry.loadModule();
        const factory = (): SceneBundle => mod.createScene(fps);
        adoptBundle(factory(), factory);
      } catch (err) {
        setMissionError(`Gagal memuat pack '${packId}': ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [adoptBundle, cameraShake, cameraIntensity, fps]
  );

  /** Browser pixel probe: luma statistics of a rendered frame on the live canvas. */
  const pixelProbe = useCallback(
    (frame: number): { mean: number; variance: number } | null => {
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (!engine || !canvas) return null;

      const prevFrame = engine.getCurrentFrame();
      engine.renderAtFrame(frame);
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        let sumSq = 0;
        let n = 0;
        const stride = 256; // sample every 64th pixel
        for (let i = 0; i + 2 < data.length; i += stride * 4) {
          const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          sum += luma;
          sumSq += luma * luma;
          n++;
        }
        engine.renderAtFrame(prevFrame);
        if (n === 0) return null;
        const mean = sum / n;
        return { mean, variance: sumSq / n - mean * mean };
      } catch {
        engine.renderAtFrame(prevFrame);
        return null;
      }
    },
    []
  );

  /** Run the Render Mission pipeline (checks + reviewer) against the CURRENT scene. */
  const runMissionCheck = useCallback(async () => {
    const factory = sceneFactoryRef.current;
    if (!factory) {
      setMissionError('Scene factory belum siap.');
      return;
    }
    setMissionRunning(true);
    setMissionError(null);
    try {
      const report = await runMission(
        factory,
        {
          sceneId: selectedPackId === '__studio__' ? 'studio-default' : selectedPackId,
          maxAttempts: 3,
          sampleFrames: 12,
        },
        { pixelProbe }
      );
      setMissionReport(report);
    } catch (err) {
      setMissionError(`Mission error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setMissionRunning(false);
    }
  }, [pixelProbe, selectedPackId]);

  useEffect(() => {
    // 1. Check WebCodecs Capabilities
    checkWebCodecsSupport().then((caps) => {
      setCapabilities(caps);
    });

    // 2. Discover Scene Packs (registry + manifests for the selector)
    loadScenePacks().then(setPacks).catch(() => {
      /* pack discovery is best-effort; the default scene still works */
    });

    // 3. Build & adopt the default Studio scene (camera + engine + layers)
    const factory = () => buildStudioDefaultScene(cameraShake, cameraIntensity);
    adoptBundle(factory(), factory);

    // Keyboard Shortcuts (Space = Play/Pause, Left/Right = Step)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        step(e.shiftKey ? 10 : 1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        step(e.shiftKey ? -10 : -1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubFrameRef.current?.();
      engineRef.current?.pause();
    };
  }, [refreshLayers, adoptBundle, cameraShake, cameraIntensity]);

  // Controls
  const togglePlay = () => {
    if (!engineRef.current) return;
    engineRef.current.togglePlay();
    setIsPlaying(engineRef.current.getState() === 'playing');
  };

  const step = (delta: number) => {
    if (!engineRef.current) return;
    const target = Math.max(0, Math.min(sceneTotalFrames - 1, currentFrame + delta));
    engineRef.current.seekToFrame(target);
    setIsPlaying(false);
  };

  const seek = (f: number) => {
    if (!engineRef.current) return;
    engineRef.current.seekToFrame(f);
  };

  const focusWindow = (layerId: string) => {
    if (!engineRef.current) return;
    engineRef.current.sceneGraph.focusWindow(layerId);
    engineRef.current.renderAtFrame(currentFrame);
    refreshLayers();
  };

  const toggleVisibility = (layerId: string) => {
    if (!engineRef.current) return;
    const layer = engineRef.current.sceneGraph.getLayer(layerId);
    if (layer) {
      layer.visible = !layer.visible;
      engineRef.current.renderAtFrame(currentFrame);
      refreshLayers();
    }
  };

  const handleUpdateCameraIntensity = (val: number) => {
    setCameraIntensity(val);
    if (engineRef.current) {
      engineRef.current.camera.shakeIntensity = val;
      engineRef.current.renderAtFrame(currentFrame);
    }
  };

  const handleToggleCamera = () => {
    const next = !cameraShake;
    setCameraShake(next);
    if (engineRef.current) {
      engineRef.current.camera.enableShake = next;
      engineRef.current.renderAtFrame(currentFrame);
    }
  };

  // Real in-browser WebCodecs export pipeline — gated by the Render Mission
  const startExport = async () => {
    // MISSION GATE: video yang gagal quality gate tidak pernah diekspor.
    setExportGateMsg(null);
    try {
      assertMissionPassed(missionReport);
    } catch (gateErr) {
      setExportGateMsg(gateErr instanceof Error ? gateErr.message : String(gateErr));
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportFps(0);
    setExportComplete(false);

    try {
      const blob = await exportVideo(
        {
          width: engineRef.current?.width ?? 1920,
          height: engineRef.current?.height ?? 1080,
          fps: engineRef.current?.fps ?? fps,
          totalFrames: engineRef.current?.durationInFrames ?? sceneTotalFrames,
          codec: 'avc',
          bitrate: 6_000_000,
          enableCameraShake: cameraShake,
          filename: 'agentika-canvas-1080p.mp4',
        },
        (progress) => {
          setExportProgress(progress.percent);
          setExportFps(progress.fps);
        },
        engineRef.current || undefined,
        canvasRef.current || undefined
      );

      downloadBlob(blob, 'agentika-canvas-1080p.mp4');
      setIsExporting(false);
      setExportComplete(true);
    } catch (err) {
      console.error('[EditorApp] Export failed:', err);
      setIsExporting(false);
      alert(`Export error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const currentTimeSec = (currentFrame / fps).toFixed(2);
  const timestampUs = Math.round((currentFrame * 1_000_000) / fps);

  const diagnosticInfo: FrameDiagnosticInfo = {
    frame: currentFrame,
    fps,
    timestampUs,
    timeSec: currentFrame / fps,
    layers: engineRef.current?.sceneGraph.getAllLayers() || [],
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. Header Bar */}
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#090d16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={24} color="#38bdf8" />
            <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.02em' }}>
              agentika-canvas <span style={{ color: '#38bdf8' }}>Studio</span>
            </span>
          </div>
          <span style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
            Phase 4: Frame Inspector
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* WebCodecs Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <Cpu size={15} color="#38bdf8" />
            <span style={{ color: '#94a3b8' }}>WebCodecs:</span>
            {capabilities?.hasWebCodecs ? (
              <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                <CheckCircle2 size={14} /> Ready ({capabilities.recommendedVideoCodec})
              </span>
            ) : (
              <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={14} /> Emulation
              </span>
            )}
          </div>

          {/* Mission status chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              background: '#0f172a',
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${missionReport ? (missionReport.status === 'passed' ? '#22c55e' : '#ef4444') : '#1e293b'}`,
            }}
            title="Render Mission Pipeline — video hanya bisa diekspor setelah lulus verifikasi"
          >
            <ShieldCheck size={15} color={missionReport?.status === 'passed' ? '#4ade80' : missionReport ? '#f87171' : '#64748b'} />
            <span style={{ color: '#94a3b8' }}>Mission:</span>
            {missionRunning ? (
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Checking…</span>
            ) : missionReport ? (
              <span style={{ color: missionReport.status === 'passed' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                {missionReport.status.toUpperCase()}
              </span>
            ) : (
              <span style={{ color: '#64748b' }}>not run</span>
            )}
          </div>

          {/* Scene Pack selector */}
          <select
            value={selectedPackId}
            onChange={(e) => handleSelectPack(e.target.value)}
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #1e293b',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="Muat Scene Pack (src/scenes/*/) ke canvas"
          >
            <option value="__studio__">Studio Default Scene</option>
            {packs
              .filter((p) => !p.skipped)
              .map((p) => (
                <option key={p.manifest.id} value={p.manifest.id}>
                  {p.manifest.name} ({p.manifest.resolution} @ {p.manifest.fps}fps)
                </option>
              ))}
          </select>

          {/* Export MP4 Button */}
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Download size={16} /> Export MP4
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
        {/* Left: Canvas Viewport & Scrubber */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', overflowY: 'auto' }}>
          {/* Canvas Container */}
          <div
            style={{
              backgroundColor: '#000000',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #1e293b',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                aspectRatio: '16/9',
                display: 'block',
              }}
            />

            {/* Viewport Floating HUD */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'monospace',
                display: 'flex',
                gap: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span>1920x1080 (1080p)</span>
              <span>60 FPS</span>
              <span style={{ color: '#38bdf8' }}>F: {currentFrame}</span>
            </div>
          </div>

          {/* Timeline & Frame Scrubber Control Panel */}
          <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              {/* Playback Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => step(-10)}
                  style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                  title="Mundur 10 Frame (Shift + Left)"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => step(-1)}
                  style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                  title="Mundur 1 Frame (Left Arrow)"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  onClick={togglePlay}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }}
                  title="Play / Pause (Space)"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => step(1)}
                  style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                  title="Maju 1 Frame (Right Arrow)"
                >
                  <SkipForward size={16} />
                </button>
                <button
                  onClick={() => step(10)}
                  style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                  title="Maju 10 Frame (Shift + Right)"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>

              {/* Precise Frame / Time Readout */}
              <div style={{ fontFamily: 'monospace', fontSize: '14px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#64748b' }}>FRAME: </span>
                  <strong style={{ color: '#38bdf8' }}>{currentFrame}</strong>
                  <span style={{ color: '#64748b' }}> / {sceneTotalFrames}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>TIME: </span>
                  <strong style={{ color: '#f8fafc' }}>{currentTimeSec}s</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>US: </span>
                  <strong style={{ color: '#a78bfa' }}>{timestampUs} µs</strong>
                </div>
              </div>
            </div>

            {/* Scrubber Range Slider */}
            <input
              type="range"
              min={0}
              max={sceneTotalFrames - 1}
              value={currentFrame}
              onChange={(e) => seek(parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8', height: '6px' }}
            />

            {/* Second markers underneath slider */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '6px', fontFamily: 'monospace' }}>
              <span>0.0s (f:0)</span>
              <span>1.0s (f:60)</span>
              <span>2.0s (f:120)</span>
              <span>3.0s (f:180)</span>
              <span>4.0s (f:240)</span>
              <span>5.0s (f:300)</span>
              <span>6.0s (f:360)</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Inspector, Layers, and Camera Tabs */}
        <div style={{ borderLeft: '1px solid #1e293b', backgroundColor: '#090d16', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
            <button
              onClick={() => setActiveTab('inspector')}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: activeTab === 'inspector' ? '#1e293b' : 'transparent',
                color: activeTab === 'inspector' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'inspector' ? 'bold' : 'normal',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderBottom: activeTab === 'inspector' ? '2px solid #38bdf8' : 'none',
              }}
            >
              <Sparkles size={14} /> Inspector & AI
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: activeTab === 'layers' ? '#1e293b' : 'transparent',
                color: activeTab === 'layers' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'layers' ? 'bold' : 'normal',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderBottom: activeTab === 'layers' ? '2px solid #38bdf8' : 'none',
              }}
            >
              <Layers size={14} /> Layers (z-index)
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: activeTab === 'camera' ? '#1e293b' : 'transparent',
                color: activeTab === 'camera' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'camera' ? 'bold' : 'normal',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderBottom: activeTab === 'camera' ? '2px solid #38bdf8' : 'none',
              }}
            >
              <CameraIcon size={14} /> Camera
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '16px', flex: 1 }}>
            {activeTab === 'inspector' && (
              <FrameInspector
                diagnostic={diagnosticInfo}
                onSeek={seek}
                onFocusLayer={focusWindow}
              />
            )}

            {activeTab === 'layers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
                  Dynamic z-index Layer Management
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  Setiap jendela dapat difokuskan ke lapisan paling atas secara instan tanpa mengacak struktur pohon DOM:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {layersList
                    .slice()
                    .sort((a, b) => b.zIndex - a.zIndex) // Topmost first in list
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: '#1e293b',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#f8fafc' }}>{item.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{item.id}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#0369a1', color: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            z: {item.zIndex}
                          </span>
                          <button
                            onClick={() => toggleVisibility(item.id)}
                            style={{ background: 'transparent', border: 'none', color: item.visible ? '#38bdf8' : '#64748b', cursor: 'pointer', padding: '4px' }}
                            title={item.visible ? 'Hide Layer' : 'Show Layer'}
                          >
                            {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button
                            onClick={() => focusWindow(item.id)}
                            style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                            title="Pindahkan ke paling depan (focusWindow)"
                          >
                            Focus
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'camera' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
                  Handheld Camera & Viewport Engine
                </h4>

                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Organic Handheld Shake</span>
                    <button
                      onClick={handleToggleCamera}
                      style={{
                        backgroundColor: cameraShake ? '#22c55e' : '#64748b',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {cameraShake ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                    Menggunakan noise harmonik multi-sine berfrekuensi rendah. Teks kecil tetap tajam tanpa getaran liar (*no jitter*).
                  </p>
                </div>

                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Shake Intensity</span>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>{cameraIntensity.toFixed(1)} px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="6.0"
                    step="0.1"
                    value={cameraIntensity}
                    onChange={(e) => handleUpdateCameraIntensity(parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Export MP4 Modal Dialog */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              width: '460px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={20} color="#38bdf8" /> Ekspor Video MP4
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Proses rendering dilakukan <strong>100% di browser lokal Anda</strong> menggunakan WebCodecs API dan Mediabunny ($0 biaya server).
            </p>

            {/* Export Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Resolusi Output:</span>
                <strong style={{ color: '#f8fafc' }}>1920 × 1080 (Full HD)</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Framerate & Durasi:</span>
                <strong style={{ color: '#f8fafc' }}>60 FPS / 6.0 detik (360 frame)</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Codec Target:</span>
                <strong style={{ color: '#4ade80' }}>H.264 (avc1.4d0034) + AAC</strong>
              </div>
            </div>

            {/* Progress Bar (when exporting) */}
            {isExporting && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>Rendering WebCodecs...</span>
                  <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{exportProgress}% ({exportFps} FPS)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${exportProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Complete Notice */}
            {exportComplete && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid #22c55e',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#4ade80',
                  fontSize: '13px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={18} />
                Video MP4 siap diunduh (Generated in-browser)!
              </div>
            )}

            {/* Render Mission card — quality gate pra-export */}
            <div
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: `1px solid ${missionReport?.status === 'passed' ? '#22c55e' : missionReport ? '#ef4444' : '#1e293b'}`,
                padding: '14px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                  <ShieldCheck size={16} color="#38bdf8" />
                  Render Mission — Quality Gate
                </div>
                <button
                  onClick={runMissionCheck}
                  disabled={missionRunning || isExporting}
                  style={{
                    background: missionRunning ? '#334155' : '#0369a1',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    cursor: missionRunning ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {missionRunning ? 'Memeriksa…' : missionReport ? 'Run Ulang' : 'Jalankan Mission Check'}
                </button>
              </div>

              {missionReport ? (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  <div style={{ marginBottom: '4px' }}>
                    Status:{' '}
                    <b style={{ color: missionReport.status === 'passed' ? '#4ade80' : '#f87171' }}>
                      {missionReport.status.toUpperCase()}
                    </b>{' '}
                    · attempts {missionReport.totalAttempts}/{missionReport.maxAttempts} · {missionReport.summary}
                  </div>
                  {missionReport.attempts[missionReport.attempts.length - 1]?.checks
                    .filter((c) => !c.passed && !c.skipped)
                    .slice(0, 4)
                    .map((c) => (
                      <div key={c.id} style={{ color: c.severity === 'warning' ? '#eab308' : '#f87171', marginTop: '2px' }}>
                        {c.severity === 'warning' ? '⚠' : '✗'} {c.label} — {c.details}
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Belum ada mission. Export MP4 <b>diblokir</b> sampai scene lulus check deterministik + reviewer.
                </div>
              )}

              {missionError && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#f87171' }}>✗ {missionError}</div>
              )}
            </div>

            {/* Pre-export risk assessment (HMADS-render) */}
            {(() => {
              const est = estimateExport({
                width: engineRef.current?.width ?? 1920,
                height: engineRef.current?.height ?? 1080,
                fps: engineRef.current?.fps ?? fps,
                totalFrames: engineRef.current?.durationInFrames ?? sceneTotalFrames,
                bitrate: 6_000_000,
              });
              if (est.warnings.length === 0) return null;
              return (
                <div
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid #eab308',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#eab308',
                  }}
                >
                  <b>Peringatan pra-export:</b>
                  {est.warnings.map((w) => (
                    <div key={w} style={{ marginTop: '4px' }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              );
            })()}

            {exportGateMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #ef4444',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#f87171',
                  whiteSpace: 'pre-line',
                }}
              >
                ⛔ <b>Export diblokir Mission Gate:</b>
                <div style={{ marginTop: '4px' }}>{exportGateMsg}</div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: '#1e293b',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Tutup
              </button>
              <button
                onClick={startExport}
                disabled={isExporting}
                style={{
                  background: isExporting ? '#334155' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isExporting ? 'Sedang Memproses...' : exportComplete ? 'Render Ulang' : 'Mulai Render MP4'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
