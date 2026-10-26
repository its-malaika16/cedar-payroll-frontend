import "./contact-hero-section.css";

const ContactIntroSection = () => {
  return (
    <section className="contact-intro">
      <div className="contact-intro-container">
        <p className="cedar-kicker">Contact us</p>
        <h2 className="contact-intro-title">
          Let’s connect. We’re here to help you grow.
        </h2>
        <p className="contact-intro-description">
          Our UK-based team is here to help. Reach out and we’ll get back to you within 24 hours.
        </p>
      </div>
      <div className="features-orbs contact-hero-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
};

export default ContactIntroSection;
