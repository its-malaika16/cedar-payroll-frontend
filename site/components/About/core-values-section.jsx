import "./core-values-section.css";

const values = [
  {
    icon: "/assets/icons/excellence.svg",
    title: "Excellence",
    description:
      "Highest standards in every payslip and submission.",
  },
  {
    icon: "/assets/icons/partnership.svg",
    title: "Partnership",
    description:
      "We work alongside clients as true partners in success.",
  },
  {
    icon: "/assets/icons/heart.svg",
    title: "Integrity",
    description:
      "Honesty and transparency at the core of everything.",
  },
  {
    icon: "/assets/icons/innovation.svg",
    title: "Innovation",
    description:
      "Continuously improving to meet evolving needs.",
  },
];

const CoreValuesSection = () => {
  return (
    <section className="core-values">
      <div className="core-values-container">
        <div className="core-values-header">
          <h2 className="core-values-title main-title">
            Our Core Values
          </h2>

          <p className="core-values-subtitle body-3-2">
            We combine cutting-edge technology with expert
            knowledge to deliver payroll services that your
            business can rely on.
          </p>
        </div>

        <div className="values-grid">
          {values.map((value, index) => (
            <div className="value-card" key={index}>
              <div className="value-icon-wrapper">
                <img src = {value.icon}
                  alt={value.title}
                  className="value-icon"
                />
              </div>

              <h3 className="value-title number">
                {value.title}
              </h3>

              <p className="value-description lighttext">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreValuesSection;