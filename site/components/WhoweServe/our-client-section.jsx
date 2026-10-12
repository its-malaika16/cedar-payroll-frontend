const logos = [
  "/assets/images/ark-logo.png",
  "/assets/images/Harris-logo.png",
  "/assets/images/mams-logo.png",
  "/assets/images/showcase-logo.jpg",
  "/assets/images/coco-logo.png",
  "/assets/images/hats-logo.png",
  "/assets/images/teachwise-logo.png",
  "/assets/images/thinkgroup-logo.png",
];

const ClientsSection = () => {
  return (
    <>
      <style>
        {`
          .clients-section {
            width: 100%;
            background: var(--background);
            padding: 80px 0;
            overflow: hidden;
          }

          .clients-container {
            max-width: 1600px;
            margin: 0 auto;
          }

          .clients-heading {
            text-align: center;
            color: var(--primary);
            margin-bottom: 50px;
          }

          .clients-slider {
            width: 100%;
            overflow: hidden;
            position: relative;
          }

          .clients-track {
            display: flex;
            align-items: center;
            width: max-content;

            animation: marquee 30s linear infinite;
          }

          .clients-slider:hover .clients-track {
            animation-play-state: paused;
          }

          .client-logo {
            flex-shrink: 0;

            width: 220px;
            height: 90px;

            display: flex;
            justify-content: center;
            align-items: center;

            margin: 0 12px;
          }

          .client-logo img {
            max-width: 180px;
            max-height: 70px;

            width: auto;
            height: auto;

            object-fit: contain;

            transition: transform 0.3s ease;
          }

          .client-logo img:hover {
            transform: scale(1.05);
          }

          @keyframes marquee {
            0% {
              transform: translateX(0);
            }

            100% {
              transform: translateX(-33.333%);
            }
          }

          /* =====================
             LAPTOP
          ===================== */

          @media (max-width: 1200px) {
            .client-logo {
              width: 180px;
            }

            .client-logo img {
              max-width: 140px;
            }
          }

          /* =====================
             TABLET
          ===================== */

          @media (max-width: 992px) {
            .clients-section {
              padding: 70px 0;
            }

            .clients-heading {
              margin-bottom: 40px;
            }

            .clients-track {
              animation-duration: 24s;
            }

            .client-logo {
              width: 160px;
            }

            .client-logo img {
              max-width: 120px;
            }
          }

          /* =====================
             MOBILE
          ===================== */

          @media (max-width: 768px) {
            .clients-section {
              padding: 60px 0;
            }

            .clients-track {
              animation-duration: 18s;
            }

            .client-logo {
              width: 130px;
              height: 70px;
            }

            .client-logo img {
              max-width: 100px;
              max-height: 50px;
            }
          }

          /* =====================
             SMALL MOBILE
          ===================== */

          @media (max-width: 480px) {
            .clients-section {
              padding: 50px 0;
            }

            .clients-heading {
              margin-bottom: 30px;
            }

            .clients-track {
              animation-duration: 14s;
            }

            .client-logo {
              width: 110px;
              margin: 0 10px;
            }

            .client-logo img {
              max-width: 80px;
            }
          }
        `}
      </style>

      <section className="clients-section">
        <div className="clients-container">
          <h2 className="clients-heading">
            Our Clients
          </h2>

          <div className="clients-slider">
            <div className="clients-track">
              {[...logos, ...logos, ...logos].map(
                (logo, index) => (
                  <div
                    className="client-logo"
                    key={index}
                  >
                    <img src = {logo} 
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ClientsSection;