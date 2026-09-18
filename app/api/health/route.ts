import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Attempt } from '@/lib/types/db-helpers'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('topics').select('id').limit(1)
console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)
  if (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }

  
// contoh dummy, cuma buat test type-nya kepake bener apa enggak
const testAttempt: Attempt = {
  id: '123',
  exercise_id: '456',
  user_answer: 'test',
  input_type: 'text',
  is_correct: true,
  ai_feedback: {
    is_correct: true,
    user_answer: 'test',
    corrected_answer: 'test',
    mistakes: [],
    alternative_answers: [],
    explanation: 'test'
  },
  created_at: new Date().toISOString()
}

return NextResponse.json({ status: 'ok', connected: true, sample: data, testAttempt }
  )
}