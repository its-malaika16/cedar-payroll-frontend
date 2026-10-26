import "./serve-hero-section.css";

const IndustryBannerSection = () => {
  return (
    <section className="industry-banner">
      <div className="industry-banner-content">
        <p className="cedar-kicker">Who we serve</p>
        <h2 className="industry-banner-title">
          Empowering Every Industry.
          <br />
          Elevating Every Team.
        </h2>
        <p className="industry-banner-description">
          From startups to enterprises, Cedar Payroll provides scalable payroll solutions tailored to the unique needs of your industry.
        </p>
      </div>
      <div className="features-orbs industry-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
};

export default IndustryBannerSection;
