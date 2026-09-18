import type { FormPreview } from './formPreview'
import {
  SHEET_FIELD_CSS,
  dash,
  employeeName,
  esc,
  fieldHtml as field,
  money,
  moneyWhole,
  sheetDate,
} from './sheetFormat'

function genderLabel(value?: string | null) {
  const raw = (value ?? '').trim()
  if (!raw) return '-'
  if (/^m(ale)?$/i.test(raw)) return 'Male'
  if (/^f(emale)?$/i.test(raw)) return 'Female'
  return esc(raw)
}

function periodLabel(row: { period_number: number; pay_frequency?: string }) {
  const frequency = String(row.pay_frequency ?? '').toUpperCase()
  const unit =
    frequency === 'WEEKLY'
      ? 'Week'
      : frequency === 'FORTNIGHTLY'
        ? 'Fortnight'
        : frequency === 'FOUR_WEEKLY'
          ? 'Period'
          : 'Month'
  return `${unit} ${row.period_number}`
}

export const P11_CSS = `
* { box-sizing: border-box; }
body { margin: 0; background: #fff; }
${SHEET_FIELD_CSS}
.p11-sheet { width: 281mm; margin: 0 auto; font-family: Montserrat, Arial, sans-serif; color: #17375e; background: #fff; font-size: 11px; line-height: 1.45; }
.p11-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.p11-title-row { display: flex; align-items: flex-start; gap: 14px; min-width: 0; }
.p11-badge { display: flex; align-items: center; justify-content: center; width: 58px; height: 46px; background: #17375e; color: #fff; font-size: 23px; font-weight: 700; flex-shrink: 0; }
.p11-name { margin: 0; font-size: 23px; line-height: 1.05; font-weight: 700; }
.p11-subtitle { margin: 2px 0 0; font-size: 17px; font-weight: 400; }
.p11-logo { height: 30px; width: auto; object-fit: contain; }
.p11-rule { height: 2px; background: #d32027; margin: 6px 0 0; }
.p11-cards { display: grid; grid-template-columns: 1fr 2.1fr; gap: 14px; margin-top: 8px; }
.p11-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 16px; }
.p11-sheet .sheet-card > h3 { padding: 4px 10px; }
.p11-sheet .sheet-card-body { padding: 7px 12px 4px; }
.p11-sheet .sheet-field { margin-bottom: 4px; }
.p11-section { margin-top: 10px; }
.p11-section > h2 { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #17375e; break-after: avoid; }
.p11-subhead { margin: 6px 0 2px; font-size: 12px; font-weight: 500; color: #17375e; break-after: avoid; }
.p11-hint { margin: 0 0 4px; font-size: 9px; color: #7a8794; }
.p11-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.p11-table thead { display: table-header-group; }
.p11-table tr { break-inside: avoid; }
.p11-table th, .p11-table td { border-bottom: 1px solid #ececec; padding: 3px 6px; vertical-align: bottom; }
.p11-table th { font-size: 8.5px; line-height: 1.25; font-weight: 700; text-align: right; color: #17375e; }
.p11-table th:first-child { text-align: left; }
.p11-table td { font-size: 10.5px; text-align: right; font-variant-numeric: tabular-nums; }
.p11-table td:first-child { text-align: left; }
.p11-table thead th { border-bottom: 1px solid #d9d9d9; }
.p11-table tfoot td { font-weight: 700; border-bottom: none; }
.p11-table .empty { text-align: left; color: #7a8794; }
.sheet-page { padding: 10px 12px 16px; }
@media print {
  .p11-sheet { width: auto; }
  .sheet-page { page-break-after: always; padding: 0; }
  .sheet-page:last-child { page-break-after: auto; }
}
@page { size: A4 landscape; margin: 8mm; }
`

function headRow(headers: string[], widths?: string[]) {
  const cols = widths
    ? `<colgroup>${widths.map((width) => `<col style="width:${width}">`).join('')}</colgroup>`
    : ''
  return `${cols}<thead><tr>${headers.map((label) => `<th>${esc(label)}</th>`).join('')}</tr></thead>`
}

const NI_HEADERS = [
  'Period',
  'Table',
  'Earnings at the LEL (where earnings are equal to or exceed the LEL)',
  'Earnings above the LEL, up to and including the PT',
  'Earnings above the PT, up to and including the UEL',
  "Total of employee's and employer's contributions",
  "Employee's contributions due on all earnings above the PT",
  'Student Loan deductions (SLD)',
  'Postgraduate Loan deductions (PGLD)',
]

const STAT_HEADERS = [
  'Period',
  'Statutory Sick Pay (SSP)',
  'Statutory Maternity Pay (SMP)',
  'Statutory Paternity Pay (SPP)',
  'Statutory Adoption Pay (SAP)',
  'Statutory Shared Parental Pay (ShPP)',
  'Statutory Parental Bereavement Pay (SPBP)',
  'Statutory Neonatal Care Pay (SNCP)',
]

const TAX_HEADERS = [
  'Period',
  'Tax code',
  'Pay including statutory pay',
  'Total pay to date',
  "Total 'free pay' to date",
  'Total taxable pay to date',
  "Total 'tax due' to date",
  'Tax deducted or refunded',
]

const EOY_HEADERS = [
  'Table',
  'Earnings at the LEL (where earnings are equal to or exceed the LEL)',
  'Earnings above the LEL, up to and including the PT',
  'Earnings above the PT, up to and including the UEL',
  "Total of employee's and employer's contributions",
  "Employee's contributions due on all earnings above the PT",
]

type NiTotals = {
  earning_to_lel: number
  earning_lel_to_pt: number
  earning_pt_to_uel: number
  employee_nic: number
  employer_nic: number
}

function niGroups(data: FormPreview) {
  const periods = data.p11?.periods ?? []
  const groups = new Map<string, NiTotals>()
  for (const row of periods) {
    const key = (row.ni_category || 'A').trim() || 'A'
    const current = groups.get(key) ?? {
      earning_to_lel: 0,
      earning_lel_to_pt: 0,
      earning_pt_to_uel: 0,
      employee_nic: 0,
      employer_nic: 0,
    }
    groups.set(key, {
      earning_to_lel: current.earning_to_lel + Number(row.earning_to_lel ?? 0),
      earning_lel_to_pt: current.earning_lel_to_pt + Number(row.earning_lel_to_pt ?? 0),
      earning_pt_to_uel: current.earning_pt_to_uel + Number(row.earning_pt_to_uel ?? 0),
      employee_nic: current.employee_nic + Number(row.employee_nic ?? 0),
      employer_nic: current.employer_nic + Number(row.employer_nic ?? 0),
    })
  }
  if (groups.size > 0) return [...groups.entries()]
  const totals = data.p11?.totals ?? {}
  return [
    [
      'A',
      {
        earning_to_lel: Number(totals.earning_to_lel ?? 0),
        earning_lel_to_pt: Number(totals.earning_lel_to_pt ?? 0),
        earning_pt_to_uel: Number(totals.earning_pt_to_uel ?? 0),
        employee_nic: Number(totals.employee_nic ?? 0),
        employer_nic: Number(totals.employer_nic ?? 0),
      },
    ],
  ] as Array<[string, NiTotals]>
}

export function p11BodyHtml(data: FormPreview, logoSrc: string) {
  const periods = data.p11?.periods ?? []
  const totals = data.p11?.totals ?? {}
  const name = dash(employeeName(data))
  const yearName = dash(data.tax_year?.name)
  const previousPay = Number(totals.previous_pay ?? 0)
  const previousTax = Number(totals.previous_tax ?? 0)
  const thisPay = Number(totals.pay ?? 0)
  const thisTax = Number(totals.tax ?? 0)

  const niRows = periods.length
    ? periods
        .map(
          (row) => `<tr>
            <td>${esc(periodLabel(row))}</td>
            <td>${dash(row.ni_category)}</td>
            <td>${money(row.earning_to_lel)}</td>
            <td>${money(row.earning_lel_to_pt)}</td>
            <td>${money(row.earning_pt_to_uel)}</td>
            <td>${money((row.employee_nic ?? 0) + (row.employer_nic ?? 0))}</td>
            <td>${money(row.employee_nic)}</td>
            <td>${money(row.student_loan)}</td>
            <td>${money(row.postgraduate_loan)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td class="empty" colspan="9">No completed payroll periods in this tax year.</td></tr>`

  const statRows = periods.length
    ? periods
        .map(
          (row) => `<tr>
            <td>${esc(periodLabel(row))}</td>
            <td>${money(row.ssp)}</td>
            <td>${money(row.smp)}</td>
            <td>${money(row.spp)}</td>
            <td>${money(row.sap)}</td>
            <td>${money(row.shpp)}</td>
            <td>${money(row.spbp)}</td>
            <td>${money(row.sncp)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td class="empty" colspan="8">No statutory payments in this tax year.</td></tr>`

  const taxRows = periods.length
    ? periods
        .map(
          (row) => `<tr>
            <td>${esc(periodLabel(row))}</td>
            <td>${dash(row.tax_code)}</td>
            <td>${money(row.pay_including_statutory)}</td>
            <td>${money(row.total_pay_to_date)}</td>
            <td>${money(row.total_free_pay_to_date)}</td>
            <td>${money(row.total_taxable_pay_to_date)}</td>
            <td>${money(row.total_tax_due_to_date)}</td>
            <td>${money(row.tax_deducted)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td class="empty" colspan="8">No PAYE periods in this tax year.</td></tr>`

  const eoyRows = niGroups(data)
    .map(
      ([letter, group]) => `<tr>
        <td>${esc(letter)}</td>
        <td>${moneyWhole(group.earning_to_lel)}</td>
        <td>${moneyWhole(group.earning_lel_to_pt)}</td>
        <td>${moneyWhole(group.earning_pt_to_uel)}</td>
        <td>${money(group.employee_nic + group.employer_nic)}</td>
        <td>${money(group.employee_nic)}</td>
      </tr>`,
    )
    .join('')

  return `
  <article class="p11-sheet">
    <header class="p11-header">
      <div class="p11-title-row">
        <span class="p11-badge">P11</span>
        <div>
          <h1 class="p11-name">${name}</h1>
          <p class="p11-subtitle">Deductions Working Sheet ${yearName}</p>
        </div>
      </div>
      <img class="p11-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" />
    </header>
    <div class="p11-rule"></div>
    <div class="p11-cards">
      <section class="sheet-card">
        <h3>Employer</h3>
        <div class="sheet-card-body">
          ${field('Name', dash(data.employer?.name))}
          ${field('PAYE reference', dash(data.employer?.paye_reference))}
        </div>
      </section>
      <section class="sheet-card">
        <h3>Employee</h3>
        <div class="sheet-card-body p11-grid-3">
          ${field('NINO', dash(data.employee?.ni_number))}
          ${field('Works number', dash(data.employee?.works_number || data.employee?.payroll_id || data.employee?.employee_code))}
          ${field('Start date', sheetDate(data.employee?.start_date))}
          ${field('Date of birth', sheetDate(data.employee?.dob))}
          ${field('Gender', genderLabel(data.employee?.gender))}
          ${field('Leave date', sheetDate(data.employee?.leave_date))}
        </div>
      </section>
    </div>
    <section class="p11-section">
      <h2>National Insurance Contributions and Student/Postgraduate Loan Deductions</h2>
      <p class="p11-hint">LEL = Lower Earnings Limit, PT = Primary Threshold, UEL = Upper Earnings Limit</p>
      <table class="p11-table">
        ${headRow(NI_HEADERS, ['8%', '5%', '12%', '12%', '12%', '13%', '14%', '12%', '12%'])}
        <tbody>${niRows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>${money((totals.employee_nic ?? 0) + (totals.employer_nic ?? 0))}</td>
            <td>${money(totals.employee_nic)}</td>
            <td>${money(totals.student_loan)}</td>
            <td>${money(totals.postgraduate_loan)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
    <section class="p11-section">
      <h2>Statutory Payments</h2>
      <table class="p11-table">
        ${headRow(STAT_HEADERS, ['13%', '12.4%', '12.4%', '12.4%', '12.4%', '12.4%', '12.4%', '12.4%'])}
        <tbody>${statRows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td>${money(totals.ssp)}</td>
            <td>${money(totals.smp)}</td>
            <td>${money(totals.spp)}</td>
            <td>${money(totals.sap)}</td>
            <td>${money(totals.shpp)}</td>
            <td>${money(totals.spbp)}</td>
            <td>${money(totals.sncp)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
    <section class="p11-section">
      <h2>PAYE Income Tax</h2>
      <table class="p11-table">
        ${headRow(TAX_HEADERS, ['13%', '12.4%', '12.4%', '12.4%', '12.4%', '12.4%', '12.4%', '12.4%'])}
        <tbody>${taxRows}</tbody>
      </table>
    </section>
    <section class="p11-section">
      <h2>End of Year Summary</h2>
      <h3 class="p11-subhead">NI Contribution Table Totals</h3>
      <table class="p11-table">
        ${headRow(EOY_HEADERS, ['8%', '18%', '18%', '18%', '19%', '19%'])}
        <tbody>${eoyRows}</tbody>
      </table>
      <h3 class="p11-subhead">Pay and Tax Totals</h3>
      <table class="p11-table">
        ${headRow(['Total', 'Pay', 'Tax deducted'], ['58%', '21%', '21%'])}
        <tbody>
          <tr>
            <td>In previous employment(s)</td>
            <td>${money(previousPay)}</td>
            <td>${money(previousTax)}</td>
          </tr>
          <tr>
            <td>In this employment</td>
            <td>${money(thisPay)}</td>
            <td>${money(thisTax)}</td>
          </tr>
          <tr>
            <td>Total for year</td>
            <td>${money(previousPay + thisPay)}</td>
            <td>${money(previousTax + thisTax)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </article>`
}
