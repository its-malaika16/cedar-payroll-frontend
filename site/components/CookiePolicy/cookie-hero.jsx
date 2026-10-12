export default function CookieHero() {
  return (
    <>
      <style>
        {`
          .cookie-hero {
            background: var(--primary);
            padding: 140px 20px 100px;
            position: relative;
            overflow: hidden;
          }

          .cookie-container {
            max-width: 1300px;
            margin: 0 auto;
            text-align: center;
          }

          .cookie-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;

            padding: 10px 22px;

            border-radius: 100px;

            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);

            color: #ffffff;
            font-size: 14px;
            font-weight: 600;

            margin-bottom: 30px;
          }

          .cookie-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--secondary);
          }

          .cookie-card {
            max-width: 1000px;
            margin: 0 auto;

            background: rgba(255,255,255,0.04);

            backdrop-filter: blur(8px);

            border: 1px solid rgba(255,255,255,0.08);

            border-radius: 32px;

            padding: 80px 60px;
          }

          .cookie-title {
            color: white;

            font-size: 72px;
            font-weight: 800;
            line-height: 1.1;

            margin-bottom: 30px;
          }

          .cookie-title span {
            color: var(--secondary);
          }

          .cookie-divider {
            width: 120px;
            height: 4px;

            background: var(--secondary);

            border-radius: 20px;

            margin: 0 auto 30px;
          }

          .cookie-description {
            max-width: 750px;
            margin: 0 auto;

            color: rgba(255,255,255,0.85);

            line-height: 1.8;
            font-size: 18px;
          }

          .cookie-breadcrumb {
            margin-top: 30px;

            color: rgba(255,255,255,0.7);

            font-size: 14px;
            font-weight: 500;
          }

          .cookie-breadcrumb span {
            color: var(--secondary);
          }

          /* Desktop */

          @media (max-width: 1400px) {
            .cookie-title {
              font-size: 60px;
            }
          }

          /* Laptop */

          @media (max-width: 1200px) {
            .cookie-title {
              font-size: 52px;
            }

            .cookie-card {
              padding: 60px 40px;
            }
          }

          /* Tablet */

          @media (max-width: 992px) {
            .cookie-hero {
              padding: 120px 30px 90px;
            }

            .cookie-title {
              font-size: 44px;
            }

            .cookie-description {
              font-size: 16px;
            }
          }

          /* Mobile */

          @media (max-width: 768px) {
            .cookie-hero {
              padding: 100px 20px 70px;
            }

            .cookie-card {
              padding: 40px 24px;
              border-radius: 24px;
            }

            .cookie-title {
              font-size: 34px;
            }

            .cookie-divider {
              width: 90px;
            }

            .cookie-description {
              font-size: 15px;
            }

            .cookie-breadcrumb {
              font-size: 12px;
            }
          }

          /* Small Mobile */

          @media (max-width: 480px) {
            .cookie-title {
              font-size: 28px;
            }

            .cookie-description {
              font-size: 14px;
            }
          }
        `}
      </style>

      <section className="cookie-hero">
        <div className="cookie-container">
          <div className="cookie-badge">
            <div className="cookie-dot"></div>
            LEGAL INFORMATION
          </div>

          <div className="cookie-card">
            <h1 className="cookie-title">
              Cookie <span>Policy</span>
            </h1>

            <div className="cookie-divider"></div>

            <p className="cookie-description">
              Learn how Cedar Payroll uses cookies and similar
              technologies to improve website functionality,
              enhance user experience, and ensure compliance with
              privacy regulations.
            </p>
          </div>

          <div className="cookie-breadcrumb">
            HOME <span>›</span> COOKIE POLICY
          </div>
        </div>
      </section>
    </>
  );
}