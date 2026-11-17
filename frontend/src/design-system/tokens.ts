/**
 * @deprecated Legacy JS mirror of the palette.
 *
 * The single source of truth is `tailwind.config.js` (utilities) plus
 * `src/styles/design-tokens.css` (CSS variables). Nothing imports this file
 * today; it stays only so old code keeps compiling. Use Tailwind classes
 * (`bg-primary-700`, `text-ink-600`, …) or `var(--color-…)` instead.
 */
export const colors = {
  primary: '#15803D', // primary-700 — solid fills (white text passes AA)
  primaryHover: '#166534', // primary-800
  bg: '#F7FAF5', // canvas
  card: '#FFFFFF', // surface
  text: '#0F1B12', // ink-900
  textSecondary: '#45564B', // ink-600
  border: '#E3EADF', // border
  success: '#067647', // success-700
  warning: '#93370D', // warning-700
  danger: '#B42318', // error-700
}

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
}

export const radius = {
  sm: '8px',
  md: '16px', // rounded-field
  lg: '20px',
  xl: '24px', // rounded-card
  sheet: '28px', // rounded-sheet
}

export const shadows = {
  sm: '0 1px 2px rgba(15, 27, 18, 0.04)',
  md: '0 1px 2px rgba(15, 27, 18, 0.04), 0 8px 24px -12px rgba(15, 27, 18, 0.12)',
  lg: '0 2px 4px rgba(15, 27, 18, 0.05), 0 18px 40px -18px rgba(15, 27, 18, 0.22)',
}

