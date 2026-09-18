import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText } from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { menuItemClass, menuPanel, useMenuOpen } from '../payroll/CreateSendMenu'
import iconForms from '../../assets/brand/icon-forms.png'
import { FORM_TYPES, type FormType } from './formsOptions'

const subItem =
  'flex w-full items-center px-3 py-2.5 text-left text-xs font-medium text-navy hover:bg-[#f0f5fe]'

export function EmployeesFormsMenu({
  employeeId,
  active = false,
}: {
  employeeId?: string
  active?: boolean
}) {
  const navigate = useNavigate()
  const { ref, open, setOpen } = useMenuOpen()
  const [hover, setHover] = useState<FormType | null>(null)

  function go(path: string) {
    setOpen(false)
    setHover(null)
    navigate(path)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`inline-flex h-[47px] min-w-[137px] items-center justify-center gap-2 rounded-[8px] border-[0.5px] px-4 text-sm font-medium ${
          active || open
            ? 'border-navy bg-white text-navy'
            : 'border-navy bg-white text-navy hover:bg-cream'
        }`}
        onClick={() =>
          setOpen((value) => {
            const next = !value
            setHover(next ? 'p11' : null)
            return next
          })
        }
      >
        <BrandIcon src={iconForms} alt="" className="h-4 w-3" />
        Forms
      </button>
      {open ? (
        <div className={`${menuPanel} left-0 z-40 flex`}>
          <div className="w-[180px] py-1">
            {FORM_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${hover === item.value ? 'bg-[#f0f5fe] text-navy' : ''} ${menuItemClass} justify-between`}
                onMouseEnter={() => setHover(item.value)}
                onClick={() => setHover(item.value)}
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} />
                  {item.label}
                </span>
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
          {hover ? (
            <div className="w-[280px] border-l border-[#d9d9d9] py-1">
              <button
                type="button"
                className={`${subItem} bg-[#f0f5fe]`}
                onClick={() =>
                  go(
                    employeeId
                      ? `/employees/forms/${hover}/${employeeId}`
                      : `/employees/forms/${hover}`,
                  )
                }
              >
                {formLabel(hover)} for Current Employee
              </button>
              <button
                type="button"
                className={subItem}
                onClick={() => go(`/employees/forms/${hover}/download`)}
              >
                Download {formLabel(hover)} for multiple employees
              </button>
              <button
                type="button"
                className={subItem}
                onClick={() => go(`/employees/forms/${hover}/email`)}
              >
                Email {formLabel(hover)} for multiple employees
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function formLabel(type: FormType) {
  return FORM_TYPES.find((item) => item.value === type)?.label ?? type.toUpperCase()
}
