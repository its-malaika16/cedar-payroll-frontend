import ScrollReveal from "../ScrollReveal";
import { CircleIcon } from "./home-icons";
import "./platform-solution-section.css";

const solutions = [
  {
    title: "Employee Records",
    description:
      "Keep employee information organised and up to date in one secure place.",
    icon: "/assets/icons/employee-records.png",
  },
  {
    title: "Payslip Generation",
    description: "Create and distribute payslips in just a few clicks.",
    icon: "/assets/icons/payslip-generation.png",
  },
  {
    title: "Holiday & Absence Tracking",
    description:
      "Monitor leave, sickness, and attendance alongside payroll processing.",
    icon: "/assets/icons/holiday-absence.png",
  },
];

const PlatformSolutionsSection = () => {
  return (
    <ScrollReveal className="platform-solutions">
      <div className="platform-solutions-container">
        <div className="platform-content">
          <p className="cedar-kicker platform-kicker">Our Features</p>
          <h2 className="platform-heading">
            Efficient &amp;
            <br />
            Reliable Payroll
          </h2>

          <div className="solution-list">
            {solutions.map((item) => (
              <div className="solution-item" key={item.title}>
                <CircleIcon variant="light">
                  <img src={item.icon} alt="" />
                </CircleIcon>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="platform-image-wrapper">
          <svg
            className="platform-art"
            viewBox="0 0 550 570"
            aria-hidden="true"
            focusable="false"
          >
            <ellipse
              className="platform-orb platform-orb--soft"
              cx="256"
              cy="439.5"
              rx="130"
              ry="130.5"
            />
            <ellipse
              className="platform-orb platform-orb--grey"
              cx="204"
              cy="230.5"
              rx="130"
              ry="130.5"
            />
            <ellipse
              className="platform-orb platform-orb--navy"
              cx="364"
              cy="130.5"
              rx="130"
              ry="130.5"
            />
          </svg>
          <img
            className="platform-photo"
            src="/assets/redesign/features-payroll-hq.png"
            alt="Payroll dashboard with employee records, payslips and calendar"
            width={1760}
            height={1514}
            decoding="async"
          />
        </div>
      </div>
    </ScrollReveal>
  );
};

export default PlatformSolutionsSection;
