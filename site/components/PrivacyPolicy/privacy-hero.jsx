import "./privacy-hero.css";

export default function PrivacyHero() {
    return (
        <section className="services-hero">

            {/* ✅ TOP TAG */}
            <div className="hero-tag">
                <span>● LEGAL</span>
            </div>

            {/* ✅ MAIN CARD */}
            <div className="hero-card">

                <h1>
                    Privacy<br />
                    <span>Policy</span>
                </h1>

                {/* divider */}
                <div className="divider">
                    <span></span>
                    <span className="diamond"></span>
                    <span></span>
                </div>

                <p>
                    How Cedar Capital Payroll collects, uses, and protects your personal information.
                </p>

            </div>

            {/* ✅ BREADCRUMB */}
            <div className="breadcrumb">
                HOME <span>›</span> <span className="active">PRIVACY POLICY</span>
            </div>

        </section>
    );
}