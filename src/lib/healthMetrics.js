import { supabase } from './supabase'

export async function loadMetricHistory(userId, metricType, limit = 60) {
  if (!userId || !metricType) return []
  const { data, error } = await supabase
    .from('health_metric_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('metric_type', metricType)
    .order('recorded_on', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function addMetricLog({ user_id, metric_type, value, recorded_on, notes = null, source = 'manual' }) {
  const payload = {
    user_id,
    metric_type,
    value: Number(value),
    recorded_on,
    notes,
    source,
    updated_at: new Date().toISOString(),
  }

  const attemptUpsert = async () => supabase
    .from('health_metric_logs')
    .upsert(payload, { onConflict: 'user_id,metric_type,recorded_on' })
    .select('*')
    .single()

  let { data, error } = await attemptUpsert()

  const conflictTargetMissing = String(error?.message || '').includes('there is no unique or exclusion constraint matching the ON CONFLICT specification')
    || String(error?.message || '').includes('health_metric_logs_user_metric_date_key')
    || error?.code === '42P10'

  if (conflictTargetMissing) {
    const { data: existing, error: selectError } = await supabase
      .from('health_metric_logs')
      .select('id')
      .eq('user_id', user_id)
      .eq('metric_type', metric_type)
      .eq('recorded_on', recorded_on)
      .maybeSingle()

    if (selectError) throw selectError

    if (existing?.id) {
      const updateResult = await supabase
        .from('health_metric_logs')
        .update({
          value: Number(value),
          notes,
          source,
          updated_at: payload.updated_at,
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      data = updateResult.data
      error = updateResult.error
    } else {
      const insertResult = await supabase
        .from('health_metric_logs')
        .insert(payload)
        .select('*')
        .single()
      data = insertResult.data
      error = insertResult.error
    }
  }

  if (error) throw error
  return data
}

export async function updateMetricLog(id, patch) {
  const next = {
    ...patch,
    value: patch.value != null ? Number(patch.value) : undefined,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('health_metric_logs').update(next).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteMetricLog(id) {
  const { error } = await supabase.from('health_metric_logs').delete().eq('id', id)
  if (error) throw error
}
