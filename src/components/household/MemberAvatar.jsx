const INITIALS_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
]

function getInitials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorForName(name) {
  if (!name) return INITIALS_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return INITIALS_COLORS[hash % INITIALS_COLORS.length]
}

export function MemberAvatar({ name, avatarUrl, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  }
  const sizeClass = sizeClasses[size] || sizeClasses.md
  const colorClass = colorForName(name)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Member'}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextSibling?.style && (e.currentTarget.nextSibling.style.display = 'flex')
        }}
      />
    )
  }

  return (
    <div className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${sizeClass} ${colorClass} ${className}`}>
      {getInitials(name)}
    </div>
  )
}
