import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CircleEllipsis } from 'lucide-react'
import { menuItemClass, menuPanel, toolbarBtn, useMenuOpen } from './CreateSendMenu'

export const payrollMoreMenuItem = menuItemClass

export const BULK_PAYSLIP_ACTIONS = [
  { id: 'addition', label: 'Add Addition to Multiple Payslips...' },
  { id: 'deduction', label: 'Add Deduction to Multiple Payslips...' },
  { id: 'note', label: 'Add Note to Multiple Payslips...' },
  { id: 'fps', label: 'Set FPS Settings for Multiple Payslips...' },
  { id: 'zeroise', label: 'Zeroise Payslips...' },
] as const

const SECONDARY_ACTIONS = [
  { id: 'prepay', label: 'Prepay Following period in this Period...' },
  { id: 'after-leaving', label: 'Add Payslip(s) after leaving...' },
  { id: 'switch-schedule', label: 'Switch Employee(s) Payment Schedule...' },
] as const

export function PayrollMoreMenu({
  runId,
  recordId,
  extras,
  disabled,
  onUnavailable,
}: {
  runId: string
  recordId?: string
  extras?: ReactNode
  disabled?: boolean
  onUnavailable?: (label: string) => void
}) {
  const navigate = useNavigate()
  const { ref, open, setOpen } = useMenuOpen()

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative" ref={ref} data-menu>
      <button
        type="button"
        className={toolbarBtn}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <CircleEllipsis size={16} />
        More
        <ChevronRight size={12} className="rotate-90" />
      </button>
      {open ? (
        <div className={`${menuPanel} right-0 w-[300px]`}>
          {BULK_PAYSLIP_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menuItemClass}
              disabled={!runId}
              onClick={() =>
                go(
                  `/payroll/runs/${runId}/bulk/${item.id}${recordId ? `?recordId=${recordId}` : ''}`,
                )
              }
            >
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[#d9d9d9]" />
          {SECONDARY_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menuItemClass}
              onClick={() => {
                if (item.id === 'switch-schedule') {
                  go(
                    runId
                      ? `/payroll/runs/${runId}/switch-schedule${recordId ? `?recordId=${recordId}` : ''}`
                      : '/payroll/switch-schedule',
                  )
                  return
                }
                setOpen(false)
                onUnavailable?.(`${item.label.replace(/\.\.\.$/, '')} is not available yet.`)
              }}
            >
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[#d9d9d9]" />
          <button
            type="button"
            className={menuItemClass}
            onClick={() => go('/payroll/reports')}
          >
            Minimum Wage Report
          </button>
          {extras ? (
            <>
              <div className="my-1 border-t border-[#d9d9d9]" />
              <div onClick={() => setOpen(false)}>{extras}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
