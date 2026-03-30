import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function PrivacyPage() {
  useDocumentTitle("Privacy Policy | Allio")
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-white border-b border-divider">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="font-display text-xl text-text-primary">
            Allio
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">
            ← Back to home
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl text-text-primary mb-8">Privacy Policy</h1>
        
        <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
          <p className="text-sm text-text-muted">Last updated: March 2026</p>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">What Data We Collect</h2>
            <p>Allio collects the following information to provide meal planning services:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Email address and account information</li>
              <li>Household information (family size, names)</li>
              <li>Dietary preferences and restrictions</li>
              <li>Meal plans and shopping lists you create</li>
              <li>Schedule information you provide</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">How We Use Your Data</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Generate personalized meal plans based on your preferences</li>
              <li>Create shopping lists from your meal plans</li>
              <li>Improve our meal recommendations</li>
              <li>Communicate with you about your account</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">What We Don't Do</h2>
            <p>We do not sell your personal data to third parties. We do not share your individual household data with advertisers or marketing companies.</p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Cookies and Analytics</h2>
            <p>We use standard web analytics to understand how people use Allio. This helps us improve the service. We don't use this data to identify individuals.</p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Data Deletion</h2>
            <p>You can delete your account and all associated data at any time. Simply go to Settings → Account → Delete Account, or contact us at privacy@allio.life.</p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Contact Us</h2>
            <p>If you have questions about this privacy policy, please contact us at:</p>
            <p className="mt-2">privacy@allio.life</p>
          </section>
        </div>
      </div>
    </div>
  )
}