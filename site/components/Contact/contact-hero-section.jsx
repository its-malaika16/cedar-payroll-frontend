import "./contact-hero-section.css";

const ContactIntroSection = () => {
  return (
    <section className="contact-hero">
      <img
        className="contact-hero-orbs"
        src="/assets/redesign/what-we-offer.svg"
        alt=""
        aria-hidden="true"
      />
      <div className="contact-hero-container">
        <p className="cedar-kicker contact-hero-kicker">Contact us</p>
        <h1 className="contact-hero-title">
          Let’s
          <br />
          Connect.
          <br />
          <span>We’re here to help you grow.</span>
        </h1>
        <p className="contact-hero-description">
          Our UK-based team is here to help. Reach out and we’ll get back to you
          within 24 hours.
        </p>
      </div>
    </section>
  );
};

export default ContactIntroSection;
