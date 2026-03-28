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

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="px-3 pb-24 md:px-0">
        <div className="card p-6 animate-pulse">
          <div className="h-8 w-48 bg-warm-200 rounded mb-4"></div>
          <div className="h-4 w-32 bg-warm-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 md:px-0 space-y-4">
      {/* Household Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-warm-900">
              {household?.household_name || household?.name || 'My Household'}
            </h1>
            <p className="text-sm text-warm-500 mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-4xl">👨‍👩‍👧‍👦</div>
        </div>
        
        <div className="mt-4 flex gap-3">
          <Link to="/onboarding" className="btn-secondary text-sm">
            Edit household
          </Link>
        </div>
      </div>

      {/* Members List */}
      <div className="card p-5">
        <h2 className="font-display text-lg text-warm-900 mb-4">Household Members</h2>
        
        {members.length === 0 ? (
          <p className="text-warm-500 text-sm">No members added yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-lg">
                    {member.role === 'child' ? '🧒' : member.role === 'teen' ? '👦' : '👨'}
                  </div>
                  <div>
                    <div className="font-medium text-warm-900">{member.name || member.label}</div>
                    <div className="text-xs text-warm-500 capitalize">{member.role} · {member.age} years old</div>
                  </div>
                </div>
                
                {/* Dietary restriction badges */}
                {(member.dietary_restrictions?.length > 0) && (
                  <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                    {member.dietary_restrictions.slice(0, 3).map((r) => (
                      <span key={r} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        {r}
                      </span>
                    ))}
                    {member.dietary_restrictions.length > 3 && (
                      <span className="text-xs text-warm-400">+{member.dietary_restrictions.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Section */}
      <div className="card p-5">
        <h2 className="font-display text-lg text-warm-900 mb-4">Account</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-warm-700">Email</div>
              <div className="text-sm text-warm-500">{user?.email}</div>
            </div>
            <span className="text-lg">📧</span>
          </div>
          
          <button
            type="button"
            onClick={handleSignOut}
            className="btn-secondary w-full mt-4"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center py-6 text-sm text-warm-400">
        <p>Allio v1.0</p>
        <p className="mt-1">Dinner, figured out.</p>
      </div>
    </div>
  )
}