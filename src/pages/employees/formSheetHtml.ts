import type { FormPreview } from './formPreview'
import type { FormType } from './formsOptions'
import { P11_CSS, p11BodyHtml } from './p11Template'
import { P45_CSS, p45BodyHtml } from './p45Template'
import { P60_CSS, p60BodyHtml } from './p60Template'
import { P11D_CSS, p11dBodyHtml } from './p11dTemplate'
import { PBIK_CSS, pbikBodyHtml } from './pbikTemplate'
import { employeeName, esc, slug } from './sheetFormat'

type SheetTemplate = {
  label: string
  css: string
  body: (data: FormPreview, logoSrc: string) => string
  subtitle: (data: FormPreview) => string
}

const TEMPLATES: Partial<Record<FormType, SheetTemplate>> = {
  p45: {
    label: 'P45',
    css: P45_CSS,
    body: p45BodyHtml,
    subtitle: (data) => `Details of employee leaving work ${data.tax_year?.name ?? ''}`.trim(),
  },
  p11: {
    label: 'P11',
    css: P11_CSS,
    body: p11BodyHtml,
    subtitle: (data) => `Deductions Working Sheet ${data.tax_year?.name ?? ''}`.trim(),
  },
  p60: {
    label: 'P60',
    css: P60_CSS,
    body: p60BodyHtml,
    subtitle: (data) => `End of Year Certificate ${data.tax_year?.name ?? ''}`.trim(),
  },
  p11d: {
    label: 'P11D',
    css: P11D_CSS,
    body: p11dBodyHtml,
    subtitle: (data) => `Expenses and Benefits ${data.tax_year?.name ?? ''}`.trim(),
  },
  pbik: {
    label: 'PBIK',
    css: PBIK_CSS,
    body: pbikBodyHtml,
    subtitle: (data) => `Payrolled Benefits In Kind ${data.tax_year?.name ?? ''}`.trim(),
  },
}

export function hasSheetTemplate(type: FormType) {
  return Boolean(TEMPLATES[type])
}

function template(type: FormType) {
  const found = TEMPLATES[type]
  if (!found) throw new Error('This form does not have a PDF template yet.')
  return found
}

export function sheetLabel(type: FormType) {
  return template(type).label
}

export function sheetTitle(type: FormType, data: FormPreview) {
  const { label } = template(type)
  return `${label} ${employeeName(data)} ${data.tax_year?.name ?? ''}`.trim()
}

export function sheetPackTitle(type: FormType, taxYearName: string) {
  return `${template(type).label} ${taxYearName}`.trim()
}

export function sheetFilename(type: FormType, data: FormPreview) {
  const { label } = template(type)
  const name = slug(employeeName(data))
  const year = (data.tax_year?.name ?? '').replaceAll('/', '-')
  return `${label}-${name || 'employee'}-${year || 'tax-year'}.html`
}

export function sheetDocument(type: FormType, bodies: string[], title: string) {
  const pages = bodies
    .map((body) =>
      body.includes('class="sheet-page"') ? body : `<section class="sheet-page">${body}</section>`,
    )
    .join('')
  const pageWidth = type === 'p11' ? 1160 : 830
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${pageWidth}, initial-scale=1" />
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>${template(type).css}</style>
  </head>
  <body>${pages}</body>
</html>`
}

export function sheetBodyHtml(
  type: FormType,
  data: FormPreview,
  logoSrc: string,
  options?: { p45Parts?: string[] },
) {
  const payload = options?.p45Parts ? { ...data, p45_parts: options.p45Parts } : data
  return template(type).body(payload, logoSrc)
}

export function renderFormSheet(
  type: FormType,
  data: FormPreview,
  logoSrc: string,
  options?: { p45Parts?: string[] },
) {
  const body = sheetBodyHtml(type, data, logoSrc, options)
  const title = sheetTitle(type, data)
  return {
    data,
    body,
    title,
    filename: sheetFilename(type, data),
    html: sheetDocument(type, [body], title),
  }
}
