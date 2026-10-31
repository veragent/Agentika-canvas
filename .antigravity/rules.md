# Antigravity CLI Agent System Rules: agentika-canvas

Dokumen ini adalah aturan wajib (*mandatory prompt doctrines*) bagi setiap agen AI (Antigravity CLI, Claude Code, Gemini, atau subagent) saat membuat, memodifikasi, atau merevisi animasi video di repositori **agentika-canvas**.

---

## 1. Doktrin Utama: $0 Server & In-Browser Determinism
1. **Dilarang keras menggunakan server FFmpeg atau Puppeteer backend**: Seluruh proses render video berjalan 100% di browser lokal memanfaatkan **HTML5 Canvas 2D / OffscreenCanvas** dan **WebCodecs API** (`VideoEncoder` / `VideoDecoder`) via **Mediabunny**.
2. **Dilarang menggunakan `setTimeout`, `setInterval`, atau jam wall-clock nyata dalam logika animasi**:
   Semua pergerakan properti (posisi, skala, opasitas, rotasi) adalah fungsi murni matematis terhadap nomor frame ($i$) atau mikrodetik ($timestampUs$):
   $$\text{timestampUs} = \frac{i \times 10^6}{\text{fps}}$$

---

## 2. Aturan SceneGraph & Dynamic z-index (Anti-Remotion DOM Bug)
1. **Dilarang memanipulasi susunan array JSX/DOM untuk mengubah urutan layer**:
   Remotion di browser renderer mengabaikan CSS `z-index`. Di `agentika-canvas`, seluruh elemen visual didaftarkan sebagai `CanvasLayer` di dalam `SceneGraph`.
2. **Gunakan `focusWindow(layerId)`**:
   Saat jadwal timeline atau klik mouse memerintahkan suatu jendela maju ke depan, selalu panggil:
   ```typescript
   sceneGraph.focusWindow(targetLayerId);
   ```
   Metode ini secara otomatis menghitung $\max(\text{zIndex}) + 1$ di bawah batas aman `maxZCap = 900000`, sehingga layer langsung tampil di paling atas tanpa pernah menutupi kursor mouse.

---

## 3. Doktrin Anti-AI Slop (Gaya Visual Nesi Nowware)
Hasil generasi pertama maupun revisi kode animasi wajib terlihat seperti diedit oleh animator profesional, bukan hasil generatif mentah:

1. **Sistem Kursor Mouse Asli macOS (`CursorLayer.ts`)**:
   * Selalu gunakan `CursorLayer` dengan aset vektor presisi:
     - `default`: Panah hitam macOS dengan outline putih bersih.
     - `pointer`: Tangan penunjuk saat hover tautan / tombol Star.
     - `resize`: Panah ganda diagonal sudut 45 derajat (`nwse-resize`) saat menyentuh sudut jendela untuk mengecilkannya.
   * Pergerakan antar waypoints wajib menggunakan kurva pelunakan manusiawi:
     ```typescript
     interpolatePoint(frame, [startF, endF], p1, p2, Easing.humanSmooth);
     ```
2. **Komponen UI Realistis & Presisi**:
   * **GitHub UI (`GitHubRepoLayer.ts`)**: Wajib merender antarmuka resmi GitHub (header, breadcrumb, tab Code, commit row, file table, markdown readme). Angka bintang wajib beranimasi naik secara dinamis (contoh: dari 48k ke 354k).
   * **Webcam Overlay (`WebcamWindowLayer.ts`)**: Dilarang membuat kotak hitam bertuliskan "no signal". Selalu tampilkan siluet presenter studio dengan audio wave visualizer aktif dan badge REC berkedip.
   * **Transisi Jendela**: Berikan durasi wajar (minimal 40–80 frame pada 60 fps) dengan `Easing.easeInOutCubic` saat mengecilkan atau membesarkan jendela.
3. **Controlled Handheld Camera Shake (`Camera.ts`)**:
   * Guncangan kamera menggunakan *low-frequency harmonic multi-sine noise*.
   * Batasan ketat: `shakeIntensity <= 2.0px`, `rotationalShake <= 0.0015 rad`. Teks kode dan baris terminal berukuran kecil wajib tetap tajam dan terbaca tanpa getaran liar (*no jitter*).

---

## 4. Alur Kerja Naskah ke Video (Script-to-Scene Pipeline)
1. Baca naskah Markdown di `scripts/` yang memiliki blok kutipan `> Narasi` dan catatan visual `[Visual]`.
2. Gunakan parser CLI `cli/index.ts` untuk menghitung durasi frame berbasis kata (~2.33 kata/detik) dan men-scaffold file adegan di `src/scenes/`.
3. Gunakan Studio Editor (`EditorApp.tsx`) dan `FrameInspector.tsx` untuk melakukan pengecekan frame demi frame dan menyalin konteks perbaikan prompt jika ditemukan kejanggalan.
