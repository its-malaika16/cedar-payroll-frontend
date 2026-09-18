import { money } from '../../lib/format'
import { formatDate } from '../../lib/format'
import { BENEFIT_TYPES } from './benefitTypes'

export type P11dRow = {
  label: string
  value: string
  box?: string
  class1a?: boolean
  /** Marks the row(s) that make up the chargeable "cash equivalent on which tax is paid". */
  taxed?: boolean
}

export type P11dSection = {
  code: string
  title: string
  rows: P11dRow[]
}

/** A benefit as stored against an employee: the benefit type id plus the entered field values. */
export type P11dBenefit = {
  id?: string
  type_id?: string
  code?: string
  values?: Record<string, unknown>
  rows?: P11dRow[]
  title?: string
}

const NA = 'N/A'

function text(values: Record<string, unknown>, key: string) {
  const value = values[key]
  if (value === undefined || value === null || value === '') return NA
  return String(value)
}

function amount(values: Record<string, unknown>, key: string) {
  const value = values[key]
  if (value === undefined || value === null || value === '') return money(0)
  return money(Number(value))
}

function date(values: Record<string, unknown>, key: string) {
  const value = values[key]
  if (!value) return NA
  const formatted = formatDate(String(value))
  return formatted === '—' ? NA : formatted
}

function suffixed(values: Record<string, unknown>, key: string, suffix: string) {
  const value = values[key]
  if (value === undefined || value === null || value === '') return NA
  return `${value}${suffix}`
}

/** HMRC fuel type letters used on the P11D. */
function fuelLetter(values: Record<string, unknown>) {
  const raw = String(values.fuelType ?? '').toUpperCase()
  if (!raw) return NA
  if (raw.includes('DIESEL')) return 'D'
  return 'A'
}

type SectionBuilder = {
  title: string
  class1a?: boolean
  /** Box number printed on the form next to the amount, where known. */
  box?: string
  rows: (values: Record<string, unknown>, taxYearName: string) => P11dRow[]
}

/**
 * Section titles follow the P11D. Box numbers are only set where they are
 * confirmed for that section; sections without one print the amount alone.
 */
const BUILDERS: Record<string, SectionBuilder> = {
  A: {
    title: 'Assets transferred',
    class1a: true,
    rows: (values) => [
      { label: 'Description of asset', value: text(values, 'description') },
      { label: 'Cost or market value', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  B: {
    title: 'Payments made on behalf of employee',
    rows: (values) => [
      { label: 'Description of payment', value: text(values, 'description') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent') },
    ],
  },
  B2: {
    title: 'Tax on notional payments',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      {
        label: 'Tax on notional payments not borne by employee within 90 days of the end of the tax year',
        value: amount(values, 'tax'),
      },
    ],
  },
  C: {
    title: 'Vouchers and credit cards',
    class1a: true,
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Gross amount', value: amount(values, 'grossAmount') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  D: {
    title: 'Living accommodation',
    class1a: true,
    rows: (values) => [
      {
        label:
          'Cash equivalent or relevant amount of accommodation provided for employee, or his/her family or household',
        value: amount(values, 'cashEquivalent'),
        box: '14',
        class1a: true,
      },
    ],
  },
  E: {
    title: 'Mileage allowance and passenger payments',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      {
        label:
          'Amount of car and mileage allowances paid for employee’s own car, and passenger payments, over the approved amount',
        value: amount(values, 'taxableAmount'),
      },
    ],
  },
  F: {
    title: 'Cars and car fuel',
    class1a: true,
    rows: (values, taxYearName) => [
      { label: 'Make and model', value: text(values, 'makeModel') },
      { label: 'Vehicle registration number', value: text(values, 'registration') },
      { label: 'Date first registered', value: date(values, 'dateFirstRegistered') },
      { label: 'Approved CO2 emissions figure', value: suffixed(values, 'co2', 'g/km') },
      { label: 'Approved zero emissions mileage', value: suffixed(values, 'zeroEmissionsMiles', ' miles') },
      { label: 'Engine size', value: suffixed(values, 'engineSize', 'cc') },
      { label: 'Type of fuel or power used', value: fuelLetter(values) },
      { label: `Date car was made available from in ${taxYearName}`, value: date(values, 'availableFrom') },
      { label: `Date car was made available to in ${taxYearName}`, value: date(values, 'availableTo') },
      { label: 'List price of car', value: amount(values, 'listPrice') },
      { label: 'Accessories', value: amount(values, 'accessories') },
      {
        label: 'Capital contributions the employee made towards the cost of car or accessories',
        value: amount(values, 'capitalContributions'),
      },
      { label: 'Amount paid by employee for private use of the car', value: amount(values, 'privateUsePaid') },
      { label: 'Date free fuel was withdrawn', value: date(values, 'fuelWithdrawn') },
      { label: 'Free fuel reinstated later', value: values.fuelReinstated ? 'Yes' : NA },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), box: '9', class1a: true },
      {
        label: 'Cash equivalent of fuel',
        value: values.privateFuelPaid ? amount(values, 'fuelEquivalent') : money(0),
        box: '10',
        class1a: true,
      },
    ],
  },
  G: {
    title: 'Vans and van fuel',
    class1a: true,
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cash equivalent of all vans made available', value: amount(values, 'vansEquivalent'), class1a: true },
      { label: 'Cash equivalent of fuel for all vans', value: amount(values, 'fuelEquivalent'), class1a: true },
    ],
  },
  H: {
    title: 'Interest-free and low interest loans',
    class1a: true,
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Number of joint borrowers, if applicable', value: text(values, 'jointBorrowers') },
      { label: 'Date loan was made in the tax year', value: date(values, 'dateMade') },
      { label: 'Date loan was discharged in the tax year', value: date(values, 'dateDischarged') },
      { label: 'Maximum amount outstanding at any time in the year', value: amount(values, 'maximumBalance') },
      { label: 'Amount outstanding at start of the tax year', value: amount(values, 'startingBalance') },
      { label: 'Amount outstanding at end of the tax year', value: amount(values, 'closingBalance') },
      { label: 'Total amount of interest paid by the borrower in the year', value: amount(values, 'interestPaid') },
      { label: 'Cash equivalent of loan after deducting any interest paid by the borrower', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  I: {
    title: 'Private medical treatment or insurance',
    class1a: true,
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  J: {
    title: 'Qualifying relocation expenses payments and benefits',
    class1a: true,
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Excess over £8,000 of all payments and benefits for each move', value: amount(values, 'excessAmount'), class1a: true },
    ],
  },
  K: {
    title: 'Services supplied',
    class1a: true,
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  L: {
    title: 'Assets placed at the employee’s disposal',
    class1a: true,
    rows: (values) => [
      { label: 'Description of asset', value: text(values, 'description') },
      { label: 'Annual value of the use of the asset, plus expenses incurred', value: amount(values, 'value') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  M: {
    title: 'Other items',
    class1a: true,
    rows: (values) => [
      { label: 'Description of item', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent'), class1a: true },
    ],
  },
  N: {
    title: 'Other items (non-Class 1A)',
    rows: (values) => [
      { label: 'Description of item', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent') },
    ],
  },
  O: {
    title: 'Income Tax paid but not deducted from director’s remuneration',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Tax paid', value: amount(values, 'taxPaid') },
    ],
  },
  P: {
    title: 'Travelling and subsistence payments',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Taxable payment', value: amount(values, 'taxablePayment') },
    ],
  },
  Q: {
    title: 'Entertainment',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Cash equivalent', value: amount(values, 'cashEquivalent') },
    ],
  },
  R: {
    title: 'Payments for use of home telephone',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Taxable payment', value: amount(values, 'taxablePayment') },
    ],
  },
  S: {
    title: 'Non-qualifying relocation expenses',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Taxable payment', value: amount(values, 'taxablePayment') },
    ],
  },
  T: {
    title: 'Other expenses',
    rows: (values) => [
      { label: 'Description', value: text(values, 'description') },
      { label: 'Cost to you', value: amount(values, 'cost') },
      { label: 'Amount made good or from which tax deducted', value: amount(values, 'employeeContribution') },
      { label: 'Taxable payment', value: amount(values, 'taxablePayment') },
    ],
  },
}

function sectionCode(benefit: P11dBenefit) {
  const id = String(benefit.type_id ?? benefit.id ?? '')
  const known = BENEFIT_TYPES.find((item) => item.id === id)
  return { id, code: benefit.code ?? known?.code ?? id }
}

function markTaxed(rows: P11dRow[]) {
  const hasFlag = rows.some((row) => row.taxed)
  if (hasFlag) return rows
  // Class 1A rows are the chargeable cash equivalents.
  const class1aRows = rows.filter((row) => row.class1a)
  if (class1aRows.length) {
    class1aRows.forEach((row) => (row.taxed = true))
    return rows
  }
  // Otherwise the last money row is the chargeable amount.
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].value.trim().startsWith('£')) {
      rows[index].taxed = true
      break
    }
  }
  return rows
}

export function p11dSections(benefits: P11dBenefit[], taxYearName: string): P11dSection[] {
  return benefits.map((benefit) => {
    const { id, code } = sectionCode(benefit)
    const builder = BUILDERS[id]
    if (benefit.rows?.length) {
      return { code, title: benefit.title ?? builder?.title ?? 'Benefit', rows: markTaxed(benefit.rows) }
    }
    if (!builder) {
      return { code, title: benefit.title ?? 'Benefit', rows: [] }
    }
    return {
      code,
      title: builder.title,
      rows: markTaxed(builder.rows(benefit.values ?? {}, taxYearName)),
    }
  })
}

export function parseAmount(value: string) {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : 0
}

export function sectionTaxedTotal(section: P11dSection) {
  return section.rows.filter((row) => row.taxed).reduce((sum, row) => sum + parseAmount(row.value), 0)
}
