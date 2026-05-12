import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'
import { useNutritionProfile } from '../hooks/useNutritionProfile'
import {
  ACTIVITY_LABELS,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
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

const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher']
const ALLERGY_OPTIONS = ['peanut', 'tree nut', 'egg', 'dairy', 'soy', 'shellfish', 'sesame']

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

const NUTRITION_SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]
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

function NutritionProfileSection({ profile, saving, onSave }) {
  const [form, setForm] = useState(profile)

  useEffect(() => {
    setForm(profile)
  }, [profile])

  const field = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    onBlur: () => onSave(form),
  })

  const toggleChip = (fieldName, value) => {
    const current = Array.isArray(form[fieldName]) ? form[fieldName] : []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    const updated = { ...form, [fieldName]: next }
    setForm(updated)
    onSave(updated)
  }

  const setAndSave = (patch) => {
    const updated = { ...form, ...patch }
    setForm(updated)
    onSave(updated)
  }

  const tdee = calculateTDEE(form)
  const autoCalories = calculateTargetCalories(form)
  const autoMacros = autoCalories ? calculateMacros(autoCalories) : null
  const isAutoMode = form.nutrition_mode !== 'manual'

  const [foodsInput, setFoodsInput] = useState('')
  useEffect(() => {
    setFoodsInput((form.foods_to_avoid || []).join(', '))
  }, [profile])

  const commitFoodsToAvoid = () => {
    const parsed = foodsInput.split(',').map((s) => s.trim()).filter(Boolean)
    const updated = { ...form, foods_to_avoid: parsed }
    setForm(updated)
    onSave(updated)
  }

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl text-text-primary">Nutrition profile</h2>
        <p className="mt-1 text-sm text-text-secondary">Calorie and macro targets for your meal generation. Based on your personal stats, not per household member.</p>
      </div>

      <SectionCard title="Body stats">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumericInput label="Weight" unit="kg" min={30} max={300} placeholder="70" {...field('weight_kg')} />
          <NumericInput label="Height" unit="cm" min={100} max={250} placeholder="170" {...field('height_cm')} />
          <NumericInput label="Age" unit="yrs" min={10} max={120} placeholder="35" {...field('age_years')} />
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Sex</label>
            <select className="input w-full" value={form.sex || ''} onChange={(e) => setAndSave({ sex: e.target.value })}>
              <option value="">—</option>
              {NUTRITION_SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {tdee && (
          <p className="mt-3 text-xs text-text-muted">
            Estimated TDEE: <span className="font-semibold text-text-primary">{tdee.toLocaleString()} kcal/day</span>
          </p>
        )}
      </SectionCard>

      <SectionCard title="Activity & goal">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Activity level</label>
            <select className="input w-full max-w-sm" value={form.activity_level || ''} onChange={(e) => setAndSave({ activity_level: e.target.value })}>
              <option value="">Select activity level</option>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Goal</label>
            <SegmentControl options={NUTRITION_GOAL_OPTIONS} value={form.goal_type || 'maintain'} onChange={(v) => setAndSave({ goal_type: v })} />
          </div>
          {form.goal_type !== 'maintain' && (
            <NumericInput label="Target weight" unit="kg" min={30} max={300} placeholder="65" {...field('target_weight_kg')} />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Nutrition targets" description="Auto mode calculates from your stats. Manual lets you override.">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Mode</label>
            <SegmentControl
              options={[{ value: 'auto', label: 'Auto (TDEE)' }, { value: 'manual', label: 'Manual' }]}
              value={form.nutrition_mode || 'auto'}
              onChange={(v) => setAndSave({ nutrition_mode: v })}
            />
          </div>
          {isAutoMode ? (
            autoCalories ? (
              <div className="rounded-xl bg-surface px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-text-secondary">Calories: <strong className="text-text-primary">{autoCalories.toLocaleString()} kcal</strong></span>
                  {autoMacros && (
                    <>
                      <span className="text-text-secondary">Protein: <strong className="text-text-primary">{autoMacros.protein_g}g</strong></span>
                      <span className="text-text-secondary">Carbs: <strong className="text-text-primary">{autoMacros.carbs_g}g</strong></span>
                      <span className="text-text-secondary">Fat: <strong className="text-text-primary">{autoMacros.fat_g}g</strong></span>
                    </>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  {form.goal_type === 'lose' ? '−500 kcal from TDEE' : form.goal_type === 'gain' ? '+500 kcal from TDEE' : 'Matches TDEE'}
                  {' · '}macros split 30/40/30 (protein/carbs/fat)
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">Fill in your body stats and activity level to see your calculated targets.</p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumericInput label="Calories" unit="kcal" min={800} max={6000} placeholder="2000" {...field('calories_target')} />
              <NumericInput label="Protein" unit="g" min={0} max={500} placeholder="150" {...field('protein_target_g')} />
              <NumericInput label="Carbs" unit="g" min={0} max={700} placeholder="200" {...field('carbs_target_g')} />
              <NumericInput label="Fat" unit="g" min={0} max={400} placeholder="65" {...field('fat_target_g')} />
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Dietary preferences" description="Applied at the profile level in addition to household member settings.">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Dietary restrictions</label>
            <ChipGroup options={NUTRITION_DIETARY_OPTIONS} values={form.dietary_restrictions || []} onToggle={(v) => toggleChip('dietary_restrictions', v)} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Allergies</label>
            <ChipGroup options={NUTRITION_ALLERGY_OPTIONS} values={form.allergies || []} onToggle={(v) => toggleChip('allergies', v)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
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
      </SectionCard>

      {saving && <p className="text-xs text-text-muted">Saving…</p>}
    </section>
  )
}

function normalizeMember(form, fallbackLabel) {
  const dietary = Array.isArray(form.dietary_restrictions) ? form.dietary_restrictions : []
  const allergies = Array.isArray(form.allergies) ? form.allergies : []
  return {
    name: String(form.name || '').trim(),
    label: String(form.name || form.label || fallbackLabel).trim(),
    age: form.age === '' ? '' : Number(form.age),
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
    sex: '',
    height_inches: '',
    weight_lbs: '',
    activity_level: 'moderate',
    goal: 'maintain',
    dietary_restrictions: [],
    allergies: [],
  }
}

function MemberForm({ title, submitLabel, initialMember, onSubmit, saving }) {
  const [form, setForm] = useState(() => ({ ...EmptyMemberForm(), ...initialMember }))

  useEffect(() => {
    setForm({ ...EmptyMemberForm(), ...initialMember })
  }, [initialMember])

  const toggleArrayValue = (field, value) => {
    setForm((current) => {
      const existing = current[field] || []
      return {
        ...current,
        [field]: existing.includes(value)
          ? existing.filter((entry) => entry !== value)
          : [...existing, value],
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onSubmit(normalizeMember(form, 'Member 1'))
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
          <label className="mb-1 block text-sm font-medium text-text-primary">Age</label>
          <input type="number" min="0" max="120" className="input w-full" value={form.age} onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} placeholder="Age" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Sex</label>
          <select className="input w-full" value={form.sex} onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value }))}>
            <option value="">Select</option>
            {SEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Height (inches)</label>
          <input type="number" min="20" max="96" className="input w-full" value={form.height_inches} onChange={(event) => setForm((current) => ({ ...current, height_inches: event.target.value }))} placeholder="e.g. 68" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Weight (lb)</label>
          <input type="number" min="10" max="700" className="input w-full" value={form.weight_lbs} onChange={(event) => setForm((current) => ({ ...current, weight_lbs: event.target.value }))} placeholder="e.g. 165" />
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

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-text-primary">Dietary restrictions</label>
        <ChipGroup options={DIETARY_OPTIONS} values={form.dietary_restrictions} onToggle={(value) => toggleArrayValue('dietary_restrictions', value)} />
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-text-primary">Allergies</label>
        <ChipGroup options={ALLERGY_OPTIONS} values={form.allergies} onToggle={(value) => toggleArrayValue('allergies', value)} />
      </div>

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={saving || !String(form.name || '').trim()} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function MemberCard({ member, index, open, onToggle, onSave, saving }) {
  const [form, setForm] = useState({
    name: member.name || member.label || '',
    age: member.age ?? '',
    sex: member.sex || member.gender || '',
    height_inches: member.height_inches ?? '',
    weight_lbs: member.weight_lbs ?? '',
    activity_level: member.activity_level || 'moderate',
    goal: member.goal || 'maintain',
    dietary_restrictions: Array.isArray(member.dietary_restrictions) ? member.dietary_restrictions : [],
    allergies: Array.isArray(member.allergies) ? member.allergies : (Array.isArray(member.food_preferences) ? member.food_preferences : []),
  })

  useEffect(() => {
    setForm({
      name: member.name || member.label || '',
      age: member.age ?? '',
      sex: member.sex || member.gender || '',
      height_inches: member.height_inches ?? '',
      weight_lbs: member.weight_lbs ?? '',
      activity_level: member.activity_level || 'moderate',
      goal: member.goal || 'maintain',
      dietary_restrictions: Array.isArray(member.dietary_restrictions) ? member.dietary_restrictions : [],
      allergies: Array.isArray(member.allergies) ? member.allergies : (Array.isArray(member.food_preferences) ? member.food_preferences : []),
    })
  }, [member])

  const toggleArrayValue = (field, value) => {
    setForm((current) => {
      const existing = current[field] || []
      return {
        ...current,
        [field]: existing.includes(value)
          ? existing.filter((entry) => entry !== value)
          : [...existing, value],
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onSave(member.id, normalizeMember(form, `Member ${index + 1}`))
  }

  const intakeSummary = [
    member.age != null && member.age !== '' ? `Age ${member.age}` : null,
    member.sex ? member.sex : null,
    member.height_inches ? `${member.height_inches}"` : null,
    member.weight_lbs ? `${member.weight_lbs} lb` : null,
  ].filter(Boolean).join(' • ')

  return (
    <div className="overflow-hidden rounded-2xl border border-divider bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium text-text-primary">{member.name || member.label || `Member ${index + 1}`}</div>
          <div className="mt-1 text-sm text-text-secondary">{intakeSummary || 'Demographic details not provided yet'}</div>
          <div className="mt-1 text-sm text-text-muted">
            {[member.activity_level, member.goal, ...(member.dietary_restrictions || [])].filter(Boolean).slice(0, 3).join(' • ') || 'No planning modifiers yet'}
          </div>
        </div>
        <div className="shrink-0 text-text-muted">
          <ChevronIcon open={open} />
        </div>
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="border-t border-divider px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
              <input className="input w-full" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Age</label>
              <input type="number" min="0" max="120" className="input w-full" value={form.age} onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} placeholder="Age" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Sex</label>
              <select className="input w-full" value={form.sex} onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value }))}>
                <option value="">Select</option>
                {SEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Height (inches)</label>
              <input type="number" min="20" max="96" className="input w-full" value={form.height_inches} onChange={(event) => setForm((current) => ({ ...current, height_inches: event.target.value }))} placeholder="e.g. 68" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Weight (lb)</label>
              <input type="number" min="10" max="700" className="input w-full" value={form.weight_lbs} onChange={(event) => setForm((current) => ({ ...current, weight_lbs: event.target.value }))} placeholder="e.g. 165" />
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

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-text-primary">Dietary restrictions</label>
            <ChipGroup options={DIETARY_OPTIONS} values={form.dietary_restrictions} onToggle={(value) => toggleArrayValue('dietary_restrictions', value)} />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-text-primary">Allergies</label>
            <ChipGroup options={ALLERGY_OPTIONS} values={form.allergies} onToggle={(value) => toggleArrayValue('allergies', value)} />
          </div>

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

  const { household, members, loading, saveMembers, repairMembers } = useHousehold()
  const { profile: nutritionProfile, loading: loadingNutrition, saving: savingNutrition, save: saveNutritionProfile } = useNutritionProfile()
  const [savingMembers, setSavingMembers] = useState(false)
  const [openMemberId, setOpenMemberId] = useState(null)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)

  useEffect(() => {
    if (!members.length) {
      setOpenMemberId(null)
    }
  }, [members.length])

  const handleSaveMember = async (memberId, nextMember) => {
    setSavingMembers(true)
    try {
      const nextMembers = members.map((member, index) => {
        const currentKey = member.id || `member-${index}`
        return currentKey === memberId || member.id === memberId ? { ...member, ...nextMember } : member
      })
      await saveMembers(nextMembers)
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
      await saveMembers([nextMember])
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

        {!loadingNutrition && (
          <NutritionProfileSection
            profile={nutritionProfile}
            saving={savingNutrition}
            onSave={saveNutritionProfile}
          />
        )}
      </div>
    </div>
  )
}
