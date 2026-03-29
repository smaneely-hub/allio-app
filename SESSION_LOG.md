# Allio Development Log

## March 29, 2026

### Freemium Monetization - Completed

1. **DATABASE** - SQL migration ready (subscriptions, usage_tracking tables)
2. **SUBSCRIPTION HOOK** - useSubscription.js with feature access checks
3. **UPGRADE PROMPT** - Modal with premium benefits, beta free trial
4. **FEATURE GATING**:
   - Plan: Generate (1/week limit), Email (premium)
   - Shop: Share, Email (premium)
   - MealCard: Cooking mode (premium)
5. **AD SLOTS**: Plan, Shop, Schedule pages (free tier only)
6. **PREMIUM BADGES**: NavBar + Settings page
7. **PRICING PAGE**: /pricing with comparison table
8. **LEGAL PAGES**: Privacy, Terms with real content
9. **PWA**: manifest.json for installability
10. **GROCERY CONNECT**: Placeholder store logos in Shop page

### Beta Note
Upgrade button shows toast: "Payment coming soon! Enjoy premium features for free during our beta."

### To Enable
Run SQL migration in Supabase SQL Editor.

### Remaining
- PNG icons (192px, 512px) for PWA install
- Onboarding health options premium gating