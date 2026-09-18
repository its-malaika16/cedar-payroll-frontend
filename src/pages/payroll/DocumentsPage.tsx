import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { documentsApi, employeesApi, payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, Field, FormGrid, Input, PageHeader, Select } from '../../components/ui'
import { formatDate, fullName, idOf } from '../../lib/format'
import type { Employee, PayrollRun } from '../../types'

export function DocumentsPage() {
  const { companyId } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [runId, setRunId] = useState('')
  const [taxStart, setTaxStart] = useState('2026')
  const [taxEnd, setTaxEnd] = useState('2027')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const employees = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const runs = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId),
  })
  const p45 = useQuery({
    queryKey: ['p45', companyId, employeeId],
    queryFn: () => documentsApi.p45(companyId!, employeeId),
    enabled: Boolean(companyId && employeeId),
  })
  const p60 = useQuery({
    queryKey: ['p60', companyId, employeeId],
    queryFn: () => documentsApi.p60(companyId!, employeeId),
    enabled: Boolean(companyId && employeeId),
  })
  const p11 = useQuery({
    queryKey: ['p11', companyId, employeeId],
    queryFn: () => documentsApi.p11(companyId!, employeeId),
    enabled: Boolean(companyId && employeeId),
  })

  const people = (employees.data?.data ?? []) as Employee[]
  const runList = (runs.data?.data ?? []) as PayrollRun[]

  const act = async (fn: () => Promise<{ message: string }>) => {
    setError(null)
    try {
      const result = await fn()
      setMessage(result.message)
      await Promise.all([p45.refetch(), p60.refetch(), p11.refetch()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document action failed')
    }
  }

  const docs = [
    ...(p45.data?.data as Record<string, unknown>[] | undefined ?? []),
    ...(p60.data?.data as Record<string, unknown>[] | undefined ?? []),
    ...(p11.data?.data as Record<string, unknown>[] | undefined ?? []),
  ]

  return (
    <div>
      <PageHeader title="Statutory documents" subtitle="Generate P45, P60 and P11 records for an employee." />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {message ? <div className="mb-4"><Alert tone="success">{message}</Alert></div> : null}
      <Card className="mb-6 p-6">
        <FormGrid>
          <Field label="Employee">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {people.map((employee) => (
                <option key={idOf(employee)} value={idOf(employee)}>
                  {fullName(employee.first_name, employee.last_name)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payroll run (P45)">
            <Select value={runId} onChange={(e) => setRunId(e.target.value)}>
              <option value="">Select run</option>
              {runList.map((run) => (
                <option key={idOf(run)} value={idOf(run)}>
                  Period {run.period_number} · {formatDate(run.pay_date)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tax year start">
            <Input type="number" value={taxStart} onChange={(e) => setTaxStart(e.target.value)} />
          </Field>
          <Field label="Tax year end">
            <Input type="number" value={taxEnd} onChange={(e) => setTaxEnd(e.target.value)} />
          </Field>
        </FormGrid>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={!employeeId || !runId} onClick={() => act(() => documentsApi.generateP45(companyId!, employeeId, runId))}>
            Generate P45
          </Button>
          <Button
            variant="secondary"
            disabled={!employeeId}
            onClick={() => act(() => documentsApi.generateP60(companyId!, employeeId, Number(taxStart), Number(taxEnd)))}
          >
            Generate P60
          </Button>
          <Button
            variant="secondary"
            disabled={!employeeId}
            onClick={() => act(() => documentsApi.generateP11(companyId!, employeeId, Number(taxStart), Number(taxEnd)))}
          >
            Generate P11
          </Button>
        </div>
      </Card>
      <Card>
        <div className="divide-y divide-stone-100">
          {docs.map((doc) => (
            <div key={idOf(doc)} className="px-5 py-3">
              <p className="font-medium">{String(doc.document_type ?? doc.file_name ?? 'Document')}</p>
              <p className="text-sm text-stone-500">{formatDate(String(doc.created_at ?? doc.generated_at ?? ''))}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
