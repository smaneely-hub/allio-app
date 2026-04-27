import { supabase } from './supabase'

function getOrCreateSessionId() {
  const KEY = 'allio_try_session_id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}

export async function recordTryFeedback({ recipeId, feedback }) {
  if (feedback !== 'up' && feedback !== 'down') return

  try {
    const sessionId = getOrCreateSessionId()
    const { error } = await supabase.from('public_try_feedback').insert({
      session_id: sessionId,
      recipe_id: recipeId ?? null,
      feedback,
      user_agent: navigator.userAgent?.slice(0, 500) ?? null,
    })

    if (error) console.warn('[try_feedback] insert failed', error)
  } catch (err) {
    console.warn('[try_feedback] threw', err)
  }
}
