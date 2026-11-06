# Design Sitemap — agentika-canvas

Indeks seluruh artefak desain dan spesifikasi pada proyek ini. Artefak baru hasil alur EGM (`/egm:egm-brainstorm` → `/egm:egm-draft` → `/egm:egm-review`) disimpan di direktori ini.

## Artefak Desain Aktif

| Dokumen | Status | Deskripsi |
| :--- | :---: | :--- |
| [../../PRD.md](../../PRD.md) | ✅ Approved | Product Requirements Document — visi, masalah, FR-01 s/d FR-06, spesifikasi codec |
| [../../ROADMAP.md](../../ROADMAP.md) | ✅ Approved | Roadmap implementasi 7 fase (Fase 1–7, seluruhnya selesai) |
| [../../ARCHITECTURE_ANALYSIS.md](../../ARCHITECTURE_ANALYSIS.md) | ✅ Approved | Analisa arsitektur: perbandingan Remotion vs Canvas+WebCodecs, matriks fase |
| [../../CHANGELOG.md](../../CHANGELOG.md) | ✅ Live | Rekam jejak rilis detail per fase (v1.0.0) |

## Rancangan EGM (Menunggu Desain)

* [scene-pack-mission-pipeline.md](scene-pack-mission-pipeline.md) | ✅ Implemented | Scene-as-Directory (IDENTITY.md + registry) & Render Mission Pipeline (check deterministik + reviewer + export gate). Konsep clean-room dari analisis Nouride/Evonic. *(Catatan: ditulis saat sesi `agy` terblokir 403; review EGM formal menunggu akun aktif.)*

## Konvensi Penamaan

* Nama berkas: `kebab-case.md` (contoh: `webcam-ingestion-v2.md`).
* Setiap desain baru wajib ditambahkan ke tabel di atas setelah disetujui (approved via `/egm:egm-review` + human sign-off).
* Dokumentasi yang sudah usang dipindahkan ke subdirektori `docs/designs/archive/`.

## Cadence Maintenance

* Jalankan `/egm:egm-drift-report` mingguan untuk memastikan dokumen desain tetap sinkron dengan kode aktif.
