import "./home-cta-section.css";
import { Link } from "react-router-dom";

const PayrollCtaSection = () => {
  return (
    <section className="payroll-cta">
      <div className="payroll-cta-container">
        <div className="cta-card">
          <p className="cedar-kicker">Get started</p>
          <h2 className="cta-title">Ready to streamline your payroll?</h2>
          <p className="cta-description">
            Join businesses who trust Cedar Payroll for accurate, on-time pay.
            Speak with our team and see how quickly you can go live.
          </p>
          <div className="cta-actions">
            <Link to="/contact" className="cta-button">
              Contact Us
            </Link>
            <Link to="/services" className="cta-link">
              View all services
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PayrollCtaSection;
