import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Eye } from 'lucide-react'
import { documentsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, EmptyState, Loading } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { FORM_TYPES, formLabel } from '../employees/formsOptions'

export type GeneratedForm = {
  id: string
  form_name?: string
  document_type?: string
  generated_at?: string
  employee_id?: string
  employee_name?: string
  tax_year_start?: number
  tax_year_end?: number
}

export function GeneratedFormsPanel({
  employeeId,
  showEmployee = true,
  title = 'Generated forms',
  subtitle,
}: {
  employeeId?: string
  showEmployee?: boolean
  title?: string
  subtitle?: string
}) {
  const { companyId } = useAuth()
  const [formFilter, setFormFilter] = useState<'all' | (typeof FORM_TYPES)[number]['value']>('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['generated-forms', companyId],
    queryFn: () => documentsApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const forms = ((query.data?.data ?? []) as GeneratedForm[]).filter((item) => {
    if (!employeeId) return true
    return String(item.employee_id ?? '') === String(employeeId)
  })
  const visible = forms.filter((item) => {
    if (formFilter === 'all') return true
    return String(item.document_type || item.form_name || '').toLowerCase() === formFilter
  })

  async function openForm(item: GeneratedForm, asDownload: boolean) {
    if (!companyId) return
    const id = String(item.id)
    const filename = `${item.form_name || 'form'}-${item.employee_name || 'employee'}.html`.replaceAll(' ', '-')
    setActionId(id)
    setError(null)
    try {
      if (asDownload) {
        await documentsApi.html(companyId, id, filename)
        return
      }
      const blob = await documentsApi.html(companyId, id)
      const url = URL.createObjectURL(blob as Blob)
      const popup = window.open(url, '_blank')
      if (!popup) {
        setError('Allow pop-ups to view the form, or use Download instead.')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this form.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`h-9 rounded-[8px] border px-3 text-sm font-semibold ${
            formFilter === 'all' ? 'border-navy bg-navy text-white' : 'border-[#d9d9d9] bg-white text-navy'
          }`}
          onClick={() => setFormFilter('all')}
        >
          All
        </button>
        {FORM_TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`h-9 rounded-[8px] border px-3 text-sm font-semibold ${
              formFilter === item.value ? 'border-navy bg-navy text-white' : 'border-[#d9d9d9] bg-white text-navy'
            }`}
            onClick={() => setFormFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <Loading />
      ) : forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          body={
            employeeId
              ? 'P11, P45, P60 and other statutory forms generated for this employee will appear here.'
              : 'Generate P11, P45, P60 and other statutory forms from Employees > Forms. They will appear here.'
          }
        />
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No {formLabel(formFilter)} forms have been generated yet.</p>
      ) : (
        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#eceae6] text-navy">
                <th className="py-3 pr-4 font-semibold">Form</th>
                {showEmployee ? <th className="py-3 pr-4 font-semibold">Employee</th> : null}
                <th className="py-3 pr-4 font-semibold">Date generated</th>
                <th className="py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={String(item.id)} className="border-b border-[#eceae6] last:border-b-0">
                  <td className="py-3 pr-4 font-semibold text-navy">
                    {item.form_name}
                    {item.tax_year_start && item.tax_year_end
                      ? ` ${item.tax_year_start}/${String(item.tax_year_end).slice(-2)}`
                      : ''}
                  </td>
                  {showEmployee ? (
                    <td className="py-3 pr-4 text-navy">{item.employee_name}</td>
                  ) : null}
                  <td className="py-3 pr-4 text-muted">{formatDate(item.generated_at)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="h-9 px-3"
                        disabled={actionId === String(item.id)}
                        onClick={() => void openForm(item, false)}
                      >
                        <Eye size={14} />
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-9 px-3"
                        disabled={actionId === String(item.id)}
                        onClick={() => void openForm(item, true)}
                      >
                        <Download size={14} />
                        Download
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
