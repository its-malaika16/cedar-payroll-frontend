import "./about-hero-section.css";

const AboutHeroSection = () => {
  return (
    <section className="about-hero">
      <img
        className="about-hero-orbs"
        src="/assets/redesign/what-we-offer.svg"
        alt=""
        aria-hidden="true"
      />
      <div className="about-content">
        <p className="cedar-kicker about-kicker">About Cedar Payroll</p>
        <h1 className="about-title">
          Your Payroll.
          <br />
          <span>Perfectly Managed.</span>
        </h1>
        <p className="about-description">
          Cedar Payroll simplifies payroll management with accurate
          calculations, secure processes, and seamless solutions that help your
          business run efficiently.
        </p>
      </div>
    </section>
  );
};

export default AboutHeroSection;
