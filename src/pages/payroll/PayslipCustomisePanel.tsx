import { parsePayslipDisplayOptions, PAYSLIP_DISPLAY_OPTION_GROUPS } from './payslipDisplayOptions'
import type { PayslipDisplayOptionKey, PayslipDisplayOptions } from './payslipDisplayOptions'

export function PayslipCustomisePanel({
  options,
  onChange,
}: {
  options: PayslipDisplayOptions
  onChange: (next: PayslipDisplayOptions) => void
}) {
  const value = parsePayslipDisplayOptions(options)

  function toggle(key: PayslipDisplayOptionKey) {
    onChange({ ...value, [key]: !value[key] })
  }

  return (
    <div className="space-y-5">
      {PAYSLIP_DISPLAY_OPTION_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="mb-2 text-sm font-semibold text-navy">{group.title}</h3>
          <div className="space-y-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-start gap-3 text-sm text-navy">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 accent-navy"
                  checked={value[item.key]}
                  onChange={() => toggle(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
