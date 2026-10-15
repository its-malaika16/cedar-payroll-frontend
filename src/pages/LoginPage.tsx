import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Alert, onSubmit } from '../components/ui'
import logoLogin from '../assets/brand/logo-login.png'
import loginIllustration from '../assets/brand/login-illustration.png'

const fieldClass =
  'h-[52px] w-full rounded-[15px] border-0 bg-input px-4 text-base font-medium text-navy outline-none placeholder:text-muted'

function passwordRuleError(value: string) {
  if (value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must contain at least one special character'
  return null
}

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
      <span className="mb-3.5 block text-base font-medium text-navy sm:text-xl">{label}</span>
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

function CodeBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '')
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(5, index))]?.focus()
  }

  function apply(next: string, focus?: number) {
    onChange(next.replace(/\D/g, '').slice(0, 6))
    if (focus != null) requestAnimationFrame(() => focusAt(focus))
  }

  return (
    <div className="mt-10">
      <span className="mb-3.5 block text-xl font-medium text-navy">Verification code</span>
      <div className="flex gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node
            }}
            value={digit}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={6}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of 6`}
            className="h-[56px] min-w-0 flex-1 rounded-[15px] border-0 bg-input text-center text-xl font-semibold text-navy outline-none ring-0 focus:shadow-[0_0_0_2px_rgba(23,55,94,0.28)]"
            onChange={(event) => {
              const raw = event.target.value.replace(/\D/g, '')
              if (raw.length > 1) {
                apply((value.slice(0, index) + raw).slice(0, 6), Math.min(index + raw.length, 5))
                return
              }
              const next = digits.slice()
              next[index] = raw.slice(-1)
              apply(next.join(''), raw ? index + 1 : index)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index]) {
                event.preventDefault()
                const next = digits.slice()
                if (index > 0) next[index - 1] = ''
                apply(next.join(''), index - 1)
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                focusAt(index - 1)
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                focusAt(index + 1)
              }
            }}
            onPaste={(event) => {
              event.preventDefault()
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
              apply(pasted, Math.min(Math.max(pasted.length, 1) - 1, 5))
            }}
            onFocus={(event) => event.currentTarget.select()}
          />
        ))}
      </div>
    </div>
  )
}

const RESEND_SECONDS = 60

function waitLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${minutes}:${String(remain).padStart(2, '0')}`
}

function waitSecondsFromError(message: string) {
  const match = message.match(/wait (\d+) seconds/i)
  if (match) return Math.min(RESEND_SECONDS, Math.max(1, Number(match[1])))
  if (/wait a minute/i.test(message)) return RESEND_SECONDS
  return 0
}

type ResetStep = 'email' | 'code' | 'password'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'signup'>(
    location.pathname === '/register' ? 'signup' : 'login',
  )
  const [resetStep, setResetStep] = useState<ResetStep | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  if (auth.token && auth.user) {
    return <Navigate to={auth.homePath} replace />
  }

  function backToLogin() {
    setResetStep(null)
    setCode('')
    setPassword('')
    setConfirm('')
    setError(null)
    setInfo(null)
    setResendIn(0)
    setMode('login')
  }

  async function sendResetCode(resend = false) {
    if (!email.trim()) throw new Error('Enter the email address on your account')
    if (resend && resendIn > 0) return
    try {
      const result = await authApi.forgotPassword(email.trim(), resend)
      setCode('')
      setResetStep('code')
      setResendIn(RESEND_SECONDS)
      setInfo(result.message || 'We have sent a 6-digit verification code to your email.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code'
      const wait = resend ? waitSecondsFromError(message) : 0
      if (wait > 0) {
        setResendIn(wait)
        setError(null)
        return
      }
      throw err
    }
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
      <section className="flex min-h-screen items-center justify-center bg-cream px-4 py-10 sm:px-8 sm:py-16">
        <form
          className="w-full max-w-[510px]"
          onSubmit={onSubmit(async () => {
            if (resetStep === 'email') {
              await sendResetCode()
              return
            }
            if (resetStep === 'code') {
              if (!/^\d{6}$/.test(code.trim())) {
                throw new Error('Enter the 6-digit verification code from your email')
              }
              setInfo('Enter a new password for your account.')
              setResetStep('password')
              setPassword('')
              setConfirm('')
              return
            }
            if (resetStep === 'password') {
              const ruleError = passwordRuleError(password)
              if (ruleError) throw new Error(ruleError)
              if (password !== confirm) throw new Error('New password and confirm password do not match')
              const result = await authApi.resetPassword(email.trim(), code.trim(), password, confirm)
              setPassword('')
              setConfirm('')
              setCode('')
              setResetStep(null)
              setMode('login')
              setInfo(result.message || 'Password updated successfully. You can now log in.')
              return
            }
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
          <h1 className="mt-8 text-[32px] font-semibold leading-none text-navy sm:text-[40px]">
            {resetStep ? (
              <>
                Forgot your
                <br />
                password?
              </>
            ) : (
              <>
                Your People,
                <br />
                Paid Right.
              </>
            )}
          </h1>

          {resetStep ? (
            <button
              type="button"
              className="mt-8 text-left text-base font-medium text-navy"
              onClick={backToLogin}
            >
              ← Back to log in
            </button>
          ) : (
            <div className="mt-10 flex h-[52px] rounded-[15px] bg-input p-[5px]">
              <button
                type="button"
                className={`flex-1 rounded-[15px] text-base font-semibold text-brand ${
                  mode === 'login' ? 'bg-white' : ''
                }`}
                onClick={() => {
                  setMode('login')
                  setError(null)
                  setInfo(null)
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
                  setInfo(null)
                }}
              >
                Sign up
              </button>
            </div>
          )}

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

          {resetStep === 'code' ? (
            <CodeBoxes value={code} onChange={setCode} disabled={saving} />
          ) : (
            <label className="mt-10 block">
              <span className="mb-3.5 block text-xl font-medium text-navy">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                readOnly={resetStep === 'password'}
                className={fieldClass}
              />
            </label>
          )}

          {resetStep === 'password' ? (
            <>
              <PasswordField
                label="New password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
              />
            </>
          ) : null}

          {!resetStep ? (
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          ) : null}

          {!resetStep && mode === 'signup' ? (
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
              ? resetStep === 'email'
                ? 'Sending code…'
                : resetStep === 'code'
                  ? 'Checking…'
                  : resetStep === 'password'
                    ? 'Updating password…'
                    : mode === 'signup'
                      ? 'Creating account…'
                      : 'Signing in…'
              : resetStep === 'email'
                ? 'Send verification code'
                : resetStep === 'code'
                  ? 'Continue'
                  : resetStep === 'password'
                    ? 'Set new password'
                    : mode === 'signup'
                      ? 'Sign up'
                      : 'Log in'}
          </button>

          {resetStep === 'code' ? (
            <button
              type="button"
              className="mt-6 block w-full text-center text-xl font-medium text-navy disabled:text-muted disabled:opacity-80"
              disabled={saving || resendIn > 0}
              onClick={() => {
                if (resendIn > 0) return
                setError(null)
                setSaving(true)
                void sendResetCode(true)
                  .catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : 'Could not send the code')
                  })
                  .finally(() => setSaving(false))
              }}
            >
              {saving
                ? 'Sending…'
                : resendIn > 0
                  ? `Resend code in ${waitLabel(resendIn)}`
                  : 'Resend code'}
            </button>
          ) : null}

          {!resetStep && mode === 'login' ? (
            <button
              type="button"
              className="mt-6 block w-full text-center text-xl font-medium text-navy"
              onClick={() => {
                setError(null)
                setInfo('Enter your email and we will send a 6-digit verification code.')
                setResetStep('email')
                setPassword('')
                setConfirm('')
                setCode('')
              }}
            >
              Forgot password?
            </button>
          ) : null}
        </form>
      </section>
    </div>
  )
}
