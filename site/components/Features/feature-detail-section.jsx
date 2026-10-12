import { useEffect } from "react";
import "./feature-detail-section.css";

const features = [
  {
    title: "Time-sheet Management",
    description:
      "Track working hours, overtime, and attendance with ease.",
    image: "/assets/images/weekly.svg",
    imageRight: true,
    points: [
      "Daily, weekly, and monthly time-sheets",
      "Holiday and absence management",
      "Integration with payroll calculations",
      "Overtime calculation and tracking",
      "Manager approval workflows",
      "Export to various formats",
    ],
  },
  {
    title: "Payroll & Payslip Generation",
    description:
      "Calculate pay, deductions, and generate detailed payslips.",
    image: "/assets/images/payroll.svg",
    imageRight: false,
    points: [
      "Gross to net pay calculations",
      "PAYE income tax calculations",
      "National Insurance contributions",
      "Pension auto-enrolment deductions",
      "Student loan repayments",
      "Statutory payments (SSP, SMP, SPP)",
    ],
  },
  {
    title: "Employee Self-Service Portal",
    description:
      "Employees can access their payslips and documents securely.",
    image: "/assets/images/portal.svg",
    imageRight: true,
    points: [
      "Secure email-based access",
      "View and download payslips",
      "Access P45 and P60 documents",
      "Update personal information",
      "Submit timesheet entries",
      "Request holiday and time off",
    ],
  },
  {
    title: "UK Compliance & Reporting",
    description:
      "Stay compliant with all HMRC regulations and requirements.",
    image: "/assets/images/compliance.svg",
    imageRight: false,
    points: [
      "Real-Time Information (RTI) submissions",
      "Gender pay gap reporting",
      "Apprenticeship levy calculations",
      "NI category management",
      "Automatic tax code updates",
      "Pension regulatory compliance",
    ],
  },
  {
    title: "Employee Information Management",
    description:
      "Centralise all your employee data in one secure GDPR-compliant platform.",
    image: "/assets/images/employee.svg",
    imageRight: true,
    points: [
      "Personal details and contact information",
      "Bank account details for payments",
      "Emergency contacts",
      "Employment history and contracts",
      "Tax codes and NI numbers",
      "Document storage and management",
    ],
  },
  {
    title: "P45 & P60 Generation",
    description:
      "Generate HMRC-compliant P45 and P60 documents automatically.",
    image: "/assets/images/tax.svg",
    imageRight: false,
    points: [
      "Automatic P45 on employee departure",
      "Digital delivery via employee portal",
      "Bulk generation capabilities",
      "Year-end P60 generation for all staff",
      "Print-ready PDF formats",
      "HMRC submission ready",
    ],
  },
];

const PayrollFeaturesSection = () => {
  useEffect(() => {
    const cards = document.querySelectorAll(
      ".payroll-feature-card"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show-card");
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="payroll-features-section">
      <div className="payroll-features-container-home">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`payroll-feature-card ${feature.imageRight
                ? "image-right"
                : "image-left"
              }`}
          >
            {!feature.imageRight && (
              <div className="feature-image-wrapper">
                <img src={feature.image} className="feature-image" />
              </div>
            )}

            <div className="feature-content">
              <h2 className="feature-heading subheading">
                {feature.title}
              </h2>

              <p className="feature-desc body-6">
                {feature.description}
              </p>

              <ul className="feature-points body-5">
                {feature.points.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {feature.imageRight && (
              <div className="feature-image-wrapper">
                <img src={feature.image}
                  alt={feature.title}
                  className="feature-image"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PayrollFeaturesSection;