import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { isFormDirty } from '../../lib/formDirty'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bureauApi } from '../../api'
import { assetUrl } from '../../api/client'
import { Alert, Button, Field, Input as UiInput, Loading, Textarea, onSubmit } from '../../components/ui'
import type { BureauDetails } from '../../types'
import { BureauTeamPanel } from './BureauTeamPanel'

function Input(props: ComponentProps<typeof UiInput>) {
  return <UiInput variant="outline" {...props} />
}

const BUREAU_TABS = ['Basic Details', 'Bureau Team'] as const
type BureauTab = (typeof BUREAU_TABS)[number]

type BureauForm = {
  name: string
  email: string
  phone: string
  address: string
  postcode: string
  bank_sort_code: string
  bank_account_number: string
  bank_account_holder: string
  bank_name: string
}

function formFromBureau(bureau?: BureauDetails): BureauForm {
  return {
    name: bureau?.name ?? '',
    email: bureau?.email ?? '',
    phone: bureau?.phone ?? '',
    address: bureau?.address ?? '',
    postcode: bureau?.postcode ?? '',
    bank_sort_code: formatSortCode(bureau?.bank_sort_code ?? ''),
    bank_account_number: bureau?.bank_account_number ?? '',
    bank_account_holder: bureau?.bank_account_holder ?? '',
    bank_name: bureau?.bank_name ?? '',
  }
}

export function BureauInformationForm() {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<BureauTab>('Basic Details')
  const [form, setForm] = useState<BureauForm>(formFromBureau())
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [ready, setReady] = useState(false)

  const query = useQuery({
    queryKey: ['bureau-details'],
    queryFn: () => bureauApi.details(),
  })
  const bureau = query.data?.data as BureauDetails | undefined
  const canSave = ready && isFormDirty(form, formFromBureau(bureau))

  useEffect(() => {
    if (!bureau) return
    setForm(formFromBureau(bureau))
    setReady(true)
  }, [query.data])

  function patchForm(next: Partial<BureauForm>) {
    setForm((current) => ({ ...current, ...next }))
  }

  async function uploadLogo(file: File) {
    setError(null)
    setMessage(null)
    setUploading(true)
    try {
      const data = new FormData()
      data.append('file', file)
      await bureauApi.uploadLogo(data)
      await queryClient.invalidateQueries({ queryKey: ['bureau-details'] })
      setMessage('Logo uploaded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload logo')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  if (query.isLoading) return <Loading />
  if (query.isError) {
    return <Alert>{query.error instanceof Error ? query.error.message : 'Could not load bureau details'}</Alert>
  }

  return (
    <div className="space-y-4">
      {tab === 'Basic Details' && error ? <Alert>{error}</Alert> : null}
      {tab === 'Basic Details' && message ? <Alert tone="success">{message}</Alert> : null}

      <div className="overflow-x-auto rounded-[10px] border border-[#d9d9d9] bg-white">
        <div className="flex min-w-max gap-8 px-6 pt-4">
          {BUREAU_TABS.map((item) => (
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

      {tab === 'Bureau Team' ? (
        <BureauTeamPanel />
      ) : (
        <form
          className="space-y-4"
          onSubmit={onSubmit(async () => {
            if (!form.name.trim()) {
              throw new Error('Enter the bureau name')
            }
            await bureauApi.update({
              name: form.name.trim(),
              email: form.email.trim() || null,
              phone: form.phone.trim() || null,
              address: form.address.trim() || null,
              postcode: form.postcode.trim() || null,
              bank_sort_code: form.bank_sort_code.trim() || null,
              bank_account_number: form.bank_account_number.trim() || null,
              bank_account_holder: form.bank_account_holder.trim() || null,
              bank_name: form.bank_name.trim() || null,
            })
            await queryClient.invalidateQueries({ queryKey: ['bureau-details'] })
            setMessage('Bureau information saved')
          }, setError, setSaving)}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
              <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.04em] text-navy">Name</h3>
              <div className="space-y-4">
                <Field label="Bureau name">
                  <Input value={form.name} onChange={(event) => patchForm({ name: event.target.value })} />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => patchForm({ email: event.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(event) => patchForm({ phone: event.target.value })} />
                </Field>
              </div>
            </section>

            <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
              <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.04em] text-navy">Address</h3>
              <div className="space-y-4">
                <Field label="Address">
                  <Textarea
                    variant="outline"
                    rows={4}
                    value={form.address}
                    onChange={(event) => patchForm({ address: event.target.value })}
                  />
                </Field>
                <Field label="Postcode">
                  <Input value={form.postcode} onChange={(event) => patchForm({ postcode: event.target.value })} />
                </Field>
              </div>
            </section>

            <div className="xl:col-span-2">
              <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
                <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.04em] text-navy">Logo image</h3>
                <div className="flex flex-wrap items-start gap-5">
                  <div className="flex size-[148px] items-center justify-center overflow-hidden rounded-[12px] border border-[#d9d9d9] bg-[#e8eef6] text-5xl font-semibold text-navy/30">
                    {bureau?.logo_path ? (
                      <img
                        src={`${assetUrl(bureau.logo_path)}${
                          bureau.updated_at ? `?t=${encodeURIComponent(bureau.updated_at)}` : ''
                        }`}
                        alt={`${form.name.trim() || 'Bureau'} logo`}
                        className="size-full object-contain"
                      />
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
                      Use a PNG with a solid or transparent background. The logo appears on invoices.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="xl:col-span-2">
              <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
                <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.04em] text-navy">Bank details</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    These details are used as the default bank details on invoices. They can still be
                    changed when creating an invoice.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Sort code">
                      <Input
                        value={form.bank_sort_code}
                        onChange={(event) => patchForm({ bank_sort_code: formatSortCode(event.target.value) })}
                        placeholder="04-07-27"
                      />
                    </Field>
                    <Field label="Account number">
                      <Input
                        value={form.bank_account_number}
                        onChange={(event) =>
                          patchForm({
                            bank_account_number: event.target.value.replace(/\D/g, '').slice(0, 8),
                          })
                        }
                        placeholder="00032557"
                      />
                    </Field>
                    <Field label="Account holder">
                      <Input
                        value={form.bank_account_holder}
                        onChange={(event) => patchForm({ bank_account_holder: event.target.value })}
                      />
                    </Field>
                    <Field label="Bank name">
                      <Input
                        value={form.bank_name}
                        onChange={(event) => patchForm({ bank_name: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !canSave}>
              {saving ? 'Saving…' : 'Save bureau information'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function formatSortCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  return digits.replace(/(\d{2})(?=\d)/g, '$1-')
}
