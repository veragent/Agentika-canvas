# 📝 CHANGELOG: agentika-canvas

Seluruh catatan pembaruan, perubahan arsitektur, dan penambahan fitur pada proyek **agentika-canvas** dicatat secara kronologis di bawah ini.

---

## [Unreleased] - 2026-11-06

### 🚀 Phase 8: Scene Pack (Scene-as-Directory) & Render Mission Pipeline

> Konsep clean-room dari analisis komparatif Nouride vs Evonic (`docs/designs/scene-pack-mission-pipeline.md`). Tanpa kode yang disalin (lisensi tidak kompatibel).

**Scene Pack — scene adalah direktori, bukan file lepas:**
* `src/scenes/<id>/IDENTITY.md` — manifest terbaca manusia & mesin (id, name, description, tags, kits, style, fps, resolution, version). Parser ringan `- key: value`, tanpa dependensi YAML.
* `src/packs/ScenePack.ts` — `ScenePackRegistry` framework-agnostic + `parseIdentityMd()` / `renderIdentityMd()`.
* `src/packs/loaders.vite.ts` — discovery pack via `import.meta.glob` (lazy → code-split per pack; hot-reload daftar pack di dev mode).
* `SceneBundle` kini dideklarasikan kanonik di `src/core/SceneBundle.ts` (menghapus duplikasi interface di tiap scene).
* `rea-opening.scene.ts` dimigrasi menjadi pack `src/scenes/rea-opening/` (IDENTITY.md + scene.ts + `createScene` alias).

**Render Mission Pipeline — "video yang gagal quality gate tidak pernah diekspor":**
* `src/missions/` — runner + 10 check deterministik + reviewer + report + export gate.
* Check (tanpa canvas nyata, jalan identik di Node CLI/CI dan browser): `frame-count`, `duration-sanity`, `resolution-sanity`, `timeline-monotonic`, `zindex-cap` (overlay ≤ 3 di atas `maxZCap 900000`), `render-clean` (NaN/Infinity guard via tracking context), `draw-density` (frame kosong), `layer-state-clean`, `camera-state-clean`, `pixel-luma` (probe browser opsional; `skipped` di Node — degradasi anggun).
* `DeterministicReviewer`: `approve` / `reject` (>30% frame sampel kosong) / `needs-human` (ada catatan revisi FrameInspector). Interface `MissionReviewer` siap untuk reviewer vision-LLM di masa depan.
* Semantik Nouride: kegagalan identik **3× berturut-turut → HALTED** ("berhenti dan bertanya"); bundle dibangun segar tiap attempt.
* `report.md` per mission: status, attempts, check detail, tabel evidence per frame, verdict reviewer.
* **Export Gate**: `startExport` Studio kini memanggil `assertMissionPassed()` — tombol "Mulai Render MP4" memblokir export sebelum mission lulus (pesan gate menampilkan check yang gagal).
* **HMADS-render**: `estimateExport()` menampilkan peringatan pra-encode di modal export (resolusi >4K, durasi >10 menit, estimasi file >500MB, fps >60).
* Studio: selector Scene Pack di header (lazy load + swap engine live), chip status Mission, kartu Mission Check di modal export, pixel probe luma dari canvas hidup.

**CLI baru:**
* `npx tsx cli/index.ts packs` — daftar pack terdiscovery (`src/scenes/*/`).
* `npx tsx cli/index.ts mission <packId|dir> [--report <path>]` — jalankan pipeline mission dari terminal/CI; exit code 0 hanya bila PASSED (pola `doctor`); menulis `report.md`.
* `generate-scene` kini menulis **direktori pack** (`scene.ts` + `IDENTITY.md`), path import relatif disesuaikan.

**Test & verifikasi:**
* `tests/phase8_verification.ts` — 12 kelompok test: parser IDENTITY, registry, migrasi pack, tracking context, sampling, mission pass/fail/halt, reviewer reject/needs-human, report markdown, export gate, risk assessment.
* Seluruh suite Phase 1–8 hijau; `npm run build` hijau; pack ter-code-split jadi chunk lazy (`assets/IDENTITY-*.js`, `assets/scene-*.js`).
* `npx tsx cli/index.ts mission rea-opening` → **PASSED** (1/3 attempt).

---

### ✨ Integration: EGM (Elephant-Goldfish Model) — Spec-Driven Development
* **Instalasi plugin EGM resmi Google** (`google/elephant-goldfish-model`) ke Antigravity CLI:
  ```bash
  agy plugin install https://github.com/google/elephant-goldfish-model
  ```
  Terinstal di `~/.gemini/config/plugins/egm` — **7 skills** (`egm-brainstorm`, `egm-draft`, `egm-review`, `egm-resolve`, `egm-bootstrap`, `egm-review-loop`, `egm-drift-report`) dan **10 persona reviewer** (`egm-design`, `egm-zoom-out`, `egm-synthesizer`, dst.).
* **Aturan proyek agar terbaca Antigravity CLI**:
  * `.antigravity/rules.md` — ditambahkan "Doktrin Desain: EGM" (bagian 0) berisi alur wajib `/egm:` (brainstorm → draft → review → resolve → implementasi → drift-report mingguan), aturan prefix `/egm:`, artifact directory, dan kewajiban subagent fresh-context untuk Goldfish review.
  * `AGENTS.md` (baru) — instruksi umum semua agen AI, deklarasi `EGM artifact directory: docs/designs`, tabel skill EGM, dan aturan kode.
  * `CLAUDE.md` — disinkronkan dengan tabel skill EGM + konvensi desain.
* **Infrastruktur EGM di repo**:
  * `docs/designs/SITEMAP.md` — indeks artefak desain (PRD, ROADMAP, ARCHITECTURE_ANALYSIS, CHANGELOG) + konvensi penamaan & cadence drift mingguan.
  * `_agents/skills/agentika_canvas_elephant/SKILL.md` — custom context loader proyek untuk agen Elephant (invarian inti, key code paths, konvensi).
* **README.md** — ditambahkan section "EGM (Elephant-Goldfish Model)" dengan langkah instalasi `agy plugin install`, alur kerja desain 6 langkah, dan pembaruan struktur direktori.
* ⚠️ **Catatan runtime**: pada 2026-11-06, verifikasi live sesi `agy` gagal dengan `403 PERMISSION_DENIED` (layanan Antigravity untuk akun terblokir ToS pending appeal). Instalasi & registrasi plugin sudah tervalidasi lokal via `agy plugin list` dan `agy agents`; verifikasi end-to-end slash command menunggu akun aktif kembali.

---

## [v1.0.0] - 2026-10-31

### 🚀 Implementasi Penuh: Fase 1 s/d Fase 7

#### [Fase 1] Inisialisasi Proyek & Konfigurasi Pustaka Media
* **Setup Proyek**: Inisialisasi proyek berbasis Vite 6, React 19, dan TypeScript 5.
* **Integrasi Dependensi Media**:
  * Pemasangan `mediabunny` (^1.65.0) untuk muxing MP4, pembacaan kontainer, dan sinkronisasi audio/video.
  * Pemasangan `web-demuxer` (^4.0.0) untuk demuxing multi-format kontainer berbasis WebAssembly.
  * Pemasangan `lucide-react` untuk ikon antarmuka studio.
* **Distribusi WASM**: Mengonfigurasi `vite-plugin-static-copy` pada `vite.config.ts` untuk menyalin biner WebAssembly `web-demuxer.wasm` dan `web-demuxer-mini.wasm` ke `/public/wasm-files/`.
* **Modul Deteksi Kapabilitas WebCodecs (`src/core/Capabilities.ts`)**:
  * Memvalidasi ketersediaan `VideoEncoder`, `VideoDecoder`, `AudioEncoder`, `AudioDecoder`, dan `VideoFrame`.
  * Pengujian perangkat keras untuk codec:
    * Video: `"avc1.4d0034"` (H.264 Baseline), `"avc1.640032"` (H.264 High), `"vp09.00.40.08.00"` (VP9), `"av01.0.04M.08"` (AV1).
    * Audio: `"mp4a.40.2"` (AAC-LC) dan `"opus"`.

#### [Fase 2] Core Canvas Engine, Timeline & Dynamic z-index
* **Core SceneGraph (`src/core/SceneGraph.ts`)**:
  * Solusi keterbatasan browser DOM Remotion dengan abstraksi `CanvasLayer` dan `RenderContext`.
  * Metode `focusWindow(layerId)`: Secara dinamis menghitung $\max(\text{zIndex}) + 1$ saat jendela diklik atau dijadwalkan maju, tanpa perlu mengubah urutan penulisan kode komponen atau pohon JSX.
  * Fitur perlindungan `maxZCap = 900000` untuk memastikan jendela desktop tidak pernah menutupi kursor mouse.
* **Timeline Deterministik & Pustaka Interpolasi (`src/core/Timeline.ts`)**:
  * Seluruh perhitungan animasi murni berdasarkan nomor frame ($i$) dengan presisi mikrodetik:
    $$\text{timestampUs} = \frac{i \times 10^6}{\text{fps}}$$
  * Fungsi interpolasi `interpolate()` dan `interpolatePoint()`.
  * Pustaka *easing*: `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack`, dan `humanSmooth` (Hermite S-curve).
* **Mesin Kanvas Utama (`src/core/Engine.ts`)**:
  * Mengelola resolusi Full HD (1920×1080), framerate 60 FPS, dan integrasi kamera.
  * Dua mode eksekusi: *Interactive Realtime Playback* (`requestAnimationFrame`) dan *Offline Deterministic Step Mode* (`renderAtFrame()`).

#### [Fase 3] Komponen Visual Standar & Pencegah "AI Slop" (Gaya Nesi Nowware)
* **Controlled Handheld Camera (`src/core/Camera.ts`)**:
  * Guncangan kamera organik menggunakan noise harmonik multi-sine frekuensi rendah ($1.2\text{ Hz}$).
  * Pembatasan translasi ($\pm 1.8\text{ px}$) dan mikro-rotasi ($\pm 0.0012\text{ rad}$), memastikan teks kode dan terminal berukuran kecil tetap tajam (*pixel-crisp*) tanpa getaran liar.
* **macOS Desktop Environment (`src/kits/macos/MacOSDesktopLayer.ts`)**:
  * Wallpaper Sonoma/Sequoia dengan pencahayaan ambien.
  * Bilah menu atas translusen lengkap dengan logo Apple (``), aplikasi aktif, dan *system tray* (Wi-Fi, Baterai 100% ⚡, Control Center, dan kode waktu mikrodetik).
* **Komponen GitHub UI Realistis (`src/kits/github/GitHubRepoLayer.ts`)**:
  * Header repositori resmi, *commit row*, tabel berkas, dan *markdown README viewer*.
  * **Animated Stars Counter**: Tombol bintang kuning dengan angka yang beranimasi naik secara deterministik dari `48.2k` hingga `354.8k` stars menggunakan `Easing.easeOutExpo`.
* **High-Fidelity Presenter Webcam (`src/kits/macos/WebcamWindowLayer.ts`)**:
  * Jendela presenter studio berbingkai *neon cyan glow* dengan visualizer gelombang suara berbicara hijau (*live audio waveform*).
  * Indikator `REC` berkedip deterministik setiap 30 frame.
  * Transisi pengecilan jendela mulus (*smooth resize transition*) ke sudut kanan bawah.
* **Sistem Kursor Vektor Asli Mac (`src/kits/macos/CursorLayer.ts`)**:
  * Kursor panah standar (`default`), tangan penunjuk (`pointer`), dan panah ganda diagonal (`resize` / `nwse-resize`).
  * Pergerakan kurva Bezier halus (*Hermite S-curve*) menirukan pergerakan tangan manusia asli.

#### [Fase 4] Studio Editor & Inspeksi Frame-by-Frame di Browser
* **Frame Inspector & AI Revision Prompter (`src/studio/FrameInspector.tsx`)**:
  * Diagnostik waktu presisi: Nomor frame, waktu kanvas dalam detik, dan timestamp WebCodecs mikrodetik ($\mu\text{s}$).
  * Daftar urutan tumpukan layer aktif real-time (*ascending z-index*).
  * Generator prompt revisi terstruktur otomatis untuk **Antigravity CLI** / **Claude Code**.
  * Tombol *quick-tag* untuk kejanggalan umum dan tombol *Salin Semua Prompt (Batch)*.
* **Studio Editor App (`src/studio/EditorApp.tsx`)**:
  * Viewport Full HD 1080p dengan rasio aspek 16:9 dan floating diagnostic HUD.
  * Timeline scrubber interaktif: Play/Pause, Step ±1 frame, Step ±10 frame, dan penanda detik.
  * Dukungan *keyboard shortcuts* (`Space`, `Left/Right Arrow`, `Shift + Arrow`).
  * Sidebar multi-tab: *Inspector & AI*, *Layers (z-index)*, dan *Camera Settings*.

#### [Fase 5] Pipa Ekspor WebCodecs API + Mediabunny ($0 Server)
* **Dedicated Web Worker Exporter (`src/media/Exporter.worker.ts`)**:
  * Menjalankan rendering kanvas (`OffscreenCanvas`), kompresi perangkat keras `VideoEncoder` (H.264 / VP9), dan muxing kontainer MP4 di latar belakang thread tanpa membekukan UI editor.
  * Komunikasi berbasis pesan non-blocking dengan laporan progres *real-time* (`percent`, `fps`).
* **Media Exporter Orchestrator (`src/media/MediaExporter.ts`)**:
  * Mendeteksi dukungan Worker dan OffscreenCanvas dengan fallback elegan ke *main-thread rendering*.
  * Fungsi `downloadBlob()` memicu pengunduhan file `.mp4` asli secara otomatis di peramban pengguna.
* **Integrasi Modal Ekspor**: Dialog render di Studio Editor dengan progress bar interaktif dan penghitung kecepatan rendering frame per detik (*FPS Speed Counter*).

#### [Fase 6] Integrasi Demuxer & Decoder untuk Aset Video/Audio Eksternal
* **Precision Video Reader (`src/media/MediaIngestion.ts`)**:
  * Pengambilan sampel frame presisi tinggi menggunakan Mediabunny `Input` dan `VideoSampleSink`.
  * Pengelolaan memori pintar dengan *LRU Sample Cache* (maksimal 30 frame) untuk mencegah kebocoran memori GPU.
* **Multi-Format WebDemuxer Reader (`src/media/MediaIngestion.ts`)**:
  * Dukungan format kontainer luas (`.mkv`, `.flv`, `.avi`, `.ts`, `.mov`, `.webm`, `.mp4`) menggunakan WebAssembly.
  * Pengekstrakan paket demuxer dan decoding langsung via WebCodecs `VideoDecoder`.
* **Komponen `ExternalVideoLayer` (`src/kits/ExternalVideoLayer.ts`)**:
  * Sinkronisasi waktu deterministik antara nomor frame kanvas dan timecode video eksternal.
  * Rendering frame video ke kanvas dengan sudut melengkung, bayangan, dan header timecode sinkron.
  * Layar *cyberpunk grid* dengan *scanline* bergerak sebagai fallback aman saat video dimuat.

#### [Fase 7] Otomatisasi Antigravity CLI (Naskah & Database ke Video)
* **Template Kuis Berbasis Data (`src/kits/quiz/QuizTemplateLayer.ts`)**:
  * Template video otomatis untuk konten kuis edukasi (kategori badge, kartu soal, circular countdown timer, dan animasi pembuktian jawaban benar).
* **Script-to-Scene Pipeline CLI (`cli/index.ts`)**:
  * Perintah `generate-scene`: Membaca naskah Markdown beranotasi visual (`> Narasi` & `[Visual]`), menghitung durasi waktu bicara (~2.33 kata/detik), dan men-scaffold file adegan TypeScript otomatis di `src/scenes/rea-opening.scene.ts`.
  * Perintah `inspect-script`: Menampilkan ringkasan durasi, jumlah frame, dan daftar aksi visual.
  * Perintah `batch-quiz`: Menghasilkan antrean video kuis massal dari berkas data JSON (`data/quiz-sample.json`).
* **Aturan Agen AI (`.antigravity/rules.md` & `CLAUDE.md`)**:
  * Doktrin baku anti-AI slop dan pedoman arsitektur untuk Antigravity CLI dan Claude Code.
