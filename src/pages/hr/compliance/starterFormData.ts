import { companiesApi, employeesApi } from '../../../api'
import { formatNiNumber, money } from '../../../lib/format'
import type { Company, Employee } from '../../../types'

export type StarterFormData = {
  employerName: string
  title: string
  gender: string
  maritalStatus: string
  firstNames: string
  lastName: string
  displayName: string
  dob: string
  niNumber: string
  address: string
  town: string
  county: string
  postcode: string
  passportNo: string
  phone: string
  email: string
  startDate: string
  department: string
  director: string
  salaryRate: string
  hourlyRate: string
  hoursPerWeek: string
  daysPerWeek: string
  hoursPerDay: string
  workingDays: string[]
  studentLoan: string
  p45: string
  starterDeclaration: 'A' | 'B' | 'C' | ''
  bankName: string
  branchName: string
  sortCode: string
  accountName: string
  accountNumber: string
  buildingSocietyRef: string
  createdOn: string
}

export type StarterFormEmployeeSource = {
  first_name: string
  middle_name: string
  address_line_1: string
  address_line_2: string
  country: string
  payment_method: string
  student_loan_plan: string
  student_loan_start_date: string | null
  student_loan_stop_date: string | null
}

export type LoadedStarterForm = {
  form: StarterFormData
  source: StarterFormEmployeeSource
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export const STARTER_WORKING_DAYS = WEEKDAYS

function text(value: unknown) {
  return String(value ?? '').trim()
}

function firstRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {}
  return (value as Record<string, unknown>) ?? {}
}

function yesNo(value: boolean | null | undefined) {
  if (value == null) return ''
  return value ? 'Yes' : 'No'
}

function genderMark(value?: string | null) {
  const raw = text(value).toUpperCase()
  if (raw === 'MALE' || (raw.startsWith('M') && !raw.startsWith('MISS'))) return 'M'
  if (raw === 'FEMALE' || raw.startsWith('F')) return 'F'
  if (raw === 'OTHER') return 'Other'
  return text(value)
}

function moneyOrBlank(value: unknown) {
  if (value == null || value === '') return ''
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount === 0) return ''
  return money(amount)
}

function parseDays(value: unknown) {
  const raw = text(value)
  if (!raw) return []
  return raw
    .split(/[,\s|/]+/)
    .map((day) => day.trim())
    .filter(Boolean)
}

function weekdayShort(day: string) {
  const match = WEEKDAYS.find((item) => item.toLowerCase().startsWith(day.toLowerCase().slice(0, 3)))
  return match ?? day
}

function displayUkDate(value: unknown) {
  const iso = String(value ?? '').slice(0, 10)
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return text(value)
}

function toIsoDate(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const uk = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (uk) {
    return `${uk[3]}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}`
  }
  throw new Error(`Enter a valid ${label}`)
}

function parseMoney(value: string, label: string) {
  const compact = value.replace(/[£,\s]/g, '')
  if (!compact) return 0
  const amount = Number(compact)
  if (!Number.isFinite(amount)) throw new Error(`Enter a valid ${label}`)
  return amount
}

function parseHours(value: string, label: string) {
  const compact = value.replace(/,/g, '').trim()
  if (!compact) return 0
  const amount = Number(compact)
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`Enter a valid ${label}`)
  return amount
}

function compactNi(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

function compactSortCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6)
}

function formatSortCode(value: string) {
  return compactSortCode(value).replace(/(\d{2})(?=\d)/g, '$1-')
}

const UK_POSTCODE = /([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})/i

export function extractPostcode(value: string) {
  const match = value.toUpperCase().match(UK_POSTCODE)
  if (!match) return ''
  return `${match[1]} ${match[2]}`
}

function parseUkAddress(value: string) {
  let remaining = value.trim()
  const postcode = extractPostcode(remaining)
  if (postcode) {
    remaining = remaining
      .replace(new RegExp(postcode.replace(/\s+/g, '\\s*'), 'i'), '')
      .replace(/[,\s]+$/g, '')
      .trim()
  }
  const parts = remaining
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 3) {
    return {
      address: parts.slice(0, -2).join(', '),
      town: parts[parts.length - 2] ?? '',
      county: parts[parts.length - 1] ?? '',
      postcode,
    }
  }
  if (parts.length === 2) {
    return { address: parts[0] ?? '', town: parts[1] ?? '', county: '', postcode }
  }
  return { address: remaining, town: '', county: '', postcode }
}

async function lookupTownCounty(postcode: string) {
  const formatted = extractPostcode(postcode)
  if (!formatted) return null
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(formatted)}`,
    )
    if (!response.ok) return null
    const body = (await response.json()) as {
      result?: { postcode?: string; admin_district?: string | null; admin_county?: string | null }
    }
    const result = body.result
    if (!result) return null
    return {
      postcode: result.postcode || formatted,
      town: text(result.admin_district),
      county: text(result.admin_county),
    }
  } catch {
    return null
  }
}

export async function fillTownCounty(form: StarterFormData, preferLookup = false) {
  const parsed = parseUkAddress(form.address)
  const postcode = extractPostcode(form.postcode) || parsed.postcode
  let town = form.town
  let county = form.county
  let nextPostcode = form.postcode || parsed.postcode
  let nextAddress = form.address

  if (postcode) {
    const locality = await lookupTownCounty(postcode)
    if (locality) {
      if (preferLookup || !town) town = locality.town || town
      if (preferLookup || !county) county = locality.county || county
      nextPostcode = locality.postcode || nextPostcode
    }
  }
  if (!town) town = parsed.town
  if (!county) county = parsed.county
  if (!form.town && !form.county && parsed.address && parsed.town) {
    nextAddress = parsed.address
  }

  if (
    town === form.town &&
    county === form.county &&
    nextPostcode === form.postcode &&
    nextAddress === form.address
  ) {
    return form
  }
  return { ...form, town, county, postcode: nextPostcode, address: nextAddress }
}

function toEmployeeGender(value: string): 'Male' | 'Female' | 'Other' | undefined {
  const raw = value.trim().toUpperCase()
  if (!raw) return undefined
  if (raw === 'M' || raw === 'MALE') return 'Male'
  if (raw === 'F' || raw === 'FEMALE') return 'Female'
  if (raw === 'OTHER') return 'Other'
  throw new Error('Gender must be M, F or Other')
}

function splitFirstNames(firstNames: string, source: StarterFormEmployeeSource) {
  const composed = [source.first_name, source.middle_name].filter(Boolean).join(' ').trim()
  if (firstNames.trim() === composed) {
    return { first_name: source.first_name, middle_name: source.middle_name }
  }
  const parts = firstNames.trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] ?? '',
    middle_name: parts.slice(1).join(' '),
  }
}

function changed(original: StarterFormData, next: StarterFormData, key: keyof StarterFormData) {
  if (key === 'workingDays') {
    return JSON.stringify(original.workingDays) !== JSON.stringify(next.workingDays)
  }
  return original[key] !== next[key]
}

function anyChanged(original: StarterFormData, next: StarterFormData, keys: Array<keyof StarterFormData>) {
  return keys.some((key) => changed(original, next, key))
}

export async function loadStarterFormData(
  companyId: string,
  employeeId: string,
): Promise<LoadedStarterForm> {
  const [employeeRes, companyRes] = await Promise.all([
    employeesApi.get(companyId, employeeId),
    companiesApi.get(companyId),
  ])
  const employee = employeeRes.data as Employee
  const company = companyRes.data as Company
  const address = firstRecord(employee.employee_addresses)
  const bank = firstRecord(employee.bank_details)
  const tax = firstRecord(employee.employee_tax_details)
  const employment = firstRecord(employee.employment_details)
  const starter = firstRecord(employee.starters_leavers)

  const line1 = text(address.address_line_1)
  const line2 = text(address.address_line_2)
  const town = text(address.address_line_3)
  const county = text(address.address_line_4)
  const street = [line1, line2].filter(Boolean).join(', ')
  const fallbackAddress = text(address.address)

  const selectedDays = new Set(parseDays(employment.usual_working_days).map(weekdayShort))
  const workingDays = WEEKDAYS.filter((day) => selectedDays.has(day))
  const hoursPerWeek = Number(employment.typical_hours_per_week ?? 0)
  const hoursPerDay =
    hoursPerWeek > 0 && workingDays.length > 0
      ? (hoursPerWeek / workingDays.length).toLocaleString('en-GB', {
          maximumFractionDigits: 2,
        })
      : ''

  const loanPlan = text(tax.student_loan_plan).toUpperCase() || 'NONE'
  const hasStudentLoan = loanPlan !== 'NONE'

  const declaration = text(starter.starter_declaration).toUpperCase()
  const starterDeclaration =
    declaration === 'A' || declaration === 'B' || declaration === 'C' ? declaration : ''

  const previousPay = Number(starter.previous_gross_taxable_pay ?? 0)
  const firstNames = [employee.first_name, employee.middle_name].filter(Boolean).join(' ').trim()
  const lastName = text(employee.last_name)

  const form: StarterFormData = {
    employerName: text(company.trading_name) || text(company.company_name),
    title: text(employee.title),
    gender: genderMark(employee.gender),
    maritalStatus: '',
    firstNames,
    lastName,
    displayName: [firstNames, lastName].filter(Boolean).join(' ') || 'Employee',
    dob: displayUkDate(employee.dob),
    niNumber: formatNiNumber(String(tax.ni_number ?? '')) === '—' ? '' : formatNiNumber(String(tax.ni_number ?? '')),
    address: street || fallbackAddress,
    town,
    county,
    postcode: text(address.postcode),
    passportNo: '',
    phone: text(employee.phone),
    email: text(employee.email),
    startDate: displayUkDate(starter.start_date),
    department: text(employment.department),
    director: yesNo(Boolean(tax.is_director)),
    salaryRate: moneyOrBlank(employment.annual_salary),
    hourlyRate: moneyOrBlank(employment.basic_rate_per_hour),
    hoursPerWeek: hoursPerWeek ? String(hoursPerWeek) : '',
    daysPerWeek: workingDays.length ? String(workingDays.length) : '',
    hoursPerDay,
    workingDays: [...workingDays],
    studentLoan: yesNo(hasStudentLoan),
    p45: previousPay > 0 ? 'Yes' : starterDeclaration === 'A' ? 'No' : '',
    starterDeclaration,
    bankName: text(bank.bank_name),
    branchName: '',
    sortCode: formatSortCode(text(bank.sort_code)),
    accountName: text(bank.account_name),
    accountNumber: text(bank.account_number).replace(/\D/g, ''),
    buildingSocietyRef: text(bank.bank_reference),
    createdOn: new Date().toLocaleDateString('en-GB'),
  }

  return {
    form: await fillTownCounty(form),
    source: {
      first_name: text(employee.first_name),
      middle_name: text(employee.middle_name),
      address_line_1: line1,
      address_line_2: line2,
      country: text(address.country) || 'United Kingdom',
      payment_method: text(bank.payment_method) || 'CREDIT_TRANSFER',
      student_loan_plan: loanPlan,
      student_loan_start_date: text(tax.student_loan_start_date).slice(0, 10) || null,
      student_loan_stop_date: text(tax.student_loan_stop_date).slice(0, 10) || null,
    },
  }
}

export async function applyStarterFormToEmployee(
  companyId: string,
  employeeId: string,
  original: StarterFormData,
  next: StarterFormData,
  source: StarterFormEmployeeSource,
) {
  const updates: Array<Promise<unknown>> = []

  if (
    anyChanged(original, next, ['title', 'firstNames', 'lastName', 'gender', 'dob', 'phone', 'email'])
  ) {
    const names = splitFirstNames(next.firstNames, source)
    if (!names.first_name.trim()) throw new Error('Enter the first name')
    if (!next.lastName.trim()) throw new Error('Enter the last name')
    const personal: Record<string, unknown> = {}
    if (changed(original, next, 'title')) personal.title = next.title
    if (changed(original, next, 'firstNames')) {
      personal.first_name = names.first_name
      personal.middle_name = names.middle_name || undefined
    }
    if (changed(original, next, 'lastName')) personal.last_name = next.lastName.trim()
    if (changed(original, next, 'gender')) {
      const gender = toEmployeeGender(next.gender)
      if (gender) personal.gender = gender
    }
    if (changed(original, next, 'dob')) {
      const dob = toIsoDate(next.dob, 'date of birth')
      if (dob) personal.dob = dob
    }
    if (changed(original, next, 'phone')) personal.phone = next.phone || undefined
    if (changed(original, next, 'email')) {
      if (!next.email.trim()) throw new Error('Enter an email address')
      personal.email = next.email.trim()
    }
    if (Object.keys(personal).length) {
      updates.push(employeesApi.update(companyId, employeeId, personal))
    }
  }

  if (anyChanged(original, next, ['address', 'town', 'county', 'postcode'])) {
    const address: Record<string, unknown> = {}
    if (changed(original, next, 'address')) {
      address.address_line_1 = next.address.trim()
      address.address_line_2 = ''
    }
    if (changed(original, next, 'town')) address.address_line_3 = next.town.trim()
    if (changed(original, next, 'county')) address.address_line_4 = next.county.trim()
    if (changed(original, next, 'postcode')) address.postcode = next.postcode.trim()
    updates.push(employeesApi.updateAddress(companyId, employeeId, address))
  }

  if (
    anyChanged(original, next, [
      'department',
      'salaryRate',
      'hourlyRate',
      'hoursPerWeek',
      'workingDays',
    ])
  ) {
    const employment: Record<string, unknown> = {}
    if (changed(original, next, 'department')) employment.department = next.department.trim()
    if (changed(original, next, 'salaryRate')) {
      employment.annual_salary = parseMoney(next.salaryRate, 'salary rate')
    }
    if (changed(original, next, 'hourlyRate')) {
      employment.basic_rate_per_hour = parseMoney(next.hourlyRate, 'hourly rate')
    }
    if (changed(original, next, 'hoursPerWeek')) {
      employment.typical_hours_per_week = parseHours(next.hoursPerWeek, 'hours per week')
    }
    if (changed(original, next, 'workingDays')) {
      employment.usual_working_days = next.workingDays.join(',')
    }
    updates.push(employeesApi.updateEmployment(companyId, employeeId, employment))
  }

  if (anyChanged(original, next, ['director', 'niNumber', 'studentLoan'])) {
    const tax: Record<string, unknown> = {}
    if (changed(original, next, 'director') && next.director) {
      tax.is_director = next.director === 'Yes'
    }
    if (changed(original, next, 'niNumber')) {
      const niNumber = compactNi(next.niNumber)
      tax.ni_number = niNumber || undefined
    }
    if (changed(original, next, 'studentLoan') && next.studentLoan) {
      if (next.studentLoan === 'No') {
        tax.student_loan_plan = 'NONE'
        tax.student_loan_start_date = null
        tax.student_loan_stop_date = null
      } else {
        const plan = source.student_loan_plan !== 'NONE' ? source.student_loan_plan : 'PLAN_2'
        tax.student_loan_plan = plan
        tax.student_loan_start_date = source.student_loan_start_date
        tax.student_loan_stop_date = source.student_loan_stop_date
      }
    }
    if (Object.keys(tax).length) {
      updates.push(employeesApi.updateTax(companyId, employeeId, tax))
    }
  }

  if (anyChanged(original, next, ['startDate', 'starterDeclaration'])) {
    const starter: Record<string, unknown> = {}
    if (changed(original, next, 'startDate')) {
      starter.start_date = toIsoDate(next.startDate, 'start date')
    }
    if (changed(original, next, 'starterDeclaration')) {
      starter.starter_declaration = next.starterDeclaration || null
    }
    updates.push(employeesApi.updateStarterLeaver(companyId, employeeId, starter))
  }

  if (
    anyChanged(original, next, [
      'bankName',
      'sortCode',
      'accountName',
      'accountNumber',
      'buildingSocietyRef',
    ])
  ) {
    const sortCode = compactSortCode(next.sortCode)
    const accountNumber = next.accountNumber.replace(/\D/g, '')
    if (sortCode && sortCode.length !== 6) {
      throw new Error('Enter a 6-digit sort code')
    }
    if (accountNumber && accountNumber.length !== 8) {
      throw new Error('Enter an 8-digit account number')
    }
    updates.push(
      employeesApi.updateBank(companyId, employeeId, {
        payment_method: source.payment_method || 'CREDIT_TRANSFER',
        bank_name: next.bankName.trim() || null,
        account_name: next.accountName.trim() || null,
        account_number: accountNumber || null,
        sort_code: sortCode ? formatSortCode(sortCode) : null,
        bank_reference: next.buildingSocietyRef.trim() || null,
      }),
    )
  }

  if (!updates.length) return false
  await Promise.all(updates)
  return true
}
