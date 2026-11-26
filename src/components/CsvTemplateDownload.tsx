import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { downloadCsvTemplate, type CsvTemplateColumn } from './csvTemplate'
import { Button } from './ui'

export function CsvTemplateDialog({
  title,
  description,
  filename,
  columns,
  onClose,
  extra,
}: {
  title: string
  description: string
  filename: string
  columns: CsvTemplateColumn[]
  onClose: () => void
  extra?: ReactNode
}) {
  const columnKey = columns.map((column) => column.id).join('|')
  const [picked, setPicked] = useState<{ key: string; ids: Set<string> } | null>(null)
  const selected =
    picked && picked.key === columnKey ? picked.ids : new Set(columns.map((column) => column.id))

  function choose(ids: Set<string>) {
    setPicked({ key: columnKey, ids })
  }

  const groups = useMemo(() => {
    const order: string[] = []
    for (const column of columns) {
      if (!order.includes(column.group)) order.push(column.group)
    }
    return order.map((group) => ({
      group,
      columns: columns.filter((column) => column.group === group),
    }))
  }, [columns])

  function isOn(column: CsvTemplateColumn) {
    return column.required || selected.has(column.id)
  }

  function toggle(column: CsvTemplateColumn) {
    if (column.required) return
    const next = new Set(selected)
    if (next.has(column.id)) next.delete(column.id)
    else next.add(column.id)
    choose(next)
  }

  function toggleGroup(groupColumns: CsvTemplateColumn[]) {
    const optional = groupColumns.filter((column) => !column.required)
    const allOn = optional.every((column) => selected.has(column.id))
    const next = new Set(selected)
    for (const column of optional) {
      if (allOn) next.delete(column.id)
      else next.add(column.id)
    }
    choose(next)
  }

  const chosen = columns.filter(isOn)

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4 py-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-template-title"
        className="flex max-h-[90vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[16px] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="csv-template-title" className="text-lg font-semibold text-navy">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
          <Button type="button" variant="secondary" className="h-10 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
        {extra ? <div className="mt-4">{extra}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 text-xs"
            onClick={() => choose(new Set(columns.map((column) => column.id)))}
          >
            All columns
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 text-xs"
            onClick={() => choose(new Set(columns.filter((column) => column.required).map((column) => column.id)))}
          >
            Required only
          </Button>
        </div>
        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {groups.map(({ group, columns: groupColumns }) => (
            <section key={group}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold tracking-[0.06em] text-navy">{group.toUpperCase()}</h4>
                {groupColumns.some((column) => !column.required) ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-navy underline"
                    onClick={() => toggleGroup(groupColumns)}
                  >
                    {groupColumns.filter((column) => !column.required).every((column) => selected.has(column.id))
                      ? 'Clear optional'
                      : 'Select group'}
                  </button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupColumns.map((column) => (
                  <label key={column.id} className="flex items-start gap-2 text-sm text-navy">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={isOn(column)}
                      disabled={column.required}
                      onChange={() => toggle(column)}
                    />
                    <span>
                      {column.label}
                      {column.required ? <span className="text-muted"> (required)</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eceae6] pt-4">
          <p className="text-xs text-muted">{chosen.length} columns</p>
          <Button
            type="button"
            className="h-10 text-xs"
            onClick={() => {
              downloadCsvTemplate(filename, chosen)
              onClose()
            }}
          >
            Download template
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
