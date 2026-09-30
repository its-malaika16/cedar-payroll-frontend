import { useNavigate, useParams } from 'react-router-dom'
import { PayslipPreviewModal } from './PayslipPreviewModal'

export function PayslipViewPage() {
  const { runId = '', recordId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <PayslipPreviewModal
      runId={runId}
      recordId={recordId}
      onClose={() => navigate(-1)}
    />
  )
}
