import { CircleIcon } from "./home-icons";
import "./platform-banking-section.css";

const services = [
  {
    title: "Compliance Risk Monitoring",
    description: "Built-in KYC, AML & fraud monitoring infrastructure",
    icon: "/assets/icons/hmrc.svg",
  },
  {
    title: "API & System Integration",
    description: "Connect banking services into applications with powerful APIs",
    icon: "/assets/icons/api.svg",
  },
  {
    title: "Digital Account Management",
    description: "Create & manage accounts with secure onboarding flows",
    icon: "/assets/icons/digital.svg",
  },
];

const PayrollBankingSection = () => {
  return (
    <section className="payroll-banking">
      <div className="payroll-banking-container">
        <div className="banking-image-wrapper">
          <svg
            className="banking-art"
            viewBox="0 0 690 620"
            role="img"
            aria-label="Cedar Payroll platform cards"
          >
            <circle className="banking-orb banking-orb--red" cx="174" cy="175" r="125" />
            <ellipse
              className="banking-orb banking-orb--navy"
              cx="303"
              cy="358"
              rx="229"
              ry="235"
            />
            <ellipse
              className="banking-orb banking-orb--grey"
              cx="303"
              cy="358"
              rx="206"
              ry="207"
            />
            <ellipse
              className="banking-orb banking-orb--soft"
              cx="302.5"
              cy="358.5"
              rx="155.5"
              ry="149.5"
            />
            <g transform="rotate(-17.353 -74.994 197.666)">
              <image
                href="/assets/redesign/solution-hi.png"
                xlinkHref="/assets/redesign/solution-hi.png"
                x="-74.994"
                y="197.666"
                width="662.735"
                height="441.824"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          </svg>
        </div>

        <div className="banking-content">
          <p className="cedar-kicker banking-kicker">All-in-one solution</p>
          <h2 className="banking-title">
            One Platform,
            <br />
            Unlimited Possibilities.
          </h2>

          <div className="banking-services">
            {services.map((service) => (
              <div className="banking-service" key={service.title}>
                <CircleIcon variant="light">
                  <img src={service.icon} alt="" />
                </CircleIcon>
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
