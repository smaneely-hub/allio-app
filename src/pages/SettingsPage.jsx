import { useState } from 'react'
import toast from 'react-hot-toast'
import { useHousehold } from '../hooks/useHousehold'

export function SettingsPage() {
  const { household, members, saveMembers, loading } = useHousehold()
  const [editingMembers, setEditingMembers] = useState([])
  const [saving, setSaving] = useState(false)

  // Sync local state when members load
  if (editingMembers.length === 0 && members.length > 0) {
    setEditingMembers([...members])
  }

  const handleAddMember = () => {
    setEditingMembers([...editingMembers, { 
      name: '', 
      age: '', 
      role: 'adult',
      label: `Member ${editingMembers.length + 1}`
    }])
  }

  const handleUpdateMember = (index, field, value) => {
    const updated = [...editingMembers]
    updated[index] = { ...updated[index], [field]: value }
    setEditingMembers(updated)
  }

  const handleRemoveMember = (index) => {
    const updated = editingMembers.filter((_, i) => i !== index)
    setEditingMembers(updated)
  }

  const handleSaveMembers = async () => {
    if (!household?.id) {
      toast.error('No household found. Complete onboarding first.')
      return
    }

    setSaving(true)
    try {
      await saveMembers(editingMembers, household.id)
      toast.success('Members saved!')
    } catch (err) {
      toast.error('Failed to save members')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24">
      <div className="card">
        <h1 className="font-display text-3xl text-warm-900">Settings</h1>
        <p className="mt-2 text-warm-700">Manage your account and preferences.</p>
      </div>

      {/* Household Members Section */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-warm-900">Household Members</h2>
          <button onClick={handleAddMember} className="btn-secondary text-sm">
            + Add Member
          </button>
        </div>

        {loading ? (
          <p className="text-warm-400">Loading...</p>
        ) : editingMembers.length === 0 ? (
          <p className="text-warm-400">No members yet. Click "Add Member" to get started.</p>
        ) : (
          <div className="space-y-4">
            {editingMembers.map((member, index) => (
              <div key={index} className="flex gap-3 items-start p-4 border border-warm-200 rounded-xl">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-warm-500">Name</label>
                    <input
                      className="input"
                      value={member.name || ''}
                      onChange={(e) => handleUpdateMember(index, 'name', e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-warm-500">Age</label>
                    <input
                      className="input"
                      value={member.age || ''}
                      onChange={(e) => handleUpdateMember(index, 'age', e.target.value)}
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-warm-500">Role</label>
                    <select
                      className="input"
                      value={member.role || 'adult'}
                      onChange={(e) => handleUpdateMember(index, 'role', e.target.value)}
                    >
                      <option value="adult">Adult</option>
                      <option value="child">Child</option>
                      <option value="teen">Teen</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(index)}
                  className="text-red-500 text-sm mt-4"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {editingMembers.length > 0 && (
          <button
            onClick={handleSaveMembers}
            disabled={saving}
            className="btn-primary mt-4"
          >
            {saving ? 'Saving...' : 'Save Members'}
          </button>
        )}
      </div>

      {/* Household Info Section */}
      {household && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold text-warm-900 mb-4">Household Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-warm-500">Name:</span>
              <span className="ml-2 text-warm-900">{household.name}</span>
            </div>
            <div>
              <span className="text-warm-500">People:</span>
              <span className="ml-2 text-warm-900">{household.total_people}</span>
            </div>
            <div>
              <span className="text-warm-500">Diet Focus:</span>
              <span className="ml-2 text-warm-900">{household.diet_focus}</span>
            </div>
            <div>
              <span className="text-warm-500">Budget:</span>
              <span className="ml-2 text-warm-900">{household.budget_sensitivity}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
