export function buildLessonPrompt(topic: string, difficulty: string): string {
  return `User memberi topik mentah (bisa informal/typo/singkat): "${topic}"

Tugasmu juga membuat:
- title: judul topik yang rapi dan singkat (maks 5 kata), dalam Bahasa Indonesia.
- description: 1 kalimat pendek menjelaskan apa yang akan dipelajari di topik ini.

  
  Buat 5 kosakata Traditional Chinese (繁體字) untuk topik "${topic}", untuk pelajar level ${difficulty} (setara HSK 1-2) yang baru beberapa minggu tinggal di Taiwan.

Aturan kosakata:
- Pilih kata yang benar-benar sering dipakai sehari-hari di Taiwan, bukan istilah Mainland. Contoh: 捷運 (bukan 地鐵), 腳踏車 (bukan 自行車), 計程車, 便利商店.
- Hanya kata atau frasa pendek (1-4 karakter). Hindari idiom, kata formal, dan kata abstrak.
- Pinyin dengan tanda nada (mā, má, mǎ, mà), bukan angka.
- meaning: Bahasa Indonesia, singkat (1-3 kata), satu arti utama.

Aturan kalimat contoh:
- Kalimat HARUS berupa kalimat utuh dengan kata kerja + objek (atau subjek + kata kerja + objek), BUKAN pengulangan kata target sebagai frasa tunggal. Contoh SALAH: "飲料。", "這個菜。". Contoh BENAR: "我要買飲料。", "這個菜很好吃。".
- Maksimal 10 karakter Hanzi, dan HARUS memuat kata target. Selain kata target, hanya pakai kata dasar level HSK 1.
- Kalimat harus terdengar sopan dan natural untuk percakapan sehari-hari (memesan, minta tolong, bercerita santai). Hindari nada memerintah kasar — pakai kata kerja yang sesuai (mis. "我要喝水" bukan "給我水"; kalau memang minta tolong ke orang lain, boleh tambah 請).
- WAJIB dicek sebelum finalisasi: apakah kombinasi [kata kerja + kata target] punya makna idiomatik/konotasi lain yang tidak dimaksud. Contoh: "要飯" (yào fàn) berarti "mengemis", bukan "mau makan nasi" — kalimat yang benar harus pakai kata kerja eksplisit "我要吃飯", jangan menghilangkan kata kerjanya.
- example_pinyin: pinyin lengkap kalimat, digabung per kata (bukan per suku kata), dengan tanda nada, termasuk perubahan nada pada 一/不 sesuai bunyi aslinya (mis. "xià yí zhàn").
- example_translation: terjemahan Bahasa Indonesia yang natural dan hanya punya satu makna jelas, karena kalimat ini dipakai sebagai soal terjemahan.
- Semua Hanzi aksara tradisional, jangan campur dengan aksara sederhana.
- Hanya kata yang diucapkan sehari-hari oleh orang Taiwan. Jangan pakai kata formal/bergaya tulisan (mis. 共食, 聚餐).
- Lima kata harus berbeda makna, tidak ada dua kata yang artinya tumpang tindih.
- meaning harus terjemahan Indonesia paling akurat dan umum (mis. 便當 = "bento" atau "nasi kotak", bukan "bungkusan").
- Kalimat harus benar-benar seperti yang diucapkan penutur asli Taiwan, tidak boleh punya bacaan ganda atau ambigu.
Output HARUS JSON murni tanpa markdown code fence, format:
{"title": "...", "description": "...", "vocabulary": [{"hanzi": "...", "pinyin": "...", "meaning": "...", "example_sentence": "...", "example_pinyin": "...", "example_translation": "..."}]}`
}

export function buildEvaluatePrompt(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  inputType: 'text' | 'voice' = 'text'
): string {
    const voiceNote =
    inputType === 'voice'
      ? `
JAWABAN SUARA
- Jawaban user berasal dari transkripsi suara (speech-to-text), bukan ketikan. Abaikan tanda baca dan perbedaan aksara sederhana/tradisional.
- Transkrip bisa salah dengar (kata yang bunyinya mirip). Kalau jawaban terlihat salah karena kemiripan bunyi, jangan langsung menyalahkan: nilai apakah kemungkinan besar maksud user benar, dan sebutkan dengan ramah bahwa transkrip mungkin salah dengar atau pelafalan perlu dilatih.
- Aturan salah ketik (typo) tidak berlaku untuk jawaban suara.
`
      : ''
  return `Kamu adalah evaluator jawaban Mandarin (Traditional Chinese, Taiwan) untuk pelajar HSK 1. Nada ramah, singkat, tidak menggurui. Bicara langsung ke "kamu".

Soal: "${question}"
Jawaban referensi: "${expectedAnswer}"
Jawaban user: "${userAnswer}"

ATURAN:
- Nilai berdasarkan makna, bukan cocok kata per kata. Sinonim dianggap benar.
- Typo kecil bahasa Indonesia/Inggris yang maksudnya jelas tetap BENAR. Sebutkan di mistakes.
- Typo TIDAK berlaku untuk Hanzi/pinyin — karakter atau nada salah = kesalahan nyata.
- corrected_answer_pinyin: kalau corrected_answer mengandung Hanzi, isi pinyin lengkapnya (dengan tanda nada). Kalau corrected_answer tidak mengandung Hanzi (misal jawaban Bahasa Indonesia), isi null.
- ${voiceNote}
- Jika SALAH: mulai explanation dengan validasi singkat sebelum koreksi (mis. "Kamu mungkin ketukar dengan..."), lalu sebutkan yang benar. Jangan mulai dengan "Maaf" atau "Salah". Maksimal 3 kalimat, bahasa sederhana.
- Jika BENAR: explanation 1 kalimat, mistakes kosong kalau tidak ada typo.
- corrected_answer = ejaan yang benar.
- alternative_answers: HANYA jawaban lain yang juga diterima untuk soal ini (bukan penjelasan atau terjemahan silang). Maksimal 2. Kosongkan kalau tidak ada.

Output JSON murni (tanpa code fence):
{"is_correct":boolean,"user_answer":"...","corrected_answer":"...","mistakes":[{"part":"...","problem":"...","explanation":"..."}],"alternative_answers":["..."],"explanation":"...", "corrected_answer_pinyin": "..." | null}
`
}