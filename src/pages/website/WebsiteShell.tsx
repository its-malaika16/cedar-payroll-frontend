import { Outlet } from 'react-router-dom'
import Navbar from '@site/components/Navbar/navbar.jsx'
import Footer from '@site/components/Footer/footer.jsx'
import ScrollToTop from '@site/components/ScrollToTop.jsx'
import '../../marketing.css'

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
