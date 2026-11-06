# AGENTS.md — agentika-canvas

Instruksi umum untuk seluruh agen AI (Antigravity CLI / agy, Claude Code, Codex, Gemini, subagent) yang bekerja di repositori ini.

## Konteks Proyek

* **agentika-canvas** = Framework Programmatic Video Generation 100% in-browser (HTML5 Canvas + WebCodecs API + Mediabunny + web-demuxer) dengan biaya server $0.
* Dokumen kanonik: `PRD.md` (kebutuhan produk), `ROADMAP.md` (rencana 7 fase), `ARCHITECTURE_ANALYSIS.md` (analisa arsitektur), `CHANGELOG.md` (riwayat rilis).
* Doktrin teknis wajib: `.antigravity/rules.md` dan `CLAUDE.md` (dynamic z-index via `focusWindow()`, timeline deterministik mikrodetik, anti-AI slop kits, $0 server render).

## EGM (Elephant-Goldfish Model) — Spec-Driven Development

Plugin EGM (google/elephant-goldfish-model) terinstal di Antigravity CLI. Alur kerja desain:

```text
EGM artifact directory: docs/designs
```

* Fitur baru yang butuh keputusan desain → mulai dari `/egm:egm-brainstorm`, lalu `/egm:egm-draft`, `/egm:egm-review`, `/egm:egm-resolve`, baru implementasi.
* Desain yang disetujui disimpan di `docs/designs/` dan diindeks di `docs/designs/SITEMAP.md`.
* Review mingguan drift dokumen vs kode: `/egm:egm-drift-report`.
* Konteks proyek untuk Elephant: `_agents/skills/agentika_canvas_elephant/SKILL.md`.
* Di Antigravity CLI selalu gunakan prefix `/egm:` (contoh: `/egm:egm-brainstorm`).

## Perintah Penting

```bash
npm run dev                  # Studio Editor lokal (Vite, port 3000)
npm run build                # tsc + vite build (produksi)
npm run cli -- generate-scene scripts/sample-script.md src/scenes/<nama>.scene.ts
npm run cli -- inspect-script scripts/sample-script.md
npm run cli -- batch-quiz data/quiz-sample.json
npx tsx tests/phase1_phase2_verification.ts   # (+ phase3..phase7)
```

## Aturan Kode

1. Dilarang `setTimeout`/wall-clock di logika animasi — semua animasi fungsi murni dari nomor frame: `timestampUs = (frame * 1e6) / fps`.
2. Layering jendela hanya via `SceneGraph.focusWindow(layerId)` (maxZCap 900000) — dilarang reorder JSX/DOM.
3. Komponen visual wajib detail realistis (anti-AI slop): lihat `.antigravity/rules.md` bagian 3.
4. Setiap fase/fitur baru wajib disertai test suite di `tests/` dan entri di `CHANGELOG.md`.
5. `npm run build` harus hijau (tsc strict) sebelum commit.
