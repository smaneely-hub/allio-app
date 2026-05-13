import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getDailyTargets } from '../lib/nutritionTargets'
import { addManualMealLog, deleteMealLog, updateMealLog } from '../lib/nutritionLogging'
import { TodayProgressCard } from '../components/nutrition/TodayProgressCard'
import { MacroBars } from '../components/nutrition/MacroBars'
import { MealSlotGroup } from '../components/nutrition/MealSlotGroup'
import { EmptyState } from '../components/nutrition/EmptyState'
import { ManualLogModal } from '../components/nutrition/ManualLogModal'

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const SLOT_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export function NutritionPage() {
  useDocumentTitle('Nutrition | Allio')
  const { user } = useAuth()
  const [targets, setTargets] = useState(null)
  const [dailyLog, setDailyLog] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('breakfast')
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [targetData, dailyResult, entriesResult] = await Promise.all([
        getDailyTargets(user.id),
        supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle(),
        supabase.from('meal_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('logged_at', { ascending: true }),
      ])

      setTargets(targetData)
      setDailyLog(dailyResult.data || null)
      setEntries(entriesResult.data || [])
    } catch (error) {
      console.error('[NutritionPage] load error', error)
      toast.error('Could not load nutrition logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const totals = {
    calories: Number(dailyLog?.total_calories || 0),
    protein_g: Number(dailyLog?.total_protein_g || 0),
    carbs_g: Number(dailyLog?.total_carbs_g || 0),
    fat_g: Number(dailyLog?.total_fat_g || 0),
  }

  const grouped = useMemo(() => SLOT_ORDER.reduce((acc, slot) => ({ ...acc, [slot]: entries.filter((entry) => entry.meal_slot === slot) }), {}), [entries])

  const openAdd = (slot) => {
    setSelectedSlot(slot)
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setSelectedSlot(item.meal_slot)
    setModalOpen(true)
  }

  const handleSave = async (form) => {
    if (!user?.id) return
    setSaving(true)
    try {
      if (editingItem) {
        await updateMealLog(editingItem.id, {
          meal_slot: form.meal_slot,
          log_date: form.log_date,
          entry_name: form.name,
          calories: form.calories,
          protein_g: form.protein_g,
          carbs_g: form.carbs_g,
          fat_g: form.fat_g,
          notes: form.notes,
        })
        toast.success('Meal log updated')
      } else {
        await addManualMealLog({
          user_id: user.id,
          meal_slot: form.meal_slot,
          log_date: form.log_date,
          name: form.name,
          calories: form.calories,
          protein_g: form.protein_g,
          carbs_g: form.carbs_g,
          fat_g: form.fat_g,
          notes: form.notes,
        })
        toast.success('Meal logged')
      }
      setModalOpen(false)
      setEditingItem(null)
      await load()
    } catch (error) {
      console.error('[NutritionPage] save error', error)
      toast.error('Could not save meal log')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    setSaving(true)
    try {
      await deleteMealLog(item.id)
      toast.success('Meal log deleted')
      setModalOpen(false)
      setEditingItem(null)
      await load()
    } catch (error) {
      console.error('[NutritionPage] delete error', error)
      toast.error('Could not delete meal log')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 text-text-secondary">Loading nutrition…</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Nutrition</h1>
          <p className="mt-2 text-sm text-text-secondary">Track what you cooked, what you logged, and where today stands.</p>
        </div>

        <TodayProgressCard totalCalories={totals.calories} targets={targets} />
        <MacroBars totals={totals} targets={targets || {}} />

        {entries.length === 0 ? <EmptyState onAdd={() => openAdd('breakfast')} /> : null}

        <div className="grid gap-4">
          {SLOT_ORDER.map((slot) => (
            <MealSlotGroup key={slot} title={SLOT_LABELS[slot]} items={grouped[slot] || []} onAdd={() => openAdd(slot)} onEdit={openEdit} />
          ))}
        </div>
      </div>

      <ManualLogModal
        open={modalOpen}
        initialSlot={selectedSlot}
        item={editingItem}
        onClose={() => { setModalOpen(false); setEditingItem(null) }}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
      />
    </div>
  )
}
