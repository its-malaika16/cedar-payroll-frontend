import "./our-client-section.css";

const logos = [
  { src: "/assets/images/ark-logo.png", alt: "Ark", height: 58 },
  { src: "/assets/images/bunzl-logo.png", alt: "Bunzl", height: 70 },
  { src: "/assets/images/Harris-logo.png", alt: "Harris Federation", height: 178 },
  { src: "/assets/images/mams-logo.png", alt: "Mams", height: 58 },
  { src: "/assets/images/hats-logo.png", alt: "Haberdashers’ Academies Trust South", height: 102 },
  { src: "/assets/images/teachwise-logo.png", alt: "Teachwise", height: 122 },
  { src: "/assets/images/thinkgroup-logo.png", alt: "THINK!", height: 96 },
  { src: "/assets/images/showcase-logo.jpg", alt: "Showcase Cinemas", height: 96 },
  { src: "/assets/images/coco-logo.png", alt: "Coco Grill", height: 112 },
];

const LogoRow = ({ hidden }) => (
  <ul className="clients-track" aria-hidden={hidden ? "true" : undefined}>
    {logos.map((logo) => (
      <li className="client-logo" key={`${hidden ? "dup-" : ""}${logo.alt}`}>
        <img
          src={logo.src}
          alt={hidden ? "" : logo.alt}
          style={{ height: logo.height }}
        />
      </li>
    ))}
  </ul>
);

const ClientsSection = () => {
  return (
    <section className="clients-section" id="our-clients">
      <div className="clients-container">
        <h2 className="clients-heading">Our Clients</h2>

        <div className="clients-slider">
          <div className="clients-marquee">
            <LogoRow />
            <LogoRow hidden />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;
