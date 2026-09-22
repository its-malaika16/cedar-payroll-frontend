export type CsvFieldGroup = 'Personal' | 'Address' | 'Employment' | 'Pay & tax'

export type CsvField = {
  id: string
  label: string
  required?: boolean
  group: CsvFieldGroup
  aliases: string[]
}

export const EMPLOYEE_CSV_FIELDS: CsvField[] = [
  { id: 'first_name', label: 'First name', required: true, group: 'Personal', aliases: ['first name', 'firstname', 'first_name', 'forename', 'given name'] },
  { id: 'last_name', label: 'Last name', required: true, group: 'Personal', aliases: ['last name', 'lastname', 'last_name', 'surname', 'family name'] },
  { id: 'email', label: 'Email', required: true, group: 'Personal', aliases: ['email', 'email address', 'work email', 'e-mail'] },
  { id: 'dob', label: 'Date of birth', required: true, group: 'Personal', aliases: ['dob', 'date of birth', 'birth date', 'birthday', 'dateofbirth'] },
  { id: 'gender', label: 'Gender', required: true, group: 'Personal', aliases: ['gender', 'sex'] },
  { id: 'title', label: 'Title', group: 'Personal', aliases: ['title', 'honorific', 'salutation'] },
  { id: 'middle_name', label: 'Middle name', group: 'Personal', aliases: ['middle name', 'middlename', 'middle_name'] },
  { id: 'employee_code', label: 'Employee code / works number', group: 'Personal', aliases: ['employee code', 'employee_code', 'works number', 'staff number', 'payroll number', 'emp code', 'emp ref', 'employee ref', 'employee reference'] },
  { id: 'phone', label: 'Phone', group: 'Personal', aliases: ['phone', 'telephone', 'mobile', 'phone number', 'contact number'] },
  { id: 'address_line_1', label: 'Address line 1', group: 'Address', aliases: ['address line 1', 'address1', 'address', 'street', 'line 1'] },
  { id: 'address_line_2', label: 'Address line 2', group: 'Address', aliases: ['address line 2', 'address2', 'line 2'] },
  { id: 'address_line_3', label: 'Address line 3', group: 'Address', aliases: ['address line 3', 'address3', 'city', 'town'] },
  { id: 'address_line_4', label: 'Address line 4', group: 'Address', aliases: ['address line 4', 'address4', 'county'] },
  { id: 'postcode', label: 'Postcode', group: 'Address', aliases: ['postcode', 'post code', 'postal code', 'zip'] },
  { id: 'country', label: 'Country', group: 'Address', aliases: ['country'] },
  { id: 'job_title', label: 'Job title', group: 'Employment', aliases: ['job title', 'job_title', 'position', 'role'] },
  { id: 'department', label: 'Department', group: 'Employment', aliases: ['department', 'dept', 'team'] },
  { id: 'start_date', label: 'Start date', group: 'Employment', aliases: ['start date', 'startdate', 'date started', 'started', 'join date', 'joining date', 'employment start', 'employment start date', 'commencement date', 'date of starting'] },
  { id: 'leave_date', label: 'Leave date', group: 'Employment', aliases: ['leave date', 'leavedate', 'leaving date', 'date left', 'date of leaving', 'end date', 'termination date', 'last working day', 'leaving'] },
  { id: 'annual_salary', label: 'Annual salary', group: 'Pay & tax', aliases: ['annual salary', 'salary', 'yearly salary'] },
  { id: 'hourly_rate', label: 'Hourly rate', group: 'Pay & tax', aliases: ['hourly rate', 'hour rate', 'rate per hour', 'wage per hour'] },
  { id: 'daily_rate', label: 'Daily rate', group: 'Pay & tax', aliases: ['daily rate', 'day rate', 'rate per day'] },
  { id: 'tax_code', label: 'Tax code', group: 'Pay & tax', aliases: ['tax code', 'taxcode', 'paye tax code'] },
  { id: 'ni_number', label: 'NI number', group: 'Pay & tax', aliases: ['ni number', 'nino', 'national insurance', 'national insurance number'] },
  { id: 'ni_category', label: 'NI category', group: 'Pay & tax', aliases: ['ni category', 'nic category', 'ni cat'] },
]

export const CSV_FIELD_GROUPS: CsvFieldGroup[] = ['Personal', 'Address', 'Employment', 'Pay & tax']

export type ParsedCsv = {
  filename: string
  headers: string[]
  rows: string[][]
}

export function parseCsvText(text: string, filename: string): ParsedCsv {
  const cleaned = text.replace(/^\uFEFF/, '')
  const table: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i]
    if (quoted) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && cleaned[i + 1] === '\n') i += 1
      row.push(cell)
      cell = ''
      if (row.some((value) => value.trim())) table.push(row)
      row = []
      continue
    }
    cell += ch
  }
  row.push(cell)
  if (row.some((value) => value.trim())) table.push(row)

  const headers = (table.shift() ?? []).map((header) => header.trim()).filter(Boolean)
  if (!headers.length) throw new Error('This CSV has no column headings')
  const width = headers.length
  const rows = table.map((entry) => headers.map((_, index) => (entry[index] ?? '').trim()))
  if (!rows.length) throw new Error('This CSV has headings but no employee rows')
  return { filename, headers, rows: rows.filter((entry) => entry.some(Boolean)).map((entry) => entry.slice(0, width)) }
}

const IGNORED_CSV_HEADERS = new Set([
  'authentication code',
  'auth code',
  'company authentication code',
  'presenter authentication code',
  'hmrc authentication code',
  'gateway user id',
  'government gateway',
  'presenter id',
])

function scoreHeader(headerKey: string, field: CsvField) {
  const headerWords = headerKey.split(' ').filter(Boolean)
  const compactHeader = headerKey.replace(/\s+/g, '')
  let best = 0
  for (const alias of field.aliases) {
    if (alias === headerKey) return 1000 + alias.length
    const compactAlias = alias.replace(/\s+/g, '')
    if (compactAlias && compactAlias === compactHeader) return 900 + alias.length
    const aliasWords = alias.split(' ').filter(Boolean)
    if (!aliasWords.length) continue
    if (aliasWords.every((word) => headerWords.includes(word))) {
      best = Math.max(best, 100 + alias.length * 10 + aliasWords.length)
    }
  }
  return best
}

export function guessCsvMapping(headers: string[]) {
  const mapping: Record<string, string> = {}
  const usedFields = new Set<string>()
  const usedHeaders = new Set<string>()
  const candidates: { fieldId: string; header: string; score: number }[] = []

  for (const header of headers) {
    const key = normalizeHeader(header)
    if (!key || IGNORED_CSV_HEADERS.has(key)) continue
    for (const field of EMPLOYEE_CSV_FIELDS) {
      const score = scoreHeader(key, field)
      if (score > 0) candidates.push({ fieldId: field.id, header, score })
    }
  }

  candidates.sort((left, right) => right.score - left.score || left.fieldId.localeCompare(right.fieldId))
  for (const candidate of candidates) {
    if (usedFields.has(candidate.fieldId) || usedHeaders.has(candidate.header)) continue
    mapping[candidate.fieldId] = candidate.header
    usedFields.add(candidate.fieldId)
    usedHeaders.add(candidate.header)
  }
  return mapping
}

export function cellFor(row: string[], headers: string[], column: string | undefined) {
  if (!column) return ''
  const index = headers.indexOf(column)
  return index < 0 ? '' : (row[index] ?? '').trim()
}

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function isoDate(year: number, month: number, day: number) {
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2200) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return ''
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseCsvDate(value: string) {
  const text = value.trim()
  if (!text) return ''

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/)
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const slash = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+.*)?$/)
  if (slash) {
    const day = Number(slash[1])
    const month = Number(slash[2])
    let year = Number(slash[3])
    if (year < 100) year += year >= 30 ? 1900 : 2000
    return isoDate(year, month, day)
  }

  const named = text.match(/^(\d{1,2})[.\s/-]+([A-Za-z]{3,9})[.\s/-]+(\d{2,4})(?:\s+.*)?$/)
  if (named) {
    const month = MONTH_INDEX[named[2].toLowerCase()]
    let year = Number(named[3])
    if (year < 100) year += year >= 30 ? 1900 : 2000
    if (month) return isoDate(year, month, Number(named[1]))
  }

  const serial = Number(text)
  if (/^\d{5}(\.\d+)?$/.test(text) && Number.isFinite(serial) && serial >= 20000 && serial <= 80000) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000
    const date = new Date(utc)
    return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  }

  return ''
}

export function parseCsvGender(value: string) {
  const text = value.trim().toLowerCase()
  if (['m', 'male', 'man', 'boy'].includes(text)) return 'Male'
  if (['f', 'female', 'woman', 'girl'].includes(text)) return 'Female'
  if (text) return 'Other'
  return ''
}

export function parseCsvNumber(value: string) {
  const text = value.trim()
  if (!text) return undefined
  const amount = Number(text.replace(/[^0-9.-]/g, ''))
  return Number.isNaN(amount) ? undefined : amount
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export const DEFAULT_CSV_TAX_CODE = '1257L'

export function parseCsvNiCategory(value: string): 'A' | 'C' | 'M' | 'X' | undefined {
  const match = value.trim().toUpperCase().match(/\b([ACMX])\b/)
  return match ? (match[1] as 'A' | 'C' | 'M' | 'X') : undefined
}

export function recommendedNiCategoryFromDob(dob: string): 'A' | 'C' | 'M' | 'X' | null {
  const date = new Date(`${dob}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  let years = now.getUTCFullYear() - date.getUTCFullYear()
  const month = now.getUTCMonth() - date.getUTCMonth()
  if (month < 0 || (month === 0 && now.getUTCDate() < date.getUTCDate())) years -= 1
  if (years < 16) return 'X'
  if (years < 21) return 'M'
  if (years >= 66) return 'C'
  return 'A'
}
