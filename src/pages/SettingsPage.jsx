import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const DEFAULT_PREFERENCES = {
  weekly_meal_reminders: true,
  shopping_list_reminders: true,
  product_updates: false,
  units: 'imperial',
  default_servings: 4,
}

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

export function SettingsPage() {
  const { household, members, saveHousehold, repairMembers } = useHousehold()
  const { user, signOut } = useAuth()
  const [name, setName] = useState('')
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)

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
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...(data || {}),
        })
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
    const payload = {
      user_id: user.id,
      weekly_meal_reminders: Boolean(next.weekly_meal_reminders),
      shopping_list_reminders: Boolean(next.shopping_list_reminders),
      product_updates: Boolean(next.product_updates),
      units: next.units === 'metric' ? 'metric' : 'imperial',
      default_servings: Math.min(12, Math.max(1, Number(next.default_servings) || 4)),
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
      setFamilyModalOpen(true)
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

        <section className="card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-text-primary">Family demographics</h2>
              <p className="mt-1 text-sm text-text-secondary">Manage member details from the dedicated family demographics page.</p>
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
