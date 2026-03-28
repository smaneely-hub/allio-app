import { useState, useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './components/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { NavBar } from './components/NavBar'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SchedulePage } from './pages/SchedulePage'
import { PlanPage } from './pages/PlanPage'
import { ShopPage } from './pages/ShopPage'
import { SettingsPage } from './pages/SettingsPage'

// Redirect logged-in users from home to schedule
function HomePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  
  // Redirect when user is loaded and present
  useEffect(() => {
    if (user && !loading) {
      // Check for last schedule in localStorage
      const lastScheduleId = localStorage.getItem('last_schedule_id')
      if (lastScheduleId) {
        navigate(`/plan?schedule_id=${lastScheduleId}`, { replace: true })
      } else {
        navigate('/schedule', { replace: true })
      }
    }
  }, [user, loading, navigate])
  
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }
  
  // Show landing page while redirecting (or if not logged in)
  return <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-warm-50">
          <div className="mx-auto flex max-w-6xl flex-col">
            <NavBar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedule"
                element={
                  <ProtectedRoute>
                    <SchedulePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan"
                element={
                  <ProtectedRoute>
                    <PlanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop"
                element={
                  <ProtectedRoute>
                    <ShopPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}
