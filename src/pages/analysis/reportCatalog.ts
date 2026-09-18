import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleMinus,
  ClipboardList,
  Coins,
  FileText,
  MoreHorizontal,
  Pencil,
  User,
} from 'lucide-react'

export type ReportKind =
  | 'employee-details'
  | 'payroll-summary'
  | 'pensions'
  | 'ytd-summary'
  | 'hmrc-payments'
  | 'p32'
  | 'additions'
  | 'deductions'
  | 'notes'

export type ReportDefinition = {
  slug: ReportKind
  name: string
  description: string
  listDescription: string
  icon: LucideIcon
}

export const FEATURED_REPORTS: ReportDefinition[] = [
  {
    slug: 'employee-details',
    name: 'Employee Details',
    description: 'Generate a report containing all employee details.',
    listDescription: 'Employee details',
    icon: User,
  },
  {
    slug: 'payroll-summary',
    name: 'Payroll Summary',
    description: 'View employee details with all the payroll summary.',
    listDescription: 'Payroll summary',
    icon: FileText,
  },
  {
    slug: 'pensions',
    name: 'Pensions',
    description: 'View employee details with their pension summary.',
    listDescription: 'Pension summary',
    icon: BadgeCheck,
  },
  {
    slug: 'ytd-summary',
    name: 'Year-to-date Summary',
    description: 'View year-to-date summary for pay, tax, NI, and other earnings.',
    listDescription: 'Year-to-date summary',
    icon: CalendarDays,
  },
]

export const MORE_REPORTS: ReportDefinition[] = [
  {
    slug: 'hmrc-payments',
    name: 'HMRC',
    description: 'View a summary of employer liabilities and payments due to HMRC.',
    listDescription: 'HMRC payments',
    icon: Building2,
  },
  {
    slug: 'notes',
    name: 'Notes',
    description: 'View and manage notes recorded for employees and payroll periods.',
    listDescription: 'Notes',
    icon: Pencil,
  },
  {
    slug: 'p32',
    name: 'P32',
    description: 'View a summary of employer liabilities and payments due to HMRC.',
    listDescription: 'P32 employer summary',
    icon: ClipboardList,
  },
  {
    slug: 'additions',
    name: 'Additions',
    description: 'View a report of employee additions and payments included in payroll.',
    listDescription: 'Additions',
    icon: Coins,
  },
  {
    slug: 'deductions',
    name: 'Deductions',
    description: 'View a report of employee deductions included in payroll.',
    listDescription: 'Deductions',
    icon: CircleMinus,
  },
]

export const ALL_REPORTS: ReportDefinition[] = [...FEATURED_REPORTS, ...MORE_REPORTS]

export const MORE_REPORTS_CARD = {
  name: 'More Reports',
  description: 'Access additional reports, including HMRC payments, P32, notes and more.',
  icon: MoreHorizontal,
}

export function reportBySlug(slug: string | undefined): ReportDefinition | undefined {
  return ALL_REPORTS.find((report) => report.slug === slug)
}
