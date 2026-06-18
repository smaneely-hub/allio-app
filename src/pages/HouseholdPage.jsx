import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useNutritionProfile } from '../hooks/useNutritionProfile'
import { WeightTrendCard } from '../components/health/WeightTrendCard'
import { MemberAvatar } from '../components/household/MemberAvatar'
import { supabase } from '../lib/supabase'
import {
  ACTIVITY_LABELS,
  calculateTDEE,
} from '../lib/nutrition'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Lightly active' },
  { value: 'moderate', label: 'Moderately active' },
  { value: 'high', label: 'Very active' },
]

const GOALS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'gain', label: 'Gain weight' },
]

const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other / prefer not to say' },
]

const DIETARY_OPTIONS = ['none', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher', 'other']
const ALLERGY_OPTIONS = ['none', 'peanut', 'tree nut', 'egg', 'dairy', 'soy', 'shellfish', 'sesame', 'other']

function getIsMetric() {
  return typeof window !== 'undefined' && localStorage.getItem('allio-unit-preference') === 'metric'
}
// NutritionProfile form stores display units; convert to/from metric (kg, cm) for persistence
function kgToDisplay(kg, isMetric) {
  if (kg == null || kg === '') return ''
  return isMetric ? kg : +(Number(kg) * 2.20462).toFixed(1)
}
function displayToKg(val, isMetric) {
  if (val === '' || val == null) return ''
  return isMetric ? Number(val) : +(Number(val) / 2.20462).toFixed(2)
}

function displayToCm(val, isMetric) {
  if (val === '' || val == null) return ''
  return isMetric ? Number(val) : +(Number(val) * 2.54).toFixed(1)
}
// Member form stores display units; convert to/from imperial (inches, lbs) for persistence
function inchesToDisplay(inches, isMetric) {
  if (inches == null || inches === '') return ''
  return isMetric ? +(Number(inches) * 2.54).toFixed(1) : Number(inches)
}
function displayToInches(val, isMetric) {
  if (val === '' || val == null) return null
  return isMetric ? +(Number(val) / 2.54).toFixed(1) : Number(val)
}
function inchesToFeetInches(totalInches) {
  if (totalInches == null || totalInches === '') return { feet: '', inches: '' }
  const numeric = Number(totalInches)
  const feet = Math.floor(numeric / 12)
  const inches = Math.round(numeric - feet * 12)
  return { feet: String(feet), inches: String(inches) }
}
function feetInchesToInches(feet, inches) {
  const f = feet === '' || feet == null ? 0 : Number(feet)
  const i = inches === '' || inches == null ? 0 : Number(inches)
  if (Number.isNaN(f) || Number.isNaN(i)) return null
  const total = (f * 12) + i
  return total > 0 ? total : null
}
function calculateAgeFromBirthDate(dateOfBirth) {
  if (!dateOfBirth) return ''
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const hasBirthdayPassed = today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  if (!hasBirthdayPassed) age -= 1
  return age >= 0 ? age : ''
}
function lbsToDisplay(lbs, isMetric) {
  if (lbs == null || lbs === '') return ''
  return isMetric ? +(Number(lbs) / 2.20462).toFixed(1) : Number(lbs)
}
function displayToLbs(val, isMetric) {
  if (val === '' || val == null) return null
  return isMetric ? +(Number(val) * 2.20462).toFixed(1) : Number(val)
}

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChipGroup({ options, values, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = values.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-divider bg-white text-text-secondary hover:border-primary-200 hover:bg-primary-50'}`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function SelectWithOther({ label, options, value, otherValue, onChange, onOtherChange, otherPlaceholder }) {
  const showOther = value === 'other'
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">{label}</label>
      <select className="input w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option === 'none' ? 'None' : option === 'other' ? 'Other' : option}</option>
        ))}
      </select>
      {showOther ? (
        <input
          type="text"
          className="input mt-2 w-full"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={otherPlaceholder}
        />
      ) : null}
    </div>
  )
}

const NUTRITION_GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
]
const NUTRITION_DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher', 'low-carb', 'paleo', 'keto']
const NUTRITION_ALLERGY_OPTIONS = ['peanut', 'tree nut', 'egg', 'dairy', 'soy', 'shellfish', 'sesame', 'wheat', 'fish']

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-divider bg-white p-4">
      {title && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function NumericInput({ label, value, onChange, onBlur, unit, min, max, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="input w-full max-w-[7rem]"
        />
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
    </div>
  )
}

function SegmentControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-full bg-surface-muted p-1 ${className}`}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? 'bg-white text-text-primary shadow-card' : 'text-text-secondary'}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}


function normalizeMember(form, fallbackLabel) {
  const dietaryRaw = Array.isArray(form.dietary_restrictions) ? form.dietary_restrictions : ['none']
  const allergiesRaw = Array.isArray(form.allergies) ? form.allergies : ['none']
  const dietary = dietaryRaw[0] === 'other' ? [String(form.dietary_other || '').trim()].filter(Boolean) : (dietaryRaw[0] === 'none' ? [] : dietaryRaw)
  const allergies = allergiesRaw[0] === 'other' ? [String(form.allergy_other || '').trim()].filter(Boolean) : (allergiesRaw[0] === 'none' ? [] : allergiesRaw)
  return {
    name: String(form.name || '').trim(),
    label: String(form.name || form.label || fallbackLabel).trim(),
    age: form.age === '' ? '' : Number(form.age),
    date_of_birth: form.date_of_birth || null,
    sex: form.sex || '',
    gender: form.sex || form.gender || '',
    height_inches: form.height_inches === '' ? null : Number(form.height_inches),
    weight_lbs: form.weight_lbs === '' ? null : Number(form.weight_lbs),
    activity_level: form.activity_level || '',
    goal: form.goal || 'maintain',
    dietary_restrictions: dietary,
    allergies,
    food_preferences: [],
    restrictions: [...dietary, ...allergies].join(', '),
    preferences: '',
    health_considerations: [],
  }
}


function EmptyMemberForm() {
  return {
    name: '',
    age: '',
    date_of_birth: '',
    sex: '',
    height_inches: '',
    weight_lbs: '',
    activity_level: 'moderate',
    goal: 'maintain',
    dietary_restrictions: ['none'],
    allergies: ['none'],
    dietary_other: '',
    allergy_other: '',
  }
}

function MemberForm({ title, submitLabel, initialMember, onSubmit, saving }) {
  const isMetric = getIsMetric()

  const memberToDisplay = (m) => {
    const splitHeight = isMetric ? { feet: '', inches: '' } : inchesToFeetInches(m.height_inches)
    return {
      ...EmptyMemberForm(),
      ...m,
      age: m.date_of_birth ? calculateAgeFromBirthDate(m.date_of_birth) : (m.age ?? ''),
      date_of_birth: m.date_of_birth || '',
      height_inches: inchesToDisplay(m.height_inches, isMetric),
      height_feet: splitHeight.feet,
      height_only_inches: splitHeight.inches,
      weight_lbs: lbsToDisplay(m.weight_lbs, isMetric),
      dietary_restrictions: Array.isArray(m.dietary_restrictions) && m.dietary_restrictions.length ? (DIETARY_OPTIONS.includes(m.dietary_restrictions[0]) ? m.dietary_restrictions : ['other']) : ['none'],
      allergies: Array.isArray(m.allergies) && m.allergies.length ? (ALLERGY_OPTIONS.includes(m.allergies[0]) ? m.allergies : ['other']) : ['none'],
      dietary_other: Array.isArray(m.dietary_restrictions) && m.dietary_restrictions.length && !DIETARY_OPTIONS.includes(m.dietary_restrictions[0]) ? m.dietary_restrictions[0] : '',
      allergy_other: Array.isArray(m.allergies) && m.allergies.length && !ALLERGY_OPTIONS.includes(m.allergies[0]) ? m.allergies[0] : '',
    }
  }

  const [form, setForm] = useState(() => memberToDisplay(initialMember))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(memberToDisplay(initialMember))
  }, [initialMember])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const imperial = {
      ...form,
      age: form.date_of_birth ? calculateAgeFromBirthDate(form.date_of_birth) : form.age,
      height_inches: isMetric ? displayToInches(form.height_inches, isMetric) : feetInchesToInches(form.height_feet, form.height_only_inches),
      weight_lbs: displayToLbs(form.weight_lbs, isMetric),
    }
    await onSubmit(normalizeMember(imperial, 'Member 1'))
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-divider bg-white px-5 py-5">
      <div className="mb-4">
        <h3 className="text-base font-medium text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">Add at least one household member to unlock meal planning.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
          <input className="input w-full" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Birthday</label>
          <input type="date" className="input w-full" value={form.date_of_birth || ''} onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value, age: calculateAgeFromBirthDate(event.target.value) }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Sex</label>
          <select className="input w-full" value={form.sex} onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value }))}>
            <option value="">Select</option>
            {SEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">{isMetric ? 'Height (cm)' : 'Height'}</label>
          {isMetric ? (
            <input type="number" min={100} max={250} className="input w-full" value={form.height_inches} onChange={(event) => setForm((current) => ({ ...current, height_inches: event.target.value }))} placeholder="e.g. 170" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} max={8} className="input w-full" value={form.height_feet || ''} onChange={(event) => setForm((current) => ({ ...current, height_feet: event.target.value }))} placeholder="ft" />
              <input type="number" min={0} max={11} className="input w-full" value={form.height_only_inches || ''} onChange={(event) => setForm((current) => ({ ...current, height_only_inches: event.target.value }))} placeholder="in" />
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">{isMetric ? 'Weight (kg)' : 'Weight (lb)'}</label>
          <input type="number" min={isMetric ? 5 : 10} max={isMetric ? 300 : 700} className="input w-full" value={form.weight_lbs} onChange={(event) => setForm((current) => ({ ...current, weight_lbs: event.target.value }))} placeholder={isMetric ? 'e.g. 70' : 'e.g. 165'} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Activity level</label>
          <select className="input w-full" value={form.activity_level} onChange={(event) => setForm((current) => ({ ...current, activity_level: event.target.value }))}>
            {ACTIVITY_LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Goal</label>
          <select className="input w-full" value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}>
            {GOALS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SelectWithOther
          label="Dietary restrictions"
          options={DIETARY_OPTIONS}
          value={form.dietary_restrictions?.[0] || 'none'}
          otherValue={form.dietary_other || ''}
          onChange={(value) => setForm((current) => ({ ...current, dietary_restrictions: [value], dietary_other: value === 'other' ? current.dietary_other : '' }))}
          onOtherChange={(value) => setForm((current) => ({ ...current, dietary_other: value }))}
          otherPlaceholder="Enter dietary restriction"
        />

        <SelectWithOther
          label="Allergies"
          options={ALLERGY_OPTIONS}
          value={form.allergies?.[0] || 'none'}
          otherValue={form.allergy_other || ''}
          onChange={(value) => setForm((current) => ({ ...current, allergies: [value], allergy_other: value === 'other' ? current.allergy_other : '' }))}
          onOtherChange={(value) => setForm((current) => ({ ...current, allergy_other: value }))}
          otherPlaceholder="Enter allergy"
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={saving || !String(form.name || '').trim()} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

async function uploadMemberAvatar(userId, memberId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${memberId}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('member-avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('member-avatars').getPublicUrl(path)
  return data.publicUrl
}

function AvatarUpload({ memberId, userId, currentUrl, name, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploading(true)
    try {
      const url = await uploadMemberAvatar(userId, memberId, file)
      onUploaded(url)
      toast.success('Photo updated')
    } catch (err) {
      console.error('[AvatarUpload]', err)
      toast.error('Could not upload photo — check storage bucket is set up')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3">
      <MemberAvatar name={name} avatarUrl={currentUrl} size="lg" />
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !memberId}
          className="rounded-full border border-divider bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-muted disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : currentUrl ? 'Change photo' : 'Add photo'}
        </button>
        {!memberId ? <p className="mt-1 text-xs text-text-muted">Save member first to enable photo upload</p> : null}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

function MemberCard({ member, index, open, onToggle, onSave, saving, nutritionProfile, nutritionTargets, saveNutritionProfile, isPrimaryProfileMember, userId }) {
  const isMetric = getIsMetric()

  const memberToDisplay = (m) => {
    const splitHeight = isMetric ? { feet: '', inches: '' } : inchesToFeetInches(m.height_inches)
    return {
      name: m.name || m.label || '',
      age: m.date_of_birth ? calculateAgeFromBirthDate(m.date_of_birth) : (m.age ?? ''),
      date_of_birth: m.date_of_birth || '',
      sex: m.sex || m.gender || '',
      height_inches: inchesToDisplay(m.height_inches, isMetric),
      height_feet: splitHeight.feet,
      height_only_inches: splitHeight.inches,
      weight_lbs: lbsToDisplay(m.weight_lbs, isMetric),
      activity_level: m.activity_level || 'moderate',
      goal: m.goal || 'maintain',
      dietary_restrictions: Array.isArray(m.dietary_restrictions) && m.dietary_restrictions.length ? (DIETARY_OPTIONS.includes(m.dietary_restrictions[0]) ? m.dietary_restrictions : ['other']) : ['none'],
      allergies: Array.isArray(m.allergies) && m.allergies.length ? (ALLERGY_OPTIONS.includes(m.allergies[0]) ? m.allergies : ['other']) : ['none'],
      dietary_other: Array.isArray(m.dietary_restrictions) && m.dietary_restrictions.length && !DIETARY_OPTIONS.includes(m.dietary_restrictions[0]) ? m.dietary_restrictions[0] : '',
      allergy_other: Array.isArray(m.allergies) && m.allergies.length && !ALLERGY_OPTIONS.includes(m.allergies[0]) ? m.allergies[0] : '',
      avatar_url: m.avatar_url || '',
    }
  }

  const [form, setForm] = useState(() => memberToDisplay(member))

  const [nutritionForm, setNutritionForm] = useState(() => ({
    goal_type: nutritionProfile?.goal_type || member.goal || 'maintain',
    target_weight_kg: kgToDisplay(nutritionProfile?.target_weight_kg, isMetric),
    calories_target: nutritionProfile?.calories_target ?? '',
    protein_target_g: nutritionProfile?.protein_target_g ?? '',
    carbs_target_g: nutritionProfile?.carbs_target_g ?? '',
    fat_target_g: nutritionProfile?.fat_target_g ?? '',
    foods_to_avoid: Array.isArray(nutritionProfile?.foods_to_avoid) ? nutritionProfile.foods_to_avoid : [],
    dietary_restrictions: Array.isArray(nutritionProfile?.dietary_restrictions) ? nutritionProfile.dietary_restrictions : [],
    allergies: Array.isArray(nutritionProfile?.allergies) ? nutritionProfile.allergies : [],
    nutrition_mode: nutritionProfile?.nutrition_mode || 'auto',
  }))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(memberToDisplay(member))
  }, [member])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNutritionForm({
      goal_type: nutritionProfile?.goal_type || member.goal || 'maintain',
      target_weight_kg: kgToDisplay(nutritionProfile?.target_weight_kg, isMetric),
      calories_target: nutritionProfile?.calories_target ?? '',
      protein_target_g: nutritionProfile?.protein_target_g ?? '',
      carbs_target_g: nutritionProfile?.carbs_target_g ?? '',
      fat_target_g: nutritionProfile?.fat_target_g ?? '',
      foods_to_avoid: Array.isArray(nutritionProfile?.foods_to_avoid) ? nutritionProfile.foods_to_avoid : [],
      dietary_restrictions: Array.isArray(nutritionProfile?.dietary_restrictions) ? nutritionProfile.dietary_restrictions : [],
      allergies: Array.isArray(nutritionProfile?.allergies) ? nutritionProfile.allergies : [],
      nutrition_mode: nutritionProfile?.nutrition_mode || 'auto',
    })
  }, [nutritionProfile, member.goal, isMetric])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const imperial = {
      ...form,
      age: form.date_of_birth ? calculateAgeFromBirthDate(form.date_of_birth) : form.age,
      height_inches: isMetric ? displayToInches(form.height_inches, isMetric) : feetInchesToInches(form.height_feet, form.height_only_inches),
      weight_lbs: displayToLbs(form.weight_lbs, isMetric),
    }
    await onSave(member.id, { ...normalizeMember(imperial, `Member ${index + 1}`), avatar_url: form.avatar_url || null })
  }

  const nutritionField = (name) => ({
    value: nutritionForm[name] ?? '',
    onChange: (e) => setNutritionForm((current) => ({ ...current, [name]: e.target.value })),
    onBlur: async () => {
      await saveNutritionProfile({
        ...nutritionProfile,
        ...nutritionForm,
        profile_member_id: member.id,
        target_weight_kg: displayToKg(nutritionForm.target_weight_kg, isMetric),
      })
    },
  })

  const setAndSaveNutrition = async (patch) => {
    const updated = { ...nutritionForm, ...patch }
    setNutritionForm(updated)
    await saveNutritionProfile({
      ...nutritionProfile,
      ...updated,
      profile_member_id: member.id,
      target_weight_kg: displayToKg(updated.target_weight_kg, isMetric),
    })
  }

  const toggleNutritionChip = async (fieldName, value) => {
    const current = Array.isArray(nutritionForm[fieldName]) ? nutritionForm[fieldName] : []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    const updated = { ...nutritionForm, [fieldName]: next }
    setNutritionForm(updated)
    await saveNutritionProfile({
      ...nutritionProfile,
      ...updated,
      profile_member_id: member.id,
      target_weight_kg: displayToKg(updated.target_weight_kg, isMetric),
    })
  }

  const [foodsInput, setFoodsInput] = useState('')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFoodsInput((nutritionForm.foods_to_avoid || []).join(', '))
  }, [nutritionForm.foods_to_avoid])

  const commitFoodsToAvoid = async () => {
    const parsed = foodsInput.split(',').map((s) => s.trim()).filter(Boolean)
    const updated = { ...nutritionForm, foods_to_avoid: parsed }
    setNutritionForm(updated)
    await saveNutritionProfile({
      ...nutritionProfile,
      ...updated,
      profile_member_id: member.id,
      target_weight_kg: displayToKg(updated.target_weight_kg, isMetric),
    })
  }

  const metricProfile = {
    weight_kg: displayToKg(form.weight_lbs, isMetric),
    height_cm: isMetric ? displayToCm(form.height_inches, isMetric) : (feetInchesToInches(form.height_feet, form.height_only_inches) ? +(Number(feetInchesToInches(form.height_feet, form.height_only_inches)) * 2.54).toFixed(1) : ''),
    age_years: form.date_of_birth ? calculateAgeFromBirthDate(form.date_of_birth) : form.age,
    sex: form.sex,
    activity_level: form.activity_level,
    goal_type: form.goal,
  }
  const tdee = calculateTDEE(metricProfile)
  const effectiveTargets = nutritionForm.nutrition_mode !== 'manual' ? nutritionTargets : null

  const intakeSummary = [
    (member.date_of_birth || (member.age != null && member.age !== '')) ? `Age ${member.date_of_birth ? calculateAgeFromBirthDate(member.date_of_birth) : member.age}` : null,
    member.sex ? member.sex : null,
    member.height_inches
      ? (isMetric ? `${+(member.height_inches * 2.54).toFixed(0)} cm` : `${Math.floor(member.height_inches / 12)}'${Math.round(member.height_inches % 12)}"`)
      : null,
    member.weight_lbs
      ? (isMetric ? `${+(member.weight_lbs / 2.20462).toFixed(1)} kg` : `${member.weight_lbs} lb`)
      : null,
  ].filter(Boolean).join(' • ')

  return (
    <div className="overflow-hidden rounded-2xl border border-divider bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <MemberAvatar name={member.name || member.label} avatarUrl={member.avatar_url} size="md" />
          <div className="min-w-0">
            <div className="text-base font-medium text-text-primary">{member.name || member.label || `Member ${index + 1}`}</div>
            <div className="mt-0.5 text-sm text-text-secondary">{intakeSummary || 'Demographic details not provided yet'}</div>
            <div className="mt-0.5 text-xs text-text-muted">
              {[member.activity_level, member.goal, ...(member.dietary_restrictions || [])].filter(Boolean).slice(0, 3).join(' • ') || 'No planning modifiers yet'}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-text-muted">
          <ChevronIcon open={open} />
        </div>
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="border-t border-divider px-5 py-5">
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Profile photo</label>
            <AvatarUpload
              memberId={member.id}
              userId={userId}
              currentUrl={form.avatar_url}
              name={form.name || member.name}
              onUploaded={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
              <input className="input w-full" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Birthday</label>
              <input type="date" className="input w-full" value={form.date_of_birth || ''} onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value, age: calculateAgeFromBirthDate(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Sex</label>
              <select className="input w-full" value={form.sex} onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value }))}>
                <option value="">Select</option>
                {SEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">{isMetric ? 'Height (cm)' : 'Height'}</label>
              {isMetric ? (
                <input type="number" min={100} max={250} className="input w-full" value={form.height_inches} onChange={(event) => setForm((current) => ({ ...current, height_inches: event.target.value }))} placeholder="e.g. 170" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={1} max={8} className="input w-full" value={form.height_feet || ''} onChange={(event) => setForm((current) => ({ ...current, height_feet: event.target.value }))} placeholder="ft" />
                  <input type="number" min={0} max={11} className="input w-full" value={form.height_only_inches || ''} onChange={(event) => setForm((current) => ({ ...current, height_only_inches: event.target.value }))} placeholder="in" />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">{isMetric ? 'Weight (kg)' : 'Weight (lb)'}</label>
              <input type="number" min={isMetric ? 5 : 10} max={isMetric ? 300 : 700} className="input w-full" value={form.weight_lbs} onChange={(event) => setForm((current) => ({ ...current, weight_lbs: event.target.value }))} placeholder={isMetric ? 'e.g. 70' : 'e.g. 165'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Activity level</label>
              <select className="input w-full" value={form.activity_level} onChange={(event) => setForm((current) => ({ ...current, activity_level: event.target.value }))}>
                {ACTIVITY_LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Goal</label>
              <select className="input w-full" value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}>
                {GOALS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SelectWithOther
              label="Dietary restrictions"
              options={DIETARY_OPTIONS}
              value={form.dietary_restrictions?.[0] || 'none'}
              otherValue={form.dietary_other || ''}
              onChange={(value) => setForm((current) => ({ ...current, dietary_restrictions: [value], dietary_other: value === 'other' ? current.dietary_other : '' }))}
              onOtherChange={(value) => setForm((current) => ({ ...current, dietary_other: value }))}
              otherPlaceholder="Enter dietary restriction"
            />

            <SelectWithOther
              label="Allergies"
              options={ALLERGY_OPTIONS}
              value={form.allergies?.[0] || 'none'}
              otherValue={form.allergy_other || ''}
              onChange={(value) => setForm((current) => ({ ...current, allergies: [value], allergy_other: value === 'other' ? current.allergy_other : '' }))}
              onOtherChange={(value) => setForm((current) => ({ ...current, allergy_other: value }))}
              otherPlaceholder="Enter allergy"
            />
          </div>

          {isPrimaryProfileMember ? (
            <>
              <div className="mt-6 border-t border-divider pt-5">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-text-primary">Nutrition targets</h4>
                  <p className="mt-1 text-sm text-text-secondary">This member is your personal nutrition profile, so meal target settings live directly here.</p>
                </div>

                {tdee ? (
                  <p className="mb-4 text-xs text-text-muted">
                    Estimated TDEE: <span className="font-semibold text-text-primary">{tdee.toLocaleString()} kcal/day</span>
                  </p>
                ) : null}

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">Nutrition mode</label>
                    <SegmentControl
                      options={[{ value: 'auto', label: 'Auto (TDEE)' }, { value: 'manual', label: 'Manual' }]}
                      value={nutritionForm.nutrition_mode || 'auto'}
                      onChange={(value) => setAndSaveNutrition({ nutrition_mode: value })}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">Goal type</label>
                    <SegmentControl
                      options={NUTRITION_GOAL_OPTIONS}
                      value={nutritionForm.goal_type || form.goal || 'maintain'}
                      onChange={(value) => setAndSaveNutrition({ goal_type: value })}
                    />
                  </div>

                  {(nutritionForm.goal_type || form.goal) !== 'maintain' ? (
                    <NumericInput label="Target weight" unit={isMetric ? 'kg' : 'lbs'} min={isMetric ? 30 : 66} max={isMetric ? 300 : 661} placeholder={isMetric ? '65' : '143'} {...nutritionField('target_weight_kg')} />
                  ) : null}

                  {nutritionForm.nutrition_mode !== 'manual' ? (
                    effectiveTargets ? (
                      <div className="rounded-xl bg-surface px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          <span className="text-text-secondary">Calories: <strong className="text-text-primary">{effectiveTargets.calories.toLocaleString()} kcal</strong></span>
                          <span className="text-text-secondary">Protein: <strong className="text-text-primary">{effectiveTargets.protein_g}g</strong></span>
                          <span className="text-text-secondary">Carbs: <strong className="text-text-primary">{effectiveTargets.carbs_g}g</strong></span>
                          <span className="text-text-secondary">Fat: <strong className="text-text-primary">{effectiveTargets.fat_g}g</strong></span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">Fill in body stats to see calculated nutrition targets.</p>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <NumericInput label="Calories" unit="kcal" min={800} max={6000} placeholder="2000" {...nutritionField('calories_target')} />
                      <NumericInput label="Protein" unit="g" min={0} max={500} placeholder="150" {...nutritionField('protein_target_g')} />
                      <NumericInput label="Carbs" unit="g" min={0} max={700} placeholder="200" {...nutritionField('carbs_target_g')} />
                      <NumericInput label="Fat" unit="g" min={0} max={400} placeholder="65" {...nutritionField('fat_target_g')} />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">Nutrition-level dietary restrictions</label>
                    <ChipGroup options={NUTRITION_DIETARY_OPTIONS} values={nutritionForm.dietary_restrictions || []} onToggle={(value) => toggleNutritionChip('dietary_restrictions', value)} />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">Nutrition-level allergies</label>
                    <ChipGroup options={NUTRITION_ALLERGY_OPTIONS} values={nutritionForm.allergies || []} onToggle={(value) => toggleNutritionChip('allergies', value)} />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-primary">
                      Foods to avoid
                      <span className="ml-1 font-normal text-text-muted">(comma-separated)</span>
                    </label>
                    <textarea
                      className="input w-full resize-none"
                      rows={2}
                      placeholder="e.g. cilantro, blue cheese, anchovies"
                      value={foodsInput}
                      onChange={(e) => setFoodsInput(e.target.value)}
                      onBlur={commitFoodsToAvoid}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

export function HouseholdPage() {
  useDocumentTitle('Family Demographics | Allio')

  const { user } = useAuth()
  const { household, members, loading, saveMembers, repairMembers } = useHousehold()
  const {
    profile: nutritionProfile,
    loading: loadingNutrition,
    saving: savingNutrition,
    save: saveNutritionProfile,
    derivedTargets: nutritionTargets,
    weightHistory,
    logWeight,
  } = useNutritionProfile()
  const [savingMembers, setSavingMembers] = useState(false)
  const [openMemberId, setOpenMemberId] = useState(null)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [weightLogValue, setWeightLogValue] = useState('')
  const [weightLogDate, setWeightLogDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!members.length) {
      setOpenMemberId(null)
    }
  }, [members.length])

  const handleSaveMember = async (memberId, nextMember) => {
    setSavingMembers(true)
    try {
      const targetIndex = members.findIndex((member, index) => {
        const currentKey = member.id || `member-${index}`
        return currentKey === memberId || member.id === memberId
      })
      const nextMembers = members.map((member, index) => index === targetIndex ? { ...member, ...nextMember } : member)
      const refreshedMembers = await saveMembers(nextMembers)
      if (targetIndex === 0 && refreshedMembers?.[0]?.id) {
        await saveNutritionProfile({ ...nutritionProfile, profile_member_id: refreshedMembers[0].id })
      }
      toast.success('Family demographics saved')
    } catch (error) {
      toast.error(error?.message || 'Could not save family demographics')
    } finally {
      setSavingMembers(false)
    }
  }

  const handleRepair = async () => {
    setSavingMembers(true)
    try {
      await repairMembers()
      toast.success('Family members restored')
    } catch (error) {
      toast.error(error?.message || 'Could not restore family members')
    } finally {
      setSavingMembers(false)
    }
  }

  const handleAddFirstMember = async (nextMember) => {
    setSavingMembers(true)
    try {
      const refreshedMembers = await saveMembers([nextMember])
      if (refreshedMembers?.[0]?.id) {
        await saveNutritionProfile({ ...nutritionProfile, profile_member_id: refreshedMembers[0].id })
      }
      setShowAddMemberForm(false)
      toast.success('Family member added')
    } catch (error) {
      toast.error(error?.message || 'Could not add family member')
    } finally {
      setSavingMembers(false)
    }
  }

  const handleAddMember = async (nextMember) => {
    setSavingMembers(true)
    try {
      await saveMembers([...members, nextMember])
      setShowAddMemberForm(false)
      toast.success('Family member added')
    } catch (error) {
      toast.error(error?.message || 'Could not add family member')
    } finally {
      setSavingMembers(false)
    }
  }

  const memberCountLabel = useMemo(() => {
    if (members.length > 0) return `${members.length} household member${members.length === 1 ? '' : 's'}`
    return 'No members configured yet'
  }, [members.length])

  const primaryMember = useMemo(() => {
    if (!members.length) return null
    return members.find((member) => member.id && member.id === nutritionProfile.profile_member_id) || members[0]
  }, [members, nutritionProfile.profile_member_id])

  const primaryProfileMemberId = primaryMember?.id || null
  const isMetric = household?.unit_system === 'metric'

  const handleLogWeight = async (value, recordedOn) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error('Enter a valid weight')
      return
    }
    const valueKg = isMetric ? numeric : numeric / 2.20462
    try {
      await logWeight({ valueKg, recorded_on: recordedOn })
      setWeightLogValue('')
      toast.success('Weight logged')
    } catch (error) {
      toast.error(error?.message || 'Could not log weight')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="space-y-4">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
          <h1 className="font-display text-2xl text-text-primary md:text-3xl">Family demographics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Capture calorie-aware planning inputs per person. Household size stays derived from how many members you have.
          </p>
        </div>

        <section className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl text-text-primary">Household members</h2>
              <p className="mt-1 text-sm text-text-secondary">{memberCountLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.length > 0 ? (
                <button type="button" onClick={() => setShowAddMemberForm((current) => !current)} disabled={savingMembers} className="btn-secondary text-sm disabled:opacity-50">
                  {showAddMemberForm ? 'Cancel' : 'Add family member'}
                </button>
              ) : null}
              {!members.length && household?.id ? (
                <button type="button" onClick={handleRepair} disabled={savingMembers} className="btn-secondary text-sm disabled:opacity-50">
                  {savingMembers ? 'Restoring…' : 'Restore default members'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text-secondary">
            Household size: <span className="font-medium text-text-primary">{members.length || household?.total_people || 0}</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-divider bg-surface px-4 py-4 text-sm text-text-muted">Loading family demographics…</div>
            ) : members.length > 0 ? (
              <>
                {showAddMemberForm ? (
                  <MemberForm
                    title="Add another household member"
                    submitLabel="Add member"
                    initialMember={EmptyMemberForm()}
                    onSubmit={handleAddMember}
                    saving={savingMembers}
                  />
                ) : null}
                {members.map((member, index) => {
                  const memberKey = member.id || `member-${index}`
                  return (
                    <MemberCard
                      key={memberKey}
                      member={member}
                      index={index}
                      open={openMemberId === memberKey}
                      saving={savingMembers}
                      onToggle={() => setOpenMemberId((current) => current === memberKey ? null : memberKey)}
                      onSave={handleSaveMember}
                      nutritionProfile={nutritionProfile}
                      nutritionTargets={nutritionTargets}
                      saveNutritionProfile={saveNutritionProfile}
                      isPrimaryProfileMember={member.id === primaryProfileMemberId}
                      userId={user?.id}
                    />
                  )
                })}
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-dashed border-divider p-4 text-sm text-text-muted">
                  No family demographics are set up yet. Add your household members to improve meal sizing and planning.
                </div>
                <MemberForm
                  title="Add your first household member"
                  submitLabel="Add member"
                  initialMember={EmptyMemberForm()}
                  onSubmit={handleAddFirstMember}
                  saving={savingMembers}
                />
              </div>
            )}
          </div>
        </section>

        {!loadingNutrition && savingNutrition ? (
          <p className="text-xs text-text-muted">Saving nutrition profile…</p>
        ) : null}

        <section className="card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="lg:max-w-md">
              <h2 className="font-display text-xl text-text-primary">Weight & health progress</h2>
              <p className="mt-1 text-sm text-text-secondary">Log your weight over time and compare it against your target weight.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">Weight</label>
                  <input type="number" min={isMetric ? 5 : 10} max={isMetric ? 300 : 700} step="0.1" className="input w-full" value={weightLogValue} onChange={(e) => setWeightLogValue(e.target.value)} placeholder={isMetric ? '70.0' : '165.0'} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">Date</label>
                  <input type="date" className="input w-full" value={weightLogDate} onChange={(e) => setWeightLogDate(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => handleLogWeight(weightLogValue, weightLogDate)} className="btn-primary w-full text-sm">Log weight</button>
                </div>
              </div>
            </div>

            <div className="w-full lg:max-w-2xl">
              <WeightTrendCard entries={weightHistory} targetWeightKg={nutritionProfile?.target_weight_kg} isMetric={isMetric} defaultRangeDays={90} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
