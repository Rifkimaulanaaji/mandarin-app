import { z } from 'zod'

export const vocabularyItemSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  meaning: z.string().min(1),
  example_sentence: z.string().min(1),
  example_pinyin: z.string().min(1),
  example_translation: z.string().min(1),
})

export const generatedLessonSchema = z.object({
  vocabulary: z.array(vocabularyItemSchema).min(1).max(10),
})

export const mistakeDetailSchema = z.object({
  part: z.string(),
  problem: z.string(),
  explanation: z.string(),
})

export const aiFeedbackSchema = z.object({
  is_correct: z.boolean(),
  user_answer: z.string(),
  corrected_answer: z.string(),
  mistakes: z.array(mistakeDetailSchema),
  alternative_answers: z.array(z.string()),
  explanation: z.string(),
})