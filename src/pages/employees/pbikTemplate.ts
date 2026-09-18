import { money } from '../../lib/format'
import type { FormPreview } from './formPreview'
import { p11dSections, sectionTaxedTotal, type P11dRow } from './p11dRows'
import { SHEET_FIELD_CSS, dash, employeeName, esc, fieldHtml as field, sheetDate } from './sheetFormat'

function genderLabel(value?: string | null) {
  const raw = (value ?? '').trim()
  if (!raw) return '-'
  if (/^m(ale)?$/i.test(raw)) return 'Male'
  if (/^f(emale)?$/i.test(raw)) return 'Female'
  return esc(raw)
}

export const PBIK_CSS = `
* { box-sizing: border-box; }
body { margin: 0; background: #fff; }
${SHEET_FIELD_CSS}
.pbik-sheet { width: 186mm; margin: 0 auto; font-family: Montserrat, Arial, sans-serif; color: #17375e; background: #fff; font-size: 11px; line-height: 1.45; }
.pbik-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.pbik-name { margin: 0; font-size: 24px; line-height: 1.05; font-weight: 700; }
.pbik-subtitle { margin: 2px 0 0; font-size: 18px; font-weight: 400; }
.pbik-logo { height: 30px; width: auto; object-fit: contain; }
.pbik-rule { height: 2px; background: #d32027; margin: 8px 0 0; }
.pbik-notes { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin: 8px 0 0; font-size: 9px; line-height: 1.5; }
.pbik-notes p { margin: 0; }
.pbik-notes .right { text-align: right; flex-shrink: 0; max-width: 40%; }
.pbik-cards { display: grid; grid-template-columns: 1fr 1.7fr; gap: 12px; margin-top: 10px; }
.pbik-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 14px; }
.pbik-sheet .sheet-card > h3 { padding: 5px 10px; }
.pbik-sheet .sheet-card-body { padding: 7px 12px 4px; }
.pbik-sheet .sheet-field { margin-bottom: 4px; }
.pbik-section { margin-top: 12px; break-inside: avoid; }
.pbik-bar { display: flex; align-items: center; justify-content: center; gap: 7px; background: #17375e; color: #fff; padding: 5px 10px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.pbik-bar .code { display: inline-flex; align-items: center; justify-content: center; min-width: 15px; height: 15px; padding: 0 3px; background: #fff; color: #17375e; font-size: 9px; font-weight: 700; letter-spacing: 0; }
.pbik-rows { border: 1px solid #d9d9d9; border-top: none; }
.pbik-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 10px; border-bottom: 1px solid #f0f0f0; font-size: 10.5px; }
.pbik-row:last-child { border-bottom: none; }
.pbik-row .amount { flex-shrink: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
.pbik-total { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 6px 10px; border-top: 2px solid #17375e; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }
.pbik-total .amount { font-variant-numeric: tabular-nums; }
.pbik-empty { margin-top: 14px; border: 1px solid #d9d9d9; background: #f8f7f4; padding: 26px 16px; text-align: center; font-size: 11px; }
.sheet-page { padding: 10px 12px 16px; }
@media print {
  .pbik-sheet { width: auto; }
  .sheet-page { page-break-after: always; padding: 0; }
  .sheet-page:last-child { page-break-after: auto; }
}
@page { size: A4 portrait; margin: 12mm; }
`

function rowHtml(row: P11dRow) {
  return `<div class="pbik-row">
    <span>${esc(row.label)}</span>
    <span class="amount">${esc(row.value)}</span>
  </div>`
}

export function pbikBodyHtml(data: FormPreview, logoSrc: string) {
  const name = dash(employeeName(data))
  const yearName = data.tax_year?.name ?? ''
  const sections = p11dSections(data.pbik?.benefits ?? [], yearName)

  const sectionsHtml = sections.length
    ? sections
        .map(
          (section, index) => `<section class="pbik-section">
            <div class="pbik-bar"><span class="code">${index + 1}</span>${esc(section.title)}</div>
            <div class="pbik-rows">${section.rows.map(rowHtml).join('')}</div>
            <div class="pbik-total"><span>Cash equivalent on which tax paid</span><span class="amount">${esc(money(sectionTaxedTotal(section)))}</span></div>
          </section>`,
        )
        .join('')
    : `<p class="pbik-empty">${name} does not have any payrolled benefits in kind in the ${esc(yearName)} tax year.</p>`

  return `
  <article class="pbik-sheet">
    <header class="pbik-header">
      <div>
        <h1 class="pbik-name">${name}</h1>
        <p class="pbik-subtitle">Payrolled Benefits In Kind ${esc(yearName)}</p>
      </div>
      <img class="pbik-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" />
    </header>
    <div class="pbik-rule"></div>
    <div class="pbik-notes">
      <p><strong>Note to employee:</strong> this document details the total cash equivalent on which tax was paid for each of the payrolled benefits that you received in the ${esc(yearName)} tax year.</p>
      <p class="right">Keep this document in a safe place. You will need it to complete your ${esc(yearName)} tax return if you get one.</p>
    </div>
    <div class="pbik-cards">
      <section class="sheet-card">
        <h3>Employer</h3>
        <div class="sheet-card-body">
          ${field('Name', dash(data.employer?.name))}
          ${field('PAYE reference', dash(data.employer?.paye_reference))}
        </div>
      </section>
      <section class="sheet-card">
        <h3>Employee</h3>
        <div class="sheet-card-body pbik-grid-3">
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
