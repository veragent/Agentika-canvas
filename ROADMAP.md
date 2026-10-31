# ROADMAP.md: Pengembangan Framework Video Canvas + WebCodecs dengan Antigravity CLI

Dokumen ini adalah panduan bertahap (*step-by-step roadmap*) untuk membangun *framework* pembuat video berbasis **HTML Canvas + WebCodecs API** menggunakan **Antigravity CLI**. Setiap fase dirancang modular agar mudah dieksekusi, diuji per *frame*, dan diiterasi oleh agen AI maupun pengembang.

---

## Arsitektur Direktori Target

Sebelum memulai Fase 1, arahkan Antigravity CLI untuk membangun struktur monorepo atau paket terpadu seperti berikut:

```text
canvas-webcodecs-framework/
├── PRD.md
├── ROADMAP.md
├── package.json
├── vite.config.ts
├── public/
│   └── wasm-files/
│       └── web-demuxer.wasm        # File WASM lokal untuk demuxing multi-format
├── src/
│   ├── core/
│   │   ├── Engine.ts               # Loop utama, manajemen waktu mikrodetik & resolusi
│   │   ├── SceneGraph.ts           # Manajemen Layer & pengurutan z-index dinamis
│   │   ├── Timeline.ts             # Easing, interpolasi, dan penjadwalan frame
│   │   └── Camera.ts               # Kontrol viewport, zoom, & handheld camera shake halus
│   ├── kits/
│   │   ├── macos/                  # Komponen Desktop Mac, Window Manager, & Kursor Asli Mac
│   │   ├── github/                 # Komponen UI Halaman Repo GitHub & animasi angka bintang
│   │   └── quiz/                   # Komponen template otomatis berbasis database
│   ├── media/
│   │   ├── Exporter.worker.ts      # Web Worker untuk VideoEncoder / Mediabunny Output MP4
│   │   ├── MediaExporter.ts        # Antarmuka pemicu render dari UI ke Worker
│   │   └── MediaIngestion.ts       # Demuxer & Decoder aset video/audio (Mediabunny & web-demuxer)
│   ├── studio/
│   │   ├── EditorApp.tsx           # UI Studio: Preview Canvas, Frame Scrubber, & Tombol Export
│   │   └── FrameInspector.tsx      # Alat pengecekan per frame untuk mencari kejanggalan ("AI slop")
│   └── scenes/
│       └── rea-opening.scene.ts    # Adegan yang di-generate oleh AI dari catatan naskah
└── cli/
    └── index.ts                    # Perintah otomatisasi pembuatan scene dari naskah/database
```

---

## Fase 1: Inisialisasi Proyek & Konfigurasi Pustaka Media
**Tujuan**: Menyiapkan lingkungan pengembangan berbasis TypeScript, Vite, serta mengintegrasikan pustaka `mediabunny` dan `web-demuxer`.

### Tugas Eksekusi Antigravity CLI:
1. **Inisialisasi Proyek**:
   * Buat proyek Vite dengan template TypeScript/React (React hanya digunakan untuk antarmuka kulit Studio Editor, sedangkan seluruh adegan video digambar murni di dalam `<canvas>`).
2. **Instalasi Dependensi Utama**:
   ```bash
   npm install mediabunny web-demuxer
   npm install -D @types/dom-webcodecs vite-plugin-static-copy
   ```
3. **Konfigurasi File Statis WASM (`web-demuxer`)**:
   * Salin file `dist/wasm-files/web-demuxer.wasm` dari paket `web-demuxer` ke dalam direktori `public/wasm-files/` menggunakan `vite-plugin-static-copy` (atau atur opsi fallback CDN ke `https://cdn.jsdelivr.net/npm/web-demuxer@latest/dist/wasm-files/web-demuxer.wasm`).
4. **Validasi Dukungan WebCodecs**:
   * Buat fungsi pengecekan `VideoEncoder.isConfigSupported()` saat aplikasi dimuat untuk memastikan ketersediaan akselerasi perangkat keras pada codec `"avc1.4d0034"` (H.264), `"vp09.00.40.08.00"` (VP9), dan `"av1"`.

---

## Fase 2: Core Canvas Engine, Timeline & Manajemen `z-index` Dinamis
**Tujuan**: Mengatasi kelemahan *render* browser pada Remotion dengan membangun sistem *layer* yang mendukung perubahan `z-index` secara dinamis di setiap *frame*.

### Tugas Eksekusi Antigravity CLI:
1. **Kontrak Antarmuka `CanvasLayer` (`src/core/SceneGraph.ts`)**:
   * Buat antarmuka standar untuk setiap elemen kanvas:
     ```typescript
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
       zIndex: number;
       visible: boolean;
       update(rc: RenderContext): void;
       draw(rc: RenderContext): void;
     }
     ```
2. **Pengurutan `z-index` Otomatis Per Frame**:
   * Di dalam metode `SceneGraph.renderFrame(rc)`, jalankan pengurutan semua *layer* yang `visible` berdasarkan properti `zIndex` (`layers.slice().sort((a, b) => a.zIndex - b.zIndex)`) tepat sebelum memanggil `layer.draw(rc)`.
   * Buat metode bantu `focusWindow(layerId: string)` yang secara otomatis mencari nilai `zIndex` tertinggi saat ini lalu mengatur `targetLayer.zIndex = maxZIndex + 1`. Dengan demikian, jendela yang diklik langsung maju ke paling depan tanpa perlu menyusun ulang urutan penulisan kode komponen.
3. **Sistem Timeline & Interpolasi Deterministik (`src/core/Timeline.ts`)**:
   * Buat fungsi `interpolate(frame, [startFrame, endFrame], [startVal, endVal], easingFn)` untuk mengatur posisi, skala, dan opasitas secara murni berdasarkan nomor *frame*.

---

## Fase 3: Komponen Visual Standar & Pencegah *"AI Slop"* (Gaya Nesi Nowware)
**Tujuan**: Menyediakan komponen antarmuka yang akurat dan pergerakan alami agar hasil generasi kode AI pertama maupun revisinya terlihat profesional seperti diedit manusia.

### Tugas Eksekusi Antigravity CLI:
1. **macOS Desktop & Window Manager Kit (`src/kits/macos/`)**:
   * Gambar latar belakang desktop Mac lengkap dengan bilah menu atas (*menu bar*) dan jendela aplikasi (*window*) dengan tombol lampu lalu lintas (*close, minimize, maximize*) serta bayangan (*drop shadow*) yang lembut.
   * Dukungan interaksi: Saat jadwal di *timeline* memerintahkan klik pada jendela tertentu, panggil `focusWindow()` dan jalankan transisi pengecilan/pembesaran jendela dengan durasi yang wajar (tidak terlalu cepat).
2. **Sistem Kursor Mouse Asli Mac (`src/kits/macos/CursorLayer.ts`)**:
   * Sediakan aset vektor (SVG/Path2D) kursor asli macOS: panah standar (`default`), tangan penunjuk (`pointer`), dan panah pengubah ukuran sudut (`resize`) yang otomatis aktif saat kursor menyentuh tepi jendela *webcam* untuk mengecilkannya.
   * Gunakan jalur kurva Bezier dengan sedikit perlambatan di awal dan akhir (*ease-in-out*) agar gerakan kursor menyerupai gerakan tangan manusia asli.
3. **Komponen UI Realistis (`src/kits/github/`)**:
   * Buat komponen penggambaran halaman repositori GitHub yang presisi (bukan sekadar garis abu-abu untuk README), lengkap dengan penghitung angka bintang (*stars counter*) yang dapat beranimasi naik (contoh: hingga 354.000 *stars*).
   * Buat komponen `WebcamWindowLayer` yang merender potongan video/gambar wajah asli, bukan sekadar kotak bertuliskan *"no signal"*.
4. **Efek Guncangan Kamera Terkontrol (`src/core/Camera.ts`)**:
   * Implementasikan transformasi kanvas (`ctx.translate` dan `ctx.rotate` skala mikro) menggunakan fungsi gelombang sinus/Perlin noise berfrekuensi rendah agar menghasilkan kesan rekaman tangan (*handheld*) yang organik tanpa membuat teks berukuran kecil terlihat bergetar.

---

## Fase 4: Studio Editor & Inspeksi *Frame-by-Frame* di Browser
**Tujuan**: Membangun antarmuka kerja tempat kreator memeriksa hasil kodingan AI per *frame*, menemukan kejanggalan, dan mengekspor video.

### Tugas Eksekusi Antigravity CLI:
1. **Pemutar & Scrubber Per Frame (`src/studio/FrameInspector.tsx`)**:
   * Buat kontrol pemutaran yang memungkinkan pengguna menggeser *frame* demi *frame* (mulai dari `frame = 0` hingga `totalFrames`).
   * Tampilkan informasi diagnostik di layar: Nomor Frame saat ini, Waktu dalam Detik, Timestamp dalam Mikrodetik, serta daftar urutan `zIndex` *layer* yang sedang aktif pada *frame* tersebut.
2. **Pencatat Revisi untuk AI Prompt**:
   * Tambahkan fitur untuk menyalin konteks *frame* saat ini (misalnya: *"Pada Frame 42 [1.40s], kursor saat mengecilkan webcam masih salah dan kecepatannya terlalu cepat"*) agar langsung bisa ditempelkan ke Antigravity CLI / Claude Code untuk proses revisi.
3. **Tombol Ekspor MP4 di Sudut Kanan**:
   * Sediakan tombol **"Export MP4"** di sudut kanan atas editor beserta indikator progres persen *rendering* dan estimasi kecepatan (*frames per second*).

---

## Fase 5: Pipa Ekspor WebCodecs API + Mediabunny ($0 Server)
**Tujuan**: Mengubah rangkaian *frame* HTML Canvas dan *track* audio menjadi file `.mp4` langsung di browser tanpa server.

### Tugas Eksekusi Antigravity CLI:
1. **Implementasi Jalur High-Level dengan Mediabunny (`src/media/MediaExporter.ts`)**:
   * Gunakan `Output`, `Mp4OutputFormat`, `BufferTarget` (atau `StreamTarget` untuk file besar), `CanvasSource`, dan `AudioBufferSource` dari `mediabunny`:
     ```typescript
     import {
       Output,
       Mp4OutputFormat,
       BufferTarget,
       CanvasSource,
       AudioBufferSource,
       Quality
     } from 'mediabunny';
     ```
2. **Implementasi Jalur Low-Level dengan `VideoEncoder` + `EncodedVideoPacketSource` (`src/media/Exporter.worker.ts`)**:
   * Jalankan di dalam *Dedicated Web Worker* menggunakan `OffscreenCanvas` agar antarmuka editor tetap responsif:
     * Inisialisasi `Output` Mediabunny dengan `EncodedVideoPacketSource('avc')`.
     * Konfigurasi `VideoEncoder` dengan `codec: "avc1.4d0034"` (atau `"avc1.640032"`), lebar, tinggi, *bitrate*, dan *framerate*.
     * Untuk setiap *frame* $i$ dari $0$ hingga $\text{totalFrames} - 1$:
       1. Panggil `sceneGraph.renderFrame()` pada kanvas.
       2. Buat `const frame = new VideoFrame(canvas, { timestamp: (i * 1e6) / fps })`.
       3. Panggil `encoder.encode(frame, { keyFrame: i % 60 === 0 })`.
       4. Wajib panggil `frame.close()` segera setelah masuk antrean untuk mencegah kebocoran memori GPU.
     * Setelah *loop* selesai, panggil `await encoder.flush()` **hanya satu kali**, lanjutkan dengan `await output.finalize()`, lalu kirimkan `Blob` bertipe `'video/mp4'` ke *thread* utama untuk diunduh otomatis oleh browser.

---

## Fase 6: Integrasi Demuxer & Decoder untuk Aset Video/Audio Eksternal
**Tujuan**: Memungkinkan kanvas merender potongan file video eksternal (seperti rekaman *webcam* atau rekaman layar) secara sinkron per *frame*.

### Tugas Eksekusi Antigravity CLI:
1. **Pembacaan Frame Presisi dengan Mediabunny (`VideoSampleSink`)**:
   * Gunakan `Input`, `UrlSource` / `BlobSource`, dan `VideoSampleSink` dari `mediabunny` untuk mengambil sampel *frame* pada titik waktu tertentu (`sink.getSample(timeInSeconds)`) atau melakukan iterasi (`for await (const frame of sink.samples())`).
2. **Dukungan Multi-Format dengan `web-demuxer` + `VideoDecoder`**:
   * Untuk format kontainer beragam (`mkv`, `flv`, `avi`, `ts`, `mov`, `mp4`, `webm`), buat kelas pembungkus `ExternalVideoLayer`:
     * Muat file menggunakan `await demuxer.load(file)`.
     * Ambil konfigurasi dengan `await demuxer.getDecoderConfig('video')`.
     * Lakukan pencarian *chunk* sesuai waktu *frame* kanvas menggunakan `await demuxer.seek('video', timeInSeconds)` atau aliran `demuxer.read('video', start, end)`.
     * Dekode menggunakan `VideoDecoder`, gambar `VideoFrame` ke kanvas dengan `ctx.drawImage(frame, x, y, w, h)`, lalu panggil `frame.close()`.

---

## Fase 7: Otomatisasi Antigravity CLI (Naskah & Database ke Video)
**Tujuan**: Menyediakan alur kerja berbasis perintah CLI untuk menghasilkan dan merevisi adegan secara cepat.

### Tugas Eksekusi Antigravity CLI:
1. **Generator Adegan dari Naskah (`cli/index.ts`)**:
   * Buat perintah CLI yang membaca file naskah berformat Markdown (di mana setiap kalimat memiliki catatan visual di bawahnya) dan secara otomatis men-scaffold file adegan TypeScript baru di `src/scenes/`.
2. **Aturan Prompt Sistem (*System Prompt Rules*) untuk AI Agent**:
   * Simpan instruksi standar di dalam repositori (`.antigravity/rules.md` atau `CLAUDE.md`) agar setiap kali AI diminta membuat atau merevisi animasi:
     * Selalu menggunakan `SceneGraph` dan `focusWindow()` untuk manajemen `z-index` jendela.
     * Selalu menggunakan `CursorLayer` dengan ikon kursor asli Mac dan kurva pergerakan manusia.
     * Menjaga frekuensi `CameraShake` tetap halus agar teks kecil tidak bergetar.
     * Memastikan setiap komponen UI (seperti GitHub atau Webcam) digambar secara detail, bukan *placeholder* garis abu-abu atau teks *"no signal"*.
3. **Konektor Otomatisasi Database**:
   * Buat *script* CLI untuk membaca baris data dari JSON/Database (seperti soal dan jawaban kuis), menyuntikkannya ke dalam *template* kanvas, dan menjalankan antrean *batch export* MP4 di browser secara otomatis.

---

## Referensi Dokumentasi untuk Pengembang & AI Agent

Gunakan daftar tautan berikut sebagai referensi konteks saat menjalankan perintah di **Antigravity CLI**:

* **Transkrip & Studi Kasus Arsitektur**: Sumber Notebook *"Animasi Video Otomatis dengan Claude"* (Konsep Canvas + WebCodecs $0 Server, perbaikan masalah `z-index` Remotion browser, gaya desktop Nesi Nowware, dan alur 17x revisi per *frame*).
* **MDN WebCodecs API**:
  * Dokumentasi Utama: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
  * Panduan Penggunaan: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Using_the_WebCodecs_API
  * Panduan Pemilihan Codec: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection
  * Konsep Pemrosesan Video: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Video_processing_concepts
* **Mediabunny (Muxing, Demuxing, CanvasSource & Konversi Cepat)**:
  * Situs Resmi: https://mediabunny.dev/
  * Dokumentasi LLM (Sangat disarankan untuk diumpankan ke Antigravity CLI): https://mediabunny.dev/llms
  * Panduan Menulis File Media: https://mediabunny.dev/guide/writing-media-files
  * Panduan Membaca File Media: https://mediabunny.dev/guide/reading-media-files
  * Repositori GitHub: https://github.com/Vanilagy/mediabunny
* **WebCodecs Fundamentals**:
  * Panduan Muxing & Demuxing: https://webcodecsfundamentals.org/basics/muxing/
  * Pola Pembuatan Video Terprogram: https://webcodecsfundamentals.org/patterns/generation/
  * Tabel Dukungan Codec: https://webcodecsfundamentals.org/datasets/codec-support-table/
  * Dokumentasi LLM: https://webcodecsfundamentals.org/llms/
  * Repositori GitHub: https://github.com/sb2702/webcodecs-fundamentals
* **web-demuxer (WebAssembly Demuxer untuk Multi-Format)**:
  * Repositori GitHub: https://github.com/bilibili/web-demuxer
  * Demo & Dokumentasi API: https://bilibili.github.io/web-demuxer/