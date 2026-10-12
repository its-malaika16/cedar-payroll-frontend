import { useState } from "react";
import ContactModal from "../Home/contact-modal";

const styles = `
.support-section {
  padding: 100px 80px;
  background: var(--background);
}

.support-container {
  max-width: 1500px;
  margin: 0 auto;
}

.support-main-heading {
  text-align: center;
  font-size: 40px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 70px;
}

.support-grid {
  display: grid;
  grid-template-columns: 400px 1fr 1fr;
  gap: 50px;
  align-items: start;
}

.support-card {
  color: var(--primary);
}

.support-card h3 {
  color: var(--primary);
  font-size: 30px;
  font-weight: 600;
  margin-bottom: 24px;
}

.support-card h4 {
  color: var(--secondary);
  margin: 28px 0 12px;
  font-size: 20px;
  font-weight: 700;
}

.support-card p {
  line-height: 1.8;
  margin-bottom: 18px;
}

.support-card ul {
  padding-left: 22px;
  margin-bottom: 20px;
  list-style: circle;
}

.support-card li {
  line-height: 1.8;
  margin-bottom: 10px;
}

.support-card strong {
  color: var(--primary);
  font-weight: 700;
}

.sales-card {
  background: #ffffff;
  border: 1px solid rgba(23, 55, 94, 0.15);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
}

.sales-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  padding: 0 32px;
  margin-top: 20px;
  border: none;
  border-radius: 10px;
  background: var(--secondary);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: 0.3s ease;
}

.sales-btn:hover {
  opacity: 0.9;
}

@media (max-width: 1200px) {
  .support-grid {
    grid-template-columns: 1fr 1fr;
  }

  .sales-card {
    grid-column: span 2;
  }
}

@media (max-width: 992px) {
  .support-section {
    padding: 80px 40px;
  }

  .support-grid {
    grid-template-columns: 1fr;
    gap: 50px;
  }

  .sales-card {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .support-section {
    padding: 70px 20px;
  }

  .support-main-heading {
    margin-bottom: 50px;
  }

  .sales-card {
    padding: 24px;
  }
}

@media (max-width: 480px) {
  .support-section {
    padding: 60px 16px;
  }

  .sales-card {
    padding: 20px;
    border-radius: 18px;
  }

  .sales-btn {
    width: 100%;
  }
}
`;

const SupportSection = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{styles}</style>

      <section className="support-section">
        <div className="support-container">
          <h2 className="support-main-heading">
            Customer Service & Support
          </h2>

          <div className="support-grid">
            {/* Contact Sales */}
            <div className="support-card sales-card">
              <h3>Contact Sales</h3>

              <p>
                Let's talk about how our comprehensive HR &
                Payroll solutions can support your business.
              </p>

              <button
                className="sales-btn"
                onClick={() => setShowModal(true)}
              >
                Contact Sales
              </button>
            </div>

            {/* Administrator Support */}
            <div className="support-card">
              <h3>Support for Administrators</h3>

              <p>
                We're here to help with your payroll, HR, and
                workforce management requirements.
              </p>

              <h4>Contact Options</h4>

              <ul>
                <li>
                  <strong>Managed Service Clients:</strong>{" "}
                  Contact your dedicated service representative
                  using your assigned support number.
                </li>

                <li>
                  <strong>Processing Service Clients:</strong>{" "}
                  Reach out to our customer support team for
                  assistance with processing-related queries.
                </li>
              </ul>

              <h4>Support Hours</h4>

              <p>
                <strong>Monday to Friday:</strong> 9:00 AM –
                5:30 PM
                <br />
                Excluding public and bank holidays
              </p>

              <h4>Online Support</h4>

              <p>
                For fast and convenient assistance, access our
                online support portal where you can:
              </p>

              <ul>
                <li>
                  Start a live chat with a support specialist
                </li>
                <li>
                  Submit support tickets and service requests
                </li>
                <li>
                  Track the progress of existing cases
                </li>
                <li>
                  Access help articles and user guides
                </li>
              </ul>

              <h4>Client Resource Hub</h4>

              <p>
                Be sure to visit our client community and
                resource centre, featuring:
              </p>

              <ul>
                <li>
                  User guides and training materials
                </li>
                <li>
                  Product updates and announcements
                </li>
                <li>Best-practice resources</li>
                <li>Frequently asked questions</li>
                <li>
                  Industry insights and helpful tools
                </li>
              </ul>

              <p>
                Our support team is committed to providing
                timely assistance and helping you get the most
                from our services.
              </p>
            </div>

            {/* Employee Support */}
            <div className="support-card">
              <h3>Support for Employees</h3>

              <p>
                If you are an employee using your
                organization's payroll, HR, or workforce
                management platform, there are several ways to
                get assistance.
              </p>

              <h4>Login & Password Assistance</h4>

              <p>
                If you have forgotten your password or are
                experiencing issues accessing your employee
                account, please contact your{" "}
                <strong>
                  HR department or system administrator
                </strong>
                .
              </p>

              <h4>Payslip & Payroll Queries</h4>

              <p>
                If you are unable to view your payslip or have
                payroll-related questions, please contact your{" "}
                <strong>
                  Payroll or Human Resources team
                </strong>{" "}
                as your first point of contact.
              </p>

              <h4>Additional Support</h4>

              <p>
                Your employer may also provide access to
                employee self-service resources, including:
              </p>

              <ul>
                <li>
                  Online payslips and tax documents
                </li>
                <li>
                  Personal information updates
                </li>
                <li>
                  Leave and attendance records
                </li>
                <li>
                  Benefits and employment information
                </li>
                <li>
                  HR policies and employee resources
                </li>
              </ul>

              <p>
                For the quickest assistance, always contact
                your organisation’s HR or Payroll team before
                seeking technical support through other
                channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <ContactModal
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default SupportSection;