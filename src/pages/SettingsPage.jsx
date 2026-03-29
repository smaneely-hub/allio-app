import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export function SettingsPage() {
  const { household, members, loading } = useHousehold()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // Get user initial for avatar
  const userInitial = user?.email?.charAt(0).toUpperCase() || '?'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="px-3 pb-24 md:px-0 pt-2">
        <div className="card p-6 animate-pulse">
          <div className="h-8 w-48 bg-primary-100 rounded mb-4"></div>
          <div className="h-4 w-32 bg-primary-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 md:px-0 pt-2 space-y-4">
      {/* Header with gradient accent */}
      <div className="mb-3">
        <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
        <h1 className="font-display text-2xl md:text-3xl text-text-primary">Profile</h1>
      </div>

      {/* User Info Card */}
      <div className="card p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4">
          {/* Large avatar with gradient */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-teal-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {userInitial}
          </div>
          <div>
            <div className="font-display text-xl text-text-primary">
              {household?.household_name || household?.name || 'My Household'}
            </div>
            <div className="text-sm text-text-secondary">{user?.email}</div>
            <div className="text-sm text-text-muted mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex gap-3">
          <Link to="/onboarding?edit=true" className="btn-secondary text-sm flex-1 text-center">
            Edit Household
          </Link>
        </div>
      </div>

      {/* Members List */}
      <div className="card p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        <h2 className="font-display text-lg text-text-primary mb-4">Household Members</h2>
        
        {members.length === 0 ? (
          <p className="text-text-secondary text-sm">No members added yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center text-lg">
                    {member.role === 'child' ? '🧒' : member.role === 'teen' ? '👦' : '👨'}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{member.name || member.label}</div>
                    <div className="text-xs text-text-secondary capitalize">{member.role} · {member.age} years old</div>
                  </div>
                </div>
                
                {/* Dietary restriction badges */}
                {(member.dietary_restrictions?.length > 0) && (
                  <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                    {member.dietary_restrictions.slice(0, 3).map((r) => (
                      <span key={r} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        {r}
                      </span>
                    ))}
                    {member.dietary_restrictions.length > 3 && (
                      <span className="text-xs text-text-muted">+{member.dietary_restrictions.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out Button - red ghost style */}
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-150 active:scale-[0.97] font-medium"
      >
        Sign Out
      </button>

      {/* App Info */}
      <div className="text-center py-6 text-xs text-text-muted">
        <p>Allio v1.0</p>
      </div>
    </div>
  )
}