import "./core-values-section.css";

const values = [
  {
    icon: "/assets/icons/core-values/excellence.svg",
    width: 93,
    height: 84,
    title: "Excellence",
    description: "Highest standards in every payslip and submission.",
  },
  {
    icon: "/assets/icons/core-values/partnership.svg",
    width: 104,
    height: 63,
    title: "Partnership",
    description: "We work alongside clients as true partners in success.",
  },
  {
    icon: "/assets/icons/core-values/integrity.svg",
    width: 104,
    height: 87,
    title: "Integrity",
    description: "Honesty and transparency at the core of everything.",
  },
  {
    icon: "/assets/icons/core-values/innovation.svg",
    width: 96,
    height: 98,
    title: "Innovation",
    description: "Continuously improving to meet evolving needs.",
  },
];

const CoreValuesSection = () => {
  return (
    <section className="core-values">
      <div className="core-values-container">
        <div className="core-values-header">
          <p className="cedar-kicker core-values-kicker">Our Core Values</p>
          <h2 className="core-values-title">
            Built on trust, driven by excellence.
          </h2>
          <p className="core-values-subtitle">
            We combine cutting-edge technology with expert knowledge to deliver
            payroll services that your business can rely on.
          </p>
        </div>

        <div className="values-grid">
          {values.map((value) => (
            <article className="value-card" key={value.title}>
              <svg
                className="value-icon"
                viewBox={`0 0 ${value.width} ${value.height}`}
                aria-hidden="true"
                focusable="false"
              >
                <image
                  href={value.icon.replace(".svg", ".png")}
                  width={value.width}
                  height={value.height}
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
              <h3 className="value-title">{value.title}</h3>
              <p className="value-description">{value.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreValuesSection;
