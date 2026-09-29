import formLogo from '../../../assets/brand/logo-forms.png'
import { esc, slug } from '../../employees/sheetFormat'
import type { StarterFormData } from './starterFormData'

const CSS = `
* { box-sizing: border-box; }
body { margin: 0; background: #f8f7f4; }
.starter-sheet {
  width: 190mm;
  margin: 0 auto;
  padding: 14px 16px 18px;
  font-family: Montserrat, Arial, sans-serif;
  color: #17375e;
  background: #fff;
  font-size: 11px;
  line-height: 1.4;
}
.starter-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.starter-logo { height: 36px; width: auto; object-fit: contain; }
.starter-ref { text-align: right; }
.starter-ref strong { display: block; font-size: 18px; letter-spacing: 0.04em; }
.starter-ref span { font-size: 10px; color: #5c6e82; }
.starter-title { margin: 14px 0 12px; text-align: center; font-size: 20px; font-weight: 700; letter-spacing: 0.04em; }
.starter-rule { height: 3px; background: #d32027; margin: 0 0 14px; }
.starter-box { border: 1px solid #e4e7ec; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.starter-box h2 {
  margin: 0;
  background: #17375e;
  color: #fff;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.starter-body { padding: 12px; }
.starter-grid { display: grid; gap: 10px 16px; }
.cols-2 { grid-template-columns: 1fr 1fr; }
.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.field .label {
  display: block;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5c6e82;
  margin-bottom: 3px;
}
.field .value {
  min-height: 22px;
  border-bottom: 1px solid #d9d9d9;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 0;
}
.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }
.days { display: flex; gap: 6px; flex-wrap: wrap; }
.day {
  width: 28px;
  height: 28px;
  border: 1px solid #17375e;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}
.day.on { background: #17375e; color: #fff; }
.choices { display: flex; gap: 8px; margin-top: 2px; }
.choice {
  min-width: 52px;
  height: 28px;
  border: 1px solid #17375e;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.choice.on { background: #17375e; color: #fff; }
.statement { margin: 0 0 8px; padding: 8px 10px; border: 1px solid #e4e7ec; border-radius: 6px; }
.statement.on { border-color: #17375e; background: #e8eef6; }
.statement .mark {
  display: inline-flex;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  border: 1.5px solid #17375e;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}
.statement.on .mark { background: #17375e; color: #fff; }
.statement p { display: inline; margin: 0; font-size: 10.5px; }
.starter-note { margin: 0 0 8px; font-size: 10px; font-weight: 700; }
.starter-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  font-size: 9.5px;
  color: #5c6e82;
}
@media print {
  body { background: #fff; }
  .starter-sheet { width: auto; padding: 0; }
}
@page { size: A4 portrait; margin: 12mm; }
`

function field(label: string, value: string, className = '') {
  return `<div class="field ${className}"><span class="label">${esc(label)}</span><span class="value">${esc(value) || '&nbsp;'}</span></div>`
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
  return `<div class="statement${on ? ' on' : ''}"><span class="mark">${code}</span><p>${esc(copy)}</p></div>`
}

export function starterFormBodyHtml(data: StarterFormData, logoSrc: string) {
  return `
  <article class="starter-sheet">
    <header class="starter-top">
      <img class="starter-logo" src="${esc(logoSrc)}" alt="Cedar Payroll" />
      <div class="starter-ref">
        <strong>HR-1</strong>
        <span>Employee Starter Form</span>
      </div>
    </header>
    <h1 class="starter-title">Employee Starter Form</h1>
    <div class="starter-rule"></div>

    <section class="starter-box">
      <h2>Employer full name</h2>
      <div class="starter-body">${field('Employer', data.employerName)}</div>
    </section>

    <section class="starter-box">
      <h2>Employee personal details</h2>
      <div class="starter-body">
        <div class="starter-grid cols-3">
          ${field('Title', data.title)}
          ${field('Gender (M/F)', data.gender)}
          ${field('Marital status', data.maritalStatus)}
          ${field('First names', data.firstNames)}
          ${field('Last name', data.lastName, 'span-2')}
          ${field('Date of birth', data.dob)}
          ${field('National Insurance number', data.niNumber, 'span-2')}
          ${field('Address', data.address, 'span-3')}
          ${field('Town', data.town)}
          ${field('County', data.county)}
          ${field('Postcode', data.postcode)}
          ${field('Passport no.', data.passportNo)}
          ${field('Tel no.', data.phone)}
          ${field('Email', data.email)}
        </div>
      </div>
    </section>

    <section class="starter-box">
      <h2>Employment details</h2>
      <div class="starter-body">
        <div class="starter-grid cols-3">
          ${field('Start date', data.startDate)}
          ${field('Department', data.department)}
          ${field('Director', data.director)}
          ${field('Salary rate', data.salaryRate)}
          ${field('Hourly rate', data.hourlyRate)}
          ${field('Hours per week', data.hoursPerWeek)}
          ${field('Days per week', data.daysPerWeek)}
          <div class="field span-2">
            <span class="label">Hours per day / working days</span>
            <span class="value">${esc(data.hoursPerDay)}${data.hoursPerDay ? ' hours' : ''}</span>
            <div style="margin-top:8px">${dayMarks(data.workingDays)}</div>
          </div>
          ${field('Student loan to be repaid', data.studentLoan)}
          <div class="field span-2">
            <span class="label">P45 attached / to follow</span>
            ${yesNoChoices(data.p45)}
          </div>
        </div>
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
        <div class="starter-grid cols-2">
          ${field('Name of bank', data.bankName)}
          ${field('Branch name', data.branchName)}
          ${field('Sort code', data.sortCode)}
          ${field('Account name', data.accountName)}
          ${field('Account number', data.accountNumber)}
          ${field('Building society reference / roll no.', data.buildingSocietyRef)}
        </div>
      </div>
    </section>

    <footer class="starter-foot">
      <span>Cedar Payroll</span>
      <span>Version 1</span>
      <span>Date: ${esc(data.createdOn)}</span>
    </footer>
  </article>`
}

export function starterFormDocument(data: StarterFormData, logoSrc: string) {
  const title = `Starter Form ${data.displayName}`
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
