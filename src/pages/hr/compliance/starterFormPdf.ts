function pdfName(fileName: string) {
  const base = fileName.replace(/\.(pdf|doc|docx|html|htm)$/i, '').trim() || 'Starter-Form'
  return `${base}.pdf`
}

function isPdf(bytes: ArrayBuffer) {
  const head = new TextDecoder().decode(bytes.slice(0, 5))
  return head.startsWith('%PDF')
}

function isHtml(bytes: ArrayBuffer) {
  const head = new TextDecoder().decode(bytes.slice(0, 256)).trim().toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html')
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function htmlToPdfBlob(html: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.width = '794px'
  iframe.style.height = '1123px'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.border = '0'
  iframe.style.zIndex = '-1'
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Could not prepare the starter form PDF')
    doc.open()
    doc.write(html)
    doc.close()
    await wait(250)
    await doc.fonts?.ready.catch(() => undefined)
    await Promise.all(
      [...doc.images].map((image) =>
        image.decode ? image.decode().catch(() => undefined) : Promise.resolve(),
      ),
    )

    const target = (doc.querySelector('.starter-sheet') as HTMLElement | null) ?? doc.body
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    })

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 8) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    return pdf.output('blob')
  } finally {
    iframe.remove()
  }
}

export function starterFormPdfFilename(fileName: string) {
  return pdfName(fileName)
}

export async function starterFormPdfFromHtml(html: string) {
  return htmlToPdfBlob(html)
}

export async function starterFormDownloadBlob(file: Blob) {
  const buffer = await file.arrayBuffer()
  if (isPdf(buffer)) {
    return new Blob([buffer], { type: 'application/pdf' })
  }
  if (isHtml(buffer)) {
    return htmlToPdfBlob(new TextDecoder().decode(buffer))
  }
  return file
}
