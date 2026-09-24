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
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(150),
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
  corrected_answer_pinyin: z.string().nullable(),
  mistakes: z.array(mistakeDetailSchema),
  alternative_answers: z.array(z.string()),
  explanation: z.string(),
})