import type { FormPreview } from './formPreview'
import {
  SHEET_FIELD_CSS,
  addressHtml,
  dash,
  employeeName,
  esc,
  fieldHtml as field,
  money,
  moneyWhole,
} from './sheetFormat'

export const P60_CSS = `
* { box-sizing: border-box; }
body { margin: 0; background: #fff; }
${SHEET_FIELD_CSS}
.p60-sheet { width: 186mm; margin: 0 auto; font-family: Montserrat, Arial, sans-serif; color: #17375e; background: #fff; font-size: 11px; line-height: 1.45; }
.p60-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.p60-title-row { display: flex; align-items: flex-start; gap: 14px; min-width: 0; }
.p60-badge { display: flex; align-items: center; justify-content: center; width: 66px; height: 52px; background: #17375e; color: #fff; font-size: 26px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0; }
.p60-name { margin: 0; font-size: 27px; line-height: 1.05; font-weight: 700; }
.p60-subtitle { margin: 2px 0 0; font-size: 20px; font-weight: 400; }
.p60-logo { height: 34px; width: auto; object-fit: contain; }
.p60-rule { height: 2px; background: #d32027; margin: 12px 0 0; }
.p60-notes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin: 12px 0 0; font-size: 9.5px; line-height: 1.5; color: #17375e; }
.p60-notes p { margin: 0; }
.p60-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
.p60-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
.p60-pay { display: grid; grid-template-columns: minmax(0,1fr) 148px; gap: 18px; }
.p60-pay-table { width: 100%; border-collapse: collapse; }
.p60-pay-table th, .p60-pay-table td { padding: 6px 4px; font-size: 11px; text-align: right; border-bottom: 1px solid #ececec; font-variant-numeric: tabular-nums; }
.p60-pay-table th { font-size: 9.5px; font-style: italic; font-weight: 400; color: #7a8794; border-bottom: 1px solid #d9d9d9; }
.p60-pay-table th:first-child, .p60-pay-table td:first-child { text-align: left; font-weight: 700; font-style: normal; }
.p60-pay-table tr:last-child td { border-bottom: none; }
.p60-nic { width: 100%; border-collapse: collapse; table-layout: fixed; }
.p60-nic th { padding: 0 6px 8px; font-size: 9.5px; font-weight: 400; line-height: 1.35; text-align: right; vertical-align: bottom; border-bottom: 1px solid #d9d9d9; }
.p60-nic th:first-child { text-align: left; }
.p60-nic td { padding: 8px 6px 0; font-size: 11.5px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.p60-nic td:first-child { text-align: left; }
.p60-amount { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 11px; font-weight: 700; }
.p60-amount span:last-child { font-variant-numeric: tabular-nums; }
.p60-note { margin: 0 0 8px; font-size: 9.5px; color: #7a8794; }
.p60-footer { margin-top: 14px; font-size: 9.5px; line-height: 1.5; color: #17375e; }
.sheet-page { padding: 10px 12px 16px; }
@media print {
  .p60-sheet { width: auto; }
  .sheet-page { page-break-after: always; padding: 0; }
  .sheet-page:last-child { page-break-after: auto; }
}
@page { size: A4 portrait; margin: 12mm; }
`

function amount(label: string, value: string) {
  return `<div class="p60-amount"><span>${esc(label)}</span><span>${value}</span></div>`
}

export function p60BodyHtml(data: FormPreview, logoSrc: string) {
  const p60 = data.p60 ?? {}
  const name = dash(employeeName(data))
  const yearName = dash(data.tax_year?.name)
  const worksNumber =
    data.employee?.payroll_id || data.employee?.works_number || data.employee?.employee_code
  const taxCode = typeof p60.tax_code === 'string' ? p60.tax_code : null

  return `
  <article class="p60-sheet">
    <header class="p60-header">
      <div class="p60-title-row">
        <span class="p60-badge">P60</span>
        <div>
          <h1 class="p60-name">${name}</h1>
          <p class="p60-subtitle">End of Year Certificate ${yearName}</p>
        </div>
      </div>
      <img class="p60-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" />
    </header>
    <div class="p60-rule"></div>
    <div class="p60-notes">
      <p>Please keep this certificate in a safe place as you will need it if you have to fill in a tax return. You also need it to make a claim for tax credits and Universal Credit or to renew your claim.</p>
      <p>It also helps you check that your employer is using the correct National Insurance number and deducting the right rate of National Insurance contributions.</p>
      <p>By law you are required to tell HM Revenue and Customs about any income that is not fully taxed, even if you are not sent a tax return.</p>
    </div>
    <div class="p60-cols">
      <section class="sheet-card">
        <h3>Employer details</h3>
        <div class="sheet-card-body p60-grid-2">
          <div>
            ${field('Name', dash(data.employer?.name))}
            ${field('PAYE reference', dash(data.employer?.paye_reference))}
          </div>
          <div>
            ${field('Address', addressHtml(data.employer?.address, data.employer?.postcode))}
          </div>
        </div>
      </section>
      <section class="sheet-card">
        <h3>Employee details</h3>
        <div class="sheet-card-body p60-grid-2">
          <div>
            ${field('Surname', dash(data.employee?.last_name))}
            ${field('Forename(s)', dash(data.employee?.first_name))}
            ${field('Works/payroll number', dash(worksNumber))}
          </div>
          <div>
            ${field('National Insurance number', dash(data.employee?.ni_number))}
            ${field('Address', addressHtml(data.employee?.address))}
          </div>
        </div>
      </section>
    </div>
    <section class="sheet-card" style="margin-top:14px">
      <h3>Pay and income tax details</h3>
      <div class="sheet-card-body p60-pay">
        <table class="p60-pay-table">
          <thead>
            <tr><th></th><th>Pay</th><th>Tax deducted</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>In previous employment(s)</td>
              <td>${money(p60.previous_pay)}</td>
              <td>${money(p60.previous_tax)}</td>
            </tr>
            <tr>
              <td>In this employment</td>
              <td>${money(p60.this_pay)}</td>
              <td>${money(p60.this_tax)}</td>
            </tr>
            <tr>
              <td>Total for year</td>
              <td>${money(p60.total_pay)}</td>
              <td>${money(p60.total_tax)}</td>
            </tr>
          </tbody>
        </table>
        <div>
          ${field('Final tax code', dash(taxCode))}
          <p class="p60-note">The 'In this employment' figures should be used for your tax return, if you get one.</p>
        </div>
      </div>
    </section>
    <section class="sheet-card" style="margin-top:14px">
      <h3>National Insurance contributions</h3>
      <div class="sheet-card-body">
        <table class="p60-nic">
          <thead>
            <tr>
              <th>NIC table letter</th>
              <th>Earnings at the Lower Earnings Limit (LEL) (where earnings are equal to or exceed the LEL)</th>
              <th>Earnings above the LEL, up to and including the Primary Threshold (PT)</th>
              <th>Earnings above the PT, up to and including the Upper Earnings Limit (UEL)</th>
              <th>Employee contributions due on all earnings above the PT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${dash(typeof p60.ni_category === 'string' ? p60.ni_category : null)}</td>
              <td>${moneyWhole(p60.earning_to_lel)}</td>
              <td>${moneyWhole(p60.earning_lel_to_pt)}</td>
              <td>${moneyWhole(p60.earning_pt_to_uel)}</td>
              <td>${money(p60.employee_nic)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div class="p60-cols">
      <section class="sheet-card">
        <h3>Statutory payments</h3>
        <div class="sheet-card-body">
          <p class="p60-note">Included in the pay 'In this employment' figure above.</p>
          ${amount('Statutory Maternity Pay', money(p60.smp))}
          ${amount('Statutory Paternity Pay', money(p60.spp))}
          ${amount('Statutory Shared Parental Pay', money(p60.shpp))}
          ${amount('Statutory Adoption Pay', money(p60.sap))}
          ${amount('Statutory Parental Bereavement Pay', money(p60.spbp))}
          ${amount('Statutory Neonatal Care Pay', money(p60.sncp))}
        </div>
      </section>
      <section class="sheet-card">
        <h3>Other details</h3>
        <div class="sheet-card-body">
          <p class="p60-note">Amounts relate to this employment only.</p>
          ${amount('Student Loan deductions', money(p60.student_loan))}
          ${amount('Postgraduate Loan deductions', money(p60.postgraduate_loan))}
        </div>
      </section>
    </div>
    <p class="p60-footer">Certificate by Employer/Paying Office &ndash; do not destroy. This form shows your total pay for Income Tax purposes in this employment for the year. Any overtime, bonus, commission etc., statutory sick pay or statutory parenting pay is included.</p>
  </article>`
}
