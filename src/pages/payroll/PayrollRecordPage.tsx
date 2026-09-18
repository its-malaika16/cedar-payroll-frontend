import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronDown,
  CircleCheck,
  Flag,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  SquareArrowUp,
  User,
  UserX,
  Wallet,
} from 'lucide-react'
import { employeesApi, payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { BrandIcon } from '../../components/BrandIcon'
import {
  formatLongDate,
  formatPeriodRange,
  formatTaxCodeWithBasis,
  fullName,
  idOf,
  isEmployeeOnPayrollRun,
  money,
  pensionAppliesToPeriod,
} from '../../lib/format'
import type { Employee, PayrollPayLine, PayrollRecord, PayrollRun, PayrollSchedule, PayrollYearToDate } from '../../types'
import iconPerson from '../../assets/brand/icon-person.png'
import {
  asPayFrequency,
  currentPeriodIndex,
  dateKey,
  hmrcPeriodFromPayDate,
  hmrcPeriodLabel,
  parseDateKey,
  periodPayLabel,
  periodsFromSavedSchedule,
} from './scheduleWizard/payDateRules'
import {
  ADDITION_ITEMS,
  DEDUCTION_ITEMS,
  DEDUCTION_LINKS,
  payBenefitItems,
  taxableAdditionsFromRecord,
  contractualPayFromRecord,
  pensionableGrossForPayslip,
  payslipNetPay,
  payslipNetPayToDate,
  allowableDeductionsFromRecord,
  type PayBenefitId,
} from './payslipMenus'
import { PayTypeEditor } from './PayTypeEditor'
import {
  emptyPayTypeDraft,
  loadSavedPayTypes,
  rememberPayType,
  type PayTypeDraft,
  type PayTypeKind,
  type SavedPayType,
} from './payTypes'
import { payrollListPathFromRun, payslipReturnPath } from './payrollNavigation'
import { CreateSendMenu, toolbarBtn } from './CreateSendMenu'
import { PayrollMoreMenu, payrollMoreMenuItem } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { PayslipPeriodSwitcher, findRunForPeriod, runScheduleId } from './PayslipPeriodSwitcher'

const inputClass =
  'h-[35px] rounded-[6px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none'

const menuPanel =
  'absolute z-30 mt-1 rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-sm'
const floatingMenuPanel =
  'fixed z-[80] overflow-y-auto rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-lg'

function asRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {}
  return (value as Record<string, unknown>) ?? {}
}

function str(value: unknown) {
  return value == null ? '' : String(value)
}

function asNumbers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => !Number.isNaN(item))
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      return asNumbers(JSON.parse(value))
    } catch {
      const n = Number(value)
      return Number.isNaN(n) ? [] : [n]
    }
  }
  const n = Number(value)
  return value == null || value === '' || Number.isNaN(n) ? [] : [n]
}

function firstPositiveRate(...values: unknown[]): string | null {
  for (const value of values) {
    const found = asNumbers(value).find((item) => item > 0)
    if (found != null) return found.toFixed(2)
  }
  return null
}

function uniqueRates(...values: unknown[]): string[] {
  const numbers: number[] = []
  for (const value of values) numbers.push(...asNumbers(value))
  return [...new Set(numbers.filter((item) => item > 0).map((item) => item.toFixed(2)))]
}

function ratePercent(value: unknown, fallback: number) {
  const n = Number(value)
  if (value == null || value === '' || Number.isNaN(n)) return fallback
  return n <= 1 ? n * 100 : n
}

function formatRate(value: number, unit: string) {
  return `£${value.toFixed(2)} ${unit}`
}

function moneyInput(value: unknown) {
  const n = Number(value)
  return Number.isNaN(n) ? '0.00' : n.toFixed(2)
}

type ExtraPay = {
  id: string
  kind: 'daily' | 'monthly' | 'benefit'
  label?: string
  qty: string
  rate: string
  amount: string
}

function emptyMonthlyPay(label?: string): ExtraPay {
  return { id: `monthly-${Date.now()}`, kind: 'monthly', label, qty: '', rate: '', amount: '' }
}

const mappedAdditionFields = new Set(
  ADDITION_ITEMS.filter((item) => item.field).map((item) => item.label),
)

function extraPayFromRecord(record: PayrollRecord, hasHours: boolean): ExtraPay[] {
  const lines = (record.pay_lines ?? []).filter(
    (line): line is PayrollPayLine & { kind: ExtraPay['kind'] } =>
      line.kind === 'daily' || line.kind === 'monthly' || line.kind === 'benefit',
  )
  if (lines.length === 0) return hasHours ? [] : [emptyMonthlyPay()]
  return lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    label: line.label,
    qty: line.qty && Number(line.qty) ? String(line.qty) : '',
    rate: line.rate && Number(line.rate) ? Number(line.rate).toFixed(2) : '',
    amount: Number(line.amount ?? 0) ? Number(line.amount).toFixed(2) : '',
  }))
}

function additionLinesFromRecord(record: PayrollRecord) {
  return (record.pay_lines ?? []).filter((line) => line.kind === 'addition')
}

function MenuItem({
  children,
  icon,
  onClick,
  tone = 'navy',
}: {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  tone?: 'navy' | 'blue'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium hover:bg-cream ${
        tone === 'blue' ? 'text-[#3276ca]' : 'text-navy'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function MenuDivider() {
  return <div className="my-0.5 border-t border-[#d9d9d9]" />
}

function AddToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" className="mt-3 text-xs font-medium text-[#4289e4] underline" onClick={onClick}>
      Add {open ? '▴' : '▾'}
    </button>
  )
}

function PortalMenu({
  open,
  width,
  className,
  preferUp,
  trigger,
  children,
}: {
  open: boolean
  width: number
  className?: string
  preferUp?: boolean
  trigger: ReactNode
  children: ReactNode
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setStyle(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = preferUp || spaceBelow < 280 || spaceBelow < spaceAbove
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
    const maxHeight = Math.max(160, (openUp ? spaceAbove : spaceBelow) - 16)
    setStyle({
      left,
      width,
      maxHeight,
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    })
  }, [open, width, preferUp])

  return (
    <div ref={triggerRef} className="relative" data-menu>
      {trigger}
      {open && style
        ? createPortal(
            <div data-menu className={`${floatingMenuPanel} ${className ?? ''}`} style={style}>
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function ArrowIcon() {
  return (
    <span className="flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border border-navy text-navy">
      <SquareArrowUp size={9} strokeWidth={2.6} />
    </span>
  )
}

export function PayrollRecordPage() {
  const { runId = '', recordId = '' } = useParams()
  const { companyId, companies } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [periodTab, setPeriodTab] = useState<'period' | 'ytd'>('period')
  const [ytdOpen, setYtdOpen] = useState({
    thisEmployment: true,
    previousEmployment: true,
    combined: true,
  })
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('')
  const [showHourlyPay, setShowHourlyPay] = useState(false)
  const hourlyAddedRef = useRef(false)
  const [employeeNotes, setEmployeeNotes] = useState('')
  const [employerNotes, setEmployerNotes] = useState('')
  const [showEmployeeNotes, setShowEmployeeNotes] = useState(false)
  const [showEmployerNotes, setShowEmployerNotes] = useState(false)
  const [extraPay, setExtraPay] = useState<ExtraPay[]>(() => [emptyMonthlyPay()])
  const [visibleAdditions, setVisibleAdditions] = useState<string[]>([])
  const [additionAmounts, setAdditionAmounts] = useState<Record<string, string>>({})
  const [visibleDeductions, setVisibleDeductions] = useState<string[]>([])
  const [deductionAmounts, setDeductionAmounts] = useState<Record<string, string>>({})
  const [typeEditor, setTypeEditor] = useState<PayTypeKind | null>(null)
  const [typeDraft, setTypeDraft] = useState<PayTypeDraft>(emptyPayTypeDraft)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [savedTypes, setSavedTypes] = useState<SavedPayType[]>([])
  const [customAdditions, setCustomAdditions] = useState<{ name: string; amount: string }[]>([])
  const [customDeductions, setCustomDeductions] = useState<{ name: string; amount: string }[]>([])
  const [leaveAmount, setLeaveAmount] = useState('')
  const [ratePrompt, setRatePrompt] = useState<{ kind: 'hourly' | 'daily'; value: string } | null>(null)
  const skipHydrate = useRef(false)
  const calcTimer = useRef(0)
  const calcSeq = useRef(0)
  const [calculating, setCalculating] = useState(false)
  const [switchingPeriod, setSwitchingPeriod] = useState(false)

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })
  const recordQuery = useQuery({
    queryKey: ['payroll-record', companyId, runId, recordId],
    queryFn: () => payrollApi.getRecord(companyId!, runId, recordId),
    enabled: Boolean(companyId && runId && recordId),
  })
  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const runsQuery = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId),
  })

  const run = runQuery.data?.data as PayrollRun | undefined
  const record = recordQuery.data?.data as PayrollRecord | undefined
  const employeeId = record?.employee_id ? String(record.employee_id) : ''
  const scheduleList = ((schedulesQuery.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const runList = (runsQuery.data?.data ?? []) as PayrollRun[]
  const currentScheduleId = run ? runScheduleId(run) : ''
  const currentPeriodKey = run?.period_number != null ? String(run.period_number) : ''

  const employeeQuery = useQuery({
    queryKey: ['employee', companyId, employeeId],
    queryFn: () => employeesApi.get(companyId!, employeeId),
    enabled: Boolean(companyId && employeeId),
  })

  const employee = (employeeQuery.data?.data as Employee | undefined) ?? record?.employees
  const records = ((run?.payroll_records ?? []) as PayrollRecord[]).filter((item) =>
    isEmployeeOnPayrollRun(item.employees, run),
  )
  const sidebarRecords = records.length > 0 ? records : record ? [record] : []
  const runLocked = ['LOCKED', 'COMPLETED'].includes((run?.status ?? '').toUpperCase())
  const runFullyLocked = (run?.status ?? '').toUpperCase() === 'LOCKED'
  const recordFinalised = (record?.status ?? '').toUpperCase() === 'FINALISED'
  const locked = runLocked || recordFinalised
  const companyName = companies.find((company) => company.id === companyId)?.name ?? 'Company Name'

  useEffect(() => {
    setExtraPay([emptyMonthlyPay()])
    hourlyAddedRef.current = false
    setShowHourlyPay(false)
    setVisibleDeductions([])
    setDeductionAmounts({})
    setCustomAdditions([])
    setCustomDeductions([])
    setOpenMenu(null)
    setTypeEditor(null)
    setTypeError(null)
    setRatePrompt(null)
    skipHydrate.current = false
    window.clearTimeout(calcTimer.current)
  }, [recordId])

  useEffect(() => {
    if (!record) return
    if (skipHydrate.current) {
      skipHydrate.current = false
      return
    }
    const hasHours = Number(record.total_hours ?? 0) > 0
    setHours(hasHours ? str(record.total_hours) : '')
    const hourlyFromEmployee = firstPositiveRate(
      asRecord(employee?.employment_details).basic_rate_per_hour,
      asRecord(employee?.employment_details).extra_hourly_rates,
    )
    setRate(
      Number(record.wage_per_hour ?? 0)
        ? str(record.wage_per_hour)
        : hourlyFromEmployee ?? '',
    )
    if (hasHours) {
      hourlyAddedRef.current = false
      setShowHourlyPay(true)
      setExtraPay((current) =>
        current.filter((line) => line.kind !== 'monthly' || Number(line.amount) > 0),
      )
    } else {
      setShowHourlyPay(hourlyAddedRef.current)
    }
    setEmployeeNotes(record.employee_notes ?? '')
    setEmployerNotes(record.employer_notes ?? '')
    setShowEmployeeNotes(Boolean(record.employee_notes))
    setShowEmployerNotes(Boolean(record.employer_notes))
    setLeaveAmount(moneyInput(record.unpaid_leave_deduction))
    const fromRecord = ADDITION_ITEMS.filter(
      (item) => item.field && Number(record[item.field] ?? 0) !== 0,
    )
    const storedAdditions = additionLinesFromRecord(record)
    const unmappedStored = storedAdditions.filter((line) => !mappedAdditionFields.has(line.label ?? ''))
    const mappedStoredLabels = storedAdditions
      .map((line) => line.label)
      .filter((label): label is string => Boolean(label) && mappedAdditionFields.has(label))
    setVisibleAdditions([
      ...fromRecord.map((item) => item.label),
      ...mappedStoredLabels.filter((label) => !fromRecord.some((item) => item.label === label)),
    ])
    setAdditionAmounts({
      ...Object.fromEntries(fromRecord.map((item) => [item.label, moneyInput(record[item.field!])])),
      ...Object.fromEntries(
        storedAdditions
          .filter((line) => line.label && mappedAdditionFields.has(line.label))
          .map((line) => [line.label!, moneyInput(line.amount)]),
      ),
    })
    setExtraPay(extraPayFromRecord(record, hasHours))
    setCustomAdditions(
      unmappedStored.map((line) => ({
        name: line.label || 'Addition',
        amount: moneyInput(line.amount),
      })),
    )
    const storedDeductions = record.deduction_lines ?? []
    setVisibleDeductions(storedDeductions.map((line) => line.label))
    setDeductionAmounts(
      Object.fromEntries(storedDeductions.map((line) => [line.label, moneyInput(line.amount)])),
    )
    if (!locked) queueCalculate()
  }, [recordQuery.dataUpdatedAt])

  const latestRef = useRef({
    extraPay,
    hours,
    rate,
    customAdditions,
    visibleAdditions,
    additionAmounts,
    visibleDeductions,
    deductionAmounts,
    leaveAmount,
    employeeNotes,
    employerNotes,
  })
  latestRef.current = {
    extraPay,
    hours,
    rate,
    customAdditions,
    visibleAdditions,
    additionAmounts,
    visibleDeductions,
    deductionAmounts,
    leaveAmount,
    employeeNotes,
    employerNotes,
  }

  useEffect(() => {
    return () => window.clearTimeout(calcTimer.current)
  }, [])

  useEffect(() => {
    if (!companyId) return
    setSavedTypes(loadSavedPayTypes(companyId))
  }, [companyId])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-menu]')) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const name = fullName(employee?.first_name, employee?.last_name)
  const tax = asRecord(employee?.employee_tax_details)
  const employment = asRecord(employee?.employment_details)
  const pension = asRecord(employee?.employee_pension_details)
  const hasBank = Boolean(employee?.bank_details?.length)
  const payTotal = Number(hours || 0) * Number(rate || 0)
  const statutoryItems = [
    ['Statutory sick pay (SSP)', record?.ssp],
    ['Statutory maternity pay (SMP)', record?.smp],
    ['Statutory paternity pay (SPP)', record?.spp],
    ['Statutory adoption pay (SAP)', record?.sap],
    ['Statutory shared parental pay (ShPP)', record?.shpp],
    ['Statutory parental bereavement pay (SPBP)', record?.spbp],
    ['Statutory neonatal care pay (SNCP)', record?.sncp],
  ].filter(([, value]) => Number(value ?? 0) > 0)

  const leaveSummary = (record?.calendar_leave_summary ?? {}) as Record<string, unknown>
  const leaveAmounts = (leaveSummary.amounts ?? {}) as Record<string, number>
  const leaveLines = [
    ['Annual leave', leaveSummary.annual, leaveAmounts.annual, 'Paid — already in basic pay'],
    ['Unpaid leave', leaveSummary.unpaid, leaveAmounts.unpaid, 'Deducted from basic pay'],
    ['Sick leave (SSP)', leaveSummary.sick, leaveAmounts.sick ?? leaveSummary.sick_pay, 'Replaces contractual pay · statutory sick pay'],
    ['Maternity leave (SMP)', leaveSummary.maternity, leaveAmounts.maternity ?? leaveSummary.maternity_pay, 'Replaces contractual pay · statutory maternity pay'],
    ['Paternity leave (SPP)', leaveSummary.paternity, leaveAmounts.paternity ?? leaveSummary.paternity_pay, 'Replaces contractual pay · statutory paternity pay'],
    ['Absent', leaveSummary.absent, leaveAmounts.absent, 'Deducted from basic pay'],
    ['On strike', leaveSummary.on_strike, leaveAmounts.on_strike, 'Deducted from basic pay'],
    ['Parenting leave', leaveSummary.parenting, leaveAmounts.parenting, 'Paid — already in basic pay'],
    ['Custom leave', leaveSummary.custom, leaveAmounts.custom, 'Deducted from basic pay'],
  ].filter(([, days]) => Number(days ?? 0) > 0)

  const savedHourlyRate = firstPositiveRate(
    employment.basic_rate_per_hour,
    employment.extra_hourly_rates,
  )
  const savedDailyRate = firstPositiveRate(employment.daily_rate, employment.extra_daily_rates)
  const rateOptions = useMemo(
    () =>
      uniqueRates(
        employment.basic_rate_per_hour,
        employment.extra_hourly_rates,
        record?.wage_per_hour,
        rate,
      ),
    [employment.basic_rate_per_hour, employment.extra_hourly_rates, record?.wage_per_hour, rate],
  )

  const dailyRateOptions = useMemo(
    () => uniqueRates(employment.daily_rate, employment.extra_daily_rates),
    [employment.daily_rate, employment.extra_daily_rates],
  )

  const pensionEnrolled = pensionAppliesToPeriod(
    pension,
    run?.period_end_date ?? record?.pay_date,
  )
  const summaryRows = useMemo(() => {
    if (!record) return [] as Array<readonly [string, unknown]>
    const zeroAsBlank = (value: unknown) =>
      Number(value ?? 0) === 0 ? null : value

    const additions = taxableAdditionsFromRecord(record)
    const deductions = allowableDeductionsFromRecord(record)
    const rows: Array<readonly [string, unknown]> = [['Pay', contractualPayFromRecord(record)]]
    if (additions > 0) {
      rows.push(['Taxable additions', additions])
    }
    if (deductions.taxAllowable > 0) {
      rows.push(['Tax allowable deductions', deductions.taxAllowable])
    }
    rows.push(['Taxable gross', record.taxable_gross], ['Tax', record.tax])
    if (additions > 0) {
      rows.push(['NIC-able additions', additions])
    }
    if (deductions.nicAllowable > 0) {
      rows.push(['NIC allowable deductions', deductions.nicAllowable])
    }
    rows.push(
      ['NIC-able gross', record.nicable_gross],
      ['Employee NIC', zeroAsBlank(record.employee_nic)],
      ['Employer NIC', record.employer_nic],
    )
    if (Number(record.student_loan ?? 0) > 0) {
      rows.push(['Student loan', record.student_loan])
    }
    if (Number(record.postgraduate_loan ?? 0) > 0) {
      rows.push(['Postgraduate loan', record.postgraduate_loan])
    }
    rows.push(['Net pay', payslipNetPay(record)])
    const additionsToNet =
      Number(record.non_tax_non_nic_additions ?? 0) +
      Number(record.night_allowance ?? 0)
    if (additionsToNet > 0) {
      rows.push(['Additions to net pay', additionsToNet])
    }
    if (pensionEnrolled) {
      if (additions > 0) {
        rows.push(['Pension-able additions', additions])
      }
      if (deductions.pensionAllowable > 0) {
        rows.push(['Pension allowable deductions', deductions.pensionAllowable])
      }
      rows.push(
        ['Pension-able gross', pensionableGrossForPayslip(record)],
        ['Employee pension', record.employee_pension],
        ['Employer pension', record.employer_pension],
      )
    }
    rows.push(
      ['Take-home pay', record.take_home_pay],
      ['Cost to employer', record.cost_to_employer],
    )
    return rows
  }, [pensionEnrolled, record])

  const ytdSections = useMemo(() => {
    const ytd = record?.year_to_date
    const thisEmployment = ytd?.this_employment ?? ytd
    const starter = employee?.starters_leavers?.[0]
    const previousTaxable =
      ytd?.previous_employment?.taxable_gross ?? starter?.previous_gross_taxable_pay ?? 0
    const previousTax = ytd?.previous_employment?.tax ?? starter?.previous_gross_tax ?? 0
    const combined = ytd?.combined ?? thisEmployment
    const combinedForNet = {
      ...combined,
      night_allowance: combined?.night_allowance ?? thisEmployment?.night_allowance,
      employee_pension: combined?.employee_pension ?? thisEmployment?.employee_pension,
      take_home_pay: combined?.take_home_pay ?? thisEmployment?.take_home_pay,
    }

    function groupsFor(source: PayrollYearToDate | null | undefined, netSource = source) {
      return [
        [
          ['Taxable gross to date', source?.taxable_gross],
          ['Tax to date', source?.tax],
        ],
        [
          ['NIC-able gross to date', source?.nicable_gross],
          ['Employee NIC to date', source?.employee_nic],
          ['Employer NIC to date', source?.employer_nic],
        ],
        [
          ['Pension-able gross to date', source?.pensionable_gross],
          ['Employee pension to date', source?.employee_pension],
          ['Employer pension to date', source?.employer_pension],
        ],
        [['Net pay to date', payslipNetPayToDate(netSource)]],
        [
          ['Take-home pay to date', source?.take_home_pay],
          ['Cost to employer to date', source?.cost_to_employer],
        ],
      ] as Array<Array<readonly [string, unknown]>>
    }

    return [
      {
        id: 'thisEmployment' as const,
        title: 'This employment',
        groups: groupsFor(thisEmployment),
      },
      {
        id: 'previousEmployment' as const,
        title: 'Previous employment',
        groups: [
          [
            ['Taxable gross', previousTaxable],
            ['Tax', previousTax],
          ],
        ] as Array<Array<readonly [string, unknown]>>,
      },
      {
        id: 'combined' as const,
        title: 'Combined',
        groups: groupsFor(combined, combinedForNet),
      },
    ]
  }, [employee?.starters_leavers, record?.year_to_date])

  function toggleMenu(id: string) {
    setOpenMenu((current) => (current === id ? null : id))
  }

  async function act(fn: () => Promise<{ message: string }>) {
    setError(null)
    try {
      const result = await fn()
      setMessage(result.message)
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-record', companyId, runId, recordId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  async function markCurrentDone() {
    if (recordFinalised) {
      setMessage('This payslip is already marked as done.')
      return
    }
    await act(async () => {
      const result = await payrollApi.finaliseRecord(companyId!, runId, recordId)
      await queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      return result
    })
  }

  async function openEmployeePeriod(nextScheduleId: string, nextPeriodKey: string) {
    if (!companyId || !employeeId) return
    if (nextScheduleId === currentScheduleId && nextPeriodKey === currentPeriodKey) return
    const schedule = scheduleList.find((item) => idOf(item) === nextScheduleId)
    if (!schedule) {
      setError('Select a pay schedule first')
      return
    }
    const periods = periodsFromSavedSchedule(schedule).periods
    const period = periods.find((item) => String(item.number) === nextPeriodKey)
    if (!period) {
      setError('That pay period is not available on this schedule')
      return
    }
    setSwitchingPeriod(true)
    setError(null)
    try {
      let target = findRunForPeriod(runList, nextScheduleId, nextPeriodKey, period.start)
      let targetRunId = target ? idOf(target) : ''
      if (!targetRunId) {
        const frequency = asPayFrequency(schedule.pay_frequency)
        const taxPeriod = hmrcPeriodFromPayDate(period.payDate, frequency)
        const created = await payrollApi.createRun(companyId, {
          schedule_id: nextScheduleId,
          tax_year_start: taxPeriod.taxYear,
          tax_year_end: taxPeriod.taxYear + 1,
          period_number: period.number,
          period_start_date: dateKey(period.start),
          period_end_date: dateKey(period.end),
          pay_date: dateKey(period.payDate),
          tax_week: taxPeriod.taxWeek ?? undefined,
          tax_month: taxPeriod.taxMonth ?? undefined,
        })
        targetRunId = idOf(created.data)
        if (targetRunId) {
          await payrollApi.generateRecords(companyId, targetRunId)
        }
      }
      if (!targetRunId) throw new Error('Could not open that pay period')
      let detail = await payrollApi.getRun(companyId, targetRunId)
      let records = ((detail.data as PayrollRun).payroll_records ?? []) as PayrollRecord[]
      let match = records.find((item) => String(item.employee_id) === employeeId)
      const runStatus = String((detail.data as PayrollRun).status ?? '').toUpperCase()
      if (!match && runStatus !== 'LOCKED' && runStatus !== 'COMPLETED') {
        await payrollApi.generateRecords(companyId, targetRunId)
        detail = await payrollApi.getRun(companyId, targetRunId)
        records = ((detail.data as PayrollRun).payroll_records ?? []) as PayrollRecord[]
        match = records.find((item) => String(item.employee_id) === employeeId)
      }
      if (!match) {
        throw new Error('This employee is not on that pay schedule for the selected period')
      }
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      navigate(`/payroll/runs/${targetRunId}/records/${idOf(match)}`, {
        state: location.state,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that pay period')
    } finally {
      setSwitchingPeriod(false)
    }
  }

  function changeEmployeeSchedule(nextScheduleId: string) {
    const schedule = scheduleList.find((item) => idOf(item) === nextScheduleId)
    if (!schedule) return
    const periods = periodsFromSavedSchedule(schedule).periods
    const current = periods[currentPeriodIndex(periods)]
    void openEmployeePeriod(nextScheduleId, current ? String(current.number) : '')
  }

  async function patchRecord(body: Record<string, unknown>, silent = true) {
    if (!companyId || locked) return
    if (silent) {
      setError(null)
      skipHydrate.current = true
      try {
        const result = await payrollApi.updateRecord(companyId, runId, recordId, {
          ...body,
          recalculate: body.recalculate !== false,
        })
        queryClient.setQueryData(['payroll-record', companyId, runId, recordId], result)
      } catch (err) {
        skipHydrate.current = false
        setError(err instanceof Error ? err.message : 'Could not save payslip inputs')
      }
      return
    }
    await act(() => payrollApi.updateRecord(companyId, runId, recordId, { ...body, recalculate: true }))
  }

  function mappedAdditionPayload(
    visible = visibleAdditions,
    amounts = additionAmounts,
  ) {
    const body: Record<string, number> = {}
    for (const item of ADDITION_ITEMS) {
      if (!item.field) continue
      if (visible.includes(item.label)) {
        body[item.field] = Number(amounts[item.label] || 0)
      }
    }
    return body
  }

  async function persistAndCalculate() {
    if (!companyId || locked) return
    const seq = ++calcSeq.current
    const form = latestRef.current
    setCalculating(true)
    setError(null)
    skipHydrate.current = true
    try {
      const leave = Number(form.leaveAmount)
      const hoursWorked = form.hours === '' ? undefined : Number(form.hours)
      const result = await payrollApi.updateRecord(companyId, runId, recordId, {
        total_hours: hoursWorked,
        wage_per_hour: form.rate === '' ? undefined : Number(form.rate),
        ...(hoursWorked && hoursWorked > 0 ? { pay_basis: 'HOURLY' } : {}),
        pay_lines: payLinesPayload(
          form.extraPay,
          form.customAdditions,
          form.visibleAdditions,
          form.additionAmounts,
        ),
        deduction_lines: deductionLinesPayload(form.visibleDeductions, form.deductionAmounts),
        unpaid_leave_deduction: Number.isNaN(leave) || leave < 0 ? 0 : leave,
        employee_notes: form.employeeNotes || undefined,
        employer_notes: form.employerNotes || undefined,
        ...mappedAdditionPayload(form.visibleAdditions, form.additionAmounts),
        recalculate: true,
      })
      if (seq !== calcSeq.current) return
      queryClient.setQueryData(['payroll-record', companyId, runId, recordId], result)
    } catch (err) {
      if (seq !== calcSeq.current) return
      skipHydrate.current = false
      setError(err instanceof Error ? err.message : 'Could not calculate this payslip')
    } finally {
      if (seq === calcSeq.current) setCalculating(false)
    }
  }

  function queueCalculate() {
    if (locked) return
    window.clearTimeout(calcTimer.current)
    calcTimer.current = window.setTimeout(() => {
      void persistAndCalculate()
    }, 450)
  }

  useEffect(() => {
    if (locked || !record || !employeeQuery.isSuccess) return
    queueCalculate()
  }, [employeeQuery.dataUpdatedAt, recordId])

  async function saveInputs(
    next?: { hours?: string; rate?: string; employeeNotes?: string; employerNotes?: string },
    silent = true,
  ) {
    if (next?.hours !== undefined) setHours(next.hours)
    if (next?.rate !== undefined) setRate(next.rate)
    const hoursWorked =
      (next?.hours ?? hours) === '' ? undefined : Number(next?.hours ?? hours)
    await patchRecord(
      {
        total_hours: hoursWorked,
        wage_per_hour: (next?.rate ?? rate) === '' ? undefined : Number(next?.rate ?? rate),
        ...(hoursWorked && hoursWorked > 0 ? { pay_basis: 'HOURLY' } : {}),
        employee_notes: (next?.employeeNotes ?? employeeNotes) || undefined,
        employer_notes: (next?.employerNotes ?? employerNotes) || undefined,
        recalculate: true,
      },
      silent,
    )
  }

  function payLinesPayload(
    lines = extraPay,
    customs = customAdditions,
    visible = visibleAdditions,
    amounts = additionAmounts,
  ) {
    const extras = lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      qty: line.qty === '' ? 0 : Number(line.qty),
      rate: line.rate === '' ? 0 : Number(line.rate),
      amount:
        line.kind === 'daily'
          ? Number(line.qty || 0) * Number(line.rate || 0)
          : Number(line.amount || 0),
      ...(line.kind === 'monthly'
        ? { label: line.label || periodPayLabel(run?.pay_frequency) }
        : {}),
    }))
    const unmapped = visible
      .filter((label) => !mappedAdditionFields.has(label))
      .map((label) => ({
        id: `addition-${label}`,
        kind: 'addition' as const,
        label,
        amount: Number(amounts[label] || 0),
      }))
    const custom = customs.map((row) => ({
      id: `addition-${row.name}`,
      kind: 'addition' as const,
      label: row.name,
      amount: Number(row.amount || 0),
    }))
    return [...extras, ...unmapped, ...custom]
  }

  function deductionLinesPayload(
    visible = visibleDeductions,
    amounts = deductionAmounts,
  ) {
    return visible.map((label) => ({
      label,
      amount: Number(amounts[label] || 0),
    }))
  }

  async function persistPayLines(
    lines = extraPay,
    customs = customAdditions,
    visible = visibleAdditions,
    amounts = additionAmounts,
  ) {
    await patchRecord({ pay_lines: payLinesPayload(lines, customs, visible, amounts) })
  }

  async function persistDeductions(
    visible = visibleDeductions,
    amounts = deductionAmounts,
  ) {
    await patchRecord({ deduction_lines: deductionLinesPayload(visible, amounts) })
  }

  function applyHourlyPay(rateValue: string) {
    hourlyAddedRef.current = true
    setShowHourlyPay(true)
    setRate(rateValue)
    void saveInputs({ rate: rateValue })
  }

  function applyDailyPay(rateValue: string) {
    setExtraPay((current) => {
      const next = [
        ...current,
        {
          id: `daily-${Date.now()}`,
          kind: 'daily' as const,
          qty: '',
          rate: rateValue,
          amount: '',
        },
      ]
      void persistPayLines(next)
      return next
    })
  }

  function addPayLine(kind: PayBenefitId) {
    setOpenMenu(null)
    if (kind === 'hourly' || kind === 'daily') {
      if (employeeId && employeeQuery.isPending) return
      const saved = kind === 'hourly' ? savedHourlyRate : savedDailyRate
      if (saved) {
        if (kind === 'hourly') applyHourlyPay(saved)
        else applyDailyPay(saved)
        return
      }
      setRatePrompt({ kind, value: '' })
      return
    }
    if (kind === 'period' || kind === 'monthly') {
      const label = kind === 'monthly' ? 'Monthly Pay' : periodPayLabel(run?.pay_frequency)
      setExtraPay((current) => {
        const next = [...current, emptyMonthlyPay(label)]
        void persistPayLines(next)
        return next
      })
      return
    }
    if (kind === 'copy') {
      void act(() => payrollApi.copyPayments(companyId!, runId, recordId))
      return
    }
    setExtraPay((current) => {
      const next = [
        ...current,
        {
          id: `${kind}-${Date.now()}`,
          kind,
          qty: '',
          rate: '',
          amount: '',
        },
      ]
      void persistPayLines(next)
      return next
    })
  }

  async function confirmRatePrompt() {
    if (!ratePrompt) return
    const entered = Number(ratePrompt.value)
    if (!ratePrompt.value.trim() || Number.isNaN(entered) || entered <= 0) {
      setError(`Enter a ${ratePrompt.kind === 'hourly' ? 'per hour' : 'per day'} rate`)
      return
    }
    const rateValue = entered.toFixed(2)
    if (companyId && employeeId) {
      try {
        await employeesApi.updateEmployment(
          companyId,
          employeeId,
          ratePrompt.kind === 'hourly'
            ? { basic_rate_per_hour: entered }
            : { daily_rate: entered },
        )
        await queryClient.invalidateQueries({ queryKey: ['employee', companyId, employeeId] })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save this rate to payment information')
        return
      }
    }
    setError(null)
    if (ratePrompt.kind === 'hourly') applyHourlyPay(rateValue)
    else applyDailyPay(rateValue)
    setRatePrompt(null)
  }

  function addAddition(label: string) {
    setOpenMenu(null)
    const item = ADDITION_ITEMS.find((entry) => entry.label === label)
    setVisibleAdditions((current) => (current.includes(label) ? current : [...current, label]))
    setAdditionAmounts((current) => ({
      ...current,
      [label]: current[label] ?? moneyInput(item?.field && record ? record[item.field] : 0),
    }))
  }

  function addDeduction(label: string, amount = '0.00') {
    setOpenMenu(null)
    setVisibleDeductions((current) => {
      const next = current.includes(label) ? current : [...current, label]
      setDeductionAmounts((amounts) => {
        const merged = { ...amounts, [label]: amounts[label] ?? amount }
        void persistDeductions(next, merged)
        return merged
      })
      return next
    })
  }

  function openTypeEditor(kind: PayTypeKind) {
    setOpenMenu(null)
    setTypeError(null)
    setTypeDraft(emptyPayTypeDraft())
    setTypeEditor(kind)
  }

  function applySavedType(item: SavedPayType) {
    setOpenMenu(null)
    if (item.kind === 'addition') {
      setCustomAdditions((current) => {
        const next = current.some((row) => row.name === item.name)
          ? current
          : [...current, { name: item.name, amount: item.amount }]
        void persistPayLines(extraPay, next)
        return next
      })
      return
    }
    addDeduction(item.name, item.amount)
  }

  function savePayTypeForm() {
    const name = typeDraft.name.trim()
    if (!name) {
      setTypeError('Enter a name for this type.')
      return
    }
    const amount = typeDraft.amount.trim() || '0.00'
    if (typeEditor === 'addition') {
      setCustomAdditions((current) => {
        const next = current.some((row) => row.name === name)
          ? current.map((row) => (row.name === name ? { ...row, amount } : row))
          : [...current, { name, amount }]
        void persistPayLines(extraPay, next)
        return next
      })
    } else if (typeEditor === 'deduction') {
      addDeduction(name, amount)
    }
    if (typeDraft.reuse === 'remember' && companyId && typeEditor) {
      setSavedTypes(rememberPayType(companyId, typeEditor, { ...typeDraft, name, amount }))
    }
    setTypeEditor(null)
    setTypeError(null)
  }

  async function saveAddition(label: string, value: string) {
    const item = ADDITION_ITEMS.find((entry) => entry.label === label)
    if (!item?.field) {
      await persistPayLines(extraPay, customAdditions, visibleAdditions, {
        ...additionAmounts,
        [label]: value,
      })
      return
    }
    await patchRecord({ [item.field]: value === '' ? 0 : Number(value) })
  }

  if (runQuery.isLoading || recordQuery.isLoading) return <Loading />
  if (!record) return <Alert>Payslip not found</Alert>

  const displayName = name === '—' ? 'Employee Name' : name
  const displayedPay =
    payTotal || Number(record.basic_pay ?? 0)
      ? (payTotal || Number(record.basic_pay ?? 0)).toFixed(2)
      : ''
  const backTo = payslipReturnPath(
    (location.state as { from?: unknown } | null)?.from,
    payrollListPathFromRun(run),
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">{displayName} Payslip</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          {displayName}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={toolbarBtn}
            disabled={recordFinalised || runFullyLocked}
            onClick={() => void markCurrentDone()}
          >
            <Check size={16} />
            Finalise
          </button>
          <button
            type="button"
            className={toolbarBtn}
            disabled={!recordFinalised && !runLocked}
            onClick={() => {
              if (recordFinalised && !runFullyLocked) {
                void act(async () => {
                  const result = await payrollApi.reopenRecord(companyId!, runId, recordId)
                  await queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
                  return result
                })
                return
              }
              navigate(`/payroll/runs/${runId}/reopen?recordId=${recordId}`)
            }}
          >
            <RefreshCw size={16} />
            Reopen
          </button>
          <CreateSendMenu
            companyId={companyId!}
            runId={runId}
            recordId={recordId}
            payslipReady={recordFinalised}
            onMessage={setMessage}
            onError={setError}
          />
          <button
            type="button"
            className={toolbarBtn}
            disabled={recordFinalised || runFullyLocked}
            onClick={() => void markCurrentDone()}
          >
            <CircleCheck size={16} />
            Mark as done
          </button>
          <PayrollSchedulesMenu />
          <PayrollMoreMenu
            runId={runId}
            recordId={recordId}
            onUnavailable={setError}
            extras={
              <>
                <button
                  type="button"
                  className={payrollMoreMenuItem}
                  onClick={() => void saveInputs(undefined, false)}
                >
                  Save inputs
                </button>
                <button
                  type="button"
                  className={payrollMoreMenuItem}
                  onClick={() =>
                    void act(() => payrollApi.calculateRecord(companyId!, runId, recordId))
                  }
                >
                  Calculate payslip
                </button>
              </>
            }
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-end rounded-[16px] bg-white px-5 py-4">
        <PayslipPeriodSwitcher
          schedules={scheduleList}
          scheduleId={currentScheduleId}
          periodKey={currentPeriodKey}
          disabled={switchingPeriod}
          onScheduleChange={changeEmployeeSchedule}
          onPeriodChange={(nextPeriod) => void openEmployeePeriod(currentScheduleId, nextPeriod)}
        />
      </div>

      <div
        className={`mt-6 grid min-h-0 gap-4 ${
          typeEditor ? 'xl:grid-cols-[276px_minmax(0,1fr)]' : 'xl:grid-cols-[276px_minmax(0,1fr)_358px]'
        }`}
      >
        <aside className="h-[min(798px,calc(100vh-16rem))] overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <div className="h-full overflow-y-auto">
            {sidebarRecords.map((item, index) => {
              const selected = idOf(item) === recordId
              const itemName = fullName(item.employees?.first_name, item.employees?.last_name)
              return (
                <Link
                  key={idOf(item)}
                  to={`/payroll/runs/${runId}/records/${idOf(item)}`}
                  state={{ from: backTo }}
                  className={`flex h-[39px] items-center gap-3 border-b border-[#d9d9d9] px-4 text-xs font-medium ${
                    selected ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
                  } ${index === 0 ? 'rounded-t-[10px]' : ''}`}
                >
                  <BrandIcon
                    src={iconPerson}
                    alt=""
                    className="size-4"
                    tone={selected ? 'navy' : 'light'}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {itemName === '—' ? 'Employee Name' : itemName}
                  </span>
                  {(item.status ?? '').toUpperCase() === 'FINALISED' ? (
                    <Check
                      size={12}
                      className={selected ? 'text-white' : 'text-navy'}
                    />
                  ) : item.is_starter || item.is_leaver ? (
                    <Flag
                      size={12}
                      className={selected ? 'fill-white text-white' : 'fill-navy text-navy'}
                    />
                  ) : null}
                </Link>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <h2 className="text-2xl font-semibold text-navy">
            {run?.pay_date
              ? `${hmrcPeriodLabel(run.pay_frequency, {
                  number: Number(run.tax_week ?? run.tax_month ?? 0),
                  taxWeek: run.tax_week ?? null,
                  taxMonth: run.tax_month ?? null,
                  payDate: parseDateKey(String(run.pay_date).slice(0, 10)),
                })} · `
              : ''}
            {formatPeriodRange(run?.period_start_date, run?.period_end_date)}
          </h2>

          {typeEditor ? (
            <PayTypeEditor
              kind={typeEditor}
              draft={typeDraft}
              onChange={setTypeDraft}
              onCancel={() => {
                setTypeEditor(null)
                setTypeError(null)
              }}
              onSave={savePayTypeForm}
              locked={locked}
              error={typeError}
            />
          ) : (
            <>
          <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
            <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-navy">
              <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                <Wallet size={18} />
              </span>
              Pay and Benefits
            </h3>
            <div className="space-y-3">
              {showHourlyPay ? (
                <PayRow
                  qty={hours}
                  qtySuffix="hours"
                  rate={rate}
                  rateOptions={rateOptions}
                  rateUnit="per hour"
                  total={displayedPay}
                  locked={locked}
                  onRemove={
                    locked
                      ? undefined
                      : () => {
                          hourlyAddedRef.current = false
                          setShowHourlyPay(false)
                          setHours('')
                          setExtraPay((current) =>
                            current.some((line) => line.kind === 'monthly')
                              ? current
                              : [emptyMonthlyPay(), ...current],
                          )
                          void patchRecord({ total_hours: 0 })
                        }
                  }
                  onQtyChange={(value) => {
                    setHours(value)
                    queueCalculate()
                  }}
                  onQtyBlur={() => {
                    window.clearTimeout(calcTimer.current)
                    void persistAndCalculate()
                  }}
                  onRateChange={(value) => {
                    setRate(value)
                    queueCalculate()
                  }}
                />
              ) : null}
              {extraPay.map((line) => {
                const amountOnly = line.kind === 'benefit' || line.kind === 'monthly'
                return (
                <PayRow
                  key={line.id}
                  qty={amountOnly ? '' : line.qty}
                  qtySuffix={line.kind === 'daily' ? 'days' : ''}
                  hideQty={amountOnly}
                  rate={amountOnly ? '' : line.rate}
                  rateOptions={
                    line.kind === 'daily'
                      ? [...new Set([line.rate, ...dailyRateOptions].filter(Boolean))]
                      : [...new Set([line.rate, ...rateOptions].filter(Boolean))]
                  }
                  rateUnit={line.kind === 'daily' ? 'per day' : ''}
                  hideRate={amountOnly}
                  label={
                    line.kind === 'monthly'
                      ? line.label || periodPayLabel(run?.pay_frequency)
                      : line.kind === 'benefit'
                        ? 'Payrolled benefit'
                        : ''
                  }
                  total={
                    amountOnly
                      ? line.amount
                      : line.qty === '' || line.rate === ''
                        ? ''
                        : (Number(line.qty || 0) * Number(line.rate || 0)).toFixed(2)
                  }
                  totalEditable={amountOnly}
                  locked={locked}
                  onRemove={
                    locked
                      ? undefined
                      : () => {
                          const next = extraPay.filter((item) => item.id !== line.id)
                          setExtraPay(next)
                          void persistPayLines(next)
                        }
                  }
                  onQtyChange={(value) => {
                    setExtraPay((current) =>
                      current.map((item) => (item.id === line.id ? { ...item, qty: value } : item)),
                    )
                    queueCalculate()
                  }}
                  onQtyBlur={() => {
                    window.clearTimeout(calcTimer.current)
                    void persistAndCalculate()
                  }}
                  onRateChange={(value) => {
                    setExtraPay((current) =>
                      current.map((item) => (item.id === line.id ? { ...item, rate: value } : item)),
                    )
                    queueCalculate()
                  }}
                  onTotalChange={(value) => {
                    setExtraPay((current) =>
                      current.map((item) => (item.id === line.id ? { ...item, amount: value } : item)),
                    )
                    queueCalculate()
                  }}
                  onTotalBlur={() => {
                    window.clearTimeout(calcTimer.current)
                    void persistAndCalculate()
                  }}
                />
                )
              })}
            </div>
            <PortalMenu
              open={openMenu === 'pay'}
              width={280}
              trigger={<AddToggle open={openMenu === 'pay'} onClick={() => toggleMenu('pay')} />}
            >
              {payBenefitItems(run?.pay_frequency).map((item) => (
                <div key={item.id}>
                  {'divideBefore' in item && item.divideBefore ? <MenuDivider /> : null}
                  <MenuItem onClick={() => addPayLine(item.id)}>{item.label}</MenuItem>
                </div>
              ))}
            </PortalMenu>
          </section>

          <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
            <h3 className="mb-3 flex items-center gap-3 text-xl font-semibold text-navy">
              <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                <Scale size={18} />
              </span>
              Statutory Pay
            </h3>
            {statutoryItems.length === 0 ? (
              <p className="text-xs font-medium text-[#607080] underline">(None)</p>
            ) : (
              <div className="space-y-1 text-sm text-navy">
                {statutoryItems.map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="tabular-nums">{money(value)}</span>
                  </div>
                ))}
              </div>
            )}
            {Number(leaveSummary.awe ?? 0) > 0 ? (
              <p className="mt-3 text-[11px] leading-relaxed text-[#607080]">
                Calculated from HMRC {String(leaveSummary.tax_year ?? '2026/27')} rates using average weekly
                earnings of {money(leaveSummary.awe)}. SSP is the lower of 80% of AWE and the weekly flat
                rate. SMP is 90% of AWE for 6 weeks, then the lower of the HMRC standard rate and 90% of
                AWE. SPP is the lower of the HMRC standard rate and 90% of AWE.
              </p>
            ) : null}
          </section>

          <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
            <h3 className="mb-3 flex items-center gap-3 text-xl font-semibold text-navy">
              <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                <CalendarDays size={18} />
              </span>
              Calendar leave this period
            </h3>
            {leaveLines.length === 0 ? (
              <p className="text-xs font-medium text-[#607080]">No calendar leave in this pay period.</p>
            ) : (
              <div className="space-y-2 text-sm text-navy">
                {leaveLines.map(([label, days, amount, hint]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span>
                      {label}
                      <span className="mt-0.5 block text-[11px] font-medium text-[#607080]">
                        {days} day{Number(days) === 1 ? '' : 's'}
                        {hint ? ` · ${hint}` : ''}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold">{money(amount)}</span>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#d9d9d9] pt-3">
                  <span className="font-semibold">
                    Leave deduction
                    {leaveSummary.manual ? (
                      <span className="ml-2 text-[11px] font-medium text-[#607080]">(edited)</span>
                    ) : null}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={locked}
                    className={`${inputClass} w-[110px] text-right tabular-nums`}
                    value={leaveAmount}
                    onChange={(event) => {
                      setLeaveAmount(event.target.value)
                      queueCalculate()
                    }}
                    onBlur={() => {
                      const next = Number(leaveAmount)
                      if (Number.isNaN(next) || next < 0) {
                        setLeaveAmount(moneyInput(record?.unpaid_leave_deduction))
                        return
                      }
                      window.clearTimeout(calcTimer.current)
                      void persistAndCalculate()
                    }}
                  />
                </div>
                {Number(leaveSummary.daily_rate ?? 0) > 0 ? (
                  <p className="text-[11px] text-[#607080]">
                    Daily rate used: {money(leaveSummary.daily_rate)}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
            <h3 className="mb-3 flex items-center gap-3 text-xl font-semibold text-navy">
              <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                <Plus size={16} />
              </span>
              Additions and Deductions
            </h3>
            {pensionEnrolled ? (
              <PayLineGroup title="Pension" tone="pension">
                <p className="text-xs font-medium text-navy">
                  {str(pension.provider_name) || `${companyName} (NEST)`}
                </p>
                <div className="space-y-2">
                  {[
                    ['Employee contribution', ratePercent(pension.employee_rate, 5)],
                    ['Employer contribution', ratePercent(pension.employer_rate, 3)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-xs text-navy">
                      <span>{label}</span>
                      <div className="flex">
                        <span className="flex h-[25px] items-center rounded-l-[6px] border-[0.5px] border-r-0 border-[#d9d9d9] bg-white px-2">
                          %
                        </span>
                        <span className="flex h-[25px] min-w-[68px] items-center justify-end rounded-r-[6px] border-[0.5px] border-[#d9d9d9] bg-white px-3 tabular-nums">
                          {Number(value).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {Number(record?.employee_pension ?? 0) === 0 &&
                Number(record?.employer_pension ?? 0) === 0 ? (
                  <p className="text-[11px] text-[#607080]">
                    Pension is £0 this period because earnings are not above the trigger (£192 a week / £768 every four
                    weeks / £833 a month / £10,000 a year). When they are, 5% employee and 3% employer apply to
                    qualifying earnings between the lower and upper limits.
                  </p>
                ) : null}
              </PayLineGroup>
            ) : (
              <PayLineGroup title="Pension" tone="pension">
                <p className="text-xs text-[#607080]">
                  Not enrolled — Employee Pension, Employer Pension and pensionable gross are not calculated on this
                  payslip.
                </p>
              </PayLineGroup>
            )}
            {customAdditions.length > 0 || visibleAdditions.length > 0 ? (
              <PayLineGroup title="Additions" tone="addition">
                {customAdditions.map((row) => (
                  <AmountRow
                    key={row.name}
                    label={row.name}
                    value={row.amount}
                    locked={locked}
                    tone="addition"
                    onChange={(value) => {
                      setCustomAdditions((current) =>
                        current.map((item) => (item.name === row.name ? { ...item, amount: value } : item)),
                      )
                      queueCalculate()
                    }}
                    onBlur={(value) => {
                      setCustomAdditions((current) =>
                        current.map((item) => (item.name === row.name ? { ...item, amount: value } : item)),
                      )
                      window.clearTimeout(calcTimer.current)
                      void persistAndCalculate()
                    }}
                  />
                ))}
                {visibleAdditions.map((label) => (
                  <AmountRow
                    key={label}
                    label={label}
                    value={additionAmounts[label] ?? '0.00'}
                    locked={locked}
                    tone="addition"
                    onChange={(value) => {
                      setAdditionAmounts((current) => ({ ...current, [label]: value }))
                      queueCalculate()
                    }}
                    onBlur={(value) => {
                      setAdditionAmounts((current) => ({ ...current, [label]: value }))
                      window.clearTimeout(calcTimer.current)
                      void persistAndCalculate()
                    }}
                  />
                ))}
              </PayLineGroup>
            ) : null}
            {visibleDeductions.length > 0 ? (
              <PayLineGroup title="Deductions" tone="deduction">
                {visibleDeductions.map((label) => (
                  <AmountRow
                    key={label}
                    label={label}
                    value={deductionAmounts[label] ?? '0.00'}
                    locked={locked}
                    tone="deduction"
                    onChange={(value) => {
                      setDeductionAmounts((current) => ({ ...current, [label]: value }))
                      queueCalculate()
                    }}
                    onBlur={(value) => {
                      setDeductionAmounts((current) => ({ ...current, [label]: value }))
                      window.clearTimeout(calcTimer.current)
                      void persistAndCalculate()
                    }}
                  />
                ))}
              </PayLineGroup>
            ) : null}
            <PortalMenu
              open={openMenu === 'additions'}
              width={430}
              preferUp
              className="grid grid-cols-2 divide-x divide-[#d9d9d9]"
              trigger={
                <AddToggle open={openMenu === 'additions'} onClick={() => toggleMenu('additions')} />
              }
            >
                  <div className="py-1">
                    {ADDITION_ITEMS.map((item) => (
                      <MenuItem
                        key={item.label}
                        icon={<ArrowIcon />}
                        onClick={() => addAddition(item.label)}
                      >
                        {item.label}
                      </MenuItem>
                    ))}
                    {savedTypes
                      .filter((item) => item.kind === 'addition')
                      .map((item) => (
                        <MenuItem
                          key={item.id}
                          icon={<ArrowIcon />}
                          onClick={() => applySavedType(item)}
                        >
                          {item.name}
                        </MenuItem>
                      ))}
                    <MenuItem
                      tone="blue"
                      onClick={() => openTypeEditor('addition')}
                    >
                      New addition type..
                    </MenuItem>
                  </div>
                  <div className="py-1">
                    {DEDUCTION_ITEMS.map((label) => (
                      <MenuItem key={label} icon={<ArrowIcon />} onClick={() => addDeduction(label)}>
                        {label}
                      </MenuItem>
                    ))}
                    {savedTypes
                      .filter((item) => item.kind === 'deduction')
                      .map((item) => (
                        <MenuItem
                          key={item.id}
                          icon={<ArrowIcon />}
                          onClick={() => applySavedType(item)}
                        >
                          {item.name}
                        </MenuItem>
                      ))}
                    <MenuItem tone="blue" onClick={() => openTypeEditor('deduction')}>
                      New deduction type...
                    </MenuItem>
                    <MenuDivider />
                    {DEDUCTION_LINKS.map((label) => (
                      <MenuItem
                        key={label}
                        tone="blue"
                        onClick={() => {
                          setOpenMenu(null)
                          if (label.startsWith('Automatic')) {
                            navigate(`/employees/${record.employee_id}`)
                            return
                          }
                          setError(`${label.replace(/\.\.\.$/, '')} is not available on this payslip yet.`)
                        }}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </div>
            </PortalMenu>
          </section>

          <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
            <h3 className="mb-3 flex items-center gap-3 text-xl font-semibold text-navy">
              <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                <Pencil size={16} />
              </span>
              Notes
            </h3>
            <div className="space-y-3">
              {showEmployeeNotes ? (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">
                    Note for employee (appears on payslip)
                  </span>
                  <textarea
                    className={`${inputClass} h-20 w-full py-2`}
                    value={employeeNotes}
                    disabled={locked}
                    onChange={(event) => setEmployeeNotes(event.target.value)}
                    onBlur={() => void saveInputs()}
                  />
                </label>
              ) : null}
              {showEmployerNotes ? (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">
                    Note for employer (does not appear on payslip)
                  </span>
                  <textarea
                    className={`${inputClass} h-20 w-full py-2`}
                    value={employerNotes}
                    disabled={locked}
                    onChange={(event) => setEmployerNotes(event.target.value)}
                    onBlur={() => void saveInputs()}
                  />
                </label>
              ) : null}
            </div>
            {showEmployeeNotes && showEmployerNotes ? null : (
            <PortalMenu
              open={openMenu === 'notes'}
              width={280}
              trigger={<AddToggle open={openMenu === 'notes'} onClick={() => toggleMenu('notes')} />}
            >
                  {showEmployeeNotes ? null : (
                    <MenuItem
                      icon={<User size={14} className="shrink-0" />}
                      onClick={() => {
                        setShowEmployeeNotes(true)
                        setOpenMenu(null)
                      }}
                    >
                      Note for employee (appears on payslip)
                    </MenuItem>
                  )}
                  {showEmployerNotes ? null : (
                    <MenuItem
                      icon={<UserX size={14} className="shrink-0" />}
                      onClick={() => {
                        setShowEmployerNotes(true)
                        setOpenMenu(null)
                      }}
                    >
                      Note for employer (does not appear on payslip)
                    </MenuItem>
                  )}
            </PortalMenu>
            )}
          </section>
            </>
          )}
        </div>

        {typeEditor ? null : (
        <aside className="overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <div
            className={`flex gap-3 px-5 py-4 text-[13px] leading-[18px] text-white ${
              locked ? 'bg-[#4289e4]' : 'bg-navy-mid'
            }`}
          >
            <CircleCheck size={18} className="mt-0.5 shrink-0" />
            <p>
              {locked ? (
                <>
                  This payslip has been finalised with a pay date of{' '}
                  <span className="font-semibold">{formatLongDate(record.pay_date ?? run?.pay_date)}.</span>
                </>
              ) : (
                <>
                  {calculating ? 'Updating calculation for pay date ' : 'Draft payslip for pay date '}
                  <span className="font-semibold">{formatLongDate(record.pay_date ?? run?.pay_date)}.</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 px-5 py-4 text-xs text-navy">
            <div className="min-w-0 flex-1 space-y-2">
            {[
              ['Tax code', formatTaxCodeWithBasis(
                recordFinalised
                  ? str(record.tax_code) || str(tax.tax_code)
                  : str(tax.tax_code) || str(record.tax_code),
                recordFinalised
                  ? record.week1month1 ?? tax.week1month1
                  : tax.week1month1 ?? record.week1month1,
                run?.pay_frequency,
              )],
              ['NI category', str(record.ni_category) || str(tax.ni_category) || '—'],
              ['Department', str(employment.department) || companyName],
              ['Pay method', hasBank ? 'Credit Transfer' : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="font-medium">{label}</span>
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
            </div>
            <Link
              to={`/employees/${record.employee_id}`}
              className="inline-flex h-[52px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[8px] border-[0.5px] border-navy bg-white text-[10px] font-medium leading-tight text-navy hover:bg-cream"
            >
              <Pencil size={14} className="mb-1" />
              Edit Settings
            </Link>
          </div>
          <div className="px-5">
            <div className="flex rounded-[10px] bg-[#f0f5fe] p-0.5">
              <button
                type="button"
                className={`h-[34px] flex-1 rounded-[10px] text-xs font-semibold text-navy ${
                  periodTab === 'period' ? 'bg-white' : ''
                }`}
                onClick={() => setPeriodTab('period')}
              >
                This Period
              </button>
              <button
                type="button"
                className={`h-[34px] flex-1 rounded-[10px] text-xs font-semibold text-navy ${
                  periodTab === 'ytd' ? 'bg-white' : ''
                }`}
                onClick={() => setPeriodTab('ytd')}
              >
                Year to Date
              </button>
            </div>
          </div>
          {periodTab === 'ytd' ? (
            <div className="mt-2 px-5 pb-4">
              {ytdSections.map((section) => (
                <YtdSection
                  key={section.id}
                  title={section.title}
                  open={ytdOpen[section.id]}
                  groups={section.groups}
                  onToggle={() =>
                    setYtdOpen((current) => ({
                      ...current,
                      [section.id]: !current[section.id],
                    }))
                  }
                />
              ))}
            </div>
          ) : (
          <div className="mt-4 space-y-0 px-5 pb-5 text-xs text-navy">
            {summaryRows.map(([label, value], index) => (
              <div
                key={label}
                className={`flex justify-between gap-3 py-2 ${
                  index < summaryRows.length - 1 ? 'border-b border-[#d9d9d9]' : ''
                }`}
              >
                <span>{label}</span>
                <span className="font-medium tabular-nums">
                  {value == null || value === '' ? '—' : money(value)}
                </span>
              </div>
            ))}
          </div>
          )}
        </aside>
        )}
      </div>
      {ratePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4">
          <form
            className="w-full max-w-[400px] rounded-[16px] bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault()
              confirmRatePrompt()
            }}
          >
            <h3 className="text-lg font-semibold text-navy">
              {ratePrompt.kind === 'hourly' ? 'Enter hourly rate' : 'Enter daily rate'}
            </h3>
            <p className="mt-1 text-sm text-muted">
              This employee has no {ratePrompt.kind === 'hourly' ? 'hourly' : 'daily'} rate in Payment
              information. Enter it once and it will be saved on their employee record for future
              payrolls.
            </p>
            {employeeId ? (
              <Link
                to={`/employees/${employeeId}?tab=Payment`}
                className="mt-2 inline-block text-sm font-medium text-[#4289e4] underline"
                onClick={() => setRatePrompt(null)}
              >
                Open payment information
              </Link>
            ) : null}
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium text-navy">
                {ratePrompt.kind === 'hourly' ? 'Rate per hour' : 'Rate per day'}
              </span>
              <div className="flex">
                <span className="flex h-[35px] items-center rounded-l-[6px] border-[0.5px] border-r-0 border-[#d9d9d9] bg-white px-3 text-sm text-navy">
                  £
                </span>
                <input
                  autoFocus
                  className={`${inputClass} min-w-0 flex-1 rounded-l-none`}
                  value={ratePrompt.value}
                  placeholder="0.00"
                  inputMode="decimal"
                  onChange={(event) =>
                    setRatePrompt((current) =>
                      current ? { ...current, value: event.target.value } : current,
                    )
                  }
                />
              </div>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRatePrompt(null)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function YtdSection({
  title,
  open,
  groups,
  onToggle,
}: {
  title: string
  open: boolean
  groups: Array<Array<readonly [string, unknown]>>
  onToggle: () => void
}) {
  return (
    <section className="border-b border-[#e6e4df] last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-navy"
        onClick={onToggle}
        aria-expanded={open}
      >
        <ChevronDown
          size={14}
          className={`shrink-0 text-navy transition-transform ${open ? '' : '-rotate-90'}`}
        />
        {title}
      </button>
      {open ? (
        <div className="pb-3">
          {groups.map((rows, index) => (
            <div
              key={rows.map(([label]) => label).join('-')}
              className={`space-y-1 py-2 ${
                index < groups.length - 1 ? 'border-b border-[#d9d9d9]' : ''
              }`}
            >
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-xs text-navy">
                  <span className="italic text-navy/80">{label}</span>
                  <span className="font-semibold tabular-nums">{money(value)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function PayRow({
  qty,
  qtySuffix,
  hideQty,
  rate,
  rateOptions,
  rateUnit,
  hideRate,
  label,
  total,
  totalEditable,
  locked,
  onQtyChange,
  onQtyBlur,
  onRateChange,
  onTotalChange,
  onTotalBlur,
  onRemove,
}: {
  qty: string
  qtySuffix: string
  hideQty?: boolean
  rate: string
  rateOptions: string[]
  rateUnit: string
  hideRate?: boolean
  label?: string
  total: string
  totalEditable?: boolean
  locked: boolean
  onQtyChange?: (value: string) => void
  onQtyBlur?: () => void
  onRateChange?: (value: string) => void
  onTotalChange?: (value: string) => void
  onTotalBlur?: () => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
          type="button"
          className="flex size-[35px] shrink-0 items-center justify-center rounded-[6px] border-[0.5px] border-[#d9d9d9] bg-white text-lg leading-none text-navy hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onRemove}
          disabled={locked || !onRemove}
          aria-label="Remove pay line"
        >
          −
        </button>
      {label ? <span className="shrink-0 text-xs font-medium text-navy">{label}</span> : null}
      {hideQty ? null : (
        <div className="flex w-[138px]">
          <input
            className={`${inputClass} min-w-0 flex-1 rounded-r-none`}
            value={qty}
            placeholder=""
            disabled={locked}
            onChange={(event) => onQtyChange?.(event.target.value)}
            onBlur={onQtyBlur}
          />
          <span className="flex h-[35px] items-center rounded-r-[6px] border-[0.5px] border-l-0 border-[#d9d9d9] bg-[#f8f7f4] px-3 text-xs text-navy">
            {qtySuffix}
          </span>
        </div>
      )}
      {hideRate ? null : (
        <>
          <span className="text-xs text-navy">at</span>
          <select
            className={`${inputClass} min-w-[150px] text-[#718daa] underline`}
            value={rate === '' ? '' : Number(rate || 0).toFixed(2)}
            disabled={locked}
            onChange={(event) => onRateChange?.(event.target.value)}
          >
            <option value="">Select rate</option>
            {rateOptions.map((option) => (
              <option key={option} value={option}>
                {formatRate(Number(option), rateUnit)}
              </option>
            ))}
          </select>
        </>
      )}
      <div className="ml-auto flex w-[138px]">
        <span className="flex h-[35px] items-center rounded-l-[6px] border-[0.5px] border-r-0 border-[#d9d9d9] bg-white px-2 text-xs text-navy">
          £
        </span>
        <input
          readOnly={!totalEditable}
          className={`${inputClass} min-w-0 flex-1 rounded-l-none ${totalEditable ? 'bg-white' : 'bg-[#f8f7f4]'}`}
          value={total}
          placeholder=""
          disabled={locked}
          onChange={(event) => onTotalChange?.(event.target.value)}
          onBlur={onTotalBlur}
        />
      </div>
    </div>
  )
}

function PayLineGroup({
  title,
  tone,
  children,
}: {
  title: string
  tone: 'pension' | 'addition' | 'deduction'
  children: ReactNode
}) {
  const styles = {
    pension: 'border-[#d9d9d9] bg-[#f8f7f4]',
    addition: 'border-[#c5d4ea] bg-[#f0f5fe]',
    deduction: 'border-[#f0c7c9] bg-[#fdf6f6]',
  }
  const titles = {
    pension: 'text-navy',
    addition: 'text-navy',
    deduction: 'text-brand',
  }
  return (
    <div className={`mt-3 rounded-[8px] border px-3 py-3 ${styles[tone]}`}>
      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${titles[tone]}`}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function AmountRow({
  label,
  value,
  locked,
  tone = 'addition',
  onChange,
  onBlur,
}: {
  label: string
  value: string
  locked: boolean
  tone?: 'addition' | 'deduction'
  onChange: (value: string) => void
  onBlur?: (value: string) => void
}) {
  const deduction = tone === 'deduction'
  return (
    <div className={`flex items-center justify-between gap-3 text-xs ${deduction ? 'text-brand' : 'text-navy'}`}>
      <span className="min-w-0 truncate">{label}</span>
      <div className="flex shrink-0">
        <span
          className={`flex h-[25px] items-center rounded-l-[6px] border-[0.5px] border-r-0 px-2 ${
            deduction ? 'border-[#f0c7c9] bg-white' : 'border-[#c5d4ea] bg-white'
          }`}
        >
          {deduction ? '−£' : '+£'}
        </span>
        <input
          className={`h-[25px] w-[72px] rounded-r-[6px] border-[0.5px] bg-white px-2 text-right tabular-nums outline-none ${
            deduction ? 'border-[#f0c7c9]' : 'border-[#c5d4ea]'
          }`}
          value={value}
          disabled={locked}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur?.(event.target.value)}
        />
      </div>
    </div>
  )
}
