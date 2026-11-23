import { Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { currentTheme, listenTheme, setTheme, type ThemeMode } from '../theme'

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => currentTheme())

  useEffect(() => listenTheme(() => setMode(currentTheme())), [])

  return (
    <div
      className="flex h-[42px] shrink-0 items-center gap-0.5 rounded-[15px] border border-[#d9d9d9] bg-white p-1"
      role="group"
      aria-label="Theme"
    >
      <ThemeButton
        label="Day"
        selected={mode === 'day'}
        onClick={() => setTheme('day')}
        icon={<Sun size={16} strokeWidth={2.2} />}
      />
      <ThemeButton
        label="Night"
        selected={mode === 'night'}
        onClick={() => setTheme('night')}
        icon={<Moon size={16} strokeWidth={2.2} />}
      />
    </div>
  )
}

function ThemeButton({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string
  selected: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={`${label} theme`}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-[11px] ${
        selected ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
      }`}
    >
      {icon}
    </button>
  )
}
