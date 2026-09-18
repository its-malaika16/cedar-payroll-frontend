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
  { id: 'employee_code', label: 'Employee code / works number', group: 'Personal', aliases: ['employee code', 'employee_code', 'works number', 'staff number', 'payroll number', 'emp code'] },
  { id: 'phone', label: 'Phone', group: 'Personal', aliases: ['phone', 'telephone', 'mobile', 'phone number', 'contact number'] },
  { id: 'address_line_1', label: 'Address line 1', group: 'Address', aliases: ['address line 1', 'address1', 'address', 'street', 'line 1'] },
  { id: 'address_line_2', label: 'Address line 2', group: 'Address', aliases: ['address line 2', 'address2', 'line 2'] },
  { id: 'address_line_3', label: 'Address line 3', group: 'Address', aliases: ['address line 3', 'address3', 'city', 'town'] },
  { id: 'address_line_4', label: 'Address line 4', group: 'Address', aliases: ['address line 4', 'address4', 'county'] },
  { id: 'postcode', label: 'Postcode', group: 'Address', aliases: ['postcode', 'post code', 'postal code', 'zip'] },
  { id: 'country', label: 'Country', group: 'Address', aliases: ['country'] },
  { id: 'job_title', label: 'Job title', group: 'Employment', aliases: ['job title', 'job_title', 'position', 'role'] },
  { id: 'department', label: 'Department', group: 'Employment', aliases: ['department', 'dept', 'team'] },
  { id: 'start_date', label: 'Start date', group: 'Employment', aliases: ['start date', 'started', 'join date', 'joining date', 'employment start'] },
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

export function guessCsvMapping(headers: string[]) {
  const mapping: Record<string, string> = {}
  const used = new Set<string>()
  for (const field of EMPLOYEE_CSV_FIELDS) {
    const match = headers.find((header) => {
      if (used.has(header)) return false
      const key = normalizeHeader(header)
      return field.aliases.some((alias) => alias === key || key.includes(alias) || alias.includes(key))
    })
    if (match) {
      mapping[field.id] = match
      used.add(match)
    }
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

export function parseCsvDate(value: string) {
  const text = value.trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (!match) return ''
  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (year < 100) year += year >= 30 ? 1900 : 2000
  if (day < 1 || day > 31 || month < 1 || month > 12) return ''
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseCsvGender(value: string) {
  const text = value.trim().toLowerCase()
  if (['m', 'male', 'man', 'boy'].includes(text)) return 'Male'
  if (['f', 'female', 'woman', 'girl'].includes(text)) return 'Female'
  if (text) return 'Other'
  return ''
}

export function parseCsvNumber(value: string) {
  const amount = Number(value.replace(/[^0-9.-]/g, ''))
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
