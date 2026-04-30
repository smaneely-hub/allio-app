import { useState } from 'react'
import { Link } from 'react-router-dom'

export function Logo({ className = '', size = 'md' }) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
  }

  if (imageError) {
    return (
      <Link to="/" className={`inline-flex items-center gap-2 font-display text-2xl text-text-primary ${className}`}>
        <span className="font-bold text-primary-400">A</span>
        <span>llio.life</span>
      </Link>
    )
  }

  return (
    <Link to="/" className={`inline-flex items-center ${className}`}>
      <img
        src="/allio-logo-full.jpg"
        alt="Allio.life"
        className={`${sizeClasses[size]} w-auto rounded-2xl`}
        onError={() => setImageError(true)}
      />
    </Link>
  )
}

export function LogoText({ className = '', size = 'md' }) {
  const sizeMap = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-display ${sizeMap[size]} text-text-primary ${className}`}>
      <span className="font-bold text-primary-400">A</span>
      <span>llio.life</span>
    </Link>
  )
}
