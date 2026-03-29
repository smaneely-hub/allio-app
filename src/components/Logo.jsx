// Reusable Logo component - uses official Allio logo
// Place allio-logo-recreated-transparent.png in public/ folder
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function Logo({ className = '', size = 'md' }) {
  const [imageError, setImageError] = useState(false)
  
  const sizeClasses = {
    sm: 'h-7',
    md: 'h-9', 
    lg: 'h-14',
  }
  
  // If image fails to load or hasn't been uploaded yet, use text fallback
  if (imageError) {
    return (
      <Link to="/" className={`inline-flex items-center gap-1 font-display text-2xl text-text-primary ${className}`}>
        <span className="text-green-500 font-bold">A</span>
        <span>llio</span>
      </Link>
    )
  }
  
  return (
    <Link to="/" className={`inline-block ${className}`}>
      <img 
        src="/allio-logo-recreated-transparent.png" 
        alt="Allio" 
        className={`${sizeClasses[size]} w-auto`}
        onError={() => setImageError(true)}
      />
    </Link>
  )
}

// Text-only version for explicit use
export function LogoText({ className = '', size = 'md' }) {
  const sizeMap = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }
  
  return (
    <Link to="/" className={`inline-flex items-center gap-1 font-display ${sizeMap[size]} text-text-primary ${className}`}>
      <span className="text-green-500 font-bold">A</span>
      <span>llio</span>
    </Link>
  )
}