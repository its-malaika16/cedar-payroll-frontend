import { Link } from "react-router-dom";
import ScrollReveal from "../ScrollReveal";
import "./feature-detail-section.css";

const features = [
  {
    title: "Time-sheet Management",
    description:
      "Track working hours, leave, overtime, and attendance with complete accuracy and transparency.",
    icon: "/assets/icons/timesheet.svg",
  },
  {
    title: "Payroll & Payslip Generation",
    description:
      "Automate payroll calculations and generate accurate, professional payslips.",
    icon: "/assets/icons/payslip.svg",
  },
  {
    title: "Employee Self-Service Portal",
    description:
      "Empower your employees to access their payslips, leave balances and personal information securely.",
    icon: "/assets/icons/group.svg",
  },
  {
    title: "UK Compliance & Reporting",
    description:
      "Stay compliant with UK regulations with automated reporting and real-time updates.",
    icon: "/assets/icons/compliance.svg",
  },
  {
    title: "Employee Information Management",
    description:
      "Centralise employee data with secure, easy to manage records.",
    icon: "/assets/icons/employeeinfo.svg",
  },
  {
    title: "P45 & P60 Generation",
    description:
      "Generate HMRC compliant P45 & P60 documents automatically.",
    icon: "/assets/icons/p45.svg",
  },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 12h12M13 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PayrollFeaturesSection = () => {
  return (
    <ScrollReveal className="offer-cards" id="services">
      <div className="offer-cards-container">
        {features.map((feature) => (
          <article className="offer-card" key={feature.title}>
            <span className="offer-card-icon">
              <img src={feature.icon} alt="" />
            </span>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
            <Link to="/contact" className="offer-card-arrow" aria-label={`${feature.title} — contact us`}>
              <ArrowIcon />
            </Link>
          </article>
        ))}
      </div>
    </ScrollReveal>
  );
};

export default PayrollFeaturesSection;
