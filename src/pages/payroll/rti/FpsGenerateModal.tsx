import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { payrollApi, rtiApi } from '../../../api'
import { Alert, Button, Field, Select } from '../../../components/ui'
import { formatDate, idOf } from '../../../lib/format'
import type { PayrollRun } from '../../../types'

export function FpsGenerateModal({
  companyId,
  onClose,
  onGenerated,
}: {
  companyId: string
  onClose: () => void
  onGenerated: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const [runId, setRunId] = useState('')
  const [finalForYear, setFinalForYear] = useState(false)

  const runs = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId),
    enabled: Boolean(companyId),
  })

  const runList = ((runs.data?.data ?? []) as PayrollRun[]).filter(
    (run) => run.status === 'COMPLETED' || run.status === 'LOCKED',
  )

  const generate = useMutation({
    mutationFn: () => rtiApi.generateFps(companyId, runId, finalForYear),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      onGenerated(idOf(result.data))
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] rounded-[16px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Info size={20} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-navy">
              An FPS is generated from a completed pay period.
            </h3>
            <p className="mt-1 text-sm font-medium text-navy/60">
              An FPS captures the pay and deductions for a pay period. If you need to send updated
              year-to-date figures for any employee(s) to HMRC, create an Additional FPS instead.
            </p>
          </div>
        </div>

        {generate.isError ? (
          <div className="mt-4">
            <Alert>
              {generate.error instanceof Error
                ? generate.error.message
                : 'Could not generate FPS'}
            </Alert>
          </div>
        ) : null}

        <div className="mt-5">
          <Field label="Completed payroll run">
            <Select value={runId} onChange={(e) => setRunId(e.target.value)}>
              <option value="">Select a completed run</option>
              {runList.map((run) => (
                <option key={idOf(run)} value={idOf(run)}>
                  Period {run.period_number} · {formatDate(run.pay_date)} · {run.status}
                </option>
              ))}
            </Select>
          </Field>
          {runList.length === 0 && !runs.isLoading ? (
            <p className="mt-2 text-xs font-medium text-navy/50">
              No completed payroll runs yet. Complete a payroll run to generate an FPS.
            </p>
          ) : null}
          <label className="mt-3 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="size-4 accent-navy"
              checked={finalForYear}
              onChange={(e) => setFinalForYear(e.target.checked)}
            />
            <span className="text-sm font-medium text-navy">
              This is the final submission for the tax year
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={generate.isPending}>
            Cancel
          </Button>
          <Button onClick={() => generate.mutate()} disabled={!runId || generate.isPending}>
            {generate.isPending ? 'Generating…' : 'Generate FPS'}
          </Button>
        </div>
      </div>
    </div>
  )
}
