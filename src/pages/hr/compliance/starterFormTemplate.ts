import formLogo from '../../../assets/brand/logo-forms.png'
import { esc, slug } from '../../employees/sheetFormat'
import type { StarterFormData } from './starterFormData'

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.starter-sheet {
  width: 718px;
  margin: 0 auto;
  padding: 16px 18px 20px;
  font-family: Arial, Helvetica, sans-serif;
  color: #17375e;
  background: #fff;
  font-size: 11px;
  line-height: 1.35;
}
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { vertical-align: top; }
.starter-top td { padding: 0; }
.starter-logo { height: 36px; width: auto; }
.starter-ref { text-align: right; }
.starter-ref strong { display: block; font-size: 18px; font-weight: 700; }
.starter-ref span { display: block; font-size: 10px; color: #5c6e82; }
.starter-title { margin: 14px 0 10px; text-align: center; font-size: 20px; font-weight: 700; }
.starter-rule { height: 3px; background: #d32027; margin: 0 0 14px; font-size: 0; line-height: 0; }
.starter-box { border: 1px solid #d9d9d9; margin-bottom: 12px; }
.starter-box h2 {
  margin: 0;
  background: #17375e;
  color: #fff;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.starter-body { padding: 10px 12px 12px; }
.starter-grid td { padding: 6px 10px 8px 0; }
.starter-grid td:last-child { padding-right: 0; }
.field .label {
  display: block;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  color: #5c6e82;
  margin: 0 0 3px;
}
.field .value {
  display: block;
  min-height: 18px;
  border-bottom: 1px solid #b8b8b8;
  font-size: 12px;
  font-weight: 700;
  padding: 1px 0 3px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.days { margin-top: 6px; font-size: 0; }
.day {
  display: inline-block;
  width: 26px;
  height: 26px;
  margin: 0 5px 0 0;
  border: 1px solid #17375e;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
  color: #17375e;
  vertical-align: top;
}
.day.on { background: #17375e; color: #fff; }
.choices { margin-top: 2px; font-size: 0; }
.choice {
  display: inline-block;
  width: 52px;
  height: 26px;
  margin: 0 6px 0 0;
  border: 1px solid #17375e;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
  color: #17375e;
  vertical-align: top;
}
.choice.on { background: #17375e; color: #fff; }
.statement { width: 100%; margin: 0 0 8px; border: 1px solid #e4e7ec; border-collapse: separate; }
.statement.on { border-color: #17375e; background: #e8eef6; }
.statement td { padding: 8px 10px; vertical-align: middle; }
.statement .mark-cell { width: 28px; padding-right: 0; }
.statement .mark {
  display: block;
  width: 18px;
  height: 18px;
  border: 1px solid #17375e;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  color: #17375e;
}
.statement.on .mark { background: #17375e; color: #fff; }
.statement .copy { font-size: 10.5px; line-height: 1.4; }
.starter-note { margin: 0 0 8px; font-size: 10px; font-weight: 700; }
.starter-foot td { padding-top: 8px; font-size: 9.5px; color: #5c6e82; }
.starter-foot .right { text-align: right; }
.starter-foot .center { text-align: center; }
@media print {
  body { background: #fff; }
  .starter-sheet { width: auto; padding: 0; }
}
@page { size: A4 portrait; margin: 12mm; }
`

function field(label: string, value: string) {
  return `<div class="field"><div class="label">${esc(label)}</div><div class="value">${esc(value) || '&nbsp;'}</div></div>`
}

function cell(label: string, value: string, colspan = 1) {
  const span = colspan > 1 ? ` colspan="${colspan}"` : ''
  return `<td${span}>${field(label, value)}</td>`
}

function yesNoChoices(value: string) {
  const selected = value.trim().toLowerCase()
  return `<div class="choices"><span class="choice${selected === 'yes' ? ' on' : ''}">Yes</span><span class="choice${selected === 'no' ? ' on' : ''}">No</span></div>`
}

function dayMarks(selected: string[]) {
  const letters = [
    ['M', 'Monday'],
    ['T', 'Tuesday'],
    ['W', 'Wednesday'],
    ['T', 'Thursday'],
    ['F', 'Friday'],
    ['S', 'Saturday'],
    ['S', 'Sunday'],
  ]
  const on = new Set(selected.map((day) => day.toLowerCase()))
  return `<div class="days">${letters
    .map(
      ([letter, name]) =>
        `<span class="day${on.has(name.toLowerCase()) ? ' on' : ''}">${letter}</span>`,
    )
    .join('')}</div>`
}

function statement(code: 'A' | 'B' | 'C', selected: string, copy: string) {
  const on = selected === code
  return `<table class="statement${on ? ' on' : ''}"><tr><td class="mark-cell"><span class="mark">${code}</span></td><td class="copy">${esc(copy)}</td></tr></table>`
}

export function starterFormBodyHtml(data: StarterFormData, logoSrc: string) {
  return `
  <article class="starter-sheet">
    <table class="starter-top">
      <tr>
        <td><img class="starter-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" /></td>
        <td class="starter-ref">
          <strong>HR-1</strong>
          <span>Employee Starter Form</span>
        </td>
      </tr>
    </table>
    <h1 class="starter-title">Employee Starter Form</h1>
    <div class="starter-rule"></div>

    <section class="starter-box">
      <h2>Employer full name</h2>
      <div class="starter-body">
        <table class="starter-grid"><tr>${cell('Employer', data.employerName)}</tr></table>
      </div>
    </section>

    <section class="starter-box">
      <h2>Employee personal details</h2>
      <div class="starter-body">
        <table class="starter-grid">
          <tr>
            ${cell('Title', data.title)}
            ${cell('Gender (M/F)', data.gender)}
            ${cell('Marital status', data.maritalStatus)}
          </tr>
          <tr>
            ${cell('First name', data.firstNames)}
            ${cell('Middle name', data.middleName)}
            ${cell('Last name', data.lastName)}
          </tr>
          <tr>
            ${cell('Date of birth', data.dob)}
            ${cell('National Insurance number', data.niNumber, 2)}
          </tr>
          <tr>
            ${cell('Address', data.address, 3)}
          </tr>
          <tr>
            ${cell('Town', data.town)}
            ${cell('County', data.county)}
            ${cell('Postcode', data.postcode)}
          </tr>
          <tr>
            ${cell('Passport no.', data.passportNo)}
            ${cell('Tel no.', data.phone)}
            ${cell('Email', data.email)}
          </tr>
        </table>
      </div>
    </section>

    <section class="starter-box">
      <h2>Employment details</h2>
      <div class="starter-body">
        <table class="starter-grid">
          <tr>
            ${cell('Start date', data.startDate)}
            ${cell('Department', data.department)}
            ${cell('Director', data.director)}
          </tr>
          <tr>
            ${cell('Salary rate', data.salaryRate)}
            ${cell('Hourly rate', data.hourlyRate)}
            ${cell('Hours per week', data.hoursPerWeek)}
          </tr>
          <tr>
            ${cell('Days per week', data.daysPerWeek)}
            <td colspan="2">
              <div class="field">
                <div class="label">Hours per day / working days</div>
                <div class="value">${esc(data.hoursPerDay)}${data.hoursPerDay ? ' hours' : ''}&nbsp;</div>
              </div>
              ${dayMarks(data.workingDays)}
            </td>
          </tr>
          <tr>
            ${cell('Student loan to be repaid', data.studentLoan)}
            <td colspan="2">
              <div class="field">
                <div class="label">P45 attached / to follow</div>
              </div>
              ${yesNoChoices(data.p45)}
            </td>
          </tr>
        </table>
      </div>
    </section>

    <section class="starter-box">
      <h2>Employee statement</h2>
      <div class="starter-body">
        <p class="starter-note">Please select only one of the following statements</p>
        ${statement(
          'A',
          data.starterDeclaration,
          'This is my first job since last April and I have not received any taxable allowances, benefits or pensions.',
        )}
        ${statement(
          'B',
          data.starterDeclaration,
          'This is now my only job, but since last April I have had another job, or received taxable allowances or incapacity benefit. I do not receive a state or occupational pension.',
        )}
        ${statement(
          'C',
          data.starterDeclaration,
          'As well as my new job, I have another job or receive a state or occupational pension.',
        )}
      </div>
    </section>

    <section class="starter-box">
      <h2>Bank details</h2>
      <div class="starter-body">
        <table class="starter-grid">
          <tr>
            ${cell('Name of bank', data.bankName)}
            ${cell('Branch name', data.branchName)}
          </tr>
          <tr>
            ${cell('Sort code', data.sortCode)}
            ${cell('Account name', data.accountName)}
          </tr>
          <tr>
            ${cell('Account number', data.accountNumber)}
            ${cell('Building society reference / roll no.', data.buildingSocietyRef)}
          </tr>
        </table>
      </div>
    </section>

    <table class="starter-foot">
      <tr>
        <td>Cedar Payroll</td>
        <td class="center">Version 1</td>
        <td class="right">Date: ${esc(data.createdOn)}</td>
      </tr>
    </table>
  </article>`
}

export function starterFormDocument(data: StarterFormData, logoSrc: string) {
  const title = `Starter Form ${data.displayName}`
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <style>${CSS}</style>
  </head>
  <body>${starterFormBodyHtml(data, logoSrc)}</body>
</html>`
}

export function starterFormFilename(data: StarterFormData) {
  return `Starter-Form-${slug(data.displayName) || 'employee'}.pdf`
}

export async function buildStarterFormHtml(data: StarterFormData) {
  const logo = await fetch(formLogo)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? formLogo))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        }),
    )
    .catch(() => formLogo)
  return starterFormDocument(data, logo)
}
