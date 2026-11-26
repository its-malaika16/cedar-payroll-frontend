import { useMemo, useState } from 'react'
import { CircleEllipsis, Download, Import, Upload } from 'lucide-react'
import { CsvTemplateDialog } from '../../components/CsvTemplateDownload'
import { assignCsvHeaders } from '../../components/csvTemplate'
import { menuItemClass, menuPanel, useMenuOpen } from './CreateSendMenu'
import { IMPORT_KIND_LABEL, fieldsForKind, type PayrollImportKind } from './payrollCsv'

const MIX_ITEM = {
  id: 'mix' as const,
  label: 'Import mix of payments, additions and deductions from CSV file...',
}

const TYPED_ITEMS = [
  { id: 'weekly', label: 'Import Weekly Payments from CSV File...' },
  { id: 'daily', label: 'Import Daily Payments from CSV File...' },
  { id: 'hourly', label: 'Import Hourly Payments from CSV File...' },
  { id: 'additions', label: 'Import Additions from CSV File...' },
  { id: 'deductions', label: 'Import Deductions from CSV File...' },
  { id: 'notes', label: 'Import Notes from CSV File...' },
] as const

export function PayrollImportMenu({
  onImport,
  onShowReferences,
}: {
  onImport: (kind: PayrollImportKind) => void
  onShowReferences?: () => void
}) {
  const { ref, open, setOpen } = useMenuOpen()
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateKind, setTemplateKind] = useState<PayrollImportKind>('mix')
  const templateColumns = useMemo(
    () =>
      assignCsvHeaders(
        fieldsForKind(templateKind).map((field) => ({
          ...field,
          required: field.id === 'first_name' || field.id === 'last_name',
        })),
      ),
    [templateKind],
  )

  function choose(kind: PayrollImportKind) {
    setOpen(false)
    onImport(kind)
  }

  return (
    <div className="relative" ref={ref} data-menu>
      <button
        type="button"
        aria-label="Import from CSV"
        className="flex h-[47px] w-[49px] items-center justify-center rounded-[8px] bg-navy text-white hover:bg-[#123052]"
        onClick={() => setOpen((value) => !value)}
      >
        <Upload size={20} />
      </button>
      {open ? (
        <div className={`${menuPanel} right-0 w-[420px]`}>
          <button type="button" className={menuItemClass} onClick={() => choose(MIX_ITEM.id)}>
            <Import size={14} className="shrink-0" />
            {MIX_ITEM.label}
          </button>
          <div className="my-1 border-t border-[#d9d9d9]" />
          {TYPED_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menuItemClass}
              onClick={() => choose(item.id)}
            >
              <Import size={14} className="shrink-0" />
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[#d9d9d9]" />
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              setOpen(false)
              setTemplateOpen(true)
            }}
          >
            <Download size={14} className="shrink-0" />
            Download CSV template...
          </button>
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              setOpen(false)
              onShowReferences?.()
            }}
          >
            <CircleEllipsis size={14} className="shrink-0" />
            CSV Import References...
          </button>
        </div>
      ) : null}
      {templateOpen ? (
        <CsvTemplateDialog
          title="Payroll CSV template"
          description="Choose the import and the columns to include. First name and last name stay in the file so each row can be matched to an employee."
          filename={`payroll-${templateKind}-template.csv`}
          columns={templateColumns}
          onClose={() => setTemplateOpen(false)}
          extra={
            <label className="block text-sm text-navy">
              <span className="mb-1 block text-xs font-medium">Import</span>
              <select
                className="h-10 w-full rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy"
                value={templateKind}
                onChange={(event) => setTemplateKind(event.target.value as PayrollImportKind)}
              >
                {(Object.keys(IMPORT_KIND_LABEL) as PayrollImportKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {IMPORT_KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
            </label>
          }
        />
      ) : null}
    </div>
  )
}
