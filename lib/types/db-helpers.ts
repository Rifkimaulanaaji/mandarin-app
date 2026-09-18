import type { Database } from '@/lib/supabase/database.types'
import type { AIFeedback } from './ai-feedback'

export type Attempt = Omit<
  Database['public']['Tables']['attempts']['Row'],
  'ai_feedback'
> & {
  ai_feedback: AIFeedback | null
}