import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useHousehold } from '../hooks/useHousehold'
import { supabase } from '../lib/supabase'

export function SettingsPage() {
  const { household, members, saveMembers, saveHousehold, loading } = useHousehold()
  const [editingMembers, setEditingMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [editingHousehold, setEditingHousehold] = useState(false)
  const [householdForm, setHouseholdForm] = useState({
    name: '',
    total_people: 2,
    diet_focus: '',
    budget_sensitivity: '',
  })

  // Sync local state when members change from useHousehold
  useEffect(() => {
    if (members.length > 0) {
      setEditingMembers([...members])
    }
  }, [members])

  // Sync household form when household loads
  useEffect(() => {
    if (household) {
      setHouseholdForm({
        name: household.name || '',
        total_people: household.total_people || 2,
        diet_focus: household.diet_focus || '',
        budget_sensitivity: household.budget_sensitivity || '',
      })
    }
  }, [household])

  const handleSaveHousehold = async () => {
    setSaving(true)
    try {
      await saveHousehold({
        household_name: householdForm.name,
        total_people: householdForm.total_people,
        diet_focus: householdForm.diet_focus,
        budget_sensitivity: householdForm.budget_sensitivity,
      })
      setEditingHousehold(false)
      toast.success('Household updated!')
    } catch (err) {
      toast.error('Failed to update household')
    } finally {
      setSaving(false)
    }
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-warm-900">Household Details</h2>
            <button 
              onClick={() => editingHousehold ? handleSaveHousehold() : setEditingHousehold(true)}
              disabled={saving}
              className="btn-secondary text-sm"
            >
              {editingHousehold ? 'Save' : 'Edit'}
            </button>
          </div>
          
          {editingHousehold ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-warm-500">Name</label>
                <input
                  type="text"
                  value={householdForm.name}
                  onChange={(e) => setHouseholdForm({...householdForm, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Household name"
                />
              </div>
              <div>
                <label className="text-sm text-warm-500">People</label>
                <input
                  type="number"
                  min="1"
                  value={householdForm.total_people}
                  onChange={(e) => setHouseholdForm({...householdForm, total_people: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm text-warm-500">Diet Focus</label>
                <select
                  value={householdForm.diet_focus}
                  onChange={(e) => setHouseholdForm({...householdForm, diet_focus: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select...</option>
                  <option value="balanced">Balanced</option>
                  <option value="low-carb">Low Carb</option>
                  <option value="high-protein">High Protein</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="mediterranean">Mediterranean</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-warm-500">Budget</label>
                <select
                  value={householdForm.budget_sensitivity}
                  onChange={(e) => setHouseholdForm({...householdForm, budget_sensitivity: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select...</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  )
}
