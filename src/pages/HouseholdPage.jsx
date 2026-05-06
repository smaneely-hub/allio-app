import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'

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
    food_preferences: allergies,
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
  const [savingMembers, setSavingMembers] = useState(false)
  const [openMemberId, setOpenMemberId] = useState(null)

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
            {!members.length && household?.id ? (
              <button type="button" onClick={handleRepair} disabled={savingMembers} className="btn-secondary text-sm disabled:opacity-50">
                {savingMembers ? 'Restoring…' : 'Restore default members'}
              </button>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-divider bg-surface px-4 py-3 text-sm text-text-secondary">
            Household size: <span className="font-medium text-text-primary">{members.length || household?.total_people || 0}</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-divider bg-surface px-4 py-4 text-sm text-text-muted">Loading family demographics…</div>
            ) : members.length > 0 ? (
              members.map((member, index) => {
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
              })
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
      </div>
    </div>
  )
}
