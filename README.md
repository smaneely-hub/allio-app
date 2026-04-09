# Allio - Meal Planning App

A React-based meal planning application with Supabase backend and LLM-powered meal plan generation.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **LLM**: OpenRouter (meta-llama/llama-3.1-70b-instruct)
- **Deployment**: Vercel (https://allio.life)

## Features

- Household and member management
- Weekly schedule builder
- AI-powered meal plan generation
- Shopping list generation
- Mobile-responsive design

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
npx vercel deploy
```

## Environment Variables

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- (Edge function needs LLM_API_KEY, LLM_ENDPOINT, LLM_MODEL secrets)

## Project Structure

- `src/hooks/` - Custom React hooks for data management
- `src/pages/` - Page components
- `src/components/` - Reusable UI components
- `supabase/functions/` - Edge functions# Force redeploy
