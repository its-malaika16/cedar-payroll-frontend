import "./payroll-features-section.css";
import { CircleCheck } from "lucide-react";

const features = [
  "Automated tax calculations",
  "Employee self-service portal",
  "Real-time reporting",
  "Pension auto-enrolment",
  "P45, P60 generation",
  "HMRC compliance & RTI",
];

const PayrollFeatures = () => {
  return (
    <section className="payroll-features">
      <div className="features-grid">
        {features.map((feature, index) => (
          <div className="feature-item" key={index}>
            <CircleCheck className="feature-icon" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PayrollFeatures;