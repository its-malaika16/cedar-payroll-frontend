import { useState } from "react";
import "./home-hero-section.css";
import ContactModal from "./contact-modal";
import HeroIllustration from "./hero-illustration";

const ticker = [
  {
    title: "Accurate Payroll",
    copy: "Get it right, every time.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h7.2L19 8.2V20.5H7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 3.5V8h4.8M9.2 12h6.6M9.2 15.5h6.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "On time payments",
    copy: "Reliable payments, right on schedule.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 10h16M8 3.5V7M16 3.5V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="15.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 14v1.6l1.2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Secure Payroll",
    copy: "Your data, always protected.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="11" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.2 11V8.4a3.8 3.8 0 0 1 7.6 0V11" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "Effortless management",
    copy: "Payroll made simple and stress-free.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="15.4" cy="8.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.4 18.5c.4-3 2.4-4.6 4.8-4.6s4.4 1.6 4.8 4.6M13.2 13.9c1.6-.4 3.4.4 4.6 2.4.6 1 .8 1.8.8 2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
];

const HeroBanner = () => {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");

  const openQuote = (event) => {
    event.preventDefault();
    setShowModal(true);
  };

  return (
    <>
      <section className="hero-banner">
        <div className="hero-layout">
          <div className="hero-content">
            <h1>
              PAYROLL,
              <br />
              SIMPLIFIED.
            </h1>

            <div className="hero-divider"></div>

            <p>
              Accurate, efficient, and stress-free payroll management
              for businesses of every size
            </p>

            <form className="hero-cta-row" onSubmit={openQuote}>
              <input
                type="email"
                required
                placeholder="Enter your business email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-label="Business email"
              />
              <button className="hero-btn" type="submit">
                Get Started
              </button>
            </form>
          </div>

          <div className="hero-visual">
            <HeroIllustration />
          </div>
        </div>

        <div className="hero-features">
          {ticker.map((item) => (
            <div className="hero-feature" key={item.title}>
              <span className="hero-feature-icon">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showModal && (
        <ContactModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

export default HeroBanner;
