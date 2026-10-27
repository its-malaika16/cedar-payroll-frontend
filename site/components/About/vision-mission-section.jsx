import "./vision-mission-section.css";

const sections = [
  {
    icon: "/assets/icons/about/mission.png",
    width: 86,
    height: 86,
    title: "Our Mission",
    description:
      "To provide businesses with reliable, accurate and compliant payroll solutions that free them to focus on what they do best. We believe every employee deserves to be paid accurately and on time, and every business deserves peace of mind when it comes to their payroll.",
  },
  {
    icon: "/assets/icons/about/vision.png",
    width: 114,
    height: 69,
    title: "Our Vision",
    description:
      "To be the most trusted payroll partner for UK businesses, known for exceptional service, innovative technology, and an unwavering commitment to accuracy and compliance. We envision a future where payroll is simple, stress-free, and adds genuine value to every business.",
  },
];

const MissionVisionSection = () => {
  return (
    <section className="mission-vision">
      <div className="mission-vision-container">
        {sections.map((item) => (
          <article
              className="mission-card"
              id={item.title === "Our Mission" ? "mission" : "vision"}
              key={item.title}
            >
            <svg
              className="mission-icon"
              viewBox={`0 0 ${item.width} ${item.height}`}
              aria-hidden="true"
              focusable="false"
            >
              <image
                href={item.icon}
                width={item.width}
                height={item.height}
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
            <h2 className="mission-title">{item.title}</h2>
            <p className="mission-description">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MissionVisionSection;
