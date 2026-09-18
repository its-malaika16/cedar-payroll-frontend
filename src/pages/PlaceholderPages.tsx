import { PageHeader } from '../components/ui'

export function PlaceholderPage({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={body} />
      <div className="flex min-h-[420px] items-center justify-center rounded-[10px] border border-[#d9d9d9] bg-white">
        <p className="text-2xl font-medium text-muted">{title}</p>
      </div>
    </div>
  )
}
