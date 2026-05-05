import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'
import { HouseholdMembersModal } from '../components/planner/HouseholdMembersModal'

export function HouseholdPage() {
  useDocumentTitle('Family Demographics | Allio')

  const { household, members, loading, saveMembers, repairMembers } = useHousehold()
  const [modalOpen, setModalOpen] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)

  const handleSaveMembers = async (nextMembers) => {
    setSavingMembers(true)
    try {
      await saveMembers(nextMembers)
      toast.success('Family demographics saved')
      setModalOpen(false)
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
      setModalOpen(true)
    } catch (error) {
      toast.error(error?.message || 'Could not restore family members')
    } finally {
      setSavingMembers(false)
    }
  }

  return (
    <div className="px-3 pb-24 pt-2 md:px-0">
      <div className="mx-auto max-w-4xl space-y-4">
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
              <p className="mt-1 text-sm text-text-secondary">
                {members.length > 0
                  ? `${members.length} member${members.length === 1 ? '' : 's'} currently configured`
                  : 'No members configured yet'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-sm">
                Edit family demographics
              </button>
              {!members.length && household?.id ? (
                <button type="button" onClick={handleRepair} disabled={savingMembers} className="btn-secondary text-sm disabled:opacity-50">
                  {savingMembers ? 'Restoring…' : 'Restore default members'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-divider bg-surface px-4 py-4 text-sm text-text-muted">Loading family demographics…</div>
            ) : members.length > 0 ? (
              members.map((member, index) => (
                <div key={member.id || `${member.name || member.label}-${index}`} className="rounded-2xl border border-divider bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-primary">{member.name || member.label || `Member ${index + 1}`}</div>
                      <div className="mt-1 text-xs text-text-muted">
                        {member.age != null && member.age !== '' ? `Age ${member.age}` : 'Age not provided'}
                      </div>
                      {Array.isArray(member.dietary_restrictions) && member.dietary_restrictions.length > 0 ? (
                        <div className="mt-2 text-xs text-text-secondary">Dietary: {member.dietary_restrictions.join(', ')}</div>
                      ) : null}
                      {Array.isArray(member.food_preferences) && member.food_preferences.length > 0 ? (
                        <div className="mt-1 text-xs text-text-secondary">Preferences: {member.food_preferences.join(', ')}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-divider p-4 text-sm text-text-muted">
                No family demographics are set up yet. Add your household members to improve meal sizing and planning.
              </div>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl text-text-primary">Also available in Settings</h2>
          <p className="mt-1 text-sm text-text-secondary">
            You asked for this to exist as a submenu too, so there’s now a dedicated family demographics entry from Settings.
          </p>
          <Link to="/settings" className="mt-4 inline-flex text-sm font-medium text-primary-600">
            Open settings →
          </Link>
        </section>
      </div>

      <HouseholdMembersModal
        open={modalOpen}
        members={members}
        saving={savingMembers}
        onClose={() => !savingMembers && setModalOpen(false)}
        onSave={handleSaveMembers}
      />
    </div>
  )
}
