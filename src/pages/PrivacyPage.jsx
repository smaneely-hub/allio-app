import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function PrivacyPage() {
  useDocumentTitle('Privacy Policy | Allio')
  return (
    <div className="min-h-screen bg-bg-primary">
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
          <p className="text-sm text-text-muted">Last updated: June 2026</p>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Overview</h2>
            <p>
              Allio helps you plan meals, manage household preferences, build shopping lists, and track nutrition.
              This policy explains what information we collect, how we use it, and what choices you have.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">What data we collect</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Account information such as your email address and sign-in method</li>
              <li>Household details such as household name, member names, ages, and optional profile photos</li>
              <li>Meal-planning data such as preferences, allergies, dietary restrictions, schedules, and generated plans</li>
              <li>Shopping list and recipe data that you create, save, or edit</li>
              <li>Nutrition-related data such as calorie targets, macro targets, foods to avoid, allergies, and logged meals</li>
              <li>Support and operational data needed to secure the service, debug problems, and administer accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">How we use your data</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>To create personalized meal plans and shopping lists</li>
              <li>To tailor meal suggestions around household needs, dietary restrictions, allergies, and nutrition goals</li>
              <li>To power optional features such as nutrition logging and household member profiles</li>
              <li>To authenticate users, including email/password sign-in and Google sign-in where enabled</li>
              <li>To operate, secure, maintain, and improve Allio</li>
              <li>To provide support and respond to account, privacy, or deletion requests</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Data sharing</h2>
            <p>
              We do not sell your personal data. We do not share your household, nutrition, or account data with advertisers.
              We may use service providers that help us host the app, store data, authenticate users, process app infrastructure,
              or deliver support-related functions on our behalf.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Health and household information</h2>
            <p>
              Allio may process information about allergies, dietary restrictions, nutrition targets, and similar household or wellness-related preferences
              that you choose to enter. This information is used to tailor planning, recipes, and nutrition experiences inside the app.
              Allio is not a medical provider, and the app does not provide medical advice.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Photos and uploaded content</h2>
            <p>
              If you choose to add a profile photo for a household member, we store that image so it can be displayed in the app.
              Do not upload images you do not want associated with your household account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Analytics and diagnostics</h2>
            <p>
              We may collect limited operational and usage information needed to run, secure, and improve Allio. We do not use your personal household
              data for advertising. If we add third-party analytics tools in the future, this policy will be updated to describe them.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Account deletion and retention</h2>
            <p>
              You can delete your account and associated app data at any time from Settings → Account → Delete Account. You can also contact us at
              privacy@allio.life if you need help with a deletion request.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-text-primary mb-2">Contact us</h2>
            <p>
              If you have questions about this privacy policy or your data, contact us at <span className="font-medium text-text-primary">privacy@allio.life</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
