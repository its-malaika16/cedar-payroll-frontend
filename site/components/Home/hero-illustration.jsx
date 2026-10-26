import "./hero-illustration.css";

const HeroIllustration = () => {
  return (
    <div className="hero-illustration">
      <svg
        className="hero-illustration-art"
        viewBox="0 0 707 472"
        role="img"
        aria-label="Cedar Payroll dashboard on a laptop"
      >
        <image
          href="/assets/redesign/hero-dashboard-hi.png"
          xlinkHref="/assets/redesign/hero-dashboard-hi.png"
          width="707"
          height="472"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
};

export default HeroIllustration;
