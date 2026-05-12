import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useShoppingLists } from '../hooks/useShoppingLists'
import { useNutritionProfile } from '../hooks/useNutritionProfile'
import { useTheme } from '../contexts/ThemeContext'
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
} from '../lib/nutrition'

const DEFAULT_PREFERENCES = {
  weekly_meal_reminders: true,
  shopping_list_reminders: true,
  product_updates: false,
  units: 'imperial',
  default_servings: 4,
  default_shopping_list_id: null,
  always_ask_shopping_list: false,
}

const UNIT_PREFERENCE_STORAGE_KEY = 'allio-unit-preference'

const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher', 'low-carb', 'paleo', 'keto']
const ALLERGY_OPTIONS = ['peanut', 'tree nut', 'egg', 'dairy', 'soy', 'shellfish', 'sesame', 'wheat', 'fish']
const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]
const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
]

function isMissingPreferencesTable(error) {
  const message = String(error?.message || error?.details || '')
  return message.includes("Could not find the table 'public.user_preferences'")
    || message.includes('relation "public.user_preferences" does not exist')
    || message.includes('relation "user_preferences" does not exist')
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-divider bg-white px-4 py-3">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? 'bg-primary-400' : 'bg-surface-muted'}`}
        aria-pressed={checked}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  )
}

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
    onBlur: () => handleBlurSave(),
  })

  const handleBlurSave = () => {
    onSave(form)
  }

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

  // Derived TDEE / macro preview for auto mode
  const tdee = calculateTDEE(form)
  const autoCalories = calculateTargetCalories(form)
  const autoMacros = autoCalories ? calculateMacros(autoCalories) : null
  const isAutoMode = form.nutrition_mode !== 'manual'

  const [foodsInput, setFoodsInput] = useState('')
  useEffect(() => {
    setFoodsInput((form.foods_to_avoid || []).join(', '))
  }, [profile]) // only reset from DB, not on every form change

  const commitFoodsToAvoid = () => {
    const parsed = foodsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const updated = { ...form, foods_to_avoid: parsed }
    setForm(updated)
    onSave(updated)
  }

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl text-text-primary">Your nutrition profile</h2>
        <p className="mt-1 text-sm text-text-secondary">Used to calculate calorie and macro targets for meal generation.</p>
      </div>

      {/* Body stats */}
      <SectionCard title="Body stats">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumericInput
            label="Weight"
            unit="kg"
            min={30}
            max={300}
            placeholder="70"
            {...field('weight_kg')}
          />
          <NumericInput
            label="Height"
            unit="cm"
            min={100}
            max={250}
            placeholder="170"
            {...field('height_cm')}
          />
          <NumericInput
            label="Age"
            unit="yrs"
            min={10}
            max={120}
            placeholder="35"
            {...field('age_years')}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Sex</label>
            <select
              className="input w-full"
              value={form.sex || ''}
              onChange={(e) => setAndSave({ sex: e.target.value })}
            >
              <option value="">—</option>
              {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {tdee && (
          <p className="mt-3 text-xs text-text-muted">
            Estimated TDEE: <span className="font-semibold text-text-primary">{tdee.toLocaleString()} kcal/day</span>
          </p>
        )}
      </SectionCard>

      {/* Activity & goal */}
      <SectionCard title="Activity & goal">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Activity level</label>
            <select
              className="input w-full max-w-sm"
              value={form.activity_level || ''}
              onChange={(e) => setAndSave({ activity_level: e.target.value })}
            >
              <option value="">Select activity level</option>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Goal</label>
            <SegmentControl
              options={GOAL_OPTIONS}
              value={form.goal_type || 'maintain'}
              onChange={(v) => setAndSave({ goal_type: v })}
            />
          </div>
          {form.goal_type !== 'maintain' && (
            <NumericInput
              label="Target weight"
              unit="kg"
              min={30}
              max={300}
              placeholder="65"
              {...field('target_weight_kg')}
            />
          )}
        </div>
      </SectionCard>

      {/* Nutrition targets */}
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

      {/* Dietary preferences */}
      <SectionCard title="Dietary preferences" description="Applied at the profile level in addition to household member settings.">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Dietary restrictions</label>
            <ChipGroup
              options={DIETARY_OPTIONS}
              values={form.dietary_restrictions || []}
              onToggle={(v) => toggleChip('dietary_restrictions', v)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-text-secondary">Allergies</label>
            <ChipGroup
              options={ALLERGY_OPTIONS}
              values={form.allergies || []}
              onToggle={(v) => toggleChip('allergies', v)}
            />
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

export function SettingsPage() {
  const { household, members, saveHousehold, repairMembers } = useHousehold()
  const { user, signOut } = useAuth()
  const [name, setName] = useState('')
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const { lists: shoppingLists } = useShoppingLists(user?.id)
  const [saving, setSaving] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const { profile: nutritionProfile, loading: loadingNutrition, saving: savingNutrition, save: saveNutritionProfile } = useNutritionProfile()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setName(household?.name || household?.household_name || '')
  }, [household])

  useEffect(() => {
    let mounted = true
    async function loadPreferences() {
      if (!user?.id) return
      setLoadingPrefs(true)
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!mounted) return
      if (error) {
        console.error('[SettingsPage] loadPreferences error', error)
        if (!isMissingPreferencesTable(error)) {
          toast.error('Could not load saved settings')
        }
        setPreferences(DEFAULT_PREFERENCES)
      } else {
        const nextPreferences = {
          ...DEFAULT_PREFERENCES,
          ...(data || {}),
        }
        setPreferences(nextPreferences)
        localStorage.setItem(UNIT_PREFERENCE_STORAGE_KEY, nextPreferences.units === 'metric' ? 'metric' : 'imperial')
      }
      setLoadingPrefs(false)
    }
    loadPreferences()
    return () => { mounted = false }
  }, [user?.id])

  const initials = useMemo(() => {
    const source = name || user?.email || '?'
    return source.trim().slice(0, 2).toUpperCase()
  }, [name, user?.email])

  const persistPreferences = async (next) => {
    if (!user?.id) return
    setPreferences(next)
    localStorage.setItem(UNIT_PREFERENCE_STORAGE_KEY, next.units === 'metric' ? 'metric' : 'imperial')

    const payload = {
      user_id: user.id,
      weekly_meal_reminders: Boolean(next.weekly_meal_reminders),
      shopping_list_reminders: Boolean(next.shopping_list_reminders),
      product_updates: Boolean(next.product_updates),
      units: next.units === 'metric' ? 'metric' : 'imperial',
      default_servings: Math.min(12, Math.max(1, Number(next.default_servings) || 4)),
      default_shopping_list_id: next.default_shopping_list_id || null,
      always_ask_shopping_list: Boolean(next.always_ask_shopping_list),
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      if (isMissingPreferencesTable(error)) {
        toast.error('Settings storage is not deployed yet')
      } else {
        toast.error(error.message || 'Could not save preferences')
      }
      return
    }

    toast.success('Settings saved')
  }

  const persistName = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await saveHousehold({
        household_name: name || 'My Household',
        total_people: household?.total_people,
        planning_scope: household?.planning_scope,
        meal_sharing: household?.meal_sharing,
        budget_sensitivity: household?.budget_sensitivity,
        diet_focus: household?.diet_focus,
        low_prep_nights_needed: household?.low_prep_nights,
        repeat_meal_tolerance: household?.repeat_tolerance,
        leftovers_for_lunch: household?.leftovers_for_lunch,
        adventurousness: household?.adventurousness,
        staples_on_hand: household?.staples_on_hand,
        planning_priorities: household?.planning_priorities,
        cooking_comfort: household?.cooking_comfort,
      })
      toast.success('Profile saved')
    } catch (error) {
      toast.error(error?.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleRepairMembers = async () => {
    setSavingMembers(true)
    try {
      await repairMembers()
      toast.success('Default family members restored')
    } catch (error) {
      toast.error(error?.message || 'Could not restore family members')
    } finally {
      setSavingMembers(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage your profile, reminders, household members, and app defaults.</p>
        </div>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl text-text-primary">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-teal-400 text-lg font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
                <input
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={persistName}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">Email</label>
                <div className="rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text-secondary">{user?.email || 'No email found'}</div>
                <p className="mt-1 text-xs text-text-muted">Email cannot be changed here.</p>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={persistName} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {!loadingNutrition && (
          <NutritionProfileSection
            profile={nutritionProfile}
            saving={savingNutrition}
            onSave={saveNutritionProfile}
          />
        )}

        <section className="card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-text-primary">Household summary</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {members.length > 0
                  ? `${members.length} member${members.length === 1 ? '' : 's'} — manage details on the family demographics page.`
                  : 'Manage member details from the dedicated family demographics page.'}
              </p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3">
              <span className="text-text-secondary">Members</span>
              <span className="font-medium text-text-primary">{members.length || household?.total_people || 0}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.length > 0 ? members.slice(0, 4).map((member, index) => (
                <span key={member.id || `${member.name || member.label}-${index}`} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
                  {member.name || member.label || `Member ${index + 1}`}
                </span>
              )) : (
                <span className="text-text-muted">No family members configured yet.</span>
              )}
            </div>
            {!members.length && household?.id ? (
              <button type="button" onClick={handleRepairMembers} disabled={savingMembers} className="text-sm font-medium text-primary-600 disabled:opacity-50">
                {savingMembers ? 'Restoring members…' : 'Restore default family members'}
              </button>
            ) : null}
            <Link to="/household" className="inline-block text-sm font-medium text-text-primary underline underline-offset-2">Open family demographics</Link>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl text-text-primary">Notification preferences</h2>
          <div className="space-y-3">
            <ToggleRow label="Weekly meal reminders (email)" checked={Boolean(preferences.weekly_meal_reminders)} onChange={() => persistPreferences({ ...preferences, weekly_meal_reminders: !preferences.weekly_meal_reminders })} />
            <ToggleRow label="Shopping list reminders (email)" checked={Boolean(preferences.shopping_list_reminders)} onChange={() => persistPreferences({ ...preferences, shopping_list_reminders: !preferences.shopping_list_reminders })} />
            <ToggleRow label="Product updates (email)" checked={Boolean(preferences.product_updates)} onChange={() => persistPreferences({ ...preferences, product_updates: !preferences.product_updates })} />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl text-text-primary">App settings</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Units</label>
              <div className="inline-flex rounded-full bg-surface-muted p-1">
                {['metric', 'imperial'].map((unit) => {
                  const active = preferences.units === unit
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => persistPreferences({ ...preferences, units: unit })}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-white text-text-primary shadow-card' : 'text-text-secondary'}`}
                    >
                      {unit === 'metric' ? 'Metric' : 'Imperial'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Default servings</label>
              <input
                type="number"
                min="1"
                max="12"
                value={preferences.default_servings}
                onChange={(e) => setPreferences((current) => ({ ...current, default_servings: e.target.value }))}
                onBlur={() => persistPreferences({ ...preferences, default_servings: preferences.default_servings })}
                className="input w-full max-w-[8rem]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Default shopping list</label>
              <select
                className="input w-full max-w-sm"
                value={preferences.default_shopping_list_id || ''}
                onChange={(e) => persistPreferences({ ...preferences, default_shopping_list_id: e.target.value || null })}
              >
                <option value="">Use current default list</option>
                {shoppingLists.map((list) => (
                  <option key={list.id} value={list.id}>{list.name}{list.is_default ? ' • default' : ''}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-muted">This is the list planner-generated groceries should target by default.</p>
            </div>

            <ToggleRow
              label="Always ask which list planner items should go to"
              checked={Boolean(preferences.always_ask_shopping_list)}
              onChange={() => persistPreferences({ ...preferences, always_ask_shopping_list: !preferences.always_ask_shopping_list })}
            />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl text-text-primary">Appearance</h2>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Theme</label>
            <div className="inline-flex rounded-full bg-surface-muted p-1">
              {[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ].map(({ value, label }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-white text-text-primary shadow-card' : 'text-text-secondary'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-text-muted">System follows your device's dark mode setting.</p>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-xl text-text-primary">Account</h2>
          <div className="space-y-3">
            <Link to="/household" className="block text-sm font-medium text-text-primary underline underline-offset-2">Household</Link>
            <button type="button" onClick={signOut} className="text-sm font-medium text-red-500">Sign out</button>
          </div>
        </section>

        {loadingPrefs ? <div className="text-sm text-text-muted">Loading settings…</div> : null}
      </div>
    </div>
  )
}
