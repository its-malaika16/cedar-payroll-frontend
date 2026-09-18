import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui'

export type ReportTable = {
  heading?: string
  headers: string[]
  rows: string[][]
}

export function reportFileSlug(name: string) {
  return name.replaceAll(' ', '-').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'report'
}

export function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function downloadCsv(filename: string, rows: string[][]) {
  const text = `\uFEFF${rows.map((row) => row.map((cell) => csvEscape(cell ?? '')).join(',')).join('\n')}`
  downloadFile(new Blob([text], { type: 'text/csv;charset=utf-8' }), withExt(filename, 'csv'))
}

export function downloadReportPdf(input: {
  filename: string
  title: string
  subtitle?: string
  sections: ReportTable[]
}) {
  const blob = buildTablePdf(input)
  downloadFile(blob, withExt(input.filename, 'pdf'))
}

export function ReportExportMenu({
  onCsv,
  onPdf,
  disabled,
}: {
  onCsv: () => void
  onPdf: () => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => setOpen((value) => !value)}>
        Export {open ? '▴' : '▾'}
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[180px] rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-sm">
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
            onClick={() => {
              setOpen(false)
              onCsv()
            }}
          >
            Export as CSV
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
            onClick={() => {
              setOpen(false)
              onPdf()
            }}
          >
            Export as PDF
          </button>
        </div>
      ) : null}
    </div>
  )
}

function withExt(name: string, ext: string) {
  return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const PAGE_W = 842
const PAGE_H = 595
const MARGIN = 36

function buildTablePdf(input: {
  title: string
  subtitle?: string
  sections: ReportTable[]
}) {
  const pages: string[] = []
  let commands: string[] = []
  let y = PAGE_H - MARGIN

  function flush() {
    pages.push(commands.join('\n'))
    commands = []
    y = PAGE_H - MARGIN
  }

  function ensure(height: number) {
    if (y - height < MARGIN) flush()
  }

  function text(x: number, posY: number, value: string, size: number, rgb = '0.09 0.216 0.369') {
    commands.push(
      'BT',
      `${rgb} rg`,
      `/F1 ${size} Tf`,
      `1 0 0 1 ${n(x)} ${n(posY)} Tm`,
      `(${pdfString(value)}) Tj`,
      'ET',
    )
  }

  function rect(x: number, posY: number, w: number, h: number, fill?: string, stroke = true) {
    if (fill) commands.push(`${fill} rg`, `${n(x)} ${n(posY)} ${n(w)} ${n(h)} re f`)
    if (stroke) {
      commands.push('0.85 0.85 0.85 RG', '0.4 w', `${n(x)} ${n(posY)} ${n(w)} ${n(h)} re S`)
    }
  }

  ensure(28)
  text(MARGIN, y - 12, input.title, 14)
  y -= 20
  if (input.subtitle) {
    text(MARGIN, y - 10, input.subtitle, 9)
    y -= 16
  }
  y -= 6

  const sections = input.sections.length ? input.sections : [{ headers: [], rows: [] }]
  for (const section of sections) {
    if (section.heading) {
      ensure(20)
      text(MARGIN, y - 10, section.heading, 10)
      y -= 18
    }
    const headers = section.headers
    if (!headers.length) continue
    const usable = PAGE_W - MARGIN * 2
    const colW = usable / headers.length
    const fontSize = colW < 48 ? 6.5 : colW < 70 ? 7.5 : 8.5
    const lineH = fontSize + 4

    const drawRow = (cells: string[], header: boolean) => {
      const lines = cells.map((cell) => wrapCell(cell, colW - 6, fontSize))
      const rowH = Math.max(lineH + 6, Math.max(...lines.map((item) => item.length)) * lineH + 6)
      ensure(rowH)
      const top = y
      const bottom = y - rowH
      for (let i = 0; i < cells.length; i += 1) {
        const x = MARGIN + i * colW
        rect(x, bottom, colW, rowH, header ? '0.973 0.969 0.957' : undefined)
        lines[i].forEach((line, lineIndex) => {
          text(x + 3, top - 4 - fontSize - lineIndex * lineH, line, fontSize)
        })
      }
      y -= rowH
    }

    drawRow(headers, true)
    for (const row of section.rows) {
      drawRow(
        headers.map((_, index) => row[index] ?? ''),
        false,
      )
    }
    y -= 12
  }

  if (commands.length) flush()
  if (!pages.length) pages.push('')
  return pdfFromPages(pages)
}

function wrapCell(value: string, maxWidth: number, fontSize: number) {
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * 0.5)))
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ['']
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    if (word.length > maxChars) {
      for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars))
      current = ''
    } else {
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

function n(value: number) {
  return value.toFixed(2)
}

function pdfString(value: string) {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 32
    if (char === '\\' || char === '(' || char === ')') {
      out += `\\${char}`
    } else if (code === 0xa3) {
      out += '\\243'
    } else if (code === 0x2013 || code === 0x2014 || code === 0x2011) {
      out += '-'
    } else if (code === 0x2018 || code === 0x2019) {
      out += "'"
    } else if (code === 0x201c || code === 0x201d) {
      out += '"'
    } else if (code > 127) {
      out += '?'
    } else if (code < 32) {
      out += ' '
    } else {
      out += char
    }
  }
  return out
}

function pdfFromPages(contentStreams: string[]) {
  const objects = new Map<number, string>()
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objects.set(
    3,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  )

  const pageIds: number[] = []
  let nextId = 4
  for (const stream of contentStreams) {
    const contentId = nextId
    nextId += 1
    const pageId = nextId
    nextId += 1
    pageIds.push(pageId)
    const payload = stream.endsWith('\n') ? stream : `${stream}\n`
    objects.set(contentId, `<< /Length ${byteLength(payload)} >>\nstream\n${payload}endstream`)
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Rotate 0 /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    )
  }
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  )

  const maxId = Math.max(...objects.keys())
  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = body.length
    body += `${id} 0 obj\n${objects.get(id) ?? '<< >>'}\nendobj\n`
  }
  const xref = body.length
  let xrefTable = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= maxId; id += 1) {
    xrefTable += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  body += `${xrefTable}trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([body], { type: 'application/pdf' })
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}
