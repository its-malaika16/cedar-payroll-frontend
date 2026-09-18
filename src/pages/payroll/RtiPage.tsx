import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock, Trash2, XCircle } from 'lucide-react'
import { rtiApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button, Loading, PageHeader } from '../../components/ui'
import { formatDate, idOf } from '../../lib/format'
import { AddSubmissionMenu } from './rti/AddSubmissionMenu'
import { AdditionalFpsCreatePanel } from './rti/AdditionalFpsCreatePanel'
import { EpsCreatePanel } from './rti/EpsCreatePanel'
import { FpsGenerateModal } from './rti/FpsGenerateModal'
import { SubmissionDetail } from './rti/SubmissionDetail'
import {
  SUBMISSION_TYPE_LABELS,
  SUBMISSION_TYPE_SHORT,
  isRtiEditable,
  statusText,
  type RtiStatus,
  type RtiSubmission,
  type RtiSubmissionType,
} from './rti/rtiTypes'

type Mode =
  | { type: 'empty' }
  | { type: 'detail'; id: string }
  | { type: 'create-eps' }
  | { type: 'create-additional' }

function StatusIcon({ status }: { status: RtiStatus }) {
  if (status === 'ACCEPTED')
    return <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
  if (status === 'SUBMITTED')
    return <Clock size={20} className="shrink-0 text-amber-500" />
  if (status === 'REJECTED' || status === 'FAILED')
    return <XCircle size={20} className="shrink-0 text-brand" />
  return <Circle size={20} className="shrink-0 text-navy/40" />
}

function submissionSubtitle(submission: RtiSubmission): string {
  const payload = submission.payload
  if (payload?.kind === 'FPS') {
    const schedule = payload.period.schedule_name
      ? `${payload.period.schedule_name} · `
      : ''
    return `${schedule}Payment on ${formatDate(payload.period.pay_date)} (${payload.employee_count} employee${
      payload.employee_count === 1 ? '' : 's'
    })`
  }
  if (payload?.kind === 'EPS') {
    return `Tax year ${payload.tax_year_start}/${payload.tax_year_end}`
  }
  if (payload?.kind === 'ADDITIONAL_FPS') {
    return `${payload.employee_count} employee${payload.employee_count === 1 ? '' : 's'}`
  }
  if (submission.payroll_runs) {
    return `Period ${submission.payroll_runs.period_number} · ${formatDate(
      submission.payroll_runs.pay_date,
    )}`
  }
  return formatDate(submission.created_at)
}

function SubmissionListItem({
  submission,
  active,
  canDelete,
  onClick,
  onDelete,
}: {
  submission: RtiSubmission
  active: boolean
  canDelete: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex w-full items-start gap-2 rounded-[12px] border px-3 py-3 transition ${
        active
          ? 'border-navy bg-navy text-white'
          : 'border-[#e4e2dd] bg-white text-navy hover:bg-cream'
      }`}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="mt-0.5">
          {active ? (
            <CheckCircle2 size={20} className="shrink-0 text-white" />
          ) : (
            <StatusIcon status={submission.status} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {SUBMISSION_TYPE_LABELS[submission.submission_type]}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs font-medium ${
              active ? 'text-white/80' : 'text-navy/55'
            }`}
          >
            {submissionSubtitle(submission)}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs ${
              active ? 'text-white/70' : 'text-navy/45'
            }`}
          >
            {statusText(submission.status)}
          </span>
        </span>
      </button>
      {canDelete ? (
        <button
          type="button"
          className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] ${
            active ? 'text-white hover:bg-white/15' : 'text-brand hover:bg-red-50'
          }`}
          aria-label={`Delete ${SUBMISSION_TYPE_LABELS[submission.submission_type]}`}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      ) : null}
    </div>
  )
}

export function RtiPage() {
  const { companyId, can } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>({ type: 'empty' })
  const [fpsModalOpen, setFpsModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<RtiSubmission | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const submissions = useQuery({
    queryKey: ['rti', companyId],
    queryFn: () => rtiApi.list(companyId!),
    enabled: Boolean(companyId),
  })

  const list = (submissions.data?.data as RtiSubmission[] | undefined) ?? []
  const canGenerate = can('rti.generate')
  const canSubmit = can('rti.submit')

  const handleAdd = (type: RtiSubmissionType) => {
    if (type === 'FPS') setFpsModalOpen(true)
    else if (type === 'EPS') setMode({ type: 'create-eps' })
    else setMode({ type: 'create-additional' })
  }

  const selectSubmission = (id: string) => setMode({ type: 'detail', id })

  async function confirmDelete() {
    if (!companyId || !pendingDelete || !isRtiEditable(pendingDelete.status)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await rtiApi.remove(companyId, idOf(pendingDelete))
      await queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      if (mode.type === 'detail' && mode.id === idOf(pendingDelete)) {
        setMode({ type: 'empty' })
      }
      setPendingDelete(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this submission')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="RTI"
        actions={canGenerate ? <AddSubmissionMenu onSelect={handleAdd} /> : undefined}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-[#d9d9d9] pr-4">
          {submissions.isLoading ? (
            <Loading />
          ) : list.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#d9d9d9] px-4 py-10 text-center text-sm font-medium text-navy/50">
              No submissions yet. Use “Add Submission” to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((submission) => (
                <SubmissionListItem
                  key={idOf(submission)}
                  submission={submission}
                  active={mode.type === 'detail' && mode.id === idOf(submission)}
                  canDelete={canGenerate && isRtiEditable(submission.status)}
                  onClick={() => selectSubmission(idOf(submission))}
                  onDelete={() => {
                    setDeleteError(null)
                    setPendingDelete(submission)
                  }}
                />
              ))}
            </div>
          )}
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto pl-6">
          {mode.type === 'empty' ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <p className="text-2xl font-medium text-navy/30">Select a submission</p>
            </div>
          ) : mode.type === 'create-eps' ? (
            <EpsCreatePanel
              companyId={companyId!}
              onCancel={() => setMode({ type: 'empty' })}
              onCreated={selectSubmission}
            />
          ) : mode.type === 'create-additional' ? (
            <AdditionalFpsCreatePanel
              companyId={companyId!}
              onCancel={() => setMode({ type: 'empty' })}
              onCreated={selectSubmission}
            />
          ) : (
            <SubmissionDetail
              companyId={companyId!}
              submissionId={mode.id}
              canSubmit={canSubmit}
              canDelete={
                canGenerate &&
                Boolean(list.find((item) => idOf(item) === mode.id && isRtiEditable(item.status)))
              }
              onDelete={() => {
                const current = list.find((item) => idOf(item) === mode.id)
                if (!current) return
                setDeleteError(null)
                setPendingDelete(current)
              }}
            />
          )}
        </section>
      </div>

      {fpsModalOpen ? (
        <FpsGenerateModal
          companyId={companyId!}
          onClose={() => setFpsModalOpen(false)}
          onGenerated={(id) => {
            setFpsModalOpen(false)
            selectSubmission(id)
          }}
        />
      ) : null}

      {pendingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!deleting) setPendingDelete(null)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-rti-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-rti-title" className="text-lg font-semibold text-navy">
                  Delete {SUBMISSION_TYPE_SHORT[pendingDelete.submission_type]}?
                </h3>
                <p className="mt-2 text-sm text-muted">This cannot be undone.</p>
                {deleteError ? (
                  <p className="mt-3 text-sm font-medium text-brand">{deleteError}</p>
                ) : null}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={deleting}
                    onClick={() => setPendingDelete(null)}
                  >
                    Keep submission
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
