import { formatLongDate } from '../../lib/format'
import { taxMonthEndDate, taxYearEndDate, taxYearLabel } from '../../lib/hmrcTaxCalendar'
import { HMRC_PERIOD_MODES, type HmrcSchedule } from './hmrcFields'

export type HmrcPeriod = {
  id: string
  taxYear: number
  startMonth: number
  endMonth: number
  label: string
  endDate: Date
}

export function hmrcYears(taxYear: number, periodMode: string) {
  if (periodMode === HMRC_PERIOD_MODES[1]) return [taxYear]
  return [taxYear - 2, taxYear - 1, taxYear]
}

export function generateHmrcPeriods(years: number[], schedule: HmrcSchedule): HmrcPeriod[] {
  return years.flatMap((taxYear) => {
    if (schedule === 'tax-year') {
      const endDate = taxYearEndDate(taxYear)
      return [
        {
          id: `${taxYear}-year`,
          taxYear,
          startMonth: 1,
          endMonth: 12,
          label: `Tax year ending ${formatLongDate(endDate)}`,
          endDate,
        },
      ]
    }
    return [1, 2, 3, 4].map((quarter) => {
      const endMonth = quarter * 3
      const endDate = taxMonthEndDate(taxYear, endMonth)
      return {
        id: `${taxYear}-q${quarter}`,
        taxYear,
        startMonth: endMonth - 2,
        endMonth,
        label: `Quarter Ending ${formatLongDate(endDate)}`,
        endDate,
      }
    })
  })
}

export function yearHeading(taxYear: number, schedule: HmrcSchedule, periods: HmrcPeriod[]) {
  const yearEnd = formatLongDate(taxYearEndDate(taxYear))
  if (schedule === 'tax-months' && periods.length) {
    const from = Math.min(...periods.map((period) => period.startMonth))
    const to = Math.max(...periods.map((period) => period.endMonth))
    return `Tax Months ${from} to ${to} Summary`
  }
  return `Tax Year ${taxYearLabel(taxYear)} Ending ${yearEnd}`
}

export function summaryHeading(years: number[]) {
  if (years.length === 0) return 'HMRC Payments Summary'
  if (years.length === 1) return `Tax Year ${taxYearLabel(years[0])} Summary`
  return `Tax Years ${taxYearLabel(years[0])} to ${taxYearLabel(years[years.length - 1])} Summary`
}
