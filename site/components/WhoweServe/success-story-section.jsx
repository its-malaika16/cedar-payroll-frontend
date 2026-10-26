import "./success-story-section.css";

const successStories = [
  {
    company: "COCO GRILL",
    subtitle: "Multi-Site Hospitality Group",
    logo: "/assets/images/coco-logo.png",
    moon: "blue",
    challenge:
      "A rapidly growing hospitality organisation operating across multiple locations was managing payroll through several disconnected processes. This resulted in time-consuming administration, inconsistent reporting, and increased operational complexity.",
    solution:
      "Cedar Payroll implemented a fully managed payroll service supported by cloud-based reporting tools and dedicated payroll specialists.",
    results: [
      "Reduced payroll processing time by 40%",
      "Improved reporting accuracy across all locations",
      "Enhanced compliance management",
      "Greater visibility of payroll costs and workforce data",
    ],
  },
  {
    company: "TEACHWISE",
    subtitle: "Professional Services Organisation",
    logo: "/assets/images/teachwise-logo.png",
    moon: "red",
    challenge:
      "A growing professional services firm required a scalable payroll solution capable of supporting business expansion while maintaining data security and compliance.",
    solution:
      "Cedar Payroll introduced a managed payroll service with employee self-service functionality and enhanced reporting capabilities.",
    results: [
      "Scalable payroll infrastructure for future growth",
      "Improved employee access to payroll information",
      "Reduced internal administrative workload",
      "Secure and compliant payroll processing",
    ],
  },
  {
    company: "MAMS",
    subtitle: "Manufacturing Business",
    logo: "/assets/images/mams-logo.png",
    moon: "blue",
    challenge:
      "A manufacturing company employing both salaried and hourly workers required a payroll solution capable of managing complex pay structures, overtime calculations, and multiple payroll schedules.",
    solution:
      "Cedar Payroll worked closely with the company to implement customised payroll processes tailored to its workforce requirements.",
    results: [
      "Increased payroll accuracy",
      "Reduced payroll-related queries",
      "Simplified payroll administration",
      "Improved operational efficiency",
    ],
  },
];

const SuccessMoon = ({ variant }) =>
  variant === "red" ? (
    <svg
      className="success-moon"
      viewBox="0 200 204 241"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="success-moon-shape"
        opacity="0.69"
        d="M-6.27178 -0.000190658C-14.8067 51.0424 -1.96975 104.018 33.6122 144.369C76.3864 192.877 141.373 211.054 203.184 198.107C203.362 262.572 174.731 329.245 119.551 377.904C23.4479 462.648 -116.791 460.659 -193.681 373.463C-270.572 286.266 -254.998 146.88 -158.895 62.1361C-114 22.5474 -59.4729 1.88781 -6.27178 -0.000190658Z"
        fill="#D32027"
        fillOpacity="0.63"
      />
    </svg>
  ) : (
    <svg
      className="success-moon"
      viewBox="0 200 191 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="success-moon-shape"
        opacity="0.69"
        d="M-17.8876 0.00021168C-26.6995 50.9957 -14.1503 104.04 21.2122 144.584C63.7227 193.323 128.61 211.852 190.491 199.241C190.318 263.706 161.325 330.223 105.881 378.581C9.31951 462.802 -130.906 460.053 -207.322 372.44C-283.738 284.827 -267.408 145.528 -170.846 61.3072C-125.737 21.9627 -71.0983 1.5993 -17.8876 0.00021168Z"
        fill="#17375E"
        fillOpacity="0.65"
      />
    </svg>
  );

const ClientSuccessSection = () => {
  return (
    <section className="client-success-section">
      <div className="client-success-container">
        <header className="client-success-header">
          <p className="client-success-kicker">Client Success Stories</p>
          <h2 className="client-success-title">
            Real Impact. Proven Results.
          </h2>
          <p className="client-success-description">
            At Cedar Payroll, we measure our success by the success of our
            clients. Every organisation has unique payroll challenges, and our
            team is committed to delivering tailored solutions that improve
            efficiency, ensure compliance, and enhance the employee experience.
          </p>
        </header>

        <div className="success-stories">
          {successStories.map((story) => (
            <article className="success-story" key={story.company}>
              <div className="success-visual">
                <div className="success-mark">
                  <SuccessMoon variant={story.moon} />
                  <img className="success-logo" src={story.logo} alt="" />
                </div>
              </div>

              <div className="success-copy">
                <h3 className="success-company">{story.company}:</h3>
                <p className="success-subtitle">{story.subtitle}</p>

                <h4 className="success-label">Challenge:</h4>
                <p className="success-text">{story.challenge}</p>

                <h4 className="success-label">Solution:</h4>
                <p className="success-text">{story.solution}</p>

                <h4 className="success-label">Results</h4>
                <ul className="success-results">
                  {story.results.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientSuccessSection;
