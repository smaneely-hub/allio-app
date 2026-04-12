# Security Flags

Last updated: 2026-04-12

## Hardcoded values that should be reviewed

### High priority
- `scripts/smoke-test.js` includes a hardcoded Supabase URL and anon key fallback.
- `scripts/test-auth-flow.mjs` includes a hardcoded Supabase URL and anon key.
- `scripts/test-meal-generate.mjs` includes a hardcoded Supabase project URL.

### Lower priority / expected app constants
- `src/lib/formatMealPlanEmail.js` contains hardcoded production links to `https://allio.life/plan` and `https://allio.life`.
- `src/lib/formatShoppingListEmail.js` contains hardcoded production links to `https://allio.life/shop` and `https://allio.life`.
- `scripts/e2e-test.cjs`, `scripts/bootstrap-browser.sh`, and several test files reference the production domain `https://allio.life`.

## Notes
- No hardcoded private service role keys were found in the scanned app source.
- Environment variable usage for Supabase and third-party services appears to be the normal pattern across app and edge-function code.
