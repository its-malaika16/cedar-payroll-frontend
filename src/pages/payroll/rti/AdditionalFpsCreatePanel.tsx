import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rtiApi } from '../../../api'
import { Alert, Button, EmptyState, Loading, Select } from '../../../components/ui'
import { formatDate, idOf } from '../../../lib/format'
import { LATE_REPORTING_REASONS, type AdditionalFpsCandidate } from './rtiTypes'

export function AdditionalFpsCreatePanel({
  companyId,
  onCancel,
  onCreated,
}: {
  companyId: string
  onCancel: () => void
  onCreated: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const candidatesQuery = useQuery({
    queryKey: ['rti-additional-candidates', companyId],
    queryFn: () => rtiApi.additionalFpsCandidates(companyId),
    enabled: Boolean(companyId),
  })

  const candidates = (candidatesQuery.data?.data as AdditionalFpsCandidate[] | undefined) ?? []

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const allSelected = candidates.length > 0 && selected.size === candidates.length

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.employee_id)),
    )
  }

  const payload = useMemo(
    () =>
      [...selected].map((employee_id) => ({
        employee_id,
        late_reporting_reason: reasons[employee_id] ?? LATE_REPORTING_REASONS[0],
      })),
    [selected, reasons],
  )

  const create = useMutation({
    mutationFn: () => rtiApi.generateAdditionalFps(companyId, payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      onCreated(idOf(result.data))
    },
  })

  return (
    <div className="space-y-5 pb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
        RTI &nbsp;›&nbsp; Additional FPS
      </p>
      <div>
        <h2 className="text-2xl font-bold text-navy">Create Additional FPS</h2>
        <p className="mt-1 text-sm font-medium text-navy/60">
          Select the employees that you need to send the current year-to-date figures for, along
          with any applicable late reporting reasons.
        </p>
      </div>

      {create.isError ? (
        <Alert>
          {create.error instanceof Error ? create.error.message : 'Could not create Additional FPS'}
        </Alert>
      ) : null}

      <div className="rounded-[16px] border border-[#d9d9d9]/80 bg-white">
        {candidatesQuery.isLoading ? (
          <Loading />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No eligible employees"
            body="Employees appear here once they have at least one finalised payroll record."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#d9d9d9] bg-cream text-xs font-semibold uppercase tracking-[0.08em] text-navy/60">
                <tr>
                  <th className="px-4 py-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-navy"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                      Employees
                    </label>
                  </th>
                  <th className="px-4 py-3">Most recent pay period</th>
                  <th className="px-4 py-3">Pay date</th>
                  <th className="px-4 py-3">Late reporting reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee]">
                {candidates.map((candidate) => {
                  const checked = selected.has(candidate.employee_id)
                  return (
                    <tr key={candidate.employee_id} className="text-navy">
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            className="size-4 accent-navy"
                            checked={checked}
                            onChange={() => toggle(candidate.employee_id)}
                          />
                          <span className="font-semibold">{candidate.full_name}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-navy/70">
                        {candidate.most_recent_period_number != null
                          ? `Period ${candidate.most_recent_period_number}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-navy/70">{formatDate(candidate.pay_date)}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={reasons[candidate.employee_id] ?? LATE_REPORTING_REASONS[0]}
                          disabled={!checked}
                          onChange={(e) =>
                            setReasons((prev) => ({
                              ...prev,
                              [candidate.employee_id]: e.target.value,
                            }))
                          }
                        >
                          {LATE_REPORTING_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => create.mutate()}
          disabled={selected.size === 0 || create.isPending}
        >
          {create.isPending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}
