import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Alert, onSubmit } from '../components/ui'
import logoLogin from '../assets/brand/logo-login.png'
import loginIllustration from '../assets/brand/login-illustration.png'

const fieldClass =
  'h-[52px] w-full rounded-[15px] border-0 bg-input px-4 text-base font-medium text-navy outline-none placeholder:text-muted'

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="mt-9 block">
      <span className="mb-3.5 block text-xl font-medium text-navy">{label}</span>
      <span className="relative block">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="•••••••••"
          required
          autoComplete={autoComplete}
          className={`${fieldClass} pr-12 ${visible ? '' : 'tracking-[3.2px] placeholder:tracking-[3.2px]'}`}
        />
        <button
          type="button"
          className="absolute top-1/2 right-4 -translate-y-1/2 text-navy"
          onClick={() => setVisible((open) => !open)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </span>
    </label>
  )
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'signup'>(
    location.pathname === '/register' ? 'signup' : 'login',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (auth.token && auth.user) {
    return <Navigate to={auth.homePath} replace />
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden min-h-screen flex-col bg-white lg:flex">
        <div className="flex flex-1 items-center justify-center px-10 xl:px-16">
          <img
            src={loginIllustration}
            alt="Cedar Payroll dashboard on a laptop"
            width={577}
            height={397}
            className="h-auto w-full max-w-[640px] object-contain"
          />
        </div>
        <p className="px-10 pb-10 text-center text-sm font-medium leading-6 text-navy">
          Privacy Policy • Website Terms • Acceptable Use Policy
          <br />
          Cookie Policy • Terms &amp; Conditions
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-cream px-8 py-16">
        <form
          className="w-full max-w-[510px]"
          onSubmit={onSubmit(async () => {
            if (mode === 'signup') {
              const next = await auth.register(email, password, confirm)
              navigate(next)
            } else {
              const next = await auth.login(email, password)
              navigate(next)
            }
          }, setError, setSaving)}
        >
          <img
            src={logoLogin}
            alt="Cedar Payroll"
            width={171}
            height={59}
            className="h-[59px] w-[171px] object-contain object-left"
          />
          <h1 className="mt-8 text-[40px] font-semibold leading-none text-navy">
            Your People,
            <br />
            Paid Right.
          </h1>
          <div className="mt-10 flex h-[52px] rounded-[15px] bg-input p-[5px]">
            <button
              type="button"
              className={`flex-1 rounded-[15px] text-base font-semibold text-brand ${
                mode === 'login' ? 'bg-white' : ''
              }`}
              onClick={() => {
                setMode('login')
                setError(null)
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-[15px] text-base font-semibold text-brand ${
                mode === 'signup' ? 'bg-white' : ''
              }`}
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
            >
              Sign up
            </button>
          </div>
          {error ? (
            <div className="mt-6">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {info ? (
            <div className="mt-6">
              <Alert tone="info">{info}</Alert>
            </div>
          ) : null}
          <label className="mt-10 block">
            <span className="mb-3.5 block text-xl font-medium text-navy">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className={fieldClass}
            />
          </label>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {mode === 'signup' ? (
            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="mt-10 h-[52px] w-full rounded-[15px] bg-brand text-base font-semibold text-white disabled:opacity-70"
          >
            {saving
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Sign up'
                : 'Log in'}
          </button>
          {mode === 'login' ? (
            <button
              type="button"
              className="mt-6 block w-full text-center text-xl font-medium text-navy"
              onClick={() =>
                setInfo(
                  'Ask your administrator to reset your password. If your employer has already added your email, use Sign up to create your employee account.',
                )
              }
            >
              Forgot password?
            </button>
          ) : null}
        </form>
      </section>
    </div>
  )
}
