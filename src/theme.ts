export type ThemeMode = 'day' | 'night'

const STORAGE_KEY = 'cedar.theme'
const EVENT = 'cedar-theme'

export function currentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'day'
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day'
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode === 'night' ? 'dark' : 'light'
  localStorage.setItem(STORAGE_KEY, mode)
  window.dispatchEvent(new Event(EVENT))
}

export function setTheme(mode: ThemeMode) {
  applyTheme(mode)
}

export function listenTheme(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

export function restoreTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  applyTheme(stored === 'night' ? 'night' : 'day')
}
