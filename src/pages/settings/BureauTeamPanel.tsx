import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bureauApi } from '../../api'
import {
  Alert,
  Button,
  Field,
  Input as UiInput,
  Loading,
  onSubmit,
} from '../../components/ui'
import { formatDate } from '../../lib/format'

export function BureauTeamPanel() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['bureau-team'],
    queryFn: () => bureauApi.team(),
  })
  const members = query.data?.data ?? []

  const addAdmin = useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      bureauApi.addAdmin(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bureau-team'] }),
  })

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
        <h3 className="mb-1 text-lg font-semibold uppercase tracking-[0.04em] text-navy">
          Add bureau admin
        </h3>
        <p className="mb-4 text-sm text-muted">
          Create another bureau admin for this bureau. They can sign in with the email and
          password you set.
        </p>
        <form
          className="space-y-4"
          onSubmit={onSubmit(async () => {
            setMessage(null)
            if (!name.trim()) throw new Error('Enter a name')
            if (!email.trim()) throw new Error('Enter an email')
            if (!password) throw new Error('Enter a password')
            await addAdmin.mutateAsync({
              name: name.trim(),
              email: email.trim(),
              password,
            })
            setName('')
            setEmail('')
            setPassword('')
            setMessage('Bureau admin added')
          }, setError, setSaving)}
        >
          {error ? <Alert>{error}</Alert> : null}
          {message ? <Alert tone="success">{message}</Alert> : null}
          <Field label="Name">
            <UiInput
              variant="outline"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <UiInput
              variant="outline"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Password">
            <UiInput
              variant="outline"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <span className="mt-2 block text-xs text-muted">
              At least 8 characters, with uppercase, lowercase, a number and a special
              character.
            </span>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add bureau admin'}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
        <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.04em] text-navy">
          Bureau team
        </h3>
        {query.isLoading ? (
          <Loading />
        ) : query.isError ? (
          <Alert>{query.error instanceof Error ? query.error.message : 'Could not load team'}</Alert>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted">No bureau admins have been added yet.</p>
        ) : (
          <ul className="divide-y divide-[#eee]">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                <span className="font-medium text-navy">{member.name || '—'}</span>
                <span className="text-sm text-navy">{member.email}</span>
                <span className="text-xs text-muted">Last login {formatDate(member.last_login)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
