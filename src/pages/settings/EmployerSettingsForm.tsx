import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '../../api'
import { assetUrl } from '../../api/client'
import { Alert, Button, Field, Input as UiInput, Select as UiSelect, onSubmit } from '../../components/ui'

function Input(props: ComponentProps<typeof UiInput>) {
  return <UiInput variant="outline" {...props} />
}

function Select(props: ComponentProps<typeof UiSelect>) {
  return <UiSelect variant="outline" {...props} />
}
import type { Company } from '../../types'
import {
  LEAVE_CALCULATION_METHODS,
  LEAVE_YEAR_STARTS,
  MIN_WAGE_PROFILES,
  TITLE_OPTIONS,
  WEEKDAYS,
} from '../employees/employeeOptions'
import {
  EMPLOYER_COUNTRIES,
  EXPENSES_BENEFITS_METHODS,
  PAY_FREQUENCY_OPTIONS,
  SETTINGS_TABS,
  daysFromWeeks,
  formFromCompany,
  payloadFromForm,
  weeksFromDays,
  type EmployerForm,
  type SettingsTab,
} from './employerSettings'

export function EmployerSettingsForm({ company }: { company: Company }) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<SettingsTab>('Basic Details')
  const [form, setForm] = useState<EmployerForm>(() => formFromCompany(company))
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setForm(formFromCompany(company))
  }, [company.id, company.updated_at, company.logo_path])

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => companiesApi.update(String(company.id), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company', String(company.id)] }),
  })

  function patchForm(next: Partial<EmployerForm>) {
    setForm((current) => ({ ...current, ...next }))
  }

  function toggleWorkingDay(day: string) {
    setForm((current) => {
      const working_days = current.working_days.includes(day)
        ? current.working_days.filter((item) => item !== day)
        : [...current.working_days, day]
      return { ...current, working_days }
    })
  }

  async function uploadLogo(file: File) {
    setError(null)
    setMessage(null)
    setUploading(true)
    try {
      const data = new FormData()
      data.append('file', file)
      await companiesApi.uploadLogo(String(company.id), data)
      await queryClient.invalidateQueries({ queryKey: ['company', String(company.id)] })
      setMessage('Logo uploaded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload logo')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const logoSrc = assetUrl(company.logo_path)
  const employerName = form.company_name.trim() || 'this employer'

  return (
    <form
      className="space-y-4"
      onSubmit={onSubmit(async () => {
        if (!form.company_name.trim()) {
          throw new Error('Enter the employer name')
        }
        await save.mutateAsync(payloadFromForm(form))
        setMessage('Employer settings saved')
      }, setError, setSaving)}
    >
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <div className="overflow-x-auto rounded-[10px] border border-[#d9d9d9] bg-white">
        <div className="flex min-w-max gap-8 px-6 pt-4">
          {SETTINGS_TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative pb-4 text-base font-medium ${
                tab === item ? 'text-navy' : 'text-muted'
              }`}
            >
              {item}
              {tab === item ? (
                <span className="absolute right-0 bottom-0 left-0 h-[5px] rounded-t bg-navy" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Basic Details' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Name">
            <Field label="Name">
              <Input
                value={form.company_name}
                onChange={(event) => patchForm({ company_name: event.target.value })}
              />
            </Field>
            <Field label="Trading name">
              <Input
                value={form.trading_name}
                onChange={(event) => patchForm({ trading_name: event.target.value })}
                placeholder="If applicable"
              />
            </Field>
            <Field label="Office telephone">
              <Input
                value={form.office_number}
                onChange={(event) => patchForm({ office_number: event.target.value })}
                placeholder="Used on payslips"
              />
            </Field>
          </Section>

          <Section title="Address">
            <div>
              <span className="mb-2 block text-sm font-medium text-navy">Address</span>
              <div className="space-y-2">
                <Input
                  value={form.address_line_1}
                  onChange={(event) => patchForm({ address_line_1: event.target.value })}
                  placeholder="Address line 1"
                />
                <Input
                  value={form.address_line_2}
                  onChange={(event) => patchForm({ address_line_2: event.target.value })}
                  placeholder="Address line 2"
                />
                <Input
                  value={form.address_line_3}
                  onChange={(event) => patchForm({ address_line_3: event.target.value })}
                  placeholder="Address line 3"
                />
                <Input
                  value={form.address_line_4}
                  onChange={(event) => patchForm({ address_line_4: event.target.value })}
                  placeholder="Address line 4"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Postcode">
                <Input
                  value={form.postcode}
                  onChange={(event) => patchForm({ postcode: event.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Country">
                <Select
                  value={form.country}
                  onChange={(event) => patchForm({ country: event.target.value })}
                >
                  {EMPLOYER_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Workplace check-in">
            <p className="mb-4 text-sm text-muted">
              Employees must be within this radius to check in and check out. Default is 3 km.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude">
                <Input
                  value={form.latitude}
                  onChange={(event) => patchForm({ latitude: event.target.value })}
                  placeholder="53.4808"
                />
              </Field>
              <Field label="Longitude">
                <Input
                  value={form.longitude}
                  onChange={(event) => patchForm({ longitude: event.target.value })}
                  placeholder="-2.2426"
                />
              </Field>
            </div>
            <Field label="Check-in radius (metres)">
              <Input
                value={form.attendance_radius_meters}
                onChange={(event) => patchForm({ attendance_radius_meters: event.target.value })}
                placeholder="3000"
              />
            </Field>
          </Section>

          <Section title="Logo image">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex size-[148px] items-center justify-center overflow-hidden rounded-[12px] border border-[#d9d9d9] bg-[#e8eef6] text-5xl font-semibold text-navy/30">
                {logoSrc ? (
                  <img src={logoSrc} alt={`${employerName} logo`} className="size-full object-contain" />
                ) : (
                  'Aa'
                )}
              </div>
              <div className="min-w-[220px] flex-1">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadLogo(file)
                  }}
                />
                <button
                  type="button"
                  className="text-sm font-semibold text-[#3276ca]"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Select a logo image'}
                </button>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Recommendation
                </p>
                <p className="mt-1 text-sm text-muted">
                  Use a PNG with a solid or transparent background. The logo appears on payslips.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Workplace pension">
            <p className="mb-4 text-sm text-muted">
              Used when enrolling employees in a qualifying scheme.
            </p>
            <Field label="Pension provider">
              <Input
                value={form.pension_provider}
                onChange={(event) => patchForm({ pension_provider: event.target.value })}
                placeholder="NEST"
              />
            </Field>
            <Field label="Employer ID">
              <Input
                value={form.pension_employer_id}
                onChange={(event) => patchForm({ pension_employer_id: event.target.value })}
                placeholder="EMP006282768"
              />
            </Field>
          </Section>
        </div>
      ) : null}

      {tab === 'PAYE Registration' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Registration">
            <div>
              <span className="mb-2 block text-sm font-medium text-navy">Employer PAYE reference</span>
              <div className="flex items-center gap-2">
                <Input
                  className="max-w-[110px]"
                  value={form.paye_office}
                  onChange={(event) => patchForm({ paye_office: event.target.value })}
                  placeholder="123"
                />
                <span className="text-muted">/</span>
                <Input
                  value={form.paye_reference}
                  onChange={(event) => patchForm({ paye_reference: event.target.value.toUpperCase() })}
                  placeholder="A12345"
                />
              </div>
            </div>
            <Field label="Accounts office reference">
              <Input
                value={form.accounts_office_reference}
                onChange={(event) => patchForm({ accounts_office_reference: event.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Company registration number">
              <Input
                value={form.company_registration_number}
                onChange={(event) => patchForm({ company_registration_number: event.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Self Assessment Unique Tax Reference (UTR)">
              <Input
                value={form.sa_utr}
                onChange={(event) => patchForm({ sa_utr: event.target.value })}
              />
            </Field>
            <Field label="Corporation Tax reference">
              <Input
                value={form.corporation_tax_reference}
                onChange={(event) => patchForm({ corporation_tax_reference: event.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Bacs Service User Number (SUN)">
              <Input
                value={form.bacs_sun}
                onChange={(event) => patchForm({ bacs_sun: event.target.value })}
              />
            </Field>
          </Section>
          <Section title="Profile">
            <CheckRow
              label="Employer qualifies for Small Employers’ Relief"
              checked={form.small_employers_relief}
              onChange={(checked) => patchForm({ small_employers_relief: checked })}
            />
            <div className="mt-5">
              <Field label="Expenses & benefits tax accounting method">
                <Select
                  value={form.expenses_benefits_method}
                  onChange={(event) => patchForm({ expenses_benefits_method: event.target.value })}
                >
                  {EXPENSES_BENEFITS_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>
        </div>
      ) : null}

      {tab === 'Typical Employee' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Pay">
            <Field label="Typical pay frequency">
              <Select
                value={form.typical_pay_frequency}
                onChange={(event) => patchForm({ typical_pay_frequency: event.target.value })}
              >
                {PAY_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Section>
          <Section title="Typical working days">
            <div className="grid grid-cols-2 gap-2">
              {WEEKDAYS.map((day) => (
                <CheckRow
                  key={day}
                  label={day}
                  checked={form.working_days.includes(day)}
                  onChange={() => toggleWorkingDay(day)}
                />
              ))}
            </div>
          </Section>
          <Section title="Annual leave">
            <Field label="Typical annual leave year starts">
              <Select
                value={form.leave_year_starts}
                onChange={(event) => patchForm({ leave_year_starts: event.target.value })}
              >
                {LEAVE_YEAR_STARTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Typical annual leave calculation method">
              <Select
                value={form.leave_calculation_method}
                onChange={(event) => patchForm({ leave_calculation_method: event.target.value })}
              >
                {LEAVE_CALCULATION_METHODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <span className="mb-2 block text-sm font-medium text-navy">Typical annual leave entitlement</span>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="max-w-[110px]"
                  value={form.leave_entitlement_days}
                  onChange={(event) =>
                    patchForm({
                      leave_entitlement_days: event.target.value,
                      leave_entitlement_weeks: weeksFromDays(event.target.value, form.working_days),
                    })
                  }
                />
                <span className="text-sm text-muted">days</span>
                <span className="text-muted">↔</span>
                <Input
                  className="max-w-[110px]"
                  value={form.leave_entitlement_weeks}
                  onChange={(event) =>
                    patchForm({
                      leave_entitlement_weeks: event.target.value,
                      leave_entitlement_days: daysFromWeeks(event.target.value, form.working_days),
                    })
                  }
                />
                <span className="text-sm text-muted">weeks</span>
              </div>
            </div>
            <CheckRow
              label="Carry over annual leave from previous year"
              checked={form.carry_over_leave}
              onChange={(checked) => patchForm({ carry_over_leave: checked })}
            />
          </Section>
          <div className="space-y-4">
            <Section title="Minimum wage">
              <Field label="Typical minimum wage profile">
                <Select
                  value={form.min_wage_profile}
                  onChange={(event) => patchForm({ min_wage_profile: event.target.value })}
                >
                  {MIN_WAGE_PROFILES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <CheckRow
                label="Flag where employees are paid below minimum wage (hourly paid only)"
                checked={form.flag_below_min_wage}
                onChange={(checked) => patchForm({ flag_below_min_wage: checked })}
              />
            </Section>
            <Section title="Options">
              <div className="space-y-3">
                <CheckRow
                  label="Automatically generate works numbers"
                  checked={form.auto_works_numbers}
                  onChange={(checked) => patchForm({ auto_works_numbers: checked })}
                />
                <CheckRow
                  label="By default, withhold tax refunds when pay is zero"
                  checked={form.withhold_tax_refunds_when_zero}
                  onChange={(checked) => patchForm({ withhold_tax_refunds_when_zero: checked })}
                />
                <CheckRow
                  label="By default, do not pay Statutory Sick Pay (where you are using an alternate scheme)"
                  checked={form.do_not_pay_ssp}
                  onChange={(checked) => patchForm({ do_not_pay_ssp: checked })}
                />
                <CheckRow
                  label="Opt out from reporting employee payment information to credit check providers"
                  checked={form.opt_out_credit_check}
                  onChange={(checked) => patchForm({ opt_out_credit_check: checked })}
                />
              </div>
            </Section>
          </div>
        </div>
      ) : null}

      {tab === 'RTI' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Preferred credentials">
            <p className="mb-4 text-sm text-muted">
              Government Gateway credentials are used when sending an RTI submission or downloading PAYE coding notices. You can choose which credentials to use by default for {employerName}.
            </p>
            <Field label={`Government Gateway credentials to use for ${employerName}`}>
              <Select
                value={form.rti_gateway_preference}
                onChange={(event) =>
                  patchForm({ rti_gateway_preference: event.target.value === 'PAYE' ? 'PAYE' : 'NONE' })
                }
              >
                <option value="NONE">(No preference)</option>
                <option value="PAYE">PAYE</option>
              </Select>
            </Field>
          </Section>
          <Section title="Contact details">
            <p className="mb-4 text-sm text-muted">
              These details are included as the principal contact on RTI submissions sent for {employerName}.
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Field label="Title">
                <Select
                  value={form.rti_title}
                  onChange={(event) => patchForm({ rti_title: event.target.value })}
                >
                  <option value=""> </option>
                  {TITLE_OPTIONS.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Name">
                <Input
                  value={form.rti_first_name}
                  onChange={(event) => patchForm({ rti_first_name: event.target.value })}
                />
              </Field>
              <Field label="Middle name">
                <Input
                  value={form.rti_middle_name}
                  onChange={(event) => patchForm({ rti_middle_name: event.target.value })}
                />
              </Field>
              <Field label="Surname">
                <Input
                  value={form.rti_last_name}
                  onChange={(event) => patchForm({ rti_last_name: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Contact email address">
              <Input
                type="email"
                value={form.rti_email}
                onChange={(event) => patchForm({ rti_email: event.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact phone number">
                <Input
                  value={form.rti_phone}
                  onChange={(event) => patchForm({ rti_phone: event.target.value })}
                />
              </Field>
              <Field label="Contact fax number">
                <Input
                  value={form.rti_fax}
                  onChange={(event) => patchForm({ rti_fax: event.target.value })}
                />
              </Field>
            </div>
          </Section>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save employer settings'}
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
      <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.04em] text-navy">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
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
    <label className="flex items-start gap-2 text-sm text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3 shrink-0 accent-navy"
      />
      <span>{label}</span>
    </label>
  )
}
