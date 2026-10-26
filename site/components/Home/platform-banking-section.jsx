import "./platform-banking-section.css";

const services = [
  {
    title: "Compliance Risk Monitoring",
    description: "Built-in KYC, AML and fraud monitoring infrastructure.",
  },
  {
    title: "API & System Integration",
    description: "Connect banking services into applications with powerful APIs.",
  },
  {
    title: "Digital Account Management",
    description: "Create and manage accounts with secure onboarding flows.",
  },
];

const PayrollBankingSection = () => {
  return (
    <section className="payroll-banking">
      <div className="payroll-banking-container">
        <div className="banking-image-wrapper">
          <div className="cedar-blob banking-blob banking-blob-a" />
          <div className="cedar-blob banking-blob banking-blob-b" />
          <img
            className="banking-image"
            src="/assets/images/platform-solution.svg"
            alt="Cedar Payroll platform cards"
          />
        </div>

        <div className="banking-content">
          <p className="cedar-kicker">All-in-one solution</p>
          <h2 className="banking-title">
            One Platform, Unlimited Possibilities.
          </h2>

          <div className="banking-services">
            {services.map((service, index) => (
              <div className="banking-service" key={index}>
                <span className="solution-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PayrollBankingSection;
