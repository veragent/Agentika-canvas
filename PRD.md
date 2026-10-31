# Product Requirements Document (PRD): Canvas + WebCodecs Video Framework

## 1. Ringkasan Eksekutif & Visi Produk
Proyek ini bertujuan membangun **Programmatic Video Generation Framework** (setara Remotion) yang berjalan **100% di dalam browser menggunakan HTML5 Canvas dan WebCodecs API** dengan biaya server **USD 0**. *Framework* ini dirancang agar ramah terhadap alur kerja *AI Agent* melalui **Antigravity CLI** (maupun asisten pengodean AI seperti Claude Code), memungkinkan kreator mengubah naskah bertanda visual atau data dari *database* menjadi video animasi beresolusi tinggi dan mengekspornya langsung menjadi file `.mp4` atau `.webm` di perangkat lokal.

---

## 2. Latar Belakang & Rumusan Masalah
Berdasarkan studi kasus produksi video otomatis (seperti *channel* Kuis Cerdas ID dan animasi bedah teknologi bergaya Nesi Nowware), terdapat tiga kendala utama pada solusi yang ada saat ini:

1. **Biaya Server & Ketergantungan FFmpeg pada Remotion**:
   * Merender video menjadi MP4 menggunakan *library* berbasis React seperti Remotion membutuhkan infrastruktur server dan FFmpeg yang menghabiskan biaya sekitar **USD 6 hingga USD 20 per bulan** (misalnya di platform Railway) hanya untuk proses *rendering*.
2. **Keterbatasan `z-index` pada Browser Renderer Berbasis DOM**:
   * Fitur *render* langsung di browser pada Remotion tidak mendukung properti `z-index`. Urutan tumpukan elemen di layar murni mengikuti urutan penulisan kode dari atas ke bawah (elemen yang ditulis paling bawah selalu tampil paling depan).
   * Pada konsep video yang menampilkan banyak jendela aplikasi (*window*) di satu layar desktop yang saling bergantian maju ke depan saat diklik, pengembang harus menyusun ulang urutan kode elemen setiap kali ada klik. Menggambar seluruh elemen secara terprogram di atas **HTML Canvas** menyelesaikan masalah ini sepenuhnya.
3. **Masalah Kualitas Visual Generasi Pertama AI (*"AI Slop"*)**:
   * Saat AI diberi naskah mentah tanpa *engine* dan komponen standar yang matang, hasil generasi pertamanya sering terlihat kaku dan buatan AI (contoh: tampilan *webcam* hanya tulisan *"no signal"*, bagian README berupa garis abu-abu, antarmuka GitHub tidak mirip aslinya, kursor bukan kursor asli Mac, transisi mengecilkan jendela terlalu cepat, serta guncangan kamera/*handheld shake* yang terlalu cepat hingga membuat teks kecil bergetar).
   * Dibutuhkan editor dengan fitur **inspeksi per *frame*** (*frame-by-frame*) agar kreator dapat mengiterasi revisi (bahkan hingga 17 kali revisi per adegan) bersama CLI/AI secara presisi sebelum menekan satu tombol ekspor ke MP4.

---

## 3. Target Pengguna & Kasus Penggunaan (*Use Cases*)
1. **Otomatisasi Video Berbasis Database**: Pembuatan video kuis atau konten informatif secara massal langsung dari *database* tanpa biaya server *render*.
2. **Video Storytelling & Eksplanasi Gaya Desktop (Nesi Nowware Style)**: Animasi terpusat pada satu tampilan desktop (seperti macOS) dengan manajemen banyak jendela aplikasi, pergerakan kursor mouse realistis layaknya tangan manusia, dan komponen UI yang akurat.
3. **Alur Kerja Naskah-ke-Video Berbantuan AI (Antigravity CLI Workflow)**: Kreator menulis naskah dengan catatan visual di bawah setiap kalimat, lalu mengeksekusi pembuatan dan revisi kode animasi per *frame* melalui CLI.

---

## 4. Spesifikasi Fungsional Inti (*Core Functional Requirements*)

### FR-01: Mesin Scene Graph HTML Canvas & Manajemen `z-index` Dinamis
* Setiap elemen visual (jendela aplikasi, kursor, teks, gambar, video eksternal) direpresentasikan sebagai objek `Layer` di dalam `Scene`.
* Setiap `Layer` memiliki properti `zIndex: number` yang dapat diubah kapan saja pada *timeline* (misalnya fungsi `bringToFront(windowId)` saat jendela diklik oleh kursor).
* Sebelum kanvas digambar pada *frame* ke-$i$, *engine* mengurutkan array `layers` berdasarkan nilai `zIndex` secara menaik ($\text{ascending}$), lalu memanggil metode `draw(ctx, frame, timestamp)` secara berurutan.

### FR-02: Sistem Timeline Deterministik & Kontrol Waktu Presisi
* Seluruh animasi tidak boleh bergantung pada `setTimeout` atau waktu nyata yang tidak stabil, melainkan fungsi murni terhadap nomor *frame* ($i$) atau waktu dalam satuan mikrodetik:
  $$\text{timestamp} = \frac{i \times 10^6}{\text{fps}}$$
* Menyediakan pustaka *easing* dan *motion primitives* bawaan untuk mencegah efek *AI slop*:
  * **Human Cursor Controller**: Pergerakan kursor dengan kurva Bezier/Spring dan pergantian ikon kursor asli macOS (`default`, `pointer`, `nwse-resize` saat mengecilkan jendela *webcam*).
  * **Controlled Camera Shake**: Efek guncangan kamera (*handheld*) dengan frekuensi rendah yang terkontrol per *frame* agar teks berukuran kecil tetap terbaca tajam dan tidak bergetar.

### FR-03: Antarmuka Studio Editor & Inspeksi *Frame-by-Frame*
* **Viewport Pratinjau Kanvas**: Menampilkan hasil gambar `<canvas>` secara langsung.
* **Kontrol Scrubbing Per Frame**: Tombol maju/mundur 1 *frame* (`Left/Right Arrow`), *slider timeline*, serta indikator nomor *frame* dan kode waktu (detik & mikrodetik) untuk memudahkan kreator mencatat kejanggalan animasi dan memerintahkan revisi via CLI.
* **Tombol Ekspor Satu Klik**: Tombol ekspor di sudut kanan atas editor yang langsung memicu proses *rendering* dari kanvas menjadi file MP4 di browser.

### FR-04: Pipa Encoding & Muxing Tanpa Server (WebCodecs + Mediabunny)
* Berjalan di browser klien menggunakan akselerasi perangkat keras (*hardware acceleration*) melalui **WebCodecs API** (dapat dijalankan di *Dedicated Web Workers* agar UI tidak membeku).
* Mendukung dua mode *rendering*:
  1. **Mode High-Level (Mediabunny `CanvasSource` & `AudioBufferSource`)**: Menghubungkan elemen `<canvas>` dan `AudioBuffer` langsung ke `Output` berformat `Mp4OutputFormat` atau `WebMOutputFormat` dengan target memori (`BufferTarget`) atau penulisan langsung ke disk (`StreamTarget`).
  2. **Mode Low-Level (`VideoEncoder` + `EncodedVideoPacketSource`)**: Mengambil `new VideoFrame(canvas, { timestamp })` per *frame*, melakukan *encode* menjadi `EncodedVideoChunk` (dengan penentuan `keyFrame` berkala, misalnya setiap 60 *frame*), segera memanggil `frame.close()` untuk membebaskan memori GPU, memanggil `await encoder.flush()` satu kali di akhir antrean, dan membungkusnya ke dalam kontainer MP4 melalui *muxer*.

### FR-05: Pipa Demuxing & Decoding Aset Eksternal
* Mendukung pemuatan file video/audio eksternal ke dalam adegan kanvas (misalnya rekaman *webcam* asli atau potongan klip).
* Menggunakan **Mediabunny** (`Input`, `BlobSource`/`UrlSource`, `VideoSampleSink`) atau **web-demuxer** (berbasis WebAssembly untuk format `mov`, `mp4`, `mkv`, `webm`, `flv`, `m4v`, `wmv`, `avi`, `ts`) guna mengekstrak `VideoDecoderConfig` dan `EncodedVideoChunk` pada titik waktu tertentu (`seek`), mendekodenya dengan `VideoDecoder` menjadi `VideoFrame`, menggambarnya ke kanvas (`ctx.drawImage`), lalu menutup *frame* (`frame.close()`).

### FR-06: Integrasi Antigravity CLI & Parser Naskah
* Menyediakan perintah CLI untuk menginisialisasi proyek, membuat *template* adegan baru dari file naskah Markdown (yang berisi kalimat narasi beserta catatan visual di bawahnya), serta menyediakan *preset* komponen siap pakai (Mac Desktop, Browser Window, GitHub Repo Page, Webcam Overlay).

---

## 5. Kebutuhan Non-Fungsional & Spesifikasi Teknis

### A. Target Performa & Ukuran Bundle (Berdasarkan Benchmark Mediabunny)
* **Ekstraksi Metadata**: Target hingga ~862 operasi/detik (dibandingkan `@remotion/media-parser` pada 233 ops/detik atau `ffmpeg.wasm` pada 1,83 ops/detik).
* **Pembacaan Paket Video**: Target hingga ~10.800 paket/detik.
* **Kecepatan Konversi/Pemrosesan**: Target hingga ~804 *frame*/detik (dibandingkan `@remotion/webcodecs` pada 324 *frame*/detik).
* **Ukuran Bundle Pustaka Media**: Menggunakan arsitektur *tree-shakable* tanpa dependensi (~17,3 kB untuk penulisan `.mp4` dan maksimal ~69,6 kB untuk seluruh fitur).

### B. Standar Kontainer & Codec String
WebCodecs API mewajibkan penggunaan *codec string* yang spesifik (bukan sekadar nama umum seperti `"h264"` atau `"vp9"`):

| Kontainer | Codec Video yang Didukung | Contoh Codec String Spesifik | Codec Audio yang Direkomendasikan |
| :--- | :--- | :--- | :--- |
| **MP4 (`.mp4`)** | H.264 (AVC) ✅, H.265 (HEVC) ✅, VP9 🟡, AV1 🟡 | `"avc1.4d0034"`, `"avc1.640032"` | **AAC** (`"mp4a.40.2"`) atau **Opus** |
| **WebM (`.webm`)** | VP8 ✅, VP9 ✅, AV1 ✅ | `"vp09.00.40.08.00"` | **Opus** (open-source, latensi rendah) |

---

## 6. Daftar Lengkap Sumber & Referensi Teknis

Seluruh perancangan dalam dokumen ini didasarkan pada sumber-sumber berikut:

1. **Studi Kasus Arsitektur & Workflow Animasi Claude Code**:
   * Sumber: Transkrip Video *"Animasi Video Otomatis dengan Claude"* (pembahasan migrasi dari Remotion + Railway ke HTML Canvas + WebCodecs API dengan biaya server USD 0, solusi masalah `z-index`, referensi gaya visual Nesi Nowware, dan proses inspeksi 17x revisi per *frame*).
2. **Dokumentasi Resmi WebCodecs API (MDN Web Docs)**:
   * Halaman Utama WebCodecs API: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
   * Konsep Pemrosesan Video: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Video_processing_concepts
   * Panduan Penggunaan WebCodecs API: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Using_the_WebCodecs_API
   * Panduan Pemilihan Codec (*Codec Selection*): https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection
   * Spesifikasi Model Pemrosesan W3C: https://w3c.github.io/webcodecs/#codec-processing-model-section
   * Sampel Resmi W3C WebCodecs: https://w3c.github.io/webcodecs/samples/
   * Praktik Terbaik Chrome WebCodecs: https://developer.chrome.com/docs/web-platform/best-practices/webcodecs
   * Antarmuka Inti MDN:
     * `VideoFrame`: https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame
     * `VideoEncoder`: https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder
     * `VideoDecoder`: https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
     * `EncodedVideoChunk`: https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk
     * `AudioData`: https://developer.mozilla.org/en-US/docs/Web/API/AudioData
     * `AudioEncoder`: https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder
     * `AudioDecoder`: https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder
     * `EncodedAudioChunk`: https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk
     * `DedicatedWorkerGlobalScope`: https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope
3. **Mediabunny — Toolkit Media JavaScript Lengkap untuk Browser**:
   * Situs Resmi & Dokumentasi: https://mediabunny.dev/
   * Panduan Pengenalan: https://mediabunny.dev/guide/introduction
   * Panduan Membaca File Media: https://mediabunny.dev/guide/reading-media-files
   * Panduan Menulis File Media: https://mediabunny.dev/guide/writing-media-files
   * Panduan Konversi File Media: https://mediabunny.dev/guide/converting-media-files
   * Format & Codec yang Didukung: https://mediabunny.dev/guide/supported-formats-and-codecs
   * Referensi Konteks LLM Mediabunny: https://mediabunny.dev/llms
   * Repositori GitHub (MPL-2.0 License): https://github.com/Vanilagy/mediabunny
4. **WebCodecs Fundamentals (Arsitektur Muxing, Demuxing & Desain Pola)**:
   * Situs Utama: https://webcodecsfundamentals.org/
   * Panduan Muxing & Demuxing: https://webcodecsfundamentals.org/basics/muxing/
   * Pola Pembuatan Video Terprogram (*Programmatic Video Generation*): https://webcodecsfundamentals.org/patterns/generation/
   * Pola Pengeditan Video: https://webcodecsfundamentals.org/patterns/editing/
   * Tabel Dukungan Codec: https://webcodecsfundamentals.org/datasets/codec-support-table/
   * Referensi LLM WebCodecs Fundamentals: https://webcodecsfundamentals.org/llms/
   * Repositori GitHub: https://github.com/sb2702/webcodecs-fundamentals
   * Utilitas Pendukung & Pustaka Terkait:
     * `MP4Demuxer` (`webcodecs-utils`): https://github.com/sb2702/webcodecs-utils/blob/main/src/demux/mp4-demuxer.ts
     * `MP4Box.js`: https://github.com/gpac/mp4box.js
     * `MP4Muxer`: https://github.com/Vanilagy/mp4-muxer
     * `WebMMuxer`: https://github.com/Vanilagy/webm-muxer
     * Spesifikasi MP4 Boxes: https://github.com/alfg/quick-dive-into-mp4
     * Spesifikasi WebM W3C: https://www.w3.org/TR/mse-byte-stream-format-webm/
     * Parser EBML (`ts-ebml`): https://github.com/legokichi/ts-ebml
5. **web-demuxer (Demuxer Multi-Format Berbasis WebAssembly untuk WebCodecs)**:
   * Repositori GitHub: https://github.com/bilibili/web-demuxer
   * Dokumentasi & Demo Interaktif: https://bilibili.github.io/web-demuxer/
   * Contoh Kode *Seek* Frame Video: https://github.com/bilibili/web-demuxer/blob/main/index.html#L131-L157
   * Contoh Kode Pemutaran Video: https://github.com/bilibili/web-demuxer/blob/main/index.html#L159-L197
   
