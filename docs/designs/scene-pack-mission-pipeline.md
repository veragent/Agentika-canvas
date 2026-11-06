# Scene Pack & Render Mission Pipeline — Design

> Status: ✅ Implemented (Phase 8, 6 Nov 2026)
> Asal konsep: analisis komparatif Nouride vs Evonic (`/workspace/docs/NOURIDE_VS_EVONIC_ANALYSIS.md`), clean-room adoption — tidak ada kode yang disalin (lisensi PolyForm/AGPL tidak kompatibel dengan MPL-2.0/MIT).
> Catatan alur EGM: sesi `agy` live terblokir 403 (pending appeal) — dokumen ini ditulis mengikuti struktur artefak EGM dan akan direview via `/egm:egm-review` saat akun aktif kembali.

---

## 1. Masalah

1. Scene hidup sebagai **satu file .ts lepas** (`rea-opening.scene.ts`) — tanpa identitas, tanpa metadata, tanpa hot-reload daftar scene; Studio membangun scene-nya sendiri secara inline sehingga scene file tidak benar-benar dipakai.
2. Rendering bersifat **fire-and-hope**: tidak ada verifikasi bahwa frame count konsisten, timeline monotonik, z-index tidak liar, tidak ada NaN, dan tidak ada frame kosong. "AI slop" hanya terdeteksi mata manusia lewat FrameInspector — setelah video diekspor.

## 2. Solusi

### 2.1 Scene Pack (Scene-as-Directory)

Terinspirasi Nouride ("agent adalah direktori Markdown, bukan proses"):

```text
src/scenes/rea-opening/
├── IDENTITY.md   manifest terbaca manusia & mesin (id, tags, kits, style, fps, resolusi, versi)
├── scene.ts      export createScene(fps?): SceneBundle (+ alias createScene)
└── report.md     (dihasilkan mission pipeline)
```

- `src/packs/ScenePack.ts` — parser IDENTITY.md (format ringan `- key: value`, tanpa dependensi YAML), registry framework-agnostic.
- `src/packs/loaders.vite.ts` — discovery via `import.meta.glob` (lazy → code-split; dev mode hot-reload daftar pack).
- `cli/index.ts packs` — discovery via fs (Node).
- `generate-scene` sekarang menulis **direktori pack** (scene.ts + IDENTITY.md), bukan file tunggal.
- `SceneBundle` dideklarasikan kanonik di `src/core/SceneBundle.ts` (sebelumnya diduplikasi di tiap scene).

### 2.2 Render Mission Pipeline

Terinspirasi Nouride missions ("selesai berarti check lolos DAN reviewer setuju — bukan agent yang bilang selesai"):

```text
brief/scene → attempt (≤ maxAttempts):
  1. factory() — bundle SEGARAK tiap attempt (state basi tidak boleh menutupi kegagalan)
  2. CHECK deterministik (12 frame sampel, tracking context tanpa canvas nyata):
     frame-count · duration-sanity · resolution-sanity · timeline-monotonic
     · zindex-cap · render-clean (NaN) · draw-density · layer-state-clean
     · camera-state-clean · pixel-luma (probe browser opsional)
  3. REVIEWER: DeterministicReviewer (approve / reject / needs-human)
     — >30% frame sampel kosong → reject; ada catatan manual FrameInspector → needs-human
  → report.md → EXPORT GATE (hanya status `passed` yang boleh render MP4)
```

Semantik Nouride yang diadopsi:
- **Kegagalan identik 3× berturut-turut → HALTED** ("berhenti dan bertanya", tidak membakar attempt percuma). Konstanta `MISSION_HALT_STREAK = 3`.
- **Timeout/degradasi anggun**: check pixel-luma ditandai `skipped` (bukan fail) saat pixel probe tak tersedia (Node CLI).
- Exit code CLI `mission`: 0 = passed, 1 = failed/halted (CI-friendly, pola `nouride doctor`).

### 2.3 HMADS-render (pre-export risk assessment)

`estimateExport()` — scoring risiko pra-encode (resolusi >4K, durasi >10 menit, estimasi file >500MB, fps >60) ditampilkan sebagai peringatan di modal export. Pola Evonic HMADS (advisory, bukan blocker) + gerbang destruktif ala Nouride (overwrite/berat = selalu tanya dulu).

## 3. Integrasi Studio

- **Selector Scene Pack** di header (glob lazy; default = Studio Default Scene inline).
- **Chip Mission** di header (not run / checking / PASSED / FAILED/ HALTED).
- **Kartu Mission Check** di modal export + peringatan pra-export + pesan gate.
- **`startExport` digerbang `assertMissionPassed()`** — "video yang gagal quality gate tidak pernah diekspor".
- Pixel probe browser: render frame di canvas hidup → sampling luma (mean/variance) tiap ~64 piksel.

## 4. File Baru/Diubah

| File | Peran |
|---|---|
| `src/core/SceneBundle.ts` | kontrak bundle kanonik (baru) |
| `src/packs/ScenePack.ts` | manifest + parser + registry (baru) |
| `src/packs/loaders.vite.ts` | discovery browser (baru) |
| `src/missions/types.ts` | tipe mission (baru) |
| `src/missions/checks.ts` | 10 check deterministik + tracking context (baru) |
| `src/missions/MissionRunner.ts` | runner + DeterministicReviewer + halt streak (baru) |
| `src/missions/report.ts` | report.md markdown (baru) |
| `src/missions/exportGate.ts` | assertMissionPassed + estimateExport (baru) |
| `src/scenes/rea-opening/` | scene pertama yang dimigrasi ke pack |
| `cli/index.ts` | +`packs`, +`mission`, generate-scene → pack |
| `src/studio/EditorApp.tsx` | selector pack, panel mission, export gate |
| `tests/phase8_verification.ts` | 12 kelompok test (semua hijau) |

## 5. Verifikasi

- `npx tsx tests/phase*_verification.ts` — 8/8 suite PASS (phase8: 60+ asersi).
- `npm run build` — hijau; pack ter-code-split jadi chunk lazy (`IDENTITY-*.js`, `scene-*.js`).
- CLI: `packs` menemukan rea-opening; `mission rea-opening` → PASSED 1/3 attempt, report.md ditulis.

## 6. Risiko & Antipattern (dicatat, tidak diimplementasi)

- Tidak mem-port binary Go / AST Python / SQLite (tak relevan in-browser; AGPL).
- Reviewer LLM/vision: interface `MissionReviewer` sudah disiapkan — implementasi vision-model ditunda (biaya + latensi); FrameInspector notes adalah jalur "needs-human" yang sudah jalan.
- Golden-frame regression: kandidat Phase 9 (evaluasi perceptual hash), belum masuk rilis ini.
