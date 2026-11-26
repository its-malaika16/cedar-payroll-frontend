export type CsvTemplateColumn = {
  id: string
  label: string
  group: string
  required?: boolean
  header?: string
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function aliasMatches(headerKey: string, alias: string) {
  const key = normalise(alias)
  if (!key) return false
  if (key === headerKey) return true
  if (key.replace(/\s+/g, '') === headerKey.replace(/\s+/g, '')) return true
  const headerWords = headerKey.split(' ').filter(Boolean)
  return key.split(' ').filter(Boolean).every((word) => headerWords.includes(word))
}

function titleCase(value: string) {
  return value.replace(/(^|\s)([a-z])/g, (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`)
}

export function csvTemplateHeader(label: string, aliases: string[]) {
  const key = normalise(label)
  if (aliases.some((alias) => aliasMatches(key, alias))) return label
  const ranked = [...aliases].sort((left, right) => {
    const leftShared = normalise(left).split(' ').filter((word) => key.split(' ').includes(word)).length
    const rightShared = normalise(right).split(' ').filter((word) => key.split(' ').includes(word)).length
    return rightShared - leftShared || right.length - left.length
  })
  return titleCase(ranked[0] ?? label)
}

export function assignCsvHeaders(
  fields: Array<{ id: string; label: string; group: string; required?: boolean; aliases: string[] }>,
): CsvTemplateColumn[] {
  const used = new Set<string>()
  return fields.map((field) => {
    const preferred = csvTemplateHeader(field.label, field.aliases)
    const candidates = [
      preferred,
      field.label,
      ...[...field.aliases].sort((left, right) => right.length - left.length).map(titleCase),
    ]
    const header =
      candidates.find((candidate) => {
        const key = normalise(candidate)
        return key && !used.has(key) && field.aliases.some((alias) => aliasMatches(key, alias))
      }) ?? preferred
    used.add(normalise(header))
    return {
      id: field.id,
      label: field.label,
      group: field.group,
      required: field.required,
      header,
    }
  })
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function downloadCsvTemplate(filename: string, columns: CsvTemplateColumn[]) {
  const header = columns.map((column) => csvCell(column.header || column.label)).join(',')
  const blob = new Blob([`\uFEFF${header}\r\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
