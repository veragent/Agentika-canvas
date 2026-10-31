# 🎬 agentika-canvas

> **High-Performance Programmatic Video Generation Framework**  
> **100% In-Browser Rendering & Encoding via HTML5 Canvas + WebCodecs API — $0 Server Cost.**

[![License: MPL-2.0 / MIT](https://img.shields.io/badge/License-MPL--2.0%20%2F%20MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![WebCodecs API](https://img.shields.io/badge/WebCodecs-Hardware%20Accelerated-green)](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
[![Mediabunny](https://img.shields.io/badge/Muxer-Mediabunny-orange)](https://mediabunny.dev/)

---

## 💡 Gambaran Umum & Masalah yang Dipecahkan

Pembuatan video terprogram secara konvensional (seperti menggunakan Remotion) umumnya bergantung pada proses kompilasi di server (*cloud server* / Railway / AWS Lambda) dengan Headless Chromium dan proses biner FFmpeg yang memakan biaya **$6 hingga $20+ per bulan** serta membebani CPU dan latensi jaringan. Selain itu, *DOM-based renderer* tidak mendukung properti CSS `z-index` dinamis saat menumpuk banyak jendela desktop (*window manager*).

**agentika-canvas** hadir memecahkan seluruh kendala tersebut dengan paradigma baru:

```
┌───────────────────────────────────────────────┐      ┌───────────────────────────────────────────────┐
│       Paradigma Konvensional (Remotion)       │      │        Paradigma Baru (agentika-canvas)       │
├───────────────────────────────────────────────┤      ├───────────────────────────────────────────────┤
│ • Biaya Server Cloud: $6 - $20+/bulan         │  VS  │ • Biaya Server: USD 0 (100% di browser lokal) │
│ • Rendering CPU lambat dengan FFmpeg biner   │      │ • Akselerasi Hardware GPU: WebCodecs API      │
│ • DOM Stacking Context mengabaikan z-index    │      │ • Dynamic z-index: focusWindow() SceneGraph   │
│ • Re-render JSX berat saat jendela berganti   │      │ • Deterministik mikrodetik: timestamp = f(i)  │
│ • Hasil mentah AI sering kaku ("AI Slop")     │      │ • Anti-AI Slop Kit: Gaya Nesi Nowware         │
└───────────────────────────────────────────────┘      └───────────────────────────────────────────────┘
```

### 1. Biaya Server USD 0 ($0 In-Browser Render)
Seluruh proses rendering kanvas, pengkodean video H.264/VP9, dan pembungkusan (*muxing*) MP4 berjalan 100% di peramban klien menggunakan **WebCodecs API** (`VideoEncoder`) dan **Mediabunny**. Memanfaatkan akselerasi GPU lokal dengan throughput hingga **~800+ frame per detik**.

### 2. Solusi Keterbatasan `z-index` DOM Browser
Elemen visual dikelola secara terprogram melalui `SceneGraph`. Sebelum digambar, seluruh layer yang aktif diurutkan secara menaik (*ascending*) berdasarkan `zIndex`. Saat suatu jendela diklik atau dijadwalkan maju, pemanggilan `focusWindow(id)` mengevaluasi:
$$\text{targetLayer.zIndex} = \max(\text{allLayers.zIndex}) + 1$$
Jendela langsung berpindah ke lapisan paling depan secara instan tanpa perlu merusak struktur pohon JSX/DOM. Dilengkapi proteksi `maxZCap = 900000` sehingga jendela tidak akan pernah menutupi kursor mouse.

### 3. Standar Anti-AI Slop (Gaya Visual Nesi Nowware)
Menghindari tampilan generatif yang tampak kaku:
* **macOS Desktop Environment**: Wallpaper Sonoma/Sequoia dan bilah menu atas (*translucent top menu bar*) dengan logo Apple asli dan *system tray*.
* **GitHub UI Realistis**: Header repositori resmi, *commit bar*, tabel berkas, *markdown viewer*, dan **Animated Stars Counter** yang beranimasi naik secara deterministik dari 48k hingga 354k bintang.
* **Floating Presenter Webcam**: Bukan sekadar kotak "no signal", melainkan siluet presenter studio dengan gelombang suara berbicara (*live audio waveforms*), badge `REC` berkedip, dan transisi pengecilan ukuran yang halus (*cubic easing*).
* **Kursor Vektor Asli Mac**: Kursor panah standar, tangan penunjuk (*pointer*), dan panah diagonal pengubah ukuran (*nwse-resize*) dengan kurva pergerakan tangan manusiawi (*Hermite S-curve*).
* **Controlled Handheld Camera Shake**: Guncangan kamera organik frekuensi rendah (*harmonic multi-sine noise*) dengan batas rotasi mikro ($\pm 0.0012\text{ rad}$), menjaga teks kode berukuran kecil tetap tajam (*pixel-crisp*).

---

## 📂 Struktur Direktori

```text
agentika-canvas/
├── PRD.md                         # Product Requirements Document
├── ROADMAP.md                     # Roadmap implementasi 7 Fase
├── CHANGELOG.md                   # Rekam jejak detail per fase
├── CLAUDE.md                      # Instruksi kerja Claude Code / Antigravity CLI
├── .antigravity/
│   └── rules.md                   # Doktrin ketat anti-AI slop untuk agen AI
├── public/
│   └── wasm-files/
│       ├── web-demuxer.wasm       # Biner WASM demuxer multi-format
│       └── web-demuxer-mini.wasm
├── src/
│   ├── core/
│   │   ├── Engine.ts              # Loop kanvas utama, mikrodetik timing & resolusi
│   │   ├── SceneGraph.ts          # Manajemen Layer & dynamic z-index (focusWindow)
│   │   ├── Timeline.ts            # Easing, interpolasi deterministik per-frame
│   │   ├── Camera.ts              # Handheld camera shake frekuensi rendah & viewport
│   │   └── Capabilities.ts        # Validasi hardware WebCodecs (H.264, VP9, AV1, AAC)
│   ├── kits/
│   │   ├── macos/
│   │   │   ├── MacOSDesktopLayer.ts  # Wallpaper & translucent menu bar Apple
│   │   │   ├── WindowLayer.ts        # Jendela desktop dengan traffic lights
│   │   │   ├── WebcamWindowLayer.ts  # Presenter overlay dengan audio waveform
│   │   │   └── CursorLayer.ts        # Kursor vektor macOS (default, pointer, resize)
│   │   ├── github/
│   │   │   └── GitHubRepoLayer.ts    # UI GitHub resmi & animated stars counter
│   │   ├── quiz/
│   │   │   └── QuizTemplateLayer.ts  # Template video kuis otomatis berbasis database
│   │   └── ExternalVideoLayer.ts     # Ingesti rekaman video eksternal ke kanvas
│   ├── media/
│   │   ├── Exporter.worker.ts     # Dedicated Web Worker untuk encoding MP4 tanpa lag UI
│   │   ├── MediaExporter.ts       # Orchestrator ekspor & browser download trigger
│   │   └── MediaIngestion.ts      # Demuxer Mediabunny & web-demuxer WASM
│   ├── studio/
│   │   ├── EditorApp.tsx          # Studio Editor: Viewport 1080p, Scrubber, Export MP4
│   │   └── FrameInspector.tsx     # Inspeksi frame demi frame & AI revision prompter
│   ├── scenes/
│   │   └── rea-opening.scene.ts   # Adegan hasil scaffolding otomatis dari naskah
│   ├── App.tsx                    # Root UI aplikasi Studio
│   └── main.tsx                   # Entry point aplikasi React/Vite
├── cli/
│   └── index.ts                   # CLI otomatisasi: generate-scene, inspect-script, batch-quiz
├── scripts/
│   └── sample-script.md           # Contoh naskah narasi dengan visual notes
├── data/
│   └── quiz-sample.json           # Contoh data soal kuis untuk batch video
└── tests/
    ├── phase1_phase2_verification.ts
    ├── phase3_verification.ts
    ├── phase4_verification.ts
    ├── phase5_verification.ts
    ├── phase6_verification.ts
    └── phase7_verification.ts
```

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### Prasyarat
* **Node.js** v18+ (direkomendasikan v20 / v22 / v24).
* **Peramban Modern**: Google Chrome, Microsoft Edge, Brave, atau browser berbasis Chromium lainnya yang mendukung WebCodecs API.

### 1. Kloning & Pemasangan Dependensi
```bash
git clone https://github.com/veragent/Agentika-canvas.git
cd Agentika-canvas
npm install
```

### 2. Menjalankan Studio Editor Lokal
```bash
npm run dev
```
Buka peramban di `http://localhost:3000` (atau port yang tertera) untuk mengakses antarmuka Studio Editor.

### 3. Kompilasi Produksi TypeScript & Bundle
```bash
npm run build
```
Hasil kompilasi siap produksi akan berada di direktori `dist/`.

---

## 🖥️ Alur Kerja Studio Editor & Frame Inspector

1. **Viewport 1080p Interaktif**:
   * Menampilkan rendering kanvas Full HD (1920×1080) secara *real-time* 60 FPS.
   * Floating HUD menampilkan nomor frame, framerate, dan kode waktu mikrodetik.
2. **Timeline Scrubber**:
   * Putar/Jeda (`Space`).
   * Geser maju/mundur 1 frame (`Left / Right Arrow`).
   * Lompat 10 frame (`Shift + Left / Right Arrow`).
   * *Slider range* untuk *scrubbing* cepat ke titik waktu mana pun.
3. **Pencatat Revisi AI Slop (`FrameInspector.tsx`)**:
   * Saat menemukan frame yang janggal (misalnya: *kursor terlalu cepat pada frame 42*), gunakan panel *Inspector & AI*.
   * Pilih *quick tag* atau tulis catatan perbaikan.
   * Klik tombol **"Salin Semua Prompt"** untuk menyalin instruksi revisi terstruktur dan tempelkan langsung ke **Antigravity CLI** atau **Claude Code**.
4. **Ekspor MP4 Sekali Klik**:
   * Klik tombol **"Export MP4"** di sudut kanan atas.
   * Browser akan menjalankan *Dedicated Web Worker* di latar belakang (`OffscreenCanvas`), melakukan *encoding* perangkat keras, dan memicu unduhan file `agentika-canvas-1080p.mp4` secara otomatis.

---

## 🤖 Otomatisasi Antigravity CLI (Naskah & Database ke Video)

Framework ini menyediakan *tooling* CLI untuk otomatisasi alur kerja pembuatan konten:

### 1. Menghasilkan Adegan Video dari Naskah Markdown
Buat file naskah dengan format narasi kutipan `> Narasi` dan catatan visual `[Visual]`:
```markdown
# Bedah Arsitektur agentika-canvas

> Narasi: "Selamat datang di bedah arsitektur agentika-canvas!"
[Visual]: Tampilkan macOS desktop dengan wallpaper Sequoia dan menu bar Apple.

> Narasi: "Mari kita buka repositori GitHub resmi proyek ini."
[Visual]: Kursor bergerak ke repositori GitHub, hover tombol Star, dan bintang naik ke 354k.
```

Jalankan perintah generator:
```bash
npm run cli -- generate-scene scripts/sample-script.md src/scenes/rea-opening.scene.ts
```
CLI akan menghitung durasi waktu bicara secara otomatis (~2.33 kata/detik), menghitung interval frame 60 FPS, dan menyusun file adegan TypeScript yang siap diekspor!

### 2. Inspeksi Waktu & Visual Naskah
```bash
npm run cli -- inspect-script scripts/sample-script.md
```

### 3. Batch Video Kuis Berbasis Database
```bash
npm run cli -- batch-quiz data/quiz-sample.json
```

---

## 🧪 Pengujian & Verifikasi Suite

Seluruh fase telah divalidasi dengan rangkaian uji unit dan uji integrasi:

```bash
# Uji Fase 1 & 2: WebCodecs Constants, Timeline Math & Dynamic z-index
npx tsx tests/phase1_phase2_verification.ts

# Uji Fase 3: Anti-AI Slop, Harmonic Camera Shake & Stars Counter
npx tsx tests/phase3_verification.ts

# Uji Fase 4: Frame Inspector, Diagnostic Microseconds & AI Prompter
npx tsx tests/phase4_verification.ts

# Uji Fase 5: Mediabunny Classes, MP4 Target Buffer & Codec Compliance
npx tsx tests/phase5_verification.ts

# Uji Fase 6: External Video Synchronization & WebDemuxer Integration
npx tsx tests/phase6_verification.ts

# Uji Fase 7: Script-to-Scene Parser & Database Quiz Template
npx tsx tests/phase7_verification.ts
```

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah lisensi **MPL-2.0 / MIT License**. Silakan baca berkas `LICENSE` untuk rincian selengkapnya.
