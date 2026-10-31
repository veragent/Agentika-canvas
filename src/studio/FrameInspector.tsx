/**
 * agentika-canvas: Frame Inspector & AI Prompt Revision Logger
 * Allows frame-by-frame scrubbing, visual debugging of layer z-index & transforms,
 * and generates structured revision prompts for Antigravity CLI / Claude Code.
 */

import React, { useState } from 'react';
import { Copy, Check, MessageSquareCode, Clock, Plus, Trash2 } from 'lucide-react';
import { CanvasLayer } from '../core/SceneGraph';

export interface FrameDiagnosticInfo {
  frame: number;
  fps: number;
  timestampUs: number;
  timeSec: number;
  layers: CanvasLayer[];
}

export interface FrameRevisionNote {
  id: string;
  frame: number;
  timeSec: number;
  timestampUs: number;
  issue: string;
  tag: string;
  suggestedFix?: string;
  copied?: boolean;
}

interface FrameInspectorProps {
  diagnostic: FrameDiagnosticInfo;
  onSeek: (frame: number) => void;
  onFocusLayer: (layerId: string) => void;
}

const COMMON_ISSUES = [
  { label: 'Kursor terlalu cepat', tag: 'cursor-speed', fix: 'Tingkatkan durasi frame pada interpolatePoint() atau ubah easing ke humanSmooth' },
  { label: 'Jendela salah z-index', tag: 'z-index-order', fix: 'Panggil focusWindow(id) sebelum frame ini dimulai' },
  { label: 'Webcam resize terlalu kaku', tag: 'webcam-resize', fix: 'Gunakan Easing.easeInOutCubic dan tambah rentang frame menjadi 60 frame' },
  { label: 'Guncangan kamera terlalu liar', tag: 'camera-shake', fix: 'Kurangi shakeIntensity ke 1.2px dan rotationalShake ke 0.001 rad' },
  { label: 'Stars counter tidak sinkron', tag: 'stars-counter', fix: 'Sesuaikan starStartFrame dan starEndFrame agar cocok dengan durasi narasi' },
];

export const FrameInspector: React.FC<FrameInspectorProps> = ({
  diagnostic,
  onSeek,
  onFocusLayer,
}) => {
  const [notes, setNotes] = useState<FrameRevisionNote[]>([]);
  const [currentIssue, setCurrentIssue] = useState('');
  const [selectedTag, setSelectedTag] = useState('general');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);

  const { frame, fps, timestampUs, timeSec, layers } = diagnostic;

  const handleAddNote = () => {
    if (!currentIssue.trim()) return;

    const newNote: FrameRevisionNote = {
      id: `rev-${Date.now()}-${frame}`,
      frame,
      timeSec,
      timestampUs,
      issue: currentIssue.trim(),
      tag: selectedTag,
      suggestedFix: suggestedFix.trim() || undefined,
    };

    setNotes((prev) => [...prev, newNote]);
    setCurrentIssue('');
    setSuggestedFix('');
  };

  const handleSelectQuickIssue = (item: typeof COMMON_ISSUES[0]) => {
    setCurrentIssue(item.label);
    setSelectedTag(item.tag);
    setSuggestedFix(item.fix);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const formatSinglePrompt = (n: FrameRevisionNote): string => {
    return `[Frame ${n.frame} | ${n.timeSec.toFixed(2)}s (${n.timestampUs} µs)]
Issue: ${n.issue}
Tag: ${n.tag}
${n.suggestedFix ? `Suggested Fix: ${n.suggestedFix}` : ''}
Active Layers: ${layers.map((l) => `${l.id} (z:${l.zIndex})`).join(', ')}`;
  };

  const handleCopySingle = (n: FrameRevisionNote) => {
    const text = formatSinglePrompt(n);
    navigator.clipboard.writeText(text);
    setCopiedSingleId(n.id);
    setTimeout(() => setCopiedSingleId(null), 2000);
  };

  const handleCopyBatch = () => {
    if (notes.length === 0) return;

    const header = `# Antigravity CLI / Claude Code Video Revision Prompt\nProyek: agentika-canvas\nTotal Revisi: ${notes.length} catatan frame\n\n`;
    const body = notes
      .map(
        (n, idx) =>
          `### Catatan ${idx + 1} — Frame ${n.frame} [${n.timeSec.toFixed(2)}s]\n- **Masalah**: ${n.issue}\n- **Kategori**: ${n.tag}\n${
            n.suggestedFix ? `- **Solusi**: ${n.suggestedFix}\n` : ''
          }`
      )
      .join('\n');

    navigator.clipboard.writeText(header + body);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Realtime Frame Diagnostics Card */}
      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
          <Clock size={16} /> Diagnostik Frame Presisi
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '13px' }}>
          <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>NOMOR FRAME</span>
            <strong style={{ fontSize: '16px', fontFamily: 'monospace', color: '#f8fafc' }}>{frame}</strong>
            <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '4px' }}>/ {fps} fps</span>
          </div>

          <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>WAKTU KANVAS</span>
            <strong style={{ fontSize: '16px', fontFamily: 'monospace', color: '#f8fafc' }}>{timeSec.toFixed(3)}s</strong>
          </div>

          <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px', gridColumn: 'span 2' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>TIMESTAMP MIKRODETIK (WebCodecs)</span>
            <strong style={{ fontSize: '14px', fontFamily: 'monospace', color: '#38bdf8' }}>{timestampUs.toLocaleString()} µs</strong>
          </div>
        </div>

        {/* Active Layers Stack on this Frame */}
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: '#64748b', display: 'block', fontSize: '11px', marginBottom: '6px' }}>
            URUTAN LAYER AKTIF (ASCENDING zIndex):
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {layers
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => onFocusLayer(layer.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1e293b',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                  title="Klik untuk memajukan layer ini (focusWindow)"
                >
                  <span style={{ color: '#cbd5e1' }}>{layer.id}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>z: {layer.zIndex}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 2. AI Prompt Revision Creator */}
      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
          <MessageSquareCode size={16} /> Catat Kejanggalan ("AI Slop")
        </h4>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
          Tandai kejanggalan pada Frame <strong>{frame}</strong> ({timeSec.toFixed(2)}s) dan salin prompt instruksi perbaikan untuk Antigravity CLI / Claude Code.
        </p>

        {/* Quick Tag Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {COMMON_ISSUES.map((item) => (
            <button
              key={item.tag}
              onClick={() => handleSelectQuickIssue(item)}
              style={{
                background: selectedTag === item.tag ? '#d97706' : '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Feedback */}
        <input
          type="text"
          placeholder="Jelaskan apa yang salah pada frame ini..."
          value={currentIssue}
          onChange={(e) => setCurrentIssue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddNote();
          }}
          style={{
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 10px',
            color: '#fff',
            fontSize: '13px',
            marginBottom: '8px',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Saran perbaikan kode / parameter (opsional)..."
            value={suggestedFix}
            onChange={(e) => setSuggestedFix(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '12px',
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleAddNote}
            disabled={!currentIssue.trim()}
            style={{
              background: currentIssue.trim() ? '#0284c7' : '#334155',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: currentIssue.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      {/* 3. Log of Frame Revisions */}
      {notes.length > 0 && (
        <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>
              Daftar Catatan Revisi ({notes.length})
            </span>
            <button
              onClick={handleCopyBatch}
              style={{
                background: copiedBatch ? '#22c55e' : '#0369a1',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 'bold',
              }}
            >
              {copiedBatch ? <Check size={12} /> : <Copy size={12} />}
              {copiedBatch ? 'Tersalin!' : 'Salin Semua Prompt'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: '#1e293b',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span
                    onClick={() => onSeek(note.frame)}
                    style={{ color: '#38bdf8', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
                    title="Klik untuk melompat ke frame ini"
                  >
                    Frame {note.frame} [{note.timeSec.toFixed(2)}s]
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleCopySingle(note)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedSingleId === note.id ? '#22c55e' : '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Salin prompt untuk frame ini"
                    >
                      {copiedSingleId === note.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                      title="Hapus catatan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ color: '#e2e8f0', marginBottom: '2px' }}>{note.issue}</div>
                {note.suggestedFix && (
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>
                    Fix: {note.suggestedFix}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
