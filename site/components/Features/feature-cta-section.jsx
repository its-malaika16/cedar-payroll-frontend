import { Link } from "react-router-dom";
import ScrollReveal from "../ScrollReveal";
import "./feature-cta-section.css";

const ManagedPayrollSection = () => {
  return (
    <ScrollReveal className="managed-payroll" id="growing-businesses">
      <div className="managed-payroll-container">
        <div className="managed-payroll-image-wrapper">
          <svg
            className="managed-payroll-art"
            viewBox="0 0 686 535"
            role="img"
            aria-label="Payroll growth dashboard"
          >
            <ellipse
              className="managed-orb managed-orb--navy"
              cx="362.5"
              cy="162.5"
              rx="168.5"
              ry="162.5"
            />
            <ellipse
              className="managed-orb managed-orb--red"
              cx="228.5"
              cy="349"
              rx="187.5"
              ry="186"
            />
            <ellipse
              className="managed-orb managed-orb--grey"
              cx="162"
              cy="223"
              rx="101"
              ry="102"
            />
            <image
              href="/assets/redesign/growing-hi.png"
              xlinkHref="/assets/redesign/growing-hi.png"
              x="0"
              y="38"
              width="686"
              height="457"
              preserveAspectRatio="xMidYMid meet"
            />
          </svg>
        </div>

        <div className="managed-payroll-content">
          <h2 className="managed-payroll-title">
            Perfect for Growing
            <br />
            Businesses
          </h2>
          <p className="managed-payroll-description">
            Our managed payroll service takes the burden off your shoulders. From
            calculating pay to ensuring HMRC compliance, our team of experts
            handles it all so you can focus on what matters most – running your
            business.
          </p>
          <div className="managed-payroll-benefits">
            <p>Save up to 40 hours per month</p>
            <p>100% HMRC compliant</p>
            <p>Dedicated account manager</p>
          </div>
          <Link to="/contact" className="managed-payroll-btn">
            Contact Us
          </Link>
        </div>
      </div>
    </ScrollReveal>
  );
};

export default ManagedPayrollSection;
