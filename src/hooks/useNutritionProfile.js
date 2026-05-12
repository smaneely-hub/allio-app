import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { deriveNutritionTargets } from '../lib/nutrition'

const NUTRITION_DEFAULTS = {
  weight_kg: '',
  height_cm: '',
  age_years: '',
  sex: '',
  activity_level: '',
  goal_type: 'maintain',
  target_weight_kg: '',
  calories_target: '',
  protein_target_g: '',
  carbs_target_g: '',
  fat_target_g: '',
  foods_to_avoid: [],
  dietary_restrictions: [],
  allergies: [],
  nutrition_mode: 'auto',
}

const NUTRITION_COLS = [
  'weight_kg', 'height_cm', 'age_years', 'sex', 'activity_level',
  'goal_type', 'target_weight_kg', 'calories_target', 'protein_target_g',
  'carbs_target_g', 'fat_target_g', 'foods_to_avoid', 'dietary_restrictions',
  'allergies', 'nutrition_mode',
]

function coerceProfile(data) {
  return {
    ...NUTRITION_DEFAULTS,
    ...data,
    weight_kg: data?.weight_kg ?? '',
    height_cm: data?.height_cm ?? '',
    age_years: data?.age_years ?? '',
    target_weight_kg: data?.target_weight_kg ?? '',
    calories_target: data?.calories_target ?? '',
    protein_target_g: data?.protein_target_g ?? '',
    carbs_target_g: data?.carbs_target_g ?? '',
    fat_target_g: data?.fat_target_g ?? '',
    foods_to_avoid: Array.isArray(data?.foods_to_avoid) ? data.foods_to_avoid : [],
    dietary_restrictions: Array.isArray(data?.dietary_restrictions) ? data.dietary_restrictions : [],
    allergies: Array.isArray(data?.allergies) ? data.allergies : [],
    nutrition_mode: data?.nutrition_mode || 'auto',
  }
}

export function useNutritionProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(NUTRITION_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select(NUTRITION_COLS.join(','))
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) {
        const msg = String(error?.message || '')
        // Columns may not exist yet on local dev — degrade gracefully
        if (!msg.includes('does not exist') && !msg.includes('column')) {
          console.error('[useNutritionProfile] load error', error)
        }
      } else if (data) {
        setProfile(coerceProfile(data))
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (next) => {
    if (!user?.id) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      weight_kg: next.weight_kg !== '' && next.weight_kg != null ? Number(next.weight_kg) : null,
      height_cm: next.height_cm !== '' && next.height_cm != null ? Number(next.height_cm) : null,
      age_years: next.age_years !== '' && next.age_years != null ? Number(next.age_years) : null,
      sex: next.sex || null,
      activity_level: next.activity_level || null,
      goal_type: next.goal_type || 'maintain',
      target_weight_kg: next.target_weight_kg !== '' && next.target_weight_kg != null ? Number(next.target_weight_kg) : null,
      calories_target: next.calories_target !== '' && next.calories_target != null ? Number(next.calories_target) : null,
      protein_target_g: next.protein_target_g !== '' && next.protein_target_g != null ? Number(next.protein_target_g) : null,
      carbs_target_g: next.carbs_target_g !== '' && next.carbs_target_g != null ? Number(next.carbs_target_g) : null,
      fat_target_g: next.fat_target_g !== '' && next.fat_target_g != null ? Number(next.fat_target_g) : null,
      nutrition_mode: next.nutrition_mode || 'auto',
      foods_to_avoid: Array.isArray(next.foods_to_avoid) ? next.foods_to_avoid : [],
      dietary_restrictions: Array.isArray(next.dietary_restrictions) ? next.dietary_restrictions : [],
      allergies: Array.isArray(next.allergies) ? next.allergies : [],
    }
    const { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
    if (error) {
      toast.error('Could not save nutrition profile')
      console.error('[useNutritionProfile] save error', error)
    } else {
      setProfile(coerceProfile(next))
      toast.success('Nutrition profile saved')
    }
    setSaving(false)
  }, [user?.id])

  const derivedTargets = deriveNutritionTargets(profile)

  return { profile, loading, saving, save, derivedTargets }
}
