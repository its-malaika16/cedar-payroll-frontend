const IndustryBannerSection = () => {
  return (
    <>
      <style>
        {`
          .industry-banner {
            position: relative;

            width: 100%;
            min-height: 500px;

            background-image: url("/assets/images/serve-hero.svg");
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;

            display: flex;
            justify-content: center;
            align-items: center;

            overflow: hidden;
          }

          .industry-banner-overlay {
            position: absolute;
            inset: 0;

            background: rgba(23, 55, 94, 0.55);
          }

          .industry-banner-content {
            position: relative;
            z-index: 2;

            width: 90%;
            max-width: 1100px;

            text-align: center;
          }

          .industry-banner-title {
            color: #ffffff;

            font-size: 64px;
            font-weight: 800;
            line-height: 1.1;

            margin-bottom: 28px;
          }

          .industry-banner-description {
            max-width: 900px;
            margin: 0 auto;

            color: rgba(255, 255, 255, 0.95);

            font-size: 24px;
            font-weight: 500;
            line-height: 1.6;
          }

          /* ======================
             LARGE DESKTOP
          ====================== */

          @media (min-width: 1600px) {
            .industry-banner {
              min-height: 600px;
            }

            .industry-banner-title {
              font-size: 64px;
            }

            .industry-banner-description {
              font-size: 28px;
            }
          }

          /* ======================
             DESKTOP
          ====================== */

          @media (max-width: 1400px) {
            .industry-banner {
              min-height: 450px;
            }

            .industry-banner-title {
              font-size: 62px;
            }

            .industry-banner-description {
              font-size: 22px;
            }
          }

          /* ======================
             LAPTOP
          ====================== */

          @media (max-width: 1200px) {
            .industry-banner {
              min-height: 420px;
              padding: 0 40px;
            }

            .industry-banner-title {
              font-size: 52px;
            }

            .industry-banner-description {
              font-size: 20px;
            }
          }

          /* ======================
             TABLET
          ====================== */

          @media (max-width: 992px) {
            .industry-banner {
              min-height: 380px;
            }

            .industry-banner-title {
              font-size: 42px;
            }

            .industry-banner-description {
              font-size: 18px;
              max-width: 700px;
            }
          }

          /* ======================
             MOBILE
          ====================== */

          @media (max-width: 768px) {
            .industry-banner {
              min-height: 320px;
              padding: 50px 20px;
            }

            .industry-banner-title {
              font-size: 34px;
              margin-bottom: 18px;
            }

            .industry-banner-description {
              font-size: 16px;
              line-height: 1.7;
            }
          }

          /* ======================
             SMALL MOBILE
          ====================== */

          @media (max-width: 480px) {
            .industry-banner {
              min-height: 280px;
              padding: 40px 16px;
            }

            .industry-banner-title {
              font-size: 28px;
            }

            .industry-banner-description {
              font-size: 14px;
            }
          }
        `}
      </style>

      <section className="industry-banner">
        <div className="industry-banner-overlay"></div>

        <div className="industry-banner-content">
          <h2 className="industry-banner-title">
            Empowering Every Industry.
            <br />
            Elevating Every Team.
          </h2>

          <p className="industry-banner-description">
            From startups to enterprises, Cedar Payroll partners
            with organizations across industries to simplify
            operations, strengthen compliance, and celebrate
            success.
          </p>
        </div>
      </section>
    </>
  );
};

export default IndustryBannerSection;