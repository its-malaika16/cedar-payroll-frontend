import "./how-it-work-section.css";

const steps = [
  {
    number: "01.",
    title: "Set Up Your Company",
    description:
      "Stay fully compliant with all HMRC regulations and avoid costly penalties.",
  },
  {
    number: "02.",
    title: "Add Employees",
    description:
      "Import or manually add employee information including tax codes and payment details.",
  },
  {
    number: "03.",
    title: "Enter Payroll Data",
    description:
      "Record hours worked, overtime, bonuses, and any adjustments for the pay period.",
  },
  {
    number: "04.",
    title: "Process Payroll",
    description:
      "Our system calculates PAYE, NIC, pensions, and generates payslips automatically.",
  },
  {
    number: "05.",
    title: "Review & Approve",
    description:
      "Review calculations, make any necessary adjustments, and approve the payroll run.",
  },
  {
    number: "06.",
    title: "Distribute & Report",
    description:
      "Payslips are sent to employees and RTI submissions are made to HMRC.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="how-it-works-container">
        <div className="how-it-works-header">
          <p className="cedar-kicker how-it-works-kicker">How it works</p>
          <h2 className="how-it-works-title">Simple Steps. Seamless Management.</h2>
        </div>

        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
