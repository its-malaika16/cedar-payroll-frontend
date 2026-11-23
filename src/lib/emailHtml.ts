function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function emailPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function looksLikeEmailHtml(value: string) {
  return /<\/?[a-z][^>]*>/i.test(value)
}

function isWordListItem(el: HTMLElement) {
  const style = el.getAttribute('style') || ''
  const cls = el.getAttribute('class') || ''
  return /mso-list\s*:/i.test(style) || /MsoListParagraph/i.test(cls)
}

function wordListKind(el: HTMLElement): 'ul' | 'ol' {
  const ignore = [...el.querySelectorAll('span')].find((span) =>
    /mso-list\s*:\s*Ignore/i.test(span.getAttribute('style') || ''),
  )
  const marker = (ignore?.textContent || '').replace(/\u00a0/g, ' ').trim()
  if (/^\d+[.)]?$/.test(marker)) return 'ol'
  const text = (el.textContent || '').replace(/\u00a0/g, ' ').trim()
  return /^\d+[.)]\s+\S/.test(text) ? 'ol' : 'ul'
}

function stripWordMarker(el: HTMLElement) {
  for (const span of [...el.querySelectorAll('span')]) {
    if (/mso-list\s*:\s*Ignore/i.test(span.getAttribute('style') || '')) span.remove()
  }
}

function liftWordLists(root: HTMLElement) {
  const nodes = [...root.childNodes]
  let index = 0
  while (index < nodes.length) {
    const node = nodes[index]
    if (!(node instanceof HTMLElement) || !isWordListItem(node)) {
      index += 1
      continue
    }
    const kind = wordListKind(node)
    const group: HTMLElement[] = []
    while (index < nodes.length) {
      const current = nodes[index]
      if (!(current instanceof HTMLElement) || !isWordListItem(current) || wordListKind(current) !== kind) break
      group.push(current)
      index += 1
    }
    const list = root.ownerDocument.createElement(kind)
    group[0].replaceWith(list)
    for (const item of group) {
      stripWordMarker(item)
      const li = root.ownerDocument.createElement('li')
      while (item.firstChild) li.appendChild(item.firstChild)
      list.appendChild(li)
      if (item.isConnected) item.remove()
    }
  }
}

function plainMarkerKind(el: HTMLElement): 'ul' | 'ol' | null {
  if (el.querySelector('ul, ol, li')) return null
  const tag = el.tagName.toLowerCase()
  if (tag !== 'p' && tag !== 'div') return null
  const text = (el.textContent || '').replace(/\u00a0/g, ' ')
  if (/^\s*(?:[•·●▪◦]|\*|-)\s+\S/.test(text)) return 'ul'
  if (/^\s*\d+[.)]\s+\S/.test(text)) return 'ol'
  return null
}

function stripLeadingMarker(el: HTMLElement, kind: 'ul' | 'ol') {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const first = walker.nextNode()
  if (!first) return
  const pattern = kind === 'ol' ? /^\s*\d+[.)]\s+/ : /^\s*(?:[•·●▪◦]|\*|-)\s+/
  first.textContent = (first.textContent || '').replace(pattern, '')
}

function liftPlainListParagraphs(root: HTMLElement) {
  const nodes = [...root.childNodes]
  let index = 0
  while (index < nodes.length) {
    const node = nodes[index]
    const kind = node instanceof HTMLElement ? plainMarkerKind(node) : null
    if (!kind || !(node instanceof HTMLElement)) {
      index += 1
      continue
    }
    const group: HTMLElement[] = []
    while (index < nodes.length) {
      const current = nodes[index]
      if (!(current instanceof HTMLElement) || plainMarkerKind(current) !== kind) break
      group.push(current)
      index += 1
    }
    const list = root.ownerDocument.createElement(kind)
    group[0].replaceWith(list)
    for (const item of group) {
      stripLeadingMarker(item, kind)
      const li = root.ownerDocument.createElement('li')
      while (item.firstChild) li.appendChild(item.firstChild)
      list.appendChild(li)
      if (item.isConnected) item.remove()
    }
  }
}

function headingLevel(el: HTMLElement, tag: string): 'h2' | 'h3' | null {
  if (tag === 'h1' || tag === 'h2') return 'h2'
  if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'h3'
  const style = el.getAttribute('style') || ''
  const size = /font-size\s*:\s*(\d+(?:\.\d+)?)(px|pt)/i.exec(style)
  if (!size) return null
  const px = size[2].toLowerCase() === 'pt' ? Number(size[1]) * 1.333 : Number(size[1])
  const bold = /font-weight\s*:\s*(bold|[6-9]00)/i.test(style)
  if (!bold) return null
  if (px >= 20) return 'h2'
  if (px >= 16) return 'h3'
  return null
}

function inlineWrap(el: HTMLElement, inner: string, tag: string) {
  const style = el.getAttribute('style') || ''
  const normalWeight = /font-weight\s*:\s*(normal|[1-4]00)\b/i.test(style)
  const bold =
    !normalWeight &&
    (tag === 'b' || tag === 'strong' || /font-weight\s*:\s*(bold|[6-9]00)/i.test(style))
  const italic = tag === 'i' || tag === 'em' || /font-style\s*:\s*italic/i.test(style)
  const underline = tag === 'u' || /text-decoration\s*:[^;]*underline/i.test(style)
  let content = inner
  if (underline && tag !== 'u') content = `<u>${content}</u>`
  if (italic && tag !== 'i' && tag !== 'em') content = `<em>${content}</em>`
  if (bold && tag !== 'b' && tag !== 'strong') content = `<strong>${content}</strong>`
  if (tag === 'b' || tag === 'strong') return bold ? `<strong>${inner}</strong>` : inner
  if (tag === 'i' || tag === 'em') return `<em>${inner}</em>`
  if (tag === 'u') return `<u>${inner}</u>`
  return content
}

function unwrapBlocks(inner: string) {
  return inner
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '<br>')
    .replace(/(?:<br>\s*)+$/g, '')
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? '').replace(/\u00a0/g, '&nbsp;')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'title' || tag === 'img') {
    return ''
  }
  if (tag === 'br') return '<br>'
  const inner = [...el.childNodes].map(serializeNode).join('')
  if (!inner.trim() && tag !== 'br') return ''
  if (tag === 'ul' || tag === 'ol') return `<${tag}>${inner}</${tag}>`
  if (tag === 'li') return `<li>${unwrapBlocks(inner)}</li>`
  const heading = headingLevel(el, tag)
  if (heading) return `<${heading}>${inlineWrap(el, unwrapBlocks(inner), tag)}</${heading}>`
  if (tag === 'p' || tag === 'div' || tag === 'blockquote' || tag === 'tr') {
    return `<p>${inlineWrap(el, inner, tag)}</p>`
  }
  return inlineWrap(el, inner, tag)
}

function tidy(html: string) {
  return html
    .replace(/(?:<p>\s*<\/p>)+/g, '')
    .replace(/(?:<p>\s*<br>\s*<\/p>)+/g, '<p><br></p>')
    .trim()
}

export function sanitizeEmailHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return tidy([...doc.body.childNodes].map(serializeNode).join(''))
}

function liftLists(root: HTMLElement) {
  liftWordLists(root)
  liftPlainListParagraphs(root)
  for (const child of [...root.children]) {
    if (child instanceof HTMLElement && child.tagName !== 'UL' && child.tagName !== 'OL') {
      liftLists(child)
    }
  }
}

export function cleanClipboardHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  liftLists(doc.body)
  return tidy([...doc.body.childNodes].map(serializeNode).join(''))
}

export function plainTextToEmailHtml(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const parts: string[] = []
  let list: 'ul' | 'ol' | null = null
  const close = () => {
    if (!list) return
    parts.push(`</${list}>`)
    list = null
  }
  for (const line of lines) {
    const bullet = /^\s*(?:[•·●▪◦]|\*|-)\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (bullet) {
      if (list !== 'ul') {
        close()
        parts.push('<ul>')
        list = 'ul'
      }
      parts.push(`<li>${escapeHtml(bullet[1])}</li>`)
      continue
    }
    if (numbered) {
      if (list !== 'ol') {
        close()
        parts.push('<ol>')
        list = 'ol'
      }
      parts.push(`<li>${escapeHtml(numbered[1])}</li>`)
      continue
    }
    if (!line.trim()) {
      close()
      continue
    }
    close()
    parts.push(`<p>${escapeHtml(line)}</p>`)
  }
  close()
  return parts.join('')
}
