import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Outlet, useMatch, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, Search } from 'lucide-react'
import { employeesApi } from '../../api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading, PageHeader } from '../../components/ui'
import { BrandIcon } from '../../components/BrandIcon'
import { employeeLeaveDate, fullName, idOf } from '../../lib/format'
import type { Employee } from '../../types'
import iconPerson from '../../assets/brand/icon-person.png'
import iconPlus from '../../assets/brand/icon-plus.svg'
import iconBenefits from '../../assets/brand/icon-benefits.png'
import iconPensions from '../../assets/brand/icon-pensions.svg'
import { EmployeeCsvImport } from './EmployeeCsvImport'
import { guessCsvMapping, parseCsvText, type ParsedCsv } from './csvImport'
import { EmployeesFormsMenu } from './EmployeesFormsMenu'
import { formLabel, isFormType } from './formsOptions'

export function EmployeesPage() {
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const creating = Boolean(useMatch({ path: '/employees/new', end: true }))
  const calendarRoot = Boolean(useMatch({ path: '/employees/calendar', end: true }))
  const calendarMatch = useMatch('/employees/calendar/:employeeId')
  const pensionsRoot = Boolean(useMatch({ path: '/employees/pensions', end: true }))
  const pensionsMatch = useMatch('/employees/pensions/:employeeId')
  const benefitsRoot = Boolean(useMatch({ path: '/employees/benefits', end: true }))
  const benefitsMatch = useMatch('/employees/benefits/:employeeId')
  const formsRoot = useMatch({ path: '/employees/forms/:formType', end: true })
  const formsChild = useMatch('/employees/forms/:formType/:employeeId')
  const formsEmail = useMatch('/employees/forms/:formType/email')
  const formsDownload = useMatch('/employees/forms/:formType/download')
  const formsAction = formsChild?.params.employeeId
  const inFormsBulk = Boolean(formsEmail || formsDownload) || formsAction === 'email' || formsAction === 'download'
  const inCalendar = calendarRoot || Boolean(calendarMatch)
  const inPensions = pensionsRoot || Boolean(pensionsMatch)
  const inBenefits = benefitsRoot || Boolean(benefitsMatch)
  const inForms = Boolean(formsRoot || formsChild || formsEmail || formsDownload)
  const formType =
    formsEmail?.params.formType ??
    formsDownload?.params.formType ??
    formsChild?.params.formType ??
    formsRoot?.params.formType
  const selected = useMatch('/employees/:employeeId')
  const selectedId = inCalendar
    ? calendarMatch?.params.employeeId
    : inPensions
      ? pensionsMatch?.params.employeeId
      : inBenefits
        ? benefitsMatch?.params.employeeId
      : inForms
      ? inFormsBulk
        ? undefined
        : formsChild?.params.employeeId
      : creating
        ? undefined
        : selected?.params.employeeId
  const inWorkspace = creating || Boolean(selectedId) || inCalendar || inPensions || inBenefits || inForms
  const [queryText, setQueryText] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<ParsedCsv | null>(null)
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({})
  const [csvError, setCsvError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) setAddOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const query = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const employees = ((query.data?.data ?? []) as Employee[])
    .filter((employee) => {
      const haystack = `${fullName(employee.first_name, employee.last_name)} ${employee.employee_code ?? ''} ${employee.email ?? ''}`.toLowerCase()
      return haystack.includes(queryText.toLowerCase())
    })
    .sort((left, right) =>
      fullName(left.first_name, left.last_name).localeCompare(
        fullName(right.first_name, right.last_name),
        'en-GB',
        { sensitivity: 'base' },
      ),
    )
  const selectedEmployee = employees.find((employee) => idOf(employee) === selectedId)
  const visibleIds = employees.map((employee) => idOf(employee))
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id))
  const navySelected = inCalendar || inPensions || inBenefits || inForms
  const breadcrumb = inCalendar ? (
    <span className="text-navy">Calendar</span>
  ) : inPensions ? (
    <span className="text-navy">Pensions</span>
  ) : inBenefits ? (
    <span className="text-navy">Benefits</span>
  ) : inFormsBulk ? (
    <>
      Documents &nbsp;&nbsp;&gt;&nbsp;&nbsp;
      {formLabel(formType)} &nbsp;&nbsp;&gt;&nbsp;&nbsp;
      <span className="text-navy">
        {formsDownload || formsAction === 'download'
          ? 'Download for multiple employees'
          : 'Email for multiple employees'}
      </span>
    </>
  ) : inForms ? (
    <>
      Forms &nbsp;&nbsp;&gt;&nbsp;&nbsp;
      <span className="text-navy">{formLabel(formType)} for Current Employee</span>
    </>
  ) : (
    <>
      Add Employee &nbsp;&nbsp;&gt;&nbsp;&nbsp;
      <span className="text-navy">
        {fullName(selectedEmployee?.first_name, selectedEmployee?.last_name) === '—'
          ? 'Employee Name'
          : fullName(selectedEmployee?.first_name, selectedEmployee?.last_name)}
      </span>
    </>
  )

  const calendarPath = selectedId ? `/employees/calendar/${selectedId}` : '/employees/calendar'
  const pensionsPath = selectedId ? `/employees/pensions/${selectedId}` : '/employees/pensions'
  const benefitsPath = selectedId ? `/employees/benefits/${selectedId}` : '/employees/benefits'
  const pageTitle = csvFile
    ? 'Upload CSV'
    : creating
    ? 'Add Employee'
    : inCalendar
      ? 'Calendar'
      : inPensions
        ? 'Pensions'
        : inBenefits
          ? 'Benefits'
        : inForms
          ? 'Forms'
          : 'Edit Details'

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id))
      return [...new Set([...current, ...visibleIds])]
    })
  }

  async function deleteSelected() {
    if (!companyId || selectedIds.length === 0) return
    try {
      setDeleting(true)
      setDeleteError(null)
      const chunkSize = 25
      for (let index = 0; index < selectedIds.length; index += chunkSize) {
        await employeesApi.removeMany(
          companyId,
          selectedIds.slice(index, index + chunkSize),
        )
      }
      if (selectedId && selectedIds.includes(selectedId)) navigate('/employees')
      setSelectedIds([])
      setConfirmingDelete(false)
      await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
    } catch (err) {
      setDeleteError(
        err instanceof ApiError && err.status === 504
          ? 'Deleting these employees timed out. Select a smaller group and try again.'
          : err instanceof Error
            ? err.message
            : 'Could not delete these employees',
      )
    } finally {
      setDeleting(false)
    }
  }

  async function onCsvPicked(file: File | undefined) {
    if (!file) return
    setCsvError(null)
    try {
      const parsed = parseCsvText(await file.text(), file.name)
      setCsvFile(parsed)
      setCsvMapping(guessCsvMapping(parsed.headers))
      setAddOpen(false)
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Could not read this CSV file')
    }
  }

  const addEmployeeMenu = (
    <div ref={addMenuRef} className="relative print:hidden">
      <Button
        className="h-[47px] min-w-[153px]"
        disabled={creating}
        onClick={() => setAddOpen((open) => !open)}
      >
        <BrandIcon src={iconPlus} alt="" className="size-3" tone="navy" />
        Add Employee {addOpen ? '▴' : '▾'}
      </Button>
      {addOpen ? (
        <div className="absolute right-0 z-30 mt-1 w-[230px] rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-sm">
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
            onClick={() => {
              setAddOpen(false)
              csvInputRef.current?.click()
            }}
          >
            Upload CSV
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
            onClick={() => {
              setAddOpen(false)
              setCsvFile(null)
              navigate('/employees/new')
            }}
          >
            Add employee manually
          </button>
        </div>
      ) : null}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void onCsvPicked(file)
        }}
      />
    </div>
  )

  const actions = (
    <>
      <Link to={calendarPath} className="print:hidden">
        <Button variant={inCalendar ? 'primary' : 'secondary'} className="h-[47px] min-w-[129px]">
          <CalendarDays size={16} />
          Calendar
        </Button>
      </Link>
      <Link to={pensionsPath} className="print:hidden">
        <Button variant={inPensions ? 'primary' : 'secondary'} className="h-[47px] min-w-[129px]">
          <BrandIcon src={iconPensions} alt="" className="size-4" tone={inPensions ? 'navy' : 'light'} />
          Pensions
        </Button>
      </Link>
      <Link to={benefitsPath} className="print:hidden">
        <Button variant={inBenefits ? 'primary' : 'secondary'} className="h-[47px] min-w-[131px]">
          <BrandIcon src={iconBenefits} alt="" className="h-[17px] w-[21px]" tone={inBenefits ? 'navy' : 'light'} />
          Benefits
        </Button>
      </Link>
      <EmployeesFormsMenu
        employeeId={selectedId}
        active={inForms}
      />
      {addEmployeeMenu}
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {inWorkspace ? (
        <div className="mb-4 shrink-0 print:hidden">
          <p className="text-sm font-semibold text-[#607080]">
            Employees &nbsp;&nbsp;&gt;&nbsp;&nbsp;
            {breadcrumb}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
            >
              <ChevronLeft size={25} strokeWidth={2.4} />
              {pageTitle}
            </button>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
        </div>
      ) : (
        <PageHeader
          title="Employees"
          subtitle="Manage and view all team members in your organisation."
          actions={actions}
        />
      )}
      <div className="flex min-h-0 flex-1 gap-6">
        <aside className="flex h-full min-h-0 w-[288px] shrink-0 flex-col overflow-hidden rounded-[10px] bg-white shadow-[3px_4px_1.95px_rgba(0,0,0,0.09)] print:hidden">
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someVisibleSelected && !allVisibleSelected
                }}
                onChange={toggleAllVisible}
                disabled={employees.length === 0}
                className="size-3.5 rounded border-[#d9d9d9] accent-navy"
              />
              All Employees
            </label>
            {selectedIds.length ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null)
                  setConfirmingDelete(true)
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Delete ({selectedIds.length})
              </button>
            ) : null}
          </div>
          <label className="relative mx-3 mt-3 block">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-navy"
            />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Search Employee..."
              className="h-[35px] w-full rounded-[10px] border border-[#d9d9d9] bg-white pr-3 pl-9 text-sm font-medium text-navy outline-none placeholder:text-muted"
            />
          </label>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {query.isLoading ? (
              <Loading />
            ) : employees.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">No employees</p>
            ) : (
              employees.map((employee) => {
                const id = idOf(employee)
                const active = selectedId === id
                const hasLeft = Boolean(employeeLeaveDate(employee))
                const checked = selectedIds.includes(id)
                return (
                  <div
                    key={id}
                    className={`flex w-full items-center gap-2 border-b border-[#d9d9d9] px-3 py-3.5 text-left text-base font-medium ${
                      active
                        ? navySelected
                          ? 'bg-navy text-white'
                          : 'bg-[#f0f5fe] text-navy'
                        : 'bg-white text-navy hover:bg-[#f0f5fe]/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelected(id)}
                      onClick={(event) => event.stopPropagation()}
                      className="size-3.5 shrink-0 rounded border-[#d9d9d9] accent-navy"
                      aria-label={`Select ${fullName(employee.first_name, employee.last_name)}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (inForms && isFormType(formType)) {
                          navigate(`/employees/forms/${formType}/${id}`)
                          return
                        }
                        if (inPensions) {
                          navigate(`/employees/pensions/${id}`)
                          return
                        }
                        if (inBenefits) {
                          navigate(`/employees/benefits/${id}`)
                          return
                        }
                        navigate(inCalendar ? `/employees/calendar/${id}` : `/employees/${id}`)
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <BrandIcon
                        src={iconPerson}
                        alt=""
                        className={`h-[19px] w-4 ${hasLeft && !active ? 'opacity-50' : ''}`}
                        tone={active && navySelected ? 'navy' : 'light'}
                      />
                      <span className={`truncate ${hasLeft ? 'opacity-50' : ''}`}>
                        {fullName(employee.first_name, employee.last_name)}
                      </span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </aside>
        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-4">
          {csvError || deleteError ? (
            <div className="mb-4">
              <Alert>{csvError || deleteError}</Alert>
            </div>
          ) : null}
          {csvFile ? (
            <EmployeeCsvImport
              file={csvFile}
              mapping={csvMapping}
              onMappingChange={setCsvMapping}
              onCancel={() => {
                setCsvFile(null)
                setCsvMapping({})
                setCsvError(null)
              }}
              onImported={() => {
                setCsvFile(null)
                setCsvMapping({})
              }}
            />
          ) : creating || selectedId || inCalendar || inPensions || inBenefits || inForms ? (
            <Outlet />
          ) : (
            <div className="flex h-full min-h-[520px] items-center justify-center">
              <p className="text-[32px] font-medium text-muted">Select an employee</p>
            </div>
          )}
        </section>
      </div>
      {confirmingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!deleting) setConfirmingDelete(false)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-employees-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-employees-title" className="text-lg font-semibold text-navy">
                  Delete {selectedIds.length === 1 ? 'this employee' : `${selectedIds.length} employees`}?
                </h3>
                <p className="mt-2 text-sm text-muted">
                  This cannot be undone. Their payroll records and payslips will also be deleted.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={deleting}
                    onClick={() => void deleteSelected()}
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
