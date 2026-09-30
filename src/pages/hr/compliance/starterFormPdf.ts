import { jsPDF } from 'jspdf'
import formLogo from '../../../assets/brand/logo-forms.png'
import type { StarterFormData } from './starterFormData'

type Pdf = InstanceType<typeof jsPDF>
type Rgb = [number, number, number]

const NAVY: Rgb = [23, 55, 94]
const RED: Rgb = [211, 32, 39]
const LABEL: Rgb = [92, 110, 130]
const LINE: Rgb = [184, 184, 184]
const BORDER: Rgb = [217, 217, 217]
const LIGHT: Rgb = [232, 238, 246]
const WHITE: Rgb = [255, 255, 255]

const PAGE_W = 210
const PAGE_H = 297
const LEFT = 12
const WIDTH = 186
const PAD = 6
const INSET = LEFT + PAD
const INNER = WIDTH - PAD * 2
const GAP = 4
const ROW = 9

const DAYS: Array<[string, string]> = [
  ['M', 'monday'],
  ['T', 'tuesday'],
  ['W', 'wednesday'],
  ['T', 'thursday'],
  ['F', 'friday'],
  ['S', 'saturday'],
  ['S', 'sunday'],
]

function pdfName(fileName: string) {
  const base = fileName.replace(/\.(pdf|doc|docx|html|htm)$/i, '').trim() || 'Starter-Form'
  return `${base}.pdf`
}

function isPdf(bytes: ArrayBuffer) {
  const head = new TextDecoder().decode(bytes.slice(0, 5))
  return head.startsWith('%PDF')
}

function isHtml(bytes: ArrayBuffer) {
  const head = new TextDecoder().decode(bytes.slice(0, 256)).trim().toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html')
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function blank(value: string) {
  return value.trim()
}

function valueLines(pdf: Pdf, width: number, value: string) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  const text = blank(value)
  if (!text) return ['' as string]
  return pdf.splitTextToSize(text, width) as string[]
}

function fieldHeight(pdf: Pdf, width: number, value: string) {
  return Math.max(ROW, 5.6 + valueLines(pdf, width, value).length * 3.7)
}

function drawField(pdf: Pdf, x: number, y: number, width: number, height: number, label: string, value: string) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...LABEL)
  pdf.text(label.toUpperCase(), x, y + 2.7)
  pdf.setFontSize(10)
  pdf.setTextColor(...NAVY)
  const lines = valueLines(pdf, width, value)
  pdf.text(lines, x, y + 6.4)
  pdf.setDrawColor(...LINE)
  pdf.setLineWidth(0.25)
  pdf.line(x, y + height - 1.1, x + width, y + height - 1.1)
}

function drawRow(
  pdf: Pdf,
  y: number,
  cells: Array<{ label: string; value: string; span?: number }>,
) {
  const gaps = GAP * Math.max(0, cells.length - 1)
  const units = cells.reduce((sum, cell) => sum + (cell.span ?? 1), 0)
  const unit = (INNER - gaps) / units
  let x = INSET
  const laid = cells.map((cell) => {
    const width = unit * (cell.span ?? 1)
    const item = { ...cell, x, width, height: fieldHeight(pdf, width, cell.value) }
    x += width + GAP
    return item
  })
  const height = Math.max(...laid.map((cell) => cell.height))
  for (const cell of laid) {
    drawField(pdf, cell.x, y, cell.width, height, cell.label, cell.value)
  }
  return height
}

function sectionHeader(pdf: Pdf, y: number, title: string) {
  pdf.setFillColor(...NAVY)
  pdf.rect(LEFT, y, WIDTH, 6.6, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...WHITE)
  pdf.text(title.toUpperCase(), INSET, y + 4.4)
  return y + 6.6
}

function closeSection(pdf: Pdf, start: number, y: number) {
  pdf.setDrawColor(...BORDER)
  pdf.setLineWidth(0.3)
  pdf.rect(LEFT, start, WIDTH, y - start, 'S')
}

function pill(pdf: Pdf, x: number, y: number, width: number, height: number, label: string, on: boolean) {
  pdf.setLineWidth(0.35)
  pdf.setDrawColor(...NAVY)
  pdf.setFillColor(...(on ? NAVY : WHITE))
  pdf.roundedRect(x, y, width, height, 1.1, 1.1, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...(on ? WHITE : NAVY))
  pdf.text(label, x + width / 2, y + height / 2 + 1.1, { align: 'center' })
}

function drawDays(pdf: Pdf, x: number, y: number, selected: string[]) {
  const on = new Set(selected.map((day) => day.toLowerCase()))
  DAYS.forEach(([letter, name], index) => {
    pill(pdf, x + index * 8.2, y, 7.2, 7.2, letter, on.has(name))
  })
}

function drawYesNo(pdf: Pdf, x: number, y: number, value: string) {
  const selected = value.trim().toLowerCase()
  pill(pdf, x, y, 16, 7.2, 'Yes', selected === 'yes')
  pill(pdf, x + 18, y, 16, 7.2, 'No', selected === 'no')
}

function drawStatement(pdf: Pdf, y: number, code: 'A' | 'B' | 'C', selected: string, copy: string) {
  const on = selected === code
  const boxX = INSET
  const boxW = INNER
  const markX = boxX + 5
  const textX = boxX + 11
  const textW = boxW - 16
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  const lines = pdf.splitTextToSize(copy, textW) as string[]
  const height = Math.max(10, 4.2 + lines.length * 3.6)
  pdf.setLineWidth(0.35)
  pdf.setDrawColor(...(on ? NAVY : BORDER))
  pdf.setFillColor(...(on ? LIGHT : WHITE))
  pdf.roundedRect(boxX, y, boxW, height, 1.2, 1.2, 'FD')
  const cy = y + height / 2
  pdf.setDrawColor(...NAVY)
  pdf.setFillColor(...(on ? NAVY : WHITE))
  pdf.circle(markX, cy, 2.5, 'FD')
  if (!on) {
    pdf.setDrawColor(...NAVY)
    pdf.circle(markX, cy, 2.5, 'S')
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...(on ? WHITE : NAVY))
  pdf.text(code, markX, cy + 1.05, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...NAVY)
  pdf.text(lines, textX, y + 4.4)
  return height
}

async function logoDataUrl() {
  try {
    const blob = await fetch(formLogo).then((response) => response.blob())
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

function drawForm(pdf: Pdf, data: StarterFormData, logo: string) {
  let y = 10

  if (logo) {
    try {
      const props = pdf.getImageProperties(logo)
      const logoH = 8
      const logoW = Math.min(34, (props.width / props.height) * logoH)
      const format = logo.includes('image/jpeg') ? 'JPEG' : 'PNG'
      pdf.addImage(logo, format, LEFT, y, logoW, logoH)
    } catch {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(...NAVY)
      pdf.text('Cedar Payroll', LEFT, y + 6)
    }
  } else {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...NAVY)
    pdf.text('Cedar Payroll', LEFT, y + 6)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(...NAVY)
  pdf.text('HR-1', LEFT + WIDTH, y + 5, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...LABEL)
  pdf.text('Employee Starter Form', LEFT + WIDTH, y + 9, { align: 'right' })

  y += 14
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(...NAVY)
  pdf.text('Employee Starter Form', PAGE_W / 2, y, { align: 'center' })
  y += 3
  pdf.setFillColor(...RED)
  pdf.rect(LEFT, y, WIDTH, 0.9, 'F')
  y += 5

  let start = y
  y = sectionHeader(pdf, y, 'Employer full name')
  y += 3
  y += drawRow(pdf, y, [{ label: 'Employer', value: data.employerName }])
  y += 3
  closeSection(pdf, start, y)
  y += 3.5

  start = y
  y = sectionHeader(pdf, y, 'Employee personal details')
  y += 2.5
  y += drawRow(pdf, y, [
    { label: 'Title', value: data.title },
    { label: 'Gender (M/F)', value: data.gender },
    { label: 'Marital status', value: data.maritalStatus },
  ])
  y += drawRow(pdf, y, [
    { label: 'First name', value: data.firstNames },
    { label: 'Middle name', value: data.middleName },
    { label: 'Last name', value: data.lastName },
  ])
  y += drawRow(pdf, y, [
    { label: 'Date of birth', value: data.dob },
    { label: 'National Insurance number', value: data.niNumber, span: 2 },
  ])
  y += drawRow(pdf, y, [{ label: 'Address', value: data.address, span: 3 }])
  y += drawRow(pdf, y, [
    { label: 'Town', value: data.town },
    { label: 'County', value: data.county },
    { label: 'Postcode', value: data.postcode },
  ])
  y += drawRow(pdf, y, [
    { label: 'Passport no.', value: data.passportNo },
    { label: 'Tel no.', value: data.phone },
    { label: 'Email', value: data.email },
  ])
  y += 2.5
  closeSection(pdf, start, y)
  y += 3.5

  start = y
  y = sectionHeader(pdf, y, 'Employment details')
  y += 2.5
  y += drawRow(pdf, y, [
    { label: 'Start date', value: data.startDate },
    { label: 'Department', value: data.department },
    { label: 'Director', value: data.director },
  ])
  y += drawRow(pdf, y, [
    { label: 'Salary rate', value: data.salaryRate },
    { label: 'Hourly rate', value: data.hourlyRate },
    { label: 'Hours per week', value: data.hoursPerWeek },
  ])

  const hoursValue = blank(data.hoursPerDay) ? `${blank(data.hoursPerDay)} hours` : ''
  const dayRow = drawRow(pdf, y, [
    { label: 'Days per week', value: data.daysPerWeek },
    { label: 'Hours per day / working days', value: hoursValue, span: 2 },
  ])
  const colW = (INNER - GAP * 2) / 3
  const dayX = INSET + colW + GAP
  drawDays(pdf, dayX, y + dayRow + 0.6, data.workingDays)
  y += dayRow + 9

  const loanW = colW
  const loanH = fieldHeight(pdf, loanW, data.studentLoan)
  const p45H = 12
  const rowH = Math.max(loanH, p45H)
  drawField(pdf, INSET, y, loanW, rowH, 'Student loan to be repaid', data.studentLoan)
  const p45X = INSET + loanW + GAP
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(...LABEL)
  pdf.text('P45 ATTACHED / TO FOLLOW', p45X, y + 3)
  drawYesNo(pdf, p45X, y + 4.6, data.p45)
  y += rowH + 2.5
  closeSection(pdf, start, y)
  y += 3.5

  start = y
  y = sectionHeader(pdf, y, 'Employee statement')
  y += 3
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...NAVY)
  pdf.text('Please select only one of the following statements', INSET, y)
  y += 3
  y +=
    drawStatement(
      pdf,
      y,
      'A',
      data.starterDeclaration,
      'This is my first job since last April and I have not received any taxable allowances, benefits or pensions.',
    ) + 1.6
  y +=
    drawStatement(
      pdf,
      y,
      'B',
      data.starterDeclaration,
      'This is now my only job, but since last April I have had another job, or received taxable allowances or incapacity benefit. I do not receive a state or occupational pension.',
    ) + 1.6
  y +=
    drawStatement(
      pdf,
      y,
      'C',
      data.starterDeclaration,
      'As well as my new job, I have another job or receive a state or occupational pension.',
    ) + 2.5
  closeSection(pdf, start, y)
  y += 3.5

  start = y
  y = sectionHeader(pdf, y, 'Bank details')
  y += 2.5
  y += drawRow(pdf, y, [
    { label: 'Name of bank', value: data.bankName },
    { label: 'Branch name', value: data.branchName },
  ])
  y += drawRow(pdf, y, [
    { label: 'Sort code', value: data.sortCode },
    { label: 'Account name', value: data.accountName },
  ])
  y += drawRow(pdf, y, [
    { label: 'Account number', value: data.accountNumber },
    { label: 'Building society reference / roll no.', value: data.buildingSocietyRef },
  ])
  y += 2.5
  closeSection(pdf, start, y)

  const foot = Math.max(y + 8, PAGE_H - 10)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...LABEL)
  pdf.text('Cedar Payroll', LEFT, foot)
  pdf.text('Version 1', PAGE_W / 2, foot, { align: 'center' })
  pdf.text(`Date: ${blank(data.createdOn)}`, LEFT + WIDTH, foot, { align: 'right' })
}

export async function buildStarterFormPdf(data: StarterFormData) {
  const logo = await logoDataUrl()
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  drawForm(pdf, data, logo)
  return pdf.output('blob')
}

async function htmlToPdfBlob(html: string) {
  const [{ default: html2canvas }, { jsPDF: PdfCtor }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '794px'
  iframe.style.height = '1600px'
  iframe.style.border = '0'
  iframe.style.pointerEvents = 'none'
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Could not prepare the starter form PDF')
    doc.open()
    doc.write(html)
    doc.close()
    await wait(300)
    await doc.fonts?.ready.catch(() => undefined)

    const target = (doc.querySelector('.starter-sheet') as HTMLElement | null) ?? doc.body
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    })

    const pdf = new PdfCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 8
    const usableW = pageWidth - margin * 2
    const usableH = pageHeight - margin * 2
    let imgWidth = usableW
    let imgHeight = (canvas.height * imgWidth) / canvas.width
    if (imgHeight > usableH) {
      imgWidth *= usableH / imgHeight
      imgHeight = usableH
    }
    const x = (pageWidth - imgWidth) / 2
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, margin, imgWidth, imgHeight)
    return pdf.output('blob')
  } finally {
    iframe.remove()
  }
}

export function starterFormPdfFilename(fileName: string) {
  return pdfName(fileName)
}

export async function starterFormPdfFromHtml(html: string) {
  return htmlToPdfBlob(html)
}

export async function starterFormDownloadBlob(file: Blob) {
  const buffer = await file.arrayBuffer()
  if (isPdf(buffer)) {
    return new Blob([buffer], { type: 'application/pdf' })
  }
  if (isHtml(buffer)) {
    return htmlToPdfBlob(new TextDecoder().decode(buffer))
  }
  return file
}
