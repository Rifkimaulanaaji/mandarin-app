export type VocabForExercise = {
  hanzi: string
  pinyin: string
  meaning: string
  example_sentence?: string | null
  example_pinyin?: string | null
  example_translation?: string | null
}

const RECOGNITION_COUNT = 5
const PRODUCTION_COUNT = 2
const SENTENCE_COUNT = 4

// Urutan: pengenalan (mudah) → produksi kata → terjemahan kalimat (paling sulit).
// created_at dibuat berurutan (selisih 1 ms) supaya urutan soal deterministik.
export function buildExercises(topicId: string, vocab: VocabForExercise[]) {
  const recognition = vocab.slice(0, RECOGNITION_COUNT).map((v) => ({
    type: 'vocab_recognition',
    direction: 'zh_to_id',
    question: `Apa arti "${v.hanzi}" (${v.pinyin})?`,
    expected_answer: v.meaning,
    metadata: { hanzi: v.hanzi, pinyin: v.pinyin },
  }))

  const production = vocab.slice(0, PRODUCTION_COUNT).map((v) => ({
    type: 'vocab_production',
    direction: 'id_to_zh',
    question: `Terjemahkan ke Mandarin: ${v.meaning}`,
    expected_answer: v.hanzi,
    metadata: { hanzi: v.hanzi, pinyin: v.pinyin },
  }))

  const sentence = vocab
    .filter((v) => v.example_sentence && v.example_translation)
    .slice(-SENTENCE_COUNT)
    .map((v) => ({
      type: 'sentence_translation',
      direction: 'id_to_zh',
      question: `Terjemahkan ke Mandarin: "${v.example_translation}"`,
      expected_answer: v.example_sentence as string,
      metadata: {
        hanzi: v.hanzi,
        pinyin: v.example_pinyin ?? null,
      },
    }))

  const base = Date.now()

  return [...recognition, ...production, ...sentence].map((e, i) => ({
    topic_id: topicId,
    ...e,
    created_at: new Date(base + i).toISOString(),
  }))
}