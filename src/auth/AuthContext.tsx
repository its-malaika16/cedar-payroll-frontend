import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api'
import { COMPANY_KEY, SESSION_EXPIRED_EVENT, TOKEN_KEY } from '../api/client'
import type {
  AuthPayload,
  BureauAccess,
  CompanyMembership,
  EmployeeAccess,
  User,
} from '../types'

type AuthContextValue = {
  loading: boolean
  token: string | null
  user: User | null
  memberships: CompanyMembership[]
  employeeAccess: EmployeeAccess[]
  bureauAccess: BureauAccess[]
  companyId: string | null
  setCompanyId: (id: string) => void
  companies: { id: string; name: string; modules: string[] }[]
  adminCompanies: { id: string; name: string; modules: string[] }[]
  isSuperAdmin: boolean
  isEmployeeOnly: boolean
  canUseEmployeePortal: boolean
  canUseAdminPortal: boolean
  canSwitchPortals: boolean
  currentEmployee: EmployeeAccess | null
  permissions: string[]
  modules: string[]
  can: (permission: string) => boolean
  hasModule: (module: string) => boolean
  homePath: string
  login: (email: string, password: string) => Promise<string>
  register: (email: string, password: string, confirm: string) => Promise<string>
  logout: () => void
  refresh: () => Promise<void>
  isBureauAdmin: boolean
  isCompanyAdmin: boolean
  canManageOrganizations: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function membershipsFrom(payload: Partial<AuthPayload> | null | undefined) {
  return payload?.memberships ?? payload?.company_access ?? []
}

export function homePathFromAccess(payload: Partial<AuthPayload> | null | undefined) {
  const memberships = membershipsFrom(payload)
  const bureauAccess = payload?.bureau_access ?? []
  const employeeAccess = payload?.employee_access ?? []
  const employeeOnly =
    !payload?.user?.is_super_admin &&
    memberships.length === 0 &&
    bureauAccess.length === 0 &&
    employeeAccess.length > 0
  return employeeOnly ? '/portal' : '/'
}

function isBureauScopedRole(roleName?: string | null) {
  return String(roleName ?? '').toUpperCase().startsWith('BUREAU_')
}

function isCompanyAdminRole(roleName?: string | null) {
  const value = String(roleName ?? '').toUpperCase().replace(/\s+/g, '_')
  return value === 'COMPANY_ADMIN' || value === 'COMPANY_ADMINISTRATOR'
}

function companiesFrom(
  memberships: CompanyMembership[],
  employeeAccess: EmployeeAccess[],
  bureauAccess: BureauAccess[],
) {
  const map = new Map<string, { id: string; name: string; modules: string[] }>()
  for (const membership of memberships) {
    map.set(membership.company_id, {
      id: membership.company_id,
      name: membership.company_name,
      modules: membership.modules ?? [],
    })
  }
  for (const bureau of bureauAccess) {
    if (!isBureauScopedRole(bureau.role_name)) continue
    for (const company of bureau.companies ?? []) {
      map.set(company.company_id, {
        id: company.company_id,
        name: company.company_name,
        modules: company.modules ?? [],
      })
    }
  }
  for (const employee of employeeAccess) {
    if (!map.has(employee.company_id)) {
      map.set(employee.company_id, {
        id: employee.company_id,
        name: employee.company_name,
        modules: employee.modules ?? [],
      })
    }
  }
  return [...map.values()]
}

function adminCompaniesFrom(
  memberships: CompanyMembership[],
  bureauAccess: BureauAccess[],
) {
  const map = new Map<string, { id: string; name: string; modules: string[] }>()
  for (const membership of memberships) {
    map.set(membership.company_id, {
      id: membership.company_id,
      name: membership.company_name,
      modules: membership.modules ?? [],
    })
  }
  for (const bureau of bureauAccess) {
    if (!isBureauScopedRole(bureau.role_name)) continue
    for (const company of bureau.companies ?? []) {
      map.set(company.company_id, {
        id: company.company_id,
        name: company.company_name,
        modules: company.modules ?? [],
      })
    }
  }
  return [...map.values()]
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [memberships, setMemberships] = useState<CompanyMembership[]>([])
  const [employeeAccess, setEmployeeAccess] = useState<EmployeeAccess[]>([])
  const [bureauAccess, setBureauAccess] = useState<BureauAccess[]>([])
  const [companyId, setCompanyIdState] = useState(
    () => localStorage.getItem(COMPANY_KEY),
  )

  const applySession = (payload: AuthPayload, accessToken?: string) => {
    const nextToken = accessToken ?? payload.access_token ?? token
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)
    }
    const nextUser = payload.user ?? (payload as unknown as User)
    setUser(nextUser)
    setMemberships(membershipsFrom(payload))
    setEmployeeAccess(payload.employee_access ?? [])
    setBureauAccess(payload.bureau_access ?? [])
  }

  useEffect(() => {
    function onSessionExpired() {
      setToken(null)
      setUser(null)
      setMemberships([])
      setEmployeeAccess([])
      setBureauAccess([])
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const response = await authApi.profile()
        if (cancelled) return
        applySession({
          ...(response.data as AuthPayload),
          user: response.data as User,
          access_token: token,
          memberships: membershipsFrom(response.data as AuthPayload),
          employee_access: (response.data as AuthPayload).employee_access,
          bureau_access: (response.data as AuthPayload).bureau_access,
        })
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [token])

  const companies = useMemo(
    () => companiesFrom(memberships, employeeAccess, bureauAccess),
    [memberships, employeeAccess, bureauAccess],
  )
  const adminCompanies = useMemo(
    () => adminCompaniesFrom(memberships, bureauAccess),
    [memberships, bureauAccess],
  )

  useEffect(() => {
    if (!companies.length) return
    if (!companyId || !companies.some((company) => company.id === companyId)) {
      setCompanyIdState(companies[0].id)
      localStorage.setItem(COMPANY_KEY, companies[0].id)
    }
  }, [companies, companyId])

  const currentMembership = memberships.find(
    (membership) => membership.company_id === companyId,
  )
  const currentBureauPermissions = bureauAccess.flatMap(
    (bureau) => bureau.permissions ?? [],
  )
  const currentEmployee =
    employeeAccess.find((item) => item.company_id === companyId) ?? null
  const isSuperAdmin = Boolean(user?.is_super_admin)
  const isBureauAdmin = bureauAccess.some(
    (bureau) => bureau.role_name === 'BUREAU_ADMIN',
  )
  const hasBureauScopedAccess = bureauAccess.some((bureau) =>
    isBureauScopedRole(bureau.role_name),
  )
  const canManageOrganizations = isSuperAdmin || isBureauAdmin
  const isCompanyAdmin =
    !isSuperAdmin &&
    !hasBureauScopedAccess &&
    isCompanyAdminRole(currentMembership?.role_name)
  const permissions = isSuperAdmin || isBureauAdmin
    ? ['*']
    : [
        ...(currentMembership?.permissions ?? []),
        ...currentBureauPermissions,
      ]
  const modules =
    currentMembership?.modules ??
    companies.find((company) => company.id === companyId)?.modules ??
    []

  const canUseEmployeePortal = employeeAccess.length > 0
  const canUseAdminPortal =
    isSuperAdmin || memberships.length > 0 || bureauAccess.length > 0
  const isEmployeeOnly = canUseEmployeePortal && !canUseAdminPortal

  const value: AuthContextValue = {
    loading,
    token,
    user,
    memberships,
    employeeAccess,
    bureauAccess,
    companyId,
    setCompanyId: (id: string) => {
      localStorage.setItem(COMPANY_KEY, id)
      setCompanyIdState(id)
    },
    companies,
    adminCompanies,
    isSuperAdmin,
    isBureauAdmin,
    isCompanyAdmin,
    canManageOrganizations,
    isEmployeeOnly,
    canUseEmployeePortal,
    canUseAdminPortal,
    canSwitchPortals: canUseEmployeePortal && canUseAdminPortal,
    currentEmployee,
    permissions,
    modules,
    can: (permission: string) =>
      isSuperAdmin || isBureauAdmin || permissions.includes(permission),
    hasModule: (module: string) =>
      isSuperAdmin || isBureauAdmin || modules.includes(module),
    homePath: isEmployeeOnly ? '/portal' : '/',
    login: async (email, password) => {
      const response = await authApi.login(email, password)
      applySession(response.data, response.data.access_token)
      return homePathFromAccess(response.data)
    },
    register: async (email, password, confirm) => {
      const response = await authApi.register(email, password, confirm)
      applySession(response.data, response.data.access_token)
      return homePathFromAccess(response.data)
    },
    refresh: async () => {
      if (!token) return
      const response = await authApi.profile()
      applySession({
        ...(response.data as AuthPayload),
        user: response.data as User,
        access_token: token,
        memberships: membershipsFrom(response.data as AuthPayload),
        employee_access: (response.data as AuthPayload).employee_access,
        bureau_access: (response.data as AuthPayload).bureau_access,
      })
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(COMPANY_KEY)
      setToken(null)
      setUser(null)
      setMemberships([])
      setEmployeeAccess([])
      setBureauAccess([])
      setCompanyIdState(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
