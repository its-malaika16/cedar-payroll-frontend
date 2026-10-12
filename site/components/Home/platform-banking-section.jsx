import "./platform-banking-section.css";

const services = [
  {
    title: "HMRC Compliance ",
    description:
      "Stay compliant with RTI submissions, PAYE requirements, and pension regulations.",
  },
  {
    title: "P45 & P60 Management",
    description:
    "Generate employee tax documents quickly and accurately.",
     
  },
  {
    title: "Payroll Reporting",
    description:
      "Access reports on payroll costs, deductions, and employee earnings whenever you need them.",
  },
];

const PayrollBankingSection = () => {
  return (
    <section className="payroll-banking">
      <div className="payroll-banking-container">
        {/* Left Side */}

        <div className="banking-content">
          <h2 className="banking-title subheading">
            One platform, Unlimited Payroll Possibilities
            
          </h2>

          <div className="banking-services">
            {services.map((service, index) => (
              <div
                key={index}
                className={`banking-service ${
                  index !== services.length - 1 ? "service-border" : ""
                }`}
              >
                <h3 className = "body-4">{service.title}</h3>
                <p className = "body-5">{service.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side */}

        <div className="banking-image-wrapper">
          <img className = "banking-image" src = "/assets/images/platform-solution.svg" />
        </div>
      </div>
    </section>
  );
};

export default PayrollBankingSection;