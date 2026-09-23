export function buildLessonPrompt(topic: string, difficulty: string): string {
  return `Buat 5 kosakata Traditional Chinese (繁體字) untuk topik "${topic}", untuk pelajar level ${difficulty} (setara HSK 1-2) yang baru beberapa minggu tinggal di Taiwan.

Aturan kosakata:
- Pilih kata yang benar-benar sering dipakai sehari-hari di Taiwan, bukan istilah Mainland. Contoh: 捷運 (bukan 地鐵), 腳踏車 (bukan 自行車), 計程車, 便利商店.
- Hanya kata atau frasa pendek (1-4 karakter). Hindari idiom, kata formal, dan kata abstrak.
- Pinyin dengan tanda nada (mā, má, mǎ, mà), bukan angka.
- meaning: Bahasa Indonesia, singkat (1-3 kata), satu arti utama.

Aturan kalimat contoh:
- Satu kalimat sangat sederhana (maksimal 10 karakter Hanzi) yang HARUS memuat kata target, selain itu hanya kata dasar.
- example_pinyin: pinyin lengkap kalimat itu, dengan tanda nada.
- example_translation: terjemahan Bahasa Indonesia yang natural dan hanya punya satu makna jelas, karena kalimat ini akan dipakai sebagai soal terjemahan.
- Semua Hanzi harus aksara tradisional, jangan campur dengan aksara sederhana.
- Hanya kata yang diucapkan sehari-hari oleh orang Taiwan dalam percakapan biasa. Jangan pakai kata formal atau bergaya tulisan (mis. 共食, 聚餐).
- Lima kata harus berbeda makna. Jangan ada dua kata dengan arti yang sama atau tumpang tindih.
- meaning harus terjemahan Indonesia yang paling akurat dan umum (mis. 便當 = "bento" atau "nasi kotak", bukan "bungkusan").
- Kalimat contoh harus kalimat yang benar-benar diucapkan penutur asli, dan tidak boleh punya bacaan ganda.

Output HARUS JSON murni tanpa markdown code fence, format:
{"vocabulary": [{"hanzi": "...", "pinyin": "...", "meaning": "...", "example_sentence": "...", "example_pinyin": "...", "example_translation": "..."}]}`
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
- ${voiceNote}
- Jika SALAH: mulai explanation dengan validasi singkat sebelum koreksi (mis. "Kamu mungkin ketukar dengan..."), lalu sebutkan yang benar. Jangan mulai dengan "Maaf" atau "Salah". Maksimal 3 kalimat, bahasa sederhana.
- Jika BENAR: explanation 1 kalimat, mistakes kosong kalau tidak ada typo.
- corrected_answer = ejaan yang benar.
- alternative_answers: HANYA jawaban lain yang juga diterima untuk soal ini (bukan penjelasan atau terjemahan silang). Maksimal 2. Kosongkan kalau tidak ada.

Output JSON murni (tanpa code fence):
{"is_correct":boolean,"user_answer":"...","corrected_answer":"...","mistakes":[{"part":"...","problem":"...","explanation":"..."}],"alternative_answers":["..."],"explanation":"..."}
`
}