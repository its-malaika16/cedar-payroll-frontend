export const FORM_TYPES = [
  { value: 'p11', label: 'P11' },
  { value: 'p45', label: 'P45' },
  { value: 'p60', label: 'P60' },
  { value: 'p11d', label: 'P11D' },
  { value: 'pbik', label: 'PBIK' },
] as const

export type FormType = (typeof FORM_TYPES)[number]['value']

export function isFormType(value?: string): value is FormType {
  return FORM_TYPES.some((item) => item.value === value)
}

export function formLabel(type?: string) {
  return FORM_TYPES.find((item) => item.value === type)?.label ?? 'Form'
}

export function currentTaxYear(now = new Date()) {
  const year = now.getFullYear()
  const afterStart = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
  const start = afterStart ? year : year - 1
  const end = start + 1
  return {
    start,
    end,
    name: `${start}/${String(end).slice(-2)}`,
  }
}

export const EMAIL_INSERTS = [
  { group: 'Employee Info', items: [
    { token: '{first-name}', label: "Employee's First Name" },
    { token: '{surname}', label: "Employee's Surname" },
    { token: '{title}', label: "Employee's Title" },
    { token: '{works-number}', label: "Employee's Works Number" },
    { token: '{nino}', label: "Employee's National Insurance Number" },
  ]},
  { group: 'Employer Info', items: [
    { token: '{employer-name}', label: "Employer's Name" },
    { token: '{paye}', label: "Employer's PAYE Reference" },
  ]},
  { group: 'Tax Info', items: [
    { token: '{tax-year-name}', label: 'Tax Year Name' },
    { token: '{tax-year-end}', label: 'Tax Year End Date' },
  ]},
]
