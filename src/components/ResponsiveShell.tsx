import { useEffect, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function ResponsiveShell({
  sidebar,
  headerLeft,
  headerRight,
  footer,
  children,
}: {
  sidebar: ReactNode
  headerLeft?: ReactNode
  headerRight?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-screen bg-cream lg:grid lg:h-screen lg:grid-cols-[228px_minmax(0,1fr)] lg:overflow-hidden">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-navy/50 print:hidden lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(228px,86vw)] flex-col bg-navy text-white transition-transform duration-200 print:hidden lg:static lg:z-auto lg:h-screen lg:w-auto lg:min-h-0 lg:translate-x-0 lg:overflow-hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-5 pb-3 lg:hidden">
          <span className="text-sm font-semibold">Menu</span>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-[10px] text-white"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        {sidebar}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
        <header className="flex min-h-16 flex-wrap items-center gap-3 bg-white px-4 py-3 print:hidden sm:px-6 lg:px-8 xl:px-10">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#d9d9d9] text-navy lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          {headerLeft}
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {headerRight}
          </div>
        </header>
        <main className="app-main flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
          {children}
        </main>
        {footer}
      </div>
    </div>
  )
}
