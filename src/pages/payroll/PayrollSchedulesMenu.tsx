import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CirclePlus, LayoutGrid, Trash2 } from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button } from '../../components/ui'
import { idOf, labelize } from '../../lib/format'
import { menuItemClass, menuPanel, toolbarBtn, useMenuOpen } from './CreateSendMenu'
import { CreateScheduleModal } from './scheduleWizard/CreateScheduleModal'
import type { PayFrequency } from './scheduleWizard/payDateRules'
import type { PayrollSchedule } from '../../types'

export const SCHEDULE_CREATE_ITEMS = [
  { frequency: 'WEEKLY', label: 'Create New Weekly Schedule...' },
  { frequency: 'FORTNIGHTLY', label: 'Create New Fortnightly Schedule...' },
  { frequency: 'FOUR_WEEKLY', label: 'Create New 4-Weekly Schedule...' },
  { frequency: 'MONTHLY', label: 'Create New Monthly Schedule...' },
  { frequency: 'QUARTERLY', label: 'Create New Quarterly Schedule...' },
  { frequency: 'YEARLY', label: 'Create New Yearly Schedule...' },
] as const

function DeleteScheduleModal({
  companyId,
  schedules,
  onClose,
}: {
  companyId: string
  schedules: PayrollSchedule[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [scheduleId, setScheduleId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selected = schedules.find((schedule) => idOf(schedule) === scheduleId)

  const remove = useMutation({
    mutationFn: () => payrollApi.deleteSchedule(companyId, scheduleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not delete the schedule')
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-[16px] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-navy">Delete Schedule</h3>
        <p className="mt-1 text-sm text-navy/65">Select the schedule you want to delete.</p>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-navy">Schedule</span>
          <select
            className="h-11 w-full rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none focus:border-navy"
            value={scheduleId}
            onChange={(event) => {
              setScheduleId(event.target.value)
              setError(null)
            }}
          >
            <option value="">Select a schedule</option>
            {schedules.map((schedule) => (
              <option key={idOf(schedule)} value={idOf(schedule)}>
                {schedule.schedule_name} · {labelize(schedule.pay_frequency)}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4">
          <Alert>
            If you delete this schedule, all the payroll in this schedule would be deleted.
            {selected ? ` “${selected.schedule_name}” and its pay runs will be permanently removed.` : ''}
          </Alert>
        </div>
        {error ? (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!scheduleId || remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PayrollSchedulesMenu() {
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const { ref, open, setOpen } = useMenuOpen()
  const [frequency, setFrequency] = useState<PayFrequency | null>(null)
  const [deleting, setDeleting] = useState(false)

  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const schedules = (schedulesQuery.data?.data ?? []) as PayrollSchedule[]
  const existingNames = schedules.map((schedule) => schedule.schedule_name)

  return (
    <div className="relative" ref={ref} data-menu>
      <button type="button" className={toolbarBtn} onClick={() => setOpen((value) => !value)}>
        <LayoutGrid size={16} />
        Schedules
      </button>
      {open ? (
        <div className={`${menuPanel} right-0 w-[280px]`}>
          {SCHEDULE_CREATE_ITEMS.map((item) => (
            <button
              key={item.frequency}
              type="button"
              className={menuItemClass}
              onClick={() => {
                setOpen(false)
                setFrequency(item.frequency)
              }}
            >
              <CirclePlus size={14} className="shrink-0" />
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[#eee]" />
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              setOpen(false)
              setDeleting(true)
            }}
          >
            <Trash2 size={14} className="shrink-0" />
            Delete Schedule...
          </button>
        </div>
      ) : null}

      {companyId && frequency ? (
        <CreateScheduleModal
          key={frequency}
          companyId={companyId}
          frequency={frequency}
          existingNames={existingNames}
          onClose={() => setFrequency(null)}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['schedules', companyId] })
            void queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
          }}
        />
      ) : null}

      {companyId && deleting ? (
        <DeleteScheduleModal
          companyId={companyId}
          schedules={schedules}
          onClose={() => setDeleting(false)}
        />
      ) : null}
    </div>
  )
}
