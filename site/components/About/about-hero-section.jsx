import "./about-hero-section.css";

const AboutHeroSection = () => {
  return (
    <section className="about-hero">
      <div className="about-overlay"></div>

      <div className="about-content">
        <h1 className="about-title main-title">
          People First.
          <br />
          Payroll Perfected.
        </h1>

        <p className="about-description body-3-2">
          We're more than just a payroll provider. We're your
          trusted partner in ensuring your most valuable asset,
          your people, are paid accurately and on time.
        </p>
      </div>
    </section>
  );
};

export default AboutHeroSection;