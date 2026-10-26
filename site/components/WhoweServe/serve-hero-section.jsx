import "./serve-hero-section.css";

const IndustryBannerSection = () => {
  return (
    <section className="serve-hero">
      <div className="serve-hero-container">
        <div className="serve-hero-copy">
          <p className="cedar-kicker serve-hero-kicker">Who we serve</p>
          <h1 className="serve-hero-title">
            Empowering Every
            <br />
            Industry.
            <br />
            <span>Elevating Every Team.</span>
          </h1>
          <p className="serve-hero-description">
            From startups to enterprises. Cedar Payroll provides scalable payroll
            solutions tailored to the unique needs of your industry.
          </p>
        </div>

        <div className="serve-hero-art-wrap">
          <svg
            className="serve-hero-art"
            viewBox="0 0 2356 1632"
            role="img"
            aria-label="Industries connected around a city"
          >
            <ellipse
              className="serve-orb serve-orb--red"
              cx="1626"
              cy="765"
              rx="463"
              ry="437"
            />
            <ellipse
              className="serve-orb serve-orb--navy"
              cx="1374"
              cy="359"
              rx="547"
              ry="556"
            />
            <ellipse
              className="serve-orb serve-orb--grey"
              cx="825"
              cy="525"
              rx="467"
              ry="484"
            />
            <image
              href="/assets/redesign/whoweserve-hi.png?v=2"
              xlinkHref="/assets/redesign/whoweserve-hi.png?v=2"
              x="0"
              y="0"
              width="2356"
              height="1632"
              preserveAspectRatio="xMidYMid meet"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default IndustryBannerSection;
