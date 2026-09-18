import type { FormPreview } from './formPreview'
import { p11dSections, type P11dRow } from './p11dRows'
import { SHEET_FIELD_CSS, dash, employeeName, esc, fieldHtml as field, sheetDate } from './sheetFormat'

function genderLabel(value?: string | null) {
  const raw = (value ?? '').trim()
  if (!raw) return '-'
  if (/^m(ale)?$/i.test(raw)) return 'Male'
  if (/^f(emale)?$/i.test(raw)) return 'Female'
  return esc(raw)
}

export const P11D_CSS = `
* { box-sizing: border-box; }
body { margin: 0; background: #fff; }
${SHEET_FIELD_CSS}
.p11d-sheet { width: 186mm; margin: 0 auto; font-family: Montserrat, Arial, sans-serif; color: #17375e; background: #fff; font-size: 11px; line-height: 1.45; }
.p11d-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.p11d-title-row { display: flex; align-items: flex-start; gap: 14px; min-width: 0; }
.p11d-badge { display: flex; align-items: center; justify-content: center; width: 74px; height: 48px; background: #17375e; color: #fff; font-size: 22px; font-weight: 700; flex-shrink: 0; }
.p11d-name { margin: 0; font-size: 24px; line-height: 1.05; font-weight: 700; }
.p11d-subtitle { margin: 2px 0 0; font-size: 18px; font-weight: 400; }
.p11d-logo { height: 30px; width: auto; object-fit: contain; }
.p11d-rule { height: 2px; background: #d32027; margin: 8px 0 0; }
.p11d-notes { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin: 8px 0 0; font-size: 9px; line-height: 1.5; }
.p11d-notes p { margin: 0; }
.p11d-notes .right { text-align: right; flex-shrink: 0; max-width: 44%; }
.p11d-cards { display: grid; grid-template-columns: 1fr 1.7fr; gap: 12px; margin-top: 10px; }
.p11d-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 14px; }
.p11d-sheet .sheet-card > h3 { padding: 5px 10px; }
.p11d-sheet .sheet-card-body { padding: 7px 12px 4px; }
.p11d-sheet .sheet-field { margin-bottom: 4px; }
.p11d-section { margin-top: 12px; break-inside: avoid; }
.p11d-bar { display: flex; align-items: center; justify-content: center; gap: 7px; background: #17375e; color: #fff; padding: 5px 10px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.p11d-bar .code { display: inline-flex; align-items: center; justify-content: center; min-width: 15px; height: 15px; padding: 0 3px; background: #fff; color: #17375e; font-size: 9px; font-weight: 700; letter-spacing: 0; }
.p11d-rows { border: 1px solid #d9d9d9; border-top: none; }
.p11d-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 10px; border-bottom: 1px solid #f0f0f0; font-size: 10.5px; }
.p11d-row:last-child { border-bottom: none; }
.p11d-row .amount { display: flex; align-items: center; gap: 6px; flex-shrink: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
.p11d-box { display: inline-flex; align-items: center; justify-content: center; min-width: 15px; height: 15px; padding: 0 3px; background: #17375e; color: #fff; font-size: 8.5px; font-weight: 700; }
.p11d-1a { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 15px; padding: 0 3px; border: 1px solid #d32027; color: #d32027; font-size: 8.5px; font-weight: 700; }
.p11d-empty { margin-top: 14px; border: 1px solid #d9d9d9; background: #f8f7f4; padding: 26px 16px; text-align: center; font-size: 11px; }
.sheet-page { padding: 10px 12px 16px; }
@media print {
  .p11d-sheet { width: auto; }
  .sheet-page { page-break-after: always; padding: 0; }
  .sheet-page:last-child { page-break-after: auto; }
}
@page { size: A4 portrait; margin: 12mm; }
`

function rowHtml(row: P11dRow) {
  const box = row.box ? `<span class="p11d-box">${esc(row.box)}</span>` : ''
  const class1a = row.class1a ? `<span class="p11d-1a">1A</span>` : ''
  return `<div class="p11d-row">
    <span>${esc(row.label)}</span>
    <span class="amount">${box}${class1a}<span>${esc(row.value)}</span></span>
  </div>`
}

export function p11dBodyHtml(data: FormPreview, logoSrc: string) {
  const name = dash(employeeName(data))
  const yearName = data.tax_year?.name ?? ''
  const sections = p11dSections(data.p11d?.benefits ?? [], yearName)

  const sectionsHtml = sections.length
    ? sections
        .map(
          (section) => `<section class="p11d-section">
            <div class="p11d-bar"><span class="code">${esc(section.code)}</span>${esc(section.title)}</div>
            <div class="p11d-rows">${section.rows.map(rowHtml).join('')}</div>
          </section>`,
        )
        .join('')
    : `<p class="p11d-empty">${name} does not have any P11D benefits in the ${esc(yearName)} tax year.</p>`

  return `
  <article class="p11d-sheet">
    <header class="p11d-header">
      <div class="p11d-title-row">
        <span class="p11d-badge">P11D</span>
        <div>
          <h1 class="p11d-name">${name}</h1>
          <p class="p11d-subtitle">Expenses and Benefits ${esc(yearName)}</p>
        </div>
      </div>
      <img class="p11d-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" />
    </header>
    <div class="p11d-rule"></div>
    <div class="p11d-notes">
      <p><strong>Note to employee:</strong> keep this form in a safe place. You'll need it to complete your ${esc(yearName)} tax return if you get one. The box numberings on this form are the same as on the 'Employment' page of your tax return.</p>
      <p class="right">Employers pay Class 1A National Insurance contributions on benefits indicated with <span class="p11d-1a">1A</span></p>
    </div>
    <div class="p11d-cards">
      <section class="sheet-card">
        <h3>Employer</h3>
        <div class="sheet-card-body">
          ${field('Name', dash(data.employer?.name))}
          ${field('PAYE reference', dash(data.employer?.paye_reference))}
        </div>
      </section>
      <section class="sheet-card">
        <h3>Employee</h3>
        <div class="sheet-card-body p11d-grid-3">
          ${field('NINO', dash(data.employee?.ni_number))}
          ${field('Date of birth', sheetDate(data.employee?.dob))}
          ${field('Director', data.employee?.is_director ? 'Yes' : 'No')}
          ${field('Works number', dash(data.employee?.works_number || data.employee?.payroll_id || data.employee?.employee_code))}
          ${field('Gender', genderLabel(data.employee?.gender))}
          ${field('Start date', sheetDate(data.employee?.start_date))}
        </div>
      </section>
    </div>
    ${sectionsHtml}
  </article>`
}
