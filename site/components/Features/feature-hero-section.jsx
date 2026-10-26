import "./feature-hero-section.css";

const FeatureHeroSection = () => {
  return (
    <section className="feature-hero">
      <div className="feature-hero-container">
        <p className="cedar-kicker">What we offer</p>
        <h1 className="feature-hero-title">
          Payroll infrastructure built
          <br />
          for <span>global business</span>
        </h1>
        <p className="feature-hero-description">
          Connecting businesses to next-generation payroll, payments, and compliance in one platform.
        </p>
        <div className="features-orbs feature-hero-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
};

export default FeatureHeroSection;
