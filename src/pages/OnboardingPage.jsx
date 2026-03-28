import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { OnboardingSkeleton, EmptyState } from '../components/LoadingStates'

// Design-system-aligned onboarding page (Mealime-inspired)
export function OnboardingPage() {
  const navigate = useNavigate()
  const { household, members: savedMembers, loading, saveHousehold, saveMembers, reloadHousehold } = useHousehold()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    total_people: '2',
    planning_scope: 'entire household',
    meal_sharing: 'mostly shared',
    budget_sensitivity: 'moderate',
    diet_focus: 'balanced',
    custom_diet_focus: '',
    low_prep_nights_needed: '1',
    repeat_meal_tolerance: 'moderate',
    leftovers_for_lunch: 'sometimes',
    adventurousness: 'mixed',
    staples_on_hand: 'olive oil, salt, pepper, garlic, rice, pasta',
    planning_priorities: ['healthy eating', 'reduce grocery chaos'],
  })
  const [members, setMembers] = useState([])

  // hydrate from existing household if present
  useEffect(() => {
    if (!household) return
    setForm((cur) => ({
      ...cur,
      total_people: household.total_people?.toString?.() || cur.total_people,
      planning_scope: household.planning_scope || cur.planning_scope,
      meal_sharing: household.meal_sharing || cur.meal_sharing,
      budget_sensitivity: household.budget_sensitivity || cur.budget_sensitivity,
      diet_focus: household.diet_focus || cur.diet_focus,
      low_prep_nights_needed: household.low_prep_nights_needed?.toString?.() || cur.low_prep_nights_needed,
      repeat_meal_tolerance: household.repeat_meal_tolerance || cur.repeat_meal_tolerance,
      leftovers_for_lunch: household.leftovers_for_lunch || cur.leftovers_for_lunch,
      adventurousness: household.adventurousness || cur.adventurousness,
      staples_on_hand: household.staples_on_hand || cur.staples_on_hand,
      planning_priorities: household.planning_priorities || cur.planning_priorities,
    }))
  }, [household])

  // derive member rows based on total_people
  useEffect(() => {
    const target = form.total_people === '5+' ? 5 : Number(form.total_people)
    const base = savedMembers.length > 0 ? savedMembers : members
    const list = Array.from({ length: target }, (_, i) => {
      const m = base[i] || {}
      return {
        id: m.id,
        name: m.name || '',
        age: m.age || '',
        role: m.role || (i < 2 ? 'adult' : 'child'),
        label: m.label || (i < 2 ? `A${i + 1}` : `K${i - 1}`),
        gender: m.gender || '',
        restrictions: m.restrictions || '',
        preferences: m.preferences || '',
      }
    })
    setMembers(list)
  }, [form.total_people, savedMembers])

  const stepValid = useMemo(() => {
    if (step === 1) {
      return Boolean(form.total_people && form.planning_scope && form.meal_sharing && form.budget_sensitivity && form.diet_focus)
    }
    if (step === 2) {
      return members.every((mm) => mm.name !== '' && mm.age !== '')
    }
    return Boolean(form.low_prep_nights_needed && form.repeat_meal_tolerance && form.leftovers_for_lunch && form.adventurousness)
  }, [form, members, step])

  const updateForm = (k, v) => setForm((cur) => ({ ...cur, [k]: v }))
  const updateMember = (idx, k, v) => {
    setMembers((cur) => cur.map((mm, i) => i === idx ? { ...mm, [k]: v } : mm))
  }

  const togglePriority = (p) => {
    setForm((cur) => ({
      ...cur,
      planning_priorities: cur.planning_priorities.includes(p) ? cur.planning_priorities.filter(x => x !== p) : [...cur.planning_priorities, p],
    }))
  }

  const handleSave = async () => {
    setSubmitting(true)
    let savedHousehold = null
    
    try {
      // Step 1: Save household
      console.log('[Onboarding] Saving household...')
      savedHousehold = await saveHousehold({
        ...form,
        total_people: form.total_people === '5+' ? 5 : Number(form.total_people),
        low_prep_nights_needed: Number(form.low_prep_nights_needed),
        diet_focus: form.diet_focus === 'other' ? form.custom_diet_focus : form.diet_focus,
      })
      
      console.log('[Onboarding] household saved', savedHousehold?.id)
      
      // Step 2: Save members with the returned household ID
      let persistedMembers = []
      
      if (members.length > 0) {
        console.log('[Onboarding] saving members', members.length)
        
        // Prepare members - saveMembers accepts householdIdOverride as 2nd param
        const membersToSave = members.map((m, idx) => ({ 
          ...m, 
          label: m.name || m.label || `Member ${idx + 1}` 
        }))
        
        // Pass the JUST RETURNED household ID as override
        persistedMembers = await saveMembers(membersToSave, savedHousehold.id)
        
        console.log('[Onboarding] persisted members', persistedMembers?.length)
        
        // Verify members were actually persisted
        if (!persistedMembers || persistedMembers.length === 0) {
          console.error('[Onboarding] Member save failed - no members returned')
          throw new Error('Household saved but members were not persisted')
        }
      }
      
      // Step 3: Mark onboarding complete (reload to sync state)
      console.log('[Onboarding] Marking onboarding complete')
      await reloadHousehold()
      
      // Step 4: Navigate ONLY after all validation passes
      console.log('[Onboarding] Navigation to /schedule')
      toast.success('Household saved successfully.')
      navigate('/schedule', { replace: true })
      
    } catch (err) {
      console.error('[Onboarding] ERROR during save:', err)
      toast.error(err?.message || 'Unable to save household. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-6 px-3 md:px-6 pb-24">
      <div className="card">
        <div className="mb-2 text-sm font-medium text-warm-400">Step {step} of 3</div>
        <h1 className="font-display text-3xl text-warm-900">Household onboarding</h1>
        <p className="mt-2 text-sm text-warm-700">Set up your planning profile once, then Allio can generate smarter weekly plans.</p>
      </div>

      <div className="card">
        {loading ? (
          <OnboardingSkeleton />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-warm-900">Household Basics</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-warm-700 mb-2">Total people</div>
                <div className="flex flex-wrap gap-2">
                  {(['1','2','3','4','5+']).map((o) => (
                    <button key={o} className={`rounded-full border px-4 py-2 text-sm ${form.total_people === o ? 'bg-white border-primary-400 text-primary-600' : 'border-warm-200 text-warm-700'}`} onClick={() => updateForm('total_people', o)}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-2">Planning scope</div>
                <select value={form.planning_scope} onChange={(e) => updateForm('planning_scope', e.target.value)} className="input">
                  {['entire household','adults only','mixed'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-2">Meal sharing</div>
                <select value={form.meal_sharing} onChange={(e) => updateForm('meal_sharing', e.target.value)} className="input">
                  {['mostly shared','mixed','mostly individual'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-2">Budget sensitivity</div>
                <select value={form.budget_sensitivity} onChange={(e) => updateForm('budget_sensitivity', e.target.value)} className="input">
                  {['low','moderate','high'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-2">Diet focus</div>
                <select value={form.diet_focus} onChange={(e) => updateForm('diet_focus', e.target.value)} className="input">
                  {['balanced','high protein','budget-conscious','mediterranean','other'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-warm-900">Household Members</h2>
              <button onClick={() => setMembers((c) => [...c, { id: undefined, name: '', age: '', role: 'adult', label: `A${members.length + 1}` }])} className="btn-secondary text-sm">Add member</button>
            </div>
            {members.map((m, idx) => (
              <div key={m.id ?? idx} className="card p-5">
                <div className="mb-3 text-sm font-medium text-warm-700">Member {idx + 1}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-warm-700 mb-1">Label / name</div>
                    <input className="input" value={m.name} onChange={(e) => updateMember(idx, 'name', e.target.value)} placeholder={m.label} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-warm-700 mb-1">Age</div>
                    <input className="input" value={m.age} onChange={(e) => updateMember(idx, 'age', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-xl text-warm-900">Preferences & Behavior</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-warm-700 mb-1">Low-prep nights</div>
                <select value={form.low_prep_nights_needed} onChange={(e) => updateForm('low_prep_nights_needed', e.target.value)} className="input">
                  {['0','1','2','3+'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-1">Repeat meal tolerance</div>
                <select value={form.repeat_meal_tolerance} onChange={(e) => updateForm('repeat_meal_tolerance', e.target.value)} className="input">
                  {['low','moderate','high'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-1">Leftovers for lunch</div>
                <select value={form.leftovers_for_lunch} onChange={(e) => updateForm('leftovers_for_lunch', e.target.value)} className="input">
                  {['yes','no','sometimes'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-warm-700 mb-1">Adventurousness</div>
                <select value={form.adventurousness} onChange={(e) => updateForm('adventurousness', e.target.value)} className="input">
                  {['low','mixed','high'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-warm-700 mb-3">Planning priorities</div>
              <div className="flex flex-wrap gap-2">
                {['healthy eating','reduce grocery chaos','kid-friendly dinners','lower food waste','support lunches with leftovers','stay on budget'].map((p) => (
                  <button key={p} type="button" onClick={() => togglePriority(p)} className={`rounded-full border px-3 py-1 text-sm ${form.planning_priorities.includes(p) ? 'bg-primary-50 border-primary-400 text-primary-600' : 'border-warm-200 text-warm-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-6">
        <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || submitting} className="btn-ghost">Back</button>
        {step < 3 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!stepValid || submitting} className="btn-primary">Next</button>
        ) : (
          <button type="button" onClick={handleSave} disabled={!stepValid || submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save & Continue'}</button>
        )}
      </div>
    </div>
  )
}
