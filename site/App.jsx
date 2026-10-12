import './App.css';
import { Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar/navbar.jsx';
import Home from './pages/home.jsx';
import Features from './pages/features.jsx';
import About from './pages/about.jsx';
import Contact from './pages/contact.jsx';
import ScrollToTop from './components/ScrollToTop';
import TermsPage from './pages/TermsPage.jsx';
import Privacy from './pages/PrivacyPage.jsx';
import Support from './pages/support.jsx';
import WhoweServe from './pages/whoweserve.jsx';
import Footer from './components/Footer/footer.jsx';
import Cookie from './pages/CookiePage.jsx';


function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Features />} />
        <Route path="/terms" element={<TermsPage/>} />
        <Route path="/privacy" element={<Privacy/>} />
        <Route path="/support" element={<Support/>} />
        <Route path="/whoweserve" element={<WhoweServe/>} />
        <Route path="/cookie" element={<Cookie/>} />
      </Routes>
      <Footer />
    </>
  );
}

export default App; 