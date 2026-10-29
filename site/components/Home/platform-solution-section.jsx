import ScrollReveal from "../ScrollReveal";
import { CircleIcon } from "./home-icons";
import "./platform-solution-section.css";

function IconEmployeeRecords() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7.1 2.4h9.8v3.4H7.1z" />
      <path
        fill="currentColor"
        d="M3.6 7.2h16.8v8.8c0 1-.8 1.8-1.8 1.8H5.4c-1 0-1.8-.8-1.8-1.8V7.2z"
      />
      <path fill="#fff" d="M6.6 9.6h10.8v1.7H6.6z" />
      <path fill="currentColor" d="M8.2 17.2h7.6V21.4c0 .5-.4.9-.9.9H9.1c-.5 0-.9-.4-.9-.9V17.2z" />
    </svg>
  );
}

function IconPayslipGeneration() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.2 2.4h8.2L19.6 7.8V20c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V4c0-.9.7-1.6 1.6-1.6z"
      />
      <path fill="#fff" d="M14.2 2.6v4.6c0 .5.4.9.9.9h4.2" />
      <circle fill="#fff" cx="12" cy="14.4" r="3.15" />
      <path fill="currentColor" d="M12 12.55h.95v2.55h1.55v.9H11.05v-.9H12z" />
    </svg>
  );
}

function IconHolidayAbsence() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.4 3.2h15.2c.8 0 1.4.6 1.4 1.4v14.8c0 .8-.6 1.4-1.4 1.4H4.4c-.8 0-1.4-.6-1.4-1.4V4.6c0-.8.6-1.4 1.4-1.4z"
      />
      <path
        fill="#fff"
        d="M6.2 7.1h1.7l.7.7 1.5-1.6h-1.1L7.1 8 6.2 7.1zm0 4.6h1.7l.7.7 1.5-1.6h-1.1L7.1 12.6 6.2 11.7zm0 4.6h1.7l.7.7 1.5-1.6h-1.1L7.1 17.2 6.2 16.3zM11.4 7.2h6.6v1.55h-6.6zm0 4.6h6.6v1.55h-6.6zm0 4.6h6.6v1.55h-6.6z"
      />
    </svg>
  );
}

const solutions = [
  {
    title: "Employee Records",
    description:
      "Keep employee information organised and up to date in one secure place.",
    icon: <IconEmployeeRecords />,
  },
  {
    title: "Payslip Generation",
    description: "Create and distribute payslips in just a few clicks.",
    icon: <IconPayslipGeneration />,
  },
  {
    title: "Holiday & Absence Tracking",
    description:
      "Monitor leave, sickness, and attendance alongside payroll processing.",
    icon: <IconHolidayAbsence />,
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
                <CircleIcon variant="light">{item.icon}</CircleIcon>
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
