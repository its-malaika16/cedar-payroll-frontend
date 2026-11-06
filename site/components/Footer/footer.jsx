import { Link } from "react-router-dom";
import "./footer.css";

const APP_STORE_URL = "https://apps.apple.com/app/cedar-payroll/id6827439911";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.cedarpayroll.app";
const LINKEDIN_URL = "https://linkedin.com/company/cedar-payroll";
const INSTAGRAM_URL = "https://www.instagram.com/cedar_payroll/?utm_source=ig_web_button_share_sheet";

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
              <a href="mailto:support@cedarpayroll.com">support@cedarpayroll.com</a>
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
          <div className="footer-columns">
            <div className="footer-column">
              <h4>What We Offer</h4>
              <Link to="/services#services">Services</Link>
              <Link to="/services#payroll-for-employees">Payroll for Employees</Link>
              <Link to="/services#how-it-works">How It Works</Link>
              <Link to="/services#growing-businesses">For Growing Businesses</Link>
            </div>
            <div className="footer-column">
              <h4>Who We Serve</h4>
              <Link to="/whoweserve#industries">Industries We Serve</Link>
              <Link to="/whoweserve#our-clients">Our Clients</Link>
              <Link to="/whoweserve#success-stories">Client Success Stories</Link>
              <Link to="/whoweserve#testimonials">Testimonials</Link>
            </div>
            <div className="footer-column">
              <h4>About Cedar Payroll</h4>
              <Link to="/about#mission">Our Mission</Link>
              <Link to="/about#vision">Our Vision</Link>
              <Link to="/about#core-values">Core Values</Link>
              <Link to="/about#global-presence">Global Presence</Link>
            </div>
          </div>

          <div className="footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <span>|</span>
            <Link to="/cookie">Cookie Policy</Link>
            <span>|</span>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
        </div>

        <div className="footer-apps">
          <p className="footer-apps-title">Get Cedar Payroll on the go</p>
          <div className="footer-store-badges">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/assets/icons/app-store-badge.svg"
                alt="Download on the App Store"
              />
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/assets/icons/google-play-badge.svg?v=2"
                alt="Get it on Google Play"
              />
            </a>
          </div>
        </div>

        <div className="footer-social">
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Cedar Payroll on LinkedIn"
          >
            <LinkedInIcon />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Cedar Payroll on Instagram"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>
    </footer>
  );
};

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 36 36" role="img" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M10.4 15.1h3.05V26H10.4V15.1Zm1.52-4.86c-.98 0-1.78.8-1.78 1.78s.8 1.8 1.8 1.8h.01c.99 0 1.79-.81 1.79-1.8 0-.98-.81-1.78-1.82-1.78ZM16.2 15.1h2.92v1.49h.04c.41-.77 1.4-1.58 2.88-1.58 3.09 0 3.66 2.03 3.66 4.68V26h-3.05v-5.52c0-.1-.02-.2-.02-.3 0-.96-.18-1.88-1.45-1.88-1.44 0-1.71 1.12-1.71 2.28V26H16.2V15.1Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 36 36" role="img" aria-hidden="true">
      <defs>
        <radialGradient id="ig-footer" cx="30%" cy="107%" r="120%">
          <stop offset="0%" stopColor="#f9ce34" />
          <stop offset="45%" stopColor="#ee2a7b" />
          <stop offset="100%" stopColor="#6228d7" />
        </radialGradient>
      </defs>
      <rect width="36" height="36" rx="8" fill="url(#ig-footer)" />
      <rect x="10" y="10" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="18" cy="18" r="4.1" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="23.3" cy="12.7" r="1.15" fill="#fff" />
    </svg>
  );
}

export default Footer;
