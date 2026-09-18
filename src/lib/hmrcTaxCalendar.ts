/** UK tax year: 6 April – 5 April. Tax weeks are 7-day blocks from 6 April. */

export function taxYearStartFromDate(date: Date): number {
  return date.getMonth() > 3 || (date.getMonth() === 3 && date.getDate() >= 6)
    ? date.getFullYear()
    : date.getFullYear() - 1
}

export function taxYearStartDate(taxYear: number): Date {
  return new Date(taxYear, 3, 6)
}

export function taxYearEndDate(taxYear: number): Date {
  return new Date(taxYear + 1, 3, 5)
}

function calendarDaysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end - start) / 86_400_000)
}

/** 53 in every tax year: weeks 1–52 are 7 days; week 53 is 5 April, or 4–5 April when the year includes 29 February. */
export function weeksInTaxYear(taxYear: number): number {
  const days = calendarDaysBetween(taxYearStartDate(taxYear), taxYearEndDate(taxYear)) + 1
  return Math.ceil(days / 7)
}

export function taxWeekStartDate(taxYear: number, week: number): Date {
  const date = taxYearStartDate(taxYear)
  date.setDate(date.getDate() + (week - 1) * 7)
  return date
}

export function taxWeekEndDate(taxYear: number, week: number): Date {
  const last = taxYearEndDate(taxYear)
  if (week >= weeksInTaxYear(taxYear)) return last
  const start = taxWeekStartDate(taxYear, week)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end > last ? last : end
}

export function taxWeekFromDate(date: Date): number {
  const taxYear = taxYearStartFromDate(date)
  const week = Math.floor(calendarDaysBetween(taxYearStartDate(taxYear), date) / 7) + 1
  return Math.min(weeksInTaxYear(taxYear), Math.max(1, week))
}

export function taxMonthFromDate(date: Date): number {
  let month = date.getMonth()
  if (date.getDate() < 6) month = month === 0 ? 11 : month - 1
  return ((month - 3 + 12) % 12) + 1
}

export function taxMonthStartDate(taxYear: number, taxMonth: number): Date {
  const start = taxYearStartDate(taxYear)
  start.setMonth(start.getMonth() + (taxMonth - 1))
  return start
}

export function taxMonthEndDate(taxYear: number, taxMonth: number): Date {
  const start = taxMonthStartDate(taxYear, taxMonth)
  return new Date(start.getFullYear(), start.getMonth() + 1, 5)
}

export function taxYearLabel(taxYear: number) {
  return `${taxYear}/${String(taxYear + 1).slice(-2)}`
}
