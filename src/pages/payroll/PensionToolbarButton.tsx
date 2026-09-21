import { Landmark } from 'lucide-react'
import { toolbarBtn } from './CreateSendMenu'

const paidBtn =
  'inline-flex h-[47px] items-center justify-center gap-2 rounded-[8px] border-[0.5px] border-[#16a34a] bg-[#16a34a] px-4 text-sm font-medium text-white hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-100'

export function PensionToolbarButton({
  paid = false,
  disabled,
  onClick,
}: {
  paid?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" className={paid ? paidBtn : toolbarBtn} disabled={disabled} onClick={onClick}>
      <Landmark size={16} />
      <span className="flex flex-col items-start leading-none">
        <span>Pension</span>
        {paid ? <span className="mt-1 text-[10px] font-semibold">Paid</span> : null}
      </span>
    </button>
  )
}
