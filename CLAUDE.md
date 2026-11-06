# CLAUDE.md: Petunjuk Kerja Proyek agentika-canvas

Repositori ini adalah framework pembuatan video terprogram (*programmatic video generation*) berbasis **HTML5 Canvas + WebCodecs API** yang berjalan **100% di browser klien dengan biaya server $0**.

**Dokumen instruksi lengkap:** `AGENTS.md` dan `.antigravity/rules.md` (doktrin wajib untuk semua agen AI).

---

## 🏛️ EGM (Elephant-Goldfish Model) — Spec-Driven Development

Plugin EGM (google/elephant-goldfish-model) terinstal. Gunakan alur desain untuk setiap fitur baru yang memerlukan keputusan arsitektur:

```
EGM artifact directory: docs/designs
```

| Skill | Fungsi |
| :--- | :--- |
| `/egm:egm-brainstorm <ide>` | Eksplorasi ide + Goldfish swarm, menghasilkan `concepts_brief.md` |
| `/egm:egm-draft` | Draft dokumen desain formal ke `docs/designs/` per-section |
| `/egm:egm-review docs/designs/<file>.md` | Review multi-stage oleh subagent fresh-context (5 lensa) |
| `/egm:egm-resolve` | Proses temuan review dan sepakati perubahan |
| `/egm:egm-bootstrap <path>` | Generate/update README hierarkis untuk direktori |
| `/egm:egm-review-loop` | Jalankan kelompok reviewer spesifik |
| `/egm:egm-drift-report` | Bandingkan dokumen desain vs kode aktif (mingguan) |

* Konteks proyek untuk Elephant: `_agents/skills/agentika_canvas_elephant/SKILL.md`.
* Review Goldfish WAJIB di subagent fresh-context (persona `egm-*`), tidak di konteks yang sama.
* Desain yang disetujui disimpan di `docs/designs/` dan diindeks di `docs/designs/SITEMAP.md`.
* Pengecualian: bug fix kecil dan jelas boleh langsung dikerjakan tanpa alur EGM.

---

## 🛠️ Perintah CLI Utama

* **Jalankan Studio Editor lokal**:
  ```bash
  npm run dev
  ```
* **Kompilasi TypeScript & Bundle Produksi**:
  ```bash
  npm run build
  ```
* **Otomatisasi Naskah ke Adegan Video (Antigravity CLI)**:
  ```bash
  npm run cli -- generate-scene scripts/sample-script.md src/scenes/rea-opening.scene.ts
  ```
* **Inspeksi Naskah Narasi & Waktu Visual**:
  ```bash
  npm run cli -- inspect-script scripts/sample-script.md
  ```
* **Batch Video Kuis Berbasis Database**:
  ```bash
  npm run cli -- batch-quiz data/quiz-sample.json
  ```
* **Jalankan Seluruh Test Suite Verifikasi**:
  ```bash
  npx tsx tests/phase1_phase2_verification.ts
  npx tsx tests/phase3_verification.ts
  npx tsx tests/phase4_verification.ts
  npx tsx tests/phase5_verification.ts
  npx tsx tests/phase6_verification.ts
  npx tsx tests/phase7_verification.ts
  npx tsx tests/phase8_verification.ts
  ```
* **Daftar Scene Pack & Render Mission (quality gate pra-export)**:
  ```bash
  npx tsx cli/index.ts packs
  npx tsx cli/index.ts mission rea-opening      # exit 0 hanya bila PASSED; menulis report.md
  ```

---

## 📐 Arsitektur & Prinsip Anti-AI Slop

1. **Dynamic z-index Layering (`src/core/SceneGraph.ts`)**:
   - Selalu gunakan `sceneGraph.focusWindow(id)` untuk memajukan jendela aplikasi. Jangan pernah menyusun ulang urutan array JSX secara manual.
2. **Kursor Manusia Asli macOS (`src/kits/macos/CursorLayer.ts`)**:
   - Gunakan jenis kursor `default`, `pointer` (hover tombol/link), dan `resize` (saat menyentuh sudut jendela webcam untuk mengecilkannya).
   - Gunakan interpolasi `Easing.humanSmooth` untuk simulasi pergerakan tangan manusia.
3. **Controlled Handheld Camera Shake (`src/core/Camera.ts`)**:
   - Gunakan guncangan kamera harmonik frekuensi rendah. Hindari goyangan liar agar teks kode dan terminal tetap tajam (*pixel-crisp*).
4. **Presisi Waktu Mikrodetik & Deterministik**:
   - Dilarang keras menggunakan `setTimeout` atau jam nyata. Seluruh animasi dihitung dari nomor frame ($i$) dengan rumus $\text{timestampUs} = (i \times 10^6) / \text{fps}$.
5. **Ekspor MP4 Tanpa Server (`src/media/Exporter.worker.ts`)**:
   - Seluruh proses render video menggunakan WebCodecs API dan Mediabunny di dalam Dedicated Web Worker untuk mengunduh file `.mp4` asli tanpa biaya server.
