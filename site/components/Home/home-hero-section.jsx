import { useState } from "react";
import "./home-hero-section.css";
import ContactModal from "./contact-modal";
import HeroIllustration from "./hero-illustration";

const ticker = [
  {
    title: "Accurate Payroll",
    copy: "Get it right, everytime.",
    icon: "/assets/icons/payslip.svg",
  },
  {
    title: "On time payments",
    copy: "Reliable payments, right on schedule.",
    icon: "/assets/icons/calendar.svg",
  },
  {
    title: "Secure Payroll",
    copy: "Your data, always protected.",
    icon: "/assets/icons/lock.svg",
  },
  {
    title: "Effortless management",
    copy: "Payroll made simple and stress-free.",
    icon: "/assets/icons/employee-feature.svg",
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
          <div className="hero-features-inner">
            {ticker.map((item) => (
              <div className="hero-feature" key={item.title}>
                <span className="hero-feature-icon">
                  <img src={item.icon} alt="" />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showModal && (
        <ContactModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

export default HeroBanner;
