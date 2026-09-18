# TODO List — AI Mandarin Learning Web App

> Dibuat berdasarkan brief project + keputusan yang sudah difinalkan.
> Target: 7 hari development, deploy Vercel + Supabase.
> Stack: Next.js + Supabase (Postgres) + Claude (evaluasi) + Gemini Flash (generate konten) + Whisper API (voice, fase akhir).

---

## PHASE 0 — Project Setup & Foundation

### 0.1 Repo & Tooling
- [X] Init repo Git (buat dari awal, jangan mulai coding tanpa version control)
- [X] `.gitignore` mencakup: `.env*`, `node_modules`, `.next`, `.vercel`
- [X] Setup Next.js project (App Router, TypeScript diaktifkan)
- [X] Setup Tailwind CSS
- [X] Setup ESLint + Prettier (konsistensi kode, penting kalau vibe coding biar gak berantakan)
- [X] Setup struktur folder awal:
  ```
  /app
    /api
    /(routes halaman)
  /components
  /lib
    /ai         <- AIService abstraction
    /supabase   <- client & queries
  /types
  /prisma atau /supabase (schema)
  ```
- [X] Buat `README.md` dasar (cara run lokal, env vars yang dibutuhkan)

### 0.2 Environment & Secrets
- [X] Buat `.env.local` (JANGAN commit ke git)
- [X] Daftar env vars yang dibutuhkan didokumentasikan di `.env.example`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ANTHROPIC_API_KEY=
  GOOGLE_AI_API_KEY=
  OPENAI_API_KEY=          # buat Whisper, fase akhir
  ```
- [ ] Verifikasi: API key AI TIDAK PERNAH dipanggil dari client component — cek ulang tiap kali nambah fitur baru

### 0.3 Akun & Layanan Eksternal
- [X] Buat project Supabase baru (khusus project ini, bukan reuse dari hackathon lama)
- [ ] Buat API key Anthropic (Claude)
- [X] Buat API key Google AI Studio (Gemini)
- [X] Buat project Vercel, connect ke repo Git
- [ ] (Nanti Phase 5) Buat API key OpenAI khusus Whisper

---

## PHASE 1 — Database & Schema

### 1.1 Desain Schema
- [X] Buat tabel `topics` (id, name, description, difficulty, created_at)
- [X] Buat tabel `vocabulary` (id, topic_id FK, hanzi, pinyin, meaning, example_sentence, created_at)
- [X] Buat tabel `exercises` (id, topic_id FK, type, direction [id_to_zh / zh_to_id], question, expected_answer, metadata JSONB, created_at)
- [X] Buat tabel `attempts` (id, exercise_id FK, user_answer, input_type [text/voice], is_correct, ai_feedback JSONB, created_at)
- [X] Buat tabel `sessions` (id, topic_id FK, started_at, completed_at, score)
- [ ] Tentukan tipe data JSONB dengan jelas untuk `ai_feedback` (samakan dengan schema di brief section 8)

### 1.2 Setup di Supabase
- [ ] Jalankan migration/SQL untuk semua tabel di atas
- [ ] Set Row Level Security (RLS):
  - [ ] Karena single-user tanpa auth: matikan akses publik langsung ke tabel sensitif dari `anon` key
  - [ ] Semua write/read yang penting lewat API Route pakai `service_role` key (server-side only)
  - [ ] Kalau ada read langsung dari client (misal list topics), pastikan itu data yang aman untuk publik
- [ ] Test koneksi Supabase dari Next.js (buat 1 API route sederhana `/api/health` yang query DB, pastikan konek)

### 1.3 Type Safety
- [ ] Generate TypeScript types dari schema Supabase (`supabase gen types typescript`)
- [ ] Buat types manual untuk struktur `ai_feedback` JSON (is_correct, mistakes[], explanation, alternative_answers[])

---

## PHASE 2 — AI Service Layer (Abstraction)

### 2.1 Desain Interface
- [ ] Buat interface `AIService` di `/lib/ai/`:
  ```ts
  generateLesson(topic: string, difficulty: string): Promise<LessonContent>
  generateExercise(topic: string, direction: string): Promise<Exercise>
  evaluateAnswer(exercise: Exercise, userAnswer: string): Promise<AIFeedback>
  explainMistake(feedback: AIFeedback): Promise<string>  // atau digabung ke evaluateAnswer
  ```
- [ ] Implementasi provider Claude (`/lib/ai/providers/claude.ts`) — dipakai untuk `evaluateAnswer`
- [ ] Implementasi provider Gemini (`/lib/ai/providers/gemini.ts`) — dipakai untuk `generateLesson`, `generateExercise`
- [ ] Buat factory/config yang nentuin provider mana dipakai untuk fungsi apa (biar gampang swap nanti)

### 2.2 Prompt Engineering
- [ ] Tulis system prompt untuk `generateLesson`:
  - [ ] Eksplisit: Traditional Chinese characters (繁體字)
  - [ ] Eksplisit: gaya Taiwan Mandarin, hindari istilah khas Mainland kalau ada perbedaan umum
  - [ ] Level: Intermediate (konfirmasi HSK level kalau sudah dapat info)
  - [ ] Fokus: kosakata + kalimat kontekstual praktis, bukan entri kamus terisolasi
- [ ] Tulis system prompt untuk `generateExercise`:
  - [ ] Dukung dua arah: ID→Mandarin dan Mandarin→ID
  - [ ] Variasi tipe: recognition, comprehension, typing production
- [ ] Tulis system prompt untuk `evaluateAnswer` — INI PALING KRITIS:
  - [ ] Instruksikan AI untuk tidak terlalu strict
  - [ ] Instruksikan mengenali jawaban alternatif yang valid
  - [ ] Instruksikan output HARUS dalam format JSON sesuai schema (is_correct, user_answer, corrected_answer, mistakes[], alternative_answers[], explanation)
  - [ ] Instruksikan penjelasan dalam Bahasa Indonesia yang sederhana
  - [ ] Instruksikan AI untuk TIDAK mengarang aturan grammar yang tidak ada
- [ ] Simpan semua prompt di file terpisah (`/lib/ai/prompts.ts`) — jangan hardcode inline, biar gampang diiterasi

### 2.3 Validasi Output AI
- [ ] Buat validator (misal pakai Zod) untuk response JSON dari AI sebelum dipercaya frontend
- [ ] Handle kasus: AI return JSON tidak valid / field hilang / format aneh
- [ ] Tambahkan retry logic sederhana (1x retry kalau parsing gagal) sebelum fallback ke error message
- [ ] Buat fallback response yang aman kalau AI call gagal total (misal: "Terjadi kesalahan, coba lagi")

### 2.4 Testing AI Layer (Manual, sebelum lanjut ke UI)
- [ ] Test `generateLesson` dengan beberapa topik (belanja, interaksi sosial)
- [ ] Test `evaluateAnswer` dengan kasus: jawaban benar, salah total, salah grammar, benar tapi alternatif, kosong
- [ ] Review manual: apakah karakternya beneran Traditional? Apakah gaya bahasanya masuk akal buat Taiwan?

---

## PHASE 3 — Core Prototype (Alur Teks End-to-End)

### 3.1 Topic Selection
- [ ] Halaman/komponen pilih topik (list topik yang sudah ada + input topik baru custom)
- [ ] API Route: `POST /api/topics/generate` → panggil `generateLesson`, simpan ke DB (vocabulary + contoh kalimat)
- [ ] API Route: `GET /api/topics` → list topik yang sudah pernah dibuat (cache, gak generate ulang)
- [ ] Handle: topik yang sama diminta lagi → reuse dari DB, jangan generate ulang (cost awareness)

### 3.2 Tampilan Materi Belajar
- [ ] Komponen tampilkan vocabulary: Hanzi (font yang jelas), Pinyin, arti Indonesia
- [ ] Komponen tampilkan contoh kalimat kontekstual (multiple context per vocab item)
- [ ] Pastikan font Traditional Chinese render dengan benar di browser (test di mobile juga)

### 3.3 Exercise — Typing
- [ ] Generate exercise dari topik terpilih (`POST /api/exercises/generate` atau bagian dari topic generate)
- [ ] UI input teks untuk jawaban (support input Hanzi — pastikan user bisa ketik atau paste karakter Mandarin)
- [ ] API Route: `POST /api/exercises/evaluate` → panggil `evaluateAnswer`, simpan attempt ke DB
- [ ] Tampilkan hasil feedback terstruktur: benar/salah, jawaban user, jawaban benar, penjelasan kesalahan

### 3.4 Session Flow
- [ ] Buat alur: mulai sesi → beberapa exercise berurutan → selesai sesi
- [ ] Simpan `sessions` dan `attempts` ke DB
- [ ] Halaman hasil sesi sederhana (jumlah benar/salah, ringkasan)

### 3.5 Error Handling Dasar (Wajib, Bukan Opsional)
- [ ] Handle: jawaban kosong disubmit
- [ ] Handle: AI API gagal/timeout — tampilkan pesan error yang jelas, jangan silent fail
- [ ] Handle: network error di client (loading state, retry button)
- [ ] Handle: user submit berkali-kali cepat (debounce/disable button saat proses)
- [ ] Handle: topik/exercise tidak ditemukan (404 state)

### 3.6 Milestone Check
- [ ] Test end-to-end: pilih topik baru → materi muncul → jawab exercise → dapat feedback → sesi selesai
- [ ] Pastikan ini jalan mulus di localhost SEBELUM lanjut ke fitur berikutnya

---

## PHASE 4 — Voice (STT) — Dikerjakan Setelah Phase 3 Stabil

### 4.1 Riset & Testing Provider (Sebelum Implementasi)
- [ ] Kumpulkan beberapa sample rekaman suara asli dari temanmu (kalimat Mandarin sehari-hari, Traditional/Taiwan accent)
- [ ] Test sample-sample itu ke Whisper API — catat akurasi transkrip
- [ ] (Opsional pembanding) Test ke Azure Speech real-time — bandingkan hasil
- [ ] Putuskan provider final berdasarkan hasil nyata, bukan asumsi

### 4.2 Implementasi
- [ ] UI rekam suara (microphone permission, indikator sedang merekam)
- [ ] Kirim audio ke API Route (`POST /api/speech/transcribe`)
- [ ] API Route panggil Whisper (atau provider terpilih) → dapat teks
- [ ] Reuse endpoint `evaluateAnswer` yang sama dengan exercise typing (teks hasil transkrip diperlakukan sama)
- [ ] Tampilkan ke user: hasil transkrip yang terdeteksi (biar dia bisa cek sendiri kalau STT salah dengar) + feedback AI

### 4.3 Error Handling Voice
- [ ] Handle: permission microphone ditolak
- [ ] Handle: audio kosong/hening
- [ ] Handle: audio terlalu pendek/terlalu panjang
- [ ] Handle: gagal upload audio (network)
- [ ] Handle: STT API gagal/timeout
- [ ] Validasi ukuran file audio sebelum upload (jangan biarkan file raksasa)

### 4.4 Testing Voice
- [ ] Test dengan pengucapan jelas
- [ ] Test dengan noise background
- [ ] Test dengan jawaban pendek vs panjang
- [ ] Review manual: apakah transkrip cukup akurat untuk dipakai evaluasi?

---

## PHASE 5 — Progress & Persistence

- [ ] Halaman riwayat sesi (list sesi sebelumnya, tanggal, skor)
- [ ] Tampilkan progress dasar: topik yang sudah dipelajari, jumlah vocabulary yang sudah dilatih
- [ ] (Should have) Fitur retry exercise yang salah
- [ ] Pastikan data attempt tersimpan dengan benar untuk dipakai analisis manual nanti kalau perlu

---

## PHASE 6 — UI/UX Polish & PWA

### 6.1 Mobile-First Polish
- [ ] Review semua halaman di viewport mobile (bukan cuma desktop resize)
- [ ] Pastikan font Hanzi cukup besar dan jelas dibaca di layar kecil
- [ ] Loading states di semua proses async (generate topik, evaluate jawaban, upload voice)
- [ ] Error states yang jelas dan actionable (bukan cuma "Error" doang)
- [ ] Navigasi minimal dan jelas antar 6 layar utama (Home, Topic Selection, Learning Material, Exercise, Feedback, Session Result)

### 6.2 PWA (Installable Web App)
- [ ] Buat `manifest.json` (nama app, icon, theme color, display: standalone)
- [ ] Buat icon app (berbagai ukuran sesuai kebutuhan PWA)
- [ ] Setup service worker dasar (minimal untuk installability, gak perlu full offline-first)
- [ ] Test "Add to Home Screen" di HP (Android Chrome & iOS Safari — perilakunya beda-beda, test dua-duanya kalau memungkinkan)
- [ ] Pastikan app terasa "native-like" saat dibuka dari home screen (no browser chrome)

---

## PHASE 7 — Security & Reliability Review

### 7.1 Security Checklist
- [ ] Pastikan TIDAK ADA API key AI yang exposed di kode frontend/client bundle (cek `NEXT_PUBLIC_*` prefix, jangan taruh key rahasia di situ)
- [ ] Cek RLS Supabase sudah benar, gak ada tabel yang bisa diakses/ditulis publik tanpa kontrol
- [ ] Validasi semua input user sebelum diproses (jangan trust input mentah)
- [ ] Rate limiting sederhana di API routes yang manggil AI (cegah biaya membengkak kalau ada bug infinite loop / abuse)
- [ ] Jangan log API key atau data sensitif ke console/log production
- [ ] Validasi file audio (tipe file, ukuran) sebelum diproses ke STT

### 7.2 Reliability Checklist
- [ ] Semua API call ke AI provider punya timeout & error handling eksplisit
- [ ] Semua response AI divalidasi sebelum dipakai (tidak trust blind terhadap format JSON)
- [ ] Test skenario: refresh halaman di tengah sesi (apakah data ke-save atau hilang?)
- [ ] Test skenario: koneksi lambat (loading state gak infinite/stuck)

### 7.3 Cost Monitoring
- [ ] Tambahkan logging sederhana: berapa kali AI dipanggil per sesi (bisa cukup console log / simpan counter di DB)
- [ ] Cek dashboard usage Anthropic, Google AI, dan (nanti) OpenAI secara berkala selama testing

---

## PHASE 8 — Deployment

- [ ] Push semua env vars ke Vercel (Project Settings → Environment Variables)
- [ ] Deploy ke Vercel, cek build sukses tanpa error
- [ ] Test versi production (bukan cuma localhost) — buka dari HP asli
- [ ] Test install PWA dari versi production
- [ ] Cek Supabase connection dari environment production (bukan cuma lokal)
- [ ] Test ulang seluruh flow end-to-end di production: topic → materi → exercise teks → voice → hasil sesi

---

## PHASE 9 — Handoff ke Temanmu

- [ ] Siapkan instruksi singkat cara pakai (cara buka, cara install ke home screen, cara mulai sesi)
- [ ] Kasih tau dia kalau ini masih tahap testing — minta feedback spesifik (bukan cuma "gimana", tapi soal akurasi koreksi AI, soal STT, soal kecukupan materi)
- [ ] Siapkan cara dia kasih feedback balik ke kamu (chat langsung, atau form sederhana)
- [ ] Sepakati siapa yang pegang biaya jalan (Vercel + Supabase + AI usage) — sesuai kesepakatan awal kamu yang pegang, dananya dari dia

---

## Referensi Cepat — Keputusan yang Sudah Difinalkan

| Aspek | Keputusan |
|---|---|
| Karakter | Traditional Chinese (繁體) |
| Bahasa/Aksen | Mandarin standar gaya Taiwan |
| Arah exercise | Dua arah (ID↔Mandarin) |
| Level | Intermediate (ada sertifikat/dasar) |
| Topik awal | Interaksi sosial, belanja |
| Frontend | Next.js + Tailwind |
| Backend | Next.js API Routes |
| Database | Supabase (Postgres) |
| AI evaluasi | Claude |
| AI generate konten | Gemini Flash |
| STT | Ditunda ke Phase 4, evaluasi Whisper vs Azure dengan sample nyata |
| Auth | Tidak ada (single-user) |
| Deployment | Vercel |
| PWA | Ya, installable, bukan native app |

---

## Catatan Vibe Coding

Karena kamu kemungkinan bakal generate banyak kode cepat dengan AI assistance, beberapa pengingat penting biar tetap standar industri:

- Jangan skip Phase 0 (setup env, gitignore, struktur folder) meskipun terasa membosankan — ini yang mencegah API key ke-leak ke git history.
- Selalu commit per milestone kecil, jangan satu commit besar di akhir — kalau ada bug, gampang di-trace balik.
- Review output AI-generated code sebelum dipakai, terutama bagian yang menyentuh: validasi input, RLS Supabase, dan API key handling — ini tiga area paling rawan kalau asal terima kode tanpa baca.
- Jangan biarkan AI assistant "menyelesaikan semuanya sekaligus" — ikuti urutan fase di atas, testing tiap milestone sebelum lanjut, sesuai prinsip incremental development di brief.
