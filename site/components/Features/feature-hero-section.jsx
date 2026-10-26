import "./feature-hero-section.css";

const FeatureHeroSection = () => {
  return (
    <section className="feature-hero">
      <img
        className="feature-hero-orbs"
        src="/assets/redesign/what-we-offer.svg"
        alt=""
        aria-hidden="true"
      />
      <div className="feature-hero-container">
        <p className="cedar-kicker feature-hero-kicker">What we offer</p>
        <h1 className="feature-hero-title">
          Complete Payroll
          <br />
          Solutions
          <br />
          <span>For Every Business.</span>
        </h1>
        <p className="feature-hero-description">
          From payroll processing to compliance and global payments, we provide
          everything you need in one secure, reliable, and easy-to-use platform.
        </p>
      </div>
    </section>
  );
};

export default FeatureHeroSection;
