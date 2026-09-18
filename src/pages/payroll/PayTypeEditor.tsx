import { type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/ui'
import {
  CALCULATION_METHODS,
  REPETITION_OPTIONS,
  type PayTypeDraft,
  type PayTypeKind,
} from './payTypes'

const inputClass =
  'h-[35px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-navy">{label}</span>
      {children}
    </label>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm font-medium text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-navy"
      />
      <span>{label}</span>
    </label>
  )
}

function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm font-medium text-navy">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-3.5 shrink-0 accent-navy"
      />
      <span>{label}</span>
    </label>
  )
}

export function PayTypeEditor({
  kind,
  draft,
  onChange,
  onCancel,
  onSave,
  locked,
  error,
}: {
  kind: PayTypeKind
  draft: PayTypeDraft
  onChange: (draft: PayTypeDraft) => void
  onCancel: () => void
  onSave: () => void
  locked: boolean
  error?: string | null
}) {
  const isAddition = kind === 'addition'
  const title = isAddition ? 'New Addition Type' : 'New Deduction Type'
  const set = <K extends keyof PayTypeDraft>(key: K, value: PayTypeDraft[K]) =>
    onChange({ ...draft, [key]: value })

  return (
    <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-6">
      <button
        type="button"
        onClick={onCancel}
        className="mb-6 flex items-center gap-2 text-2xl font-semibold text-navy"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
        {title}
      </button>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        {error ? <p className="text-sm font-medium text-brand">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={draft.name}
              disabled={locked}
              onChange={(event) => set('name', event.target.value)}
              required
            />
          </Field>
          <Field label="Amount">
            <div className="flex">
              <span className="flex h-[35px] items-center rounded-l-[6px] border-[0.5px] border-r-0 border-[#d9d9d9] bg-white px-3 text-xs text-navy">
                £
              </span>
              <input
                className={`${inputClass} rounded-l-none`}
                value={draft.amount}
                disabled={locked}
                onChange={(event) => set('amount', event.target.value)}
              />
            </div>
          </Field>
          <Field label="Calculation method">
            <select
              className={inputClass}
              value={draft.calculationMethod}
              disabled={locked}
              onChange={(event) => set('calculationMethod', event.target.value)}
            >
              {CALCULATION_METHODS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Repetition">
            <select
              className={inputClass}
              value={draft.repetition}
              disabled={locked}
              onChange={(event) => set('repetition', event.target.value)}
            >
              {REPETITION_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="space-y-3">
          {isAddition ? (
            <>
              <CheckRow
                label="Tax can be deducted"
                checked={draft.tax}
                onChange={(checked) => set('tax', checked)}
              />
              <CheckRow
                label="NICs can be deducted"
                checked={draft.nics}
                onChange={(checked) => set('nics', checked)}
              />
              <CheckRow
                label="Employee pension can be deducted"
                checked={draft.employeePension}
                onChange={(checked) => set('employeePension', checked)}
              />
              <CheckRow
                label="Employer pension can be deducted"
                checked={draft.employerPension}
                onChange={(checked) => set('employerPension', checked)}
              />
              <CheckRow
                label="Contribute to gross for minimum wage"
                checked={draft.minWage}
                onChange={(checked) => set('minWage', checked)}
              />
              <CheckRow
                label="Notional — only calculate the tax, NICs and/or pension on the addition amount — do not add amount to the employee's pay"
                checked={draft.notional}
                onChange={(checked) => set('notional', checked)}
              />
            </>
          ) : (
            <>
              <CheckRow
                label="Deduct before tax"
                checked={draft.tax}
                onChange={(checked) => set('tax', checked)}
              />
              <CheckRow
                label="Deduct before NICs"
                checked={draft.nics}
                onChange={(checked) => set('nics', checked)}
              />
              <CheckRow
                label="Deduct before employee pension"
                checked={draft.employeePension}
                onChange={(checked) => set('employeePension', checked)}
              />
              <CheckRow
                label="Deduct before employer pension"
                checked={draft.employerPension}
                onChange={(checked) => set('employerPension', checked)}
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          <RadioRow
            label={isAddition ? 'This is one-off addition type' : 'This is one-off deduction type'}
            checked={draft.reuse === 'one-off'}
            onChange={() => set('reuse', 'one-off')}
          />
          <RadioRow
            label={
              isAddition
                ? 'Remember this addition type for use by any employee'
                : 'Remember this deduction type for use by any employee'
            }
            checked={draft.reuse === 'remember'}
            onChange={() => set('reuse', 'remember')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" className="min-w-[108px]" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="min-w-[108px]" disabled={locked}>
            Save
          </Button>
        </div>
      </form>
    </section>
  )
}
