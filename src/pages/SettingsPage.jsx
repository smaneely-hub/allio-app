import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'

function MemberEditor({ member, index, expanded, onToggle, onChange, onToggleChip, onSave, saving }) {
  const summary = [member.age ? `${member.age} yrs` : null, member.gender || null]
    .filter(Boolean)
    .join(' • ')

  return (
    <div className="rounded-2xl border border-divider bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left hover:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center text-lg shrink-0">
            👤
          </div>
          <div className="min-w-0">
            <div className="font-medium text-text-primary truncate">{member.name || member.label || `Member ${index + 1}`}</div>
            <div className="text-xs text-text-secondary truncate">{summary || 'Tap to add details'}</div>
          </div>
        </div>
        <div className="text-text-muted text-sm">{expanded ? '▾' : '▸'}</div>
      </button>

      {expanded && (
        <div className="border-t border-divider px-4 py-4 space-y-4 bg-warm-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-text-primary mb-1">Name</div>
              <input className="input" value={member.name || ''} onChange={(e) => onChange('name', e.target.value)} placeholder="Name" />
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary mb-1">Age</div>
              <input className="input" value={member.age ?? ''} onChange={(e) => onChange('age', e.target.value)} placeholder="e.g. 8" />
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary mb-1">Gender</div>
              <select className="input" value={member.gender || ''} onChange={(e) => onChange('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Non-binary</option>
              </select>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-text-primary mb-1">Notes / preferences</div>
            <textarea
              className="input min-h-[88px]"
              value={member.preferences || ''}
              onChange={(e) => onChange('preferences', e.target.value)}
              placeholder="Examples: picky eater, loves pasta, only home weekends, sports practice Tuesdays..."
            />
          </div>

          <div>
            <div className="text-xs font-medium text-warm-600 mb-2">Dietary restrictions</div>
            <div className="flex flex-wrap gap-2">
              {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut allergy', 'shellfish allergy', 'egg allergy', 'soy allergy', 'kosher', 'halal'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggleChip('dietary_restrictions', opt)}
                  className={`rounded-full border px-3 py-1 text-xs ${(member.dietary_restrictions || []).includes(opt) ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-divider text-text-primary'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-warm-600 mb-2">Food preferences</div>
            <div className="flex flex-wrap gap-2">
              {['loves spicy', 'prefers mild', 'picky eater', 'adventurous', 'comfort food lover'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggleChip('food_preferences', opt)}
                  className={`rounded-full border px-3 py-1 text-xs ${(member.food_preferences || []).includes(opt) ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-divider text-text-primary'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-warm-600 mb-2">Health considerations</div>
            <div className="flex flex-wrap gap-2">
              {['low sodium', 'low sugar', 'heart-healthy', 'high protein', 'low carb', 'anti-inflammatory', 'pregnancy-safe'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggleChip('health_considerations', opt)}
                  className={`rounded-full border px-3 py-1 text-xs ${(member.health_considerations || []).includes(opt) ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-divider text-text-primary'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={onSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : 'Save Member'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { household, members, loading, saveMembers } = useHousehold()
  const { user, signOut } = useAuth()
  const { isPremium } = useSubscription()
  const navigate = useNavigate()
  const [expandedMember, setExpandedMember] = useState(null)
  const [draftMembers, setDraftMembers] = useState([])
  const [savingMemberId, setSavingMemberId] = useState(null)

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?'

  useEffect(() => {
    if (members.length > 0) {
      setDraftMembers(members)
    }
  }, [members])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const updateMember = (idx, key, value) => {
    setDraftMembers((cur) => cur.map((m, i) => i === idx ? { ...m, [key]: value } : m))
  }

  const toggleChip = (idx, field, value) => {
    setDraftMembers((cur) => cur.map((m, i) => {
      if (i !== idx) return m
      const arr = m[field] || []
      return {
        ...m,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    }))
  }

  const saveSingleMember = async (idx) => {
    try {
      const member = draftMembers[idx]
      if (!member?.name || member.age === '' || member.age == null) {
        toast.error('Name and age are required.')
        return
      }
      setSavingMemberId(member.id || idx)
      await saveMembers(draftMembers)
      toast.success('Member updated.')
      setExpandedMember(null)
    } catch (err) {
      toast.error(err?.message || 'Could not save member.')
    } finally {
      setSavingMemberId(null)
    }
  }

  if (loading) {
    return (
      <div className="px-3 pb-24 md:px-0 pt-2">
        <div className="card p-6 animate-pulse">
          <div className="h-8 w-48 bg-primary-100 rounded mb-4"></div>
          <div className="h-4 w-32 bg-primary-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 md:px-0 pt-2 space-y-4">
      <div className="mb-3">
        <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
        <h1 className="font-display text-2xl md:text-3xl text-text-primary">Household</h1>
      </div>

      <div className="card p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-teal-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {userInitial}
          </div>
          <div>
            <div className="font-display text-xl text-text-primary">
              {household?.household_name || household?.name || 'My Household'}
            </div>
            <div className="text-sm text-text-secondary">{user?.email}</div>
            <div className="text-sm text-text-muted mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        {isPremium ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-teal-500 text-white">⭐ Premium</span>
              </div>
              <div className="font-display text-lg text-text-primary">Premium Plan</div>
              <div className="text-sm text-text-secondary">$6.99/month</div>
            </div>
            <button className="btn-secondary text-sm">Manage</button>
          </div>
        ) : (
          <div>
            <div className="font-display text-lg text-text-primary mb-2">Free Plan</div>
            <div className="text-sm text-text-secondary mb-4">1 meal plan per week • Basic shopping list</div>
            <a href="/pricing" className="block w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-2.5 px-4 rounded-full text-center text-sm shadow-md hover:shadow-lg transition-all duration-200">Upgrade to Premium</a>
          </div>
        )}
      </div>

      <div className="card p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-text-primary">Family Members</h2>
          <div className="text-xs text-text-muted">Tap a member to edit</div>
        </div>

        {draftMembers.length === 0 ? (
          <p className="text-text-secondary text-sm">No members added yet.</p>
        ) : (
          <div className="space-y-3">
            {draftMembers.map((member, idx) => (
              <MemberEditor
                key={member.id || idx}
                member={member}
                index={idx}
                expanded={expandedMember === idx}
                onToggle={() => setExpandedMember(expandedMember === idx ? null : idx)}
                onChange={(key, value) => updateMember(idx, key, value)}
                onToggleChip={(field, value) => toggleChip(idx, field, value)}
                onSave={() => saveSingleMember(idx)}
                saving={savingMemberId === (member.id || idx)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-150 active:scale-[0.97] font-medium"
      >
        Sign Out
      </button>

      <div className="text-center py-6 text-xs text-text-muted">
        <p>Allio v1.0</p>
      </div>
    </div>
  )
}
