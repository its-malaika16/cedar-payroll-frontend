import "./cookie-rules.css";

export default function CookieRules() {
    return (
        <section className="privacy-section">

            <div className="privacy-card">

                <p className="last-updated">Last updated: 13 May 2026</p>

                {/* 1 */}
                <h2>1. What Are Cookies?</h2>
                <p>
                    Cookies are small text files placed on your device when you visit a website. They help sites function correctly, remember your preferences, and provide insight into how the site is used.
                </p>

                {/* 2 */}
                <h2>2. How We Use Cookies</h2>
                <ul>
                    <li>Essential cookies — required for core site functionality such as navigation and security.</li>
                    <li>Performance cookies — help us understand how visitors interact with the site so we can improve it.</li>
                    <li>Functional cookies — remember choices you make to provide a more personalised experience.</li>
                </ul>

                {/* 3 */}
                <h2>3. Third-Party Cookies</h2>
                <p>Some pages may include content or scripts from third parties (such as analytics providers) which may set their own cookies. We do not control these cookies; please review the privacy policies of those third parties for more information. </p>

                {/* 4 */}
                <h2>4. Managing Cookies</h2>
                <p>
                    You can control or delete cookies through your browser settings at any time. Please note that disabling essential cookies may affect the functionality of the website.
                </p>

                {/* 5 */}
                <h2>5. Updates to This Policy</h2>
                <p>
                    We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.
                </p>

                {/* 6 */}
                <h2>6. Contact</h2>
                <p>
                    For questions about our use of cookies, please contact us at <span className="highlight">Support@cedarpayroll.com</span>.
                </p>

            </div>

        </section>
    );
}
