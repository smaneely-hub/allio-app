import { useState, useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { EmailVerificationBanner } from './components/EmailVerificationBanner'
import { AuthProvider } from './components/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { NavBar } from './components/NavBar'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SchedulePage } from './pages/SchedulePage'
import { PlanPage } from './pages/PlanPage'
import { ShopPage } from './pages/ShopPage'
import { SettingsPage } from './pages/SettingsPage'
import { PricingPage } from './pages/PricingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Connection check component - skip since we hardcoded Supabase credentials
function ConnectionCheck({ children }) {
  return children
}

// Home page: show landing for visitors, dashboard for logged-in users
function HomePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (user && !loading) {
      // Logged in users go to dashboard
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])
  
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }
  
  return <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionCheck>
        <AuthProvider>
          <ErrorBoundary>
            <NavBar />
            <EmailVerificationBanner />
            <main className="min-h-screen bg-bg-primary animate-fadeIn">
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
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
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
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Toaster position="top-right" />
          </ErrorBoundary>
        </AuthProvider>
      </ConnectionCheck>
    </BrowserRouter>
  )
}