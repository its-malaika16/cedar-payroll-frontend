const testimonials = [
  {
    logo: "/assets/images/thinkgroup-logo.png",
    quote:
      "Cedar Payroll transformed our payroll operations and gave us confidence that every payroll cycle would be accurate and compliant.",
    name: "Sam Quinn",
    role: "Payroll Manager",
  },
  {
    logo: "/assets/images/coco-logo.png",
    quote:
      "Cedar Payroll streamlined our complex multi-location payroll and eliminated the errors we used to struggle with. Now every cycle runs smoothly and our team has complete peace of mind.",
    name: "Laura Chen",
    role: "HR & Payroll Director",
  },
  {
    logo: "/assets/images/hats-logo.png",
    quote:
      "Switching to Cedar Payroll was a game-changer. The compliance features keep us aligned with regulations, and the automation saves hours of manual work each month.",
    name: "David Morales",
    role: "Payroll Supervisor",
  },
];

const TestimonialsSection = () => {
  return (
    <>
      <style>
        {`
        .testimonials-section {
          width: 100%;
          background: var(--background);
          padding: 100px 80px;
        }

        .testimonials-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .testimonials-heading {
          text-align: center;
          color: var(--primary);
          margin-bottom: 80px;
        }

        .testimonials-list {
          display: flex;
          flex-direction: column;
          gap: 80px;
        }

        .testimonial-row {
          display: grid;
          grid-template-columns: 320px 2px 1fr;
          align-items: center;
          gap: 60px;
        }

        .testimonial-logo {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .testimonial-logo img {
          max-width: 250px;
          max-height: 120px;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .testimonial-divider {
          width: 2px;
          height: 120px;
          background: var(--secondary);
        }

        .testimonial-content {
          text-align: right;
          max-width: 700px;
          margin-left: auto;
        }

        .testimonial-quote {
          color: var(--primary);
          line-height: 1.8;
          margin-bottom: 20px;
        }

        .testimonial-name {
          color: var(--primary);
          margin-bottom: 5px;
        }

        .testimonial-role {
          color: var(--primary);
        }

        /* ======================
           LAPTOP
        ====================== */

        @media (max-width: 1200px) {
          .testimonial-row {
            grid-template-columns: 250px 2px 1fr;
            gap: 40px;
          }

          .testimonial-logo img {
            max-width: 200px;
          }
        }

        /* ======================
           TABLET
        ====================== */

        @media (max-width: 992px) {
          .testimonials-section {
            padding: 80px 40px;
          }

          .testimonial-row {
            grid-template-columns: 1fr;
            gap: 30px;
            text-align: center;
          }

          .testimonial-divider {
            width: 100px;
            height: 2px;
            margin: 0 auto;
          }

          .testimonial-content {
            text-align: center;
            margin: 0 auto;
          }
        }

        /* ======================
           MOBILE
        ====================== */

        @media (max-width: 768px) {
          .testimonials-section {
            padding: 70px 20px;
          }

          .testimonials-heading {
            margin-bottom: 50px;
          }

          .testimonials-list {
            gap: 60px;
          }

          .testimonial-logo img {
            max-width: 180px;
          }
        }

        /* ======================
           SMALL MOBILE
        ====================== */

        @media (max-width: 480px) {
          .testimonials-section {
            padding: 60px 16px;
          }

          .testimonial-logo img {
            max-width: 150px;
          }

          .testimonial-divider {
            width: 70px;
          }
        }
      `}
      </style>

      <section className="testimonials-section">
        <div className="testimonials-container">
          <h2 className="testimonials-heading">
            What Our Clients Say
          </h2>

          <div className="testimonials-list">
            {testimonials.map((item, index) => (
              <div
                className="testimonial-row"
                key={index}
              >
                <div className="testimonial-logo">
                  <img src = {item.logo}
                  />
                </div>

                <div className="testimonial-divider"></div>

                <div className="testimonial-content">
                  <p className="testimonial-quote">
                    "{item.quote}"
                  </p>

                  <h4 className="testimonial-name">
                    — {item.name}
                  </h4>

                  <p className="testimonial-role">
                    {item.role}
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

export default TestimonialsSection;