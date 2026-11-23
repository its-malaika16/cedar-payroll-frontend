import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from 'react'
import { Bold, Heading2, Italic, List, ListOrdered } from 'lucide-react'
import { cleanClipboardHtml, emailPlainText, plainTextToEmailHtml, sanitizeEmailHtml } from '../lib/emailHtml'

type FormatState = {
  bold: boolean
  italic: boolean
  heading: boolean
  bullets: boolean
  numbers: boolean
}

function currentBlock() {
  return document.queryCommandValue('formatBlock').replace(/[<>]/g, '').toLowerCase()
}

function readFormat(): FormatState {
  const block = currentBlock()
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    heading: block === 'h2' || block === 'h3',
    bullets: document.queryCommandState('insertUnorderedList'),
    numbers: document.queryCommandState('insertOrderedList'),
  }
}

export function EmailEditor({
  value,
  onChange,
  placeholder = 'Write the update or information request. Recipients can reply in Outlook.',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<FormatState>({
    bold: false,
    italic: false,
    heading: false,
    bullets: false,
    numbers: false,
  })
  const empty = emailPlainText(value).length === 0

  useEffect(() => {
    const node = ref.current
    if (!node || node.innerHTML === value) return
    node.innerHTML = value
  }, [value])

  useEffect(() => {
    const update = () => {
      const node = ref.current
      const selection = document.getSelection()
      if (!node || !selection || !node.contains(selection.anchorNode)) return
      setActive(readFormat())
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [])

  function emit() {
    onChange(ref.current?.innerHTML ?? '')
  }

  function run(command: string, arg?: string) {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    emit()
    setActive(readFormat())
  }

  function heading() {
    ref.current?.focus()
    const block = currentBlock()
    document.execCommand('formatBlock', false, block === 'h2' ? '<p>' : '<h2>')
    emit()
    setActive(readFormat())
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    const clean = html.trim() ? cleanClipboardHtml(html) : plainTextToEmailHtml(text)
    if (!clean) return
    ref.current?.focus()
    document.execCommand('insertHTML', false, clean)
    emit()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-[#e4e8ee] bg-white px-2 py-2">
        <FormatButton label="Bold" pressed={active.bold} onClick={() => run('bold')}>
          <Bold size={15} />
        </FormatButton>
        <FormatButton label="Italic" pressed={active.italic} onClick={() => run('italic')}>
          <Italic size={15} />
        </FormatButton>
        <FormatButton label="Heading" pressed={active.heading} onClick={heading}>
          <Heading2 size={15} />
        </FormatButton>
        <FormatButton label="Bullets" pressed={active.bullets} onClick={() => run('insertUnorderedList')}>
          <List size={15} />
        </FormatButton>
        <FormatButton label="Numbering" pressed={active.numbers} onClick={() => run('insertOrderedList')}>
          <ListOrdered size={15} />
        </FormatButton>
      </div>
      <div
        ref={ref}
        className={`email-editor min-h-32 w-full px-4 py-4 text-sm leading-6 text-navy outline-none ${empty ? 'is-empty' : ''}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Message"
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={onPaste}
        suppressContentEditableWarning
      />
    </div>
  )
}

function FormatButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 text-xs font-semibold ${
        pressed ? 'border-navy bg-navy text-white' : 'border-[#d5dbe6] bg-white text-navy hover:bg-[#f7f9fc]'
      }`}
    >
      {children}
      {label}
    </button>
  )
}

export function EmailHtmlBody({ html }: { html: string }) {
  return <div className="email-editor" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(html) }} />
}
