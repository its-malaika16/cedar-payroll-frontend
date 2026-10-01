import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Loading } from './ui'
import { fullName } from '../lib/format'
import sidebarLogo from '../assets/brand/sidebar-logo.png'

export function OnboardingLayout() {
  const auth = useAuth()
  const navigate = useNavigate()

  if (auth.loading) return <Loading />
  if (!auth.token) return <Navigate to="/login" replace />
  if (!auth.needsOnboarding) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex items-center justify-between gap-4 bg-navy px-5 py-3 text-white">
        <NavLink to="/onboarding" className="flex items-center gap-3">
          <img src={sidebarLogo} alt="Cedar Payroll" className="h-9 w-auto" />
          <span className="text-sm font-semibold">Onboarding</span>
        </NavLink>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">
            {fullName(auth.user?.first_name, auth.user?.last_name) || auth.user?.email}
          </span>
          <button
            type="button"
            className="rounded-[8px] bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15"
            onClick={() => {
              auth.logout()
              navigate('/login')
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
