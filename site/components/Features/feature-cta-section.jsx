import "./feature-cta-section.css";
import { Link } from "react-router-dom";

const ManagedPayrollSection = () => {
  return (
    <section className="managed-payroll">
      <div className="managed-payroll-container">
        {/* Left Image */}

        {/* <div className="managed-payroll-image-wrapper">
          <img src = "assets/images/feature-page.svg"
            alt="Managed Payroll"
            className="managed-payroll-image"
          />
        </div> */}

        {/* Right Content */}

        <div className="managed-payroll-content">
          <p className="managed-payroll-title CTAheading">
            Perfect for Growing Businesses
          </p>

          <p className="managed-payroll-description body-5">
            Our managed payroll service takes the burden off
            your shoulders. From calculating pay to ensuring
            HMRC compliance, our team of experts handles it
            all so you can focus on what matters most –
            running your business.
          </p>

          <div className="managed-payroll-benefits body-6">
            <p><span style={{ color: "red" }}>✓</span>  Save up to 40 hours per month</p>
            <p><span style={{ color: "red" }}>✓</span>  100% HMRC compliant</p>
            <p><span style={{ color: "red" }}>✓</span>  Dedicated account manager</p>
          </div>

          <Link to="/contact" className="managed-payroll-btn">
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ManagedPayrollSection;