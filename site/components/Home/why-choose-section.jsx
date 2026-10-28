import ScrollReveal from "../ScrollReveal";
import { CircleIcon } from "./home-icons";
import "./why-choose-section.css";

const benefits = [
  {
    icon: "/assets/icons/hmrc.svg",
    title: "HMRC Compliant",
    description:
      "Stay fully compliant with all HMRC regulations and avoid costly penalties.",
  },
  {
    icon: "/assets/icons/expert-badge.svg",
    title: "Expert Support",
    description:
      "Dedicated payroll specialists available to handle your complex requirements.",
  },
  {
    icon: "/assets/icons/clock.svg",
    title: "Save Time",
    description:
      "Automate your payroll processes and focus on growing your business.",
  },
];

const WhyChooseSection = () => {
  return (
    <ScrollReveal className="why-choose">
      <div className="why-choose-container">
        <div className="why-choose-header">
          <p className="cedar-kicker why-choose-kicker">Why choose Cedar Payroll</p>
          <h2 className="why-choose-title">A Smarter Way To Manage Payroll</h2>
          <p className="why-choose-subtitle">
            We combine cutting-edge technology with expert knowledge to deliver payroll
            services that your business can rely on.
          </p>
        </div>

        <div className="why-choose-grid">
          {benefits.map((item) => (
            <div className="benefit-card" key={item.title}>
              <CircleIcon variant="light">
                <img src={item.icon} alt="" />
              </CircleIcon>
              <h3 className="benefit-title">{item.title}</h3>
              <p className="benefit-description">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
};

export default WhyChooseSection;
