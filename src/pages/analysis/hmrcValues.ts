import type { PayrollRecord, PayrollRun } from '../../types'
import { taxMonthFromDate, taxWeekEndDate } from '../../lib/hmrcTaxCalendar'
import type { HmrcPeriod } from './hmrcPeriods'

function num(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isNaN(amount) ? 0 : amount
}

export type HmrcAmounts = {
  gross_tax: number
  tax_refund: number
  gross_cis: number
  cis_suffered: number
  student_loan: number
  pgl: number
  sl_pgl: number
  net_tax: number
  ee_nic: number
  er_nic: number
  gross_nic: number
  smp_rec: number
  nic_comp_smp: number
  spp_rec: number
  nic_comp_spp: number
  sap_rec: number
  nic_comp_sap: number
  shpp_rec: number
  nic_comp_shpp: number
  spbp_rec: number
  nic_comp_spbp: number
  sncp_rec: number
  nic_comp_sncp: number
  statutory_aid: number
  emp_allowance: number
  app_levy: number
  nic_deductions: number
  net_nics: number
  shortfall: number
  manual_adj: number
  net_adj: number
  amount_due: number
  amount_paid: number
  balance: number
}

const ZERO: HmrcAmounts = {
  gross_tax: 0,
  tax_refund: 0,
  gross_cis: 0,
  cis_suffered: 0,
  student_loan: 0,
  pgl: 0,
  sl_pgl: 0,
  net_tax: 0,
  ee_nic: 0,
  er_nic: 0,
  gross_nic: 0,
  smp_rec: 0,
  nic_comp_smp: 0,
  spp_rec: 0,
  nic_comp_spp: 0,
  sap_rec: 0,
  nic_comp_sap: 0,
  shpp_rec: 0,
  nic_comp_shpp: 0,
  spbp_rec: 0,
  nic_comp_spbp: 0,
  sncp_rec: 0,
  nic_comp_sncp: 0,
  statutory_aid: 0,
  emp_allowance: 0,
  app_levy: 0,
  nic_deductions: 0,
  net_nics: 0,
  shortfall: 0,
  manual_adj: 0,
  net_adj: 0,
  amount_due: 0,
  amount_paid: 0,
  balance: 0,
}

export type HmrcRow = {
  period: HmrcPeriod
  amounts: HmrcAmounts
  ytd: HmrcAmounts
  hasData: boolean
}

export function hmrcNumber(value: number) {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function fromRecords(records: PayrollRecord[]): HmrcAmounts {
  const next = { ...ZERO }
  for (const record of records) {
    next.gross_tax += num(record.tax)
    next.student_loan += num(record.student_loan)
    next.pgl += num(record.postgraduate_loan)
    next.ee_nic += num(record.employee_nic)
    next.er_nic += num(record.employer_nic)
    next.smp_rec += num(record.smp)
    next.spp_rec += num(record.spp)
    next.sap_rec += num(record.sap)
    next.shpp_rec += num(record.shpp)
    next.spbp_rec += num(record.spbp)
    next.sncp_rec += num(record.sncp)
  }
  next.sl_pgl = next.student_loan + next.pgl
  next.net_tax = next.gross_tax - next.tax_refund - next.cis_suffered + next.sl_pgl
  next.gross_nic = next.ee_nic + next.er_nic
  next.nic_deductions =
    next.smp_rec +
    next.nic_comp_smp +
    next.spp_rec +
    next.nic_comp_spp +
    next.sap_rec +
    next.nic_comp_sap +
    next.shpp_rec +
    next.nic_comp_shpp +
    next.spbp_rec +
    next.nic_comp_spbp +
    next.sncp_rec +
    next.nic_comp_sncp +
    next.statutory_aid +
    next.emp_allowance +
    next.app_levy
  next.net_nics = next.gross_nic - next.nic_deductions
  return next
}

function addAmounts(left: HmrcAmounts, right: HmrcAmounts): HmrcAmounts {
  const next = { ...ZERO }
  for (const key of Object.keys(ZERO) as (keyof HmrcAmounts)[]) {
    next[key] = left[key] + right[key]
  }
  return next
}

export function taxMonthOf(record: PayrollRecord, run: PayrollRun) {
  if (record.tax_month != null) return Number(record.tax_month)
  if (run.tax_month != null) return Number(run.tax_month)
  const week = Number(record.tax_week ?? run.tax_week ?? 1)
  return taxMonthFromDate(taxWeekEndDate(Number(run.tax_year_start), week))
}

export function buildHmrcRows(
  periods: HmrcPeriod[],
  runs: { run: PayrollRun; records: PayrollRecord[] }[],
): HmrcRow[] {
  const sorted = [...periods].sort(
    (a, b) => a.taxYear - b.taxYear || a.endMonth - b.endMonth,
  )
  const rows: HmrcRow[] = []
  let ytd = { ...ZERO }
  let previousBalance = 0
  let currentYear = sorted[0]?.taxYear

  for (const period of sorted) {
    if (period.taxYear !== currentYear) {
      ytd = { ...ZERO }
      currentYear = period.taxYear
    }
    const records = runs.flatMap(({ run, records: items }) => {
      if (Number(run.tax_year_start) !== period.taxYear) return []
      return items.filter((record) => {
        const month = taxMonthOf(record, run)
        return month >= period.startMonth && month <= period.endMonth
      })
    })
    const periodAmounts = fromRecords(records)
    periodAmounts.shortfall = previousBalance
    periodAmounts.amount_due =
      periodAmounts.net_tax + periodAmounts.net_nics + periodAmounts.shortfall + periodAmounts.net_adj
    periodAmounts.balance = periodAmounts.amount_due - periodAmounts.amount_paid
    ytd = addAmounts(ytd, periodAmounts)
    ytd.shortfall = periodAmounts.shortfall
    ytd.amount_due = ytd.net_tax + ytd.net_nics + periodAmounts.shortfall + ytd.net_adj
    ytd.balance = ytd.amount_due - ytd.amount_paid
    previousBalance = periodAmounts.balance
    rows.push({
      period,
      amounts: periodAmounts,
      ytd,
      hasData: records.length > 0,
    })
  }
  return rows
}

const TEXT_FIELDS = new Set(['tax_period_ending', 'tax_month_number', 'payment_date'])

export function hmrcCell(row: HmrcRow, fieldId: string): string {
  if (fieldId === 'tax_period_ending') {
    return row.period.endDate.toLocaleDateString('en-GB')
  }
  if (fieldId === 'tax_month_number') {
    return row.period.startMonth === row.period.endMonth
      ? String(row.period.endMonth)
      : `${row.period.startMonth}–${row.period.endMonth}`
  }
  if (fieldId === 'payment_date') return '—'
  const source = fieldId.startsWith('ytd_') ? row.ytd : row.amounts
  const key = (fieldId.startsWith('ytd_') ? fieldId.slice(4) : fieldId) as keyof HmrcAmounts
  if (key in source) return hmrcNumber(source[key])
  return '—'
}

export function hmrcTotalCell(rows: HmrcRow[], fieldId: string): string {
  if (!rows.length) return '—'
  if (fieldId === 'tax_period_ending') {
    return `Total (${rows.length} HMRC Payment${rows.length === 1 ? '' : 's'})`
  }
  if (TEXT_FIELDS.has(fieldId)) return '—'
  if (fieldId === 'balance' || fieldId === 'ytd_net_nics' || fieldId === 'shortfall') {
    if (fieldId === 'shortfall') return hmrcNumber(rows[0].amounts.shortfall)
    if (fieldId === 'balance') return hmrcNumber(rows[rows.length - 1].amounts.balance)
  }
  const sourceKey = fieldId.startsWith('ytd_') ? 'ytd' : 'amounts'
  const key = (fieldId.startsWith('ytd_') ? fieldId.slice(4) : fieldId) as keyof HmrcAmounts
  if (fieldId.startsWith('ytd_')) {
    const last = rows[rows.length - 1]
    if (key in last.ytd) return hmrcNumber(last.ytd[key])
    return '—'
  }
  if (!(key in ZERO)) return '—'
  const total = rows.reduce((sum, row) => sum + row[sourceKey][key], 0)
  if (key === 'amount_due') {
    return hmrcNumber(
      rows.reduce((sum, row) => sum + row.amounts.net_tax + row.amounts.net_nics, 0) +
        rows[0].amounts.shortfall,
    )
  }
  return hmrcNumber(total)
}
