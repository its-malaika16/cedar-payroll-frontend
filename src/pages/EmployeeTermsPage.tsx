import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/ui'
import type { EmployeeTermsDocument } from '../types'

export function EmployeeTermsView({
  document,
  error,
  saving,
  onContinue,
}: {
  document: EmployeeTermsDocument
  error?: string | null
  saving?: boolean
  onContinue: (choice: 'accept' | 'decline') => void
}) {
  const [choice, setChoice] = useState<'accept' | 'decline' | null>(null)
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#17375e]/45 px-4 py-6">
      <div className="flex max-h-[min(88vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_rgba(23,55,94,0.22)]">
        <div className="relative border-b border-[#eceae6] px-5 py-4 pr-14 sm:px-6">
          <h1 className="text-lg font-semibold text-navy sm:text-xl">Employee Terms and Conditions</h1>
          <p className="mt-1 text-xs font-medium text-muted">
            Version {document.version} · Effective {document.effective_on}
          </p>
          <button
            type="button"
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-navy hover:bg-cream disabled:opacity-50"
            aria-label="Close terms"
            disabled={saving}
            onClick={() => onContinue('decline')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {error ? (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          <p className="text-sm font-medium leading-6 text-navy">{document.intro}</p>
          {document.sections.map((section) => (
            <section key={section.heading} className="mt-5">
              <h2 className="text-sm font-semibold text-navy">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-2 text-sm font-medium leading-6 text-navy">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="border-t border-[#eceae6] px-5 py-4 sm:px-6">
          <fieldset className="space-y-3">
            <legend className="sr-only">Accept or decline these Terms</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#eceae6] px-3 py-3 has-[:checked]:border-navy has-[:checked]:bg-cream">
              <input
                type="radio"
                name="employee-terms-choice"
                className="mt-1 size-4 accent-navy"
                checked={choice === 'accept'}
                onChange={() => setChoice('accept')}
                disabled={saving}
              />
              <span className="text-sm font-medium leading-5 text-navy">
                I have read and agree to the Employee Terms and Conditions.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#eceae6] px-3 py-3 has-[:checked]:border-navy has-[:checked]:bg-cream">
              <input
                type="radio"
                name="employee-terms-choice"
                className="mt-1 size-4 accent-navy"
                checked={choice === 'decline'}
                onChange={() => setChoice('decline')}
                disabled={saving}
              />
              <span className="text-sm font-medium leading-5 text-navy">I do not agree.</span>
            </label>
          </fieldset>
          <button
            type="button"
            disabled={saving || !choice}
            onClick={() => choice && onContinue(choice)}
            className="mt-4 h-[48px] w-full rounded-[15px] bg-navy text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmployeeTermsPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const document = auth.employeeTerms

  if (!document) return null

  return (
    <EmployeeTermsView
      document={document}
      error={error}
      saving={saving}
      onContinue={(choice) => {
        setError(null)
        setSaving(true)
        if (choice === 'accept') {
          void auth
            .acceptEmployeeTerms()
            .then(() => navigate(auth.homePath, { replace: true }))
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'Could not save your acceptance')
            })
            .finally(() => setSaving(false))
          return
        }
        void auth
          .declineEmployeeTerms()
          .then((message) => {
            navigate('/login', { replace: true, state: { termsMessage: message } })
          })
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Could not decline these Terms')
            setSaving(false)
          })
      }}
    />
  )
}
