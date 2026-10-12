import "./policy-rules.css";

export default function PrivacyPolicy() {
  return (
    <section className="privacy-section">

      <div className="privacy-card">

        <p className="last-updated">Last updated: 13 May 2026</p>

        {/* 1 */}
        <h2>1. Introduction</h2>
        <p>
          Cedar Capital Payroll ("we", "us", "our") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, store, and safeguard the personal
          information you share with us through our website cedarpayroll.co.uk and our payroll services.
        </p>

        {/* 2 */}
        <h2>2. Information We Collect</h2>
        <ul>
          <li>Contact details such as your name, business name, email address, and phone number.</li>
          <li>Information you provide via our contact form or newsletter signup.</li>
          <li>Employee payroll data submitted by client businesses for processing.</li>
          <li>Technical information such as IP address, browser type, and pages visited.</li>
        </ul>

        {/* 3 */}
        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide and administer our payroll services.</li>
          <li>To respond to enquiries submitted through our website.</li>
          <li>To send service updates, newsletters, and relevant communications you have opted in to receive.</li>
          <li>To comply with HMRC, tax, and legal obligations.</li>
          <li>To improve our website, services, and customer experience.</li>
        </ul>

        {/* 4 */}
        <h2>4. Lawful Basis for Processing</h2>
        <p>
          We process personal data under the UK GDPR on the basis of contract performance, your consent
          (e.g. newsletter subscription), our legitimate business interests, and our legal obligations
          as a payroll provider.
        </p>

        {/* 5 */}
        <h2>5. Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share data with HMRC, pension providers,
          and trusted service providers strictly to deliver our services. All third parties are
          bound by appropriate confidentiality and data-protection obligations.
        </p>

        {/* 6 */}
        <h2>6. Data Retention</h2>
        <p>
          We retain personal data only for as long as necessary to provide our services and to comply
          with statutory record-keeping requirements (typically a minimum of six years for payroll records).
        </p>

        {/* 7 */}
        <h2>7. Your Rights</h2>
        <p>
          You have the right to access, correct, delete, or restrict the use of your personal data,
          and the right to data portability and to object to processing. To exercise any of these rights,
          contact us at <span className="highlight">Support@cedarpayroll.com</span>.
        </p>

        {/* 8 */}
        <h2>8. Security</h2>
        <p>
          We use appropriate technical and organisational measures to safeguard your data, including
          encrypted storage, access controls, and secure cloud infrastructure.
        </p>

        {/* 9 */}
        <h2>9. Contact Us</h2>
        <p>
          For any privacy-related questions, please contact Cedar Capital Payroll at{" "}
          <span className="highlight">Support@cedarpayroll.com</span> or{" "}
          <span className="highlight">+971 50 429 4194</span>.
        </p>

      </div>

    </section>
  );
}
