import { Outlet } from 'react-router-dom'
import '../../marketing.css'
import Navbar from '@site/components/Navbar/navbar.jsx'
import Footer from '@site/components/Footer/footer.jsx'
import ScrollToTop from '@site/components/ScrollToTop.jsx'

export function WebsiteShell() {
  return (
    <div className="cedar-site">
      <ScrollToTop />
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  )
}
