import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { bureauApi } from '../../api'
import {
  Alert,
  Button,
  Field,
  Input as UiInput,
  Loading,
  Select,
  onSubmit,
} from '../../components/ui'
import { formatDate, labelize } from '../../lib/format'

const ROLE_LABELS: Record<string, string> = {
  BUREAU_ADMIN: 'Bureau Admin',
  BUREAU_HR_MANAGER: 'Bureau HR Manager',
  BUREAU_PAYROLL_MANAGER: 'Bureau Payroll Manager',
  BUREAU_PAYROLL_PROCESSOR: 'Bureau Payroll Processor',
}

const FALLBACK_ROLES = [
  'BUREAU_ADMIN',
  'BUREAU_HR_MANAGER',
  'BUREAU_PAYROLL_MANAGER',
  'BUREAU_PAYROLL_PROCESSOR',
]

function roleLabel(roleName?: string | null) {
  if (!roleName) return 'Bureau Admin'
  return ROLE_LABELS[roleName] ?? labelize(roleName).replace(/\bHr\b/g, 'HR')
}

export function BureauTeamPanel() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('BUREAU_ADMIN')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('BUREAU_ADMIN')
  const [editPassword, setEditPassword] = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const query = useQuery({
    queryKey: ['bureau-team'],
    queryFn: () => bureauApi.team(),
  })
  const members = query.data?.data ?? []

  const rolesQuery = useQuery({
    queryKey: ['bureau-roles'],
    queryFn: () => bureauApi.roles(),
  })
  const roleOptions = (rolesQuery.data?.data ?? [])
    .map((item) => item.role_name)
    .filter((name) => name.startsWith('BUREAU_'))
  const roles = roleOptions.length > 0 ? roleOptions : FALLBACK_ROLES

  const addAdmin = useMutation({
    mutationFn: (body: {
      name: string
      email: string
      password: string
      role: string
    }) => bureauApi.addAdmin(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bureau-team'] }),
  })

  const updateAdmin = useMutation({
    mutationFn: (body: { memberId: string; name: string; email: string; role: string; password?: string }) =>
      bureauApi.updateAdmin(body.memberId, {
        name: body.name,
        email: body.email,
        role: body.role,
        password: body.password,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bureau-team'] }),
  })

  function startEdit(member: (typeof members)[number]) {
    setEditingId(member.id)
    setEditName(member.name || '')
    setEditEmail(member.email || '')
    setEditRole(member.role_name && roles.includes(member.role_name) ? member.role_name : 'BUREAU_ADMIN')
    setEditPassword('')
    setShowEditPassword(false)
    setEditError(null)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
        <h3 className="mb-1 text-lg font-semibold uppercase tracking-[0.04em] text-navy">
          Add bureau team member
        </h3>
        <p className="mb-4 text-sm text-muted">
          Choose a bureau role. Bureau Admin is selected unless you change it. They can sign
          in with the email and password you set.
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
              role,
            })
            setName('')
            setEmail('')
            setPassword('')
            setRole('BUREAU_ADMIN')
            setShowPassword(false)
            setMessage(`${roleLabel(role)} added`)
          }, setError, setSaving)}
        >
          {error ? <Alert>{error}</Alert> : null}
          {message ? <Alert tone="success">{message}</Alert> : null}
          <Field label="Role">
            <Select
              variant="outline"
              value={roles.includes(role) ? role : 'BUREAU_ADMIN'}
              onChange={(event) => setRole(event.target.value)}
            >
              {roles.map((name) => (
                <option key={name} value={name}>
                  {roleLabel(name)}
                </option>
              ))}
            </Select>
          </Field>
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
            <span className="relative block">
              <UiInput
                variant="outline"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="pr-12"
              />
              <button
                type="button"
                className="absolute top-1/2 right-4 -translate-y-1/2 text-navy"
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            <span className="mt-2 block text-xs text-muted">
              At least 8 characters, with uppercase, lowercase, a number and a special
              character.
            </span>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !name.trim() || !email.trim() || !password}>
              {saving ? 'Adding…' : 'Add team member'}
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
          <p className="text-sm text-muted">No bureau team members have been added yet.</p>
        ) : (
          <ul className="divide-y divide-[#eee]">
            {members.map((member) => (
              <li key={member.id} className="py-3 first:pt-0 last:pb-0">
                {editingId === member.id ? (
                  <form
                    className="space-y-3"
                    onSubmit={onSubmit(async () => {
                      if (!editName.trim()) throw new Error('Enter a name')
                      if (!editEmail.trim()) throw new Error('Enter an email')
                      await updateAdmin.mutateAsync({
                        memberId: member.id,
                        name: editName.trim(),
                        email: editEmail.trim(),
                        role: editRole,
                        ...(editPassword ? { password: editPassword } : {}),
                      })
                      setEditingId(null)
                      setEditPassword('')
                    }, setEditError, setEditSaving)}
                  >
                    {editError ? <Alert>{editError}</Alert> : null}
                    <Field label="Name">
                      <UiInput
                        variant="outline"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Email">
                      <UiInput
                        variant="outline"
                        type="email"
                        value={editEmail}
                        onChange={(event) => setEditEmail(event.target.value)}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Role">
                      <Select
                        variant="outline"
                        value={roles.includes(editRole) ? editRole : 'BUREAU_ADMIN'}
                        onChange={(event) => setEditRole(event.target.value)}
                      >
                        {roles.map((name) => (
                          <option key={name} value={name}>
                            {roleLabel(name)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Password">
                      <span className="relative block">
                        <UiInput
                          variant="outline"
                          type={showEditPassword ? 'text' : 'password'}
                          value={editPassword}
                          onChange={(event) => setEditPassword(event.target.value)}
                          autoComplete="new-password"
                          placeholder="Leave blank to keep the current password"
                          className="pr-12"
                        />
                        <button
                          type="button"
                          className="absolute top-1/2 right-4 -translate-y-1/2 text-navy"
                          onClick={() => setShowEditPassword((open) => !open)}
                          aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                        >
                          {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </span>
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null)
                          setEditError(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={editSaving || !editName.trim() || !editEmail.trim()}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-navy">{member.name || '—'}</span>
                      <span className="text-sm text-navy">{member.email}</span>
                      <span className="text-xs text-muted">{roleLabel(member.role_name)}</span>
                      <span className="text-xs text-muted">Last login {formatDate(member.last_login)}</span>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => startEdit(member)}>
                      Edit
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
