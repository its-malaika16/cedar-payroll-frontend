/**
 * Minimum wage flagging, matching BrightPay and GOV.UK / HMRC.
 * Profiles only change the rate hourly pay is checked against.
 * Statutory rates change on 1 April. Age is taken on the pay date.
 */

export type MinimumWageBand =
  | 'age21AndOver'
  | 'age18to20'
  | 'age16to17'
  | 'apprentice'
  | 'ukLivingWage'
  | 'londonLivingWage'

export type MinimumWageProfileKind =
  | 'national'
  | 'apprentice'
  | 'ukLivingWage'
  | 'londonLivingWage'
  | 'notEntitled'

export type MinimumWageAssessment = {
  entitled: boolean
  belowMinimum: boolean
  hourlyRate: number | null
  requiredRate: number | null
  band: MinimumWageBand | null
  bandLabel: string | null
  ratesFrom: string | null
  age: number | null
  profile: MinimumWageProfileKind
  warning: string | null
}

const NOT_ENTITLED = /not entitled|not eligible/i
const APPRENTICE = /apprentice/i
const LONDON_LIVING = /london living wage/i
const UK_LIVING = /uk living wage/i

const STATUTORY = [
  { from: '2027-04-01', age21AndOver: 13.21, age18to20: 11.27, age16to17: 8.31, apprentice: 8.31 },
  { from: '2026-04-01', age21AndOver: 12.71, age18to20: 10.85, age16to17: 8, apprentice: 8 },
  { from: '2025-04-01', age21AndOver: 12.21, age18to20: 10, age16to17: 7.55, apprentice: 7.55 },
  { from: '2024-04-01', age21AndOver: 11.44, age18to20: 8.6, age16to17: 6.4, apprentice: 6.4 },
] as const

const LIVING = [
  { from: '2026-10-15', uk: 14.1, london: 15.45 },
  { from: '2025-10-22', uk: 13.45, london: 14.8 },
  { from: '2024-10-23', uk: 12.6, london: 13.85 },
  { from: '2023-10-24', uk: 12, london: 13.15 },
] as const

const BAND_LABEL: Record<MinimumWageBand, string> = {
  age21AndOver: 'National Living Wage (age 21 and over)',
  age18to20: 'National Minimum Wage (age 18 to 20)',
  age16to17: 'National Minimum Wage (age 16 and 17)',
  apprentice: 'National Minimum Wage (apprentice)',
  ukLivingWage: 'UK Living Wage',
  londonLivingWage: 'London Living Wage',
}

export function parseMinimumWageProfile(profile?: string | null): MinimumWageProfileKind {
  const value = profile ?? ''
  if (NOT_ENTITLED.test(value)) return 'notEntitled'
  if (APPRENTICE.test(value)) return 'apprentice'
  if (LONDON_LIVING.test(value)) return 'londonLivingWage'
  if (UK_LIVING.test(value)) return 'ukLivingWage'
  return 'national'
}

export function assessHourlyMinimumWage(input: {
  dateOfBirth?: string | Date | null
  profile?: string | null
  payDate?: string | Date | null
  periodStart?: string | Date | null
  hourlyRate?: number | string | null
}): MinimumWageAssessment {
  const profile = parseMinimumWageProfile(input.profile)
  const empty: MinimumWageAssessment = {
    entitled: false,
    belowMinimum: false,
    hourlyRate: null,
    requiredRate: null,
    band: null,
    bandLabel: null,
    ratesFrom: null,
    age: null,
    profile,
    warning: null,
  }

  const hourlyRate = money(input.hourlyRate)
  if (hourlyRate == null || hourlyRate <= 0) return empty

  const on = parseDate(input.payDate) ?? parseDate(input.periodStart)
  const statutory = on ? pick(STATUTORY, on) : null
  const living = on ? pick(LIVING, on) : null
  const age = ageOnDate(input.dateOfBirth, on)
  const resolved = resolveRequiredRate({ age, profile, statutory, living })
  if (!resolved) return { ...empty, hourlyRate, age }

  const belowMinimum = Math.round(hourlyRate * 100) < Math.round(resolved.rate * 100)
  const bandLabel = BAND_LABEL[resolved.band]
  return {
    entitled: true,
    belowMinimum,
    hourlyRate,
    requiredRate: resolved.rate,
    band: resolved.band,
    bandLabel,
    ratesFrom: resolved.from,
    age,
    profile,
    warning: belowMinimum
      ? `Hourly pay of £${hourlyRate.toFixed(2)} is below the ${bandLabel} of £${resolved.rate.toFixed(2)} that applies from ${formatLongDate(resolved.from)}.`
      : null,
  }
}

function resolveRequiredRate(input: {
  age: number | null
  profile: MinimumWageProfileKind
  statutory: (typeof STATUTORY)[number] | null
  living: (typeof LIVING)[number] | null
}): { band: MinimumWageBand; rate: number; from: string } | null {
  if (input.profile === 'notEntitled') return null
  if (input.age == null || input.age < 16 || !input.statutory) return null

  const statutoryBand: MinimumWageBand =
    input.age >= 21 ? 'age21AndOver' : input.age >= 18 ? 'age18to20' : 'age16to17'
  const statutoryRate = input.statutory[statutoryBand]

  if (input.profile === 'apprentice') {
    return { band: 'apprentice', rate: input.statutory.apprentice, from: input.statutory.from }
  }

  if (
    (input.profile === 'ukLivingWage' || input.profile === 'londonLivingWage') &&
    input.age >= 18 &&
    input.living
  ) {
    const livingRate = input.profile === 'londonLivingWage' ? input.living.london : input.living.uk
    const band: MinimumWageBand =
      input.profile === 'londonLivingWage' ? 'londonLivingWage' : 'ukLivingWage'
    if (Math.round(livingRate * 100) >= Math.round(statutoryRate * 100)) {
      return { band, rate: livingRate, from: input.living.from }
    }
  }

  return { band: statutoryBand, rate: statutoryRate, from: input.statutory.from }
}

function pick<T extends { from: string }>(rows: readonly T[], on: Date): T | null {
  const key = dateKey(on)
  return rows.find((row) => key >= row.from) ?? null
}

function ageOnDate(dateOfBirth?: string | Date | null, on?: Date | null): number | null {
  const dob = parseDate(dateOfBirth)
  if (!dob || !on) return null
  let age = on.getUTCFullYear() - dob.getUTCFullYear()
  const month = on.getUTCMonth() - dob.getUTCMonth()
  if (month < 0 || (month === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1
  return age
}

function money(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return parseDate(value.toISOString().slice(0, 10))
  }
  const key = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateKey(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLongDate(iso: string): string {
  const parsed = parseDate(iso)
  if (!parsed) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}
