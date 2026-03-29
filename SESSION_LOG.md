# Allio Development Log

## March 28-29, 2026

### Tasks Completed

#### Design System & UI Improvements
- Created design tokens (colors, spacing, shadows, components)
- Added SwapModal to replace native prompt()
- Created Dashboard page for logged-in users
- Improved mobile touch targets
- Added Home link to navigation

#### Premium System Implementation

**DATABASE CHANGES (in supabase/migrations/2026_03_29_premium_system.sql)**
- Added `tier` column to households (free/premium)
- Created usage_tracking table
- Added partner_data JSON column to shopping_lists
- Created feature_flags table

**USAGE TRACKING (src/lib/usageTracking.js)**
- `trackUsage(userId, action)` - Insert usage row
- `getUsageCount(userId, action, sinceDaysAgo)` - Count usage in time window
- `canPerformAction(userId, action, freeLimit)` - Check if action allowed
- `getFeatureFlags()` - Get feature enablement from DB
- `isFeatureEnabled(userId, featureName)` - Check if feature enabled for user
- `upgradeToPremium(userId)` - Upgrade user to premium (beta temporary)
- `getUserTier(userId)` - Get current tier info

**COMPONENTS CREATED**
- `src/components/UpgradePrompt.jsx` - Modal for upgrading to premium
- `src/components/AdSlot.jsx` - Placeholder ad slots (hidden for premium)

**PAGES CREATED**
- `src/pages/PricingPage.jsx` - Pricing comparison page
- `src/pages/PrivacyPage.jsx` - Privacy policy
- `src/pages/TermsPage.jsx` - Terms of service

**ROUTES ADDED**
- /pricing - Pricing page
- /privacy - Privacy policy  
- /terms - Terms of service

**PWA SETUP**
- Created public/manifest.json
- Added PWA meta tags to index.html
- App is now installable ("Add to Home Screen")

### Beta Note
During beta, users can upgrade to premium for free via the UpgradePrompt. The button sets their tier to 'premium' in the database temporarily while Stripe is being set up. This is logged in the UpgradePrompt component with a toast message.

### Still Needed
1. **Apply feature gating** - The UpgradePrompt is created but not yet wired up to the actual buttons (Email, Generate, Cooking mode, etc.)
2. **Run the migration** - The SQL migration needs to be applied to Supabase: `supabase db push` or run the SQL in the Supabase SQL editor
3. **PNG icons** - The manifest references icon-192.png and icon-512.png which don't exist yet (using SVG fallback)