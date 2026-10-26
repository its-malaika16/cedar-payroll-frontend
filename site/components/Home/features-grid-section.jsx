import "./features-grid-section.css";

const PayrollFeaturesHero = () => {
  return (
    <section className="payroll-features-hero">
      <div className="payroll-features-container">
        <div className="features-content">
          <p className="cedar-kicker">What we offer</p>
          <h2 className="features-title">
            Everything you need
            <br />
            for <span>payroll</span>
          </h2>
          <p className="features-lead">
            From timesheets to HMRC submissions, Cedar Payroll keeps your people paid accurately and on time.
          </p>
        </div>
        <div className="features-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
};

export default PayrollFeaturesHero;
