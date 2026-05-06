import { useState } from 'react'
import { Link } from 'react-router-dom'

export function Logo({ className = '', size = 'md' }) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-18',
  }

  const textClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  if (imageError) {
    return (
      <Link to="/" className={`inline-flex items-center gap-2 font-display ${textClasses[size]} text-text-primary ${className}`}>
        <span className="font-bold text-primary-400">A</span>
        <span>llio.life</span>
      </Link>
    )
  }

  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/allio-icon-mark.jpg"
        alt="Allio"
        className={`${sizeClasses[size]} w-auto shrink-0 rounded-2xl`}
        onError={() => setImageError(true)}
      />
      <span className={`font-display leading-none text-text-primary ${textClasses[size]}`}>
        Allio<span className="text-primary-400">.</span><span className="font-body font-normal">life</span>
      </span>
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
