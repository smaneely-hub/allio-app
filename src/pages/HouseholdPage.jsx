import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function toText(value) {
  if (Array.isArray(value)) return value.join(', ')
  return value || ''
}

function normalizeMember(member, fallbackLabel) {
  return {
    ...member,
    name: String(member.name || '').trim(),
    label: String(member.name || member.label || fallbackLabel).trim(),
    age: member.age === '' ? '' : (member.age == null ? '' : Number(member.age)),
    dietary_restrictions: String(member.dietary_restrictions || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    food_preferences: String(member.food_preferences || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    restrictions: '',
    preferences: '',
    health_considerations: [],
  }
}

function MemberCard({ member, index, open, onToggle, onSave, saving }) {
  const [form, setForm] = useState({
    name: member.name || member.label || '',
    age: member.age ?? '',
    dietary_restrictions: toText(member.dietary_restrictions),
    food_preferences: toText(member.food_preferences),
  })

  useEffect(() => {
    setForm({
      name: member.name || member.label || '',
      age: member.age ?? '',
      dietary_restrictions: toText(member.dietary_restrictions),
      food_preferences: toText(member.food_preferences),
    })
  }, [member])

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onSave(member.id, normalizeMember(form, `Member ${index + 1}`))
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-divider bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium text-text-primary">{member.name || member.label || `Member ${index + 1}`}</div>
          <div className="mt-1 text-sm text-text-secondary">
            {member.age != null && member.age !== '' ? `Age ${member.age}` : 'Age not provided'}
          </div>
          {Array.isArray(member.food_preferences) && member.food_preferences.length > 0 ? (
            <div className="mt-1 text-sm text-text-muted">Preferences: {member.food_preferences.join(', ')}</div>
          ) : null}
        </div>
        <div className="shrink-0 text-text-muted">
          <ChevronIcon open={open} />
        </div>
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="border-t border-divider px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
              <input
                className="input w-full"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Age</label>
              <input
                type="number"
                min="0"
                max="120"
                className="input w-full"
                value={form.age}
                onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                placeholder="Age"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-text-primary">Dietary restrictions</label>
            <textarea
              rows={3}
              className="input min-h-[88px] w-full"
              value={form.dietary_restrictions}
              onChange={(event) => setForm((current) => ({ ...current, dietary_restrictions: event.target.value }))}
              placeholder="Comma-separated, like dairy-free, nut allergy"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-text-primary">Food preferences</label>
            <textarea
              rows={3}
              className="input min-h-[88px] w-full"
              value={form.food_preferences}
              onChange={(event) => setForm((current) => ({ ...current, food_preferences: event.target.value }))}
              placeholder="Comma-separated, like adventurous, loves spicy food"
            />
          </div>

          <div className="mt-4 flex justify-end">
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
      return
    }
    if (!openMemberId) {
      setOpenMemberId(members[0].id || `member-0`)
    }
  }, [members, openMemberId])

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

  const memberCountLabel = useMemo(() => {
    if (members.length > 0) return `${members.length} member${members.length === 1 ? '' : 's'} currently configured`
    return 'No members configured yet'
  }, [members.length])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="space-y-4">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
          <h1 className="font-display text-2xl text-text-primary md:text-3xl">Family demographics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage household members, ages, dietary restrictions, and food preferences in one place.
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
              <div className="rounded-2xl border border-dashed border-divider p-4 text-sm text-text-muted">
                No family demographics are set up yet. Add your household members to improve meal sizing and planning.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
