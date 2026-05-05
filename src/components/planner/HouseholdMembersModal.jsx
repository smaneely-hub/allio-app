import { useEffect, useMemo, useState } from 'react'

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m6 6 12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmptyForm() {
  return {
    id: null,
    name: '',
    age: '',
    dietary_restrictions: '',
    food_preferences: '',
  }
}

function asTextList(value) {
  if (Array.isArray(value)) return value.join(', ')
  return value || ''
}

function normalizeMemberInput(form, fallbackLabel) {
  return {
    id: form.id || undefined,
    name: form.name.trim(),
    label: form.name.trim() || fallbackLabel,
    age: form.age === '' ? '' : Number(form.age),
    dietary_restrictions: form.dietary_restrictions
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    food_preferences: form.food_preferences
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    restrictions: '',
    preferences: '',
    health_considerations: [],
  }
}

export function HouseholdMembersModal({ open, members = [], saving = false, onClose, onSave }) {
  const [form, setForm] = useState(EmptyForm)
  const [editingId, setEditingId] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)

  useEffect(() => {
    if (!open) {
      setForm(EmptyForm())
      setEditingId(null)
      setConfirmRemoveId(null)
    }
  }, [open])

  const sortedMembers = useMemo(() => members.map((member, index) => ({
    ...member,
    displayName: member.name || member.label || `Member ${index + 1}`,
  })), [members])

  if (!open) return null

  const startAdd = () => {
    setEditingId(null)
    setConfirmRemoveId(null)
    setForm(EmptyForm())
  }

  const startEdit = (member) => {
    setEditingId(member.id)
    setConfirmRemoveId(null)
    setForm({
      id: member.id,
      name: member.name || member.label || '',
      age: member.age ?? '',
      dietary_restrictions: asTextList(member.dietary_restrictions),
      food_preferences: asTextList(member.food_preferences),
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = form.name.trim()
    if (!trimmedName) return
    const nextMember = normalizeMemberInput(form, `Member ${members.length + 1}`)
    let nextMembers
    if (editingId) {
      nextMembers = members.map((member) => (member.id === editingId ? { ...member, ...nextMember } : member))
    } else {
      nextMembers = [...members, nextMember]
    }
    // NOTE: saveMembers currently deletes all rows for the household and re-inserts them. Consider a per-row helper later.
    await onSave(nextMembers)
    setEditingId(null)
    setConfirmRemoveId(null)
    setForm(EmptyForm())
  }

  const handleRemove = async (memberId) => {
    // NOTE: saveMembers currently deletes all rows for the household and re-inserts them. Consider a per-row helper later.
    await onSave(members.filter((member) => member.id !== memberId))
    setConfirmRemoveId(null)
    if (editingId === memberId) {
      setEditingId(null)
      setForm(EmptyForm())
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/45" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 top-0 overflow-y-auto bg-surface-card sm:inset-8 sm:mx-auto sm:max-w-3xl sm:rounded-[32px]" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-muted bg-surface-card px-4 py-4 sm:px-6">
          <div>
            <div className="text-lg font-semibold text-ink-primary">Household members</div>
            <div className="mt-1 text-sm text-ink-secondary">Add at least one member so Allio can plan for the right people.</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Close members modal">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] sm:px-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink-primary">Current members</h2>
              <button type="button" onClick={startAdd} className="rounded-full border border-surface-muted bg-white px-4 py-2 text-sm font-medium text-ink-primary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer">
                + Add member
              </button>
            </div>

            {sortedMembers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-surface-muted bg-white px-5 py-6 text-sm text-ink-secondary">
                No household members yet. Add your first person to unblock meal generation.
              </div>
            ) : (
              sortedMembers.map((member, index) => (
                <div key={member.id || `${member.displayName}-${index}`} className="rounded-3xl border border-surface-muted bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-ink-primary">{member.displayName}</div>
                      <div className="mt-1 text-sm text-ink-secondary">{member.age != null && member.age !== '' ? `${member.age} years old` : 'Age not provided'}</div>
                      {Array.isArray(member.dietary_restrictions) && member.dietary_restrictions.length > 0 ? <div className="mt-3 text-xs text-ink-secondary">Dietary: {member.dietary_restrictions.join(', ')}</div> : null}
                      {Array.isArray(member.food_preferences) && member.food_preferences.length > 0 ? <div className="mt-1 text-xs text-ink-secondary">Preferences: {member.food_preferences.join(', ')}</div> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => startEdit(member)} className="rounded-full border border-surface-muted px-3 py-1.5 text-sm font-medium text-ink-primary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer">
                        Edit
                      </button>
                      {confirmRemoveId === member.id ? (
                        <div className="flex items-center gap-2 rounded-full bg-red-50 px-2 py-1">
                          <button type="button" onClick={() => handleRemove(member.id)} disabled={saving} className="text-sm font-medium text-red-700 transition-colors duration-150 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                            Confirm
                          </button>
                          <button type="button" onClick={() => setConfirmRemoveId(null)} className="text-sm text-ink-secondary transition-colors duration-150 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmRemoveId(member.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 cursor-pointer">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="rounded-[28px] border border-surface-muted bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div className="font-display text-xl text-ink-primary">{editingId ? 'Edit member' : 'Add member'}</div>
              <div className="mt-1 text-sm text-ink-secondary">Keep it short for now. You can always add more detail later.</div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-primary">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Test Parent"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-primary">Age (optional)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                  placeholder="e.g. 35"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-primary">Dietary restrictions (optional)</label>
                <textarea
                  rows={3}
                  value={form.dietary_restrictions}
                  onChange={(event) => setForm((current) => ({ ...current, dietary_restrictions: event.target.value }))}
                  placeholder="Comma-separated, like dairy-free, nut allergy"
                  className="input min-h-[88px] w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-primary">Food preferences (optional)</label>
                <textarea
                  rows={3}
                  value={form.food_preferences}
                  onChange={(event) => setForm((current) => ({ ...current, food_preferences: event.target.value }))}
                  placeholder="Comma-separated, like loves pasta, prefers mild food"
                  className="input min-h-[88px] w-full"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add member'}
                </button>
                <button type="button" onClick={startAdd} disabled={saving} className="rounded-full border border-surface-muted px-4 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-stone-50 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                  Clear
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
