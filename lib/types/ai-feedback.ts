export interface MistakeDetail {
  part: string
  problem: string
  explanation: string
}

export interface AIFeedback {
  is_correct: boolean
  user_answer: string
  corrected_answer: string
  corrected_answer_pinyin: string | null
  mistakes: MistakeDetail[]
  alternative_answers: string[]
  explanation: string
}