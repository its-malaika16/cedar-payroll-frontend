import "./feature-benefits-section.css";

const benefits = [
  {
    title: (
      <>
        Access everything
        <br />
        they need in one place
      </>
    ),
    description:
      "From payslips and tax documents to employment details, employees have instant access to their essential payroll information.",
    icon: "/assets/icons/cloud.svg",
    key: "access",
  },
  {
    title: (
      <>
        Experience greater
        <br />
        transparency and
        <br />
        confidence
      </>
    ),
    description:
      "Give your teams a clear understanding of their payments, deductions, and benefits with accurate and accessible records.",
    icon: "/assets/icons/partnership.svg",
    key: "transparency",
  },
  {
    title: (
      <>
        Stay connected
        <br />
        wherever they work
      </>
    ),
    description:
      "With a mobile-optimised experience, employees can access payroll services and stay engaged from anywhere.",
    icon: "/assets/icons/feature-globe.svg",
    key: "connected",
  },
  {
    title: (
      <>
        Spend less time on
        <br />
        paperwork
      </>
    ),
    description:
      "Simplify everyday payroll interactions with fast, convenient, and user-friendly digital solutions.",
    icon: "/assets/icons/paperwork.svg",
    key: "paperwork",
  },
];

const FeatureBenefitsSection = () => {
  return (
    <section className="offer-benefits" id="payroll-for-employees">
      <div className="offer-benefits-container">
        <div className="offer-benefits-header">
          <p className="cedar-kicker offer-benefits-kicker">
            What do employees deserve?
          </p>
          <h2>Benefits That Empower Your Workforce</h2>
          <p className="offer-benefits-lead">
            Access valuable employee benefits through cedar payroll.
          </p>
        </div>

        <div className="offer-benefits-grid">
          {benefits.map((item) => (
            <article className="offer-benefit-card" key={item.key}>
              <span className="offer-benefit-icon">
                <img src={item.icon} alt="" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureBenefitsSection;
