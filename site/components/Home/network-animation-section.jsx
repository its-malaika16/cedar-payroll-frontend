import "./network-animation-section.css";

const NetworkAnimation = () => {
  return (
    <section className="network-section">
      <svg
        className="network-svg"
        viewBox="0 0 1000 900"
      >
        {/* Branches */}
        <path id="path1" d="M120 260 C100 510 420 360 500 560" className="branch" />
        <path id="path2" d="M230 170 L230 340 C230 450 430 390 500 560" className="branch" />
        <path id="path3" d="M370 100 L370 360 C370 450 470 420 500 560" className="branch" />
        <path id="path4" d="M630 100 L630 360 C630 450 530 420 500 560" className="branch" />
        <path id="path5" d="M770 170 L770 340 C770 450 570 390 500 560" className="branch" />
        <path id="path6" d="M880 280 C910 510 580 360 500 560" className="branch" />

        {/* Moving Dots */}
        
        {/* Pair 1: Outer Branches */}
        <circle r="7" className="moving-dot">
          <animateMotion dur="4s" begin="0s" repeatCount="indefinite">
            <mpath href="#path1" />
          </animateMotion>
        </circle>
        <circle r="7" className="moving-dot">
          <animateMotion dur="4s" begin="0s" repeatCount="indefinite">
            <mpath href="#path6" />
          </animateMotion>
        </circle>

        {/* Pair 2: Middle Branches */}
        <circle r="7" className="moving-dot">
          <animateMotion dur="4s" begin="1.33s" repeatCount="indefinite">
            <mpath href="#path2" />
          </animateMotion>
        </circle>
        <circle r="7" className="moving-dot">
          <animateMotion dur="4s" begin="1.33s" repeatCount="indefinite">
            <mpath href="#path5" />
          </animateMotion>
        </circle>

        {/* Pair 3: Inner Branches */}
        <circle r="7" className="moving-dot">
          <animateMotion dur="4s" begin="2.66s" repeatCount="indefinite">
            <mpath href="#path3" />
          </animateMotion>
        </circle>
        <circle r="7" className="moving-dot">
          <animateMotion dur="4s" begin="2.66s" repeatCount="indefinite">
            <mpath href="#path4" />
          </animateMotion>
        </circle>
      </svg>

      {/* Icons */}
      <div className="icon icon1"><img src="/assets/icons/report.svg" alt="icon 1" /></div>
      <div className="icon icon2"><img src="/assets/icons/hmrc.svg" alt="icon 2" /></div>
      <div className="icon icon3"><img src="/assets/icons/cloud.svg" alt="icon 3" /></div>
      <div className="icon icon4"><img src="/assets/icons/boxtick.svg" alt="icon 4" /></div>
      <div className="icon icon5"><img src="/assets/icons/innovation.svg" alt="icon 5" /></div>
      <div className="icon icon6"><img src="/assets/icons/group.svg" alt="icon 6" /></div>

      {/* Logo */}
      <div className="logo-circle">
        <img src="/assets/favicon/favicon.svg" alt="Payroll Logo" />
      </div>

      {/* Arrow */}
      <div className="arrow"></div>
    </section>
  );
};

export default NetworkAnimation;