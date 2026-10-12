import "./vision-mission-section.css";

const sections = [
  {
    icon: "/assets/icons/mission.svg",
    title: "Our Mission",
    description:
      "To provide businesses with reliable, accurate and compliant payroll solutions that free them to focus on what they do best. We believe every employee deserves to be paid accurately and on time, and every business deserves peace of mind when it comes to their payroll.",
  },
  {
    icon: "/assets/icons/vision.svg",
    title: "Our Vision",
    description:
      "To be the most trusted payroll partner for UK businesses, known for exceptional service, innovative technology, and an unwavering commitment to accuracy and compliance. We envision a future where payroll is simple, stress-free, and adds genuine value to every business we serve.",
  },
];

const MissionVisionSection = () => {
  return (
    <section className="mission-vision">
      <div className="mission-vision-container">
        {sections.map((item, index) => (
          <div className="mission-card" key={index}>
            <div className="mission-icon-wrapper">
              <img className = "mission-icon" src = {item.icon} />
            </div>

            <p className="mission-title main-title">
              {item.title}
            </p>

            <p className="mission-description body-3">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MissionVisionSection;