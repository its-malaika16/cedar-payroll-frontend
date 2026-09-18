import { Plus } from 'lucide-react'
import type { RtiSubmissionType } from './rtiTypes'
import { useMenuOpen } from '../CreateSendMenu'

const OPTIONS: {
  type: RtiSubmissionType
  title: string
  description: string
}[] = [
  {
    type: 'FPS',
    title: 'Payroll Submission (FPS)',
    description: 'Submit employee pay and deduction details to HMRC.',
  },
  {
    type: 'EPS',
    title: 'Employer Summary (EPS)',
    description: 'Report employer payments, adjustments, and periods with no employee pay.',
  },
  {
    type: 'ADDITIONAL_FPS',
    title: 'Additional Payroll Submission',
    description: 'Submit updated or corrected year-to-date employee figures.',
  },
]

export function AddSubmissionMenu({
  onSelect,
}: {
  onSelect: (type: RtiSubmissionType) => void
}) {
  const { ref, open, setOpen } = useMenuOpen()

  return (
    <div className="relative" ref={ref} data-menu>
      <button
        type="button"
        className="inline-flex h-[47px] items-center justify-center gap-2 rounded-[8px] bg-navy px-5 text-sm font-medium text-white transition hover:bg-navy-mid"
        onClick={() => setOpen((value) => !value)}
      >
        <Plus size={16} />
        Add Submission
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[340px] overflow-hidden rounded-[12px] border border-[#d9d9d9] bg-white shadow-lg">
          {OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              className="block w-full border-b border-[#eee] px-4 py-3 text-left last:border-0 hover:bg-cream"
              onClick={() => {
                setOpen(false)
                onSelect(option.type)
              }}
            >
              <span className="block text-sm font-semibold text-navy">{option.title}</span>
              <span className="mt-0.5 block text-xs font-medium text-navy/55">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
