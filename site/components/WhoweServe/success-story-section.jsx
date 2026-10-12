const successStories = [
  {
    company: "COCO GRILL",
    subtitle: "Multi-Site Hospitality Group",
    logo: "/assets/images/coco-logo.png",

    challenge:
      "A rapidly growing hospitality organisation operating across multiple locations was managing payroll through several disconnected processes. This resulted in time-consuming administration, inconsistent reporting, and increased operational complexity.",

    solution:
      "Cedar Payroll implemented a fully managed payroll service supported by cloud-based reporting tools and dedicated payroll specialists.",

    results: [
      "Reduced payroll processing time by 60%",
      "Improved reporting accuracy across all locations",
      "Enhanced compliance management",
      "Greater visibility of payroll costs and workforce data",
    ],
  },

  {
    company: "TEACHWISE",
    subtitle: "Professional Services Organisation",
    logo: "/assets/images/teachwise-logo.png",

    challenge:
      "A growing professional services firm required a scalable payroll solution capable of supporting business growth while maintaining data security and compliance.",

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

const ClientSuccessSection = () => {
  return (
    <>
      <style>
        {`
          .client-success-section {
            width: 100%;
            background: var(--background);
            padding: 100px 80px;
          }

          .client-success-container {
            max-width: 1400px;
            margin: 0 auto;
          }

          .client-success-header {
            max-width: 850px;
            margin-bottom: 60px;
          }

          .client-success-title {
            color: var(--primary);
            margin-bottom: 16px;
          }

          .client-success-subtitle {
            color: var(--secondary);
            font-weight: 700;
            margin-bottom: 18px;
          }

          .client-success-description {
            color: var(--primary);
            line-height: 1.7;
          }

          .success-cards {
            display: flex;
            flex-direction: column;
            gap: 40px;
          }

          .success-card {
            background: #ffffff;

            border-radius: 24px;
            border: 1px solid rgba(23, 55, 94, 0.12);

            padding: 35px;

            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);

            transition: all 0.3s ease;
          }

          .success-card:hover {
            transform: translateY(-5px);

            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;

            gap: 30px;

            margin-bottom: 25px;
          }

          .company-name {
            color: var(--primary);
            margin-bottom: 8px;
          }

          .company-subtitle {
            color: var(--primary);
            font-weight: 600;
          }

          .company-logo {
            max-width: 180px;
            flex-shrink: 0;
          }

          .company-logo img {
            width: 100%;
            height: auto;
            object-fit: contain;
            display: block;
          }

          .content-block h4 {
            color: var(--secondary);
            margin-bottom: 10px;
          }

          .content-block p {
            color: var(--primary);
            line-height: 1.7;
          }

          .content-block ul {
            padding-left: 22px;
            list-style: circle;
          }

          .content-block li {
            color: var(--primary);
            line-height: 1.8;
          }

          .divider {
            width: 100%;
            height: 1px;

            background: rgba(23, 55, 94, 0.15);

            margin: 22px 0;
          }

          /* DESKTOP */

          @media (max-width: 1400px) {
            .client-success-section {
              padding: 90px 60px;
            }
          }

          /* TABLET */

          @media (max-width: 992px) {
            .client-success-section {
              padding: 80px 40px;
            }

            .card-header {
              flex-direction: column;
              align-items: flex-start;
            }

            .company-logo {
              max-width: 150px;
            }
          }

          /* MOBILE */

          @media (max-width: 768px) {
            .client-success-section {
              padding: 70px 20px;
            }

            .client-success-header {
              margin-bottom: 40px;
            }

            .success-card {
              padding: 24px;
            }

            .company-logo {
              max-width: 130px;
            }
          }

          /* SMALL MOBILE */

          @media (max-width: 480px) {
            .client-success-section {
              padding: 60px 16px;
            }

            .success-card {
              padding: 20px;
              border-radius: 20px;
            }

            .card-header {
              gap: 16px;
            }

            .company-logo {
              max-width: 110px;
            }
          }
        `}
      </style>

      <section className="client-success-section">
        <div className="client-success-container">
          <div className="client-success-header">
            <h2 className="client-success-title">
              Client Success Stories
            </h2>

            <p className="client-success-subtitle">
              Delivering results through trusted payroll
              partnerships
            </p>

            <p className="client-success-description">
              At Cedar Payroll, we measure our success by the
              success of our clients. Every organisation has
              unique payroll challenges, and our team is
              committed to delivering tailored solutions that
              improve efficiency, compliance, and overall
              business performance.
            </p>
          </div>

          <div className="success-cards">
            {successStories.map((story, index) => (
              <div className="success-card" key={index}>
                <div className="card-header">
                  <div>
                    <h3 className="company-name">
                      {story.company}
                    </h3>

                    <p className="company-subtitle">
                      {story.subtitle}
                    </p>
                  </div>

                  <div className="company-logo">
                    <img src = {story.logo} />
                  </div>
                </div>

                <div className="content-block">
                  <h4>Challenge:</h4>
                  <p>{story.challenge}</p>
                </div>

                <div className="divider"></div>

                <div className="content-block">
                  <h4>Solution:</h4>
                  <p>{story.solution}</p>
                </div>

                <div className="divider"></div>

                <div className="content-block">
                  <h4>Results:</h4>

                  <ul>
                    {story.results.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default ClientSuccessSection;