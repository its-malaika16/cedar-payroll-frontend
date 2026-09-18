import { ArrowLeftRight, Building2, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function usePortalSwitch() {
  const auth = useAuth()
  const navigate = useNavigate()

  function goToEmployeePortal() {
    const match =
      auth.employeeAccess.find((item) => item.company_id === auth.companyId) ??
      auth.employeeAccess[0]
    if (match) auth.setCompanyId(match.company_id)
    navigate('/portal')
  }

  function goToAdminPortal() {
    const match =
      auth.adminCompanies.find((item) => item.id === auth.companyId) ??
      auth.adminCompanies[0]
    if (match) auth.setCompanyId(match.id)
    navigate('/')
  }

  return {
    canSwitch: auth.canSwitchPortals,
    goToEmployeePortal,
    goToAdminPortal,
  }
}

export function PortalSwitchBanner({ variant }: { variant: 'admin' | 'employee' }) {
  const { canSwitch, goToAdminPortal, goToEmployeePortal } = usePortalSwitch()
  if (!canSwitch) return null

  if (variant === 'admin') {
    return (
      <div className="mt-6 rounded-[20px] border border-[#d7dee8] bg-white p-5 md:flex md:items-center md:justify-between md:gap-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
            <UserRound size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">You also have an employee record</p>
            <p className="mt-1 text-sm text-muted">
              Open the employee portal for your payslips, rota, leave, attendance and documents.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={goToEmployeePortal}
          className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] bg-navy px-5 text-sm font-semibold text-white md:mt-0"
        >
          Open employee portal
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-[20px] border border-[#d7dee8] bg-white p-5 md:flex md:items-center md:justify-between md:gap-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
          <Building2 size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">You also have admin access</p>
          <p className="mt-1 text-sm text-muted">
            Switch back to the admin portal to manage payroll, HR, rota and the company.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={goToAdminPortal}
        className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] bg-navy px-5 text-sm font-semibold text-white md:mt-0"
      >
        Open admin portal
      </button>
    </div>
  )
}

export function PortalSwitchButton({ variant }: { variant: 'admin' | 'employee' }) {
  const { canSwitch, goToAdminPortal, goToEmployeePortal } = usePortalSwitch()
  if (!canSwitch) return null

  if (variant === 'admin') {
    return (
      <button
        type="button"
        onClick={goToEmployeePortal}
        className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[15px] border border-[#d9d9d9] bg-white px-4 text-sm font-semibold text-navy hover:bg-cream"
      >
        <ArrowLeftRight size={15} />
        Employee portal
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={goToAdminPortal}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[12px] border border-[#d9d9d9] bg-white px-4 text-sm font-semibold text-navy hover:bg-[#f4f7fb]"
    >
      <ArrowLeftRight size={15} />
      Admin portal
    </button>
  )
}
