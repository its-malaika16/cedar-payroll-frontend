import "../PrivacyPolicy/policy-rules.css";

export default function CookieRules() {
  return (
    <section className="policy-doc">
      <div className="policy-doc-container">
        <p className="policy-updated">Last updated: 23 November 2026</p>

        <h2>1. What this page covers</h2>
        <p>
          This page explains how Cedar Payroll Limited uses cookies and similar
          browser storage on{" "}
          <a href="https://cedarpayroll.com">cedarpayroll.com</a> and in the
          Cedar Payroll web software. The iOS and Android apps do not use
          browser cookies. They store a login on the device instead.
        </p>
        <p>
          A cookie is a small file a site can store in your browser. We also
          use the browser’s local storage and session storage. Those are not
          cookies, but they remember information on your device in a similar
          way.
        </p>

        <h2>2. What we do not use</h2>
        <p>
          The public website does not set advertising cookies, and it does not
          use a third-party analytics service such as Google Analytics. We do
          not follow you around other websites, and we do not build advertising
          profiles from payroll or attendance data.
        </p>

        <h2>3. Storage the website uses</h2>
        <p>
          If you send a company enquiry, the browser may store that email
          address in local storage so the same enquiry is not submitted again
          from that browser. It is not sent to an advertising network.
        </p>

        <h2>4. Storage the software uses</h2>
        <p>
          After you sign in to the employer, bureau or employee software, the
          browser keeps:
        </p>
        <ul>
          <li>
            a login token, so you stay signed in until you log out or the
            token expires;
          </li>
          <li>the company you last opened, where you can access more than one.</li>
        </ul>
        <p>While you are working, the browser may also keep:</p>
        <ul>
          <li>
            the timesheet period, onboarding step, or report draft you have
            open, in session storage, which is cleared when the browser session
            ends;
          </li>
          <li>
            pay types you choose to remember for that company, in local
            storage on that device.
          </li>
        </ul>
        <p>
          This storage is required for the software to sign you in and to keep
          the screen you are using. It is not used for marketing.
        </p>

        <h2>5. The mobile apps</h2>
        <p>
          The iOS and Android apps store your login securely on the device.
          If your employer uses workplace check-in, the app asks for location
          permission when you check in or check out. That location is sent to
          Cedar Payroll as part of the attendance record. It is not stored as
          a cookie and it is not used for advertising.
        </p>
        <p>
          If you allow notifications, the app stores a push token so we can
          deliver alerts your employer has switched on, such as payslip or
          leave updates.
        </p>

        <h2>6. How to control this</h2>
        <p>
          You can delete cookies and site data in your browser settings.
          Clearing site data for cedarpayroll.com will sign you out of the web
          software and remove the remembered enquiry email.
        </p>
        <p>
          Blocking all storage will stop the website from remembering an
          enquiry, and the web software will not be able to keep you signed
          in. You can still use the mobile apps if you sign in there.
        </p>
        <p>
          Location and notifications are controlled in the phone’s settings
          for the Cedar Payroll app.
        </p>

        <h2>7. Changes</h2>
        <p>
          If we start using any non-essential cookie, we will update this page
          and, where the law requires it, ask before that cookie is set.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about cookies or browser storage:{" "}
          <a href="mailto:support@cedarpayroll.com">support@cedarpayroll.com</a>.
          See also our <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </section>
  );
}
