import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { fullName, idOf } from '../../lib/format'
import type { PayrollRecord } from '../../types'

const ghostBtn =
  'inline-flex h-10 items-center justify-center gap-1 rounded-[8px] border border-navy px-4 text-sm font-medium text-navy hover:bg-white disabled:cursor-not-allowed disabled:opacity-40'
const primaryBtn =
  'inline-flex h-10 items-center justify-center gap-1 rounded-[8px] bg-navy px-4 text-sm font-medium text-white hover:bg-navy-mid disabled:cursor-not-allowed disabled:bg-[#d9d9d9]'

function isFinalised(record: PayrollRecord) {
  return (record.status ?? '').toUpperCase() === 'FINALISED'
}

export function FinaliseEmployeesModal({
  records,
  saving,
  onClose,
  onConfirm,
}: {
  records: PayrollRecord[]
  saving?: boolean
  onClose: () => void
  onConfirm: (recordIds: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const ids = records.map((record) => idOf(record)).filter(Boolean)
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id))

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAll() {
    setSelected(allSelected ? [] : ids)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] bg-cream shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e6e4df] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-navy">Finalise payslips</h2>
            <p className="mt-1 text-sm text-navy/65">
              Choose which employees to finalise. Nobody is selected until you pick them.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-navy/60 hover:bg-white hover:text-navy"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {records.length === 0 ? (
            <p className="text-sm text-navy/70">No employees in this pay run.</p>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-[#e6e4df] bg-white">
              <label className="flex cursor-pointer items-center gap-3 border-b border-[#eee] px-4 py-3 hover:bg-[#f0f5fe]">
                <input
                  type="checkbox"
                  className="size-4 accent-navy"
                  checked={allSelected}
                  onChange={toggleAll}
                />
                <span className="text-sm font-semibold text-navy">Select all</span>
              </label>
              <div className="max-h-[48vh] overflow-auto">
                {records.map((record) => {
                  const recordId = idOf(record)
                  const name = fullName(record.employees?.first_name, record.employees?.last_name)
                  const done = isFinalised(record)
                  return (
                    <label
                      key={recordId}
                      className="flex cursor-pointer items-center gap-3 border-b border-[#eee] px-4 py-2.5 last:border-0 hover:bg-[#f0f5fe]"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-navy"
                        checked={selected.includes(recordId)}
                        onChange={() => toggle(recordId)}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
                        {name === '—' ? 'Employee' : name}
                      </span>
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-navy/55">
                          <Check size={12} />
                          Finalised
                        </span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e6e4df] bg-white px-6 py-4">
          <button type="button" className={ghostBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={saving || selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {saving
              ? 'Finalising…'
              : `Finalise ${selected.length || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}
