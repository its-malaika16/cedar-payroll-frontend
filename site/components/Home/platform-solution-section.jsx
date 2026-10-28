import ScrollReveal from "../ScrollReveal";
import { CircleIcon } from "./home-icons";
import "./platform-solution-section.css";

const solutions = [
  {
    title: "Multi-Currency Banking",
    description:
      "Hold, manage, and transfer funds across multiple currencies with instant internal transfers and real-time balance tracking.",
    icon: "/assets/icons/currency.svg",
  },
  {
    title: "Global Payment Solutions",
    description:
      "Process international payments quickly and securely through trusted global networks.",
    icon: "/assets/icons/feature-globe.svg",
  },
  {
    title: "Real-Time FX Services",
    description:
      "Access live exchange rates and automate currency conversions globally.",
    icon: "/assets/icons/arrow.svg",
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
                  <img src={item.icon} alt="" width="30" height="30" />
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
            role="img"
            aria-label="Payroll features on a global network"
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
            <image
              href="/assets/redesign/features-hi.png"
              xlinkHref="/assets/redesign/features-hi.png"
              x="0"
              y="31"
              width="550"
              height="510"
              preserveAspectRatio="xMidYMid meet"
            />
          </svg>
        </div>
      </div>
    </ScrollReveal>
  );
};

export default PlatformSolutionsSection;
