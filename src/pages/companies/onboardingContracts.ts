export const ONBOARDING_CONTRACT_TEMPLATES = [
  {
    id: 'payroll_services_agreement',
    title: 'Payroll Services Agreement',
    module: 'PAYROLL',
  },
  {
    id: 'transfer_of_liabilities',
    title: 'Transfer Of Liabilities',
    module: 'PAYROLL',
  },
] as const

export type OnboardingContractSource = (typeof ONBOARDING_CONTRACT_TEMPLATES)[number]['id'] | 'upload'

export function onboardingContractTemplate(id: string) {
  return ONBOARDING_CONTRACT_TEMPLATES.find((item) => item.id === id) ?? null
}

export function onboardingTemplatePreviewPath(id: string, clientName?: string) {
  const params = new URLSearchParams()
  if (clientName?.trim()) params.set('clientName', clientName.trim())
  const query = params.toString()
  return `/onboarding/contract-templates/${encodeURIComponent(id)}${query ? `?${query}` : ''}`
}

export function appendOnboardingContract(form: FormData, input: {
  source: OnboardingContractSource
  title: string
  module: string
  file: File | null
}) {
  const template = onboardingContractTemplate(input.source)
  if (template) {
    form.append('template', template.id)
    form.append('title', template.title)
    form.append('module', template.module)
    return
  }
  if (input.file) form.append('file', input.file)
  form.append('title', input.title.trim())
  form.append('module', input.module)
}
