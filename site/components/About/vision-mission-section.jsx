import "./vision-mission-section.css";

const MissionIcon = () => (
  <svg
    className="mission-icon"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="28" cy="36" r="18" stroke="#d32027" strokeWidth="3.2" />
    <circle cx="28" cy="36" r="10" stroke="#d32027" strokeWidth="3.2" />
    <circle cx="28" cy="36" r="3.2" fill="#d32027" />
    <path
      d="M42 14v10h10"
      stroke="#d32027"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M42 24 54 12"
      stroke="#d32027"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

const VisionIcon = () => (
  <svg
    className="mission-icon"
    viewBox="0 0 72 40"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4 20c6.5-12 16.5-18 32-18s25.5 6 32 18c-6.5 12-16.5 18-32 18S10.5 32 4 20Z"
      stroke="#17375e"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <circle cx="36" cy="20" r="9" stroke="#17375e" strokeWidth="3.2" />
    <circle cx="36" cy="20" r="4.2" fill="#d32027" />
  </svg>
);

const sections = [
  {
    icon: <MissionIcon />,
    title: "Our Mission",
    description:
      "To provide businesses with reliable, accurate and compliant payroll solutions that free them to focus on what they do best. We believe every employee deserves to be paid accurately and on time, and every business deserves peace of mind when it comes to their payroll.",
  },
  {
    icon: <VisionIcon />,
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
          <article className="mission-card" key={item.title}>
            {item.icon}
            <h2 className="mission-title">{item.title}</h2>
            <p className="mission-description">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MissionVisionSection;
