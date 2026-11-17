import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const PAGES: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Cedar Payroll | UK payroll software and HR for employers',
    description:
      'Cedar Payroll is UK payroll software and HR for employers, bureaux and employees. Run PAYE, HMRC RTI, payslips, leave and self-service on web, iOS and Android.',
  },
  '/uk-payroll-software': {
    title: 'UK payroll software and HR software | Cedar Payroll',
    description:
      'UK payroll software for PAYE, HMRC RTI, payslips and statutory forms, plus HR for leave, rota, attendance and employee self-service. Cedar Payroll.',
  },
  '/about': {
    title: 'About | Cedar Payroll',
    description: 'Cedar Payroll Limited builds payroll software and bureau services for accurate, on-time pay.',
  },
  '/services': {
    title: 'UK payroll services and HR software | Cedar Payroll',
    description:
      'UK payroll processing, HMRC RTI, payslips, P45/P60, leave, attendance and employee self-service from Cedar Payroll.',
  },
  '/whoweserve': {
    title: 'Who we serve | Cedar Payroll',
    description: 'Payroll for employers and bureaux across industries in the UK and the regions we serve.',
  },
  '/contact': {
    title: 'Contact | Cedar Payroll',
    description: 'Contact Cedar Payroll Limited: support@cedarpayroll.com or +971 50 429 4194.',
  },
  '/support': {
    title: 'Support | Cedar Payroll',
    description: 'Help and support for Cedar Payroll employers, bureaux, and employees.',
  },
  '/privacy': {
    title: 'Privacy policy | Cedar Payroll',
    description: 'How Cedar Payroll Limited collects, uses, and stores payroll and account data.',
  },
  '/terms': {
    title: 'Terms and conditions | Cedar Payroll',
    description: 'Terms for using Cedar Payroll’s website, software, and mobile apps.',
  },
  '/cookie': {
    title: 'Cookie policy | Cedar Payroll',
    description: 'How Cedar Payroll uses cookies on cedarpayroll.com.',
  },
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let node = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(attr, key)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

export function MarketingMeta() {
  const { pathname } = useLocation()
  const page = PAGES[pathname] ?? {
    title: 'Cedar Payroll',
    description: 'UK payroll software and bureau services from Cedar Payroll Limited.',
  }
  const canonical = `https://cedarpayroll.com${pathname === '/' ? '/' : pathname}`

  useEffect(() => {
    document.title = page.title
    upsertMeta('name', 'description', page.description)
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonical
    upsertMeta('property', 'og:title', page.title)
    upsertMeta('property', 'og:description', page.description)
    upsertMeta('property', 'og:url', canonical)
  }, [canonical, page.description, page.title])

  return null
}
