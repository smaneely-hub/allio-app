import { useEffect, useState } from 'react'
import { loadDailyNutritionHistory, loadWeightHistory, loadWeightPrefs } from '../../lib/nutritionHistory'
import { TrendChart } from './TrendChart'
import { WeightTrendCard } from '../health/WeightTrendCard'

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export function NutritionTrendsSection({ userId }) {
  const [range, setRange] = useState(30)
  const [nutritionHistory, setNutritionHistory] = useState([])
  const [weightHistory, setWeightHistory] = useState([])
  const [weightPrefs, setWeightPrefs] = useState({ targetWeightKg: null, isMetric: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([
      loadDailyNutritionHistory(userId, range),
      loadWeightHistory(userId, range),
      loadWeightPrefs(userId),
    ])
      .then(([nutrition, weight, prefs]) => {
        setNutritionHistory(nutrition)
        setWeightHistory(weight)
        setWeightPrefs(prefs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId, range])

  const caloriesData = nutritionHistory.map((d) => ({ date: d.log_date, value: Number(d.total_calories || 0) }))
  const proteinData = nutritionHistory.map((d) => ({ date: d.log_date, value: Number(d.total_protein_g || 0) }))
  const carbsData = nutritionHistory.map((d) => ({ date: d.log_date, value: Number(d.total_carbs_g || 0) }))
  const fatData = nutritionHistory.map((d) => ({ date: d.log_date, value: Number(d.total_fat_g || 0) }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-text-primary">Trends</h2>
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRange(r.days)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === r.days
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted">Loading trends…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TrendChart data={caloriesData} title="Calories" unit="kcal" color="#7B8CF6" />
            <TrendChart data={proteinData} title="Protein" unit="g" color="#14b8a6" />
            <TrendChart data={carbsData} title="Carbs" unit="g" color="#F59E0B" />
            <TrendChart data={fatData} title="Fat" unit="g" color="#EF4444" />
          </div>
          {weightHistory.length > 0 ? (
            <WeightTrendCard
              entries={weightHistory}
              targetWeightKg={weightPrefs.targetWeightKg}
              isMetric={weightPrefs.isMetric}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
