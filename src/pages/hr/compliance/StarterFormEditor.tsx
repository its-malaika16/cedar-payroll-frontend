import { useEffect, useRef } from 'react'
import { Field, Input } from '../../../components/ui'
import { fillTownCounty, STARTER_WORKING_DAYS, type StarterFormData } from './starterFormData'

const STATEMENTS: Array<{ code: 'A' | 'B' | 'C'; copy: string }> = [
  {
    code: 'A',
    copy: 'This is my first job since last April and I have not received any taxable allowances, benefits or pensions.',
  },
  {
    code: 'B',
    copy: 'This is now my only job, but since last April I have had another job, or received taxable allowances or incapacity benefit. I do not receive a state or occupational pension.',
  },
  {
    code: 'C',
    copy: 'As well as my new job, I have another job or receive a state or occupational pension.',
  },
]

function patchDisplayName(draft: StarterFormData): StarterFormData {
  const displayName = [draft.firstNames, draft.middleName, draft.lastName].filter(Boolean).join(' ').trim() || 'Employee'
  return { ...draft, displayName }
}

export function StarterFormEditor({
  value,
  onChange,
}: {
  value: StarterFormData
  onChange: (next: StarterFormData) => void
}) {
  const valueRef = useRef(value)
  valueRef.current = value
  const skipFilledLookup = useRef(Boolean(value.town && value.county))

  useEffect(() => {
    if (skipFilledLookup.current) {
      skipFilledLookup.current = false
      return
    }
    const requestId = window.setTimeout(async () => {
      const current = valueRef.current
      const next = await fillTownCounty(current, true)
      if (
        next.town === current.town &&
        next.county === current.county &&
        next.postcode === current.postcode &&
        next.address === current.address
      ) {
        return
      }
      onChange(next)
    }, 400)
    return () => window.clearTimeout(requestId)
  }, [value.address, value.postcode, onChange])

  function set<K extends keyof StarterFormData>(key: K, next: StarterFormData[K]) {
    const updated = { ...value, [key]: next }
    onChange(key === 'firstNames' || key === 'middleName' || key === 'lastName' ? patchDisplayName(updated) : updated)
  }

  function toggleDay(day: string) {
    const selected = value.workingDays.includes(day)
      ? value.workingDays.filter((item) => item !== day)
      : [...STARTER_WORKING_DAYS.filter((item) => value.workingDays.includes(item) || item === day)]
    onChange({
      ...value,
      workingDays: selected,
      daysPerWeek: selected.length ? String(selected.length) : '',
    })
  }

  return (
    <div className="space-y-4 p-5">
      <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
        <h3 className="bg-navy px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white">
          EMPLOYER FULL NAME
        </h3>
        <div className="p-4">
          <Field label="Employer">
            <Input value={value.employerName} onChange={(e) => set('employerName', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
        <h3 className="bg-navy px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white">
          EMPLOYEE PERSONAL DETAILS
        </h3>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Field label="Title">
            <Input value={value.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Gender (M/F)">
            <Input value={value.gender} onChange={(e) => set('gender', e.target.value)} />
          </Field>
          <Field label="Marital status">
            <Input value={value.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)} />
          </Field>
          <Field label="First name">
            <Input value={value.firstNames} onChange={(e) => set('firstNames', e.target.value)} />
          </Field>
          <Field label="Middle name">
            <Input value={value.middleName ?? ''} onChange={(e) => set('middleName', e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={value.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Field>
          <Field label="Date of birth">
            <Input value={value.dob} onChange={(e) => set('dob', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="National Insurance number">
              <Input value={value.niNumber} onChange={(e) => set('niNumber', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="Address">
              <Input value={value.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
          <Field label="Town">
            <Input value={value.town} onChange={(e) => set('town', e.target.value)} />
          </Field>
          <Field label="County">
            <Input value={value.county} onChange={(e) => set('county', e.target.value)} />
          </Field>
          <Field label="Postcode">
            <Input value={value.postcode} onChange={(e) => set('postcode', e.target.value)} />
          </Field>
          <Field label="Passport no.">
            <Input value={value.passportNo} onChange={(e) => set('passportNo', e.target.value)} />
          </Field>
          <Field label="Tel no.">
            <Input value={value.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={value.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
        <h3 className="bg-navy px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white">
          EMPLOYMENT DETAILS
        </h3>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Field label="Start date">
            <Input value={value.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Department">
            <Input value={value.department} onChange={(e) => set('department', e.target.value)} />
          </Field>
          <Field label="Director">
            <select
              className="h-11 w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none"
              value={value.director}
              onChange={(e) => set('director', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </Field>
          <Field label="Salary rate">
            <Input value={value.salaryRate} onChange={(e) => set('salaryRate', e.target.value)} />
          </Field>
          <Field label="Hourly rate">
            <Input value={value.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} />
          </Field>
          <Field label="Hours per week">
            <Input value={value.hoursPerWeek} onChange={(e) => set('hoursPerWeek', e.target.value)} />
          </Field>
          <Field label="Days per week">
            <Input value={value.daysPerWeek} onChange={(e) => set('daysPerWeek', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Hours per day">
              <Input value={value.hoursPerDay} onChange={(e) => set('hoursPerDay', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <p className="mb-2 text-xs font-medium text-navy">Working days</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_WORKING_DAYS.map((day) => {
                const on = value.workingDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`h-9 min-w-9 rounded-[6px] border px-2 text-xs font-semibold ${
                      on ? 'border-navy bg-navy text-white' : 'border-[#17375e] bg-white text-navy'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>
          <Field label="Student loan to be repaid">
            <select
              className="h-11 w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none"
              value={value.studentLoan}
              onChange={(e) => set('studentLoan', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </Field>
          <Field label="P45 attached / to follow">
            <div className="flex h-11 items-center gap-2">
              {(['Yes', 'No'] as const).map((option) => {
                const on = value.p45 === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => set('p45', option)}
                    className={`h-11 min-w-[72px] rounded-[10px] border px-4 text-sm font-semibold ${
                      on ? 'border-navy bg-navy text-white' : 'border-[#17375e] bg-white text-navy'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
        <h3 className="bg-navy px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white">
          EMPLOYEE STATEMENT
        </h3>
        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold text-navy">Please select only one of the following statements</p>
          {STATEMENTS.map((item) => {
            const on = value.starterDeclaration === item.code
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => set('starterDeclaration', on ? '' : item.code)}
                className={`flex w-full items-start gap-3 rounded-[8px] border px-3 py-3 text-left text-sm ${
                  on ? 'border-navy bg-[#e8eef6] text-navy' : 'border-[#e4e7ec] bg-white text-navy'
                }`}
              >
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    on ? 'border-navy bg-navy text-white' : 'border-navy'
                  }`}
                >
                  {item.code}
                </span>
                <span>{item.copy}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
        <h3 className="bg-navy px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white">
          BANK DETAILS
        </h3>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Name of bank">
            <Input value={value.bankName} onChange={(e) => set('bankName', e.target.value)} />
          </Field>
          <Field label="Branch name">
            <Input value={value.branchName} onChange={(e) => set('branchName', e.target.value)} />
          </Field>
          <Field label="Sort code">
            <Input value={value.sortCode} onChange={(e) => set('sortCode', e.target.value)} />
          </Field>
          <Field label="Account name">
            <Input value={value.accountName} onChange={(e) => set('accountName', e.target.value)} />
          </Field>
          <Field label="Account number">
            <Input value={value.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
          </Field>
          <Field label="Building society reference / roll no.">
            <Input
              value={value.buildingSocietyRef}
              onChange={(e) => set('buildingSocietyRef', e.target.value)}
            />
          </Field>
        </div>
      </section>
    </div>
  )
}
