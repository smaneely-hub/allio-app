// Ad slot placeholder component
// Returns null for premium users, placeholder for free users
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const sizeDimensions = {
  banner: { width: 320, height: 50 },
  medium: { width: 300, height: 250 },
}

export function AdSlot({ size = 'banner', position = 'default' }) {
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function checkTier() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      
      const { data: household } = await supabase
        .from('households')
        .select('tier')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      
      setIsPremium(household?.tier === 'premium')
      setLoading(false)
    }
    
    checkTier()
  }, [])
  
  if (loading || isPremium) {
    return null
  }
  
  const dimensions = sizeDimensions[size] || sizeDimensions.banner
  
  return (
    <div 
      className="flex items-center justify-center bg-warm-100 border-2 border-dashed border-warm-300 rounded-lg mx-auto"
      style={{ 
        width: dimensions.width, 
        height: dimensions.height,
        maxWidth: '100%'
      }}
      data-ad-slot={position}
    >
      <span className="text-xs text-text-muted font-medium">Advertisement</span>
    </div>
  )
}