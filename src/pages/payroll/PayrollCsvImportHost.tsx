import { type ReactNode, useRef, useState } from 'react'
import {
  guessCsvMappingFor,
  invertCsvMapping,
  parseCsvText,
  type ParsedCsv,
} from '../employees/csvImport'
import { PayrollCsvImport, PayrollCsvReferences } from './PayrollCsvImport'
import { PayrollImportMenu } from './PayrollImportMenu'
import { fieldsForKind, type PayrollImportKind } from './payrollCsv'

export function PayrollCsvImportHost({
  companyId,
  runId,
  locked,
  payFrequency,
  onError,
  onImported,
  children,
}: {
  companyId?: string | null
  runId?: string
  locked?: boolean
  payFrequency?: string | null
  onError: (message: string) => void
  onImported?: (count: number) => void
  children: (args: { menu: ReactNode; panel: ReactNode | null }) => ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<PayrollImportKind | null>(null)
  const [file, setFile] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [showRefs, setShowRefs] = useState(false)

  function choose(nextKind: PayrollImportKind) {
    if (!companyId) {
      onError('Select a company first')
      return
    }
    if (!runId) {
      onError('Start or select a payroll run first')
      return
    }
    if (locked) {
      onError('Reopen this payroll run before importing a CSV')
      return
    }
    setKind(nextKind)
    setShowRefs(false)
    inputRef.current?.click()
  }

  async function onCsvPicked(picked: File | undefined) {
    if (!picked || !kind) return
    try {
      const parsed = parseCsvText(await picked.text(), picked.name)
      setFile(parsed)
      setMapping(invertCsvMapping(guessCsvMappingFor(parsed.headers, fieldsForKind(kind))))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read this CSV file')
      setKind(null)
    }
  }

  function clear() {
    setFile(null)
    setMapping({})
    setKind(null)
  }

  const menu = (
    <>
      <PayrollImportMenu
        onImport={choose}
        onShowReferences={() => {
          setShowRefs(true)
          setFile(null)
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0]
          event.target.value = ''
          void onCsvPicked(picked)
        }}
      />
    </>
  )

  const panel =
    showRefs ? (
      <PayrollCsvReferences onClose={() => setShowRefs(false)} />
    ) : file && kind && companyId && runId ? (
      <PayrollCsvImport
        file={file}
        kind={kind}
        mapping={mapping}
        companyId={companyId}
        runId={runId}
        payFrequency={payFrequency}
        onMappingChange={setMapping}
        onCancel={clear}
        onImported={(count) => {
          clear()
          onImported?.(count)
        }}
      />
    ) : null

  return <>{children({ menu, panel })}</>
}
