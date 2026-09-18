import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { decodeShiftNotes, durationLabel, formatTimeRange, type RotaShift } from './rotaModel'

export type ShiftAction = 'edit' | 'duplicate' | 'move' | 'delete' | 'open'

export function ShiftCard({
  shift,
  compact = false,
  showDuration = false,
  onAction,
}: {
  shift: RotaShift
  compact?: boolean
  showDuration?: boolean
  onAction: (action: ShiftAction) => void
}) {
  const open = !shift.employee_id
  const meta = decodeShiftNotes(shift.notes)
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setMenu(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menu])

  const palette = open
    ? {
        box: 'border-[#f3d7b5] bg-[#fff6ea] text-[#c2782a]',
        bar: 'bg-[#e08a2c]',
        menu: 'text-[#c2782a]',
      }
    : {
        box: 'border-[#c9daf4] bg-[#eaf3fb] text-[#2f6fad]',
        bar: 'bg-[#3d7eb8]',
        menu: 'text-[#2f6fad]',
      }

  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border text-left ${palette.box} ${
        compact ? 'px-2 py-1.5' : 'min-h-[88px] px-2.5 py-2'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${palette.bar}`} />
      <p className={`pl-1.5 font-semibold leading-snug ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {formatTimeRange(shift.start_time, shift.end_time)}
      </p>
      <p className={`pl-1.5 ${compact ? 'text-[10px] opacity-80' : 'mt-0.5 text-[11px]'}`}>
        {open ? 'Open Shift' : shift.role_name?.trim() || 'Scheduled'}
      </p>
      {compact && !showDuration ? (
        shift.location ? (
          <p className="pl-1.5 text-[10px] opacity-75">{shift.location}</p>
        ) : null
      ) : (
        <p className={`${compact ? 'pl-1.5 text-[10px] opacity-75' : 'mt-1 pl-1.5 text-[11px] opacity-80'}`}>
          {durationLabel(shift.start_time, shift.end_time, meta.breakMinutes)}
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={`absolute right-1 bottom-1 rounded p-0.5 ${palette.menu} hover:bg-white/60`}
        aria-label="Shift actions"
        onClick={(event) => {
          event.stopPropagation()
          const rect = event.currentTarget.getBoundingClientRect()
          setMenu({
            top: rect.bottom + 6,
            left: Math.max(12, rect.right - 188),
          })
        }}
      >
        <MoreVertical size={14} />
      </button>
      {menu
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] w-[180px] overflow-hidden rounded-[10px] border border-[#e4e2dd] bg-white py-1 text-sm text-navy shadow-lg"
              style={{ top: menu.top, left: menu.left }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {(
                [
                  ['edit', 'Edit Shift'],
                  ['duplicate', 'Duplicate Shift'],
                  ['move', 'Move Shift'],
                  ['delete', 'Delete Shift'],
                  ...(open ? [] : [['open', 'Mark as Open'] as const]),
                ] as const
              ).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-cream"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setMenu(null)
                    onAction(action)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export function LeaveCard({
  compact = false,
  title = 'On Leave',
}: {
  compact?: boolean
  title?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border border-[#f3c4c4] bg-[#fdeeee] text-[#c24747] ${
        compact ? 'px-2 py-1.5' : 'min-h-[88px] px-2.5 py-3'
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-[#c24747]" />
      <p className={`pl-1.5 font-semibold ${compact ? 'text-[10px]' : 'text-[12px]'}`}>{title}</p>
      <p className={`pl-1.5 ${compact ? 'text-[10px] opacity-80' : 'mt-0.5 text-[11px]'}`}>All Day</p>
    </div>
  )
}

export function AddShiftCell({
  onClick,
  showDayOff = false,
  compact = false,
}: {
  onClick: () => void
  showDayOff?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center justify-center ${compact ? 'min-h-[64px]' : 'min-h-[88px]'}`}
      aria-label="Add shift"
    >
      {showDayOff ? (
        <span className="flex h-full min-h-[88px] w-full items-center justify-center rounded-[8px] bg-[#f3f3f3] text-[12px] font-medium text-[#9b9a9a] group-hover:hidden">
          Day Off
        </span>
      ) : (
        <span className="h-full w-full group-hover:hidden" />
      )}
      <span
        className={`hidden w-full items-center justify-center rounded-[8px] border border-dashed border-[#cfcfcf] text-xl font-light text-[#b5b5b5] group-hover:flex ${
          compact ? 'min-h-[56px]' : 'min-h-[88px]'
        }`}
      >
        +
      </span>
    </button>
  )
}
