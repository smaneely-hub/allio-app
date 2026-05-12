import { useState } from 'react'

export function ShoppingListPickerModal({ lists, onSelect, onCreateAndSelect, onClose }) {
  const defaultList = lists.find((l) => l.is_default) || lists[0]
  const [selectedId, setSelectedId] = useState(defaultList?.id || '')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const handleConfirm = () => {
    if (selectedId) onSelect(selectedId)
  }

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      await onCreateAndSelect(newName.trim())
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold text-text-primary">Add to which list?</p>
        <p className="mt-0.5 mb-4 text-sm text-text-secondary">
          Choose where these groceries should go.
        </p>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {lists.map((list) => (
            <label
              key={list.id}
              className="flex items-center gap-3 rounded-2xl border border-divider bg-white px-4 py-3 cursor-pointer hover:bg-warm-50"
            >
              <input
                type="radio"
                name="shoplist"
                value={list.id}
                checked={selectedId === list.id}
                onChange={() => setSelectedId(list.id)}
                className="accent-primary-500 flex-shrink-0"
              />
              <span className="text-sm font-medium text-text-primary">
                {list.name}
                {list.is_default ? <span className="ml-1 text-text-muted font-normal">• default</span> : null}
              </span>
            </label>
          ))}
        </div>

        {showCreate ? (
          <div className="mb-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="input flex-1 min-w-0"
              placeholder="New list name"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? '…' : 'Create'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mb-4 text-sm text-primary-600 hover:underline"
          >
            + New list
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-divider px-4 py-2 text-sm font-medium text-text-secondary hover:bg-warm-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedId}
            className="flex-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add to list
          </button>
        </div>
      </div>
    </div>
  )
}
