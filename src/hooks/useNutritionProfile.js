import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { deriveNutritionTargets } from '../lib/nutrition'

const NUTRITION_DEFAULTS = {
  profile_member_id: null,
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
  'profile_member_id', 'goal_type', 'target_weight_kg', 'calories_target', 'protein_target_g',
  'carbs_target_g', 'fat_target_g', 'foods_to_avoid', 'dietary_restrictions',
  'allergies', 'nutrition_mode',
]

function poundsToKg(value) {
  if (value == null || value === '') return ''
  return +(Number(value) / 2.20462).toFixed(2)
}

function inchesToCm(value) {
  if (value == null || value === '') return ''
  return +(Number(value) * 2.54).toFixed(1)
}

function mergeProfileWithMember(data, member) {
  return {
    ...NUTRITION_DEFAULTS,
    ...data,
    profile_member_id: data?.profile_member_id || member?.id || null,
    weight_kg: member?.weight_lbs != null ? poundsToKg(member.weight_lbs) : '',
    height_cm: member?.height_inches != null ? inchesToCm(member.height_inches) : '',
    age_years: member?.age ?? '',
    sex: member?.sex || member?.gender || '',
    activity_level: member?.activity_level || '',
    goal_type: member?.goal || data?.goal_type || 'maintain',
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
        if (!msg.includes('does not exist') && !msg.includes('column')) {
          console.error('[useNutritionProfile] load error', error)
        }
        setProfile(NUTRITION_DEFAULTS)
        return
      }

      let profileMember = null
      const profileMemberId = data?.profile_member_id || null
      if (profileMemberId) {
        const { data: memberData, error: memberError } = await supabase
          .from('household_members')
          .select('*')
          .eq('id', profileMemberId)
          .maybeSingle()
        if (memberError) {
          console.error('[useNutritionProfile] profile member load error', memberError)
        } else {
          profileMember = memberData || null
        }
      }

      if (!profileMember) {
        const { data: fallbackMember, error: fallbackError } = await supabase
          .from('household_members')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (fallbackError) {
          console.error('[useNutritionProfile] fallback member load error', fallbackError)
        } else {
          profileMember = fallbackMember || null
        }
      }

      setProfile(mergeProfileWithMember(data, profileMember))
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (next) => {
    if (!user?.id) return
    setSaving(true)

    const basePayload = {
      user_id: user.id,
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

    let payload = {
      ...basePayload,
      profile_member_id: next.profile_member_id || null,
    }

    let { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })

    const profileMemberColumnMissing = String(error?.message || '').includes('profile_member_id') || error?.code === 'PGRST204'
    if (profileMemberColumnMissing) {
      payload = basePayload
      const retry = await supabase
        .from('user_preferences')
        .upsert(payload, { onConflict: 'user_id' })
      error = retry.error
    }

    if (error) {
      toast.error('Could not save nutrition profile')
      console.error('[useNutritionProfile] save error', error)
    } else {
      setProfile((current) => mergeProfileWithMember({ ...current, ...payload }, {
        id: next.profile_member_id || current.profile_member_id,
        age: next.age_years,
        sex: next.sex,
        gender: next.sex,
        height_inches: next.height_cm ? +(Number(next.height_cm) / 2.54).toFixed(1) : null,
        weight_lbs: next.weight_kg ? +(Number(next.weight_kg) * 2.20462).toFixed(1) : null,
        activity_level: next.activity_level,
        goal: next.goal_type,
      }))
      toast.success('Nutrition profile saved')
    }
    setSaving(false)
  }, [user?.id])

  const derivedTargets = deriveNutritionTargets(profile)

  return { profile, loading, saving, save, derivedTargets, reload: load }
}
