import "./about-hero-section.css";

const AboutHeroSection = () => {
  return (
    <section className="about-hero">
      <div className="about-content">
        <p className="cedar-kicker">About Cedar Payroll</p>
        <h1 className="about-title">
          People First.
          <br />
          Payroll Perfected.
        </h1>
        <p className="about-description">
          We are more than a payroll provider. We are your trusted partner in ensuring your most valuable asset — your people — are paid accurately and on time.
        </p>
      </div>
      <div className="features-orbs about-hero-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
};

export default AboutHeroSection;
