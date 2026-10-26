import { Link } from "react-router-dom";
import "./footer.css";

const Footer = () => {
  return (
    <footer className="footer-box">
      <div className="footer-container">
        <div className="footer-left">
          <img
            src="/assets/logo/payrolllogo.svg"
            alt="Cedar Payroll"
            className="footer-logo"
          />
          <p className="footer-tagline">Your People, Paid Right</p>
          <div className="footer-contact">
            <div className="contact-item">
              <img src="/assets/icons/phone.svg" alt="" />
              <span>+971 50 429 4194</span>
            </div>
            <div className="contact-item">
              <img src="/assets/icons/email.svg" alt="" />
              <span>support@cedarpayroll.com</span>
            </div>
            <div className="contact-item">
              <img src="/assets/icons/location.svg" alt="" />
              <span>United Kingdom</span>
            </div>
            <div className="contact-item">
              <img src="/assets/icons/clock.svg" alt="" />
              <span>Mon - Fri, 9:00 AM - 5:30 PM</span>
            </div>
          </div>
        </div>

        <div className="footer-right">
          <div className="footer-column">
            <h4>What We Offer</h4>
            <Link to="/services">Services</Link>
            <Link to="/services">Payroll for Employees</Link>
            <Link to="/services">How It Works</Link>
            <Link to="/services">For Growing Businesses</Link>
          </div>
          <div className="footer-column">
            <h4>Who We Serve</h4>
            <Link to="/whoweserve">Industries We Serve</Link>
            <Link to="/whoweserve">Our Clients</Link>
            <Link to="/whoweserve">Client Success Stories</Link>
            <Link to="/whoweserve">Testimonials</Link>
          </div>
          <div className="footer-column">
            <h4>About Cedar Payroll</h4>
            <Link to="/about">Our Mission</Link>
            <Link to="/about">Our Vision</Link>
            <Link to="/about">Core Values</Link>
            <Link to="/about">Global Presence</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <Link to="/privacy">Privacy Policy</Link>
        <span>|</span>
        <Link to="/cookie">Cookie Policy</Link>
        <span>|</span>
        <Link to="/terms">Terms & Conditions</Link>
      </div>
    </footer>
  );
};

export default Footer;
