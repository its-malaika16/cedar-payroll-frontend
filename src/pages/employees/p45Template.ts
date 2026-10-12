import type { FormPreview } from './formPreview'
import {
  addressHtml,
  dash,
  employeeName,
  esc,
  money,
  sheetDate,
} from './sheetFormat'

const PARTS: Record<string, { title: string; copy: string }> = {
  '1': { title: 'Part 1', copy: 'Copy for HM Revenue & Customs' },
  '1A': { title: 'Part 1A', copy: 'Copy for the employee' },
  '2': { title: 'Part 2', copy: 'Copy for the new employer' },
  '3': { title: 'Part 3', copy: 'To be completed by the new employer' },
}

export const P45_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #e8ebe9; }
.sheet-page {
  width: 210mm;
  min-height: 297mm;
  height: 297mm;
  margin: 12px auto;
  padding: 10mm 12mm;
  background: #fff;
  box-shadow: 0 1px 8px rgba(23,55,94,0.12);
  overflow: hidden;
  page-break-after: always;
}
.sheet-page:last-child { page-break-after: auto; }
.p45-sheet {
  width: 100%;
  height: 100%;
  font-family: Montserrat, Arial, Helvetica, sans-serif;
  color: #17375e;
  font-size: 10.5px;
  line-height: 1.35;
}
.p45-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.p45-title-row { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.p45-badge {
  display: flex; align-items: center; justify-content: center;
  width: 68px; height: 52px; flex-shrink: 0;
  background: #17375e; color: #fff; font-size: 26px; font-weight: 700;
}
.p45-name { margin: 0; font-size: 22px; line-height: 1.1; font-weight: 700; }
.p45-sub { margin: 3px 0 0; font-size: 13px; font-weight: 600; }
.p45-copy { margin: 2px 0 0; font-size: 11px; color: #3d5572; }
.p45-logo { height: 32px; width: auto; object-fit: contain; }
.p45-rule { height: 2px; background: #d32027; margin: 8px 0 10px; }
.p45-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.p45-grid-3 { display: grid; grid-template-columns: 90px 1fr 1fr; gap: 7px; }
.p45-wide { grid-column: 1 / -1; }
.p45-box { border: 1px solid #c5d0dc; min-height: 42px; background: #fff; }
.p45-box h4 {
  margin: 0; padding: 4px 8px; background: #17375e; color: #fff;
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
}
.p45-box .body { padding: 6px 8px 7px; font-size: 12px; font-weight: 700; min-height: 22px; }
.p45-hint { display: block; font-size: 8.5px; font-weight: 400; font-style: italic; color: #7a8794; margin-bottom: 2px; }
.p45-ticks { display: flex; gap: 14px; align-items: center; font-weight: 600; font-size: 11px; }
.p45-tick {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; margin-right: 5px; border: 1px solid #17375e;
  font-size: 11px; line-height: 1;
}
.p45-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.p45-figures { display: grid; grid-template-columns: 1fr 1fr 1.2fr 1.2fr; gap: 7px; }
.p45-notes { margin-top: 10px; font-size: 8.5px; line-height: 1.45; color: #3d5572; }
.p45-notes p { margin: 0 0 4px; }
.p45-empty { min-height: 28px; }
@media print {
  html, body { background: #fff; }
  .sheet-page {
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    margin: 0;
    padding: 10mm 12mm;
    box-shadow: none;
  }
}
@page { size: A4 portrait; margin: 0; }
`

function box(n: string | number, label: string, value: string, extra = '') {
  return `<section class="p45-box ${extra}">
    <h4>${esc(String(n))}. ${esc(label)}</h4>
    <div class="body">${value}</div>
  </section>`
}

function yesNo(value?: boolean | null) {
  return `<span class="p45-ticks">
    <span><span class="p45-tick">${value ? '✓' : ''}</span>Yes</span>
    <span><span class="p45-tick">${value === false ? '✓' : ''}</span>No</span>
  </span>`
}

function figure(label: string, value: string) {
  return `<section class="p45-box">
    <h4>${esc(label)}</h4>
    <div class="body">${value}</div>
  </section>`
}

export function p45BodyHtml(data: FormPreview, logoSrc: string) {
  const requested = (data.p45_parts ?? ['1', '1A', '2', '3']).filter((part) => PARTS[part])
  const parts = requested.length ? requested : ['1', '1A', '2', '3']
  return parts.map((part) => p45PartHtml(data, logoSrc, part)).join('')
}

function p45PartHtml(data: FormPreview, logoSrc: string, part: string) {
  const meta = PARTS[part] ?? PARTS['1']
  const p45 = data.p45 ?? {}
  const yearName = dash(data.tax_year?.name)
  const name = dash(employeeName(data))
  const week = p45.last_week_number != null ? String(p45.last_week_number) : '-'
  const month = p45.last_month_number != null ? String(p45.last_month_number) : '-'
  const pay = money(p45.total_pay_to_date)
  const tax = money(p45.total_tax_to_date)
  const newEmployer =
    part === '3'
      ? `<div class="p45-grid p45-wide" style="margin-top:8px">
          ${box('15', "New employer's PAYE reference", '<span class="p45-empty"></span>')}
          ${box('16', 'Date employment started', '<span class="p45-empty"></span>')}
          ${box('17', 'Works number / department', '<span class="p45-empty"></span>')}
          ${box('18', 'New tax code', '<span class="p45-empty"></span>')}
        </div>
        <p class="p45-notes">The new employer should complete this part and send it to HMRC if required.</p>`
      : ''

  return `<section class="sheet-page">
  <article class="p45-sheet">
    <header class="p45-header">
      <div class="p45-title-row">
        <span class="p45-badge">P45</span>
        <div>
          <h1 class="p45-name">Details of employee leaving work</h1>
          <p class="p45-sub">${esc(meta.title)} · ${esc(meta.copy)}</p>
          <p class="p45-copy">Tax year ${yearName} · ${name}</p>
        </div>
      </div>
      <img class="p45-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" />
    </header>
    <div class="p45-rule"></div>
    <div class="p45-grid">
      ${box(1, 'Employer PAYE reference', dash(data.employer?.paye_reference))}
      ${box(2, "Employee's National Insurance number", dash(data.employee?.ni_number))}
    </div>
    <div class="p45-grid-3" style="margin-top:7px">
      ${box(3, 'Title', dash(data.employee?.title))}
      ${box(3, 'First or given name(s)', dash(data.employee?.first_name))}
      ${box(3, 'Surname or family name', dash(data.employee?.last_name))}
    </div>
    <div class="p45-grid" style="margin-top:7px">
      ${box(4, 'Leaving date', sheetDate(typeof p45.leaving_date === 'string' ? p45.leaving_date : data.employee?.leave_date))}
      ${box(5, 'Student Loan deductions', yesNo(Boolean(p45.student_loan)))}
    </div>
    <div class="p45-grid" style="margin-top:7px">
      ${box(6, 'Tax code at leaving date', `${dash(p45.tax_code)}<span class="p45-hint" style="margin-top:4px">Week 1 / Month 1 basis ${p45.week1_month1 ? 'Yes' : 'No'}</span>`)}
      ${box(5, 'Postgraduate Loan deductions', yesNo(Boolean(p45.postgraduate_loan)))}
    </div>
    <section class="p45-box p45-wide" style="margin-top:7px">
      <h4>7. Last entries on Deductions Working Sheet (P11)</h4>
      <div class="body">
        <div class="p45-figures">
          ${figure('Week number', esc(week))}
          ${figure('Month number', esc(month))}
          ${figure('Total pay to date', esc(pay))}
          ${figure('Total tax to date', esc(tax))}
        </div>
      </div>
    </section>
    <div class="p45-grid" style="margin-top:7px">
      ${box(9, 'Works / payroll number', dash(data.employee?.payroll_id || data.employee?.works_number || data.employee?.employee_code))}
      ${box(9, 'Department or branch', dash(data.employee?.department))}
    </div>
    <div class="p45-grid" style="margin-top:7px">
      ${box(10, 'Gender', dash(data.employee?.gender))}
      ${box(11, 'Date of birth', sheetDate(data.employee?.dob))}
    </div>
    <div class="p45-grid" style="margin-top:7px">
      ${box(12, "Employee's private address", addressHtml(data.employee?.address), 'p45-wide')}
    </div>
    <div class="p45-grid" style="margin-top:7px">
      ${box(13, "Employer's name", dash(data.employer?.name))}
      ${box(13, "Employer's address", addressHtml(data.employer?.address, data.employer?.postcode))}
    </div>
    <div class="p45-grid" style="margin-top:7px">
      ${box(14, 'Employee is deceased', yesNo(Boolean(p45.deceased)))}
      ${box(' ', 'Prepared by Cedar Payroll', dash(data.employer?.name))}
    </div>
    ${newEmployer}
    <div class="p45-notes">
      <p>This form is prepared from the employee, employer and payroll records held in Cedar Payroll. Keep this copy in a safe place.</p>
      <p>${esc(meta.copy)}. Do not send Part 1A to HMRC.</p>
    </div>
  </article>
</section>`
}
