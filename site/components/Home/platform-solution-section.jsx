import "./platform-solution-section.css";

const solutions = [
  {
    title: "Multi-Currency Banking",
    description:
      "Hold, manage, and transfer funds across multiple currencies with instant internal transfers and real-time balance tracking.",
  },
  {
    title: "Global Payment Solutions",
    description:
      "Process international payments quickly and securely through trusted global networks.",
  },
  {
    title: "Real-Time FX Services",
    description:
      "Access live exchange rates and automate currency conversions globally.",
  },
];

const PlatformSolutionsSection = () => {
  return (
    <section className="platform-solutions">
      <div className="offer-intro">
        <div className="offer-intro-copy">
          <p className="cedar-kicker">What we offer</p>
          <h2 className="offer-intro-title">
            Everything you need
            <br />
            for <span>payroll</span>
          </h2>
          <p className="offer-intro-lead">
            From timesheets to HMRC submissions, Cedar Payroll keeps your people paid accurately and on time.
          </p>
        </div>
        <div className="features-orbs offer-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="platform-solutions-container">
        <div className="platform-content">
          <p className="cedar-kicker">Our Features</p>
          <p className="platform-heading">
            Efficient &amp; Reliable Payroll
          </p>

          <div className="solution-list">
            {solutions.map((item, index) => (
              <div className="solution-item" key={item.title}>
                <span className="solution-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="platform-image-wrapper">
          <img
            src="/assets/images/home.svg"
            className="platform-image"
            alt="Payroll features illustration"
          />
        </div>
      </div>
    </section>
  );
};

export default PlatformSolutionsSection;
