#!/usr/bin/env node
/**
 * Design guard (no dependencies).
 *
 * Fails the build when:
 *  1. a legacy dark-theme colour hex sneaks back into src/ or index.html,
 *  2. tailwind.config.js and src/styles/design-tokens.css drift apart,
 *  3. a colour utility references a palette family/shade that does not exist,
 *  4. a documented text/background pair drops below WCAG AA (4.5:1).
 *
 * Run: npm run check:design
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const srcDir = join(root, 'src')
const failures = []

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

const files = [...walk(srcDir), join(root, 'index.html')].filter((f) => /\.(tsx?|css|html)$/.test(f))

/* 1 — legacy palette ------------------------------------------------------ */
const LEGACY = ['#B6F500', '#0A0A0A', '#141716', '#1B1F1D', '#232826', '#9AA3A0', '#0F1110']
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const hex of LEGACY) {
    if (text.toUpperCase().includes(hex)) {
      failures.push(`${relative(root, file)}: legacy colour ${hex}`)
    }
  }
}

/* palette from tailwind.config.js ---------------------------------------- */
const configText = readFileSync(join(root, 'tailwind.config.js'), 'utf8')
const colorsStart = configText.indexOf('colors: {')
if (colorsStart === -1) failures.push('tailwind.config.js: colours block not found')

const palette = {}
let cssPairs = []
if (colorsStart !== -1) {
  const body = configText.slice(colorsStart + 'colors: {'.length)
  let depth = 1
  let end = 0
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '{') depth += 1
    if (body[i] === '}') depth -= 1
    if (depth === 0) {
      end = i
      break
    }
  }
  const colorsBody = body.slice(0, end)
  const entry = /(['"]?[\w-]+['"]?)\s*:\s*(\{[^}]*\}|'#[0-9A-Fa-f]{3,8}')/g
  for (const match of colorsBody.matchAll(entry)) {
    const key = match[1].replace(/['"]/g, '')
    if (match[2].startsWith('{')) {
      palette[key] = {}
      const inner = /(['"]?[\w-]+['"]?)\s*:\s*'(#[0-9A-Fa-f]{3,8})'/g
      for (const shade of match[2].matchAll(inner)) {
        palette[key][shade[1].replace(/['"]/g, '')] = shade[2].toUpperCase()
      }
    } else {
      palette[key] = { DEFAULT: match[2].replace(/'/g, '').toUpperCase() }
    }
  }
}

const cssText = readFileSync(join(root, 'src/styles/design-tokens.css'), 'utf8')
for (const match of cssText.matchAll(/--color-([\w-]+):\s*(#[0-9A-Fa-f]{3,8});/g)) {
  cssPairs.push([match[1], match[2].toUpperCase()])
}

/* 2 — tailwind vs CSS variables ------------------------------------------ */
const resolve = (token) => {
  if (palette[token]?.DEFAULT) return palette[token].DEFAULT
  for (let i = token.length - 1; i > 0; i -= 1) {
    if (token[i] !== '-') continue
    const family = token.slice(0, i)
    const shade = token.slice(i + 1)
    if (palette[family]?.[shade]) return palette[family][shade]
  }
  return undefined
}

for (const [token, hex] of cssPairs) {
  const tailwindHex = resolve(token)
  if (!tailwindHex) {
    failures.push(`design-tokens.css: --color-${token} has no tailwind counterpart`)
  } else if (tailwindHex !== hex) {
    failures.push(`token drift: --color-${token} = ${hex} but tailwind has ${tailwindHex}`)
  }
}




/* 3 — colour utilities must exist in the palette -------------------------- */
const PREFIXES = ['bg', 'text', 'border', 'ring', 'divide', 'fill', 'stroke', 'from', 'via', 'to', 'placeholder', 'decoration', 'accent', 'caret']
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const colorToken = /^(?:[a-z-]+:)*([a-z]+)-([a-z]+)-(\d+)(?:\/\d+)?$/

for (const file of files.filter((f) => f.endsWith('.tsx'))) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/["'`]([^"'`]*)["'`]/g)) {
    for (const raw of match[1].split(/\s+/)) {
      const token = raw.trim()
      const parsed = token.match(colorToken)
      if (!parsed) continue
      const [, prefix, family, shade] = parsed
      if (!PREFIXES.includes(prefix) || !SHADES.includes(shade)) continue
      const familyColors = palette[family]
      if (!familyColors) {
        failures.push(`${relative(root, file)}: unknown colour family "${family}" in ${token}`)
      } else if (!familyColors[shade]) {
        failures.push(`${relative(root, file)}: undefined shade "${family}-${shade}" in ${token}`)
      }
    }
  }
}

/* 4 — WCAG AA for the documented pairs ----------------------------------- */
const hexToLum = (hex) => {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [hexToLum(a), hexToLum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const lookup = (token) => (token === 'white' ? '#FFFFFF' : resolve(token))

const PAIRS = [
  ['ink-900', 'canvas'],
  ['ink-700', 'canvas'],
  ['ink-600', 'canvas'],
  ['ink-500', 'canvas'],
  ['ink-900', 'surface'],
  ['ink-600', 'surface'],
  ['ink-500', 'surface'],
  ['ink-600', 'surface-2'],
  ['white', 'primary-900'],
  ['white', 'primary-700'],
  ['ink-900', 'accent-500'],
  ['accent-700', 'accent-50'],
  ['accent-800', 'accent-100'],
  ['primary-900', 'primary-50'],
  ['primary-900', 'primary-100'],
  ['success-700', 'success-50'],
  ['warning-700', 'warning-50'],
  ['error-700', 'error-50'],
  ['error-700', 'surface'],
]

for (const [fgName, bgName] of PAIRS) {
  const fg = lookup(fgName)
  const bg = lookup(bgName)
  if (!fg || !bg) {
    failures.push(`contrast pair ${fgName}/${bgName}: token missing`)
    continue
  }
  const value = ratio(fg, bg)
  if (value < 4.5) failures.push(`contrast ${value.toFixed(2)}:1 for ${fgName} on ${bgName} (min 4.5)`)
}

if (failures.length) {
  console.error('Design guard failed:')
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}
console.log(`Design guard passed (${files.length} files, ${cssPairs.length} CSS tokens).`)
