# TODO List — AI Mandarin Learning Web App

> Dibuat berdasarkan brief project + keputusan yang sudah difinalkan.
> Target: 7 hari development, deploy Vercel + Supabase.
> Stack (revisi): Next.js + Supabase + Claude Haiku 4.5 via OpenRouter (evaluasi) + GLM-4.5 via OpenRouter, fallback z.ai (generate konten) + Whisper API (STT, Phase 4) + speechSynthesis browser (TTS, Phase 4).

---

## PHASE 0 — Project Setup & Foundation
(tidak diubah; centang sendiri yang belum)

## PHASE 1 — Database & Schema
(tidak diubah; centang sendiri yang belum)
- Tambahan dari Phase 2: kolom `vocabulary.example_pinyin` dan `vocabulary.example_translation` (nullable)
- Tambahan dari Phase 2: `exercises_type_check` diperluas (lihat catatan)
- Tambahan dari Phase 3: unique index `attempts_session_exercise_uniq` (session_id, exercise_id)

---

## PHASE 2 — AI Service Layer (Abstraction) ✅ SELESAI

Notes
CATATAN PHASE 3 → PHASE 2:
1. [X] Jumlah soal per sesi: sekarang 11 soal per topik (5 recognition, 2 production, 4 sentence translation), dihasilkan lewat kode, bukan dummy
2. [X] Exact match di submitAnswer() diganti evaluateAnswer(); exact match tetap dipakai HANYA sebagai shortcut hemat AI kalau jawaban persis sama dengan referensi ("struk / faktur" sekarang menerima "faktur")

### 2.1 Desain Interface
- [X] Buat interface `AIService` di `/lib/ai/` (dua fungsi: `generateLesson`, `evaluateAnswer`)
  - generateExercise DIBUANG: soal diturunkan dari vocab lewat kode (`lib/exercises/build.ts`), tanpa biaya AI
  - explainMistake DIGABUNG ke evaluateAnswer
- [X] Implementasi provider Claude → diganti satu file generik `providers/openai-compatible.ts` (OpenRouter, model Claude Haiku 4.5)
- [X] Implementasi provider Gemini → diganti GLM-4.5 via OpenRouter, fallback z.ai
- [X] Config provider per fungsi ada di `service.ts` (gampang swap)

### 2.2 Prompt Engineering
- [X] System prompt `generateLesson`:
  - [X] Eksplisit: Traditional Chinese characters (繁體字)
  - [X] Eksplisit: gaya Taiwan Mandarin, hindari istilah Mainland (contoh 捷運, 腳踏車)
  - [X] Level: REVISI jadi beginner (HSK 1-2), bukan intermediate
  - [X] Fokus: kosakata + kalimat kontekstual (dengan example_pinyin dan example_translation)
- [X] System prompt `generateExercise` → digantikan `buildExercises()` (tanpa AI)
  - [X] Dua arah ID→Mandarin dan Mandarin→ID
  - [X] Variasi tipe: vocab_recognition, vocab_production, sentence_translation
- [X] System prompt `evaluateAnswer`:
  - [X] Tidak terlalu strict
  - [X] Mengenali jawaban alternatif yang valid
  - [X] Output JSON sesuai schema
  - [X] Penjelasan Bahasa Indonesia sederhana
  - [X] Tidak mengarang aturan grammar
  - [X] Tambahan: aturan typo (benar tapi diingatkan ramah), batas panjang penjelasan, tidak membandingkan dengan referensi kalau sudah benar
- [X] Semua prompt di `/lib/ai/prompts.ts`

### 2.3 Validasi Output AI
- [X] Validator Zod untuk response AI
- [X] Handle JSON tidak valid / field hilang / format aneh
- [X] Retry (2 percobaan) sebelum error
- [X] Fallback saat AI gagal total: BUKAN feedback "salah" palsu; user dikembalikan ke form dengan jawaban terisi dan attempt tidak disimpan

### 2.4 Testing AI Layer
- [X] Test `generateLesson` dengan beberapa topik (naik MRT, makan bersama, makan)
- [X] Test `evaluateAnswer`: benar, salah total, alternatif/sinonim, kosong, typo, jawaban romanji
- [X] Review manual: aksara Traditional dan gaya Taiwan (kualitas vocab membaik setelah prompt diperketat)

---

## PHASE 3 — Core Prototype (Alur Teks End-to-End)

### 3.1 Topic Selection
- [X] Halaman pilih topik (list + input topik baru)
- [X] Generate topik (server action `createTopic`, bukan API route)
- [X] List topik (server component)
- [ ] Topik yang sama diminta lagi → reuse dari DB (BELUM; sekarang membuat topik duplikat)

### 3.2 Tampilan Materi Belajar
- [X] Komponen vocabulary: Hanzi, Pinyin, arti Indonesia
- [X] Contoh kalimat + pinyin + terjemahan (satu kalimat per kata; multi-konteks ditunda)
- [ ] Font Traditional Chinese dicek di mobile

### 3.3 Exercise — Typing
- [X] Generate exercise dari topik (buildExercises)
- [X] UI input teks
- [X] Evaluate + simpan attempt (server action)
- [X] Feedback terstruktur (benar/salah, jawaban user, jawaban benar, mistakes, alternatif, penjelasan)

### 3.4 Session Flow
- [X] Mulai sesi → exercise berurutan → selesai
- [X] Simpan sessions dan attempts
- [X] Halaman hasil sesi (benar dari total, skor)

### 3.5 Error Handling Dasar
- [X] Jawaban kosong
- [X] AI gagal/timeout (pesan jelas, jawaban tidak hilang)
- [ ] Network error di client (loading state global, retry)
- [X] Submit berkali-kali (tombol disabled + guard server + unique index)
- [X] Topik/exercise tidak ditemukan (404)

### 3.6 Milestone Check
- [X] Test end-to-end: buat topik → materi → jawab → feedback → hasil sesi

---

## PHASE 4 — Voice (STT + TTS) — Dikerjakan Setelah Phase 3 Stabil

### 4.0 Audio Output / TTS (dipindah dari rencana terpisah)
- [ ] `AudioButton` (speechSynthesis, zh-TW, rate 0.8) di Learning Material (kata + kalimat contoh)
- [ ] `AudioButton` di halaman feedback (dengar jawaban yang benar)
- [ ] Tes di HP asli temanmu: apakah suara zh-TW tersedia (iOS dan Android beda)
- [ ] Kalau tidak ada suara, tombol tersembunyi (jangan error)
- [ ] (Cadangan kalau kualitas kurang) TTS pra-generate (Azure/Google) disimpan di Supabase Storage

### 4.1 Riset & Testing Provider STT (Sebelum Implementasi)
- [ ] Kumpulkan sample rekaman suara asli temanmu (kalimat Mandarin sehari-hari, aksen Taiwan)
- [ ] Test ke Whisper API — catat akurasi transkrip
- [ ] Cek: apakah output aksara Traditional atau Simplified (uji parameter language dan prompt aksara tradisional)
- [ ] (Opsional) Bandingkan Azure Speech
- [ ] Putuskan provider final berdasarkan hasil nyata

### 4.2 Implementasi
- [ ] UI rekam suara (izin mic, indikator merekam) — ganti tombol 🎤 placeholder di Exercise page
- [ ] `POST /api/speech/transcribe` (atau server action)
- [ ] Panggil Whisper → teks
- [ ] Reuse evaluateAnswer; simpan attempt dengan input_type 'voice'
- [ ] Tampilkan transkrip yang terdeteksi + feedback AI
- [ ] Sesuaikan prompt evaluator untuk jawaban voice (lihat notes)

### 4.3 Error Handling Voice
- [ ] Izin mic ditolak
- [ ] Audio kosong/hening
- [ ] Audio terlalu pendek/panjang
- [ ] Gagal upload
- [ ] STT gagal/timeout
- [ ] Validasi ukuran file audio

### 4.4 Testing Voice
- [ ] Pengucapan jelas
- [ ] Noise background
- [ ] Jawaban pendek vs panjang
- [ ] Review manual akurasi transkrip

---

## PHASE 5 — Progress & Persistence
- [ ] Halaman riwayat sesi
- [ ] Progress dasar
- [ ] (Should have) Retry exercise yang salah — ingat: unique index attempts perlu dilonggarkan
- [ ] Data attempt tersimpan benar untuk analisis

## PHASE 6 — UI/UX Polish & PWA
- [ ] Review mobile
- [ ] Font Hanzi besar dan jelas
- [ ] Loading states (generate topik, evaluate, upload voice) — TERMASUK tombol "Buat Topik Baru" (proses 10-60 detik tanpa indikator; pertimbangkan ditarik maju)
- [ ] Error states actionable
- [ ] Navigasi 6 layar utama
- [ ] PWA: manifest, icon, service worker, test Add to Home Screen (Android dan iOS)

## PHASE 7 — Security & Reliability Review
- [ ] Tidak ada API key di client bundle
- [ ] RLS Supabase benar
- [ ] Validasi input user
- [ ] Rate limiting di endpoint/aksi yang memanggil AI (WAJIB: tanpa auth, siapa pun yang tahu URL bisa memicu biaya)
- [ ] Tidak log API key; kurangi dump response AI ke log
- [ ] Validasi file audio
- [ ] Semua panggilan AI punya timeout dan error handling (sudah untuk lesson dan evaluate; audit ulang)
- [ ] Test refresh di tengah sesi
- [ ] Test koneksi lambat
- [ ] Test kegagalan saat membuat topik dengan API key salah (tidak boleh ada topik setengah jadi)
- [ ] Test regresi topik lama (tanpa example_translation)
- [ ] Logging biaya per sesi (usage dari OpenRouter menyertakan cost)
- [ ] Cek dashboard usage secara berkala

## PHASE 8 — Deployment
- [ ] Env vars ke Vercel (OPENROUTER_API_KEY, ZAI_API_KEY, kunci Supabase, OPENAI_API_KEY untuk Whisper)
- [ ] Cek maxDuration sesuai batas plan Vercel
- [ ] Deploy dan cek build
- [ ] Test production dari HP asli
- [ ] Test install PWA production
- [ ] Cek koneksi Supabase production
- [ ] Test ulang end-to-end di production (topic → materi → teks → voice → hasil)

## PHASE 9 — Handoff ke Temanmu
- [ ] Instruksi singkat pemakaian
- [ ] Beri tahu ini masih tahap testing; minta feedback spesifik (akurasi koreksi, STT, kecukupan materi, tingkat kesulitan, apakah butuh mekanik puzzle)
- [ ] Cara dia kirim feedback
- [ ] Sepakati siapa pegang biaya

---

## Referensi Cepat — Keputusan yang Sudah Difinalkan

| Aspek | Keputusan |
|---|---|
| Karakter | Traditional Chinese (繁體) |
| Bahasa/Aksen | Mandarin standar gaya Taiwan |
| Arah exercise | Dua arah (ID↔Mandarin) |
| Level | REVISI: beginner (HSK 1, baru beberapa minggu di Taiwan) |
| Input jawaban | Ketik dan voice (eksplisit dari teman). Puzzle/balok ditunda sampai hasil testing 1 minggu |
| Tipe soal per topik | 5 vocab_recognition, 2 vocab_production, 4 sentence_translation (11 soal). sentence_construction dihapus dulu |
| Frontend | Next.js + Tailwind |
| Backend | Server actions + route handler Next.js |
| Database | Supabase (Postgres), tanpa ORM |
| AI evaluasi | Claude Haiku 4.5 via OpenRouter |
| AI generate konten | GLM-4.5 via OpenRouter, fallback z.ai |
| STT | Whisper, ditunda ke Phase 4 dengan tes sample suara asli |
| TTS | speechSynthesis browser (gratis), cadangan TTS pra-generate |
| Auth | Tidak ada (single-user) |
| Deployment | Vercel |
| PWA | Ya, installable |