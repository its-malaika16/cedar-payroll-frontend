import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, Plus, X } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { Employee } from '../../types'
import {
  BENEFIT_TYPES,
  benefitNumber,
  benefitTypeById,
  defaultValuesFor,
  type BenefitField,
  type BenefitType,
} from './benefitTypes'

type BenefitItem = {
  id: string
  typeId: string
  values: Record<string, string | boolean>
}

function newItem(type: BenefitType): BenefitItem {
  return {
    id: `${type.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    typeId: type.id,
    values: defaultValuesFor(type),
  }
}

export function EmployeeBenefitsPage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const addRef = useRef<HTMLDivElement>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [items, setItems] = useState<BenefitItem[]>([])
  const [saved, setSaved] = useState<BenefitItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]

  useEffect(() => {
    if (employeeId || employees.length === 0) return
    navigate(`/employees/benefits/${idOf(employees[0])}`, { replace: true })
  }, [employeeId, employees, navigate])

  useEffect(() => {
    setItems([])
    setSaved([])
    setActiveId(null)
    setAddOpen(false)
  }, [employeeId])

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!addRef.current?.contains(event.target as Node)) setAddOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const employee = employees.find((item) => idOf(item) === employeeId)
  const employeeName = fullName(employee?.first_name, employee?.last_name)
  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null
  const activeType = active ? benefitTypeById(active.typeId) : undefined

  function addBenefit(type: BenefitType) {
    const item = newItem(type)
    setItems((current) => [...current, item])
    setActiveId(item.id)
    setAddOpen(false)
  }

  function removeBenefit(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id)
      setActiveId((currentActive) => {
        if (currentActive !== id) return currentActive
        return next[next.length - 1]?.id ?? null
      })
      return next
    })
  }

  function setField(key: string, value: string | boolean) {
    if (!active) return
    setItems((current) =>
      current.map((item) =>
        item.id === active.id ? { ...item, values: { ...item.values, [key]: value } } : item,
      ),
    )
  }

  if (!employeeId) {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center">
        <p className="text-[32px] font-medium text-muted">Select an employee</p>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <h2 className="text-[28px] leading-none font-semibold text-navy">
        {employeeName === '—' ? 'Employee' : employeeName}{' '}
        <span className="font-medium text-[#607080]">Expenses & Benefits</span>
      </h2>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {items.length === 0 ? (
          <span className="rounded-[8px] border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#607080]">
            (No expenses/benefits)
          </span>
        ) : (
          items.map((item) => {
            const type = benefitTypeById(item.typeId)
            const selected = item.id === active?.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-medium ${
                  selected
                    ? 'border-navy bg-navy text-white'
                    : 'border-[#d9d9d9] bg-white text-navy hover:bg-[#f0f5fe]'
                }`}
              >
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-semibold ${
                    selected ? 'border-white/70' : 'border-navy'
                  }`}
                >
                  {type ? benefitNumber(type.id) : ''}
                </span>
                {type?.tabLabel}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${type?.tabLabel}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeBenefit(item.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    event.stopPropagation()
                    removeBenefit(item.id)
                  }}
                  className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                >
                  <X size={14} />
                </span>
              </button>
            )
          })
        )}

        <div ref={addRef} className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            className="inline-flex h-[39px] items-center gap-1 rounded-[8px] border border-navy bg-white px-3 text-sm font-medium text-navy"
          >
            <Plus size={15} />
            Add
            <ChevronDown size={15} />
          </button>
          {addOpen ? (
            <div className="absolute top-11 left-0 z-30 max-h-[420px] w-[460px] overflow-y-auto rounded-[10px] border border-[#d9d9d9] bg-white py-2 shadow-[0_8px_24px_rgba(23,55,94,0.12)]">
              {BENEFIT_TYPES.map((type, index) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => addBenefit(type)}
                  className="flex w-full items-start gap-3 px-4 py-2 text-left text-sm text-navy hover:bg-[#f0f5fe]"
                >
                  <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-navy px-1 text-[10px] font-semibold">
                    {index + 1}
                  </span>
                  <span>{type.menuLabel}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {active && activeType ? (
        <BenefitForm type={activeType} values={active.values} onChange={setField} />
      ) : (
        <div className="mt-8 flex min-h-[280px] items-center justify-center rounded-[10px] border border-[#d9d9d9] bg-white px-6">
          <p className="max-w-xl text-center text-sm leading-relaxed text-[#607080]">
            No expenses/benefits have been added for this employee. Click the + Add tab above to create
            one.
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Button className="min-w-[120px]" onClick={() => setSaved(items)}>
          Save
        </Button>
        <Button variant="secondary" className="min-w-[120px]" onClick={() => {
          setItems(saved)
          setActiveId(saved[saved.length - 1]?.id ?? null)
        }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function BenefitForm({
  type,
  values,
  onChange,
}: {
  type: BenefitType
  values: Record<string, string | boolean>
  onChange: (key: string, value: string | boolean) => void
}) {
  return (
    <div className="mt-6 grid gap-x-16 gap-y-2 md:grid-cols-2">
      <div className="space-y-7">
        {type.left.map((section) => (
          <FieldSectionBlock key={section.help} section={section} values={values} onChange={onChange} />
        ))}
      </div>
      <div className="space-y-7">
        {type.right.map((section) => (
          <FieldSectionBlock key={section.help} section={section} values={values} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}

function FieldSectionBlock({
  section,
  values,
  onChange,
}: {
  section: { help: string; fields: BenefitField[] }
  values: Record<string, string | boolean>
  onChange: (key: string, value: string | boolean) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-[#607080]">{section.help}</p>
      {section.fields.map((field) => (
        <BenefitInput key={field.key} field={field} value={values[field.key]} onChange={onChange} />
      ))}
    </div>
  )
}

function BenefitInput({
  field,
  value,
  onChange,
}: {
  field: BenefitField
  value: string | boolean | undefined
  onChange: (key: string, value: string | boolean) => void
}) {
  if (field.type === 'checkbox') {
    return (
      <div>
        <label className="flex items-start gap-3 text-sm text-navy">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.key, event.target.checked)}
            className="mt-0.5 size-4 accent-navy"
          />
          <span>{field.label}</span>
        </label>
        {field.note ? <p className="mt-2 text-xs leading-relaxed text-[#607080]">{field.note}</p> : null}
      </div>
    )
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm italic text-[#607080]">{field.label}</span>
      {field.type === 'money' ? (
        <MoneyInput
          value={String(value ?? '')}
          readOnly={field.readOnly}
          onChange={(next) => onChange(field.key, next)}
        />
      ) : field.type === 'date' ? (
        <DateInput value={String(value ?? '')} onChange={(next) => onChange(field.key, next)} />
      ) : field.type === 'select' ? (
        <select
          className={inputClass}
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'presets' ? (
        <PresetInput
          value={String(value ?? '')}
          presets={field.presets ?? []}
          onChange={(next) => onChange(field.key, next)}
        />
      ) : field.type === 'suffix' ? (
        <SuffixInput
          value={String(value ?? '')}
          suffix={field.suffix ?? ''}
          onChange={(next) => onChange(field.key, next)}
        />
      ) : (
        <input
          className={inputClass}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      )}
    </label>
  )
}

function MoneyInput({
  value,
  readOnly,
  onChange,
}: {
  value: string
  readOnly?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex">
      <span className="flex h-11 items-center rounded-l-[8px] border border-r-0 border-[#d9d9d9] bg-[#f8f7f4] px-3 text-sm text-navy">
        £
      </span>
      <input
        inputMode="decimal"
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} rounded-l-none ${readOnly ? 'bg-[#f8f7f4]' : ''}`}
      />
    </div>
  )
}

function SuffixInput({
  value,
  suffix,
  onChange,
}: {
  value: string
  suffix: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} rounded-r-none`}
      />
      <span className="flex h-11 items-center rounded-r-[8px] border border-l-0 border-[#d9d9d9] bg-[#f8f7f4] px-3 text-sm text-[#607080]">
        {suffix}
      </span>
    </div>
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-10`} />
      <CalendarDays size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9b9a9a]" />
    </div>
  )
}

function PresetInput({
  value,
  presets,
  onChange,
}: {
  value: string
  presets: string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative flex">
      <input
        className={`${inputClass} rounded-r-none`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="h-11 shrink-0 rounded-r-[8px] border border-l-0 border-[#d9d9d9] bg-[#f8f7f4] px-3 text-sm font-medium text-navy"
      >
        Select
      </button>
      {open ? (
        <div className="absolute top-12 right-0 z-20 w-full rounded-[8px] border border-[#d9d9d9] bg-white py-1 shadow-lg">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-navy hover:bg-[#f0f5fe]"
            >
              {preset}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none focus:border-navy'
