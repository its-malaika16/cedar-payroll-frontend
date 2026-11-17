import { Outlet } from 'react-router-dom'
import '../../marketing.css'
import '@site/index.css'
import Navbar from '@site/components/Navbar/navbar.jsx'
import Footer from '@site/components/Footer/footer.jsx'
import ScrollToTop from '@site/components/ScrollToTop.jsx'
import { MarketingMeta } from './MarketingMeta'

export function WebsiteShell() {
  return (
    <div className="cedar-site">
      <MarketingMeta />
      <ScrollToTop />
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  )
}
