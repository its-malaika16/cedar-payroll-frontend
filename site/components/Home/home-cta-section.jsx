import "./home-cta-section.css";
import { Link } from "react-router-dom";

const PayrollCtaSection = () => {
  return (
    <section className="payroll-cta">
      <div className="payroll-cta-container">
        {/* Left Card */}

        <div className="cta-card cta-left">
          <h2 className="cta-title">
            Ready to Streamline
            <br />
            Your Payroll?
          </h2>

          <p className="cta-description">
            Join hundreds of UK businesses who trust Cedar
             Payroll for their payroll needs. Get
            started today with our 14-day free trial.
          </p>

          <Link to="/services" className="cta-link">
            View All Services
          </Link>
        </div>

        {/* Right Card */}

        <div className="cta-card cta-right">
          <h2 className="cta-title">
            Stay Updated
          </h2>

          <p className="cta-description">
            Subscribe to receive emails, news, and updates
            straight from Cedar Payroll insights
            and announcements delivered to your inbox.
          </p>

          <Link to="/contact" className="cta-button">
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PayrollCtaSection;