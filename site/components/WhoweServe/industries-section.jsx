const industries = [
  {
    title: "Hospitality",
    image: "/assets/images/hospitality.svg",
    description:
      "From restaurants and hotels to cafés, we handle the complex shift patterns, tips, and rotas that hospitality payroll demands, accurately and on time.",
  },
  {
    title: "Retail",
    image: "/assets/images/retail.svg",
    description:
      "Multi-site retail businesses trust us with variable hours, seasonal staff, and high-volume payroll runs, all delivered with built-in HMRC compliance.",
  },
  {
    title: "Construction",
    image: "/assets/images/construction.svg",
    description:
      "CIS-ready payroll for subcontractors plus PAYE for permanent staff, with detailed cost reporting per site and project.",
  },
  {
    title: "Technology",
    image: "/assets/images/technology.svg",
    description:
      "Payroll support for tech companies with flexible pay structures, remote teams, contractor payments, and full HMRC compliance.",
  },
  {
    title: "Healthcare",
    image: "/assets/images/healthcare.svg",
    description:
      "From private clinics to care homes, we manage rotas, statutory payments, and pension auto enrolment with the sensitivity healthcare requires.",
  },
  {
    title: "Education",
    image: "/assets/images/education.svg",
    description:
      "Payroll services for schools, colleges, and training centres, managing staff salaries, pensions, and compliance accurately and confidentially.",
  },
];

const IndustriesSection = () => {
  return (
    <>
      <style>
        {`
          .industries-section {
            width: 100%;
            background: var(--background);
            padding: 100px 80px;
          }

          .industries-container {
            max-width: 1450px;
            margin: 0 auto;
          }

          .industries-heading {
            text-align: center;
            color: var(--primary);
            margin-bottom: 60px;
          }

          .industries-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
          }

          .industry-card {
            background: #ffffff;
            border: 1px solid rgba(23, 55, 94, 0.2);
            border-radius: 40px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100%;
            transition: all 0.3s ease;
          }

          .industry-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(23, 55, 94, 0.12);
          }

          .industry-image {
            width: 100%;
            height: 230px;
            object-fit: cover;
            display: block;
          }

          .industry-content {
            padding: 24px;
            display: flex;
            flex-direction: column;
            flex: 1;
          }

          .industry-title {
            color: var(--secondary);
            margin-bottom: 14px;
          }

          .industry-description {
            color: var(--primary);
            line-height: 1.7;
          }

          @media (min-width: 1600px) {
            .industries-container {
              max-width: 1650px;
            }

            .industry-image {
              height: 260px;
            }
          }

          @media (max-width: 1400px) {
            .industries-section {
              padding: 90px 60px;
            }

            .industry-image {
              height: 220px;
            }
          }

          @media (max-width: 1200px) {
            .industries-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 22px;
            }

            .industry-image {
              height: 200px;
            }
          }

          @media (max-width: 992px) {
            .industries-section {
              padding: 80px 40px;
            }

            .industries-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }

            .industry-image {
              height: 180px;
            }

            .industry-content {
              padding: 20px;
            }
          }

          @media (max-width: 768px) {
            .industries-section {
              padding: 70px 20px;
            }

            .industries-grid {
              grid-template-columns: 1fr;
            }

            .industries-heading {
              margin-bottom: 40px;
            }

            .industry-image {
              height: 220px;
            }

            .industry-content {
              padding: 20px;
            }
          }

          @media (max-width: 480px) {
            .industries-section {
              padding: 60px 16px;
            }

            .industry-card {
              border-radius: 20px;
            }

            .industry-image {
              height: 180px;
            }

            .industry-content {
              padding: 18px;
            }
          }
        `}
      </style>

      <section className="industries-section">
        <div className="industries-container">
          <h2 className="industries-heading">
            Industries We Serve
          </h2>

          <div className="industries-grid">
            {industries.map((industry, index) => (
              <div
                className="industry-card"
                key={index}
              >
                <img src = {industry.image} />

                <div className="industry-content">
                  <h3 className="industry-title">
                    • {industry.title}
                  </h3>

                  <p className="industry-description">
                    {industry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default IndustriesSection;