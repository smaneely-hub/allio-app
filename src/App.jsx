import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
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
import { PlannerPage } from './pages/PlannerPage'
import { TonightPage } from './pages/TonightPage'
import { RecipesPage } from './pages/RecipesPage'
import { HouseholdPage } from './pages/HouseholdPage'
import { ShopPage } from './pages/ShopPage'
import { SettingsPage } from './pages/SettingsPage'
import { PricingPage } from './pages/PricingPage'
import { PublicMealGeneratorPage } from './pages/PublicMealGeneratorPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function ConnectionCheck({ children }) {
  return children
}

function HomePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
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
                <Route path="/try" element={<PublicMealGeneratorPage />} />
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
                  path="/planner"
                  element={
                    <ProtectedRoute>
                      <PlannerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tonight"
                  element={
                    <ProtectedRoute>
                      <TonightPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groceries"
                  element={
                    <ProtectedRoute>
                      <ShopPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recipes"
                  element={
                    <ProtectedRoute>
                      <RecipesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <RecipesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recipes/:recipeId"
                  element={
                    <ProtectedRoute>
                      <RecipesPage />
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
                <Route
                  path="/household"
                  element={
                    <ProtectedRoute>
                      <HouseholdPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/family" element={<Navigate to="/household" replace />} />
                <Route path="/profile" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/profile" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/account" element={<Navigate to="/settings" replace />} />
                <Route path="/planner" element={<Navigate to="/planner" replace />} />
                <Route path="/plans" element={<Navigate to="/planner" replace />} />
                <Route path="/search" element={<Navigate to="/search" replace />} />
                <Route path="/find" element={<Navigate to="/search" replace />} />
                <Route path="/groceries" element={<Navigate to="/groceries" replace />} />
                <Route path="/shopping-list" element={<Navigate to="/groceries" replace />} />
                <Route path="/cook" element={<Navigate to="/tonight" replace />} />
                <Route path="/cooking" element={<Navigate to="/tonight" replace />} />
                <Route path="/meals" element={<Navigate to="/recipes" replace />} />
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
