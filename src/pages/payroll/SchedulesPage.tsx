import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CirclePlus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Badge, Button, Card, EmptyState, Loading, PageHeader, Table } from '../../components/ui'
import { formatDate, idOf, labelize } from '../../lib/format'
import type { PayrollSchedule } from '../../types'
import { CreateScheduleModal } from './scheduleWizard/CreateScheduleModal'
import { FREQUENCY_META, type PayFrequency } from './scheduleWizard/payDateRules'
import { SCHEDULE_CREATE_ITEMS } from './PayrollSchedulesMenu'

const FREQUENCIES = Object.keys(FREQUENCY_META) as PayFrequency[]

export function SchedulesPage() {
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const frequencyParam = searchParams.get('frequency')
  const urlFrequency = FREQUENCIES.includes(frequencyParam as PayFrequency)
    ? (frequencyParam as PayFrequency)
    : null
  const [manualFrequency, setManualFrequency] = useState<PayFrequency | null>(null)
  const [created, setCreated] = useState(false)
  const createFrequency = manualFrequency ?? urlFrequency
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const query = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const schedules = (query.data?.data ?? []) as PayrollSchedule[]

  function closeWizard() {
    const shouldLeave = created || Boolean(urlFrequency)
    setManualFrequency(null)
    setCreated(false)
    if (searchParams.get('frequency')) {
      searchParams.delete('frequency')
      setSearchParams(searchParams, { replace: true })
    }
    if (shouldLeave) navigate('/payroll/runs', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Payroll schedules"
        subtitle="Recurring weekly, fortnightly, 4-weekly, monthly, quarterly and yearly pay calendars."
        actions={
          <div className="relative" ref={menuRef}>
            <Button type="button" onClick={() => setMenuOpen((open) => !open)}>
              <CirclePlus size={16} />
              Create schedule
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[280px] rounded-[12px] border border-[#d9d9d9] bg-white py-1 shadow-lg">
                {SCHEDULE_CREATE_ITEMS.map((item) => (
                  <button
                    key={item.frequency}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                    onClick={() => {
                      setMenuOpen(false)
                      setManualFrequency(item.frequency)
                    }}
                  >
                    <CirclePlus size={14} className="shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        }
      />
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : schedules.length === 0 ? (
          <EmptyState
            title="No schedules"
            body="Create a weekly, fortnightly, 4-weekly, monthly, quarterly or yearly schedule before opening a payroll run."
          />
        ) : (
          <Table columns={['Name', 'Frequency', 'First period', 'First pay date', 'Status']}>
            {schedules.map((schedule) => (
              <tr key={idOf(schedule)}>
                <td className="px-4 py-3 font-medium">{schedule.schedule_name}</td>
                <td className="px-4 py-3">{labelize(schedule.pay_frequency)}</td>
                <td className="px-4 py-3">{formatDate(schedule.first_period_start_date)}</td>
                <td className="px-4 py-3">{formatDate(schedule.first_pay_date)}</td>
                <td className="px-4 py-3">
                  <Badge status={schedule.is_active ? 'ACTIVE' : 'INACTIVE'}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {companyId && createFrequency ? (
        <CreateScheduleModal
          key={createFrequency}
          companyId={companyId}
          frequency={createFrequency}
          existingNames={schedules.map((schedule) => schedule.schedule_name)}
          onClose={closeWizard}
          onCreated={() => {
            setCreated(true)
            void queryClient.invalidateQueries({ queryKey: ['schedules', companyId] })
          }}
        />
      ) : null}
    </div>
  )
}
