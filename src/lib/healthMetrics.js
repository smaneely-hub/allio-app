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
  const { data, error } = await supabase
    .from('health_metric_logs')
    .upsert(payload, { onConflict: 'user_id,metric_type,recorded_on' })
    .select('*')
    .single()
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
