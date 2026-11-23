const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'src')
const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(tsx|css)$/.test(entry.name)) files.push(full)
  }
}
walk(root)

const text = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const found = new Set()
const pattern = /(?:^|[\s"'`])((?:hover:|focus:|active:|placeholder:)?)(bg|text|border|border-t|border-b|border-l|border-r|border-x|border-y|divide|ring|outline|from|to|fill|stroke|shadow|decoration|caret)-(\[[^\]]+\]|[a-z0-9-]+)(?:\/(\d{1,3}))?/g
let match
while ((match = pattern.exec(text))) {
  found.add(`${match[1] || ''}${match[2]}-${match[3]}${match[4] ? `/${match[4]}` : ''}`)
}

const named = {
  white: '#ffffff',
  cream: '#f8f7f4',
  paper: '#f8f7f4',
  navy: '#17375e',
  ink: '#17375e',
  muted: '#9b9a9a',
  input: '#d9d9d9',
  brand: '#d32027',
  'navy-mid': '#3d5572',
  'cedar-50': '#f8f7f4',
  'cedar-100': '#d7dee8',
  'cedar-500': '#3d5572',
  'cedar-600': '#3d5572',
  'cedar-700': '#3d5572',
  'cedar-800': '#17375e',
  'cedar-900': '#17375e',
  'cedar-950': '#17375e',
}

function parseHex(value) {
  const clean = value.replace('#', '')
  const body = clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean.slice(0, 6)
  return [parseInt(body.slice(0, 2), 16), parseInt(body.slice(2, 4), 16), parseInt(body.slice(4, 6), 16)]
}
function luminance(r, g, b) {
  const channel = (part) => {
    const c = part / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function saturation(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}
function mix(r, g, b, tr, tg, tb, amount) {
  return [
    Math.round(r + (tr - r) * amount),
    Math.round(g + (tg - g) * amount),
    Math.round(b + (tb - b) * amount),
  ]
}
function hex(rgb) {
  return `#${rgb.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

function nightColor(kind, color) {
  const [r, g, b] = color
  const light = luminance(r, g, b)
  const vivid = saturation(r, g, b) > 0.42 && light > 0.05 && light < 0.82
  if (kind === 'bg' || kind === 'from' || kind === 'to' || kind === 'fill') {
    if (light > 0.9) return '#1a2230'
    if (light > 0.72) return '#243044'
    if (light > 0.5) return hex(mix(r, g, b, 26, 39, 64, 0.78))
    return null
  }
  if (kind === 'border' || kind.startsWith('border') || kind === 'divide' || kind === 'ring' || kind === 'outline') {
    if (light > 0.55) return '#2c3848'
    if (light > 0.18) return '#3d5270'
    return null
  }
  if (vivid) return hex(mix(r, g, b, 255, 255, 255, light < 0.35 ? 0.28 : 0.1))
  if (light < 0.55) return hex(mix(r, g, b, 232, 238, 246, light < 0.2 ? 0.84 : 0.62))
  if (light < 0.78) return hex(mix(r, g, b, 200, 210, 224, 0.45))
  return null
}

function kindOf(utility) {
  if (utility === 'bg' || utility === 'fill') return 'bg'
  if (utility === 'from' || utility === 'to') return utility
  if (utility.startsWith('border') || utility === 'divide' || utility === 'ring' || utility === 'outline') return 'border'
  return 'text'
}

const utilities = ['border-t', 'border-b', 'border-l', 'border-r', 'border-x', 'border-y', 'border', 'divide', 'outline', 'shadow', 'decoration', 'caret', 'stroke', 'ring', 'fill', 'from', 'text', 'bg', 'to']

function splitToken(token) {
  const prefixMatch = token.match(/^(hover:|focus:|active:|placeholder:)/)
  const prefix = prefixMatch ? prefixMatch[1] : ''
  const rest = token.slice(prefix.length)
  const utility = utilities.find((item) => rest.startsWith(`${item}-`))
  if (!utility) return null
  return [prefix, utility, rest.slice(utility.length + 1)]
}

const rules = []
for (const token of found) {
  const variant = splitToken(token)
  if (!variant) continue
  const [prefix = '', utility, rawValue] = variant
  const opacity = rawValue.match(/^(.*)\/(\d{1,3})$/)
  const value = opacity ? opacity[1] : rawValue
  const alpha = opacity ? Number(opacity[2]) / 100 : 1
  let color = null
  if (value.startsWith('[#')) {
    const hexBody = value.slice(2, -1)
    if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexBody)) continue
    color = parseHex(hexBody)
  } else if (named[value]) color = parseHex(named[value])
  else continue
  if ((utility === 'bg' || utility === 'from' || utility === 'to' || utility === 'fill') && named[value] === '#17375e') continue
  if ((utility === 'bg' || utility === 'fill') && (value === 'white' || value === 'black') && alpha < 0.35) continue
  if (kindOf(utility) === 'border' && (value === 'white' || value === '[#fff]' || value === '[#ffffff]')) continue
  let next = nightColor(kindOf(utility), color)
  if (utility === 'bg' || utility === 'fill') {
    if (['cream', 'paper', 'cedar-50', '[#f8f7f4]', '[#f6f5f2]', '[#faf9f7]', '[#fcfbf8]'].includes(value)) next = prefix ? '#243044' : '#10151c'
    if (value === 'white' || value === '[#fff]' || value === '[#ffffff]') next = prefix ? '#243044' : '#1a2230'
    if (value === 'input') next = '#121a24'
  }
  if (kindOf(utility) === 'text' && ['navy', 'ink', 'cedar-800', 'cedar-900', 'cedar-950', '[#17375e]'].includes(value)) next = '#e8eef6'
  if (kindOf(utility) === 'text' && (value === 'muted' || value === '[#9b9a9a]')) next = '#a8b3c2'
  if (kindOf(utility) === 'border' && ['navy', 'ink', 'cedar-800', 'cedar-900', 'cedar-950', '[#17375e]'].includes(value)) next = '#3d5270'
  if (!next) continue
  const painted = alpha < 1 ? `color-mix(in srgb, ${next} ${Math.round(alpha * 100)}%, transparent)` : next
  const className = token.replace(/[\[\]#:/]/g, (char) => `\\${char}`)
  const pseudo = prefix === 'hover:' ? ':hover' : prefix === 'focus:' ? ':focus' : prefix === 'active:' ? ':active' : prefix === 'placeholder:' ? '::placeholder' : ''
  const property =
    utility === 'bg' || utility === 'from' || utility === 'to' || utility === 'fill'
      ? utility === 'bg' || utility === 'fill'
        ? 'background-color'
        : utility === 'from'
          ? '--tw-gradient-from'
          : '--tw-gradient-to'
      : utility.startsWith('border') || utility === 'divide' || utility === 'ring' || utility === 'outline'
        ? utility === 'divide'
          ? 'border-color'
          : utility === 'ring'
            ? '--tw-ring-color'
            : utility === 'outline'
              ? 'outline-color'
              : 'border-color'
        : utility === 'shadow'
          ? '--tw-shadow-color'
          : utility === 'stroke'
            ? 'stroke'
            : utility === 'caret'
              ? 'caret-color'
              : utility === 'decoration'
                ? 'text-decoration-color'
                : 'color'
  rules.push(`html[data-theme="night"] .${className}${pseudo} { ${property}: ${painted}; }`)
}

const extra = `
html[data-theme="night"] {
  color-scheme: dark;
}
html[data-theme="night"] body {
  background: #10151c;
  color: #e8eef6;
}
html[data-theme="night"] .email-editor.is-empty:before {
  color: #a8b3c2;
}
html[data-theme="night"] .workplace-map-frame,
html[data-theme="night"] .workplace-map-surface,
html[data-theme="night"] .workplace-map-frame .leaflet-container {
  background: #1a2230;
}
html[data-theme="night"] .brand-on-light,
html[data-theme="night"] .theme-logo {
  filter: brightness(0) invert(1);
}
html[data-theme="night"] .brand-icon[data-tone="light"] {
  background-color: #e8eef6 !important;
}
html[data-theme="night"] input,
html[data-theme="night"] textarea,
html[data-theme="night"] select {
  color-scheme: dark;
}
`

const css = `/* Generated night theme. Day stays on the default Tailwind colours. */\n@media screen {\n${extra}\n${rules.join('\n')}\n}\n@media print {\n  html[data-theme="night"] body {\n    background: #fff;\n    color: #17375e;\n  }\n}\n`
fs.writeFileSync(path.join(root, 'night-theme.css'), css)
console.log(`rules ${rules.length}`)
