import formLogo from '../../assets/brand/logo-forms.png'
import type { FormPreview } from './formPreview'
import type { FormType } from './formsOptions'
import { P11_CSS, p11BodyHtml } from './p11Template'
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
  const pages = bodies.map((body) => `<section class="sheet-page">${body}</section>`).join('')
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>${template(type).css}</style>
  </head>
  <body>${pages}</body>
</html>`
}

let logoPromise: Promise<string> | null = null

export async function sheetLogoDataUrl() {
  if (!logoPromise) {
    logoPromise = fetch(formLogo)
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
  }
  return logoPromise
}

export function sheetBodyHtml(type: FormType, data: FormPreview, logoSrc: string) {
  return template(type).body(data, logoSrc)
}

export async function sheetsFromPreviews(type: FormType, items: FormPreview[]) {
  const logo = await sheetLogoDataUrl()
  return items.map((data) => {
    const body = template(type).body(data, logo)
    const title = sheetTitle(type, data)
    return {
      data,
      body,
      title,
      filename: sheetFilename(type, data),
      html: sheetDocument(type, [body], title),
    }
  })
}

export function openSheetPlaceholder(type: FormType, title: string) {
  const { label } = template(type)
  const popup = window.open('', '_blank')
  if (!popup) {
    throw new Error(`Allow pop-ups to view or save the ${label} PDF.`)
  }
  popup.document.open()
  popup.document.write(
    `<!doctype html><html><head><meta charset="utf-8" /><title>${esc(title)}</title></head><body style="font-family:Montserrat,Arial,sans-serif;color:#17375e;padding:24px">Preparing ${esc(label)}…</body></html>`,
  )
  popup.document.close()
  return popup
}

export function writeSheetToWindow(
  popup: Window,
  type: FormType,
  bodies: string[],
  title: string,
  print = false,
) {
  popup.document.open()
  popup.document.write(sheetDocument(type, bodies, title))
  popup.document.close()
  popup.document.title = title
  popup.focus()
  if (print) {
    window.setTimeout(() => {
      try {
        popup.print()
      } catch {
        /* print may already have started */
      }
    }, 400)
  }
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function concatBytes(...parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function u16(value: number) {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

function u32(value: number) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true)
  return bytes
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function zipUtf8Files(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder()
  return zipBinaryFiles(
    files.map((file) => ({ name: file.name, data: encoder.encode(file.content) })),
  )
}

export function zipBinaryFiles(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name.replaceAll('\\', '/'))
    const data = file.data
    const crc = crc32(data)
    const local = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    )
    locals.push(local)
    centrals.push(
      concatBytes(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ),
    )
    offset += local.length
  }
  const centralDir = concatBytes(...centrals)
  const end = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  )
  return new Blob([concatBytes(...locals, centralDir, end)], { type: 'application/zip' })
}

export { formLogo as sheetLogoSrc }
