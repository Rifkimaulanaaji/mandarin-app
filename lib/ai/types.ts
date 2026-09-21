export interface VocabularyItem {
  hanzi: string
  pinyin: string
  meaning: string
  example_sentence: string
  example_pinyin: string
  example_translation: string
}

export interface GeneratedLesson {
  vocabulary: VocabularyItem[]
}

export interface MistakeDetail {
  part: string
  problem: string
  explanation: string
}

export interface AIFeedback {
  is_correct: boolean
  user_answer: string
  corrected_answer: string
  mistakes: MistakeDetail[]
  alternative_answers: string[]
  explanation: string
}

export interface AIService {
  generateLesson(topic: string, difficulty: string): Promise<GeneratedLesson>
  evaluateAnswer(question: string, expectedAnswer: string, userAnswer: string): Promise<AIFeedback>
}