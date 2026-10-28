import { Link } from "react-router-dom";
import ScrollReveal from "../ScrollReveal";
import "./home-cta-section.css";

const PayrollCtaSection = () => {
  return (
    <ScrollReveal className="payroll-cta">
      <div className="payroll-cta-split">
        <div className="cta-panel">
          <p className="cedar-kicker">Let&apos;s get started</p>
          <h2 className="cta-title">
            Ready to Streamline
            <br />
            Your Payroll?
          </h2>
          <p className="cta-description">
            Join hundreds of UK businesses who trust Cedar Capital Payroll for their payroll needs. Get started today with our 14-day free trial.
          </p>
          <Link to="/services" className="cta-link-light">
            View All Services
          </Link>
        </div>

        <div className="cta-panel cta-panel-right">
          <p className="cedar-kicker">Stay informed</p>
          <h2 className="cta-title">Stay Updated</h2>
          <p className="cta-description">
            Subscribe to receive emails, news, and updates straight from Cedar Payroll.
          </p>
          <Link to="/contact" className="cta-link-red">
            Contact Us
          </Link>
        </div>
      </div>
    </ScrollReveal>
  );
};

export default PayrollCtaSection;
