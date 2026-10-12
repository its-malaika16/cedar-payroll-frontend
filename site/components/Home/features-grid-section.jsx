import "./features-grid-section.css";
import NetworkAnimation from "./network-animation-section";

const PayrollFeaturesHero = () => {
  return (
    <section className="payroll-features-hero">
      <div className="payroll-features-container">

        <div className="animation-wrapper">
          <NetworkAnimation />
        </div>

        <div className="features-content">

          <h2 className="features-title">
            Everything You Need
            <br />
            for <span>Payroll</span>
          </h2>

          <div className="features-list">

            <div className="feature-item-list">
              <h3>✓ Employee Management</h3>
              <p>
                Store and manage all your employee
                information securely.
              </p>
            </div>

            <div className="feature-item-list">
              <h3>✓ Time-sheet Management</h3>
              <p>
                Track working hours, overtime, and
                attendance.
              </p>
            </div>

            <div className="feature-item-list">
              <h3>✓ P45 & P60 Generation</h3>
              <p>
                Generate compliant documents with just a
                few clicks.
              </p>
            </div>

            <div className="feature-item-list">
              <h3>✓ Employee Portal</h3>
              <p>
                Employees access payslips securely.
              </p>
            </div>

            <div className="feature-item-list">
              <h3>✓ Tax & NIC Calculations</h3>
              <p>
                Accurate PAYE and pension calculations.
              </p>
            </div>

            <div className="feature-item-list">
              <h3>✓ Payslip Generation</h3>
              <p>
                Generate detailed payslips instantly.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default PayrollFeaturesHero;