# Physique Design System

Light, friendly, energetic. Persian-first (fa-IR, RTL), Persian digits everywhere,
Gregorian dates in the DB and Jalali dates on screen. No external assets: fonts,
logo and illustrations all ship from this repo.

Sources of truth
- `frontend/tailwind.config.js` — colour/shape/motion utilities used in code.
- `frontend/src/styles/design-tokens.css` — the same palette as CSS variables, plus
  the Sahel FD `@font-face` rules and layout measurements.
- `frontend/scripts/check-design.mjs` — build guard: legacy hex colours fail the
  build, Tailwind and CSS tokens must match, every colour utility must exist in the
  palette, and the documented contrast pairs must stay at or above WCAG AA (4.5:1).

Run it with `npm run check:design` (it is also part of `npm run build`).

## 1. Colour

### Primary (green)
| token | hex | use |
| --- | --- | --- |
| `primary-50` | `#F0FDF4` | selected nav item, soft banners |
| `primary-100` | `#DCFCE7` | avatar/counter tints |
| `primary-200` | `#BBF7D0` | illustration strokes |
| `primary-300` | `#86EFAC` | illustration accents |
| `primary-400` | `#4ADE80` | decorative dots |
| `primary-500` | `#22C55E` | chart lines |
| `primary-600` | `#16A34A` | brand mark, focus rings, progress bars |
| `primary-700` | `#15803D` | **primary button fill** (white text, 5.3:1) |
| `primary-800` | `#166534` | primary button hover, links hover |
| `primary-900` | `#14532D` | headings, top bar, tab bar active text |

### Accent (orange)
| token | hex | use |
| --- | --- | --- |
| `accent-50` | `#FFF7ED` | tertiary button background, badges |
| `accent-100` | `#FFEDD5` | today marker in the calendar, highlights |
| `accent-200` | `#FED7AA` | borders on accent surfaces |
| `accent-400` | `#FB923C` | secondary button hover |
| `accent-500` | `#F97316` | **secondary button fill** (ink-900 text, 6.3:1) |
| `accent-700` | `#C2410C` | **orange text on white** (5.2:1) |
| `accent-800` | `#9A3412` | orange text on accent-100 |

Rules
- Orange is for highlights, badges, progress and secondary buttons — never for body text.
- Orange text is always `accent-700`/`accent-800`; text *on* an orange fill is `ink-900`.
- Solid green fills are `primary-700` with white text; `primary-600` is only for borders,
  focus rings, lines and progress.

### Neutrals
| token | hex | use |
| --- | --- | --- |
| `canvas` | `#F7FAF5` | page background (warm off-white) |
| `surface` | `#FFFFFF` | cards, sheets, inputs |
| `surface-2` | `#F1F6EF` | inset areas, filter bars |
| `surface-3` | `#E7EFE3` | skeleton bars |
| `border` | `#E3EADF` | card borders |
| `border-strong` | `#CBD8C8` | input borders |
| `ink-900` | `#0F1B12` | body text |
| `ink-800` | `#1B2A20` | strong body text |
| `ink-700` | `#2E4034` | labels |
| `ink-600` | `#45564B` | secondary text |
| `ink-500` | `#64756A` | hints, placeholders (4.9:1 on white) |
| `ink-400` | `#96A29A` | icons only, never text |
| `ink-300` | `#C7D0C9` | dividers, scrollbar thumb |

### Semantic
| family | 50 | 600 | 700 | use |
| --- | --- | --- | --- | --- |
| `success` | `#ECFDF3` | `#079455` | `#067647` | final programs, saved toasts |
| `warning` | `#FFFAEB` | `#B54708` | `#93370D` | pending approval, cautions |
| `error` | `#FEF3F2` | `#D92D20` | `#B42318` | validation, delete |

Semantic colours never replace the brand: a success state is a green *badge*, an
error state an `error-50` panel with `error-700` text.

## 2. Shape, depth, motion

- Radii: `rounded-field` 16px (inputs, small blocks), `rounded-card` 24px (cards,
  dialogs), `rounded-sheet` 28px (bottom sheet), `rounded-pill` (buttons, chips, badges).
  Nothing in the product is square; the smallest radius is 16px.
- Shadows: `shadow-soft` for cards, `shadow-lifted` for sheets/modals/hover,
  `shadow-glow` only under a primary button. No hard borders plus heavy shadows at
  once: cards use a 1px `border` *or* a shadow, not both, except dialogs.
- Motion: `duration-fast` 150ms (hover/press), `duration-base` 200ms (colour/most),
  `duration-slow` 250ms (width/sheet). Animations: `fade-in`, `slide-up`,
  `sheet-up`, `pulse-soft` (skeletons). Everything collapses to ~0ms under
  `@media (prefers-reduced-motion: reduce)` in `index.css`.
- Motion is feedback, never decoration: press scale is 0.98, and only one element
  moves at a time.

## 3. Typography

- Family: **Sahel FD**, self-hosted from `frontend/public/fonts/*.woff2`
  (300/400/600/700/900), fallback `Tahoma, sans-serif`. PDFs use the TTFs in
  `backend/fonts/`.
- Scale: `text-xs` 12 / `text-sm` 14 / `text-base` 16 / `text-lg` 18 /
  `text-xl` 20 / `text-2xl` 24 / `text-3xl` 30 / `text-4xl` 36.
- Body 16px with `line-height: 1.75` (set on `body`), headings 1.4 and bold.
- Page title: `text-xl sm:text-2xl font-bold text-primary-900` + one muted
  sentence of context. Section title: `text-base font-bold text-primary-900`.
- Every number that a coach reads is Persian: `toPersianDigits()` from
  `src/utils/persianDigits.ts`. Dates use `toJalali()` / `toJalaliMonth()`.
- No uppercase tracking tricks (they break Persian joining), no italic.

## 4. Layout

Mobile first, 4/8px spacing scale (`gap-2`, `p-4`, `space-y-4`), max content width
`max-w-3xl` inside the shell.

- **Top bar** (`Layout.tsx`): deep green `bg-primary-900` with the *white* logo
  (`/brand/logo.svg`), 36px tall on phones (`h-9`), 44px from `md` (`h-11`),
  plus the coach name and an avatar button that opens the profile sheet.
- **Phones**: fixed bottom tab bar, 64px (`--tabbar-height`), safe-area aware,
  five entries — ورزشکاران، برنامه جدید (raised green circle), کتابخانه،
  قالب‌ها، پروفایل. The tab bar is never hidden and never scrolls.
- **Desktop**: sticky right sidebar (RTL), 248px (`--sidebar-width`), cards on
  `bg-surface`, active item `bg-primary-50 text-primary-900` with an orange dot.
- **Auth and landing pages** use the dark logo `/brand/Logo.svg` on white headers.
- Touch targets: minimum 48×48px (`min-h-[48px]`, icon buttons `h-12 w-12`); small
  pills are 44px.

## 5. Components (`frontend/src/components/`)

| component | notes |
| --- | --- |
| `Button` | `primary` (green-700/white), `secondary` (orange-500/ink-900), `tertiary` (orange-50/orange-700), `outline`, `ghost`, `danger`; sizes `sm` 44 / `md` 48 / `lg` 56; `loading`, `fullWidth`, `icon`. |
| `Input` / `PasswordInput` | label + hint + field error, `aria-invalid`, `aria-describedby`; 48px tall. |
| `Select` | native select styled with an inline SVG chevron (no icon font). |
| `Chip` | filter pill, `aria-pressed`; active = green-700 fill, white text. |
| `Card` | 24px radius, white, soft border/shadow; optional `onClick` makes it keyboard-activatable. |
| `Modal` | bottom sheet on phones, centred dialog from `md`; Escape/backdrop close, body scroll lock, sticky footer. |
| `ConfirmDialog` | thin wrapper over `Modal` for destructive actions. |
| `Toast` (`ToastProvider` + `useToast`) | light surfaces + border, stacking, optional **undo** action (`actionLabel`/`onAction`), 5s (errors 6s), `aria-live="polite"`. |
| `EmptyState` | inline SVG illustration + title + explanation + one action. |
| `Skeleton` / `SkeletonCard` / `SkeletonList` | `pulse-soft` bars; used instead of spinners for page-level loading. |
| `Badge` | `success`/`warning`/`error`/`accent`/`primary`/`neutral` pill, tinted background + darker text. |
| `Stepper` | labelled progress (`قدم ۲ از ۳`), Persian digits, `role="progressbar"`. |
| `Tabs` | segmented control (`role="tablist"`), 44px targets, optional badge. |
| `Avatar` | deterministic initials tint from the name; `sm`/`md`/`lg`. |
| `JalaliDatePicker` | self-written calendar on `jalaali-js` (already a dependency), Saturday-first week, Persian digits, «امروز» and «پاک کردن» actions; emits Gregorian `YYYY-MM-DD`. |
| `icons.tsx` | stroked 24px inline icons, `currentColor`, `aria-hidden` by default. |

No component may hard-code a hex value; use tokens so the guard passes.

## 6. UX rules

- *Don't Make Me Think*: one primary action per screen (the biggest green pill),
  everything else is `outline`/`tertiary`/`ghost`. A screen states what it is in
  one sentence under its title.
- *Refactoring UI*: hierarchy through size + weight + `ink` shade, not through
  colour. Related items live in one card; unrelated groups are separated by a
  section title, not by boxes inside boxes.
- Defaults are pre-filled and sensible (today's date, «پیش‌نویس» status, the
  athlete already selected when a program is created).
- Plain Persian, no jargon, no «مدیر»: the only privileged role is «ادمین سیستم».
- Every list has three states: **loading** (skeletons), **empty** (`EmptyState`
  with an action) and **error** (`error-700` sentence + retry). Never a blank page.
- Destructive actions always go through `ConfirmDialog`; reversible ones (like
  adding a movement to a day) may use a toast with **undo** instead of a dialog.
- Validation is inline and field-level: DRF field errors are mapped onto the
  matching input via `getFieldErrors()`; a general `error-50` panel only appears
  for non-field errors.

## 7. Accessibility

- Text/background pairs are documented and checked at build time; nothing may
  fall under 4.5:1. `ink-400` is for icons only.
- Focus is always visible: `:focus-visible` ring in `primary-600` + 2px offset.
- 48px touch targets; icon-only buttons carry an `aria-label`.
- Dialogs: `role="dialog"`, `aria-modal`, Escape closes, focus starts on the
  first field, backdrop is `aria-hidden`.
- Live regions: toasts are `aria-live="polite"`; the stepper announces progress.
- Motion respects `prefers-reduced-motion`; nothing flashes more than 3×/s.
- RTL: logical properties (`start`/`end`, `ms-`/`me-`, `ps-`/`pe-`) instead of
  left/right so the layout mirrors correctly.

## 8. Pages in this stage

| route | page | primary action | states |
| --- | --- | --- | --- |
| `/` | Landing | شروع کنید (register) | hero + 3 features, redirects to /athletes when logged in |
| `/login` | Login | ورود | error panel for bad credentials / pending approval |
| `/register` | Register | ساخت حساب | field-level DRF errors, honeypot, «در انتظار تأیید» screen when the system admin turned the approval switch on |
| `/change-password` | Change password | تغییر رمز عبور | field errors, success panel, inside the app shell |
| — | App shell (`Layout`) | — | top bar + bottom tabs (phone) / sidebar (desktop) + profile sheet |

Registration is open by default: `AppSettings.registration_requires_approval`
(`/api/admin/settings/`) is the only switch, and when it is on the UI shows the
approval screen instead of logging the coach in.

## 9. Adding something new

1. Pick an existing token; if a new shade is truly needed, add it to
   `tailwind.config.js` **and** `src/styles/design-tokens.css` (the guard compares them).
2. Reuse a component from the table above before writing markup.
3. Persian digits and Jalali dates for anything a coach reads.
4. Loading, empty and error states, plus a 48px target for each control.
5. `npm run check:design && npm run test:utils && npm run build`.

## 10. Manual checklist

- [ ] Landing at 375px: no horizontal scroll, hero readable, one clear green CTA.
- [ ] Login with a wrong password shows a red panel, fields keep their values.
- [ ] Register with a duplicate username shows the message **under that field**.
- [ ] Register with the approval switch on shows the «در انتظار تأیید» screen.
- [ ] Change password: wrong current password → error under the field; success → green panel.
- [ ] App shell: bottom bar on a phone (5 items, middle one raised), right sidebar on desktop.
- [ ] Top bar logo is 36px on phone / 44px on desktop, white on deep green.
- [ ] Tab through any form: the focus ring is visible on every control.
- [ ] Enable «reduce motion» in the OS: sheets and skeletons stop animating.
- [ ] `npm run check:design` fails if you add `bg-brand-500` anywhere.
