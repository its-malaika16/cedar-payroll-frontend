import ScrollReveal from "../ScrollReveal";
import "./contact-detail-section.css";

const contacts = [
  {
    icon: "/assets/icons/contact/phone.png",
    width: 36,
    height: 36,
    title: "Phone Number",
    line1: "+971 50 429 4194",
    line2: "Mon–Fri, 9:00 AM – 5:00 PM",
  },
  {
    icon: "/assets/icons/contact/email.png",
    width: 40,
    height: 32,
    title: "Email Address",
    line1: "support@cedarpayroll.com",
    line2: "Response within 24 hours",
  },
  {
    icon: "/assets/icons/contact/location.png",
    width: 23,
    height: 40,
    title: "Our Offices",
    line1: "United Kingdom",
    line2: "UAE • Lebanon • USA • UK • KSA",
  },
  {
    icon: "/assets/icons/clock.svg",
    width: 31,
    height: 31,
    title: "Business Hours",
    line1: "Monday – Friday",
    line2: "9:00 AM – 5:00 PM",
  },
];

const ContactCardsSection = () => {
  return (
    <ScrollReveal className="contact-cards-section">
      <div className="contact-cards-container">
        <div className="contact-cards-header">
          <p className="cedar-kicker contact-cards-kicker">Let’s talk business</p>
          <h2 className="contact-cards-heading">
            Connect With Our Team Today
          </h2>
          <p className="contact-cards-lead">
            Reach out to explore how we can support your business needs.
          </p>
        </div>

        <div className="contact-cards-grid">
          {contacts.map((item) => (
            <article className="contact-card" key={item.title}>
              <div className="contact-icon-circle">
                <svg
                  className="contact-icon"
                  viewBox={`0 0 ${item.width} ${item.height}`}
                  aria-hidden="true"
                  focusable="false"
                >
                  <image
                    href={item.icon}
                    width={item.width}
                    height={item.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </svg>
              </div>
              <h3 className="contact-card-title">{item.title}</h3>
              <p className="contact-card-line1">{item.line1}</p>
              <p className="contact-card-line2">{item.line2}</p>
            </article>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
};

export default ContactCardsSection;
