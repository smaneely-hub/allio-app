// Design tokens for Allio - consistent across entire app
// Colors, spacing, shadows, typography

// Primary Colors
export const colors = {
  primary: {
    50: '#EEF7F1',
    100: '#DFF3E6',
    200: '#C2E8D1',
    300: '#A1D9BA',
    400: '#5FAF7A',  // Main brand green
    500: '#4A9A64',
    600: '#3D8152',
    700: '#326843',
  },
  accent: {
    50: '#EBF3FA',
    100: '#D6E7F5',
    400: '#6FA8DC',
    500: '#5B9BD1',
  },
  text: {
    primary: '#1F2A24',
    secondary: '#5F6F66',
    muted: '#8A9990',
  },
  divider: '#E6ECE8',
  background: '#F7F9F7',
  white: '#FFFFFF',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
}

// Day colors for schedule
export const dayColors = {
  Monday: '#22C55E',
  Tuesday: '#14B8A6', 
  Wednesday: '#3B82F6',
  Thursday: '#A855F7',
  Friday: '#EC4899',
  Saturday: '#F59E0B',
  Sunday: '#F97316',
}

// Category colors for shopping
export const categoryColors = {
  produce: { border: '#22C55E', bg: 'bg-green-50' },
  protein: { border: '#F97316', bg: 'bg-orange-50' },
  dairy: { border: '#3B82F6', bg: 'bg-blue-50' },
  pantry: { border: '#EAB308', bg: 'bg-yellow-50' },
  frozen: { border: '#06B6D4', bg: 'bg-cyan-50' },
  bakery: { border: '#D97706', bg: 'bg-amber-50' },
  other: { border: '#6B7280', bg: 'bg-gray-50' },
}

// Meal type gradients for PlanPage
export const mealGradients = {
  breakfast: 'from-amber-100 to-orange-100',
  lunch: 'from-green-100 to-emerald-100',
  dinner: 'from-blue-100 to-indigo-100',
  snack: 'from-rose-100 to-pink-100',
}

// Shadows
export const shadows = {
  sm: '0 1px 2px rgba(31, 42, 36, 0.04)',
  md: '0 2px 8px rgba(31, 42, 36, 0.06)',
  lg: '0 4px 16px rgba(31, 42, 36, 0.08)',
}

// Spacing (8pt grid)
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
}

// Border radius
export const radii = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  full: '9999px',
}

// Common component classes for reuse
export const components = {
  button: {
    primary: 'bg-primary-400 hover:bg-primary-500 text-white font-semibold px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-150 active:scale-[0.97]',
    secondary: 'border-2 border-primary-400 text-primary-400 hover:bg-primary-50 font-semibold px-6 py-3 rounded-full transition-all duration-150 active:scale-[0.97]',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-warm-100 px-4 py-2 rounded-lg transition-all duration-150 active:scale-[0.97]',
  },
  card: 'bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200',
  input: 'w-full px-4 py-3 rounded-xl bg-white border border-divider text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all duration-150',
  badge: {
    success: 'bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-semibold',
    warning: 'bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-xs font-semibold',
    info: 'bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold',
  },
}

// Touch-friendly sizes
export const touchTargets = {
  minHeight: '44px',
  minWidth: '44px',
  iconSize: '24px',
}

export default {
  colors,
  dayColors,
  categoryColors,
  mealGradients,
  shadows,
  spacing,
  radii,
  components,
  touchTargets,
}