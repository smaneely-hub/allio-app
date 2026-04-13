import { useMemo } from 'react'
import { buildPlannerWeek, formatDayLabel, formatWeekLabel, getStartOfWeek, MEAL_SLOTS, DAY_ORDER } from '../../lib/planner'
import { MealCard } from './MealCard'

function IconButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-divider bg-white text-text-primary shadow-sm transition hover:bg-warm-50"
      {...props}
    >
      {children}
    </button>
  )
}

function TogglePill({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-green-500 text-white shadow-sm' : 'border border-divider bg-white text-text-primary hover:bg-warm-50'}`}
      {...props}
    >
      {children}
    </button>
  )
}

function UnplannedDayState({ onGenerateDay, onCopyPreviousDay, onCreateBlankDay }) {
  return (
    <div className="rounded-2xl border border-dashed border-divider bg-white p-4 text-left shadow-sm">
      <div className="text-base font-semibold text-text-primary">This day is unplanned</div>
      <div className="mt-1 text-sm text-text-secondary">Start with a generated day, reuse yesterday, or make a blank plan you can edit.</div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onGenerateDay} className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600">Generate Day</button>
        <button type="button" onClick={onCopyPreviousDay} className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-warm-50">Copy the Previous Day</button>
        <button type="button" onClick={onCreateBlankDay} className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-warm-50">Create a Blank Plan</button>
      </div>
    </div>
  )
}

function MealRow({ meal, onOpenMeal }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <MealCard
        meal={meal}
        onSwap={async () => {}}
        onSaveNote={async () => {}}
        onOpenMeal={onOpenMeal}
      />
    </div>
  )
}

function SlotEditorInline({ slotKey, slot, memberOptions, onOpenEditor, onToggleSlot }) {
  const attendeeLabels = memberOptions.filter((member) => (slot?.attendees || []).includes(member.id)).map((member) => member.label)

  return (
    <div className="rounded-2xl border border-dashed border-divider bg-bg-primary p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-text-primary">Planning setup</div>
          <div className="mt-1 text-xs text-text-secondary">
            {(slot?.attendees || []).length > 0 ? attendeeLabels.join(', ') : 'No family members selected yet'}
          </div>
        </div>
        <TogglePill active={Boolean(slot?.active)} onClick={() => onToggleSlot(slotKey)}>
          {slot?.active ? 'On' : 'Off'}
        </TogglePill>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onOpenEditor(slotKey)} className="rounded-full border border-divider bg-white px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-warm-50">
          Edit who’s eating
        </button>
        {slot?.effort_level ? <span className="rounded-full bg-white px-3 py-2 text-xs text-text-secondary">{slot.effort_level}</span> : null}
      </div>
    </div>
  )
}

function MealGroupCard({ group, slotKey, slot, memberOptions, onOpenMeal, onMealAction, onOpenEditor, onToggleSlot }) {
  const attendeeLabels = memberOptions.filter((member) => (slot?.attendees || []).includes(member.id)).map((member) => member.label)

  return (
    <section className="rounded-3xl border border-divider bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{group.label}</h3>
          <div className="mt-1 text-xs text-text-muted">
            {attendeeLabels.length > 0 ? `Eating: ${attendeeLabels.join(', ')}` : 'Choose who is eating this meal'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TogglePill active={Boolean(slot?.active)} onClick={() => onToggleSlot(slotKey)}>
            {slot?.active ? 'On' : 'Off'}
          </TogglePill>
          <button
            type="button"
            onClick={() => onMealAction(group)}
            className="rounded-full border border-divider px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-warm-50"
          >
            Actions
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onOpenEditor(slotKey)} className="rounded-full border border-divider bg-warm-50 px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-warm-100">
          Edit family members
        </button>
        {slot?.planning_notes ? <span className="rounded-full bg-warm-50 px-3 py-2 text-xs text-text-secondary">{slot.planning_notes}</span> : null}
      </div>

      {group.meals.length > 0 ? (
        <div className="space-y-3">
          {group.meals.map((meal) => <MealRow key={meal.id} meal={meal} onOpenMeal={onOpenMeal} />)}
        </div>
      ) : (
        <SlotEditorInline slotKey={slotKey} slot={slot} memberOptions={memberOptions} onOpenEditor={onOpenEditor} onToggleSlot={onToggleSlot} />
      )}
    </section>
  )
}

function WeekDayCard({ day, onSelectDay, onGenerateDay, onCopyPreviousDay, onCreateBlankDay, onDayAction, selectedDate }) {
  const isSelected = day.date.toDateString() === selectedDate.toDateString()

  return (
    <section className={`rounded-3xl border bg-white p-4 shadow-sm ${isSelected ? 'border-green-300' : 'border-divider'}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onSelectDay(day)} className="text-left">
          <div className="text-base font-semibold text-text-primary">{day.dayName}</div>
          <div className="text-sm text-text-secondary">{day.dateLabel}</div>
        </button>
        <button
          type="button"
          onClick={() => onDayAction(day)}
          className="rounded-full border border-divider px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-warm-50"
        >
          Actions
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-divider bg-warm-50 px-3 py-2 text-xs font-semibold text-text-primary">Meals: {day.plannedMealSlots}/{day.totalMealSlots}</span>
      </div>

      {day.isPlanned ? (
        <div className="mt-4 space-y-2">
          {day.mealGroups.filter((group) => group.meals.length > 0).map((group) => (
            <div key={group.slot} className="rounded-2xl bg-warm-50/60 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
              <div className="mt-1 text-sm text-text-primary line-clamp-2">
                {group.meals.map((meal) => meal.title).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <UnplannedDayState
            onGenerateDay={() => onGenerateDay(day)}
            onCopyPreviousDay={() => onCopyPreviousDay(day)}
            onCreateBlankDay={() => onCreateBlankDay(day)}
          />
        </div>
      )}
    </section>
  )
}

export function MealPlanWorkspace({
  meals = [],
  slotState = {},
  memberOptions = [],
  selectedDate,
  viewMode,
  onChangeViewMode,
  onPrev,
  onNext,
  onOpenMeal,
  onOpenDayActions,
  onOpenMealActions,
  onSelectDay,
  onGenerateDay,
  onCopyPreviousDay,
  onCreateBlankDay,
  onOpenSlotEditor,
  onToggleSlot,
  onCreateSlot,
}) {
  const weekStart = useMemo(() => getStartOfWeek(selectedDate), [selectedDate])
  const plannerWeek = useMemo(() => buildPlannerWeek({ weekStart, meals }), [meals, weekStart])
  const selectedDay = useMemo(() => {
    const iso = selectedDate.toISOString().slice(0, 10)
    return plannerWeek.find((day) => day.date.toISOString().slice(0, 10) === iso) || plannerWeek[0]
  }, [plannerWeek, selectedDate])

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-text-primary">Meal Plan</h1>
          </div>
          <button
            type="button"
            onClick={() => selectedDay && onOpenDayActions(selectedDay)}
            className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:bg-warm-50"
          >
            Actions
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-full border border-divider bg-warm-50 p-1">
          {['day', 'week'].map((mode) => {
            const active = viewMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeViewMode(mode)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'}`}
              >
                {mode === 'day' ? 'Day' : 'Week'}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <IconButton onClick={onPrev}>←</IconButton>
          <div className="text-center text-sm font-semibold text-text-primary">
            {viewMode === 'day' ? formatDayLabel(selectedDate) : formatWeekLabel(weekStart)}
          </div>
          <IconButton onClick={onNext}>→</IconButton>
        </div>
      </div>

      {viewMode === 'day' && selectedDay ? (
        <div className="space-y-4">
          <section className="rounded-3xl border border-divider bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-text-primary">Daily Summary</div>
            <div className="mt-3 text-sm text-text-secondary">Planned meals: {selectedDay.plannedMealSlots}/{MEAL_SLOTS.length}</div>
          </section>

          <div className="space-y-4">
            {selectedDay.mealGroups.map((group) => {
              const slotKey = `${selectedDay.key}-${group.slot}`
              const slot = slotState[slotKey] || {
                day_of_week: selectedDay.key,
                meal_type: group.slot,
                active: false,
                attendees: [],
                planning_notes: '',
                effort_level: 'medium',
              }

              return (
                <MealGroupCard
                  key={group.slot}
                  group={group}
                  slotKey={slotKey}
                  slot={slot}
                  memberOptions={memberOptions}
                  onOpenMeal={onOpenMeal}
                  onMealAction={onOpenMealActions}
                  onOpenEditor={onOpenSlotEditor}
                  onToggleSlot={onToggleSlot}
                />
              )
            })}
          </div>

          {!selectedDay.isPlanned ? (
            <UnplannedDayState
              onGenerateDay={() => onGenerateDay(selectedDay)}
              onCopyPreviousDay={() => onCopyPreviousDay(selectedDay)}
              onCreateBlankDay={() => onCreateBlankDay(selectedDay)}
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {plannerWeek.map((day) => (
            <WeekDayCard
              key={day.key}
              day={day}
              selectedDate={selectedDate}
              onSelectDay={onSelectDay}
              onGenerateDay={onGenerateDay}
              onCopyPreviousDay={onCopyPreviousDay}
              onCreateBlankDay={onCreateBlankDay}
              onDayAction={onOpenDayActions}
            />
          ))}
        </div>
      )}
    </div>
  )
}
